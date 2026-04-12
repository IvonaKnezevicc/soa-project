import { Component, OnInit } from '@angular/core';
import { NonNullableFormBuilder, Validators } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Observable } from 'rxjs';

import { BlogPostResponse } from '../blog/blog.model';
import { BlogService } from '../blog/blog.service';
import { User } from '../models/user.model';
import { AuthService } from '../services/auth.service';
import { HomeActionsService } from '../services/home-actions.service';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit {
  readonly currentUser$: Observable<User | null>;
  posts: BlogPostView[] = [];
  selectedImages: string[] = [];
  selectedImageNames: string[] = [];
  commentTexts: Record<string, string> = {};
  commentSubmitting: Record<string, boolean> = {};
  commentErrorMessages: Record<string, string> = {};
  likeSubmitting: Record<string, boolean> = {};
  likeErrorMessages: Record<string, string> = {};
  isAdmin = false;
  isLoading = false;
  isSubmitting = false;
  isCreateOpen = false;
  errorMessage = '';
  createErrorMessage = '';

  readonly form = this.formBuilder.group({
    title: ['', [Validators.required, Validators.maxLength(200)]],
    descriptionMarkdown: ['', [Validators.required, Validators.maxLength(20000)]]
  });

  constructor(
    private readonly blogService: BlogService,
    private readonly formBuilder: NonNullableFormBuilder,
    private readonly sanitizer: DomSanitizer,
    private readonly authService: AuthService,
    private readonly homeActionsService: HomeActionsService
  ) {
    this.currentUser$ = this.authService.currentUser$;
  }

  ngOnInit(): void {
    this.homeActionsService.openCreateBlog$.subscribe(() => {
      if (!this.isAdmin) {
        this.openCreate();
      }
    });

    this.currentUser$.subscribe((user) => {
      this.isAdmin = user?.role === 'admin';
      if (!this.isAdmin) {
        this.loadPosts();
      } else {
        this.posts = [];
      }
    });
  }

  loadPosts(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.blogService.getPosts().subscribe({
      next: (posts) => {
        this.posts = posts.map((post) => ({
          ...post,
          renderedDescription: this.sanitizer.bypassSecurityTrustHtml(post.descriptionHtml)
        }));
        this.commentTexts = this.posts.reduce<Record<string, string>>((accumulator, post) => {
          accumulator[post.id] = this.commentTexts[post.id] ?? '';
          return accumulator;
        }, {});
        this.isLoading = false;
      },
      error: () => {
        this.errorMessage = 'Failed to load blog posts.';
        this.isLoading = false;
      }
    });
  }

  openCreate(): void {
    this.createErrorMessage = '';
    this.form.reset({
      title: '',
      descriptionMarkdown: ''
    });
    this.selectedImages = [];
    this.selectedImageNames = [];
    this.isCreateOpen = true;
  }

  closeCreate(): void {
    if (this.isSubmitting) {
      return;
    }
    this.isCreateOpen = false;
  }

  submit(): void {
    this.createErrorMessage = '';
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    this.isSubmitting = true;
    this.blogService.createBlogPost({
      title: raw.title,
      descriptionMarkdown: raw.descriptionMarkdown,
      imageUrls: this.selectedImages
    }).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.isCreateOpen = false;
        this.loadPosts();
      },
      error: (error) => {
        this.createErrorMessage = error?.error?.message ?? 'Failed to create blog post.';
        this.isSubmitting = false;
      }
    });
  }

  updateCommentText(postId: string, value: string): void {
    this.commentTexts[postId] = value;
  }

  submitComment(postId: string): void {
    const text = (this.commentTexts[postId] ?? '').trim();
    this.commentErrorMessages[postId] = '';

    if (!text) {
      this.commentErrorMessages[postId] = 'Comment text is required.';
      return;
    }

    this.commentSubmitting[postId] = true;
    this.blogService.createComment(postId, { text }).subscribe({
      next: () => {
        this.commentTexts[postId] = '';
        this.commentSubmitting[postId] = false;
        this.loadPosts();
      },
      error: (error) => {
        this.commentErrorMessages[postId] = error?.error?.message ?? 'Failed to create comment.';
        this.commentSubmitting[postId] = false;
      }
    });
  }

  toggleLike(postId: string, likedByCurrentUser: boolean): void {
    this.likeErrorMessages[postId] = '';
    this.likeSubmitting[postId] = true;

    const request$ = likedByCurrentUser
      ? this.blogService.unlikePost(postId)
      : this.blogService.likePost(postId);

    request$.subscribe({
      next: () => {
        this.likeSubmitting[postId] = false;
        this.loadPosts();
      },
      error: (error) => {
        this.likeErrorMessages[postId] = error?.error?.message ?? 'Failed to update like.';
        this.likeSubmitting[postId] = false;
      }
    });
  }

  async onImagesSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    if (files.length === 0) {
      return;
    }

    const nextTotalCount = this.selectedImages.length + files.length;
    if (nextTotalCount > 10) {
      this.createErrorMessage = 'At most 10 images are allowed.';
      return;
    }

    const imageFiles = files.filter((file) => file.type.startsWith('image/'));
    if (imageFiles.length !== files.length) {
      this.createErrorMessage = 'Please select image files only.';
      return;
    }

    const oversized = imageFiles.find((file) => file.size > 1_500_000);
    if (oversized) {
      this.createErrorMessage = `Image "${oversized.name}" is too large (max 1.5MB).`;
      return;
    }

    try {
      const encoded = await Promise.all(imageFiles.map((file) => this.readFileAsDataURL(file)));
      this.selectedImages = [...this.selectedImages, ...encoded];
      this.selectedImageNames = [...this.selectedImageNames, ...imageFiles.map((file) => file.name)];
      this.createErrorMessage = '';
      input.value = '';
    } catch {
      this.createErrorMessage = 'Failed to read selected images.';
    }
  }

  private readFileAsDataURL(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
          return;
        }
        reject(new Error('Invalid file reader result'));
      };
      reader.onerror = () => reject(new Error('File read failed'));
      reader.readAsDataURL(file);
    });
  }
}

interface BlogPostView extends BlogPostResponse {
  renderedDescription: SafeHtml;
}

import { Component, OnInit } from '@angular/core';
import { NonNullableFormBuilder, Validators } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

import { BlogPostResponse, BlogStartupStatus } from './blog.model';
import { BlogService } from './blog.service';

@Component({
  selector: 'app-blog',
  templateUrl: './blog.component.html',
  styleUrls: ['./blog.component.css']
})
export class BlogComponent implements OnInit {
  status: BlogStartupStatus | null = null;
  createdPost: BlogPostResponse | null = null;
  renderedDescription: SafeHtml = '';
  selectedImages: string[] = [];
  selectedImageNames: string[] = [];
  isLoading = false;
  isSubmitting = false;
  errorMessage = '';
  createErrorMessage = '';
  createSuccessMessage = '';
  readonly markdownHint = 'For bold use **bold**, for headings use ## heading, and for lists use - item.';

  readonly form = this.formBuilder.group({
    title: ['', [Validators.required, Validators.maxLength(200)]],
    descriptionMarkdown: ['', [Validators.required, Validators.maxLength(20000)]],
    imageUrlsText: ['']
  });

  constructor(
    private readonly blogService: BlogService,
    private readonly formBuilder: NonNullableFormBuilder,
    private readonly sanitizer: DomSanitizer
  ) {}

  ngOnInit(): void {
    this.loadStatus();
  }

  loadStatus(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.blogService.getHealth().subscribe({
      next: (status) => {
        this.status = status;
        this.isLoading = false;
      },
      error: () => {
        this.errorMessage = 'Blog service is not reachable on port 8081.';
        this.isLoading = false;
      }
    });
  }

  submit(): void {
    this.createErrorMessage = '';
    this.createSuccessMessage = '';

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
      next: (response) => {
        this.createdPost = response;
        this.renderedDescription = this.sanitizer.bypassSecurityTrustHtml(response.descriptionHtml);
        this.createSuccessMessage = 'Blog post created successfully.';
        this.selectedImages = [];
        this.selectedImageNames = [];
        this.isSubmitting = false;
      },
      error: (error) => {
        this.createErrorMessage = error?.error?.message ?? 'Failed to create blog post.';
        this.isSubmitting = false;
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

  removeSelectedImage(index: number, input?: HTMLInputElement): void {
    this.selectedImages = this.selectedImages.filter((_, imageIndex) => imageIndex !== index);
    this.selectedImageNames = this.selectedImageNames.filter((_, imageIndex) => imageIndex !== index);
    if (input) {
      input.value = '';
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

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
  isLoading = false;
  isSubmitting = false;
  errorMessage = '';
  createErrorMessage = '';
  createSuccessMessage = '';

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
    const imageUrls = this.parseImageUrls(raw.imageUrlsText);

    this.isSubmitting = true;
    this.blogService.createBlogPost({
      title: raw.title,
      descriptionMarkdown: raw.descriptionMarkdown,
      imageUrls
    }).subscribe({
      next: (response) => {
        this.createdPost = response;
        this.renderedDescription = this.sanitizer.bypassSecurityTrustHtml(response.descriptionHtml);
        this.createSuccessMessage = 'Blog post created successfully.';
        this.isSubmitting = false;
      },
      error: (error) => {
        this.createErrorMessage = error?.error?.message ?? 'Failed to create blog post.';
        this.isSubmitting = false;
      }
    });
  }

  private parseImageUrls(raw: string): string[] {
    return raw
      .split(/\r?\n|,/)
      .map((value) => value.trim())
      .filter((value) => value.length > 0);
  }
}

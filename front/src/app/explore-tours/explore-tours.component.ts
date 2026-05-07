import { Component, OnInit } from '@angular/core';

import { PaymentService } from '../services/payment.service';
import { TourReview } from '../models/tour-review.model';
import { Tour } from '../models/tour.model';
import { ToursService } from '../services/tours.service';

@Component({
  selector: 'app-explore-tours',
  templateUrl: './explore-tours.component.html',
  styleUrls: ['./explore-tours.component.css']
})
export class ExploreToursComponent implements OnInit {
  tours: Tour[] = [];
  reviewForms: Record<string, ReviewFormState> = {};
  reviewSubmitting: Record<string, boolean> = {};
  reviewSuccessMessages: Record<string, string> = {};
  reviewErrorMessages: Record<string, string> = {};
  reviewsByTourId: Record<string, TourReview[]> = {};
  cartTourIds: Record<string, boolean> = {};
  addToCartSubmitting: Record<string, boolean> = {};
  addToCartMessages: Record<string, string> = {};
  isLoading = false;
  errorMessage = '';

  constructor(
    private readonly toursService: ToursService,
    private readonly paymentService: PaymentService
  ) {}

  ngOnInit(): void {
    this.loadTours();
    this.loadCart();
  }

  private loadTours(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.toursService.getPublishedTours().subscribe({
      next: (tours) => {
        this.tours = tours;
        this.reviewForms = tours.reduce<Record<string, ReviewFormState>>((forms, tour) => {
          forms[tour.id] = this.reviewForms[tour.id] ?? {
            rating: 5,
            comment: '',
            visitedAt: '',
            images: [],
            imageNames: []
          };
          return forms;
        }, {});
        tours.forEach((tour) => this.loadReviews(tour.id));
        this.isLoading = false;
      },
      error: (error) => {
        this.errorMessage = error?.error?.message ?? 'Failed to load tours.';
        this.isLoading = false;
      }
    });
  }

  updateReviewRating(tourId: string, value: string): void {
    this.ensureReviewForm(tourId).rating = Number(value);
  }

  updateReviewComment(tourId: string, value: string): void {
    this.ensureReviewForm(tourId).comment = value;
  }

  updateReviewVisitedAt(tourId: string, value: string): void {
    this.ensureReviewForm(tourId).visitedAt = value;
  }

  submitReview(tourId: string): void {
    const form = this.ensureReviewForm(tourId);
    this.reviewErrorMessages[tourId] = '';
    this.reviewSuccessMessages[tourId] = '';

    if (!form.rating || form.rating < 1 || form.rating > 5) {
      this.reviewErrorMessages[tourId] = 'Rating must be between 1 and 5.';
      return;
    }

    if (!form.comment.trim()) {
      this.reviewErrorMessages[tourId] = 'Comment is required.';
      return;
    }

    if (!form.visitedAt) {
      this.reviewErrorMessages[tourId] = 'Visited date is required.';
      return;
    }

    this.reviewSubmitting[tourId] = true;
    this.toursService.createTourReview(tourId, {
      rating: form.rating,
      comment: form.comment.trim(),
      visitedAt: form.visitedAt,
      images: form.images
    }).subscribe({
      next: () => {
        this.reviewForms[tourId] = {
          rating: 5,
          comment: '',
          visitedAt: '',
          images: [],
          imageNames: []
        };
        this.reviewSuccessMessages[tourId] = 'Review saved.';
        this.reviewSubmitting[tourId] = false;
        this.loadReviews(tourId);
      },
      error: (error) => {
        this.reviewErrorMessages[tourId] = error?.error?.message ?? 'Failed to save review.';
        this.reviewSubmitting[tourId] = false;
      }
    });
  }

  private loadReviews(tourId: string): void {
    this.toursService.getTourReviews(tourId).subscribe({
      next: (reviews) => {
        this.reviewsByTourId[tourId] = reviews;
      },
      error: () => {
        this.reviewsByTourId[tourId] = [];
      }
    });
  }

  addToCart(tourId: string): void {
    if (this.cartTourIds[tourId] || this.addToCartSubmitting[tourId]) {
      return;
    }

    this.addToCartSubmitting[tourId] = true;
    this.addToCartMessages[tourId] = '';

    this.paymentService.addTourToCart(tourId).subscribe({
      next: (cart) => {
        this.cartTourIds = cart.items.reduce<Record<string, boolean>>((items, item) => {
          items[item.tourId] = true;
          return items;
        }, {});
        this.addToCartMessages[tourId] = 'Added to cart.';
        this.addToCartSubmitting[tourId] = false;
      },
      error: (error) => {
        this.addToCartMessages[tourId] = error?.error?.message ?? 'Failed to add the tour to cart.';
        this.addToCartSubmitting[tourId] = false;
      }
    });
  }

  private loadCart(): void {
    this.paymentService.getMyCart().subscribe({
      next: (cart) => {
        this.cartTourIds = cart.items.reduce<Record<string, boolean>>((items, item) => {
          items[item.tourId] = true;
          return items;
        }, {});
      },
      error: () => {
        this.cartTourIds = {};
      }
    });
  }

  async onReviewImagesSelected(tourId: string, event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    if (files.length === 0) {
      return;
    }

    const form = this.ensureReviewForm(tourId);
    const nextTotalCount = form.images.length + files.length;
    if (nextTotalCount > 10) {
      this.reviewErrorMessages[tourId] = 'At most 10 images are allowed.';
      return;
    }

    const imageFiles = files.filter((file) => file.type.startsWith('image/'));
    if (imageFiles.length !== files.length) {
      this.reviewErrorMessages[tourId] = 'Please select image files only.';
      return;
    }

    const oversized = imageFiles.find((file) => file.size > 1_500_000);
    if (oversized) {
      this.reviewErrorMessages[tourId] = `Image "${oversized.name}" is too large (max 1.5MB).`;
      return;
    }

    try {
      const encoded = await Promise.all(imageFiles.map((file) => this.readFileAsDataURL(file)));
      form.images = [...form.images, ...encoded];
      form.imageNames = [...form.imageNames, ...imageFiles.map((file) => file.name)];
      this.reviewErrorMessages[tourId] = '';
      input.value = '';
    } catch {
      this.reviewErrorMessages[tourId] = 'Failed to read selected images.';
    }
  }

  private ensureReviewForm(tourId: string): ReviewFormState {
    if (!this.reviewForms[tourId]) {
      this.reviewForms[tourId] = {
        rating: 5,
        comment: '',
        visitedAt: '',
        images: [],
        imageNames: []
      };
    }

    return this.reviewForms[tourId];
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

interface ReviewFormState {
  rating: number;
  comment: string;
  visitedAt: string;
  images: string[];
  imageNames: string[];
}

import { Component, OnInit } from '@angular/core';

import { Tour } from '../models/tour.model';
import { PaymentService } from '../services/payment.service';
import { ToursService } from '../services/tours.service';

@Component({
  selector: 'app-find-tours',
  templateUrl: './find-tours.component.html',
  styleUrls: ['./find-tours.component.css']
})
export class FindToursComponent implements OnInit {
  tours: Tour[] = [];
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

  getFirstPointImage(tour: Tour): string {
    return tour.keyPoints[0]?.image?.trim() || '';
  }

  formatDurationLabel(transportType: string): string {
    switch (transportType) {
      case 'walking':
        return 'Walking';
      case 'bicycle':
        return 'Bicycle';
      case 'car':
        return 'Car';
      default:
        return transportType;
    }
  }

  private loadTours(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.toursService.getPublishedTours().subscribe({
      next: (tours) => {
        this.tours = tours.filter((tour) => !tour.purchasedByCurrentUser);
        this.isLoading = false;
      },
      error: (error) => {
        this.errorMessage = error?.error?.message ?? 'Failed to load tours.';
        this.isLoading = false;
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
}

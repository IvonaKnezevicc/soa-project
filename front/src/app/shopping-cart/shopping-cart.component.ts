import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

import { ShoppingCart } from '../models/shopping-cart.model';
import { PaymentService } from '../services/payment.service';

@Component({
  selector: 'app-shopping-cart',
  templateUrl: './shopping-cart.component.html',
  styleUrls: ['./shopping-cart.component.css']
})
export class ShoppingCartComponent implements OnInit {
  cart: ShoppingCart | null = null;
  isLoading = false;
  isCheckingOut = false;
  removingTourId = '';
  errorMessage = '';
  successMessage = '';

  constructor(
    private readonly paymentService: PaymentService,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    this.loadCart();
  }

  removeItem(tourId: string): void {
    if (this.removingTourId || this.isCheckingOut) {
      return;
    }

    this.removingTourId = tourId;
    this.errorMessage = '';
    this.successMessage = '';

    this.paymentService.removeTourFromCart(tourId).subscribe({
      next: (cart) => {
        this.cart = cart;
        this.removingTourId = '';
      },
      error: (error) => {
        this.errorMessage = error?.error?.message ?? 'Failed to remove the tour from cart.';
        this.removingTourId = '';
      }
    });
  }

  checkout(): void {
    if (!this.cart?.items.length || this.isCheckingOut) {
      return;
    }

    this.isCheckingOut = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.paymentService.checkout().subscribe({
      next: () => {
        this.successMessage = 'Checkout completed. Purchased tours are now unlocked.';
        this.isCheckingOut = false;
        this.loadCart();
        window.setTimeout(() => this.router.navigate(['/tours']), 700);
      },
      error: (error) => {
        this.errorMessage = error?.error?.message ?? 'Checkout failed.';
        this.isCheckingOut = false;
      }
    });
  }

  private loadCart(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.paymentService.getMyCart().subscribe({
      next: (cart) => {
        this.cart = cart;
        this.isLoading = false;
      },
      error: (error) => {
        this.errorMessage = error?.error?.message ?? 'Failed to load cart.';
        this.isLoading = false;
      }
    });
  }
}

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
        this.paymentService.refreshWallet();
        this.isCheckingOut = false;
        this.loadCart();
        window.setTimeout(() => this.router.navigate(['/tourist/my-tours']), 700);
      },
      error: (error) => {
        const backendMessage = this.extractErrorMessage(error);
        if (backendMessage) {
          this.errorMessage = backendMessage.includes('no longer available for purchase')
            ? 'Check whether the selected tours are still available before checkout, because some of them may no longer be purchasable.'
            : backendMessage;
          this.isCheckingOut = false;
          return;
        }

        this.paymentService.getMyWallet().subscribe({
          next: (wallet) => {
            this.errorMessage = `Checkout failed. Check your wallet balance. Current balance: ${wallet.balance.toFixed(2)}.`;
            this.isCheckingOut = false;
          },
          error: () => {
            this.errorMessage = 'Checkout failed. Check your wallet balance.';
            this.isCheckingOut = false;
          }
        });
      }
    });
  }

  private extractErrorMessage(error: unknown): string {
    const payload = (error as { error?: unknown } | null)?.error;
    if (!payload) {
      return '';
    }

    if (typeof payload === 'string') {
      try {
        const parsed = JSON.parse(payload) as { message?: string; Message?: string };
        return parsed.message ?? parsed.Message ?? payload;
      } catch {
        return payload;
      }
    }

    if (typeof payload === 'object') {
      const objectPayload = payload as { message?: string; Message?: string };
      return objectPayload.message ?? objectPayload.Message ?? '';
    }

    return '';
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

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { ShoppingCart } from '../models/shopping-cart.model';

@Injectable({
  providedIn: 'root'
})
export class PaymentService {
  private readonly baseUrl = '/api/payment';

  constructor(private readonly http: HttpClient) {}

  getMyCart(): Observable<ShoppingCart> {
    return this.http.get<ShoppingCart>(`${this.baseUrl}/cart/me`);
  }

  addTourToCart(tourId: string): Observable<ShoppingCart> {
    return this.http.post<ShoppingCart>(`${this.baseUrl}/cart/me/items`, { tourId });
  }

  removeTourFromCart(tourId: string): Observable<ShoppingCart> {
    return this.http.delete<ShoppingCart>(`${this.baseUrl}/cart/me/items/${encodeURIComponent(tourId)}`);
  }

  checkout(): Observable<{ purchasedItemCount: number; purchasedAt: string }> {
    return this.http.post<{ purchasedItemCount: number; purchasedAt: string }>(`${this.baseUrl}/cart/me/checkout`, {});
  }
}

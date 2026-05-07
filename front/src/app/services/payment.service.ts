import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Subject } from 'rxjs';

import { ShoppingCart } from '../models/shopping-cart.model';
import { Wallet } from '../models/wallet.model';

@Injectable({
  providedIn: 'root'
})
export class PaymentService {
  private readonly baseUrl = '/api/payment';
  private readonly walletRefreshSubject = new Subject<void>();

  readonly walletRefresh$ = this.walletRefreshSubject.asObservable();

  constructor(private readonly http: HttpClient) {}

  getMyCart(): Observable<ShoppingCart> {
    return this.http.get<ShoppingCart>(`${this.baseUrl}/cart/me`);
  }

  getMyWallet(): Observable<Wallet> {
    return this.http.get<Wallet>(`${this.baseUrl}/wallet/me`);
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

  refreshWallet(): void {
    this.walletRefreshSubject.next();
  }
}

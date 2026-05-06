import { Component } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, map, startWith, switchMap } from 'rxjs/operators';

import { User } from './models/user.model';
import { AuthService } from './services/auth.service';
import { PaymentService } from './services/payment.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  readonly currentUser$: Observable<User | null>;
  readonly walletBalance$: Observable<number | null>;
  sidebarOpen = true;

  constructor(
    private readonly authService: AuthService,
    private readonly paymentService: PaymentService
  ) {
    this.currentUser$ = this.authService.currentUser$;
    this.walletBalance$ = this.currentUser$.pipe(
      switchMap((user) => {
        if (!user || user.role !== 'tourist') {
          return of(null);
        }

        return this.paymentService.walletRefresh$.pipe(
          startWith(void 0),
          switchMap(() => this.paymentService.getMyWallet()),
          map((wallet) => wallet.balance),
          catchError(() => of(null))
        );
      })
    );
  }

  logout(): void {
    this.authService.logout().subscribe();
  }

  toggleSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen;
  }
}

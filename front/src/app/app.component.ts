import { Component } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { Observable } from 'rxjs';
import { filter } from 'rxjs/operators';

import { User } from './models/user.model';
import { HomeActionsService } from './services/home-actions.service';
import { AuthService } from './services/auth.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  readonly currentUser$: Observable<User | null>;
  isHomeRoute = false;

  constructor(
    private readonly authService: AuthService,
    private readonly homeActionsService: HomeActionsService,
    private readonly router: Router
  ) {
    this.currentUser$ = this.authService.currentUser$;
    this.isHomeRoute = this.router.url.startsWith('/home');

    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe(() => {
        this.isHomeRoute = this.router.url.startsWith('/home');
      });
  }

  logout(): void {
    this.authService.logout().subscribe();
  }

  openCreateBlog(): void {
    this.homeActionsService.openCreateBlog();
  }
}

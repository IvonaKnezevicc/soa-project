import { Component } from '@angular/core';
import { Observable } from 'rxjs';

import { User } from '../models/user.model';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent {
  readonly currentUser$: Observable<User | null>;

  constructor(private readonly authService: AuthService) {
    this.currentUser$ = this.authService.currentUser$;
  }
}

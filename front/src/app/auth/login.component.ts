import { Component } from '@angular/core';
import { NonNullableFormBuilder, Validators } from '@angular/forms';

import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  errorMessage = '';
  successMessage = '';

  readonly form = this.formBuilder.group({
    username: ['', [Validators.required]],
    password: ['', [Validators.required]]
  });

  constructor(
    private readonly formBuilder: NonNullableFormBuilder,
    private readonly authService: AuthService
  ) {}

  submit(): void {
    this.errorMessage = '';
    this.successMessage = '';

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.authService.login(this.form.getRawValue()).subscribe({
      next: () => {
        this.successMessage = 'Login successful.';
        this.form.reset();
      },
      error: (error) => {
        this.errorMessage = error?.error?.message ?? 'Login failed.';
      }
    });
  }
}

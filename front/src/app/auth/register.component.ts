import { Component } from '@angular/core';
import { NonNullableFormBuilder, Validators } from '@angular/forms';
import { switchMap } from 'rxjs';

import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css']
})
export class RegisterComponent {
  errorMessage = '';
  successMessage = '';

  readonly form = this.formBuilder.group({
    username: ['', [Validators.required, Validators.minLength(3)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(5)]],
    confirmPassword: ['', [Validators.required, Validators.minLength(5)]],
    role: ['guide', [Validators.required]]
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

    const { username, email, password, confirmPassword, role } = this.form.getRawValue();
    if (password !== confirmPassword) {
      this.errorMessage = 'Passwords do not match.';
      return;
    }

    this.authService.register({ username, email, password, role }).pipe(
      switchMap(() => this.authService.login({ username, password }))
    ).subscribe({
      next: () => {
        this.successMessage = 'Registration successful.';
        this.form.reset({ role: 'guide' as const });
      },
      error: (error) => {
        this.errorMessage = error?.error?.message ?? 'Registration failed.';
      }
    });
  }
}

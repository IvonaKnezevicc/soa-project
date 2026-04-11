import { Component, OnInit } from '@angular/core';
import { NonNullableFormBuilder, Validators } from '@angular/forms';
import { Observable } from 'rxjs';

import { User } from '../models/user.model';
import { UserProfile } from '../models/user-profile.model';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css']
})
export class ProfileComponent implements OnInit {
  readonly currentUser$: Observable<User | null>;
  profile: UserProfile | null = null;
  isLoading = false;
  isSaving = false;
  isEditOpen = false;
  errorMessage = '';
  successMessage = '';
  profileAllowed = false;
  private successMessageTimeoutId: ReturnType<typeof setTimeout> | null = null;

  readonly form = this.formBuilder.group({
    firstName: ['', [Validators.maxLength(100)]],
    lastName: ['', [Validators.maxLength(100)]],
    profileImage: ['', [Validators.maxLength(2_000_000)]],
    biography: ['', [Validators.maxLength(1000)]],
    motto: ['', [Validators.maxLength(250)]]
  });

  constructor(
    private readonly authService: AuthService,
    private readonly formBuilder: NonNullableFormBuilder
  ) {
    this.currentUser$ = this.authService.currentUser$;
  }

  ngOnInit(): void {
    this.currentUser$.subscribe((user) => {
      this.profileAllowed = user?.role === 'guide' || user?.role === 'tourist';
      if (this.profileAllowed) {
        this.loadProfile();
      }
    });
  }

  loadProfile(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.authService.getMyProfile().subscribe({
      next: (profile) => {
        this.profile = profile;
        this.form.setValue({
          firstName: profile.firstName ?? '',
          lastName: profile.lastName ?? '',
          profileImage: profile.profileImage ?? '',
          biography: profile.biography ?? '',
          motto: profile.motto ?? ''
        });
        this.isLoading = false;
      },
      error: (error) => {
        this.errorMessage = error?.error?.message ?? 'Failed to load profile.';
        this.isLoading = false;
      }
    });
  }

  saveProfile(): void {
    this.errorMessage = '';
    this.successMessage = '';

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSaving = true;
    this.authService.updateMyProfile(this.form.getRawValue()).subscribe({
      next: (profile) => {
        this.profile = profile;
        this.successMessage = 'Profile updated successfully.';
        this.startSuccessMessageAutoHide();
        this.isSaving = false;
        this.isEditOpen = false;
      },
      error: (error) => {
        this.errorMessage = error?.error?.message ?? 'Failed to update profile.';
        this.isSaving = false;
      }
    });
  }

  private startSuccessMessageAutoHide(): void {
    if (this.successMessageTimeoutId) {
      clearTimeout(this.successMessageTimeoutId);
    }

    this.successMessageTimeoutId = setTimeout(() => {
      this.successMessage = '';
      this.successMessageTimeoutId = null;
    }, 3000);
  }

  openEditForm(): void {
    this.errorMessage = '';
    this.successMessage = '';
    this.form.setValue({
      firstName: this.profile?.firstName ?? '',
      lastName: this.profile?.lastName ?? '',
      profileImage: this.profile?.profileImage ?? '',
      biography: this.profile?.biography ?? '',
      motto: this.profile?.motto ?? ''
    });
    this.isEditOpen = true;
  }

  closeEditForm(): void {
    if (this.isSaving) {
      return;
    }
    this.isEditOpen = false;
  }

  onImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      this.errorMessage = 'Please select an image file.';
      return;
    }

    if (file.size > 1_500_000) {
      this.errorMessage = 'Image is too large. Please choose an image up to 1.5MB.';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== 'string') {
        this.errorMessage = 'Failed to read selected image.';
        return;
      }

      this.form.controls.profileImage.setValue(result);
      this.errorMessage = '';
    };
    reader.onerror = () => {
      this.errorMessage = 'Failed to read selected image.';
    };
    reader.readAsDataURL(file);
  }
}

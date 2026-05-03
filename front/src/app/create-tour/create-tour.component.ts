import { Component } from '@angular/core';
import { NonNullableFormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';

import { ToursService } from '../services/tours.service';

type TourDifficulty = 'easy' | 'medium' | 'advanced' | 'hard';

@Component({
  selector: 'app-create-tour',
  templateUrl: './create-tour.component.html',
  styleUrls: ['./create-tour.component.css']
})
export class CreateTourComponent {
  readonly difficultyOptions: Array<{ value: TourDifficulty; label: string; helper: string }> = [
    { value: 'easy', label: 'Easy', helper: 'Short, accessible and beginner-friendly.' },
    { value: 'medium', label: 'Medium', helper: 'Balanced pace with moderate effort.' },
    { value: 'advanced', label: 'Advanced', helper: 'Longer route with demanding sections.' },
    { value: 'hard', label: 'Hard', helper: 'High endurance and strong preparation required.' }
  ];

  isSubmitting = false;
  errorMessage = '';
  successMessage = '';
  tagsValidationMessage = '';

  readonly form = this.formBuilder.group({
    name: ['', [Validators.required, Validators.maxLength(200)]],
    description: ['', [Validators.required, Validators.maxLength(5000)]],
    difficulty: ['medium' as TourDifficulty, [Validators.required]],
    tagsInput: ['', [Validators.required, Validators.maxLength(500)]]
  });

  constructor(
    private readonly formBuilder: NonNullableFormBuilder,
    private readonly toursService: ToursService,
    private readonly router: Router
  ) {}

  submit(): void {
    this.errorMessage = '';
    this.successMessage = '';
    this.tagsValidationMessage = '';

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    const tags = raw.tagsInput
      .split(',')
      .map((tag) => tag.trim())
      .filter((tag, index, array) => tag.length > 0 && array.indexOf(tag) === index);
    if (tags.length === 0) {
      this.form.controls.tagsInput.markAsTouched();
      this.tagsValidationMessage = 'At least one tag is required.';
      return;
    }

    this.isSubmitting = true;
    this.toursService.createTour({
      name: raw.name.trim(),
      description: raw.description.trim(),
      difficulty: raw.difficulty,
      tags
    }).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.successMessage = 'Tour created successfully.';
        this.form.reset({
          name: '',
          description: '',
          difficulty: 'medium',
          tagsInput: ''
        });
        window.setTimeout(() => {
          this.router.navigate(['/my-tours']);
        }, 700);
      },
      error: (error) => {
        this.errorMessage = error?.error?.message ?? 'Failed to create tour.';
        this.isSubmitting = false;
      }
    });
  }

  clearTagsValidation(): void {
    if (this.tagsValidationMessage) {
      this.tagsValidationMessage = '';
    }
  }
}

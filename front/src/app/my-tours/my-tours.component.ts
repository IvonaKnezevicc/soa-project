import { Component, OnInit } from '@angular/core';
import { NonNullableFormBuilder, Validators } from '@angular/forms';

import { Tour, TourStatus } from '../models/tour.model';
import { ToursService } from '../services/tours.service';

@Component({
  selector: 'app-my-tours',
  templateUrl: './my-tours.component.html',
  styleUrls: ['./my-tours.component.css']
})
export class MyToursComponent implements OnInit {
  tours: Tour[] = [];
  filteredTours: Tour[] = [];
  visibleTours: Tour[] = [];
  selectedStatus: TourStatus = 'draft';
  page = 1;
  pageSize = 15;
  totalCount = 0;
  totalPages = 0;
  isLoading = false;
  updatingTourId = '';
  errorMessage = '';
  toastMessage = '';
  showToast = false;
  editingTourId = '';
  isSavingEdit = false;
  readonly difficultyOptions: Tour['difficulty'][] = ['easy', 'medium', 'advanced', 'hard'];
  readonly editForm = this.formBuilder.group({
    name: ['', [Validators.required, Validators.maxLength(200)]],
    description: ['', [Validators.required, Validators.maxLength(5000)]],
    difficulty: ['medium' as Tour['difficulty'], [Validators.required]],
    tagsInput: ['', [Validators.required, Validators.maxLength(500)]],
    price: [0, [Validators.required, Validators.min(0)]]
  });
  private toastTimeoutId: number | null = null;

  constructor(
    private readonly toursService: ToursService,
    private readonly formBuilder: NonNullableFormBuilder
  ) {}

  ngOnInit(): void {
    this.loadTours();
  }

  setStatus(status: TourStatus): void {
    if (this.selectedStatus === status || this.isLoading) {
      return;
    }

    this.selectedStatus = status;
    this.applyFilters();
  }

  changeTourStatus(tour: Tour, status: TourStatus): void {
    if (tour.status === status || this.isLoading || this.updatingTourId) {
      return;
    }

    this.updatingTourId = tour.id;
    this.errorMessage = '';

    this.toursService.updateTourStatus(tour.id, status).subscribe({
      next: (updatedTour) => {
        this.tours = this.tours.map((item) => item.id === updatedTour.id ? updatedTour : item);
        this.applyFilters();
        this.updatingTourId = '';
      },
      error: (error) => {
        const message = error?.error?.message ?? 'Failed to update tour status.';
        this.showErrorToast(message);
        this.updatingTourId = '';
      }
    });
  }

  startEdit(tour: Tour): void {
    if (tour.status !== 'draft' || this.isSavingEdit) {
      return;
    }
    this.editingTourId = tour.id;
    this.editForm.reset({
      name: tour.name,
      description: tour.description,
      difficulty: tour.difficulty,
      tagsInput: tour.tags.join(', '),
      price: Number(tour.price ?? 0)
    });
  }

  cancelEdit(): void {
    this.editingTourId = '';
    this.isSavingEdit = false;
  }

  get editingTour(): Tour | null {
    if (!this.editingTourId) {
      return null;
    }
    return this.tours.find((tour) => tour.id === this.editingTourId) ?? null;
  }

  saveEdit(tour: Tour): void {
    if (tour.status !== 'draft' || this.editForm.invalid || this.isSavingEdit) {
      this.editForm.markAllAsTouched();
      return;
    }

    const raw = this.editForm.getRawValue();
    const tags = raw.tagsInput
      .split(',')
      .map((tag) => tag.trim())
      .filter((tag, index, array) => tag.length > 0 && array.indexOf(tag) === index);

    if (!tags.length) {
      this.showErrorToast('At least one tag is required.');
      return;
    }

    this.isSavingEdit = true;
    this.toursService.updateTour(tour.id, {
      name: raw.name.trim(),
      description: raw.description.trim(),
      difficulty: raw.difficulty,
      tags,
      price: Number(raw.price)
    }).subscribe({
      next: (updatedTour) => {
        this.tours = this.tours.map((item) => item.id === updatedTour.id ? updatedTour : item);
        this.applyFilters();
        this.isSavingEdit = false;
        this.editingTourId = '';
      },
      error: (error) => {
        const message = error?.error?.message ?? 'Failed to update tour.';
        this.showErrorToast(message);
        this.isSavingEdit = false;
      }
    });
  }

  getStatusLabel(status: TourStatus): string {
    if (status === 'published') {
      return 'Publish';
    }

    if (status === 'archived') {
      return 'Archive';
    }

    return 'Move to draft';
  }

  getAvailableStatuses(status: TourStatus): TourStatus[] {
    if (status === 'draft') {
      return ['published'];
    }

    if (status === 'published') {
      return ['archived'];
    }

    return ['published'];
  }

  previousPage(): void {
    if (this.page <= 1 || this.isLoading) {
      return;
    }

    this.setPage(this.page - 1);
  }

  nextPage(): void {
    if (this.page >= this.totalPages || this.isLoading) {
      return;
    }

    this.setPage(this.page + 1);
  }

  private loadTours(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.toursService.getMyTours().subscribe({
      next: (tours) => {
        this.tours = tours;
        this.applyFilters();
        this.isLoading = false;
      },
      error: (error) => {
        this.errorMessage = error?.error?.message ?? 'Failed to load tours.';
        this.isLoading = false;
      }
    });
  }

  private applyFilters(): void {
    this.filteredTours = this.tours.filter((tour) => tour.status === this.selectedStatus);
    this.totalCount = this.filteredTours.length;
    this.totalPages = Math.max(1, Math.ceil(this.totalCount / this.pageSize));
    this.setPage(1);
  }

  private setPage(page: number): void {
    this.page = page;
    const start = (page - 1) * this.pageSize;
    this.visibleTours = this.filteredTours.slice(start, start + this.pageSize);
  }

  closeToast(): void {
    this.showToast = false;
    if (this.toastTimeoutId !== null) {
      window.clearTimeout(this.toastTimeoutId);
      this.toastTimeoutId = null;
    }
  }

  private showErrorToast(message: string): void {
    this.toastMessage = message;
    this.showToast = true;
    if (this.toastTimeoutId !== null) {
      window.clearTimeout(this.toastTimeoutId);
    }
    this.toastTimeoutId = window.setTimeout(() => {
      this.showToast = false;
      this.toastTimeoutId = null;
    }, 3200);
  }
}

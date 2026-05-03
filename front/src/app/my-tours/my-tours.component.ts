import { Component, OnInit } from '@angular/core';

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

  constructor(private readonly toursService: ToursService) {}

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
        this.errorMessage = error?.error?.message ?? 'Failed to update tour status.';
        this.updatingTourId = '';
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

    return 'Draft';
  }

  getAvailableStatuses(status: TourStatus): TourStatus[] {
    if (status === 'draft') {
      return ['published'];
    }

    if (status === 'published') {
      return ['draft', 'archived'];
    }

    return ['draft', 'published'];
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
}

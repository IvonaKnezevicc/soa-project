import { Component, OnInit } from '@angular/core';

import { Tour } from '../models/tour.model';
import { ToursService } from '../services/tours.service';

type TourStatusFilter = 'draft' | 'published' | 'archived';

@Component({
  selector: 'app-my-tours',
  templateUrl: './my-tours.component.html',
  styleUrls: ['./my-tours.component.css']
})
export class MyToursComponent implements OnInit {
  tours: Tour[] = [];
  filteredTours: Tour[] = [];
  visibleTours: Tour[] = [];
  selectedStatus: TourStatusFilter = 'draft';
  page = 1;
  pageSize = 15;
  totalCount = 0;
  totalPages = 0;
  isLoading = false;
  errorMessage = '';

  constructor(private readonly toursService: ToursService) {}

  ngOnInit(): void {
    this.loadTours();
  }

  setStatus(status: TourStatusFilter): void {
    if (this.selectedStatus === status || this.isLoading) {
      return;
    }

    this.selectedStatus = status;
    this.applyFilters();
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

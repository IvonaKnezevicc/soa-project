import { Component, OnInit } from '@angular/core';

import { Tour } from '../models/tour.model';
import { ToursService } from '../services/tours.service';

@Component({
  selector: 'app-tourist-my-tours',
  templateUrl: './tourist-my-tours.component.html',
  styleUrls: ['./tourist-my-tours.component.css']
})
export class TouristMyToursComponent implements OnInit {
  tours: Tour[] = [];
  isLoading = false;
  errorMessage = '';

  constructor(private readonly toursService: ToursService) {}

  ngOnInit(): void {
    this.loadTours();
  }

  getFirstPointImage(tour: Tour): string {
    return tour.keyPoints[0]?.image?.trim() || '';
  }

  formatDurationLabel(transportType: string): string {
    switch (transportType) {
      case 'walking':
        return 'Walking';
      case 'bicycle':
        return 'Bicycle';
      case 'car':
        return 'Car';
      default:
        return transportType;
    }
  }

  private loadTours(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.toursService.getPublishedTours().subscribe({
      next: (tours) => {
        this.tours = tours.filter((tour) => tour.purchasedByCurrentUser);
        this.isLoading = false;
      },
      error: (error) => {
        this.errorMessage = error?.error?.message ?? 'Failed to load purchased tours.';
        this.isLoading = false;
      }
    });
  }
}

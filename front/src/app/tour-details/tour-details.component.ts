import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import * as L from 'leaflet';
import 'leaflet-routing-machine';

import { Tour } from '../models/tour.model';
import { TourExecution } from '../models/tour-execution.model';
import { TourReview } from '../models/tour-review.model';
import { ToursService } from '../services/tours.service';

@Component({
  selector: 'app-tour-details',
  templateUrl: './tour-details.component.html',
  styleUrls: ['./tour-details.component.css']
})
export class TourDetailsComponent implements OnInit, OnDestroy {
  tour: Tour | null = null;
  activeExecution: TourExecution | null = null;
  reviews: TourReview[] = [];
  detailContext = '';
  reviewForm: ReviewFormState = {
    rating: 5,
    comment: '',
    visitedAt: '',
    images: [],
    imageNames: []
  };
  reviewSubmitting = false;
  reviewSuccessMessage = '';
  reviewErrorMessage = '';
  selectedReviewGalleryImages: string[] = [];
  selectedReviewGalleryIndex = 0;
  isLoading = false;
  isStarting = false;
  errorMessage = '';
  actionMessage = '';

  private map: L.Map | null = null;
  private pointsLayer = L.layerGroup();
  private routingControl: any = null;
  private readonly defaultCoordinate: L.LatLngTuple = [45.2671, 19.8335];
  private tourId = '';

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly toursService: ToursService
  ) {}

  ngOnInit(): void {
    this.tourId = this.route.snapshot.paramMap.get('id') ?? '';
    this.detailContext = this.route.snapshot.data['context'] ?? '';
    this.loadTour();
  }

  ngOnDestroy(): void {
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
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

  get isFindToursDetail(): boolean {
    return this.detailContext === 'find-tours';
  }

  get isMyToursDetail(): boolean {
    return this.detailContext === 'my-tours';
  }

  canStartTour(): boolean {
    return !!this.tour
      && this.tour.purchasedByCurrentUser
      && (this.tour.status === 'published' || this.tour.status === 'archived')
      && !this.activeExecution;
  }

  canContinueActiveTour(): boolean {
    return !!this.tour
      && !!this.activeExecution
      && this.activeExecution.tourId === this.tour.id
      && this.activeExecution.status === 'active';
  }

  startTour(): void {
    if (!this.tour || !this.canStartTour() || this.isStarting) {
      return;
    }

    this.isStarting = true;
    this.errorMessage = '';
    this.actionMessage = '';
    const tourId = this.tour.id;

    this.toursService.startTourExecution(tourId).subscribe({
      next: () => {
        this.isStarting = false;
        this.router.navigate(this.isMyToursDetail ? ['/tourist/my-tours', tourId, 'active'] : ['/tours', tourId, 'active']);
      },
      error: (error) => {
        this.actionMessage = error?.error?.message ?? 'Failed to start the tour.';
        this.isStarting = false;
        this.loadActiveExecution();
      }
    });
  }

  continueActiveTour(): void {
    if (!this.tour || !this.canContinueActiveTour()) {
      return;
    }

    this.router.navigate(this.isMyToursDetail ? ['/tourist/my-tours', this.tour.id, 'active'] : ['/tours', this.tour.id, 'active']);
  }

  goBackToFindTours(): void {
    this.router.navigate(['/find-tours']);
  }

  goBackToMyTours(): void {
    this.router.navigate(['/tourist/my-tours']);
  }

  updateReviewRating(value: string): void {
    this.reviewForm.rating = Number(value);
  }

  updateReviewComment(value: string): void {
    this.reviewForm.comment = value;
  }

  updateReviewVisitedAt(value: string): void {
    this.reviewForm.visitedAt = value;
  }

  submitReview(): void {
    this.reviewErrorMessage = '';
    this.reviewSuccessMessage = '';

    if (!this.reviewForm.rating || this.reviewForm.rating < 1 || this.reviewForm.rating > 5) {
      this.reviewErrorMessage = 'Rating must be between 1 and 5.';
      return;
    }

    if (!this.reviewForm.comment.trim()) {
      this.reviewErrorMessage = 'Comment is required.';
      return;
    }

    if (!this.reviewForm.visitedAt) {
      this.reviewErrorMessage = 'Visited date is required.';
      return;
    }

    this.reviewSubmitting = true;
    this.toursService.createTourReview(this.tourId, {
      rating: this.reviewForm.rating,
      comment: this.reviewForm.comment.trim(),
      visitedAt: this.reviewForm.visitedAt,
      images: this.reviewForm.images
    }).subscribe({
      next: () => {
        this.reviewForm = {
          rating: 5,
          comment: '',
          visitedAt: '',
          images: [],
          imageNames: []
        };
        this.reviewSuccessMessage = 'Review saved.';
        this.reviewSubmitting = false;
        this.loadReviews();
      },
      error: (error) => {
        this.reviewErrorMessage = error?.error?.message ?? 'Failed to save review.';
        this.reviewSubmitting = false;
      }
    });
  }

  async onReviewImagesSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    if (files.length === 0) {
      return;
    }

    const nextTotalCount = this.reviewForm.images.length + files.length;
    if (nextTotalCount > 10) {
      this.reviewErrorMessage = 'At most 10 images are allowed.';
      return;
    }

    const imageFiles = files.filter((file) => file.type.startsWith('image/'));
    if (imageFiles.length !== files.length) {
      this.reviewErrorMessage = 'Please select image files only.';
      return;
    }

    const oversized = imageFiles.find((file) => file.size > 1_500_000);
    if (oversized) {
      this.reviewErrorMessage = `Image "${oversized.name}" is too large (max 1.5MB).`;
      return;
    }

    try {
      const encoded = await Promise.all(imageFiles.map((file) => this.readFileAsDataURL(file)));
      this.reviewForm.images = [...this.reviewForm.images, ...encoded];
      this.reviewForm.imageNames = [...this.reviewForm.imageNames, ...imageFiles.map((file) => file.name)];
      this.reviewErrorMessage = '';
      input.value = '';
    } catch {
      this.reviewErrorMessage = 'Failed to read selected images.';
    }
  }

  removeSelectedReviewImage(index: number, input?: HTMLInputElement): void {
    this.reviewForm.images = this.reviewForm.images.filter((_, imageIndex) => imageIndex !== index);
    this.reviewForm.imageNames = this.reviewForm.imageNames.filter((_, imageIndex) => imageIndex !== index);
    if (input) {
      input.value = '';
    }
  }

  openReviewGallery(images: string[], startIndex = 0): void {
    if (!images.length) {
      return;
    }

    this.selectedReviewGalleryImages = [...images];
    this.selectedReviewGalleryIndex = startIndex;
  }

  closeReviewGallery(): void {
    this.selectedReviewGalleryImages = [];
    this.selectedReviewGalleryIndex = 0;
  }

  previousReviewGalleryImage(): void {
    if (this.selectedReviewGalleryImages.length <= 1) {
      return;
    }

    const length = this.selectedReviewGalleryImages.length;
    this.selectedReviewGalleryIndex = (this.selectedReviewGalleryIndex - 1 + length) % length;
  }

  nextReviewGalleryImage(): void {
    if (this.selectedReviewGalleryImages.length <= 1) {
      return;
    }

    this.selectedReviewGalleryIndex = (this.selectedReviewGalleryIndex + 1) % this.selectedReviewGalleryImages.length;
  }

  private loadTour(): void {
    if (!this.tourId) {
      this.errorMessage = 'Tour id is missing.';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    this.toursService.getTourById(this.tourId).subscribe({
      next: (tour) => {
        this.tour = {
          ...tour,
          keyPoints: [...tour.keyPoints].sort((left, right) => left.order - right.order)
        };
        this.loadActiveExecution();
        this.loadReviews();
        this.isLoading = false;
        window.setTimeout(() => this.ensureMapInitialized());
      },
      error: (error) => {
        this.errorMessage = error?.error?.message ?? 'Failed to load tour details.';
        this.isLoading = false;
      }
    });
  }

  private loadActiveExecution(): void {
    this.toursService.getActiveExecution().subscribe({
      next: (execution) => {
        this.activeExecution = execution;
        if (this.tour && execution.tourId !== this.tour.id) {
          this.actionMessage = `You already have an active tour: ${execution.tourName}.`;
        }
      },
      error: () => {
        this.activeExecution = null;
      }
    });
  }

  private loadReviews(): void {
    this.toursService.getTourReviews(this.tourId).subscribe({
      next: (reviews) => {
        this.reviews = reviews;
      },
      error: () => {
        this.reviews = [];
      }
    });
  }

  private ensureMapInitialized(): void {
    if (this.map) {
      this.map.invalidateSize();
      this.renderTourOnMap();
      return;
    }

    const container = document.getElementById('tour-details-map');
    if (!container) {
      return;
    }

    const center: L.LatLngTuple = this.tour?.keyPoints.length
      ? [this.tour.keyPoints[0].latitude, this.tour.keyPoints[0].longitude]
      : this.defaultCoordinate;

    this.map = L.map('tour-details-map', {
      center,
      zoom: 13
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(this.map);

    this.pointsLayer.addTo(this.map);
    this.renderTourOnMap();
  }

  private renderTourOnMap(): void {
    if (!this.map || !this.tour) {
      return;
    }

    this.pointsLayer.clearLayers();

    if (this.routingControl) {
      this.map.removeControl(this.routingControl);
      this.routingControl = null;
    }

    const coordinates: L.LatLngTuple[] = [];

    for (const point of this.tour.keyPoints) {
      const coordinate: L.LatLngTuple = [point.latitude, point.longitude];
      coordinates.push(coordinate);

      const marker = L.circleMarker(coordinate, {
        radius: 8,
        color: this.tour.purchasedByCurrentUser ? '#8b1e3f' : '#0f172a',
        fillColor: this.tour.purchasedByCurrentUser ? '#fdf2f8' : '#dbeafe',
        fillOpacity: 0.95,
        weight: 3
      });

      marker.bindTooltip(this.buildTooltipHtml(point), {
        direction: 'top',
        offset: [0, -10],
        opacity: 1,
        className: 'map-point-tooltip'
      });

      this.pointsLayer.addLayer(marker);
    }

    if (this.tour.purchasedByCurrentUser && coordinates.length >= 2) {
      this.renderRouting(coordinates);
    }

    if (coordinates.length) {
      if (coordinates.length === 1) {
        this.map.setView(coordinates[0], 13);
      } else {
        this.map.fitBounds(L.latLngBounds(coordinates).pad(0.2));
      }
    }
  }

  private renderRouting(coordinates: L.LatLngTuple[]): void {
    if (!this.map) {
      return;
    }

    const lineOptions = {
      styles: [
        { color: '#0f172a', opacity: 0.15, weight: 8 },
        { color: '#8b1e3f', opacity: 0.9, weight: 5 }
      ],
      extendToWaypoints: true,
      missingRouteTolerance: 0
    };

    this.routingControl = (L as any).Routing.control({
      waypoints: coordinates.map((coordinate) => L.latLng(coordinate[0], coordinate[1])),
      addWaypoints: false,
      draggableWaypoints: false,
      fitSelectedRoutes: false,
      routeWhileDragging: false,
      show: false,
      lineOptions,
      createMarker: () => null,
      router: (L as any).Routing.osrmv1({
        serviceUrl: 'https://router.project-osrm.org/route/v1',
        profile: 'foot'
      })
    });

    this.routingControl.addTo(this.map);
  }

  private buildTooltipHtml(point: Tour['keyPoints'][number]): string {
    const image = point.image?.trim()
      ? `<img src="${point.image}" alt="${this.escapeHtml(point.name)}" />`
      : '<div class="map-point-preview__empty">No image</div>';

    return `
      <div class="map-point-preview">
        ${image}
        <div class="map-point-preview__title">${point.order}. ${this.escapeHtml(point.name)}</div>
        <div class="map-point-preview__description">${this.escapeHtml(point.description)}</div>
      </div>
    `;
  }

  private readFileAsDataURL(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
          return;
        }

        reject(new Error('Invalid file reader result'));
      };
      reader.onerror = () => reject(new Error('File read failed'));
      reader.readAsDataURL(file);
    });
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}

interface ReviewFormState {
  rating: number;
  comment: string;
  visitedAt: string;
  images: string[];
  imageNames: string[];
}

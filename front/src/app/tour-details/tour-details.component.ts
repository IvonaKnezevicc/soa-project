import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import * as L from 'leaflet';
import 'leaflet-routing-machine';

import { Tour } from '../models/tour.model';
import { TourReview } from '../models/tour-review.model';
import { ToursService } from '../services/tours.service';

@Component({
  selector: 'app-tour-details',
  templateUrl: './tour-details.component.html',
  styleUrls: ['./tour-details.component.css']
})
export class TourDetailsComponent implements OnInit, OnDestroy {
  tour: Tour | null = null;
  reviews: TourReview[] = [];
  isLoading = false;
  errorMessage = '';

  private map: L.Map | null = null;
  private pointsLayer = L.layerGroup();
  private routingControl: any = null;
  private readonly defaultCoordinate: L.LatLngTuple = [45.2671, 19.8335];
  private tourId = '';

  constructor(
    private readonly route: ActivatedRoute,
    private readonly toursService: ToursService
  ) {}

  ngOnInit(): void {
    this.tourId = this.route.snapshot.paramMap.get('id') ?? '';
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

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}

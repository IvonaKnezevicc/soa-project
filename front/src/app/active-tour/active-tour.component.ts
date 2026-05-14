import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import * as L from 'leaflet';
import 'leaflet-routing-machine';

import { TourExecution } from '../models/tour-execution.model';
import { Tour } from '../models/tour.model';
import { TouristPosition } from '../models/tourist-position.model';
import { ToursService } from '../services/tours.service';

@Component({
  selector: 'app-active-tour',
  templateUrl: './active-tour.component.html',
  styleUrls: ['./active-tour.component.css']
})
export class ActiveTourComponent implements OnInit, OnDestroy {
  tour: Tour | null = null;
  execution: TourExecution | null = null;
  position: TouristPosition | null = null;
  detailContext = '';
  isLoading = false;
  isChecking = false;
  isFinishing = false;
  errorMessage = '';
  successMessage = '';

  private tourId = '';
  private map: L.Map | null = null;
  private pointsLayer = L.layerGroup();
  private positionLayer = L.layerGroup();
  private routingControl: any = null;
  private progressIntervalId: number | null = null;
  private readonly defaultCoordinate: L.LatLngTuple = [45.2671, 19.8335];

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly toursService: ToursService
  ) {}

  ngOnInit(): void {
    this.tourId = this.route.snapshot.paramMap.get('id') ?? '';
    this.detailContext = this.route.snapshot.data['context'] ?? '';
    this.loadActiveTour();
  }

  ngOnDestroy(): void {
    this.stopProgressInterval();

    if (this.map) {
      this.map.remove();
      this.map = null;
    }
  }

  checkProgress(): void {
    if (!this.execution || this.execution.status !== 'active' || this.isChecking) {
      return;
    }

    this.isChecking = true;

    this.toursService.getMyPosition().subscribe({
      next: (position) => {
        this.position = position;
        this.renderPosition();

        if (!this.execution) {
          this.isChecking = false;
          return;
        }

        this.toursService.checkExecutionProgress(this.execution.id).subscribe({
          next: (execution) => {
            this.execution = execution;
            this.successMessage = 'Progress checked.';
            this.isChecking = false;
            this.renderTourOnMap();
            this.stopIntervalIfFinished();
          },
          error: (error) => {
            this.errorMessage = error?.error?.message ?? 'Failed to check progress.';
            this.isChecking = false;
          }
        });
      },
      error: (error) => {
        this.errorMessage = error?.error?.message ?? 'Failed to read current position.';
        this.isChecking = false;
      }
    });
  }

  completeExecution(): void {
    if (!this.execution || this.isFinishing) {
      return;
    }

    this.isFinishing = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.toursService.completeExecution(this.execution.id).subscribe({
      next: (execution) => {
        this.execution = execution;
        this.successMessage = 'Tour completed.';
        this.isFinishing = false;
        this.stopProgressInterval();
      },
      error: (error) => {
        this.errorMessage = error?.error?.message ?? 'Failed to complete the tour.';
        this.isFinishing = false;
      }
    });
  }

  abandonExecution(): void {
    if (!this.execution || this.isFinishing) {
      return;
    }

    this.isFinishing = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.toursService.abandonExecution(this.execution.id).subscribe({
      next: (execution) => {
        this.execution = execution;
        this.successMessage = 'Tour abandoned.';
        this.isFinishing = false;
        this.stopProgressInterval();
      },
      error: (error) => {
        this.errorMessage = error?.error?.message ?? 'Failed to abandon the tour.';
        this.isFinishing = false;
      }
    });
  }

  isKeyPointCompleted(keyPointId: string): boolean {
    return !!this.execution?.completedKeyPoints.some((item) => item.keyPointId === keyPointId);
  }

  getCompletedAt(keyPointId: string): string | null {
    return this.execution?.completedKeyPoints.find((item) => item.keyPointId === keyPointId)?.reachedAt ?? null;
  }

  backToDetails(): void {
    this.router.navigate(this.detailContext === 'my-tours' ? ['/tourist/my-tours', this.tourId] : ['/tours', this.tourId]);
  }

  private loadActiveTour(): void {
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
        this.loadExecution();
      },
      error: (error) => {
        this.errorMessage = error?.error?.message ?? 'Failed to load tour.';
        this.isLoading = false;
      }
    });
  }

  private loadExecution(): void {
    this.toursService.getActiveExecution().subscribe({
      next: (execution) => {
        if (execution.tourId !== this.tourId) {
          this.errorMessage = 'Another tour is currently active.';
          this.isLoading = false;
          return;
        }

        this.execution = execution;
        this.loadPosition();
      },
      error: (error: HttpErrorResponse) => {
        this.errorMessage = error.status === 404
          ? 'Active tour execution was not found.'
          : (error?.error?.message ?? 'Failed to load active tour execution.');
        this.isLoading = false;
      }
    });
  }

  private loadPosition(): void {
    this.toursService.getMyPosition().subscribe({
      next: (position) => {
        this.position = position;
        this.isLoading = false;
        window.setTimeout(() => {
          this.ensureMapInitialized();
          this.startProgressInterval();
        });
      },
      error: (error) => {
        this.errorMessage = error?.error?.message ?? 'Failed to load current position.';
        this.isLoading = false;
      }
    });
  }

  private ensureMapInitialized(): void {
    if (this.map) {
      this.map.invalidateSize();
      this.renderTourOnMap();
      this.renderPosition();
      return;
    }

    const container = document.getElementById('active-tour-map');
    if (!container) {
      return;
    }

    const center: L.LatLngTuple = this.tour?.keyPoints.length
      ? [this.tour.keyPoints[0].latitude, this.tour.keyPoints[0].longitude]
      : this.defaultCoordinate;

    this.map = L.map('active-tour-map', {
      center,
      zoom: 13
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(this.map);

    this.pointsLayer.addTo(this.map);
    this.positionLayer.addTo(this.map);
    this.renderTourOnMap();
    this.renderPosition();
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
      const completed = this.isKeyPointCompleted(point.id);
      const coordinate: L.LatLngTuple = [point.latitude, point.longitude];
      coordinates.push(coordinate);

      const marker = L.circleMarker(coordinate, {
        radius: completed ? 10 : 8,
        color: completed ? '#166534' : '#0f172a',
        fillColor: completed ? '#dcfce7' : '#dbeafe',
        fillOpacity: 0.95,
        weight: 3
      });

      marker.bindTooltip(`${point.order}. ${point.name}`, {
        direction: 'top',
        offset: [0, -10],
        opacity: 1
      });

      this.pointsLayer.addLayer(marker);
    }

    if (coordinates.length >= 2) {
      this.renderRouting(coordinates);
    }

    if (coordinates.length) {
      this.map.fitBounds(L.latLngBounds(coordinates).pad(0.2));
    }
  }

  private renderPosition(): void {
    if (!this.map || !this.position) {
      return;
    }

    this.positionLayer.clearLayers();

    const marker = L.circleMarker([this.position.latitude, this.position.longitude], {
      radius: 9,
      color: '#8b1e3f',
      fillColor: '#fdf2f8',
      fillOpacity: 0.95,
      weight: 3
    });

    marker.bindTooltip('Current position');
    this.positionLayer.addLayer(marker);
  }

  private renderRouting(coordinates: L.LatLngTuple[]): void {
    if (!this.map) {
      return;
    }

    this.routingControl = (L as any).Routing.control({
      waypoints: coordinates.map((coordinate) => L.latLng(coordinate[0], coordinate[1])),
      addWaypoints: false,
      draggableWaypoints: false,
      fitSelectedRoutes: false,
      routeWhileDragging: false,
      show: false,
      lineOptions: {
        styles: [
          { color: '#0f172a', opacity: 0.15, weight: 8 },
          { color: '#8b1e3f', opacity: 0.9, weight: 5 }
        ],
        extendToWaypoints: true,
        missingRouteTolerance: 0
      },
      createMarker: () => null,
      router: (L as any).Routing.osrmv1({
        serviceUrl: 'https://router.project-osrm.org/route/v1',
        profile: 'foot'
      })
    });

    this.routingControl.addTo(this.map);
  }

  private startProgressInterval(): void {
    this.stopProgressInterval();

    if (!this.execution || this.execution.status !== 'active') {
      return;
    }

    this.progressIntervalId = window.setInterval(() => this.checkProgress(), 10000);
  }

  private stopProgressInterval(): void {
    if (this.progressIntervalId !== null) {
      window.clearInterval(this.progressIntervalId);
      this.progressIntervalId = null;
    }
  }

  private stopIntervalIfFinished(): void {
    if (this.execution?.status === 'completed' || this.execution?.status === 'abandoned') {
      this.stopProgressInterval();
    }
  }
}

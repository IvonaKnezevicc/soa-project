import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { NonNullableFormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Router } from '@angular/router';
import * as L from 'leaflet';
import 'leaflet-routing-machine';

import { KeyPoint } from '../models/key-point.model';
import { Tour } from '../models/tour.model';
import { ToursService } from '../services/tours.service';

@Component({
  selector: 'app-tour-key-points',
  templateUrl: './tour-key-points.component.html',
  styleUrls: ['./tour-key-points.component.css']
})
export class TourKeyPointsComponent implements OnInit, OnDestroy {
  @ViewChild('imageInput') imageInputRef?: ElementRef<HTMLInputElement>;
  tour: Tour | null = null;
  selectedKeyPointId: string | null = null;
  isLoading = false;
  isSaving = false;
  isSavingDurations = false;
  errorMessage = '';
  successMessage = '';
  durationsMessage = '';
  mapHintMessage = 'Click on the map to pick a location.';

  private map: L.Map | null = null;
  private pointsLayer = L.layerGroup();
  private draftLayer = L.layerGroup();
  private routingControl: any = null;
  private tourId = '';

  readonly form = this.formBuilder.group({
    name: ['', [Validators.required, Validators.maxLength(200)]],
    description: ['', [Validators.required, Validators.maxLength(5000)]],
    image: ['', [Validators.required, Validators.maxLength(2_000_000)]],
    latitude: [0],
    longitude: [0]
  });

  readonly durationsForm = this.formBuilder.group({
    walkingMinutes: [0, [Validators.min(0)]],
    bicycleMinutes: [0, [Validators.min(0)]],
    carMinutes: [0, [Validators.min(0)]]
  });

  constructor(
    private readonly route: ActivatedRoute,
    private readonly toursService: ToursService,
    private readonly formBuilder: NonNullableFormBuilder,
    private readonly router: Router
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

  get isDraftTour(): boolean {
    return (this.tour?.status ?? '') === 'draft';
  }

  selectForCreate(): void {
    if (this.isSaving || !this.isDraftTour) {
      return;
    }

    this.selectedKeyPointId = null;
    this.successMessage = '';
    this.errorMessage = '';
    this.mapHintMessage = 'Click on the map to pick a location for the new key point.';
    this.form.reset({
      name: '',
      description: '',
      image: '',
      latitude: 0,
      longitude: 0
    });
    if (this.imageInputRef?.nativeElement) {
      this.imageInputRef.nativeElement.value = '';
    }
    this.renderDraftPoint();
  }

  editKeyPoint(keyPoint: KeyPoint): void {
    if (this.isSaving || !this.isDraftTour) {
      return;
    }

    this.selectedKeyPointId = keyPoint.id;
    this.successMessage = '';
    this.errorMessage = '';
    this.mapHintMessage = 'Click on the map to move this key point to a new coordinate.';
    this.form.setValue({
      name: keyPoint.name,
      description: keyPoint.description,
      image: keyPoint.image ?? '',
      latitude: keyPoint.latitude,
      longitude: keyPoint.longitude
    });
    this.renderDraftPoint();
    this.map?.setView([keyPoint.latitude, keyPoint.longitude], Math.max(this.map.getZoom(), 13));
  }

  submit(): void {
    if (!this.isDraftTour) {
      return;
    }

    this.errorMessage = '';
    this.successMessage = '';

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    if (!this.hasValidCoordinates(raw.latitude, raw.longitude)) {
      this.errorMessage = 'Select a valid location on the map.';
      return;
    }

    const payload = {
      name: raw.name.trim(),
      description: raw.description.trim(),
      image: raw.image.trim(),
      latitude: raw.latitude,
      longitude: raw.longitude
    };

    this.isSaving = true;

    const request$ = this.selectedKeyPointId
      ? this.toursService.updateKeyPoint(this.tourId, this.selectedKeyPointId, payload)
      : this.toursService.createKeyPoint(this.tourId, payload);

    request$.subscribe({
      next: (tour) => {
        this.applyTour(tour);
        this.successMessage = this.selectedKeyPointId ? 'Key point updated.' : 'Key point created.';
        this.isSaving = false;
        this.selectForCreate();
      },
      error: (error) => {
        this.errorMessage = error?.error?.message ?? 'Failed to save key point.';
        this.isSaving = false;
      }
    });
  }

  saveAndClose(): void {
    if (!this.tour || this.isSavingDurations) {
      return;
    }

    if (!this.isDraftTour) {
      this.router.navigate(['/my-tours']);
      return;
    }

    const raw = this.durationsForm.getRawValue();
    const durations = [
      { transportType: 'walking' as const, minutes: Number(raw.walkingMinutes) || 0 },
      { transportType: 'bicycle' as const, minutes: Number(raw.bicycleMinutes) || 0 },
      { transportType: 'car' as const, minutes: Number(raw.carMinutes) || 0 }
    ].filter((item) => item.minutes > 0);

    if (!durations.length) {
      this.router.navigate(['/my-tours']);
      return;
    }

    this.errorMessage = '';
    this.durationsMessage = '';
    this.isSavingDurations = true;

    this.toursService.updateTourDurations(this.tour.id, durations).subscribe({
      next: (tour) => {
        this.applyTour(tour);
        this.durationsMessage = 'Saved.';
        this.isSavingDurations = false;
        this.router.navigate(['/my-tours']);
      },
      error: (error) => {
        this.errorMessage = error?.error?.message ?? 'Failed to save durations.';
        this.isSavingDurations = false;
      }
    });
  }

  deleteKeyPoint(keyPoint: KeyPoint): void {
    if (this.isSaving || !this.isDraftTour) {
      return;
    }

    const confirmed = window.confirm(`Delete key point "${keyPoint.name}"?`);
    if (!confirmed) {
      return;
    }

    this.errorMessage = '';
    this.successMessage = '';
    this.isSaving = true;

    this.toursService.deleteKeyPoint(this.tourId, keyPoint.id).subscribe({
      next: (tour) => {
        this.applyTour(tour);
        this.successMessage = 'Key point deleted.';
        this.isSaving = false;
        this.selectForCreate();
      },
      error: (error) => {
        this.errorMessage = error?.error?.message ?? 'Failed to delete key point.';
        this.isSaving = false;
      }
    });
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

      this.form.controls.image.setValue(result);
      this.form.controls.image.markAsTouched();
      this.errorMessage = '';
    };
    reader.onerror = () => {
      this.errorMessage = 'Failed to read selected image.';
    };
    reader.readAsDataURL(file);
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
        this.applyTour(tour);
        this.isLoading = false;
        this.selectForCreate();
        window.setTimeout(() => this.ensureMapInitialized());
      },
      error: (error) => {
        this.errorMessage = error?.error?.message ?? 'Failed to load tour details.';
        this.isLoading = false;
      }
    });
  }

  private applyTour(tour: Tour): void {
    this.tour = {
      ...tour,
      keyPoints: [...tour.keyPoints].sort((left, right) => left.order - right.order)
    };
    this.patchDurationsForm(this.tour);
    this.renderTour();
  }

  private patchDurationsForm(tour: Tour): void {
    const byType = new Map(tour.durations.map((duration) => [duration.transportType, duration.minutes]));
    this.durationsForm.patchValue({
      walkingMinutes: byType.get('walking') ?? 0,
      bicycleMinutes: byType.get('bicycle') ?? 0,
      carMinutes: byType.get('car') ?? 0
    }, { emitEvent: false });
  }

  private ensureMapInitialized(): void {
    if (this.map) {
      this.map.invalidateSize();
      this.renderTour();
      return;
    }

    const container = document.getElementById('key-points-map');
    if (!container) {
      return;
    }

    this.map = L.map('key-points-map', {
      center: [45.2671, 19.8335],
      zoom: 13
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(this.map);

    this.pointsLayer.addTo(this.map);
    this.draftLayer.addTo(this.map);

    this.map.on('click', (event: L.LeafletMouseEvent) => {
      if (!this.isDraftTour) {
        this.mapHintMessage = 'This tour is read-only. Switch to a draft tour to edit key points.';
        return;
      }
      this.form.patchValue({
        latitude: Number(event.latlng.lat.toFixed(6)),
        longitude: Number(event.latlng.lng.toFixed(6))
      });
      this.mapHintMessage = 'Location selected. You can save now or keep adjusting.';
      this.renderDraftPoint();
    });

    this.renderTour();
  }

  private renderTour(): void {
    if (!this.map) {
      return;
    }

    this.pointsLayer.clearLayers();

    const coordinates: L.LatLngTuple[] = [];

    for (const point of this.tour?.keyPoints ?? []) {
      const coordinate: L.LatLngTuple = [point.latitude, point.longitude];
      coordinates.push(coordinate);

      const marker = L.circleMarker(coordinate, {
        radius: 8,
        color: '#8b1e3f',
        fillColor: '#fdf2f8',
        fillOpacity: 0.95,
        weight: 3
      });

      const popupHtml = `
        <div class="map-point-preview">
          <img src="${point.image}" alt="${this.escapeHtml(point.name)}" />
          <div class="map-point-preview__title">${point.order}. ${this.escapeHtml(point.name)}</div>
        </div>
      `;

      marker.bindTooltip(popupHtml, {
        direction: 'top',
        offset: [0, -10],
        opacity: 1,
        className: 'map-point-tooltip'
      });
      marker.on('click', () => this.editKeyPoint(point));
      this.pointsLayer.addLayer(marker);
    }

    this.renderRouting(coordinates);

    if (coordinates.length > 0 && !this.selectedKeyPointId) {
      const bounds = L.latLngBounds(coordinates);
      this.map.fitBounds(bounds.pad(0.2));
    }

    this.renderDraftPoint();
  }

  private renderDraftPoint(): void {
    if (!this.map) {
      return;
    }

    this.draftLayer.clearLayers();

    const { latitude, longitude } = this.form.getRawValue();
    if (!this.hasValidCoordinates(latitude, longitude)) {
      return;
    }

    const draftPoint = L.circleMarker([latitude, longitude], {
      radius: 7,
      color: '#166534',
      fillColor: '#dcfce7',
      fillOpacity: 0.95,
      weight: 3,
      dashArray: '4 3'
    });

    draftPoint.bindTooltip(this.selectedKeyPointId ? 'Edited position' : 'New key point position');
    this.draftLayer.addLayer(draftPoint);
  }

  private renderRouting(coordinates: L.LatLngTuple[]): void {
    if (!this.map) {
      return;
    }

    if (this.routingControl) {
      this.map.removeControl(this.routingControl);
      this.routingControl = null;
    }

    if (coordinates.length < 2) {
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

  private hasValidCoordinates(latitude: number, longitude: number): boolean {
    return Number.isFinite(latitude)
      && Number.isFinite(longitude)
      && !(latitude === 0 && longitude === 0);
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

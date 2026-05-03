import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnDestroy, OnInit } from '@angular/core';
import * as L from 'leaflet';

import { TouristPosition } from '../models/tourist-position.model';
import { ToursService } from '../services/tours.service';

@Component({
  selector: 'app-position-simulator',
  templateUrl: './position-simulator.component.html',
  styleUrls: ['./position-simulator.component.css']
})
export class PositionSimulatorComponent implements OnInit, OnDestroy {
  position: TouristPosition | null = null;
  selectedLatitude: number | null = null;
  selectedLongitude: number | null = null;
  isLoading = false;
  isSaving = false;
  errorMessage = '';
  successMessage = '';
  mapHintMessage = 'Click on the map to set your current position.';

  private map: L.Map | null = null;
  private positionLayer = L.layerGroup();
  private readonly defaultCoordinate: L.LatLngTuple = [45.2671, 19.8335];

  constructor(private readonly toursService: ToursService) {}

  ngOnInit(): void {
    this.loadPosition();
  }

  ngOnDestroy(): void {
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
  }

  savePosition(latitude: number, longitude: number): void {
    if (this.isSaving) {
      return;
    }

    this.selectedLatitude = latitude;
    this.selectedLongitude = longitude;
    this.renderPositionMarker(latitude, longitude);
    this.errorMessage = '';
    this.successMessage = '';
    this.isSaving = true;

    this.toursService.updateMyPosition(latitude, longitude).subscribe({
      next: (position) => {
        this.position = position;
        this.selectedLatitude = position.latitude;
        this.selectedLongitude = position.longitude;
        this.renderPositionMarker(position.latitude, position.longitude);
        this.successMessage = 'Position saved.';
        this.mapHintMessage = 'Current position is saved. Click again to update it.';
        this.isSaving = false;
      },
      error: (error) => {
        this.errorMessage = error?.error?.message ?? 'Failed to save position.';
        this.isSaving = false;
      }
    });
  }

  private loadPosition(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.toursService.getMyPosition().subscribe({
      next: (position) => {
        this.position = position;
        this.selectedLatitude = position.latitude;
        this.selectedLongitude = position.longitude;
        this.isLoading = false;
        window.setTimeout(() => this.ensureMapInitialized());
      },
      error: (error: HttpErrorResponse) => {
        if (error.status !== 404) {
          this.errorMessage = error?.error?.message ?? 'Failed to load position.';
        }

        this.isLoading = false;
        window.setTimeout(() => this.ensureMapInitialized());
      }
    });
  }

  private ensureMapInitialized(): void {
    if (this.map) {
      this.map.invalidateSize();
      return;
    }

    const container = document.getElementById('position-simulator-map');
    if (!container) {
      return;
    }

    const center: L.LatLngTuple = this.position
      ? [this.position.latitude, this.position.longitude]
      : this.defaultCoordinate;

    this.map = L.map('position-simulator-map', {
      center,
      zoom: 13
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(this.map);

    this.positionLayer.addTo(this.map);

    this.map.on('click', (event: L.LeafletMouseEvent) => {
      const latitude = Number(event.latlng.lat.toFixed(6));
      const longitude = Number(event.latlng.lng.toFixed(6));
      this.savePosition(latitude, longitude);
    });

    if (this.position) {
      this.renderPositionMarker(this.position.latitude, this.position.longitude);
    }
  }

  private renderPositionMarker(latitude: number, longitude: number): void {
    if (!this.map) {
      return;
    }

    this.positionLayer.clearLayers();

    const marker = L.circleMarker([latitude, longitude], {
      radius: 9,
      color: '#0f172a',
      fillColor: '#8b1e3f',
      fillOpacity: 0.92,
      weight: 3
    });

    marker.bindTooltip('Current position');
    this.positionLayer.addLayer(marker);
  }
}

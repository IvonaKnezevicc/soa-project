import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { CreateTourRequest } from '../models/create-tour-request.model';
import { CreateTourReviewRequest } from '../models/create-tour-review-request.model';
import { KeyPointPayload } from '../models/key-point-payload.model';
import { TourReview } from '../models/tour-review.model';
import { Tour, TourStatus } from '../models/tour.model';
import { TouristPosition } from '../models/tourist-position.model';

@Injectable({
  providedIn: 'root'
})
export class ToursService {
  private readonly baseUrl = '/api/tours';

  constructor(private readonly http: HttpClient) {}

  createTour(payload: CreateTourRequest): Observable<Tour> {
    return this.http.post<Tour>(this.baseUrl, payload);
  }

  getMyTours(): Observable<Tour[]> {
    return this.http.get<Tour[]>(`${this.baseUrl}/my`);
  }

  getPublishedTours(): Observable<Tour[]> {
    return this.http.get<Tour[]>(`${this.baseUrl}/published`);
  }

  getTourById(tourId: string): Observable<Tour> {
    return this.http.get<Tour>(`${this.baseUrl}/${encodeURIComponent(tourId)}`);
  }

  updateTourStatus(tourId: string, status: TourStatus): Observable<Tour> {
    return this.http.patch<Tour>(`${this.baseUrl}/${encodeURIComponent(tourId)}/status`, { status });
  }

  getMyPosition(): Observable<TouristPosition> {
    return this.http.get<TouristPosition>(`${this.baseUrl}/position/me`);
  }

  updateMyPosition(latitude: number, longitude: number): Observable<TouristPosition> {
    return this.http.put<TouristPosition>(`${this.baseUrl}/position/me`, { latitude, longitude });
  }

  getTourReviews(tourId: string): Observable<TourReview[]> {
    return this.http.get<TourReview[]>(`${this.baseUrl}/${encodeURIComponent(tourId)}/reviews`);
  }

  createTourReview(tourId: string, payload: CreateTourReviewRequest): Observable<TourReview> {
    return this.http.post<TourReview>(`${this.baseUrl}/${encodeURIComponent(tourId)}/reviews`, payload);
  }

  createKeyPoint(tourId: string, payload: KeyPointPayload): Observable<Tour> {
    return this.http.post<Tour>(`${this.baseUrl}/${encodeURIComponent(tourId)}/key-points`, payload);
  }

  updateKeyPoint(tourId: string, keyPointId: string, payload: KeyPointPayload): Observable<Tour> {
    return this.http.put<Tour>(
      `${this.baseUrl}/${encodeURIComponent(tourId)}/key-points/${encodeURIComponent(keyPointId)}`,
      payload
    );
  }

  deleteKeyPoint(tourId: string, keyPointId: string): Observable<Tour> {
    return this.http.delete<Tour>(
      `${this.baseUrl}/${encodeURIComponent(tourId)}/key-points/${encodeURIComponent(keyPointId)}`
    );
  }
}

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { CreateTourRequest } from '../models/create-tour-request.model';
import { Tour } from '../models/tour.model';

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
}

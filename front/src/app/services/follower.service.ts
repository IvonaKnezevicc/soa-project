import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';

interface FollowingResponse {
  usernames: string[];
}

interface RecommendationResponseItem {
  username: string;
  mutualConnections: number;
}

interface RecommendationsResponse {
  items: RecommendationResponseItem[];
}

@Injectable({
  providedIn: 'root'
})
export class FollowerService {
  private readonly baseUrl = '/api/followers';

  constructor(private readonly http: HttpClient) {}

  follow(targetUsername: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(
      `${this.baseUrl}/follows/${encodeURIComponent(targetUsername.trim())}`,
      {}
    );
  }

  getFollowing(): Observable<string[]> {
    return this.http.get<FollowingResponse>(`${this.baseUrl}/follows`).pipe(
      map((response) => response.usernames ?? [])
    );
  }

  getRecommendations(): Observable<RecommendationResponseItem[]> {
    return this.http.get<RecommendationsResponse>(`${this.baseUrl}/recommendations`).pipe(
      map((response) => response.items ?? [])
    );
  }
}


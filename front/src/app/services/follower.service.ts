import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
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

interface SearchUsersResponseItem {
  username: string;
  role: string;
}

interface SearchUsersResponse {
  items: SearchUsersResponseItem[];
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

  searchUsers(role: string, query: string, limit: number): Observable<SearchUsersResponseItem[]> {
    const params = new HttpParams()
      .set('role', role)
      .set('q', query)
      .set('limit', limit);

    return this.http.get<SearchUsersResponse>('/api/stakeholders/users/search', { params }).pipe(
      map((response) => response.items ?? [])
    );
  }
}


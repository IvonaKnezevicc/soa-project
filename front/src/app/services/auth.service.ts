import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, catchError, map, of, tap } from 'rxjs';

import { AuthResponse } from '../models/auth-response.model';
import { LoginRequest } from '../models/login-request.model';
import { RegisterRequest } from '../models/register-request.model';
import { RegisterResponse } from '../models/register-response.model';
import { UpdateUserProfileRequest } from '../models/update-user-profile-request.model';
import { User } from '../models/user.model';
import { UserProfile } from '../models/user-profile.model';
import { TokenService } from './token.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly baseUrl = 'http://localhost:8080/api/stakeholders/users';
  private readonly currentUserSubject = new BehaviorSubject<User | null>(null);

  readonly currentUser$ = this.currentUserSubject.asObservable();

  constructor(
    private readonly http: HttpClient,
    private readonly tokenService: TokenService,
    private readonly router: Router
  ) {
    this.restoreSession();
  }

  register(payload: Partial<RegisterRequest>): Observable<RegisterResponse> {
    return this.http.post<RegisterResponse>(`${this.baseUrl}/register`, payload);
  }

  login(payload: Partial<LoginRequest>): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.baseUrl}/login`, payload).pipe(
      tap((response) => {
        this.tokenService.setToken(response.accessToken);
        this.currentUserSubject.next(response.user);
        this.router.navigate(['/home']);
      })
    );
  }

  logout(): Observable<void> {
    const token = this.tokenService.getToken();
    if (!token) {
      this.clearSession();
      return of(void 0);
    }

    return this.http.post<{ message: string }>(`${this.baseUrl}/logout`, {}).pipe(
      map(() => void 0),
      tap(() => this.clearSession()),
      catchError(() => {
        this.clearSession();
        return of(void 0);
      })
    );
  }

  me(): Observable<User> {
    return this.http.get<User>(`${this.baseUrl}/me`).pipe(
      tap((user) => this.currentUserSubject.next(user))
    );
  }

  getMyProfile(): Observable<UserProfile> {
    return this.http.get<UserProfile>(`${this.baseUrl}/profile`);
  }

  updateMyProfile(payload: UpdateUserProfileRequest): Observable<UserProfile> {
    return this.http.put<UserProfile>(`${this.baseUrl}/profile`, payload);
  }

  private restoreSession(): void {
    if (!this.tokenService.hasToken()) {
      this.clearSessionState();
      return;
    }

    this.me().subscribe({
      error: () => this.clearSession()
    });
  }

  private clearSession(): void {
    this.tokenService.clearToken();
    this.clearSessionState();
    this.router.navigate(['/login']);
  }

  private clearSessionState(): void {
    this.currentUserSubject.next(null);
  }
}

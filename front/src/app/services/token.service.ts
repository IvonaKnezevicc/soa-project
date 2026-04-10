import { Injectable } from '@angular/core';

type JWTPayload = {
  exp?: number;
  role?: string;
};

@Injectable({
  providedIn: 'root'
})
export class TokenService {
  private readonly tokenKey = 'soa_access_token';

  setToken(token: string): void {
    localStorage.setItem(this.tokenKey, token);
  }

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  clearToken(): void {
    localStorage.removeItem(this.tokenKey);
  }

  hasToken(): boolean {
    const token = this.getToken();
    if (!token) {
      return false;
    }

    if (!this.isTokenValid(token)) {
      this.clearToken();
      return false;
    }

    return true;
  }

  hasRole(role: string): boolean {
    const token = this.getToken();
    if (!token || !this.isTokenValid(token)) {
      this.clearToken();
      return false;
    }

    const payload = this.parsePayload(token);
    return payload?.role === role;
  }

  private isTokenValid(token: string): boolean {
    const payload = this.parsePayload(token);
    if (!payload) {
      return false;
    }

    if (typeof payload.exp !== 'number') {
      return false;
    }

    const nowInSeconds = Math.floor(Date.now() / 1000);
    return payload.exp > nowInSeconds;
  }

  private parsePayload(token: string): JWTPayload | null {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    try {
      const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const normalized = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
      const payload = atob(normalized);
      return JSON.parse(payload) as JWTPayload;
    } catch {
      return null;
    }
  }
}

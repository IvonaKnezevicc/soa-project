import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { AdminUser } from '../models/admin-user.model';
import { PagedUsersResponse } from '../models/paged-users-response.model';
import { UserStatusFilter } from '../models/user-status-filter.model';

@Injectable({
  providedIn: 'root'
})
export class AdminUsersService {
  private readonly baseUrl = 'http://localhost:8080/api/stakeholders/users';

  constructor(private readonly http: HttpClient) {}

  getUsers(page: number, status: UserStatusFilter): Observable<PagedUsersResponse> {
    const params = new HttpParams()
      .set('page', page)
      .set('status', status);

    return this.http.get<PagedUsersResponse>(this.baseUrl, { params });
  }

  blockUser(username: string): Observable<AdminUser> {
    const params = new HttpParams().set('username', username);
    return this.http.put<AdminUser>(`${this.baseUrl}/block`, {}, { params });
  }
}

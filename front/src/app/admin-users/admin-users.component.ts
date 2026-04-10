import { Component, OnInit } from '@angular/core';

import { AdminUser } from '../models/admin-user.model';
import { UserStatusFilter } from '../models/user-status-filter.model';
import { AdminUsersService } from '../services/admin-users.service';

@Component({
  selector: 'app-admin-users',
  templateUrl: './admin-users.component.html',
  styleUrls: ['./admin-users.component.css']
})
export class AdminUsersComponent implements OnInit {
  users: AdminUser[] = [];
  page = 1;
  pageSize = 15;
  totalCount = 0;
  totalPages = 0;
  isLoading = false;
  errorMessage = '';
  actionMessage = '';
  selectedStatus: UserStatusFilter = 'all';

  constructor(private readonly adminUsersService: AdminUsersService) {}

  ngOnInit(): void {
    this.loadUsers(1);
  }

  previousPage(): void {
    if (this.page <= 1 || this.isLoading) {
      return;
    }

    this.loadUsers(this.page - 1);
  }

  nextPage(): void {
    if (this.page >= this.totalPages || this.isLoading) {
      return;
    }

    this.loadUsers(this.page + 1);
  }

  setStatus(status: UserStatusFilter): void {
    if (this.selectedStatus === status || this.isLoading) {
      return;
    }

    this.selectedStatus = status;
    this.loadUsers(1);
  }

  blockUser(username: string): void {
    if (this.isLoading) {
      return;
    }

    const confirmed = window.confirm(`Are you sure you want to block ${username}?`);
    if (!confirmed) {
      return;
    }

    this.errorMessage = '';
    this.actionMessage = '';
    this.isLoading = true;

    this.adminUsersService.blockUser(username).subscribe({
      next: () => {
        this.actionMessage = `User ${username} was blocked successfully.`;
        this.loadUsers(this.page);
      },
      error: (error) => {
        this.errorMessage = error?.error?.message ?? 'Failed to block user.';
        this.isLoading = false;
      }
    });
  }

  private loadUsers(page: number): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.adminUsersService.getUsers(page, this.selectedStatus).subscribe({
      next: (response) => {
        this.users = response.items;
        this.page = response.page;
        this.pageSize = response.pageSize;
        this.totalCount = response.totalCount;
        this.totalPages = response.totalPages;
        this.selectedStatus = response.status;
        this.isLoading = false;
      },
      error: (error) => {
        this.errorMessage = error?.error?.message ?? 'Failed to load users.';
        this.isLoading = false;
      }
    });
  }
}

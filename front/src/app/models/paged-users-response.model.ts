import { AdminUser } from './admin-user.model';

export interface PagedUsersResponse {
  items: AdminUser[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  status: 'all' | 'active' | 'blocked';
}

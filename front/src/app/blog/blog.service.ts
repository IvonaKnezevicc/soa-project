import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { BlogPostResponse, BlogStartupStatus, CreateBlogPostRequest } from './blog.model';

@Injectable({
  providedIn: 'root'
})
export class BlogService {
  private readonly baseUrl = 'http://localhost:8081';

  constructor(private readonly http: HttpClient) {}

  getHealth(): Observable<BlogStartupStatus> {
    return this.http.get<BlogStartupStatus>(`${this.baseUrl}/health`);
  }

  getPosts(): Observable<BlogPostResponse[]> {
    return this.http.get<BlogPostResponse[]>(`${this.baseUrl}/api/blog/posts`);
  }

  createBlogPost(payload: CreateBlogPostRequest): Observable<BlogPostResponse> {
    return this.http.post<BlogPostResponse>(`${this.baseUrl}/api/blog/posts`, payload);
  }
}

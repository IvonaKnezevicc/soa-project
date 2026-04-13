import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import {
  BlogPostResponse,
  BlogStartupStatus,
  CommentResponse,
  CreateBlogPostRequest,
  CreateCommentRequest
} from './blog.model';

@Injectable({
  providedIn: 'root'
})
export class BlogService {
  private readonly baseUrl = '';

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

  createComment(postId: string, payload: CreateCommentRequest): Observable<CommentResponse> {
    return this.http.post<CommentResponse>(`${this.baseUrl}/api/blog/posts/${postId}/comments`, payload);
  }

  likePost(postId: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.baseUrl}/api/blog/posts/${postId}/like`, {});
  }

  unlikePost(postId: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.baseUrl}/api/blog/posts/${postId}/like`);
  }
}

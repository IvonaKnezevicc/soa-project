import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class HomeActionsService {
  private readonly openCreateBlogSubject = new Subject<void>();

  readonly openCreateBlog$ = this.openCreateBlogSubject.asObservable();

  openCreateBlog(): void {
    this.openCreateBlogSubject.next();
  }
}

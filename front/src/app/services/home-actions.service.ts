import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class HomeActionsService {
  private readonly openCreateBlogSubject = new Subject<void>();
  private readonly openFindFriendsSubject = new Subject<void>();

  readonly openCreateBlog$ = this.openCreateBlogSubject.asObservable();
  readonly openFindFriends$ = this.openFindFriendsSubject.asObservable();

  openCreateBlog(): void {
    this.openCreateBlogSubject.next();
  }

  openFindFriends(): void {
    this.openFindFriendsSubject.next();
  }
}

import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';

import { AuthService } from '../services/auth.service';
import { FollowerService } from '../services/follower.service';

interface RecommendationView {
  username: string;
  mutualConnections: number;
}

interface SearchUserView {
  username: string;
  role: string;
}

@Component({
  selector: 'app-find-users',
  templateUrl: './find-users.component.html',
  styleUrls: ['./find-users.component.css']
})
export class FindUsersComponent implements OnInit, OnDestroy {
  recommendationUsernames: RecommendationView[] = [];
  searchResults: SearchUserView[] = [];
  followingUsernames = new Set<string>();
  followInputUsername = '';
  currentUserRole = '';
  followSubmitting = false;
  searchLoading = false;
  followErrorMessage = '';
  followSuccessMessage = '';
  followConfirmUsername: string | null = null;
  private followSuccessTimeoutId: number | null = null;
  private readonly subscriptions = new Subscription();

  constructor(
    private readonly followerService: FollowerService,
    private readonly authService: AuthService,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    this.currentUserRole = this.authService.getCurrentUserSnapshot()?.role ?? '';
    this.loadFollowingAndRecommendations();
  }

  ngOnDestroy(): void {
    this.clearFollowSuccessTimeout();
    this.subscriptions.unsubscribe();
  }

  follow(username: string): void {
    const targetUsername = username.trim();
    this.followErrorMessage = '';
    this.followSuccessMessage = '';
    this.clearFollowSuccessTimeout();

    if (!targetUsername) {
      this.followErrorMessage = 'Username is required.';
      return;
    }

    if (this.isFollowing(targetUsername)) {
      this.followErrorMessage = `You already follow ${targetUsername}.`;
      return;
    }

    this.followSubmitting = true;
    this.followerService.follow(targetUsername).subscribe({
      next: () => {
        this.followInputUsername = '';
        this.searchResults = [];
        this.followSubmitting = false;
        this.followSuccessMessage = `You are now following ${targetUsername}.`;
        this.followingUsernames.add(this.normalizeUsername(targetUsername));
        this.followSuccessTimeoutId = window.setTimeout(() => {
          this.followSuccessMessage = '';
          this.followSuccessTimeoutId = null;
        }, 2000);
        this.loadFollowingAndRecommendations();
      },
      error: (error) => {
        this.followErrorMessage = error?.error?.message ?? `User "${targetUsername}" does not exist or follow failed.`;
        this.followSubmitting = false;
      }
    });
  }

  followRecommendation(username: string): void {
    const targetUsername = username.trim();
    if (!targetUsername) {
      return;
    }

    this.followConfirmUsername = targetUsername;
  }

  cancelFollowConfirmation(): void {
    this.followConfirmUsername = null;
  }

  confirmFollowFromDialog(): void {
    if (!this.followConfirmUsername) {
      return;
    }

    const targetUsername = this.followConfirmUsername;
    this.followConfirmUsername = null;
    this.follow(targetUsername);
  }

  isFollowing(username: string): boolean {
    return this.followingUsernames.has(this.normalizeUsername(username));
  }

  close(): void {
    this.router.navigate(['/home']);
  }

  onSearchInput(value: string): void {
    this.followInputUsername = value;
    this.followErrorMessage = '';

    const trimmed = value.trim();
    if (!trimmed) {
      this.searchResults = [];
      this.searchLoading = false;
      return;
    }

    this.searchLoading = true;
    const searchSubscription = this.followerService.searchUsers('', trimmed, 8).subscribe({
      next: (items) => {
        this.searchResults = items.filter((item) => !this.isFollowing(item.username));
        this.searchLoading = false;
      },
      error: () => {
        this.searchResults = [];
        this.searchLoading = false;
      }
    });

    this.subscriptions.add(searchSubscription);
  }

  selectSearchResult(username: string): void {
    this.followInputUsername = username;
    this.searchResults = [];
  }

  private loadFollowingAndRecommendations(): void {
    this.followerService.getFollowing().subscribe({
      next: (usernames) => {
        this.followingUsernames = new Set<string>(
          usernames.map((username) => this.normalizeUsername(username))
        );
      },
      error: () => {
        this.followingUsernames = new Set<string>();
      }
    });

    this.followerService.getRecommendations().subscribe({
      next: (items) => {
        this.recommendationUsernames = items.filter((item) => !this.isFollowing(item.username));
      },
      error: () => {
        this.recommendationUsernames = [];
      }
    });
  }

  private clearFollowSuccessTimeout(): void {
    if (this.followSuccessTimeoutId !== null) {
      window.clearTimeout(this.followSuccessTimeoutId);
      this.followSuccessTimeoutId = null;
    }
  }

  private normalizeUsername(username: string): string {
    return username.trim().toLowerCase();
  }

  private isDiscoverableRole(): boolean {
    return this.currentUserRole === 'tourist' || this.currentUserRole === 'guide';
  }
}

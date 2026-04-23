import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

import { FollowerService } from '../services/follower.service';

interface RecommendationView {
  username: string;
  mutualConnections: number;
}

@Component({
  selector: 'app-find-users',
  templateUrl: './find-users.component.html',
  styleUrls: ['./find-users.component.css']
})
export class FindUsersComponent implements OnInit {
  recommendationUsernames: RecommendationView[] = [];
  followingUsernames = new Set<string>();
  followInputUsername = '';
  followSubmitting = false;
  followErrorMessage = '';
  followSuccessMessage = '';

  constructor(
    private readonly followerService: FollowerService,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    this.loadFollowingAndRecommendations();
  }

  follow(username: string): void {
    const targetUsername = username.trim();
    this.followErrorMessage = '';
    this.followSuccessMessage = '';

    if (!targetUsername) {
      this.followErrorMessage = 'Username is required.';
      return;
    }

    this.followSubmitting = true;
    this.followerService.follow(targetUsername).subscribe({
      next: () => {
        this.followInputUsername = '';
        this.followSubmitting = false;
        this.followSuccessMessage = `You are now following ${targetUsername}.`;
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

    const confirmed = window.confirm(`Do you want to follow ${targetUsername}?`);
    if (!confirmed) {
      return;
    }

    this.follow(targetUsername);
  }

  isFollowing(username: string): boolean {
    return this.followingUsernames.has(username);
  }

  close(): void {
    this.router.navigate(['/home']);
  }

  private loadFollowingAndRecommendations(): void {
    this.followerService.getFollowing().subscribe({
      next: (usernames) => {
        this.followingUsernames = new Set<string>(usernames);
      },
      error: () => {
        this.followingUsernames = new Set<string>();
      }
    });

    this.followerService.getRecommendations().subscribe({
      next: (items) => {
        this.recommendationUsernames = items;
      },
      error: () => {
        this.recommendationUsernames = [];
      }
    });
  }
}

import { KeyPoint } from './key-point.model';

export type TourStatus = 'draft' | 'published' | 'archived';

export interface TourDuration {
  transportType: 'walking' | 'bicycle' | 'car';
  minutes: number;
}

export interface Tour {
  id: string;
  authorId: string;
  authorUsername: string;
  name: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'advanced' | 'hard';
  tags: string[];
  keyPoints: KeyPoint[];
  keyPointCount: number;
  durations: TourDuration[];
  status: TourStatus;
  distanceInKm: number;
  price: number;
  purchasedByCurrentUser: boolean;
  publishedAt?: string | null;
  archivedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

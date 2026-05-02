import { KeyPoint } from './key-point.model';

export type TourStatus = 'draft' | 'published' | 'archived';

export interface Tour {
  id: string;
  authorId: string;
  authorUsername: string;
  name: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'advanced' | 'hard';
  tags: string[];
  keyPoints: KeyPoint[];
  status: TourStatus;
  price: number;
  createdAt: string;
  updatedAt: string;
}

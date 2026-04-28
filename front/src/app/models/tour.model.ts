import { KeyPoint } from './key-point.model';

export interface Tour {
  id: string;
  authorId: string;
  authorUsername: string;
  name: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'advanced' | 'hard';
  tags: string[];
  keyPoints: KeyPoint[];
  status: 'draft' | 'published' | 'archived';
  price: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTourRequest {
  name: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'advanced' | 'hard';
  tags: string[];
}

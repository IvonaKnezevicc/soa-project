import { CompletedKeyPoint } from './completed-key-point.model';

export type TourExecutionStatus = 'active' | 'completed' | 'abandoned';

export interface TourExecution {
  id: string;
  touristId: string;
  touristUsername: string;
  tourId: string;
  tourName: string;
  status: TourExecutionStatus;
  startedAt: string;
  completedAt?: string | null;
  abandonedAt?: string | null;
  lastActivityAt: string;
  startedLatitude: number;
  startedLongitude: number;
  completedKeyPoints: CompletedKeyPoint[];
}

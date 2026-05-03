export interface TourReview {
  id: string;
  tourId: string;
  tourName: string;
  touristId: string;
  touristUsername: string;
  rating: number;
  comment: string;
  visitedAt: string;
  createdAt: string;
  images: string[];
}

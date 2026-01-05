'use client';

import { Star } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { formatDistanceToNow } from 'date-fns';

interface Review {
  id: string;
  houseConditionRating: number | null;
  customerRating: number | null;
  tipRating: number | null;
  overallRating: number;
  notes: string | null;
  createdAt: string;
  reviewer: {
    id: string;
    name: string | null;
    email: string;
    role: string;
  };
}

interface ReviewDisplayProps {
  reviews: Review[];
}

export function ReviewDisplay({ reviews }: ReviewDisplayProps) {
  if (reviews.length === 0) {
    return null;
  }

  const StarRating = ({ rating }: { rating: number }) => (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`h-4 w-4 ${
            star <= rating
              ? 'fill-yellow-400 text-yellow-400'
              : 'text-gray-300 dark:text-gray-600'
          }`}
        />
      ))}
    </div>
  );

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Cleaning Reviews</h3>

      {reviews.map((review) => (
        <Card key={review.id} className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="font-medium">
                {review.reviewer.name || review.reviewer.email}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {formatDistanceToNow(new Date(review.createdAt), {
                  addSuffix: true,
                })}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                Overall
              </p>
              <StarRating rating={review.overallRating} />
            </div>
          </div>

          {/* Rating Details */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
            {review.houseConditionRating && (
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                  House Condition
                </p>
                <StarRating rating={review.houseConditionRating} />
              </div>
            )}
            {review.customerRating && (
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                  Customer
                </p>
                <StarRating rating={review.customerRating} />
              </div>
            )}
            {review.tipRating !== null && (
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                  Tip
                </p>
                <StarRating rating={review.tipRating} />
              </div>
            )}
          </div>

          {/* Notes */}
          {review.notes && (
            <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <p className="text-sm text-gray-700 dark:text-gray-300">
                {review.notes}
              </p>
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}

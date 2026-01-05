'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { X, Star } from 'lucide-react';

interface ReviewModalProps {
  bookingId: string;
  clientName: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function ReviewModal({ bookingId, clientName, onClose, onSuccess }: ReviewModalProps) {
  const [houseConditionRating, setHouseConditionRating] = useState(0);
  const [customerRating, setCustomerRating] = useState(0);
  const [tipRating, setTipRating] = useState(0);
  const [overallRating, setOverallRating] = useState(0);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (overallRating === 0) {
      alert('Please provide an overall rating');
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch(`/api/bookings/${bookingId}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          houseConditionRating: houseConditionRating || null,
          customerRating: customerRating || null,
          tipRating: tipRating || null,
          overallRating,
          notes,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        onSuccess();
        onClose();
      } else {
        alert(data.error || 'Failed to submit review');
      }
    } catch (error) {
      alert('An error occurred while submitting the review');
    } finally {
      setSubmitting(false);
    }
  };

  const StarRating = ({
    value,
    onChange,
    label,
  }: {
    value: number;
    onChange: (rating: number) => void;
    label: string;
  }) => (
    <div className="mb-4">
      <label className="block text-sm font-medium mb-2">{label}</label>
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            className="focus:outline-none transition-transform hover:scale-110"
          >
            <Star
              className={`h-8 w-8 ${
                star <= value
                  ? 'fill-yellow-400 text-yellow-400'
                  : 'text-gray-300 dark:text-gray-600'
              }`}
            />
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold">Cleaning Review</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Review your experience at {clientName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Overall Rating - Required */}
          <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <StarRating
              value={overallRating}
              onChange={setOverallRating}
              label="Overall Experience *"
            />
          </div>

          {/* House Condition Rating */}
          <StarRating
            value={houseConditionRating}
            onChange={setHouseConditionRating}
            label="House Condition (1 = Very Messy, 5 = Very Clean)"
          />

          {/* Customer Rating */}
          <StarRating
            value={customerRating}
            onChange={setCustomerRating}
            label="Customer Interaction (1 = Difficult, 5 = Excellent)"
          />

          {/* Tip Rating */}
          <StarRating
            value={tipRating}
            onChange={setTipRating}
            label="Tip Quality (0 = No Tip, 5 = Generous Tip)"
          />

          {/* Notes */}
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">
              Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full min-h-[100px] p-3 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
              placeholder="Add any additional notes about this cleaning..."
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 justify-end">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting || overallRating === 0}>
              {submitting ? 'Submitting...' : 'Submit Review'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Star, Heart, ThumbsUp, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';

export default function CustomerFeedbackPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [booking, setBooking] = useState<any>(null);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [tipAmount, setTipAmount] = useState('');
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    fetchBooking();
  }, [token]);

  const fetchBooking = async () => {
    try {
      const response = await fetch(`/api/feedback/${token}`);
      const data = await response.json();

      if (data.success) {
        setBooking(data.data);
        if (data.data.feedbackSubmittedAt) {
          setSubmitted(true);
          setRating(data.data.customerRating || 0);
          setFeedback(data.data.customerFeedback || '');
          setTipAmount(data.data.tipAmount?.toString() || '');
        }
      }
    } catch (error) {
      console.error('Failed to fetch booking:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const response = await fetch(`/api/feedback/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rating,
          feedback,
          tipAmount: tipAmount ? parseFloat(tipAmount) : undefined,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSubmitted(true);
        alert('Thank you for your feedback!');
      } else {
        alert(data.error || 'Failed to submit feedback');
      }
    } catch (error) {
      alert('An error occurred. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="text-lg">Loading...</div>
        </div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <Card className="p-8 max-w-md text-center">
          <h1 className="text-2xl font-bold mb-4">Invalid Link</h1>
          <p className="text-gray-600">
            This feedback link is invalid or has expired.
          </p>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <Card className="p-8 max-w-md text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <ThumbsUp className="h-8 w-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Thank You!</h1>
          <p className="text-gray-600 mb-4">
            Your feedback has been submitted successfully.
          </p>
          {rating > 0 && (
            <div className="flex justify-center gap-1 mb-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`h-6 w-6 ${
                    star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
                  }`}
                />
              ))}
            </div>
          )}
          {tipAmount && (
            <p className="text-sm text-gray-600">
              Tip: ${parseFloat(tipAmount).toFixed(2)}
            </p>
          )}
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <Card className="p-6 md:p-8">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold mb-2">How was your cleaning?</h1>
            <p className="text-gray-600">
              Thank you for choosing {booking.company.name}!
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Cleaned by: {booking.assignee?.user?.name || 'Our team'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Rating */}
            <div className="text-center">
              <label className="block text-lg font-medium mb-3">
                Rate your experience
              </label>
              <div className="flex justify-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="transition-transform hover:scale-110"
                  >
                    <Star
                      className={`h-10 w-10 md:h-12 md:w-12 ${
                        star <= (hoverRating || rating)
                          ? 'fill-yellow-400 text-yellow-400'
                          : 'text-gray-300'
                      }`}
                    />
                  </button>
                ))}
              </div>
              <p className="text-sm text-gray-500 mt-2">
                {rating === 0 && 'Click to rate'}
                {rating === 1 && 'Poor'}
                {rating === 2 && 'Fair'}
                {rating === 3 && 'Good'}
                {rating === 4 && 'Very Good'}
                {rating === 5 && 'Excellent'}
              </p>
            </div>

            {/* Feedback */}
            <div>
              <label htmlFor="feedback" className="block text-sm font-medium mb-2">
                Share your thoughts (optional)
              </label>
              <Textarea
                id="feedback"
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                rows={4}
                placeholder="Tell us about your experience..."
                className="w-full"
              />
            </div>

            {/* Tip */}
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-6">
              <div className="flex items-center gap-2 mb-3">
                <Heart className="h-5 w-5 text-pink-500" />
                <h3 className="font-semibold">Leave a Tip (Optional)</h3>
              </div>
              <p className="text-sm text-gray-600 mb-4">
                Show your appreciation for a job well done
              </p>

              <div className="grid grid-cols-4 gap-2 mb-4">
                {['5', '10', '15', '20'].map((amount) => (
                  <button
                    key={amount}
                    type="button"
                    onClick={() => setTipAmount(amount)}
                    className={`py-2 px-4 rounded-md font-medium transition-colors ${
                      tipAmount === amount
                        ? 'bg-purple-600 text-white'
                        : 'bg-white text-gray-700 hover:bg-purple-100'
                    }`}
                  >
                    ${amount}
                  </button>
                ))}
              </div>

              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                  $
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={tipAmount}
                  onChange={(e) => setTipAmount(e.target.value)}
                  placeholder="Custom amount"
                  className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              {tipAmount && parseFloat(tipAmount) > 0 && (
                <p className="text-xs text-gray-500 mt-2">
                  💡 Tip will be processed separately via your preferred payment method
                </p>
              )}
            </div>

            {/* Submit */}
            <Button
              type="submit"
              disabled={submitting || rating === 0}
              className="w-full py-6 text-lg"
            >
              <Send className="h-5 w-5 mr-2" />
              {submitting ? 'Submitting...' : 'Submit Feedback'}
            </Button>

            {rating === 0 && (
              <p className="text-sm text-center text-gray-500">
                Please select a rating to continue
              </p>
            )}
          </form>
        </Card>
      </div>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Star, ThumbsUp, DollarSign, CreditCard, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import Image from 'next/image';

interface BookingData {
  id: string;
  scheduledDate: string;
  serviceType: string;
  price: number;
  copayAmount: number;
  finalCopayAmount: number;
  isPaid: boolean;
  copayPaid: boolean;
  client: {
    name: string;
  };
  assignee: {
    user: {
      name: string;
      photo?: string;
    };
  } | null;
  company: {
    name: string;
    logo?: string;
    googleReviewUrl?: string;
    venmoUsername?: string;
    cashappUsername?: string;
  };
  customerRating?: number;
  customerFeedback?: string;
  tipAmount?: number;
  feedbackSubmittedAt?: string;
}

export default function FeedbackPage() {
  const params = useParams();
  const token = params.token as string;

  const [booking, setBooking] = useState<BookingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Form state
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [tipAmount, setTipAmount] = useState('');
  const [customTip, setCustomTip] = useState('');
  const [submitting, setSubmitting] = useState(false);
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
        // Pre-fill if already submitted
        if (data.data.customerRating) {
          setRating(data.data.customerRating);
          setFeedback(data.data.customerFeedback || '');
          setSubmitted(true);
        }
      } else {
        setError(data.error || 'Booking not found');
      }
    } catch (err) {
      setError('Failed to load booking information');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitFeedback = async () => {
    if (rating === 0) {
      alert('Please rate your service');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`/api/feedback/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rating,
          feedback,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSubmitted(true);
        alert('Thank you for your feedback!');
      } else {
        alert(data.error || 'Failed to submit feedback');
      }
    } catch (err) {
      alert('Failed to submit feedback');
    } finally {
      setSubmitting(false);
    }
  };

  const handleTipCleaner = async () => {
    const amount = tipAmount === 'custom' ? parseFloat(customTip) : parseFloat(tipAmount);

    if (!amount || amount <= 0) {
      alert('Please enter a valid tip amount');
      return;
    }

    // TODO: Integrate Stripe for tip payment
    alert(`Stripe integration coming soon! Tip amount: $${amount}`);
  };

  const openGoogleReview = () => {
    if (booking?.company.googleReviewUrl) {
      window.open(booking.company.googleReviewUrl, '_blank');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center">
          <div className="text-red-600 text-5xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold mb-2">Link Not Found</h1>
          <p className="text-gray-600">{error || 'This feedback link is invalid or has expired.'}</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <Card className="p-6 text-center">
          {booking.company.logo && (
            <Image
              src={booking.company.logo}
              alt={booking.company.name}
              width={120}
              height={40}
              className="mx-auto mb-4"
            />
          )}
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {booking.company.name}
          </h1>
          <p className="text-gray-600">
            Service completed on {new Date(booking.scheduledDate).toLocaleDateString()}
          </p>
        </Card>

        {/* Cleaner Info */}
        {booking.assignee && (
          <Card className="p-6">
            <div className="flex items-center gap-4">
              {booking.assignee.user.photo ? (
                <Image
                  src={booking.assignee.user.photo}
                  alt={booking.assignee.user.name}
                  width={64}
                  height={64}
                  className="rounded-full"
                />
              ) : (
                <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                  {booking.assignee.user.name?.charAt(0) || 'C'}
                </div>
              )}
              <div>
                <p className="text-sm text-gray-600">Your cleaner</p>
                <p className="text-xl font-semibold">{booking.assignee.user.name}</p>
              </div>
            </div>
          </Card>
        )}

        {/* Rating Section */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Star className="h-5 w-5 text-yellow-500" />
            Rate Your Service
          </h2>

          {submitted ? (
            <div className="text-center py-4">
              <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-2" />
              <p className="text-lg font-medium text-green-600">Thank you for your feedback!</p>
              <div className="flex justify-center gap-1 my-3">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`h-8 w-8 ${
                      star <= rating ? 'fill-yellow-500 text-yellow-500' : 'text-gray-300'
                    }`}
                  />
                ))}
              </div>
              {feedback && (
                <p className="text-sm text-gray-600 mt-2 italic">&quot;{feedback}&quot;</p>
              )}
            </div>
          ) : (
            <>
              <div className="flex justify-center gap-2 mb-4">
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
                      className={`h-10 w-10 ${
                        star <= (hoverRating || rating)
                          ? 'fill-yellow-500 text-yellow-500'
                          : 'text-gray-300'
                      }`}
                    />
                  </button>
                ))}
              </div>

              <Textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Tell us about your experience (optional)"
                rows={4}
                className="mb-4"
              />

              <Button
                onClick={handleSubmitFeedback}
                disabled={submitting || rating === 0}
                className="w-full"
              >
                {submitting ? 'Submitting...' : 'Submit Feedback'}
              </Button>
            </>
          )}
        </Card>

        {/* Tip Section */}
        {booking.assignee && (
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <ThumbsUp className="h-5 w-5 text-green-600" />
              Tip Your Cleaner
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              100% of your tip goes directly to {booking.assignee.user.name}
            </p>

            <div className="grid grid-cols-4 gap-2 mb-4">
              {['5', '10', '15', '20'].map((amount) => (
                <button
                  key={amount}
                  onClick={() => {
                    setTipAmount(amount);
                    setCustomTip('');
                  }}
                  className={`py-3 px-4 rounded-lg border-2 font-semibold transition-colors ${
                    tipAmount === amount
                      ? 'border-green-600 bg-green-50 text-green-700'
                      : 'border-gray-200 hover:border-green-300'
                  }`}
                >
                  ${amount}
                </button>
              ))}
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Custom Amount</label>
              <input
                type="number"
                value={customTip}
                onChange={(e) => {
                  setCustomTip(e.target.value);
                  setTipAmount('custom');
                }}
                placeholder="Enter custom tip"
                className="w-full px-4 py-2 border rounded-lg"
              />
            </div>

            <Button onClick={handleTipCleaner} className="w-full bg-green-600 hover:bg-green-700">
              <CreditCard className="h-4 w-4 mr-2" />
              Tip via Stripe
            </Button>
          </Card>
        )}

        {/* Payment Section */}
        {!booking.copayPaid && booking.finalCopayAmount > 0 && (
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-blue-600" />
              Pay Your Bill
            </h2>
            <p className="text-2xl font-bold mb-4">
              Amount Due: ${booking.finalCopayAmount.toFixed(2)}
            </p>

            <div className="space-y-3">
              <Button className="w-full" variant="default">
                <CreditCard className="h-4 w-4 mr-2" />
                Pay with Card (Stripe)
              </Button>

              {booking.company.cashappUsername && (
                <Button
                  className="w-full bg-green-600 hover:bg-green-700"
                  onClick={() => window.open(`https://cash.app/${booking.company.cashappUsername}`, '_blank')}
                >
                  Pay with Cash App
                </Button>
              )}

              {booking.company.venmoUsername && (
                <Button
                  className="w-full bg-blue-500 hover:bg-blue-600"
                  onClick={() => window.open(`https://venmo.com/${booking.company.venmoUsername}`, '_blank')}
                >
                  Pay with Venmo
                </Button>
              )}
            </div>
          </Card>
        )}

        {booking.copayPaid && (
          <Card className="p-6 bg-green-50 border-green-200">
            <div className="flex items-center gap-3 text-green-700">
              <CheckCircle className="h-6 w-6" />
              <div>
                <p className="font-semibold">Payment Received</p>
                <p className="text-sm">Thank you for your payment!</p>
              </div>
            </div>
          </Card>
        )}

        {/* Google Review */}
        {booking.company.googleReviewUrl && (
          <Card className="p-6 bg-blue-50 border-blue-200">
            <h2 className="text-xl font-semibold mb-2 text-blue-900">Love Our Service?</h2>
            <p className="text-sm text-blue-800 mb-4">
              Help us grow by leaving a Google review!
            </p>
            <Button onClick={openGoogleReview} className="w-full bg-blue-600 hover:bg-blue-700">
              Leave a Google Review ⭐
            </Button>
          </Card>
        )}
      </div>
    </div>
  );
}

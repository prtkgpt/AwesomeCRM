'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Star, ThumbsUp, DollarSign, CreditCard, CheckCircle, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import Image from 'next/image';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '');

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
    yelpReviewUrl?: string;
    venmoUsername?: string;
    cashappUsername?: string;
  };
  customerRating?: number;
  customerFeedback?: string;
  tipAmount?: number;
  feedbackSubmittedAt?: string;
}

// Stripe Payment Form Component
function StripePaymentForm({
  clientSecret,
  onSuccess,
  onCancel,
  amount,
  type
}: {
  clientSecret: string;
  onSuccess: () => void;
  onCancel: () => void;
  amount: number;
  type: 'tip' | 'copay';
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setProcessing(true);
    setErrorMessage(null);

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        redirect: 'if_required',
      });

      if (error) {
        setErrorMessage(error.message || 'Payment failed');
        setProcessing(false);
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        onSuccess();
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An error occurred');
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-blue-50 p-3 rounded-lg">
        <p className="text-sm font-medium text-blue-900">
          {type === 'tip' ? 'Tip Amount' : 'Payment Amount'}: <span className="text-xl">${amount.toFixed(2)}</span>
        </p>
      </div>

      <PaymentElement />

      {errorMessage && (
        <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
          {errorMessage}
        </div>
      )}

      <div className="flex gap-3">
        <Button
          type="submit"
          disabled={!stripe || processing}
          className="flex-1"
        >
          {processing ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <CreditCard className="h-4 w-4 mr-2" />
              Pay ${amount.toFixed(2)}
            </>
          )}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={processing}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
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

  // Payment states
  const [showTipPayment, setShowTipPayment] = useState(false);
  const [showCopayPayment, setShowCopayPayment] = useState(false);
  const [tipClientSecret, setTipClientSecret] = useState<string | null>(null);
  const [copayClientSecret, setCopayClientSecret] = useState<string | null>(null);
  const [tipPaid, setTipPaid] = useState(false);
  const [copayPaidLocal, setCopayPaidLocal] = useState(false);

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
        if (data.data.copayPaid) {
          setCopayPaidLocal(true);
        }
        if (data.data.tipAmount) {
          setTipPaid(true);
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

  const handleInitiateTipPayment = async () => {
    const amount = tipAmount === 'custom' ? parseFloat(customTip) : parseFloat(tipAmount);

    if (!amount || amount <= 0) {
      alert('Please enter a valid tip amount');
      return;
    }

    try {
      const response = await fetch(`/api/feedback/${token}/create-tip-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipAmount: amount }),
      });

      const data = await response.json();

      if (data.success && data.clientSecret) {
        setTipClientSecret(data.clientSecret);
        setShowTipPayment(true);
      } else {
        alert(data.error || 'Failed to initialize payment');
      }
    } catch (err) {
      alert('Failed to initialize payment');
    }
  };

  const handleInitiateCopayPayment = async () => {
    try {
      const response = await fetch(`/api/feedback/${token}/create-copay-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await response.json();

      if (data.success && data.clientSecret) {
        setCopayClientSecret(data.clientSecret);
        setShowCopayPayment(true);
      } else {
        alert(data.error || 'Failed to initialize payment');
      }
    } catch (err) {
      alert('Failed to initialize payment');
    }
  };

  const handleTipPaymentSuccess = async () => {
    const amount = tipAmount === 'custom' ? parseFloat(customTip) : parseFloat(tipAmount);

    // Confirm payment on server
    await fetch(`/api/feedback/${token}/confirm-payment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        paymentIntentId: 'confirmed',
        paymentType: 'TIP',
        amount,
      }),
    });

    setTipPaid(true);
    setShowTipPayment(false);
    alert('Thank you for your generous tip!');
    fetchBooking(); // Refresh booking data
  };

  const handleCopayPaymentSuccess = async () => {
    // Confirm payment on server
    await fetch(`/api/feedback/${token}/confirm-payment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        paymentIntentId: 'confirmed',
        paymentType: 'COPAY',
      }),
    });

    setCopayPaidLocal(true);
    setShowCopayPayment(false);
    alert('Payment received! Thank you.');
    fetchBooking(); // Refresh booking data
  };

  const handleManualPayment = async (method: string, type: 'TIP' | 'COPAY') => {
    try {
      const amount = type === 'TIP'
        ? (tipAmount === 'custom' ? parseFloat(customTip) : parseFloat(tipAmount))
        : undefined;

      const response = await fetch(`/api/feedback/${token}/record-manual-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentType: type,
          paymentMethod: method,
          amount,
        }),
      });

      const data = await response.json();

      if (data.success) {
        if (type === 'COPAY') {
          setCopayPaidLocal(true);
        } else {
          setTipPaid(true);
        }
        alert(data.message);
        fetchBooking();
      } else {
        alert(data.error || 'Failed to record payment');
      }
    } catch (err) {
      alert('Failed to record payment');
    }
  };

  const openGoogleReview = () => {
    if (booking?.company.googleReviewUrl) {
      window.open(booking.company.googleReviewUrl, '_blank');
    }
  };

  const openYelpReview = () => {
    if (booking?.company.yelpReviewUrl) {
      window.open(booking.company.yelpReviewUrl, '_blank');
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
        {booking.assignee && !tipPaid && (
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <ThumbsUp className="h-5 w-5 text-green-600" />
              Tip Your Cleaner
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              100% of your tip goes directly to {booking.assignee.user.name}
            </p>

            {!showTipPayment ? (
              <>
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

                <Button onClick={handleInitiateTipPayment} className="w-full bg-green-600 hover:bg-green-700 mb-2">
                  <CreditCard className="h-4 w-4 mr-2" />
                  Tip via Credit Card
                </Button>

                {booking.company.cashappUsername && (
                  <Button
                    className="w-full bg-green-600 hover:bg-green-700 mb-2"
                    onClick={() => {
                      window.open(`https://cash.app/${booking.company.cashappUsername}`, '_blank');
                      handleManualPayment('CASHAPP', 'TIP');
                    }}
                  >
                    Tip via Cash App
                  </Button>
                )}

                {booking.company.venmoUsername && (
                  <Button
                    className="w-full bg-blue-500 hover:bg-blue-600"
                    onClick={() => {
                      window.open(`https://venmo.com/${booking.company.venmoUsername}`, '_blank');
                      handleManualPayment('VENMO', 'TIP');
                    }}
                  >
                    Tip via Venmo
                  </Button>
                )}
              </>
            ) : (
              tipClientSecret && stripePromise && (
                <Elements stripe={stripePromise} options={{ clientSecret: tipClientSecret }}>
                  <StripePaymentForm
                    clientSecret={tipClientSecret}
                    onSuccess={handleTipPaymentSuccess}
                    onCancel={() => {
                      setShowTipPayment(false);
                      setTipClientSecret(null);
                    }}
                    amount={tipAmount === 'custom' ? parseFloat(customTip) : parseFloat(tipAmount)}
                    type="tip"
                  />
                </Elements>
              )
            )}
          </Card>
        )}

        {tipPaid && (
          <Card className="p-6 bg-green-50 border-green-200">
            <div className="flex items-center gap-3 text-green-700">
              <CheckCircle className="h-6 w-6" />
              <div>
                <p className="font-semibold">Tip Sent!</p>
                <p className="text-sm">Thank you for your generosity!</p>
              </div>
            </div>
          </Card>
        )}

        {/* Payment Section */}
        {!copayPaidLocal && booking.finalCopayAmount > 0 && (
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-blue-600" />
              Pay Your Bill
            </h2>
            <p className="text-2xl font-bold mb-4">
              Amount Due: ${booking.finalCopayAmount.toFixed(2)}
            </p>

            {!showCopayPayment ? (
              <div className="space-y-3">
                <Button className="w-full" variant="default" onClick={handleInitiateCopayPayment}>
                  <CreditCard className="h-4 w-4 mr-2" />
                  Pay with Card (Stripe)
                </Button>

                {booking.company.cashappUsername && (
                  <Button
                    className="w-full bg-green-600 hover:bg-green-700"
                    onClick={() => {
                      window.open(`https://cash.app/${booking.company.cashappUsername}`, '_blank');
                      handleManualPayment('CASHAPP', 'COPAY');
                    }}
                  >
                    Pay with Cash App
                  </Button>
                )}

                {booking.company.venmoUsername && (
                  <Button
                    className="w-full bg-blue-500 hover:bg-blue-600"
                    onClick={() => {
                      window.open(`https://venmo.com/${booking.company.venmoUsername}`, '_blank');
                      handleManualPayment('VENMO', 'COPAY');
                    }}
                  >
                    Pay with Venmo
                  </Button>
                )}
              </div>
            ) : (
              copayClientSecret && stripePromise && (
                <Elements stripe={stripePromise} options={{ clientSecret: copayClientSecret }}>
                  <StripePaymentForm
                    clientSecret={copayClientSecret}
                    onSuccess={handleCopayPaymentSuccess}
                    onCancel={() => {
                      setShowCopayPayment(false);
                      setCopayClientSecret(null);
                    }}
                    amount={booking.finalCopayAmount}
                    type="copay"
                  />
                </Elements>
              )
            )}
          </Card>
        )}

        {copayPaidLocal && (
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

        {/* Online Reviews */}
        {(booking.company.googleReviewUrl || booking.company.yelpReviewUrl) && (
          <Card className="p-6 bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
            <h2 className="text-xl font-semibold mb-2 text-gray-900">Love Our Service?</h2>
            <p className="text-sm text-gray-700 mb-4">
              Help us grow by leaving a review! Your feedback means the world to us. ⭐
            </p>

            {booking.company.googleReviewUrl && booking.company.yelpReviewUrl ? (
              <div className="grid grid-cols-2 gap-3">
                <Button
                  onClick={openGoogleReview}
                  className="bg-blue-600 hover:bg-blue-700 flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Google
                </Button>
                <Button
                  onClick={openYelpReview}
                  className="bg-red-600 hover:bg-red-700 flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>
                    <path d="M12 6c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6zm0 10c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4z"/>
                  </svg>
                  Yelp
                </Button>
              </div>
            ) : booking.company.googleReviewUrl ? (
              <Button onClick={openGoogleReview} className="w-full bg-blue-600 hover:bg-blue-700 flex items-center justify-center gap-2">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Leave a Google Review
              </Button>
            ) : (
              <Button onClick={openYelpReview} className="w-full bg-red-600 hover:bg-red-700 flex items-center justify-center gap-2">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>
                  <path d="M12 6c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6zm0 10c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4z"/>
                </svg>
                Leave a Yelp Review
              </Button>
            )}

            <p className="text-xs text-gray-600 mt-3 text-center">
              Your review helps other customers find great service!
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  CreditCard,
  DollarSign,
  CheckCircle,
  Loader2,
  ExternalLink,
} from 'lucide-react';

type PaymentMethod = 'STRIPE' | 'ZELLE' | 'VENMO' | 'CASHAPP';

export default function PayCopayPage() {
  const params = useParams();
  const token = params.token as string;

  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [alreadyPaid, setAlreadyPaid] = useState(false);
  const [booking, setBooking] = useState<any>(null);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('STRIPE');

  // Stripe card details (for demo - in production use Stripe Elements)
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');

  useEffect(() => {
    fetchBooking();
  }, [token]);

  const fetchBooking = async () => {
    try {
      const response = await fetch(`/api/pay-copay/${token}`);
      const result = await response.json();

      if (!response.ok) {
        if (result.alreadyPaid) {
          setAlreadyPaid(true);
        } else {
          setError(result.error || 'Failed to load payment information');
        }
        return;
      }

      setBooking(result.data);
    } catch (err) {
      setError('Failed to load payment information');
    } finally {
      setLoading(false);
    }
  };

  const handleStripePayment = async () => {
    // Basic validation
    if (!cardNumber || !expiry || !cvc) {
      setError('Please fill in all card details');
      return;
    }

    setProcessing(true);
    setError('');

    try {
      // In production, you would:
      // 1. Create a PaymentIntent on your backend
      // 2. Use Stripe.js to confirm the payment
      // 3. Send the PaymentIntent ID to your backend

      // For now, we'll simulate a successful payment
      const response = await fetch(`/api/pay-copay/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentMethod: 'STRIPE',
          stripePaymentIntentId: `pi_demo_${Date.now()}`, // Demo ID
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Payment failed');
      }

      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || 'Payment failed. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const handleAlternativePayment = async (method: PaymentMethod) => {
    setProcessing(true);
    setError('');

    try {
      const response = await fetch(`/api/pay-copay/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentMethod: method }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Payment recording failed');
      }

      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || 'Failed to record payment. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <Loader2 className="h-8 w-8 animate-spin text-green-600" />
      </div>
    );
  }

  if (alreadyPaid) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <Card className="w-full max-w-lg p-8 text-center">
          <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Copay Already Paid
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Your copay has already been processed. Thank you!
          </p>
        </Card>
      </div>
    );
  }

  if (error && !booking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <Card className="w-full max-w-lg p-8 text-center">
          <div className="text-red-600 mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Unable to Load Payment
          </h1>
          <p className="text-gray-600 dark:text-gray-300">{error}</p>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <Card className="w-full max-w-lg p-8 text-center">
          <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Payment Received!
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            Thank you for your payment. Your copay of ${booking?.copayAmount?.toFixed(2)} has been recorded.
          </p>
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <p className="text-sm text-green-800 dark:text-green-200">
              We've received your payment through {selectedMethod.toLowerCase()}.
              You'll receive a confirmation email shortly.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 dark:from-gray-900 dark:to-gray-800 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <Card className="p-6 md:p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full mb-4">
              <DollarSign className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Pay Your Copay
            </h1>
            <p className="text-gray-600 dark:text-gray-300">
              Cleaning service for {booking?.client?.name}
            </p>
            {booking?.company?.name && (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {booking.company.name}
              </p>
            )}
          </div>

          {/* Amount Due */}
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-2 border-green-200 dark:border-green-800 rounded-lg p-6 mb-8 text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Amount Due</p>
            <p className="text-4xl font-bold text-green-600 dark:text-green-400">
              ${booking?.copayAmount?.toFixed(2)}
            </p>
          </div>

          {/* Payment Method Tabs */}
          <div className="mb-6">
            <Label className="text-base font-semibold mb-3 block">
              Choose Payment Method
            </Label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <button
                onClick={() => setSelectedMethod('STRIPE')}
                className={`p-3 rounded-lg border-2 transition-all ${
                  selectedMethod === 'STRIPE'
                    ? 'border-green-600 bg-green-50 dark:bg-green-900/30'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                }`}
              >
                <CreditCard className="h-5 w-5 mx-auto mb-1" />
                <p className="text-xs font-medium">Card</p>
              </button>
              <button
                onClick={() => setSelectedMethod('ZELLE')}
                className={`p-3 rounded-lg border-2 transition-all ${
                  selectedMethod === 'ZELLE'
                    ? 'border-green-600 bg-green-50 dark:bg-green-900/30'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="text-xl mb-1 block">💸</span>
                <p className="text-xs font-medium">Zelle</p>
              </button>
              <button
                onClick={() => setSelectedMethod('VENMO')}
                className={`p-3 rounded-lg border-2 transition-all ${
                  selectedMethod === 'VENMO'
                    ? 'border-green-600 bg-green-50 dark:bg-green-900/30'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="text-xl mb-1 block">💙</span>
                <p className="text-xs font-medium">Venmo</p>
              </button>
              <button
                onClick={() => setSelectedMethod('CASHAPP')}
                className={`p-3 rounded-lg border-2 transition-all ${
                  selectedMethod === 'CASHAPP'
                    ? 'border-green-600 bg-green-50 dark:bg-green-900/30'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="text-xl mb-1 block">💚</span>
                <p className="text-xs font-medium">Cash App</p>
              </button>
            </div>
          </div>

          {/* Payment Forms */}
          <div className="mb-6">
            {selectedMethod === 'STRIPE' && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="cardNumber">Card Number</Label>
                  <Input
                    id="cardNumber"
                    type="text"
                    placeholder="4242 4242 4242 4242"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value)}
                    maxLength={19}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="expiry">Expiry Date</Label>
                    <Input
                      id="expiry"
                      type="text"
                      placeholder="MM/YY"
                      value={expiry}
                      onChange={(e) => setExpiry(e.target.value)}
                      maxLength={5}
                    />
                  </div>
                  <div>
                    <Label htmlFor="cvc">CVC</Label>
                    <Input
                      id="cvc"
                      type="text"
                      placeholder="123"
                      value={cvc}
                      onChange={(e) => setCvc(e.target.value)}
                      maxLength={4}
                    />
                  </div>
                </div>
                <Button
                  onClick={handleStripePayment}
                  disabled={processing}
                  className="w-full bg-green-600 hover:bg-green-700 text-white"
                >
                  {processing ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>Pay ${booking?.copayAmount?.toFixed(2)}</>
                  )}
                </Button>
              </div>
            )}

            {selectedMethod === 'ZELLE' && booking?.company?.zelleEmail && (
              <div className="space-y-4">
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                    Send via Zelle
                  </h3>
                  <ol className="list-decimal list-inside space-y-2 text-sm text-blue-800 dark:text-blue-200">
                    <li>Open your banking app</li>
                    <li>Go to Zelle and select "Send Money"</li>
                    <li>Send to: <strong className="break-all">{booking.company.zelleEmail}</strong></li>
                    <li>Amount: <strong>${booking.copayAmount.toFixed(2)}</strong></li>
                    <li>Add note: "Copay - {booking.client.name}"</li>
                  </ol>
                </div>
                <Button
                  onClick={() => handleAlternativePayment('ZELLE')}
                  disabled={processing}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {processing ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      Recording...
                    </>
                  ) : (
                    <>I've Sent via Zelle</>
                  )}
                </Button>
              </div>
            )}

            {selectedMethod === 'VENMO' && booking?.company?.venmoUsername && (
              <div className="space-y-4">
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                    Send via Venmo
                  </h3>
                  <p className="text-sm text-blue-800 dark:text-blue-200 mb-3">
                    Send ${booking.copayAmount.toFixed(2)} to:
                  </p>
                  <p className="text-lg font-bold text-blue-900 dark:text-blue-100 mb-3">
                    @{booking.company.venmoUsername}
                  </p>
                  <a
                    href={`venmo://paycharge?txn=pay&recipients=${booking.company.venmoUsername}&amount=${booking.copayAmount}&note=Copay - ${booking.client.name}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-blue-600 hover:text-blue-700 text-sm"
                  >
                    Open Venmo App
                    <ExternalLink className="h-4 w-4 ml-1" />
                  </a>
                </div>
                <Button
                  onClick={() => handleAlternativePayment('VENMO')}
                  disabled={processing}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {processing ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      Recording...
                    </>
                  ) : (
                    <>I've Sent via Venmo</>
                  )}
                </Button>
              </div>
            )}

            {selectedMethod === 'CASHAPP' && booking?.company?.cashappUsername && (
              <div className="space-y-4">
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                  <h3 className="font-semibold text-green-900 dark:text-green-100 mb-2">
                    Send via Cash App
                  </h3>
                  <p className="text-sm text-green-800 dark:text-green-200 mb-3">
                    Send ${booking.copayAmount.toFixed(2)} to:
                  </p>
                  <p className="text-lg font-bold text-green-900 dark:text-green-100 mb-3">
                    ${booking.company.cashappUsername}
                  </p>
                  <a
                    href={`https://cash.app/${booking.company.cashappUsername}/${booking.copayAmount}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-green-600 hover:text-green-700 text-sm"
                  >
                    Open Cash App
                    <ExternalLink className="h-4 w-4 ml-1" />
                  </a>
                </div>
                <Button
                  onClick={() => handleAlternativePayment('CASHAPP')}
                  disabled={processing}
                  className="w-full bg-green-600 hover:bg-green-700 text-white"
                >
                  {processing ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      Recording...
                    </>
                  ) : (
                    <>I've Sent via Cash App</>
                  )}
                </Button>
              </div>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-4">
              <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
            </div>
          )}

          {/* Security Note */}
          <div className="text-center text-xs text-gray-500 dark:text-gray-400 mt-6">
            <p>🔒 Your payment is secure and encrypted</p>
          </div>
        </Card>
      </div>
    </div>
  );
}

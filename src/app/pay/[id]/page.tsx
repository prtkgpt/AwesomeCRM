'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  CreditCard,
  DollarSign,
  CheckCircle,
  Loader2,
  ExternalLink,
  Calendar,
  MapPin,
  FileText,
  AlertCircle,
  Clock,
} from 'lucide-react';
import { loadStripe, Stripe } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';

type PaymentMethod = 'STRIPE' | 'ZELLE' | 'VENMO' | 'CASHAPP';

interface LineItem {
  description: string;
  quantity: number;
  rate: number;
  amount: number;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  status: string;
  issueDate: string;
  dueDate: string;
  lineItems: LineItem[];
  subtotal: number;
  tax: number;
  total: number;
  notes?: string;
  client: {
    name: string;
    email?: string;
  };
  booking?: {
    scheduledDate: string;
    serviceType: string;
    address: {
      street: string;
      city: string;
      state: string;
      zip: string;
    };
  };
  company: {
    name: string;
    phone?: string;
    hasStripe: boolean;
    stripePublishableKey?: string;
    hasZelle: boolean;
    zelleEmail?: string;
    hasVenmo: boolean;
    venmoUsername?: string;
    hasCashApp: boolean;
    cashappUsername?: string;
  };
}

// Stripe Payment Form Component
function StripePaymentForm({
  invoice,
  onSuccess,
  onError,
}: {
  invoice: Invoice;
  onSuccess: () => void;
  onError: (error: string) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setProcessing(true);

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: window.location.href,
        },
        redirect: 'if_required',
      });

      if (error) {
        onError(error.message || 'Payment failed');
        setProcessing(false);
        return;
      }

      if (paymentIntent && paymentIntent.status === 'succeeded') {
        // Record the payment
        const response = await fetch(`/api/pay/${invoice.id}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            paymentMethod: 'STRIPE',
            paymentIntentId: paymentIntent.id,
          }),
        });

        const result = await response.json();

        if (result.success) {
          onSuccess();
        } else {
          onError(result.error || 'Failed to record payment');
        }
      }
    } catch (err: any) {
      onError(err.message || 'Payment failed');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      <Button
        type="submit"
        disabled={!stripe || processing}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white"
      >
        {processing ? (
          <>
            <Loader2 className="h-5 w-5 mr-2 animate-spin" />
            Processing...
          </>
        ) : (
          <>Pay ${invoice.total.toFixed(2)}</>
        )}
      </Button>
    </form>
  );
}

export default function PayInvoicePage() {
  const params = useParams();
  const invoiceId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [alreadyPaid, setAlreadyPaid] = useState(false);
  const [paidData, setPaidData] = useState<any>(null);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);

  // Stripe
  const [stripePromise, setStripePromise] = useState<Promise<Stripe | null> | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);

  useEffect(() => {
    fetchInvoice();
  }, [invoiceId]);

  const fetchInvoice = async () => {
    try {
      const response = await fetch(`/api/pay/${invoiceId}`);
      const result = await response.json();

      if (!response.ok) {
        if (result.alreadyPaid) {
          setAlreadyPaid(true);
          setPaidData(result.data);
        } else {
          setError(result.error || 'Failed to load invoice');
        }
        return;
      }

      setInvoice(result.data);

      // Set default payment method based on available options
      if (result.data.company.hasStripe) {
        setSelectedMethod('STRIPE');
      } else if (result.data.company.hasZelle) {
        setSelectedMethod('ZELLE');
      } else if (result.data.company.hasVenmo) {
        setSelectedMethod('VENMO');
      } else if (result.data.company.hasCashApp) {
        setSelectedMethod('CASHAPP');
      }
    } catch (err) {
      setError('Failed to load invoice');
    } finally {
      setLoading(false);
    }
  };

  // Initialize Stripe when selected
  useEffect(() => {
    if (selectedMethod === 'STRIPE' && invoice?.company.hasStripe && invoice.company.stripePublishableKey) {
      setStripePromise(loadStripe(invoice.company.stripePublishableKey));
      createPaymentIntent();
    }
  }, [selectedMethod, invoice]);

  const createPaymentIntent = async () => {
    if (!invoice) return;

    try {
      const response = await fetch(`/api/pay/${invoiceId}`, {
        method: 'PUT',
      });
      const result = await response.json();

      if (result.success) {
        setClientSecret(result.data.clientSecret);
      } else {
        setError(result.error || 'Failed to initialize payment');
      }
    } catch (err) {
      setError('Failed to initialize payment');
    }
  };

  const handleAlternativePayment = async (method: PaymentMethod) => {
    if (!invoice) return;

    const methodLabel = method === 'ZELLE' ? 'Zelle' : method === 'VENMO' ? 'Venmo' : 'Cash App';
    if (!confirm(`Have you sent $${invoice.total.toFixed(2)} via ${methodLabel}?`)) {
      return;
    }

    setProcessing(true);
    setError('');

    try {
      const response = await fetch(`/api/pay/${invoiceId}`, {
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const isOverdue = invoice && new Date(invoice.dueDate) < new Date() && invoice.status !== 'PAID';

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (alreadyPaid) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <Card className="w-full max-w-lg p-8 text-center">
          <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Invoice Already Paid
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            Invoice {paidData?.invoiceNumber} has been paid.
          </p>
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <p className="text-2xl font-bold text-green-600">${paidData?.total?.toFixed(2)}</p>
            <p className="text-sm text-gray-500 mt-1">
              Thank you, {paidData?.companyName}
            </p>
          </div>
        </Card>
      </div>
    );
  }

  if (error && !invoice) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <Card className="w-full max-w-lg p-8 text-center">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Unable to Load Invoice
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
            Thank you for your payment of ${invoice?.total.toFixed(2)} for invoice {invoice?.invoiceNumber}.
          </p>
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <p className="text-sm text-green-800 dark:text-green-200">
              {invoice?.company.name} has been notified of your payment.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  if (!invoice) return null;

  const availableMethods = [
    invoice.company.hasStripe && 'STRIPE',
    invoice.company.hasZelle && 'ZELLE',
    invoice.company.hasVenmo && 'VENMO',
    invoice.company.hasCashApp && 'CASHAPP',
  ].filter(Boolean) as PaymentMethod[];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-8 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <Card className="p-6">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {invoice.company.name}
              </h1>
              {invoice.company.phone && (
                <p className="text-sm text-gray-500">{invoice.company.phone}</p>
              )}
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Invoice</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">
                {invoice.invoiceNumber}
              </p>
            </div>
          </div>

          {/* Client & Dates */}
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <div>
              <p className="text-sm text-gray-500 mb-1">Bill To</p>
              <p className="font-semibold text-gray-900 dark:text-white">
                {invoice.client.name}
              </p>
              {invoice.client.email && (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {invoice.client.email}
                </p>
              )}
            </div>
            <div className="md:text-right">
              <div className="flex md:justify-end items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-1">
                <Calendar className="w-4 h-4" />
                Issued: {formatDate(invoice.issueDate)}
              </div>
              <div className={`flex md:justify-end items-center gap-2 text-sm ${isOverdue ? 'text-red-600 font-semibold' : 'text-gray-600 dark:text-gray-400'}`}>
                <Clock className="w-4 h-4" />
                Due: {formatDate(invoice.dueDate)}
                {isOverdue && ' (Overdue)'}
              </div>
            </div>
          </div>

          {/* Service Details */}
          {invoice.booking && (
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {invoice.booking.serviceType.replace(/_/g, ' ')}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {invoice.booking.address.street}, {invoice.booking.address.city}, {invoice.booking.address.state} {invoice.booking.address.zip}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    Service Date: {formatDate(invoice.booking.scheduledDate)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Line Items */}
          <div className="border dark:border-gray-700 rounded-lg overflow-hidden mb-6">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase px-4 py-3">Description</th>
                  <th className="text-right text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase px-4 py-3 hidden sm:table-cell">Qty</th>
                  <th className="text-right text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase px-4 py-3 hidden sm:table-cell">Rate</th>
                  <th className="text-right text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase px-4 py-3">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {(invoice.lineItems || []).map((item: LineItem, index: number) => (
                  <tr key={index}>
                    <td className="px-4 py-3 text-gray-900 dark:text-white">{item.description}</td>
                    <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-400 hidden sm:table-cell">{item.quantity}</td>
                    <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-400 hidden sm:table-cell">${item.rate.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900 dark:text-white">${item.amount.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="flex justify-end">
            <div className="w-64 space-y-2">
              <div className="flex justify-between text-gray-600 dark:text-gray-400">
                <span>Subtotal</span>
                <span>${invoice.subtotal.toFixed(2)}</span>
              </div>
              {invoice.tax > 0 && (
                <div className="flex justify-between text-gray-600 dark:text-gray-400">
                  <span>Tax</span>
                  <span>${invoice.tax.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-xl font-bold text-gray-900 dark:text-white border-t pt-2">
                <span>Total Due</span>
                <span className={isOverdue ? 'text-red-600' : ''}>${invoice.total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          {invoice.notes && (
            <div className="mt-6 pt-6 border-t dark:border-gray-700">
              <div className="flex items-start gap-2">
                <FileText className="w-4 h-4 text-gray-400 mt-1" />
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Notes</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{invoice.notes}</p>
                </div>
              </div>
            </div>
          )}
        </Card>

        {/* Payment Section */}
        <Card className="p-6">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full mb-3">
              <DollarSign className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Pay Your Invoice
            </h2>
          </div>

          {/* Payment Method Selection */}
          {availableMethods.length > 1 && (
            <div className="mb-6">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Choose Payment Method
              </p>
              <div className={`grid gap-2 ${availableMethods.length <= 2 ? 'grid-cols-2' : 'grid-cols-2 md:grid-cols-4'}`}>
                {invoice.company.hasStripe && (
                  <button
                    onClick={() => setSelectedMethod('STRIPE')}
                    className={`p-3 rounded-lg border-2 transition-all ${
                      selectedMethod === 'STRIPE'
                        ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/30'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <CreditCard className="h-5 w-5 mx-auto mb-1" />
                    <p className="text-xs font-medium">Card</p>
                  </button>
                )}
                {invoice.company.hasZelle && (
                  <button
                    onClick={() => setSelectedMethod('ZELLE')}
                    className={`p-3 rounded-lg border-2 transition-all ${
                      selectedMethod === 'ZELLE'
                        ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/30'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <span className="text-xl mb-1 block">💸</span>
                    <p className="text-xs font-medium">Zelle</p>
                  </button>
                )}
                {invoice.company.hasVenmo && (
                  <button
                    onClick={() => setSelectedMethod('VENMO')}
                    className={`p-3 rounded-lg border-2 transition-all ${
                      selectedMethod === 'VENMO'
                        ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/30'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <span className="text-xl mb-1 block">💙</span>
                    <p className="text-xs font-medium">Venmo</p>
                  </button>
                )}
                {invoice.company.hasCashApp && (
                  <button
                    onClick={() => setSelectedMethod('CASHAPP')}
                    className={`p-3 rounded-lg border-2 transition-all ${
                      selectedMethod === 'CASHAPP'
                        ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/30'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <span className="text-xl mb-1 block">💚</span>
                    <p className="text-xs font-medium">Cash App</p>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Payment Forms */}
          <div>
            {selectedMethod === 'STRIPE' && invoice.company.hasStripe && stripePromise && clientSecret && (
              <Elements
                stripe={stripePromise}
                options={{
                  clientSecret,
                  appearance: { theme: 'stripe' },
                }}
              >
                <StripePaymentForm
                  invoice={invoice}
                  onSuccess={() => setSubmitted(true)}
                  onError={(err) => setError(err)}
                />
              </Elements>
            )}

            {selectedMethod === 'STRIPE' && invoice.company.hasStripe && !clientSecret && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                <span className="ml-2 text-gray-600">Loading payment form...</span>
              </div>
            )}

            {selectedMethod === 'ZELLE' && invoice.company.zelleEmail && (
              <div className="space-y-4">
                <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
                  <h3 className="font-semibold text-purple-900 dark:text-purple-100 mb-2">
                    Send via Zelle
                  </h3>
                  <ol className="list-decimal list-inside space-y-2 text-sm text-purple-800 dark:text-purple-200">
                    <li>Open your banking app</li>
                    <li>Go to Zelle and select "Send Money"</li>
                    <li>Send to: <strong className="break-all">{invoice.company.zelleEmail}</strong></li>
                    <li>Amount: <strong>${invoice.total.toFixed(2)}</strong></li>
                    <li>Add note: "Invoice {invoice.invoiceNumber} - {invoice.client.name}"</li>
                  </ol>
                </div>
                <Button
                  onClick={() => handleAlternativePayment('ZELLE')}
                  disabled={processing}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white"
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

            {selectedMethod === 'VENMO' && invoice.company.venmoUsername && (
              <div className="space-y-4">
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                    Send via Venmo
                  </h3>
                  <p className="text-sm text-blue-800 dark:text-blue-200 mb-3">
                    Send ${invoice.total.toFixed(2)} to:
                  </p>
                  <p className="text-lg font-bold text-blue-900 dark:text-blue-100 mb-3">
                    @{invoice.company.venmoUsername}
                  </p>
                  <p className="text-sm text-blue-700 dark:text-blue-300 mb-3">
                    Note: Invoice {invoice.invoiceNumber} - {invoice.client.name}
                  </p>
                  <a
                    href={`venmo://paycharge?txn=pay&recipients=${invoice.company.venmoUsername}&amount=${invoice.total}&note=Invoice ${invoice.invoiceNumber}`}
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

            {selectedMethod === 'CASHAPP' && invoice.company.cashappUsername && (
              <div className="space-y-4">
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                  <h3 className="font-semibold text-green-900 dark:text-green-100 mb-2">
                    Send via Cash App
                  </h3>
                  <p className="text-sm text-green-800 dark:text-green-200 mb-3">
                    Send ${invoice.total.toFixed(2)} to:
                  </p>
                  <p className="text-lg font-bold text-green-900 dark:text-green-100 mb-3">
                    ${invoice.company.cashappUsername}
                  </p>
                  <p className="text-sm text-green-700 dark:text-green-300 mb-3">
                    Note: Invoice {invoice.invoiceNumber} - {invoice.client.name}
                  </p>
                  <a
                    href={`https://cash.app/${invoice.company.cashappUsername}/${invoice.total}`}
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

            {availableMethods.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                <p>No payment methods configured. Please contact {invoice.company.name} directly.</p>
              </div>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mt-4">
              <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
            </div>
          )}

          {/* Security Note */}
          <div className="text-center text-xs text-gray-500 dark:text-gray-400 mt-6">
            <p>Secure payment powered by {invoice.company.name}</p>
          </div>
        </Card>
      </div>
    </div>
  );
}

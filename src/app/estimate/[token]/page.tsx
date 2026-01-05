'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar, Clock, MapPin, DollarSign, CheckCircle, Building2, Lock, CreditCard } from 'lucide-react';

interface EstimateData {
  id: string;
  token: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string | null;
  serviceType: string;
  scheduledDate: string;
  duration: number;
  price: number;
  notes: string | null;
  status: string;
  address: {
    street: string;
    city: string;
    state: string;
    zip: string;
  };
  company: {
    name: string;
    email: string | null;
    phone: string | null;
    logo: string | null;
  };
}

export default function PublicEstimatePage({ params }: { params: { token: string } }) {
  const router = useRouter();
  const [estimate, setEstimate] = useState<EstimateData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [accepting, setAccepting] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    createAccount: false,
    // Payment fields
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    billingZip: '',
  });

  useEffect(() => {
    fetchEstimate();
  }, [params.token]);

  useEffect(() => {
    if (estimate) {
      // Pre-fill form with estimate data
      setFormData(prev => ({
        ...prev,
        name: estimate.clientName,
        email: estimate.clientEmail,
        phone: estimate.clientPhone || '',
      }));
    }
  }, [estimate]);

  const fetchEstimate = async () => {
    try {
      const res = await fetch(`/api/public/estimate/${params.token}`);
      const data = await res.json();

      if (res.ok) {
        setEstimate(data.data);
      } else {
        setError(data.error || 'Estimate not found');
      }
    } catch (err) {
      setError('Failed to load estimate');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate required fields
    if (!formData.name || !formData.email || !formData.phone) {
      setError('Please fill in all contact information');
      return;
    }

    if (!formData.cardNumber || !formData.expiryDate || !formData.cvv || !formData.billingZip) {
      setError('Please fill in all payment information');
      return;
    }

    if (formData.createAccount && !formData.password) {
      setError('Please provide a password to create an account');
      return;
    }

    setAccepting(true);

    try {
      const res = await fetch(`/api/public/estimate/${params.token}/book`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          password: formData.createAccount ? formData.password : null,
          createAccount: formData.createAccount,
          payment: {
            cardNumber: formData.cardNumber,
            expiryDate: formData.expiryDate,
            cvv: formData.cvv,
            billingZip: formData.billingZip,
          },
        }),
      });

      const data = await res.json();

      if (res.ok) {
        // Show success message
        alert('Booking confirmed! Check your email for confirmation details.');

        // Redirect to login if account was created
        if (formData.createAccount) {
          router.push('/login?message=account_created');
        } else {
          // Redirect to a thank you page or home
          router.push('/');
        }
      } else {
        setError(data.error || 'Failed to process booking');
      }
    } catch (err) {
      setError('Failed to process booking. Please try again.');
    } finally {
      setAccepting(false);
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (date: string) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">Loading estimate...</div>
      </div>
    );
  }

  if (error || !estimate) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <Card className="p-8 max-w-md w-full text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Estimate Not Found</h1>
          <p className="text-gray-600 mb-6">{error || 'This estimate may have expired or been removed.'}</p>
          <Button onClick={() => router.push('/')}>Go Home</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Company Header */}
        <Card className="p-6 mb-6">
          <div className="flex items-center gap-4">
            {estimate.company.logo ? (
              <img
                src={estimate.company.logo}
                alt={estimate.company.name}
                className="h-16 w-16 rounded-lg object-cover"
              />
            ) : (
              <div className="h-16 w-16 bg-blue-100 rounded-lg flex items-center justify-center">
                <Building2 className="h-8 w-8 text-blue-600" />
              </div>
            )}
            <div>
              <h2 className="text-2xl font-bold">{estimate.company.name}</h2>
              {estimate.company.phone && (
                <p className="text-gray-600">{estimate.company.phone}</p>
              )}
              {estimate.company.email && (
                <p className="text-gray-600">{estimate.company.email}</p>
              )}
            </div>
          </div>
        </Card>

        {/* Estimate Details */}
        <Card className="p-8 mb-6">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2">Service Estimate</h1>
            <p className="text-gray-600">For {estimate.clientName}</p>
          </div>

          {/* Service Details */}
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Service Details</h3>
              <div className="space-y-3">
                <div className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-green-600 mr-3 mt-0.5" />
                  <div>
                    <p className="font-medium">{estimate.serviceType}</p>
                    <p className="text-sm text-gray-600">Estimated duration: {estimate.duration} minutes</p>
                  </div>
                </div>

                <div className="flex items-start">
                  <Calendar className="h-5 w-5 text-blue-600 mr-3 mt-0.5" />
                  <div>
                    <p className="font-medium">{formatDate(estimate.scheduledDate)}</p>
                    <p className="text-sm text-gray-600">{formatTime(estimate.scheduledDate)}</p>
                  </div>
                </div>

                <div className="flex items-start">
                  <MapPin className="h-5 w-5 text-purple-600 mr-3 mt-0.5" />
                  <div>
                    <p className="font-medium">{estimate.address.street}</p>
                    <p className="text-sm text-gray-600">
                      {estimate.address.city}, {estimate.address.state} {estimate.address.zip}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {estimate.notes && (
              <div>
                <h3 className="text-lg font-semibold mb-2">Additional Notes</h3>
                <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                  <p className="text-gray-700">{estimate.notes}</p>
                </div>
              </div>
            )}

            {/* Price */}
            <div className="border-t pt-6">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-semibold">Estimated Total</h3>
                <div className="flex items-center text-4xl font-bold text-blue-600">
                  <DollarSign className="h-8 w-8" />
                  <span>{estimate.price.toFixed(2)}</span>
                </div>
              </div>
              <p className="text-sm text-gray-500 mt-2 text-right">
                Final price may vary based on actual service requirements
              </p>
            </div>
          </div>
        </Card>

        {/* Booking Form */}
        {!showPaymentForm ? (
          <Card className="p-6">
            <div className="text-center">
              <h3 className="text-xl font-semibold mb-4">Ready to get started?</h3>
              <p className="text-gray-600 mb-6">
                Book your appointment and pay securely online
              </p>
              <div className="flex gap-4 justify-center">
                <Button onClick={() => setShowPaymentForm(true)} size="lg">
                  Book & Pay Now
                </Button>
                <Button variant="outline" size="lg" onClick={() => window.print()}>
                  Print Estimate
                </Button>
              </div>
            </div>
          </Card>
        ) : (
          <Card className="p-6">
            <form onSubmit={handleSubmitBooking}>
              <h3 className="text-xl font-semibold mb-6">Complete Your Booking</h3>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-lg mb-6 text-sm">
                  {error}
                </div>
              )}

              {/* Contact Information */}
              <div className="mb-6">
                <h4 className="font-semibold mb-4 flex items-center">
                  Contact Information
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Full Name *</Label>
                    <Input
                      id="name"
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                      placeholder="John Doe"
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                      placeholder="john@example.com"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor="phone">Phone *</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      required
                      placeholder="(555) 123-4567"
                    />
                  </div>
                </div>
              </div>

              {/* Payment Information */}
              <div className="mb-6">
                <h4 className="font-semibold mb-4 flex items-center">
                  <Lock className="h-4 w-4 mr-2" />
                  Secure Payment Information
                </h4>
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <Label htmlFor="cardNumber">Card Number *</Label>
                    <div className="relative">
                      <Input
                        id="cardNumber"
                        type="text"
                        value={formData.cardNumber}
                        onChange={(e) => setFormData({ ...formData, cardNumber: e.target.value })}
                        required
                        placeholder="4242 4242 4242 4242"
                        maxLength={19}
                      />
                      <CreditCard className="absolute right-3 top-3 h-5 w-5 text-gray-400" />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="expiryDate">Expiry *</Label>
                      <Input
                        id="expiryDate"
                        type="text"
                        value={formData.expiryDate}
                        onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                        required
                        placeholder="MM/YY"
                        maxLength={5}
                      />
                    </div>
                    <div>
                      <Label htmlFor="cvv">CVV *</Label>
                      <Input
                        id="cvv"
                        type="text"
                        value={formData.cvv}
                        onChange={(e) => setFormData({ ...formData, cvv: e.target.value })}
                        required
                        placeholder="123"
                        maxLength={4}
                      />
                    </div>
                    <div>
                      <Label htmlFor="billingZip">Billing ZIP *</Label>
                      <Input
                        id="billingZip"
                        type="text"
                        value={formData.billingZip}
                        onChange={(e) => setFormData({ ...formData, billingZip: e.target.value })}
                        required
                        placeholder="12345"
                        maxLength={5}
                      />
                    </div>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2 flex items-center">
                  <Lock className="h-3 w-3 mr-1" />
                  Your payment information is encrypted and secure
                </p>
              </div>

              {/* Account Creation (Optional) */}
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <label className="flex items-start cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.createAccount}
                    onChange={(e) => setFormData({ ...formData, createAccount: e.target.checked })}
                    className="mt-1 mr-3"
                  />
                  <div>
                    <p className="font-medium text-blue-900">Create an account (optional)</p>
                    <p className="text-sm text-blue-700">
                      Track your bookings, view invoices, and manage future appointments
                    </p>
                  </div>
                </label>

                {formData.createAccount && (
                  <div className="mt-4">
                    <Label htmlFor="password">Create Password *</Label>
                    <Input
                      id="password"
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder="Min 8 characters"
                      minLength={8}
                    />
                  </div>
                )}
              </div>

              {/* Summary */}
              <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium">Service Total:</span>
                  <span className="text-2xl font-bold text-blue-600">
                    {formatCurrency(estimate?.price || 0)}
                  </span>
                </div>
                <p className="text-xs text-gray-500">
                  Payment will be processed immediately upon confirmation
                </p>
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowPaymentForm(false)}
                  className="flex-1"
                  disabled={accepting}
                >
                  Back
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  disabled={accepting}
                >
                  {accepting ? 'Processing...' : `Confirm & Pay ${formatCurrency(estimate?.price || 0)}`}
                </Button>
              </div>

              <p className="text-xs text-gray-500 text-center mt-4">
                By confirming, you agree to the service terms and authorize the charge
              </p>
            </form>
          </Card>
        )}

        {/* Contact Info */}
        <div className="text-center mt-6 text-gray-600">
          <p>Questions? Contact {estimate.company.name}</p>
          {estimate.company.phone && (
            <p className="font-medium">{estimate.company.phone}</p>
          )}
        </div>
      </div>
    </div>
  );
}

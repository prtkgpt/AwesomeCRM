'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, MapPin, DollarSign, CheckCircle, Building2 } from 'lucide-react';

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

  useEffect(() => {
    fetchEstimate();
  }, [params.token]);

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

  const handleAccept = async () => {
    if (!confirm('Accept this estimate and create an account?')) return;

    setAccepting(true);
    try {
      const res = await fetch(`/api/public/estimate/${params.token}/accept`, {
        method: 'POST',
      });

      const data = await res.json();

      if (res.ok) {
        // Redirect to signup with pre-filled data
        const signupUrl = new URL('/signup', window.location.origin);
        signupUrl.searchParams.set('email', estimate!.clientEmail);
        signupUrl.searchParams.set('name', estimate!.clientName);
        signupUrl.searchParams.set('estimateToken', params.token);
        router.push(signupUrl.toString());
      } else {
        alert(data.error || 'Failed to accept estimate');
      }
    } catch (err) {
      alert('Failed to accept estimate');
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

        {/* Actions */}
        <Card className="p-6">
          <div className="text-center">
            <h3 className="text-xl font-semibold mb-4">Ready to get started?</h3>
            <p className="text-gray-600 mb-6">
              Accept this estimate and create an account to schedule your service
            </p>
            <div className="flex gap-4 justify-center">
              <Button onClick={handleAccept} size="lg" disabled={accepting}>
                {accepting ? 'Processing...' : 'Accept Estimate & Sign Up'}
              </Button>
              <Button variant="outline" size="lg" onClick={() => window.print()}>
                Print Estimate
              </Button>
            </div>
            <p className="text-xs text-gray-500 mt-4">
              By accepting, you'll create a customer account to manage your services
            </p>
          </div>
        </Card>

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

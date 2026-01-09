'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import AddressAutocomplete from '@/components/address/AddressAutocomplete';
import { Calendar } from 'lucide-react';

type Company = {
  id: string;
  name: string;
  slug: string;
  enabledFeatures: any;
  businessType: string[];
};

export default function PublicBookingPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    // Client info
    name: '',
    email: '',
    phone: '',

    // Service details
    serviceType: 'REGULAR',
    date: '',
    timeSlot: '',
    notes: '',

    // Insurance (if enabled)
    hasInsurance: false,
    insuranceProvider: '',
    helperBeesReferralId: '',

    // Address
    street: '',
    city: '',
    state: '',
    zip: '',
    googlePlaceId: '',
    lat: 0,
    lng: 0,
    formattedAddress: '',
    isVerified: false,

    // Property details
    propertyType: '',
    squareFootage: '',
    bedrooms: '',
    bathrooms: '',
  });

  useEffect(() => {
    fetchCompany();
  }, [slug]);

  const fetchCompany = async () => {
    try {
      const response = await fetch(`/api/public/company/${slug}`);
      const data = await response.json();

      if (data.success) {
        setCompany(data.data);
      } else {
        setError('Company not found');
      }
    } catch (err) {
      console.error('Failed to fetch company:', err);
      setError('Failed to load booking page');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value,
    });
  };

  const handleAddressSelect = (addressData: any) => {
    setFormData(prev => ({
      ...prev,
      street: addressData.street,
      city: addressData.city,
      state: addressData.state,
      zip: addressData.zip,
      googlePlaceId: addressData.googlePlaceId || '',
      lat: addressData.lat || 0,
      lng: addressData.lng || 0,
      formattedAddress: addressData.formattedAddress || '',
      isVerified: addressData.isVerified || false,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const response = await fetch(`/api/public/bookings/${slug}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(true);
      } else {
        setError(data.error || 'Failed to create booking');
      }
    } catch (err: any) {
      console.error('Booking error:', err);
      setError('An error occurred. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (error && !company) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="p-8 max-w-md">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Error</h1>
          <p className="text-gray-600">{error}</p>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="p-8 max-w-md text-center">
          <div className="mb-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Booking Request Received!</h1>
          <p className="text-gray-600 mb-6">
            Thank you for your booking request. {company?.name} will contact you shortly to confirm your appointment.
          </p>
          <Button onClick={() => window.location.reload()}>
            Book Another Service
          </Button>
        </Card>
      </div>
    );
  }

  const hasInsuranceBilling = company?.enabledFeatures?.insuranceBilling === true;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12">
      <div className="max-w-3xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Book a Cleaning Service
          </h1>
          <p className="text-xl text-gray-600">
            {company?.name}
          </p>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Contact Information */}
          <Card className="p-6 space-y-4">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Your Information</h2>

            <div>
              <Label htmlFor="name">Full Name *</Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                placeholder="John Smith"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  placeholder="john@example.com"
                />
              </div>

              <div>
                <Label htmlFor="phone">Phone *</Label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={handleChange}
                  required
                  placeholder="(555) 123-4567"
                />
              </div>
            </div>
          </Card>

          {/* Service Address */}
          <Card className="p-6 space-y-4">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Service Address</h2>

            <AddressAutocomplete
              onAddressSelect={handleAddressSelect}
              initialStreet={formData.street}
              initialCity={formData.city}
              initialState={formData.state}
              initialZip={formData.zip}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <Label htmlFor="propertyType">Property Type</Label>
                <select
                  id="propertyType"
                  name="propertyType"
                  value={formData.propertyType}
                  onChange={handleChange}
                  className="w-full border rounded-lg px-3 py-2 bg-white"
                >
                  <option value="">Select type...</option>
                  <option value="Single Family">Single Family</option>
                  <option value="Condo">Condo</option>
                  <option value="Apartment">Apartment</option>
                  <option value="Townhouse">Townhouse</option>
                </select>
              </div>

              <div>
                <Label htmlFor="squareFootage">Square Footage</Label>
                <Input
                  id="squareFootage"
                  name="squareFootage"
                  type="number"
                  value={formData.squareFootage}
                  onChange={handleChange}
                  placeholder="1500"
                />
              </div>

              <div>
                <Label htmlFor="bedrooms">Bedrooms</Label>
                <Input
                  id="bedrooms"
                  name="bedrooms"
                  type="number"
                  value={formData.bedrooms}
                  onChange={handleChange}
                  placeholder="3"
                />
              </div>

              <div>
                <Label htmlFor="bathrooms">Bathrooms</Label>
                <Input
                  id="bathrooms"
                  name="bathrooms"
                  type="number"
                  step="0.5"
                  value={formData.bathrooms}
                  onChange={handleChange}
                  placeholder="2"
                />
              </div>
            </div>
          </Card>

          {/* Service Details */}
          <Card className="p-6 space-y-4">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Service Details</h2>

            <div>
              <Label htmlFor="serviceType">Type of Service *</Label>
              <select
                id="serviceType"
                name="serviceType"
                value={formData.serviceType}
                onChange={handleChange}
                required
                className="w-full border rounded-lg px-3 py-2 bg-white"
              >
                <option value="REGULAR">Regular Cleaning</option>
                <option value="DEEP">Deep Cleaning</option>
                <option value="MOVE_IN_OUT">Move In / Move Out Cleaning</option>
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="date">Preferred Date *</Label>
                <Input
                  id="date"
                  name="date"
                  type="date"
                  value={formData.date}
                  onChange={handleChange}
                  required
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>

              <div>
                <Label htmlFor="timeSlot">Preferred Time *</Label>
                <select
                  id="timeSlot"
                  name="timeSlot"
                  value={formData.timeSlot}
                  onChange={handleChange}
                  required
                  className="w-full border rounded-lg px-3 py-2 bg-white"
                >
                  <option value="">Select a time...</option>
                  <option value="MORNING">Morning (8am - 10am)</option>
                  <option value="NOON">Noon (11am - 1pm)</option>
                  <option value="AFTERNOON">Afternoon/Early Evening (2pm - 4pm)</option>
                </select>
              </div>
            </div>

            <div>
              <Label htmlFor="notes">Special Instructions</Label>
              <Textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                placeholder="Any special requests or instructions..."
                rows={3}
              />
            </div>
          </Card>

          {/* Insurance (if enabled) */}
          {hasInsuranceBilling && (
            <Card className="p-6 space-y-4 bg-blue-50 border-blue-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">Insurance Coverage</h2>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    name="hasInsurance"
                    checked={formData.hasInsurance}
                    onChange={handleChange}
                    className="h-5 w-5 rounded"
                  />
                  <span className="font-medium">I have insurance coverage</span>
                </label>
              </div>

              {formData.hasInsurance && (
                <div className="space-y-4 pt-4 border-t border-blue-200">
                  <div>
                    <Label htmlFor="insuranceProvider">Insurance Provider</Label>
                    <Input
                      id="insuranceProvider"
                      name="insuranceProvider"
                      value={formData.insuranceProvider}
                      onChange={handleChange}
                      placeholder="Helper Bee's, Blue Cross, etc."
                    />
                  </div>

                  <div>
                    <Label htmlFor="helperBeesReferralId">Helper Bee's Referral ID (if applicable)</Label>
                    <Input
                      id="helperBeesReferralId"
                      name="helperBeesReferralId"
                      value={formData.helperBeesReferralId}
                      onChange={handleChange}
                      placeholder="HB123456"
                    />
                  </div>
                </div>
              )}
            </Card>
          )}

          {/* Submit */}
          <div className="flex gap-4">
            <Button
              type="submit"
              disabled={submitting}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-6 text-lg"
            >
              {submitting ? 'Submitting...' : 'Request Booking'}
            </Button>
          </div>

          <p className="text-center text-sm text-gray-500">
            By submitting this form, you agree to be contacted by {company?.name} regarding your booking request.
          </p>
        </form>
      </div>
    </div>
  );
}

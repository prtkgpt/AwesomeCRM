'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import AddressAutocomplete from '@/components/address/AddressAutocomplete';
import { hasInsuranceBilling } from '@/lib/features';

export default function EditClientPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const clientId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [companyHasInsurance, setCompanyHasInsurance] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    tags: '',
    notes: '',

    // Insurance
    hasInsurance: false,
    helperBeesReferralId: '',
    insuranceProvider: '',
    insurancePaymentAmount: '',
    standardCopayAmount: '',
    hasDiscountedCopay: false,
    copayDiscountAmount: '',
    copayNotes: '',

    // Primary Address
    addressId: '',
    street: '',
    city: '',
    state: '',
    zip: '',
    googlePlaceId: '',
    lat: 0,
    lng: 0,
    formattedAddress: '',
    isVerified: false,
    parkingInfo: '',
    gateCode: '',
    petInfo: '',
    preferences: '',

    // Property details
    propertyType: '',
    squareFootage: '',
    bedrooms: '',
    bathrooms: '',
    floors: '',
    yearBuilt: '',
  });

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated') {
      fetchClient();
    }
  }, [status, clientId, router]);

  // Fetch company settings to check if insurance billing is enabled
  useEffect(() => {
    const fetchCompanySettings = async () => {
      try {
        const response = await fetch('/api/company/settings', {
          cache: 'no-store', // Prevent caching
          headers: {
            'Cache-Control': 'no-cache',
          },
        });
        const data = await response.json();
        console.log('🔍 Company settings:', data.data);
        console.log('🔍 enabledFeatures:', data.data?.enabledFeatures);
        if (data.success && data.data) {
          const hasInsurance = hasInsuranceBilling(data.data.enabledFeatures);
          console.log('🔍 hasInsuranceBilling result:', hasInsurance);
          setCompanyHasInsurance(hasInsurance);
        }
      } catch (err) {
        console.error('Failed to fetch company settings:', err);
        // Default to false if fetch fails
        setCompanyHasInsurance(false);
      }
    };

    fetchCompanySettings();
  }, []);

  const fetchClient = async () => {
    try {
      const res = await fetch(`/api/clients/${clientId}`);
      const data = await res.json();

      if (data.success && data.data) {
        const client = data.data;
        const primaryAddress = client.addresses?.[0];

        setFormData({
          name: client.name || '',
          email: client.email || '',
          phone: client.phone || '',
          tags: client.tags?.join(', ') || '',
          notes: client.notes || '',

          hasInsurance: client.hasInsurance || false,
          helperBeesReferralId: client.helperBeesReferralId || '',
          insuranceProvider: client.insuranceProvider || '',
          insurancePaymentAmount: client.insurancePaymentAmount?.toString() || '',
          standardCopayAmount: client.standardCopayAmount?.toString() || '',
          hasDiscountedCopay: client.hasDiscountedCopay || false,
          copayDiscountAmount: client.copayDiscountAmount?.toString() || '',
          copayNotes: client.copayNotes || '',

          addressId: primaryAddress?.id || '',
          street: primaryAddress?.street || '',
          city: primaryAddress?.city || '',
          state: primaryAddress?.state || '',
          zip: primaryAddress?.zip || '',
          googlePlaceId: primaryAddress?.googlePlaceId || '',
          lat: primaryAddress?.lat || 0,
          lng: primaryAddress?.lng || 0,
          formattedAddress: primaryAddress?.formattedAddress || '',
          isVerified: primaryAddress?.isVerified || false,
          parkingInfo: primaryAddress?.parkingInfo || '',
          gateCode: primaryAddress?.gateCode || '',
          petInfo: primaryAddress?.petInfo || '',
          preferences: primaryAddress?.preferences || '',

          propertyType: primaryAddress?.propertyType || '',
          squareFootage: primaryAddress?.squareFootage?.toString() || '',
          bedrooms: primaryAddress?.bedrooms?.toString() || '',
          bathrooms: primaryAddress?.bathrooms?.toString() || '',
          floors: primaryAddress?.floors?.toString() || '',
          yearBuilt: primaryAddress?.yearBuilt?.toString() || '',
        });
      } else {
        setError('Failed to load client');
      }
    } catch (err) {
      setError('Failed to load client');
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
      const payload = {
        // Basic info
        name: formData.name,
        email: formData.email || undefined,
        phone: formData.phone || undefined,
        tags: formData.tags ? formData.tags.split(',').map((t) => t.trim()) : [],
        notes: formData.notes || undefined,

        // Insurance
        hasInsurance: formData.hasInsurance,
        helperBeesReferralId: formData.helperBeesReferralId || undefined,
        insuranceProvider: formData.insuranceProvider || undefined,
        insurancePaymentAmount: formData.insurancePaymentAmount
          ? parseFloat(formData.insurancePaymentAmount)
          : undefined,
        standardCopayAmount: formData.standardCopayAmount
          ? parseFloat(formData.standardCopayAmount)
          : undefined,
        hasDiscountedCopay: formData.hasDiscountedCopay,
        copayDiscountAmount: formData.copayDiscountAmount
          ? parseFloat(formData.copayDiscountAmount)
          : undefined,
        copayNotes: formData.copayNotes || undefined,

        // Address update
        addressId: formData.addressId,
        address: {
          street: formData.street,
          city: formData.city,
          state: formData.state,
          zip: formData.zip,
          googlePlaceId: formData.googlePlaceId || undefined,
          lat: formData.lat || undefined,
          lng: formData.lng || undefined,
          formattedAddress: formData.formattedAddress || undefined,
          isVerified: formData.isVerified,
          parkingInfo: formData.parkingInfo || undefined,
          gateCode: formData.gateCode || undefined,
          petInfo: formData.petInfo || undefined,
          preferences: formData.preferences || undefined,
          propertyType: formData.propertyType || undefined,
          squareFootage: formData.squareFootage
            ? parseInt(formData.squareFootage)
            : undefined,
          bedrooms: formData.bedrooms ? parseInt(formData.bedrooms) : undefined,
          bathrooms: formData.bathrooms
            ? parseFloat(formData.bathrooms)
            : undefined,
          floors: formData.floors ? parseInt(formData.floors) : undefined,
          yearBuilt: formData.yearBuilt ? parseInt(formData.yearBuilt) : undefined,
        },
      };

      const response = await fetch(`/api/clients/${clientId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.success) {
        router.push(`/clients/${clientId}`);
      } else {
        setError(data.error || 'Failed to update client');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="p-6 text-center">Loading...</div>;
  }

  return (
    <div className="p-4 max-w-4xl mx-auto space-y-4">
      <div className="flex items-center gap-3">
        <Link href={`/clients/${clientId}`}>
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">Edit Client</h1>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <Card className="p-4 space-y-4">
          <h2 className="font-semibold text-lg">Client Information</h2>

          <div>
            <Label htmlFor="name">Full Name *</Label>
            <Input
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
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
              />
            </div>
          </div>

          <div>
            <Label htmlFor="tags">Tags (comma separated)</Label>
            <Input
              id="tags"
              name="tags"
              value={formData.tags}
              onChange={handleChange}
            />
          </div>

          <div>
            <Label htmlFor="notes">General Notes</Label>
            <Textarea
              id="notes"
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows={3}
            />
          </div>
        </Card>

        {/* Insurance - Only show if company has insurance billing enabled */}
        {companyHasInsurance && (
        <Card className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-lg">Insurance Information</h2>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                name="hasInsurance"
                checked={formData.hasInsurance}
                onChange={handleChange}
                className="h-5 w-5"
              />
              <span className="font-medium">Has Insurance</span>
            </label>
          </div>

          {formData.hasInsurance && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="helperBeesReferralId">Helper Bee's Referral ID</Label>
                  <Input
                    id="helperBeesReferralId"
                    name="helperBeesReferralId"
                    value={formData.helperBeesReferralId}
                    onChange={handleChange}
                  />
                </div>
                <div>
                  <Label htmlFor="insuranceProvider">Insurance Provider</Label>
                  <Input
                    id="insuranceProvider"
                    name="insuranceProvider"
                    value={formData.insuranceProvider}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="insurancePaymentAmount">Insurance Payment Amount</Label>
                  <Input
                    id="insurancePaymentAmount"
                    name="insurancePaymentAmount"
                    type="number"
                    step="0.01"
                    value={formData.insurancePaymentAmount}
                    onChange={handleChange}
                  />
                </div>
                <div>
                  <Label htmlFor="standardCopayAmount">Standard Copay Amount</Label>
                  <Input
                    id="standardCopayAmount"
                    name="standardCopayAmount"
                    type="number"
                    step="0.01"
                    value={formData.standardCopayAmount}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="hasDiscountedCopay"
                    checked={formData.hasDiscountedCopay}
                    onChange={handleChange}
                    className="h-4 w-4"
                  />
                  <span>Apply Discounted Copay</span>
                </label>
              </div>

              {formData.hasDiscountedCopay && (
                <div>
                  <Label htmlFor="copayDiscountAmount">Copay Discount Amount</Label>
                  <Input
                    id="copayDiscountAmount"
                    name="copayDiscountAmount"
                    type="number"
                    step="0.01"
                    value={formData.copayDiscountAmount}
                    onChange={handleChange}
                  />
                </div>
              )}

              <div>
                <Label htmlFor="copayNotes">Copay Notes</Label>
                <Textarea
                  id="copayNotes"
                  name="copayNotes"
                  value={formData.copayNotes}
                  onChange={handleChange}
                  rows={2}
                />
              </div>
            </div>
          )}
        </Card>
        )}

        {/* Address */}
        <Card className="p-4 space-y-4">
          <h2 className="font-semibold text-lg">Primary Address</h2>

          <AddressAutocomplete onAddressSelect={handleAddressSelect} />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="street">Street Address *</Label>
              <Input
                id="street"
                name="street"
                value={formData.street}
                onChange={handleChange}
                required
              />
            </div>
            <div>
              <Label htmlFor="city">City *</Label>
              <Input
                id="city"
                name="city"
                value={formData.city}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="state">State *</Label>
              <Input
                id="state"
                name="state"
                value={formData.state}
                onChange={handleChange}
                required
              />
            </div>
            <div>
              <Label htmlFor="zip">ZIP Code *</Label>
              <Input
                id="zip"
                name="zip"
                value={formData.zip}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="parkingInfo">Parking Information</Label>
              <Input
                id="parkingInfo"
                name="parkingInfo"
                value={formData.parkingInfo}
                onChange={handleChange}
              />
            </div>
            <div>
              <Label htmlFor="gateCode">Gate Code</Label>
              <Input
                id="gateCode"
                name="gateCode"
                value={formData.gateCode}
                onChange={handleChange}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="petInfo">Pet Information</Label>
            <Input
              id="petInfo"
              name="petInfo"
              value={formData.petInfo}
              onChange={handleChange}
            />
          </div>

          <div>
            <Label htmlFor="preferences">Preferences</Label>
            <Textarea
              id="preferences"
              name="preferences"
              value={formData.preferences}
              onChange={handleChange}
              rows={2}
            />
          </div>
        </Card>

        {/* Property Details */}
        <Card className="p-4 space-y-4">
          <h2 className="font-semibold text-lg">Property Details</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="propertyType">Property Type</Label>
              <select
                id="propertyType"
                name="propertyType"
                value={formData.propertyType}
                onChange={handleChange}
                className="w-full px-3 py-2 border rounded"
              >
                <option value="">Select type</option>
                <option value="House">House</option>
                <option value="Apartment">Apartment</option>
                <option value="Condo">Condo</option>
                <option value="Townhouse">Townhouse</option>
                <option value="Office">Office</option>
                <option value="Other">Other</option>
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
              />
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="bedrooms">Bedrooms</Label>
              <Input
                id="bedrooms"
                name="bedrooms"
                type="number"
                value={formData.bedrooms}
                onChange={handleChange}
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
              />
            </div>
            <div>
              <Label htmlFor="floors">Floors</Label>
              <Input
                id="floors"
                name="floors"
                type="number"
                value={formData.floors}
                onChange={handleChange}
              />
            </div>
            <div>
              <Label htmlFor="yearBuilt">Year Built</Label>
              <Input
                id="yearBuilt"
                name="yearBuilt"
                type="number"
                value={formData.yearBuilt}
                onChange={handleChange}
              />
            </div>
          </div>
        </Card>

        <div className="flex gap-3 justify-end">
          <Link href={`/clients/${clientId}`}>
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </div>
  );
}

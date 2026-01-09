'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import AddressAutocomplete from '@/components/address/AddressAutocomplete';
import { hasInsuranceBilling } from '@/lib/features';

export default function NewClientPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [companyHasInsurance, setCompanyHasInsurance] = useState(false);

  const [formData, setFormData] = useState({
    // Basic info
    name: '',
    email: '',
    phone: '',
    tags: '',
    notes: '',

    // Insurance & Helper Bee's
    hasInsurance: false,
    helperBeesReferralId: '',
    insuranceProvider: '',
    insurancePaymentAmount: '',
    standardCopayAmount: '',
    hasDiscountedCopay: false,
    copayDiscountAmount: '',
    copayNotes: '',
    cleaningObservations: '',

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
    floors: '',
    yearBuilt: '',

    // Cleaner notes
    parkingInfo: '',
    gateCode: '',
    petInfo: '',
    preferences: '',
  });

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
    // Use functional setState to avoid stale closure issues
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
    setLoading(true);
    setError('');

    try {
      const payload = {
        // Basic info
        name: formData.name,
        email: formData.email || undefined,
        phone: formData.phone || undefined,
        tags: formData.tags ? formData.tags.split(',').map((t) => t.trim()) : [],
        notes: formData.notes || undefined,

        // Insurance & Helper Bee's
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
        // cleaningObservations: formData.cleaningObservations || undefined, // TODO: Add after migration

        // Address
        addresses: [
          {
            street: formData.street,
            city: formData.city,
            state: formData.state,
            zip: formData.zip,
            googlePlaceId: formData.googlePlaceId || undefined,
            lat: formData.lat || undefined,
            lng: formData.lng || undefined,
            formattedAddress: formData.formattedAddress || undefined,
            isVerified: formData.isVerified,
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
            parkingInfo: formData.parkingInfo || undefined,
            gateCode: formData.gateCode || undefined,
            petInfo: formData.petInfo || undefined,
            preferences: formData.preferences || undefined,
          },
        ],
      };

      const response = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.success) {
        router.push(`/clients/${data.data.id}`);
      } else {
        setError(data.error || 'Failed to create client');
        // Scroll to top to show error
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch (err: any) {
      console.error('Client creation error:', err);
      setError(err.message || 'An error occurred. Please try again.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 max-w-4xl mx-auto space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold">New Client</h1>
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
              placeholder="John Smith"
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

          <div>
            <Label htmlFor="tags">Tags (comma separated)</Label>
            <Input
              id="tags"
              name="tags"
              value={formData.tags}
              onChange={handleChange}
              placeholder="vip, weekly, elderly"
            />
          </div>

          <div>
            <Label htmlFor="notes">General Notes</Label>
            <Textarea
              id="notes"
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              placeholder="Any special instructions or notes..."
              rows={3}
            />
          </div>
        </Card>

        {/* Insurance & Helper Bee's - Only show if company has insurance billing enabled */}
        {companyHasInsurance && (
        <Card className={`p-6 space-y-4 ${formData.hasInsurance ? 'bg-blue-50 border-2 border-blue-500' : ''}`}>
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-xl">
              Insurance & Helper Bee's Information
            </h2>
            <label className="flex items-center gap-3 cursor-pointer bg-white p-3 rounded-lg border-2 border-gray-300 hover:border-blue-500 transition-colors">
              <input
                type="checkbox"
                name="hasInsurance"
                checked={formData.hasInsurance}
                onChange={handleChange}
                className="h-6 w-6 rounded"
              />
              <span className="text-base font-bold">Has Insurance Coverage</span>
            </label>
          </div>

          {!formData.hasInsurance && (
            <div className="p-4 bg-yellow-50 border border-yellow-300 rounded-lg">
              <p className="text-sm text-yellow-800">
                ⬆️ Check the box above if this client has insurance coverage to see additional fields
              </p>
            </div>
          )}

          {formData.hasInsurance && (
            <div className="space-y-4 pt-2 border-t">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="helperBeesReferralId">
                    Helper Bee's Referral ID
                  </Label>
                  <Input
                    id="helperBeesReferralId"
                    name="helperBeesReferralId"
                    value={formData.helperBeesReferralId}
                    onChange={handleChange}
                    placeholder="HB123456"
                  />
                </div>

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
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="insurancePaymentAmount">
                    Insurance Payment Amount
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                      $
                    </span>
                    <Input
                      id="insurancePaymentAmount"
                      name="insurancePaymentAmount"
                      type="number"
                      step="0.01"
                      value={formData.insurancePaymentAmount}
                      onChange={handleChange}
                      className="pl-7"
                      placeholder="125.00 or 175.00"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    $175 without copay, $125 with copay
                  </p>
                </div>

                <div>
                  <Label htmlFor="standardCopayAmount">Standard Copay Amount</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                      $
                    </span>
                    <Input
                      id="standardCopayAmount"
                      name="standardCopayAmount"
                      type="number"
                      step="0.01"
                      value={formData.standardCopayAmount}
                      onChange={handleChange}
                      className="pl-7"
                      placeholder="50.00"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Standard: $50, or $0 for no copay
                  </p>
                </div>
              </div>

              <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    name="hasDiscountedCopay"
                    checked={formData.hasDiscountedCopay}
                    onChange={handleChange}
                    className="h-4 w-4 rounded mt-0.5"
                  />
                  <div className="flex-1">
                    <span className="font-medium text-blue-900 dark:text-blue-100">
                      Apply Discounted Copay
                    </span>
                    <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                      For elderly clients who cannot afford standard copay
                    </p>
                  </div>
                </label>

                {formData.hasDiscountedCopay && (
                  <div className="mt-3">
                    <Label htmlFor="copayDiscountAmount">Discount Amount</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                        $
                      </span>
                      <Input
                        id="copayDiscountAmount"
                        name="copayDiscountAmount"
                        type="number"
                        step="0.01"
                        value={formData.copayDiscountAmount}
                        onChange={handleChange}
                        className="pl-7 bg-white dark:bg-gray-800"
                        placeholder="10.00"
                      />
                    </div>
                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                      Client will pay: $
                      {formData.standardCopayAmount && formData.copayDiscountAmount
                        ? (
                            parseFloat(formData.standardCopayAmount) -
                            parseFloat(formData.copayDiscountAmount)
                          ).toFixed(2)
                        : formData.standardCopayAmount || '0.00'}
                    </p>
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="copayNotes">Copay Notes</Label>
                <Textarea
                  id="copayNotes"
                  name="copayNotes"
                  value={formData.copayNotes}
                  onChange={handleChange}
                  placeholder="Notes about copay arrangements, discounts, etc."
                  rows={2}
                />
              </div>

              <div>
                <Label htmlFor="cleaningObservations">Cleaning Notes / Observations</Label>
                <Textarea
                  id="cleaningObservations"
                  name="cleaningObservations"
                  value={formData.cleaningObservations}
                  onChange={handleChange}
                  placeholder="Any special cleaning requirements, observations, or notes for insurance documentation..."
                  rows={3}
                />
              </div>
            </div>
          )}
        </Card>
        )}

        {/* Primary Address with Autocomplete */}
        <Card className="p-4 space-y-4">
          <h2 className="font-semibold text-lg">Primary Address</h2>

          <AddressAutocomplete
            onAddressSelect={handleAddressSelect}
            initialStreet={formData.street}
            initialCity={formData.city}
            initialState={formData.state}
            initialZip={formData.zip}
          />
        </Card>

        {/* Property Details */}
        <Card className="p-4 space-y-4">
          <h2 className="font-semibold text-lg">Property Details (Optional)</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="propertyType">Property Type</Label>
              <select
                id="propertyType"
                name="propertyType"
                value={formData.propertyType}
                onChange={handleChange}
                className="w-full border rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
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
                placeholder="2.5"
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
                placeholder="2"
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
                placeholder="1995"
              />
            </div>
          </div>
        </Card>

        {/* Cleaner Notes */}
        <Card className="p-4 space-y-4">
          <h2 className="font-semibold text-lg">Cleaner Notes</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="parkingInfo">Parking Information</Label>
              <Input
                id="parkingInfo"
                name="parkingInfo"
                value={formData.parkingInfo}
                onChange={handleChange}
                placeholder="Driveway on left side"
              />
            </div>

            <div>
              <Label htmlFor="gateCode">Gate Code</Label>
              <Input
                id="gateCode"
                name="gateCode"
                value={formData.gateCode}
                onChange={handleChange}
                placeholder="#1234"
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
              placeholder="Friendly dog, keep inside during cleaning"
            />
          </div>

          <div>
            <Label htmlFor="preferences">Client Preferences</Label>
            <Textarea
              id="preferences"
              name="preferences"
              value={formData.preferences}
              onChange={handleChange}
              placeholder="Remove shoes, use back door, etc."
              rows={2}
            />
          </div>
        </Card>

        <div className="flex gap-3">
          <Button type="submit" disabled={loading} className="flex-1">
            {loading ? 'Creating...' : 'Create Client'}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}

'use client';

import { useEffect, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { MapPin, CheckCircle, AlertCircle } from 'lucide-react';

interface AddressData {
  street: string;
  city: string;
  state: string;
  zip: string;
  googlePlaceId?: string;
  lat?: number;
  lng?: number;
  formattedAddress?: string;
  isVerified?: boolean;
}

interface AddressAutocompleteProps {
  onAddressSelect: (address: AddressData) => void;
  initialStreet?: string;
  initialCity?: string;
  initialState?: string;
  initialZip?: string;
}

export default function AddressAutocomplete({
  onAddressSelect,
  initialStreet = '',
  initialCity = '',
  initialState = '',
  initialZip = '',
}: AddressAutocompleteProps) {
  const [street, setStreet] = useState(initialStreet);
  const [city, setCity] = useState(initialCity);
  const [state, setState] = useState(initialState);
  const [zip, setZip] = useState(initialZip);
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);
  const [verificationError, setVerificationError] = useState('');

  const autocompleteRef = useRef<any>(null);
  const streetInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Load Google Maps script
    const loadGoogleMaps = async () => {
      if (typeof window === 'undefined') return;

      // Check if already loaded
      if ((window as any).google?.maps?.places) {
        initAutocomplete();
        return;
      }

      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
      if (!apiKey) {
        console.warn('Google Maps API key not configured');
        return;
      }

      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
      script.async = true;
      script.defer = true;
      script.onload = () => {
        initAutocomplete();
      };
      document.head.appendChild(script);
    };

    loadGoogleMaps();
  }, []);

  const initAutocomplete = () => {
    if (!streetInputRef.current) return;
    if (typeof window === 'undefined' || !(window as any).google) return;

    autocompleteRef.current = new (window as any).google.maps.places.Autocomplete(
      streetInputRef.current,
      {
        types: ['address'],
        componentRestrictions: { country: 'us' },
      }
    );

    autocompleteRef.current.addListener('place_changed', handlePlaceSelect);
  };

  const handlePlaceSelect = () => {
    const place = autocompleteRef.current?.getPlace();

    if (!place || !place.address_components) {
      return;
    }

    const getComponent = (types: string[], useShortName = false) => {
      const component = place.address_components?.find((c: any) =>
        types.some((type) => c.types.includes(type))
      );
      if (useShortName) {
        return component?.short_name || component?.long_name || '';
      }
      return component?.long_name || component?.short_name || '';
    };

    const streetNumber = getComponent(['street_number']);
    const route = getComponent(['route']);
    const selectedStreet = `${streetNumber} ${route}`.trim();
    const selectedCity = getComponent(['locality', 'sublocality']);
    const selectedState = getComponent(['administrative_area_level_1'], true); // Use short_name for state (e.g., "CA" instead of "California")
    const selectedZip = getComponent(['postal_code']);

    setStreet(selectedStreet);
    setCity(selectedCity);
    setState(selectedState);
    setZip(selectedZip);
    setVerified(true);
    setVerificationError('');

    // Call parent callback with verified address
    onAddressSelect({
      street: selectedStreet,
      city: selectedCity,
      state: selectedState,
      zip: selectedZip,
      googlePlaceId: place.place_id,
      lat: place.geometry?.location?.lat(),
      lng: place.geometry?.location?.lng(),
      formattedAddress: place.formatted_address,
      isVerified: true,
    });
  };

  const handleVerifyAddress = async () => {
    if (!street || !city || !state || !zip) {
      setVerificationError('Please fill in all address fields');
      return;
    }

    setVerifying(true);
    setVerificationError('');

    try {
      const response = await fetch('/api/address/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ street, city, state, zip }),
      });

      const data = await response.json();

      if (data.success && data.data) {
        // Update with verified address
        setStreet(data.data.street);
        setCity(data.data.city);
        setState(data.data.state);
        setZip(data.data.zip);
        setVerified(true);

        // Call parent callback
        onAddressSelect(data.data);
      } else {
        setVerificationError(data.error || 'Address could not be verified');
        setVerified(false);
      }
    } catch (error) {
      setVerificationError('Failed to verify address. Please try again.');
      setVerified(false);
    } finally {
      setVerifying(false);
    }
  };

  const handleManualChange = () => {
    setVerified(false);
    setVerificationError('');
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-2">
          Street Address *
        </label>
        <div className="relative">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            ref={streetInputRef}
            value={street}
            onChange={(e) => {
              setStreet(e.target.value);
              handleManualChange();
            }}
            onBlur={() => {
              onAddressSelect({ street, city, state, zip, isVerified: verified });
            }}
            className="pl-10"
            placeholder="Start typing address..."
            required
          />
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Start typing and select from suggestions for automatic verification
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="col-span-2 md:col-span-1">
          <label className="block text-sm font-medium mb-2">City *</label>
          <Input
            value={city}
            onChange={(e) => {
              setCity(e.target.value);
              handleManualChange();
            }}
            onBlur={() => {
              onAddressSelect({ street, city, state, zip, isVerified: verified });
            }}
            placeholder="City"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">State *</label>
          <Input
            value={state}
            onChange={(e) => {
              setState(e.target.value.toUpperCase());
              handleManualChange();
            }}
            onBlur={() => {
              onAddressSelect({ street, city, state, zip, isVerified: verified });
            }}
            placeholder="CA"
            maxLength={2}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">ZIP *</label>
          <Input
            value={zip}
            onChange={(e) => {
              setZip(e.target.value);
              handleManualChange();
            }}
            onBlur={() => {
              onAddressSelect({ street, city, state, zip, isVerified: verified });
            }}
            placeholder="94102"
            maxLength={10}
            required
          />
        </div>
      </div>

      <div className="flex items-start gap-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleVerifyAddress}
          disabled={verifying || !street || !city || !state || !zip}
        >
          {verifying ? 'Verifying...' : 'Verify Address'}
        </Button>

        {verified && (
          <div className="flex items-center gap-2 text-green-600 text-sm">
            <CheckCircle className="h-4 w-4" />
            <span>Address verified</span>
          </div>
        )}

        {verificationError && (
          <div className="flex items-center gap-2 text-red-600 text-sm">
            <AlertCircle className="h-4 w-4" />
            <span>{verificationError}</span>
          </div>
        )}
      </div>
    </div>
  );
}

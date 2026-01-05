/**
 * Google Maps and Places API integration
 * For address verification, geocoding, and autocomplete
 */

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

interface AddressComponent {
  long_name: string;
  short_name: string;
  types: string[];
}

interface PlaceDetails {
  formatted_address: string;
  place_id: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
  address_components: AddressComponent[];
}

export interface VerifiedAddress {
  street: string;
  city: string;
  state: string;
  zip: string;
  googlePlaceId: string;
  lat: number;
  lng: number;
  formattedAddress: string;
  isVerified: boolean;
}

/**
 * Verify an address using Google Places API
 */
export async function verifyAddress(
  street: string,
  city: string,
  state: string,
  zip: string
): Promise<{ success: boolean; data?: VerifiedAddress; error?: string }> {
  if (!GOOGLE_MAPS_API_KEY) {
    return {
      success: false,
      error: 'Google Maps API key not configured',
    };
  }

  try {
    const addressString = `${street}, ${city}, ${state} ${zip}`;

    // Use Geocoding API to verify and get details
    const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
      addressString
    )}&key=${GOOGLE_MAPS_API_KEY}`;

    const response = await fetch(geocodeUrl);
    const data = await response.json();

    if (data.status !== 'OK' || !data.results || data.results.length === 0) {
      return {
        success: false,
        error: 'Address could not be verified. Please check the address and try again.',
      };
    }

    const result = data.results[0];
    const components = result.address_components;

    // Extract address components
    const getComponent = (types: string[], useShortName = false) => {
      const component = components.find((c: AddressComponent) =>
        types.some((type) => c.types.includes(type))
      );
      if (useShortName) {
        return component?.short_name || component?.long_name || '';
      }
      return component?.long_name || component?.short_name || '';
    };

    const streetNumber = getComponent(['street_number']);
    const route = getComponent(['route']);
    const verifiedStreet = `${streetNumber} ${route}`.trim();
    const verifiedCity = getComponent(['locality', 'sublocality']);
    const verifiedState = getComponent(['administrative_area_level_1'], true); // Use short_name for state (e.g., "CA" instead of "California")
    const verifiedZip = getComponent(['postal_code']);

    return {
      success: true,
      data: {
        street: verifiedStreet || street,
        city: verifiedCity || city,
        state: verifiedState || state,
        zip: verifiedZip || zip,
        googlePlaceId: result.place_id,
        lat: result.geometry.location.lat,
        lng: result.geometry.location.lng,
        formattedAddress: result.formatted_address,
        isVerified: true,
      },
    };
  } catch (error) {
    console.error('Address verification error:', error);
    return {
      success: false,
      error: 'Failed to verify address. Please try again.',
    };
  }
}

/**
 * Get property details from a given address
 * Note: This is a simplified version. For real property data, you'd need
 * to integrate with services like Zillow API, Attom Data, or CoreLogic
 */
export async function getPropertyDetails(placeId: string): Promise<{
  success: boolean;
  data?: {
    propertyType?: string;
    bedrooms?: number;
    bathrooms?: number;
    squareFootage?: number;
    yearBuilt?: number;
  };
  error?: string;
}> {
  if (!GOOGLE_MAPS_API_KEY) {
    return {
      success: false,
      error: 'Google Maps API key not configured',
    };
  }

  try {
    // Get place details from Google Places API
    const placeDetailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&key=${GOOGLE_MAPS_API_KEY}`;

    const response = await fetch(placeDetailsUrl);
    const data = await response.json();

    if (data.status !== 'OK') {
      return {
        success: false,
        error: 'Could not fetch property details',
      };
    }

    // Google Places doesn't provide detailed property information
    // This would require integration with real estate data providers
    // For now, we return basic info and allow manual entry

    return {
      success: true,
      data: {
        // These would come from a real estate API in production
        // For now, they can be manually entered
      },
    };
  } catch (error) {
    console.error('Property details error:', error);
    return {
      success: false,
      error: 'Failed to fetch property details',
    };
  }
}

/**
 * Client-side: Load Google Maps script
 * Use this in components that need Google Maps functionality
 */
export function loadGoogleMapsScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('Window is not defined'));
      return;
    }

    // Check if already loaded
    if ((window as any).google && (window as any).google.maps) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Google Maps script'));
    document.head.appendChild(script);
  });
}

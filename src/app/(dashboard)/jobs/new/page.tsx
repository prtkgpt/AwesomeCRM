'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Plus, Minus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import type { ClientWithAddresses } from '@/types';
import { createPSTDate } from '@/lib/timezone';

// Pricing configuration
const HOURLY_RATE = 50.00;

const SERVICE_TYPES = [
  { value: 'STANDARD', label: 'Standard Clean', multiplier: 1.00 },
  { value: 'DEEP', label: 'Deep Clean', multiplier: 1.20 },
  { value: 'MOVE_OUT', label: 'Move Out Clean', multiplier: 1.20 },
];

const SERVICE_AREAS = [
  { id: 'fullBathroom', label: 'Full Bathroom', minutes: 40, icon: '🛁' },
  { id: 'halfBathroom', label: 'Half Bathroom', minutes: 20, icon: '🚽' },
  { id: 'bedroom', label: 'Bedroom', minutes: 30, icon: '🛏️' },
  { id: 'office', label: 'Office', minutes: 20, icon: '💼' },
  { id: 'kitchen', label: 'Kitchen', minutes: 45, icon: '🍳' },
  { id: 'livingArea', label: 'Living Area', minutes: 45, icon: '🛋️' },
];

const ADDONS = [
  { id: 'oven', label: 'Oven Cleaning', minutes: 45, icon: '🔥' },
  { id: 'fridge', label: 'Fridge Cleaning', minutes: 30, icon: '🧊' },
  { id: 'lightFixtures', label: 'Light Fixtures', minutes: 30, icon: '💡' },
  { id: 'cabinets', label: 'Inside Cabinets', minutes: 30, icon: '🗄️' },
  { id: 'baseboards', label: 'Baseboards', minutes: 60, icon: '📏' },
  { id: 'interiorWindows', label: 'Interior Windows', minutes: 10, icon: '🪟' },
  { id: 'stairs', label: 'Stairs', minutes: 30, icon: '🪜' },
  { id: 'garage2Car', label: 'Garage - 2 Car (Reg)', minutes: 60, icon: '🚗' },
  { id: 'pets', label: 'Pets', minutes: 30, icon: '🐾' },
  { id: 'greenCleaning', label: 'Green Cleaning', minutes: 0, icon: '🌿' },
  { id: 'laundryFolding', label: 'Laundry & Folding', minutes: 45, icon: '👕' },
  { id: 'dishes', label: 'Dishes', minutes: 20, icon: '🍽️' },
  { id: 'insideDishwasher', label: 'Inside Dishwasher', minutes: 30, icon: '🔵' },
  { id: 'wetWipeWindowBlinds', label: 'Wet Wipe Window Blinds', minutes: 30, icon: '🪟' },
];

export default function NewJobPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedClientId = searchParams.get('clientId');

  const [clients, setClients] = useState<ClientWithAddresses[]>([]);
  const [selectedClient, setSelectedClient] = useState<ClientWithAddresses | null>(null);
  const [cleaners, setCleaners] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [useDetailedPricing, setUseDetailedPricing] = useState(false);

  // Time validation state
  const [timeWarning, setTimeWarning] = useState('');
  const [showTimeWarning, setShowTimeWarning] = useState(false);
  const [overrideTimeValidation, setOverrideTimeValidation] = useState(false);

  // Booking adjustments
  const [adjustPrice, setAdjustPrice] = useState(false);
  const [adjustTime, setAdjustTime] = useState(false);
  const [manualPrice, setManualPrice] = useState('');
  const [manualDuration, setManualDuration] = useState('');

  // Service areas (count of each)
  const [serviceAreas, setServiceAreas] = useState<Record<string, number>>({});

  // Add-ons (selected or not)
  const [addons, setAddons] = useState<Record<string, boolean>>({});

  // Carpet shampooing (special add-on with pricing)
  const [carpetShampooing, setCarpetShampooing] = useState({
    bedrooms: 0,
    staircases: 0,
    livingRooms: 0,
  });

  const [formData, setFormData] = useState({
    clientId: preselectedClientId || '',
    addressId: '',
    scheduledDate: '',
    scheduledTime: '',
    duration: '120',
    serviceType: 'STANDARD',
    price: '80',
    notes: '',
    assignedTo: '',
    isRecurring: false,
    recurrenceFrequency: 'NONE',
    recurrenceEndDate: '',
    // Insurance fields
    hasInsuranceCoverage: false,
    insuranceAmount: '0',
    copayAmount: '0',
    copayDiscountApplied: '0',
    finalCopayAmount: '0',
  });

  // Referral credits state
  const [referralCreditsAvailable, setReferralCreditsAvailable] = useState(0);
  const [applyCredits, setApplyCredits] = useState(false);

  useEffect(() => {
    fetchClients();
    fetchCleaners();
  }, []);

  // Pre-fill form when duplicating a job
  useEffect(() => {
    const isDuplicate = searchParams.get('duplicate');
    if (isDuplicate === 'true') {
      const clientId = searchParams.get('clientId');
      const addressId = searchParams.get('addressId');
      const serviceType = searchParams.get('serviceType');
      const duration = searchParams.get('duration');
      const price = searchParams.get('price');
      const notes = searchParams.get('notes');
      const internalNotes = searchParams.get('internalNotes');
      const assignedTo = searchParams.get('assignedTo');
      const hasInsuranceCoverage = searchParams.get('hasInsuranceCoverage');
      const insuranceAmount = searchParams.get('insuranceAmount');
      const copayAmount = searchParams.get('copayAmount');

      setFormData(prev => ({
        ...prev,
        clientId: clientId || prev.clientId,
        addressId: addressId || '',
        serviceType: serviceType || prev.serviceType,
        duration: duration || prev.duration,
        price: price || prev.price,
        notes: notes || '',
        assignedTo: assignedTo || '',
        hasInsuranceCoverage: hasInsuranceCoverage === 'true',
        insuranceAmount: insuranceAmount || '0',
        copayAmount: copayAmount || '0',
        copayDiscountApplied: '0',
        finalCopayAmount: copayAmount || '0',
      }));

      // If manual price is provided, enable price adjustment
      if (price) {
        setAdjustPrice(true);
        setManualPrice(price);
      }

      // If manual duration is provided, enable time adjustment
      if (duration) {
        setAdjustTime(true);
        setManualDuration(duration);
      }
    }
  }, [searchParams]);

  const fetchCleaners = async () => {
    try {
      const response = await fetch('/api/team/members');
      const data = await response.json();

      if (data.success) {
        // Filter only active cleaners
        const activeCleaners = data.data.filter(
          (member: any) => member.isActive && member.user.role === 'CLEANER'
        );
        setCleaners(activeCleaners);
      }
    } catch (error) {
      console.error('Failed to fetch cleaners:', error);
    }
  };

  // Calculate pricing based on service areas and addons
  const calculateDetailedPrice = () => {
    const selectedServiceType = SERVICE_TYPES.find(st => st.value === formData.serviceType);
    if (!selectedServiceType) return { total: 0, breakdown: null };

    let totalMinutes = 0;

    // Add service area minutes
    Object.entries(serviceAreas).forEach(([areaId, count]) => {
      const area = SERVICE_AREAS.find(a => a.id === areaId);
      if (area && count > 0) {
        totalMinutes += area.minutes * count;
      }
    });

    // Add addon minutes
    Object.entries(addons).forEach(([addonId, selected]) => {
      if (selected) {
        const addon = ADDONS.find(a => a.id === addonId);
        if (addon) {
          totalMinutes += addon.minutes;
        }
      }
    });

    // Add carpet shampooing minutes
    // Pricing: $50/bedroom, $25/staircase, $60/living room
    // At $50/hr: bedroom=60min, staircase=30min, livingRoom=72min
    totalMinutes += carpetShampooing.bedrooms * 60;
    totalMinutes += carpetShampooing.staircases * 30;
    totalMinutes += carpetShampooing.livingRooms * 72;

    // Convert to hours
    const totalHours = totalMinutes / 60;

    // Calculate base price
    const basePrice = totalHours * HOURLY_RATE;

    // Apply service type multiplier
    const finalPrice = basePrice * selectedServiceType.multiplier;

    return {
      total: finalPrice,
      breakdown: {
        totalMinutes,
        totalHours: totalHours.toFixed(2),
        basePrice: basePrice.toFixed(2),
        multiplier: selectedServiceType.multiplier,
        serviceType: selectedServiceType.label,
      }
    };
  };

  const { total: calculatedPrice, breakdown } = useDetailedPricing ? calculateDetailedPrice() : { total: 0, breakdown: null };

  // Auto-update price and duration when using detailed pricing (unless manually adjusted)
  useEffect(() => {
    if (useDetailedPricing && breakdown) {
      const updates: any = {};

      // Only update price if not manually adjusted
      if (!adjustPrice) {
        updates.price = calculatedPrice.toFixed(2);
      }

      // Only update duration if not manually adjusted
      if (!adjustTime) {
        updates.duration = breakdown.totalMinutes.toString();
      }

      if (Object.keys(updates).length > 0) {
        setFormData(prev => ({
          ...prev,
          ...updates,
        }));
      }
    }
  }, [calculatedPrice, breakdown, useDetailedPricing, adjustPrice, adjustTime]);

  useEffect(() => {
    if (formData.clientId) {
      const client = clients.find((c) => c.id === formData.clientId);
      setSelectedClient(client || null);

      // Fetch client's referral credits
      setReferralCreditsAvailable((client as any)?.referralCreditsBalance || 0);

      // Auto-populate address
      if (client && client.addresses.length > 0) {
        const updates: any = {
          addressId: client.addresses[0].id,
        };

        // Auto-populate insurance fields if client has insurance
        if ((client as any).hasInsurance) {
          const insuranceAmount = (client as any).insurancePaymentAmount || 0;
          const copayAmount = (client as any).standardCopayAmount || 0;
          const copayDiscount = (client as any).hasDiscountedCopay
            ? ((client as any).copayDiscountAmount || 0)
            : 0;
          const finalCopay = copayAmount - copayDiscount;
          const totalPrice = insuranceAmount + finalCopay;

          updates.hasInsuranceCoverage = true;
          updates.insuranceAmount = String(insuranceAmount);
          updates.copayAmount = String(copayAmount);
          updates.copayDiscountApplied = String(copayDiscount);
          updates.finalCopayAmount = String(finalCopay);
          updates.price = String(totalPrice);
        } else {
          updates.hasInsuranceCoverage = false;
          updates.insuranceAmount = '0';
          updates.copayAmount = '0';
          updates.copayDiscountApplied = '0';
          updates.finalCopayAmount = '0';
        }

        setFormData((prev) => ({
          ...prev,
          ...updates,
        }));
      }
    } else {
      setSelectedClient(null);
      setReferralCreditsAvailable(0);
      setApplyCredits(false);
    }
  }, [formData.clientId, clients]);

  const fetchClients = async () => {
    try {
      const response = await fetch('/api/clients');
      const data = await response.json();

      if (data.success) {
        setClients(data.data);
        if (preselectedClientId) {
          setFormData((prev) => ({ ...prev, clientId: preselectedClientId }));
        }
      }
    } catch (error) {
      console.error('Failed to fetch clients:', error);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value,
    });
  };

  const handleServiceAreaChange = (areaId: string, delta: number) => {
    setServiceAreas(prev => ({
      ...prev,
      [areaId]: Math.max(0, (prev[areaId] || 0) + delta)
    }));
  };

  const handleAddonToggle = (addonId: string) => {
    setAddons(prev => ({
      ...prev,
      [addonId]: !prev[addonId]
    }));
  };

  // Validate time is within PST business hours
  const validateScheduleTime = (): { isValid: boolean; warning: string } => {
    if (!formData.scheduledTime || !formData.duration) {
      return { isValid: true, warning: '' };
    }

    // Parse the time (format: HH:MM)
    const [hours, minutes] = formData.scheduledTime.split(':').map(Number);
    const startTimeMinutes = hours * 60 + minutes;

    // PST business hours: 8am (480 min) to 5pm (1020 min)
    const MIN_START_TIME = 8 * 60; // 8am in minutes
    const MAX_START_TIME = 17 * 60; // 5pm in minutes
    const MAX_END_TIME = 20 * 60; // 8pm in minutes

    // Calculate end time
    const endTimeMinutes = startTimeMinutes + parseInt(formData.duration);

    // Check start time
    if (startTimeMinutes < MIN_START_TIME) {
      return {
        isValid: false,
        warning: `⚠️ Start time is before 8:00 AM PST. Recommended start time is between 8:00 AM and 5:00 PM PST.`
      };
    }

    if (startTimeMinutes > MAX_START_TIME) {
      return {
        isValid: false,
        warning: `⚠️ Start time is after 5:00 PM PST. Recommended start time is between 8:00 AM and 5:00 PM PST.`
      };
    }

    // Check end time
    if (endTimeMinutes > MAX_END_TIME) {
      const endHours = Math.floor(endTimeMinutes / 60);
      const endMins = endTimeMinutes % 60;
      const endTimeStr = `${endHours % 12 || 12}:${endMins.toString().padStart(2, '0')} ${endHours >= 12 ? 'PM' : 'AM'}`;

      return {
        isValid: false,
        warning: `⚠️ This job will end at ${endTimeStr} PST, which is after 8:00 PM PST. Please adjust the start time or duration.`
      };
    }

    return { isValid: true, warning: '' };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validate required fields
    const missingFields = [];
    if (!formData.clientId) missingFields.push('Client');
    if (!formData.addressId) missingFields.push('Address');
    if (!formData.scheduledDate) missingFields.push('Date');
    if (!formData.scheduledTime) missingFields.push('Time');

    if (missingFields.length > 0) {
      setError(`❌ Missing Required Fields: ${missingFields.join(', ')}. Scroll up and fill them in, then try again.`);
      setLoading(false);
      // Scroll to top to show error message
      window.scrollTo({ top: 0, behavior: 'smooth' });

      // Also log to console for debugging
      console.error('Form validation failed. Missing fields:', missingFields);
      console.error('Current form data:', formData);
      return;
    }

    // Validate schedule time (PST business hours)
    if (!overrideTimeValidation) {
      const timeValidation = validateScheduleTime();
      if (!timeValidation.isValid) {
        setTimeWarning(timeValidation.warning);
        setShowTimeWarning(true);
        setLoading(false);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
    }

    try {
      // Convert date/time to PST timezone
      const scheduledDateISO = createPSTDate(formData.scheduledDate, formData.scheduledTime);

      const payload = {
        clientId: formData.clientId,
        addressId: formData.addressId,
        scheduledDate: scheduledDateISO,
        duration: parseInt(formData.duration),
        serviceType: formData.serviceType,
        price: parseFloat(formData.price),
        notes: formData.notes || undefined,
        assignedTo: formData.assignedTo || undefined,
        isRecurring: formData.isRecurring,
        recurrenceFrequency: formData.isRecurring
          ? formData.recurrenceFrequency
          : 'NONE',
        recurrenceEndDate: formData.isRecurring && formData.recurrenceEndDate
          ? createPSTDate(formData.recurrenceEndDate, '23:59')
          : undefined,
        // Insurance payment fields
        hasInsuranceCoverage: formData.hasInsuranceCoverage,
        insuranceAmount: parseFloat(formData.insuranceAmount),
        copayAmount: parseFloat(formData.copayAmount),
        copayDiscountApplied: parseFloat(formData.copayDiscountApplied),
        finalCopayAmount: parseFloat(formData.finalCopayAmount),
        // Referral credits application
        applyCredits: applyCredits && referralCreditsAvailable > 0,
      };

      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.success) {
        router.push('/jobs');
      } else {
        setError(data.error || 'Failed to create job');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-3xl mx-auto space-y-6 md:space-y-8">
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">New Job</h1>
          <p className="text-sm md:text-base text-gray-600 dark:text-gray-400 mt-1">
            Create a new cleaning job
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border-2 border-red-400 text-red-800 p-4 rounded-lg text-sm font-semibold shadow-md flex items-start gap-3">
          <span className="text-2xl">⚠️</span>
          <div className="flex-1">{error}</div>
        </div>
      )}

      {showTimeWarning && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-400 dark:border-amber-600 p-6 rounded-xl shadow-lg space-y-4">
          <div className="flex items-start gap-3">
            <span className="text-3xl">⏰</span>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-amber-900 dark:text-amber-100 mb-2">
                Schedule Time Warning
              </h3>
              <p className="text-sm text-amber-800 dark:text-amber-200 mb-4">
                {timeWarning}
              </p>
              <div className="bg-amber-100 dark:bg-amber-900/40 border border-amber-300 dark:border-amber-700 rounded-lg p-3 mb-4">
                <p className="text-xs text-amber-900 dark:text-amber-100 font-semibold">
                  <strong>PST Business Hours:</strong>
                </p>
                <ul className="text-xs text-amber-800 dark:text-amber-200 mt-1 ml-4 list-disc">
                  <li>Start time: 8:00 AM - 5:00 PM PST</li>
                  <li>End time: No later than 8:00 PM PST</li>
                </ul>
              </div>
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowTimeWarning(false);
                    setTimeWarning('');
                  }}
                  className="flex-1"
                >
                  Cancel & Edit Time
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    setOverrideTimeValidation(true);
                    setShowTimeWarning(false);
                    setTimeWarning('');
                    // Re-trigger form submission
                    setTimeout(() => {
                      const form = document.querySelector('form');
                      if (form) {
                        const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
                        form.dispatchEvent(submitEvent);
                      }
                    }, 100);
                  }}
                  className="flex-1 bg-amber-600 hover:bg-amber-700 text-white"
                >
                  Override & Continue
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6 md:space-y-8">
        <Card className="p-6 md:p-8 space-y-6">
          <h2 className="font-bold text-xl md:text-2xl text-gray-900 dark:text-gray-100">Client & Location</h2>

          <div>
            <Label htmlFor="clientId">Client *</Label>
            <Select
              id="clientId"
              name="clientId"
              value={formData.clientId}
              onChange={handleChange}
              required
            >
              <option value="">Select a client...</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </Select>
            <p className="text-xs text-gray-500 mt-1">
              Don't see the client?{' '}
              <button
                type="button"
                onClick={() => router.push('/clients/new')}
                className="text-blue-600 hover:underline"
              >
                Add a new client
              </button>
            </p>
          </div>

          {selectedClient && selectedClient.addresses.length > 0 && (
            <div>
              <Label htmlFor="addressId">Address *</Label>
              <Select
                id="addressId"
                name="addressId"
                value={formData.addressId}
                onChange={handleChange}
                required
              >
                <option value="">Select an address...</option>
                {selectedClient.addresses.map((address) => (
                  <option key={address.id} value={address.id}>
                    {address.street}, {address.city}
                  </option>
                ))}
              </Select>
            </div>
          )}
        </Card>

        <Card className="p-6 md:p-8 space-y-6">
          <div>
            <h2 className="font-bold text-xl md:text-2xl text-gray-900 dark:text-gray-100">Schedule</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
              ⏰ All times are in <strong>Pacific Time (PST/PDT)</strong>
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="scheduledDate">Date *</Label>
              <Input
                id="scheduledDate"
                name="scheduledDate"
                type="date"
                value={formData.scheduledDate}
                onChange={handleChange}
                required
              />
            </div>

            <div>
              <Label htmlFor="scheduledTime">Time *</Label>
              <Input
                id="scheduledTime"
                name="scheduledTime"
                type="time"
                value={formData.scheduledTime}
                onChange={handleChange}
                required
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Recommended: 8:00 AM - 5:00 PM PST
              </p>
            </div>
          </div>

          {formData.scheduledTime && formData.duration && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-3">
              <p className="text-xs text-blue-800 dark:text-blue-200">
                <strong>Estimated completion:</strong>{' '}
                {(() => {
                  const [hours, minutes] = formData.scheduledTime.split(':').map(Number);
                  const startMinutes = hours * 60 + minutes;
                  const endMinutes = startMinutes + parseInt(formData.duration);
                  const endHours = Math.floor(endMinutes / 60);
                  const endMins = endMinutes % 60;
                  return `${endHours % 12 || 12}:${endMins.toString().padStart(2, '0')} ${endHours >= 12 ? 'PM' : 'AM'} PST`;
                })()}
                {(() => {
                  const [hours, minutes] = formData.scheduledTime.split(':').map(Number);
                  const startMinutes = hours * 60 + minutes;
                  const endMinutes = startMinutes + parseInt(formData.duration);
                  return endMinutes > 20 * 60 ? ' ⚠️ (After 8:00 PM)' : '';
                })()}
              </p>
            </div>
          )}
        </Card>

        <Card className="p-6 md:p-8 space-y-6">
          <h2 className="font-bold text-xl md:text-2xl text-gray-900 dark:text-gray-100">Service Details</h2>

          <div>
            <Label htmlFor="serviceType">Service Type *</Label>
            <Select
              id="serviceType"
              name="serviceType"
              value={formData.serviceType}
              onChange={handleChange}
              required
            >
              {SERVICE_TYPES.map(type => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </Select>
          </div>

          <div>
            <Label htmlFor="assignedTo">Assign to Cleaner</Label>
            <Select
              id="assignedTo"
              name="assignedTo"
              value={formData.assignedTo}
              onChange={handleChange}
            >
              <option value="">Not Assigned</option>
              {cleaners.map((cleaner) => (
                <option key={cleaner.id} value={cleaner.id}>
                  {cleaner.user.name || cleaner.user.email}
                </option>
              ))}
            </Select>
            <p className="text-xs text-gray-500 mt-1">
              {cleaners.length === 0 ? (
                <>
                  No cleaners available.{' '}
                  <button
                    type="button"
                    onClick={() => router.push('/team')}
                    className="text-blue-600 hover:underline"
                  >
                    Add team members
                  </button>
                </>
              ) : (
                'Optional: Assign this job to a specific cleaner'
              )}
            </p>
          </div>

          {/* Toggle for detailed pricing */}
          <div className="pt-4 border-t">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="useDetailedPricing"
                checked={useDetailedPricing}
                onChange={(e) => setUseDetailedPricing(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="useDetailedPricing" className="cursor-pointer">
                Use detailed pricing calculator
              </Label>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Calculate price based on service areas and add-ons
            </p>
          </div>

          {/* Detailed Pricing Sections */}
          {useDetailedPricing && (
            <>
              <div className="space-y-3 pt-4 border-t">
                <h3 className="font-medium text-sm">Service Areas</h3>
                <p className="text-xs text-gray-600">Select the areas to be cleaned</p>
                <div className="grid grid-cols-1 gap-2">
                  {SERVICE_AREAS.map(area => (
                    <div key={area.id} className="flex items-center justify-between p-2 border rounded-md">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{area.icon}</span>
                        <div>
                          <p className="text-sm font-medium">{area.label}</p>
                          <p className="text-xs text-gray-500">{area.minutes} min each</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleServiceAreaChange(area.id, -1)}
                          disabled={!serviceAreas[area.id]}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <span className="w-8 text-center font-medium">
                          {serviceAreas[area.id] || 0}
                        </span>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleServiceAreaChange(area.id, 1)}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-3 pt-4 border-t">
                <h3 className="font-medium text-sm">Add-ons</h3>
                <p className="text-xs text-gray-600">Select additional services</p>
                <div className="grid grid-cols-1 gap-2">
                  {ADDONS.map(addon => (
                    <div key={addon.id} className="flex items-center gap-2 p-2 border rounded-md">
                      <input
                        type="checkbox"
                        id={addon.id}
                        checked={addons[addon.id] || false}
                        onChange={() => handleAddonToggle(addon.id)}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                      <label htmlFor={addon.id} className="flex-1 cursor-pointer flex items-center gap-2">
                        <span className="text-xl">{addon.icon}</span>
                        <div>
                          <p className="text-sm font-medium">{addon.label}</p>
                          <p className="text-xs text-gray-500">+{addon.minutes} min</p>
                        </div>
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-3 pt-4 border-t">
                <h3 className="font-medium text-sm flex items-center gap-2">
                  <span className="text-xl">🧹</span>
                  Carpet Shampooing
                </h3>
                <p className="text-xs text-gray-600">$50/bedroom, $25/staircase, $60/living room</p>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-2 border rounded-md">
                    <div>
                      <p className="text-sm font-medium">Bedrooms</p>
                      <p className="text-xs text-gray-500">$50 each</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setCarpetShampooing(prev => ({ ...prev, bedrooms: Math.max(0, prev.bedrooms - 1) }))}
                        disabled={carpetShampooing.bedrooms === 0}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <span className="w-8 text-center font-medium">{carpetShampooing.bedrooms}</span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setCarpetShampooing(prev => ({ ...prev, bedrooms: prev.bedrooms + 1 }))}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-2 border rounded-md">
                    <div>
                      <p className="text-sm font-medium">Staircases</p>
                      <p className="text-xs text-gray-500">$25 each</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setCarpetShampooing(prev => ({ ...prev, staircases: Math.max(0, prev.staircases - 1) }))}
                        disabled={carpetShampooing.staircases === 0}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <span className="w-8 text-center font-medium">{carpetShampooing.staircases}</span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setCarpetShampooing(prev => ({ ...prev, staircases: prev.staircases + 1 }))}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-2 border rounded-md">
                    <div>
                      <p className="text-sm font-medium">Living Rooms</p>
                      <p className="text-xs text-gray-500">$60 each</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setCarpetShampooing(prev => ({ ...prev, livingRooms: Math.max(0, prev.livingRooms - 1) }))}
                        disabled={carpetShampooing.livingRooms === 0}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <span className="w-8 text-center font-medium">{carpetShampooing.livingRooms}</span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setCarpetShampooing(prev => ({ ...prev, livingRooms: prev.livingRooms + 1 }))}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {(carpetShampooing.bedrooms > 0 || carpetShampooing.staircases > 0 || carpetShampooing.livingRooms > 0) && (
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-2">
                      <p className="text-xs font-medium text-blue-900 dark:text-blue-100">Carpet Shampooing Total:</p>
                      <p className="text-base font-bold text-blue-700 dark:text-blue-400">
                        ${(carpetShampooing.bedrooms * 50 + carpetShampooing.staircases * 25 + carpetShampooing.livingRooms * 60).toFixed(2)}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Price Breakdown */}
              {breakdown && breakdown.totalMinutes > 0 && (
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mt-4">
                  <h3 className="font-semibold text-green-900 dark:text-green-100 mb-2">
                    Price Breakdown
                  </h3>
                  <div className="space-y-1 text-sm text-green-800 dark:text-green-200">
                    <p>Total time: {breakdown.totalHours} hours ({breakdown.totalMinutes} minutes)</p>
                    <p>Base price: ${breakdown.basePrice} (${HOURLY_RATE}/hr)</p>
                    <p>Service type: {breakdown.serviceType} (×{breakdown.multiplier})</p>
                    <p className="pt-2 border-t border-green-300 font-semibold text-base">
                      Final price: ${calculatedPrice.toFixed(2)}
                    </p>
                  </div>
                </div>
              )}

              {/* Booking Adjustments */}
              <div className="space-y-4 pt-4 border-t">
                <h3 className="font-semibold text-base">Booking Adjustments</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Override calculated values if needed
                </p>

                <div className="space-y-3">
                  {/* Adjust Price */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="adjustPrice"
                        checked={adjustPrice}
                        onChange={(e) => {
                          setAdjustPrice(e.target.checked);
                          if (!e.target.checked) {
                            // Reset to calculated price when unchecked
                            setManualPrice('');
                            if (breakdown) {
                              setFormData(prev => ({ ...prev, price: calculatedPrice.toFixed(2) }));
                            }
                          }
                        }}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                      <Label htmlFor="adjustPrice" className="cursor-pointer font-medium">
                        Do you want to adjust price?
                      </Label>
                    </div>
                    {adjustPrice && (
                      <div className="pl-6">
                        <Label htmlFor="manualPrice" className="text-sm">Custom Price ($)</Label>
                        <Input
                          id="manualPrice"
                          type="number"
                          value={adjustPrice ? formData.price : manualPrice}
                          onChange={(e) => {
                            setManualPrice(e.target.value);
                            setFormData(prev => ({ ...prev, price: e.target.value }));
                          }}
                          placeholder="Enter custom price"
                          min="0"
                          step="0.01"
                          className="mt-1"
                        />
                      </div>
                    )}
                  </div>

                  {/* Adjust Time */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="adjustTime"
                        checked={adjustTime}
                        onChange={(e) => {
                          setAdjustTime(e.target.checked);
                          if (!e.target.checked) {
                            // Reset to calculated duration when unchecked
                            setManualDuration('');
                            if (breakdown) {
                              setFormData(prev => ({ ...prev, duration: breakdown.totalMinutes.toString() }));
                            }
                          }
                        }}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                      <Label htmlFor="adjustTime" className="cursor-pointer font-medium">
                        Do you want to adjust time?
                      </Label>
                    </div>
                    {adjustTime && (
                      <div className="pl-6">
                        <Label htmlFor="manualDuration" className="text-sm">Custom Duration (minutes)</Label>
                        <Input
                          id="manualDuration"
                          type="number"
                          value={adjustTime ? formData.duration : manualDuration}
                          onChange={(e) => {
                            setManualDuration(e.target.value);
                            setFormData(prev => ({ ...prev, duration: e.target.value }));
                          }}
                          placeholder="Enter custom duration"
                          min="15"
                          step="15"
                          className="mt-1"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {(adjustPrice || adjustTime) && (
                  <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                    <p className="text-sm text-amber-800 dark:text-amber-200">
                      <strong>Note:</strong> Manual adjustments override automatic calculations.
                    </p>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Manual Price Input (when not using detailed pricing) */}
          {!useDetailedPricing && (
            <>
              <div>
                <Label htmlFor="duration">Duration (minutes) *</Label>
                <Input
                  id="duration"
                  name="duration"
                  type="number"
                  value={formData.duration}
                  onChange={handleChange}
                  required
                  min="15"
                  step="15"
                />
              </div>

              <div>
                <Label htmlFor="price">Price ($) *</Label>
                <Input
                  id="price"
                  name="price"
                  type="number"
                  value={formData.price}
                  onChange={handleChange}
                  required
                  min="0"
                  step="0.01"
                />
                {formData.hasInsuranceCoverage && (
                  <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-md text-sm space-y-1">
                    <p className="font-semibold text-blue-900">Insurance Coverage Active</p>
                    <div className="space-y-0.5 text-blue-800">
                      <p>Insurance pays: ${parseFloat(formData.insuranceAmount).toFixed(2)}</p>
                      {parseFloat(formData.copayDiscountApplied) > 0 ? (
                        <>
                          <p>Standard copay: ${parseFloat(formData.copayAmount).toFixed(2)}</p>
                          <p>Discount applied: -${parseFloat(formData.copayDiscountApplied).toFixed(2)}</p>
                          <p className="font-semibold">Client pays: ${parseFloat(formData.finalCopayAmount).toFixed(2)}</p>
                        </>
                      ) : parseFloat(formData.copayAmount) > 0 ? (
                        <p>Client copay: ${parseFloat(formData.copayAmount).toFixed(2)}</p>
                      ) : (
                        <p>No copay required</p>
                      )}
                      <p className="pt-1 border-t border-blue-300 font-semibold">
                        Total: ${parseFloat(formData.price).toFixed(2)}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              placeholder="Any special instructions..."
              rows={3}
            />
          </div>
        </Card>

        {/* Referral Credits Section */}
        {referralCreditsAvailable > 0 && (
          <Card className="p-4 space-y-4 bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="font-semibold text-lg flex items-center gap-2">
                  <span className="text-2xl">🎁</span>
                  Referral Credits Available
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  This client has ${referralCreditsAvailable.toFixed(2)} in referral credits
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-purple-700">
                  ${referralCreditsAvailable.toFixed(2)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-purple-200">
              <input
                type="checkbox"
                id="applyCredits"
                checked={applyCredits}
                onChange={(e) => setApplyCredits(e.target.checked)}
                className="h-4 w-4 rounded border-purple-300"
              />
              <Label htmlFor="applyCredits" className="cursor-pointer font-medium">
                Apply credits to this booking
              </Label>
            </div>

            {applyCredits && (
              <div className="bg-white p-4 rounded-lg border-2 border-purple-300 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Booking Price:</span>
                  <span className="font-semibold">${parseFloat(formData.price).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm text-green-600">
                  <span>Credits Applied:</span>
                  <span className="font-semibold">
                    -${Math.min(referralCreditsAvailable, parseFloat(formData.price) || 0).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-base font-bold border-t border-purple-200 pt-2">
                  <span>Final Price:</span>
                  <span className="text-purple-700">
                    ${Math.max(0, parseFloat(formData.price || '0') - Math.min(referralCreditsAvailable, parseFloat(formData.price) || 0)).toFixed(2)}
                  </span>
                </div>
                {Math.min(referralCreditsAvailable, parseFloat(formData.price) || 0) < referralCreditsAvailable && (
                  <p className="text-xs text-gray-600 pt-2 border-t border-purple-200">
                    Remaining balance after booking: ${(referralCreditsAvailable - Math.min(referralCreditsAvailable, parseFloat(formData.price) || 0)).toFixed(2)}
                  </p>
                )}
              </div>
            )}
          </Card>
        )}

        <Card className="p-6 md:p-8 space-y-6">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="isRecurring"
              name="isRecurring"
              checked={formData.isRecurring}
              onChange={handleChange}
              className="h-5 w-5 rounded border-gray-300"
            />
            <Label htmlFor="isRecurring" className="cursor-pointer font-semibold text-base">
              Make this a recurring job
            </Label>
          </div>

          {formData.isRecurring && (
            <div className="space-y-4 pl-6 border-l-2 border-gray-200">
              <div>
                <Label htmlFor="recurrenceFrequency">Frequency *</Label>
                <Select
                  id="recurrenceFrequency"
                  name="recurrenceFrequency"
                  value={formData.recurrenceFrequency}
                  onChange={handleChange}
                  required
                >
                  <option value="WEEKLY">Weekly</option>
                  <option value="BIWEEKLY">Bi-weekly</option>
                  <option value="MONTHLY">Monthly</option>
                </Select>
              </div>

              <div>
                <Label htmlFor="recurrenceEndDate">End Date (optional)</Label>
                <Input
                  id="recurrenceEndDate"
                  name="recurrenceEndDate"
                  type="date"
                  value={formData.recurrenceEndDate}
                  onChange={handleChange}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Leave blank for ongoing recurring jobs (up to 1 year)
                </p>
              </div>
            </div>
          )}
        </Card>

        <div className="flex gap-4 pt-4">
          <Button type="submit" disabled={loading} className="flex-1 h-12 text-base font-semibold">
            {loading ? 'Creating...' : 'Create Job'}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.back()} className="h-12 px-8 text-base font-semibold">
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}

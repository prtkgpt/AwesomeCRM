'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Minus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';

// Pricing configuration
const HOURLY_RATE = 50.00;

const SERVICE_TYPES = [
  { value: 'INITIAL_STANDARD', label: 'Initial Standard', multiplier: 1.00 },
  { value: 'INITIAL_DEEP', label: 'Initial Deep Cleaning', multiplier: 1.20 },
  { value: 'MOVE_IN_OUT', label: 'Move in/Move out', multiplier: 1.20 },
  { value: 'RECURRING_WEEKLY', label: 'Recurring Weekly', multiplier: 0.75 },
  { value: 'RECURRING_BIWEEKLY', label: 'Recurring Bi-weekly', multiplier: 0.85 },
  { value: 'RECURRING_MONTHLY', label: 'Recurring Monthly', multiplier: 0.90 },
  { value: 'POST_CONSTRUCTION', label: 'Post Construction', multiplier: 1.30 },
  { value: 'DEEP_POST_PARTY', label: 'Deep Cleaning/Post Party', multiplier: 1.10 },
];

const SQFT_RANGES = [
  { value: '0-1000', label: '0 - 1000 Sq Ft', hours: 3 },
  { value: '1001-1500', label: '1001 - 1500 Sq Ft', hours: 4 },
  { value: '1501-2000', label: '1501 - 2000 Sq Ft', hours: 4.5 },
  { value: '2001-2500', label: '2001 - 2500 Sq Ft', hours: 5 },
  { value: '2501-3000', label: '2501 - 3000 Sq Ft', hours: 6 },
  { value: '3001-3500', label: '3001 - 3500 Sq Ft', hours: 6.5 },
  { value: '3501-4000', label: '3501 - 4000 Sq Ft', hours: 7 },
  { value: '4001-4500', label: '4001 - 4500 Sq Ft', hours: 8 },
];

const SERVICE_AREAS = [
  { id: 'fullBathroom', label: 'Full Bathroom', minutes: 40, icon: '🛁' },
  { id: 'halfBathroom', label: 'Half Bathroom', minutes: 20, icon: '🚽' },
  { id: 'bedroom', label: 'Bedroom', minutes: 30, icon: '🛏️' },
  { id: 'office', label: 'Office', minutes: 20, icon: '💼' },
  { id: 'pantry', label: 'Pantry', minutes: 20, icon: '🥫' },
  { id: 'laundry', label: 'Laundry', minutes: 40, icon: '🧺' },
  { id: 'kitchen', label: 'Kitchen', minutes: 45, icon: '🍳' },
  { id: 'livingArea', label: 'Living Area', minutes: 45, icon: '🛋️' },
  { id: 'diningRoom', label: 'Dining Room', minutes: 15, icon: '🍽️' },
  { id: 'den', label: 'Den', minutes: 30, icon: '📚' },
];

const ADDONS = [
  { id: 'oven', label: 'Oven', minutes: 45, icon: '🔥' },
  { id: 'fridge', label: 'Fridge', minutes: 30, icon: '🧊' },
  { id: 'lightFixtures', label: 'Light Fixtures', minutes: 30, icon: '💡' },
  { id: 'cabinets', label: 'Inside Cabinets', minutes: 30, icon: '🗄️' },
  { id: 'spotWall', label: 'Spot Wall Cleaning', minutes: 30, icon: '🧽' },
  { id: 'baseboards', label: 'Baseboards', minutes: 60, icon: '📏' },
  { id: 'trashDisposal', label: 'Trash Disposal', minutes: 30, icon: '🗑️' },
  { id: 'linen', label: 'Linen', minutes: 15, icon: '🧺' },
  { id: 'interiorWindows', label: 'Interior Window Cleaning', minutes: 10, icon: '🪟' },
  { id: 'stairs', label: 'Stairs', minutes: 30, icon: '🪜' },
  { id: 'garage2Car', label: 'Garage - 2 Car (Reg)', minutes: 60, icon: '🚗' },
  { id: 'pets', label: 'Pets', minutes: 30, icon: '🐾' },
  { id: 'greenCleaning', label: 'Green Cleaning', minutes: 0, icon: '🌿' },
  { id: 'laundryFolding', label: 'Laundry & Folding', minutes: 45, icon: '👕' },
  { id: 'dishes', label: 'Dishes', minutes: 20, icon: '🍽️' },
  { id: 'insideDishwasher', label: 'Inside Dishwasher', minutes: 30, icon: '🔵' },
  { id: 'wetWipeWindowBlinds', label: 'Wet Wipe Window Blinds', minutes: 30, icon: '🪟' },
];

export default function NewEstimatePage() {
  const router = useRouter();

  // Customer details
  const [customerType, setCustomerType] = useState<'new' | 'existing'>('new');
  const [clients, setClients] = useState<any[]>([]);
  const [selectedClient, setSelectedClient] = useState('');
  const [newCustomer, setNewCustomer] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zip: '',
  });

  // Service configuration
  const [serviceType, setServiceType] = useState('INITIAL_STANDARD');
  const [sqftRange, setSqftRange] = useState('1001-1500');
  const [bedrooms, setBedrooms] = useState(2);
  const [bathrooms, setBathrooms] = useState(1);

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

  // Booking adjustments
  const [adjustPrice, setAdjustPrice] = useState(false);
  const [adjustTime, setAdjustTime] = useState(false);
  const [manualPrice, setManualPrice] = useState(0);
  const [manualDuration, setManualDuration] = useState(0);

  // Scheduling
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [priority, setPriority] = useState('MEDIUM');

  // Notes
  const [customerNotes, setCustomerNotes] = useState('');
  const [internalNotes, setInternalNotes] = useState('');
  const [providerNotes, setProviderNotes] = useState('');

  // Options
  const [excludeCancellationFee, setExcludeCancellationFee] = useState(false);
  const [excludeCustomerNotification, setExcludeCustomerNotification] = useState(false);
  const [excludeProviderNotification, setExcludeProviderNotification] = useState(false);

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      const response = await fetch('/api/clients');
      const data = await response.json();
      if (data.success) {
        setClients(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch clients:', error);
    }
  };

  // Calculate pricing
  const calculatePrice = () => {
    const selectedServiceType = SERVICE_TYPES.find(st => st.value === serviceType);
    const selectedSqft = SQFT_RANGES.find(sq => sq.value === sqftRange);

    if (!selectedServiceType || !selectedSqft) return { total: 0, breakdown: null };

    // Start with base hours from square footage
    let totalMinutes = selectedSqft.hours * 60;

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
        baseHours: selectedSqft.hours,
        totalMinutes,
        totalHours: totalHours.toFixed(2),
        basePrice: basePrice.toFixed(2),
        multiplier: selectedServiceType.multiplier,
        serviceType: selectedServiceType.label,
      }
    };
  };

  const { total: calculatedPrice, breakdown } = calculatePrice();

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

  const handleSaveQuote = async () => {
    setLoading(true);
    try {
      const quoteData = {
        customerType,
        clientId: customerType === 'existing' ? selectedClient : null,
        newCustomer: customerType === 'new' ? newCustomer : null,
        serviceType,
        sqftRange,
        bedrooms,
        bathrooms,
        serviceAreas,
        addons,
        scheduledDate: scheduledDate ? new Date(`${scheduledDate}T${scheduledTime || '09:00'}`).toISOString() : null,
        priority,
        customerNotes,
        internalNotes,
        providerNotes,
        price: adjustPrice ? manualPrice : calculatedPrice,
        duration: adjustTime ? manualDuration : (breakdown ? parseFloat(breakdown.totalHours) * 60 : 0),
        excludeCancellationFee,
        excludeCustomerNotification,
        excludeProviderNotification,
      };

      const response = await fetch('/api/estimates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(quoteData),
      });

      const data = await response.json();

      if (data.success) {
        alert('Quote created successfully!');
        router.push('/jobs');
      } else {
        alert(data.error || 'Failed to create quote');
      }
    } catch (error) {
      alert('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-4 md:p-8">
        {/* Header */}
        <div className="mb-6 flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">New Estimate</h1>
            <p className="text-gray-600">Create a detailed estimate for your customer</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Customer Details */}
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Customer Details</h2>

              <div className="flex gap-4 mb-4">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    checked={customerType === 'new'}
                    onChange={() => setCustomerType('new')}
                    className="mr-2"
                  />
                  <span>New customer</span>
                </label>
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    checked={customerType === 'existing'}
                    onChange={() => setCustomerType('existing')}
                    className="mr-2"
                  />
                  <span>Existing customer</span>
                </label>
              </div>

              {customerType === 'existing' ? (
                <div>
                  <Label>Select Customer</Label>
                  <Select
                    value={selectedClient}
                    onChange={(e) => setSelectedClient(e.target.value)}
                  >
                    <option value="">Choose a client...</option>
                    {clients.map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.name} - {client.email}
                      </option>
                    ))}
                  </Select>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>First name</Label>
                    <Input
                      placeholder="Ex: James"
                      value={newCustomer.firstName}
                      onChange={(e) => setNewCustomer({ ...newCustomer, firstName: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Last name</Label>
                    <Input
                      placeholder="Ex: Lee"
                      value={newCustomer.lastName}
                      onChange={(e) => setNewCustomer({ ...newCustomer, lastName: e.target.value })}
                    />
                  </div>
                  <div className="col-span-2">
                    <Label>Email address</Label>
                    <Input
                      type="email"
                      placeholder="Ex: example@xyz.com"
                      value={newCustomer.email}
                      onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                    />
                  </div>
                  <div className="col-span-2">
                    <Label>Phone</Label>
                    <Input
                      type="tel"
                      placeholder="(555) 123-4567"
                      value={newCustomer.phone}
                      onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                    />
                  </div>
                  <div className="col-span-2">
                    <Label>Address</Label>
                    <Input
                      placeholder="Street address"
                      value={newCustomer.address}
                      onChange={(e) => setNewCustomer({ ...newCustomer, address: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>City</Label>
                    <Input
                      placeholder="City"
                      value={newCustomer.city}
                      onChange={(e) => setNewCustomer({ ...newCustomer, city: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>State</Label>
                    <Input
                      placeholder="State"
                      value={newCustomer.state}
                      onChange={(e) => setNewCustomer({ ...newCustomer, state: e.target.value })}
                    />
                  </div>
                  <div className="col-span-2">
                    <Label>ZIP Code</Label>
                    <Input
                      placeholder="ZIP"
                      value={newCustomer.zip}
                      onChange={(e) => setNewCustomer({ ...newCustomer, zip: e.target.value })}
                    />
                  </div>
                </div>
              )}
            </Card>

            {/* Service Type & Frequency */}
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Service Type</h2>

              <div className="mb-4">
                <Label>Type of Cleaning</Label>
                <Select
                  value={serviceType}
                  onChange={(e) => setServiceType(e.target.value)}
                >
                  {SERVICE_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label} ({type.multiplier * 100}%)
                    </option>
                  ))}
                </Select>
              </div>
            </Card>

            {/* Property Details */}
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">What Needs To Be Done?</h2>
              <p className="text-sm text-gray-600 mb-4">
                Configure the property details and service requirements
              </p>

              <div className="grid grid-cols-3 gap-4 mb-6">
                <div>
                  <Label>Square Footage</Label>
                  <Select
                    value={sqftRange}
                    onChange={(e) => setSqftRange(e.target.value)}
                  >
                    {SQFT_RANGES.map((range) => (
                      <option key={range.value} value={range.value}>
                        {range.label}
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <Label>Bedrooms</Label>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setBedrooms(Math.max(0, bedrooms - 1))}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <span className="w-12 text-center font-medium">{bedrooms}</span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setBedrooms(bedrooms + 1)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div>
                  <Label>Bathrooms</Label>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setBathrooms(Math.max(0, bathrooms - 1))}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <span className="w-12 text-center font-medium">{bathrooms}</span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setBathrooms(bathrooms + 1)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Service Areas */}
              <div className="mb-6">
                <h3 className="font-semibold mb-3">Service Areas</h3>
                <div className="grid grid-cols-2 gap-3">
                  {SERVICE_AREAS.map((area) => (
                    <div
                      key={area.id}
                      className="border rounded-lg p-3 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{area.icon}</span>
                        <div>
                          <p className="font-medium text-sm">{area.label}</p>
                          <p className="text-xs text-gray-500">{area.minutes} min</p>
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
                          <Minus className="h-3 w-3" />
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
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Card>

            {/* Add-ons */}
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Select Extras</h2>
              <p className="text-sm text-gray-600 mb-4">
                Add extra services to customize the cleaning
              </p>

              <div className="grid grid-cols-3 gap-3">
                {ADDONS.map((addon) => (
                  <button
                    key={addon.id}
                    type="button"
                    onClick={() => handleAddonToggle(addon.id)}
                    className={`border rounded-lg p-4 text-center transition-all ${
                      addons[addon.id]
                        ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="text-3xl mb-2">{addon.icon}</div>
                    <p className="font-medium text-sm">{addon.label}</p>
                    <p className="text-xs text-gray-500">{addon.minutes} min</p>
                  </button>
                ))}
              </div>
            </Card>

            {/* Carpet Shampooing */}
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <span className="text-2xl">🧹</span>
                Carpet Shampooing
              </h2>
              <p className="text-sm text-gray-600 mb-4">
                Add carpet shampooing services ($50/bedroom, $25/staircase, $60/living room)
              </p>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">Bedrooms</p>
                    <p className="text-xs text-gray-500">$50 per bedroom</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setCarpetShampooing(prev => ({ ...prev, bedrooms: Math.max(0, prev.bedrooms - 1) }))}
                      className="w-8 h-8 rounded-md border border-gray-300 hover:bg-gray-100 flex items-center justify-center"
                      disabled={carpetShampooing.bedrooms === 0}
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="w-8 text-center font-medium">{carpetShampooing.bedrooms}</span>
                    <button
                      type="button"
                      onClick={() => setCarpetShampooing(prev => ({ ...prev, bedrooms: prev.bedrooms + 1 }))}
                      className="w-8 h-8 rounded-md border border-gray-300 hover:bg-gray-100 flex items-center justify-center"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">Staircases</p>
                    <p className="text-xs text-gray-500">$25 per staircase</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setCarpetShampooing(prev => ({ ...prev, staircases: Math.max(0, prev.staircases - 1) }))}
                      className="w-8 h-8 rounded-md border border-gray-300 hover:bg-gray-100 flex items-center justify-center"
                      disabled={carpetShampooing.staircases === 0}
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="w-8 text-center font-medium">{carpetShampooing.staircases}</span>
                    <button
                      type="button"
                      onClick={() => setCarpetShampooing(prev => ({ ...prev, staircases: prev.staircases + 1 }))}
                      className="w-8 h-8 rounded-md border border-gray-300 hover:bg-gray-100 flex items-center justify-center"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">Living Rooms</p>
                    <p className="text-xs text-gray-500">$60 per living room</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setCarpetShampooing(prev => ({ ...prev, livingRooms: Math.max(0, prev.livingRooms - 1) }))}
                      className="w-8 h-8 rounded-md border border-gray-300 hover:bg-gray-100 flex items-center justify-center"
                      disabled={carpetShampooing.livingRooms === 0}
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="w-8 text-center font-medium">{carpetShampooing.livingRooms}</span>
                    <button
                      type="button"
                      onClick={() => setCarpetShampooing(prev => ({ ...prev, livingRooms: prev.livingRooms + 1 }))}
                      className="w-8 h-8 rounded-md border border-gray-300 hover:bg-gray-100 flex items-center justify-center"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {(carpetShampooing.bedrooms > 0 || carpetShampooing.staircases > 0 || carpetShampooing.livingRooms > 0) && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-sm font-medium text-blue-900">Carpet Shampooing Total:</p>
                    <p className="text-lg font-bold text-blue-700">
                      ${(carpetShampooing.bedrooms * 50 + carpetShampooing.staircases * 25 + carpetShampooing.livingRooms * 60).toFixed(2)}
                    </p>
                  </div>
                )}
              </div>
            </Card>

            {/* Scheduling */}
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Choose Service Provider</h2>

              <div className="mb-4">
                <Label>Select Date</Label>
                <Input
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                />
              </div>

              <div className="mb-4">
                <Label>Select Time (Optional)</Label>
                <Input
                  type="time"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                />
              </div>

              <div className="mb-4">
                <Label>Priority</Label>
                <div className="flex gap-3 mt-2">
                  {[
                    { value: 'LOW', label: 'Low', color: 'text-green-600' },
                    { value: 'MEDIUM', label: 'Medium', color: 'text-orange-600' },
                    { value: 'HIGH', label: 'High', color: 'text-red-600' },
                  ].map((p) => (
                    <label key={p.value} className="flex items-center cursor-pointer">
                      <input
                        type="radio"
                        checked={priority === p.value}
                        onChange={() => setPriority(p.value)}
                        className="mr-2"
                      />
                      <span className={p.color}>{p.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </Card>

            {/* Notes */}
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Key Information & Job Notes</h2>

              <div className="space-y-4">
                <div>
                  <Label>Customer Note For Provider</Label>
                  <Textarea
                    placeholder="Special Notes And Instructions"
                    value={customerNotes}
                    onChange={(e) => setCustomerNotes(e.target.value)}
                    rows={3}
                  />
                </div>

                <div>
                  <Label>Internal Notes (Admin Only)</Label>
                  <Textarea
                    placeholder="Internal notes not visible to customer"
                    value={internalNotes}
                    onChange={(e) => setInternalNotes(e.target.value)}
                    rows={3}
                  />
                </div>

                <div>
                  <Label>Note For Service Provider</Label>
                  <Textarea
                    placeholder="Instructions for the cleaning team"
                    value={providerNotes}
                    onChange={(e) => setProviderNotes(e.target.value)}
                    rows={3}
                  />
                </div>
              </div>
            </Card>
          </div>

          {/* Sidebar - Booking Summary */}
          <div className="lg:col-span-1">
            <div className="sticky top-4 space-y-4">
              {/* Summary */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Booking Summary</h3>

                <div className="space-y-2 text-sm mb-4">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Service</span>
                    <span className="font-medium">
                      {SERVICE_TYPES.find(st => st.value === serviceType)?.label}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Sq Ft</span>
                    <span className="font-medium">{sqftRange}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Bedrooms</span>
                    <span className="font-medium">{bedrooms}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Bathrooms</span>
                    <span className="font-medium">{bathrooms}</span>
                  </div>
                  {breakdown && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Length</span>
                      <span className="font-medium">{breakdown.totalHours} Hours</span>
                    </div>
                  )}
                </div>

                <div className="border-t pt-4 space-y-2">
                  <h4 className="font-semibold mb-2">Payment Summary</h4>
                  {breakdown && (
                    <>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Base Price</span>
                        <span>${breakdown.basePrice}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Service Multiplier</span>
                        <span>{breakdown.multiplier}x</span>
                      </div>
                    </>
                  )}
                  <div className="flex justify-between text-lg font-bold pt-2 border-t">
                    <span>TOTAL</span>
                    <span className="text-blue-600">${calculatedPrice.toFixed(2)}</span>
                  </div>
                </div>
              </Card>

              {/* Booking Adjustments */}
              <Card className="p-6">
                <h2 className="text-xl font-semibold mb-4">Booking Adjustments</h2>
                <p className="text-sm text-gray-600 mb-4">
                  Override calculated values if needed
                </p>

                <div className="space-y-4">
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
                            setManualPrice(0);
                          } else {
                            setManualPrice(calculatedPrice);
                          }
                        }}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                      <label htmlFor="adjustPrice" className="cursor-pointer font-medium">
                        Do you want to adjust price?
                      </label>
                    </div>
                    {adjustPrice && (
                      <div className="pl-6">
                        <label className="block text-sm font-medium mb-1">Custom Price ($)</label>
                        <Input
                          type="number"
                          value={manualPrice}
                          onChange={(e) => setManualPrice(parseFloat(e.target.value) || 0)}
                          placeholder="Enter custom price"
                          min="0"
                          step="0.01"
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
                            setManualDuration(0);
                          } else {
                            setManualDuration(breakdown ? parseFloat(breakdown.totalHours) * 60 : 0);
                          }
                        }}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                      <label htmlFor="adjustTime" className="cursor-pointer font-medium">
                        Do you want to adjust time?
                      </label>
                    </div>
                    {adjustTime && (
                      <div className="pl-6">
                        <label className="block text-sm font-medium mb-1">Custom Duration (minutes)</label>
                        <Input
                          type="number"
                          value={manualDuration}
                          onChange={(e) => setManualDuration(parseFloat(e.target.value) || 0)}
                          placeholder="Enter custom duration"
                          min="15"
                          step="15"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {(adjustPrice || adjustTime) && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mt-4">
                    <p className="text-sm text-amber-800">
                      <strong>Note:</strong> Manual adjustments will override automatic calculations.
                      {adjustPrice && ` Price: $${manualPrice.toFixed(2)}`}
                      {adjustPrice && adjustTime && ' | '}
                      {adjustTime && ` Duration: ${manualDuration} min`}
                    </p>
                  </div>
                )}
              </Card>

              {/* Options */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Options</h3>
                <div className="space-y-2">
                  <label className="flex items-center cursor-pointer text-sm">
                    <input
                      type="checkbox"
                      checked={excludeCancellationFee}
                      onChange={(e) => setExcludeCancellationFee(e.target.checked)}
                      className="mr-2"
                    />
                    <span>Exclude cancellation fee</span>
                  </label>
                  <label className="flex items-center cursor-pointer text-sm">
                    <input
                      type="checkbox"
                      checked={excludeCustomerNotification}
                      onChange={(e) => setExcludeCustomerNotification(e.target.checked)}
                      className="mr-2"
                    />
                    <span>Exclude customer notification</span>
                  </label>
                  <label className="flex items-center cursor-pointer text-sm">
                    <input
                      type="checkbox"
                      checked={excludeProviderNotification}
                      onChange={(e) => setExcludeProviderNotification(e.target.checked)}
                      className="mr-2"
                    />
                    <span>Exclude provider notification</span>
                  </label>
                </div>
              </Card>

              {/* Actions */}
              <div className="space-y-3">
                <Button
                  onClick={handleSaveQuote}
                  disabled={loading}
                  className="w-full bg-green-500 hover:bg-green-600"
                  size="lg"
                >
                  {loading ? 'Saving...' : 'Save Booking'}
                </Button>
                <Button
                  onClick={handleSaveQuote}
                  disabled={loading}
                  variant="default"
                  className="w-full bg-blue-500 hover:bg-blue-600"
                  size="lg"
                >
                  Save As Draft
                </Button>
                <Button
                  onClick={handleSaveQuote}
                  disabled={loading}
                  className="w-full bg-orange-500 hover:bg-orange-600"
                  size="lg"
                >
                  Save As Quote
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

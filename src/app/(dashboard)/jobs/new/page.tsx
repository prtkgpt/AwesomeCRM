'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import type { ClientWithAddresses } from '@/types';

export default function NewJobPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedClientId = searchParams.get('clientId');

  const [clients, setClients] = useState<ClientWithAddresses[]>([]);
  const [selectedClient, setSelectedClient] = useState<ClientWithAddresses | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    clientId: preselectedClientId || '',
    addressId: '',
    scheduledDate: '',
    scheduledTime: '',
    duration: '120',
    serviceType: 'STANDARD',
    price: '80',
    notes: '',
    isRecurring: false,
    recurrenceFrequency: 'NONE',
    recurrenceEndDate: '',
  });

  useEffect(() => {
    fetchClients();
  }, []);

  useEffect(() => {
    if (formData.clientId) {
      const client = clients.find((c) => c.id === formData.clientId);
      setSelectedClient(client || null);
      if (client && client.addresses.length > 0) {
        setFormData((prev) => ({
          ...prev,
          addressId: client.addresses.find((a) => a.isDefault)?.id || client.addresses[0].id,
        }));
      }
    } else {
      setSelectedClient(null);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const scheduledDateTime = new Date(
        `${formData.scheduledDate}T${formData.scheduledTime}`
      );

      const payload = {
        clientId: formData.clientId,
        addressId: formData.addressId,
        scheduledDate: scheduledDateTime.toISOString(),
        duration: parseInt(formData.duration),
        serviceType: formData.serviceType,
        price: parseFloat(formData.price),
        notes: formData.notes || undefined,
        isRecurring: formData.isRecurring,
        recurrenceFrequency: formData.isRecurring
          ? formData.recurrenceFrequency
          : 'NONE',
        recurrenceEndDate: formData.isRecurring && formData.recurrenceEndDate
          ? new Date(formData.recurrenceEndDate).toISOString()
          : undefined,
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
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 max-w-2xl mx-auto space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold">New Job</h1>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="p-4 space-y-4">
          <h2 className="font-semibold text-lg">Client & Location</h2>

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
                {selectedClient.addresses.map((address) => (
                  <option key={address.id} value={address.id}>
                    {address.street}
                    {address.unit ? ` ${address.unit}` : ''}, {address.city}
                    {address.isDefault ? ' (Default)' : ''}
                  </option>
                ))}
              </Select>
            </div>
          )}
        </Card>

        <Card className="p-4 space-y-4">
          <h2 className="font-semibold text-lg">Schedule</h2>

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
            </div>
          </div>

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
        </Card>

        <Card className="p-4 space-y-4">
          <h2 className="font-semibold text-lg">Service Details</h2>

          <div>
            <Label htmlFor="serviceType">Service Type *</Label>
            <Select
              id="serviceType"
              name="serviceType"
              value={formData.serviceType}
              onChange={handleChange}
              required
            >
              <option value="STANDARD">Standard Clean</option>
              <option value="DEEP">Deep Clean</option>
              <option value="MOVE_IN">Move-In Clean</option>
              <option value="MOVE_OUT">Move-Out Clean</option>
            </Select>
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
          </div>

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

        <Card className="p-4 space-y-4">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isRecurring"
              name="isRecurring"
              checked={formData.isRecurring}
              onChange={handleChange}
              className="h-4 w-4 rounded border-gray-300"
            />
            <Label htmlFor="isRecurring" className="cursor-pointer">
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

        <div className="flex gap-3">
          <Button type="submit" disabled={loading} className="flex-1">
            {loading ? 'Creating...' : 'Create Job'}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}

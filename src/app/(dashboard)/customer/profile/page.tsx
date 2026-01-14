'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Save,
  AlertCircle,
  Plus,
  Trash2
} from 'lucide-react';

interface Address {
  id: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  gateCode?: string | null;
  parkingInfo?: string | null;
  petInfo?: string | null;
  preferences?: string | null;
}

interface ClientProfile {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  notes?: string | null;
  addresses: Address[];
}

export default function CustomerProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [profile, setProfile] = useState<ClientProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated') {
      fetchProfile();
    }
  }, [status, router]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/customer/profile');
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setProfile(data.data);
        }
      }
    } catch (error) {
      console.error('Failed to fetch profile:', error);
      setError('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    setError('');

    try {
      const res = await fetch('/api/customer/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: profile?.name,
          email: profile?.email,
          phone: profile?.phone,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setMessage('✅ Profile updated successfully!');
        setTimeout(() => setMessage(''), 3000);
      } else {
        setError(data.error || 'Failed to update profile');
      }
    } catch (error) {
      setError('An error occurred. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const updateField = (field: keyof ClientProfile, value: any) => {
    setProfile(prev => prev ? { ...prev, [field]: value } : null);
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-center">Loading your profile...</div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="p-8">
        <div className="text-center text-red-600">Failed to load profile</div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">My Profile</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Manage your account information and contact details.
        </p>
      </div>

      {message && (
        <div className="mb-6 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 text-green-800 dark:text-green-200 p-4 rounded-lg flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          {message}
        </div>
      )}

      {error && (
        <div className="mb-6 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 p-4 rounded-lg flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <User className="h-5 w-5 text-blue-600" />
            Basic Information
          </h2>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Full Name *</Label>
              <Input
                id="name"
                value={profile.name}
                onChange={(e) => updateField('name', e.target.value)}
                placeholder="Your full name"
                required
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="email">Email Address</Label>
              <div className="flex items-center gap-2 mt-1">
                <Mail className="h-4 w-4 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  value={profile.email || ''}
                  onChange={(e) => updateField('email', e.target.value)}
                  placeholder="your.email@example.com"
                  className="flex-1"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="phone">Phone Number</Label>
              <div className="flex items-center gap-2 mt-1">
                <Phone className="h-4 w-4 text-gray-400" />
                <Input
                  id="phone"
                  type="tel"
                  value={profile.phone || ''}
                  onChange={(e) => updateField('phone', e.target.value)}
                  placeholder="(123) 456-7890"
                  className="flex-1"
                />
              </div>
            </div>
          </div>
        </Card>

        {/* Addresses */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <MapPin className="h-5 w-5 text-green-600" />
              My Addresses
            </h2>
          </div>

          {profile.addresses.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <MapPin className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p>No addresses on file</p>
              <p className="text-sm mt-1">Contact us to add service addresses</p>
            </div>
          ) : (
            <div className="space-y-4">
              {profile.addresses.map((address) => (
                <div
                  key={address.id}
                  className="p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900 dark:text-gray-100">
                        {address.street}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {address.city}, {address.state} {address.zip}
                      </p>

                      {address.gateCode && (
                        <div className="mt-2 text-xs">
                          <span className="font-medium">Gate Code:</span> {address.gateCode}
                        </div>
                      )}

                      {address.parkingInfo && (
                        <div className="mt-1 text-xs">
                          <span className="font-medium">Parking:</span> {address.parkingInfo}
                        </div>
                      )}

                      {address.petInfo && (
                        <div className="mt-1 text-xs">
                          <span className="font-medium">Pets:</span> {address.petInfo}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <p className="text-xs text-gray-500 dark:text-gray-400 mt-4">
            💡 To add or modify service addresses, please contact our office.
          </p>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push('/customer/dashboard')}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>

      {/* Account Information */}
      <Card className="p-6 mt-6">
        <h2 className="text-xl font-semibold mb-4">Account Information</h2>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between py-2 border-b border-gray-200 dark:border-gray-700">
            <span className="text-gray-600 dark:text-gray-400">Account Email:</span>
            <span className="font-medium">{session?.user?.email || 'Not set'}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-gray-200 dark:border-gray-700">
            <span className="text-gray-600 dark:text-gray-400">Customer ID:</span>
            <span className="font-mono text-xs">{profile.id}</span>
          </div>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-4">
          💡 To change your account password or email, please contact support.
        </p>
      </Card>
    </div>
  );
}

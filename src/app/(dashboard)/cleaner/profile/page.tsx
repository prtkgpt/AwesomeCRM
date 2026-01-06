'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { User, Mail, Phone, Building, Save, MapPin, AlertCircle, Briefcase, Award } from 'lucide-react';

export default function CleanerProfilePage() {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState({
    // Basic Info
    name: '',
    email: '',
    phone: '',

    // Address
    street: '',
    city: '',
    state: '',
    zip: '',

    // Emergency Contact
    emergencyContact: '',
    emergencyPhone: '',

    // Employment (read-only for cleaners)
    hourlyRate: '',
    employeeId: '',

    // Work Details
    experience: '',
    speed: 'Medium',
    serviceAreas: '',
    specialties: '',
  });

  const [companyName, setCompanyName] = useState('');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated' && session?.user) {
      fetchProfile();
    }
  }, [status, session, router]);

  const fetchProfile = async () => {
    try {
      const res = await fetch('/api/cleaner/profile');
      if (res.ok) {
        const data = await res.json();
        setFormData({
          name: data.name || '',
          email: data.email || '',
          phone: data.phone || '',
          street: data.street || '',
          city: data.city || '',
          state: data.state || '',
          zip: data.zip || '',
          emergencyContact: data.emergencyContact || '',
          emergencyPhone: data.emergencyPhone || '',
          hourlyRate: data.hourlyRate || '',
          employeeId: data.employeeId || '',
          experience: data.experience || '',
          speed: data.speed || 'Medium',
          serviceAreas: Array.isArray(data.serviceAreas) ? data.serviceAreas.join(', ') : '',
          specialties: Array.isArray(data.specialties) ? data.specialties.join(', ') : '',
        });
        setCompanyName(data.companyName || '');
      } else {
        const errorData = await res.json();
        setError(errorData.error || 'Failed to fetch profile');
      }
    } catch (error) {
      console.error('Failed to fetch profile:', error);
      setError('Failed to fetch profile');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const payload = {
        // User fields
        name: formData.name,
        phone: formData.phone,

        // TeamMember fields
        street: formData.street || undefined,
        city: formData.city || undefined,
        state: formData.state || undefined,
        zip: formData.zip || undefined,
        emergencyContact: formData.emergencyContact || undefined,
        emergencyPhone: formData.emergencyPhone || undefined,
        experience: formData.experience || undefined,
        speed: formData.speed || undefined,
        serviceAreas: formData.serviceAreas ? formData.serviceAreas.split(',').map(a => a.trim()).filter(Boolean) : [],
        specialties: formData.specialties ? formData.specialties.split(',').map(s => s.trim()).filter(Boolean) : [],
      };

      const res = await fetch('/api/cleaner/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        // Update session with new data
        await update({
          name: data.name,
          phone: data.phone,
        });

        setSuccess('Profile updated successfully!');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(data.error || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Failed to update profile:', error);
      setError('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-center">Loading profile...</div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">My Profile</h1>
        <p className="text-gray-600">Update your personal and work information</p>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 text-red-600 p-3 rounded-md text-sm flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 bg-green-50 text-green-600 p-3 rounded-md text-sm flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <User className="h-5 w-5 text-blue-600" />
            <h2 className="text-xl font-semibold">Basic Information</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Full Name *</Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                placeholder="John Doe"
              />
            </div>

            <div>
              <Label htmlFor="phone">Phone Number *</Label>
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

            <div>
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                disabled
                className="bg-gray-100 cursor-not-allowed"
              />
              <p className="text-xs text-gray-500 mt-1">
                Email cannot be changed. Contact your administrator if needed.
              </p>
            </div>

            <div>
              <Label htmlFor="employeeId">Employee ID</Label>
              <Input
                id="employeeId"
                name="employeeId"
                value={formData.employeeId}
                disabled
                className="bg-gray-100 cursor-not-allowed"
              />
              <p className="text-xs text-gray-500 mt-1">
                Assigned by your administrator
              </p>
            </div>
          </div>
        </Card>

        {/* Address */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <MapPin className="h-5 w-5 text-blue-600" />
            <h2 className="text-xl font-semibold">Address</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Label htmlFor="street">Street Address</Label>
              <Input
                id="street"
                name="street"
                value={formData.street}
                onChange={handleChange}
                placeholder="123 Main St"
              />
            </div>

            <div>
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                name="city"
                value={formData.city}
                onChange={handleChange}
                placeholder="San Francisco"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="state">State</Label>
                <Input
                  id="state"
                  name="state"
                  value={formData.state}
                  onChange={handleChange}
                  placeholder="CA"
                  maxLength={2}
                />
              </div>
              <div>
                <Label htmlFor="zip">ZIP Code</Label>
                <Input
                  id="zip"
                  name="zip"
                  value={formData.zip}
                  onChange={handleChange}
                  placeholder="94102"
                />
              </div>
            </div>
          </div>
        </Card>

        {/* Emergency Contact */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle className="h-5 w-5 text-blue-600" />
            <h2 className="text-xl font-semibold">Emergency Contact</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="emergencyContact">Emergency Contact Name</Label>
              <Input
                id="emergencyContact"
                name="emergencyContact"
                value={formData.emergencyContact}
                onChange={handleChange}
                placeholder="Jane Doe"
              />
            </div>

            <div>
              <Label htmlFor="emergencyPhone">Emergency Contact Phone</Label>
              <Input
                id="emergencyPhone"
                name="emergencyPhone"
                type="tel"
                value={formData.emergencyPhone}
                onChange={handleChange}
                placeholder="(555) 987-6543"
              />
            </div>
          </div>
        </Card>

        {/* Employment Details */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Briefcase className="h-5 w-5 text-blue-600" />
            <h2 className="text-xl font-semibold">Employment Details</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="hourlyRate">Hourly Rate ($)</Label>
              <Input
                id="hourlyRate"
                name="hourlyRate"
                type="number"
                value={formData.hourlyRate}
                disabled
                className="bg-gray-100 cursor-not-allowed"
              />
              <p className="text-xs text-gray-500 mt-1">
                Set by your administrator
              </p>
            </div>

            <div>
              <Label htmlFor="experience">Experience</Label>
              <Input
                id="experience"
                name="experience"
                value={formData.experience}
                onChange={handleChange}
                placeholder="5 years or Experienced"
              />
            </div>

            <div>
              <Label htmlFor="speed">Work Speed</Label>
              <Select
                id="speed"
                name="speed"
                value={formData.speed}
                onChange={handleChange}
              >
                <option value="Fast">Fast</option>
                <option value="Medium">Medium</option>
                <option value="Thorough">Thorough/Detailed</option>
              </Select>
              <p className="text-xs text-gray-500 mt-1">
                How you balance speed vs attention to detail
              </p>
            </div>

            <div>
              <Label htmlFor="company">Company</Label>
              <Input
                id="company"
                value={companyName}
                disabled
                className="bg-gray-100 cursor-not-allowed"
              />
            </div>
          </div>
        </Card>

        {/* Work Details */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Award className="h-5 w-5 text-blue-600" />
            <h2 className="text-xl font-semibold">Work Details</h2>
          </div>

          <div className="space-y-4">
            <div>
              <Label htmlFor="specialties">Specialties (comma separated)</Label>
              <Input
                id="specialties"
                name="specialties"
                value={formData.specialties}
                onChange={handleChange}
                placeholder="Deep Clean, Move-Out, Windows"
              />
              <p className="text-xs text-gray-500 mt-1">
                Your areas of expertise and special skills
              </p>
            </div>

            <div>
              <Label htmlFor="serviceAreas">Service Areas (comma separated)</Label>
              <Input
                id="serviceAreas"
                name="serviceAreas"
                value={formData.serviceAreas}
                onChange={handleChange}
                placeholder="94102, 94103, San Francisco, Oakland"
              />
              <p className="text-xs text-gray-500 mt-1">
                ZIP codes or city names where you prefer to work
              </p>
            </div>
          </div>
        </Card>

        {/* Save Button */}
        <div className="flex gap-3">
          <Button type="submit" disabled={saving} className="flex-1">
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.push('/cleaner/dashboard')}>
            Cancel
          </Button>
        </div>
      </form>

      {/* Help Section */}
      <Card className="p-6 mt-6 bg-blue-50 border-blue-200">
        <h3 className="font-semibold mb-2">Need Help?</h3>
        <p className="text-sm text-gray-600">
          If you need to update your email address, employee ID, or hourly rate,
          please contact your office administrator.
        </p>
      </Card>
    </div>
  );
}

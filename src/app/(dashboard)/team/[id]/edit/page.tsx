'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { ArrowLeft, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

export default function EditTeamMemberPage() {
  const router = useRouter();
  const params = useParams();
  const { data: session } = useSession();
  const memberId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [canEditHourlyRate, setCanEditHourlyRate] = useState(false);

  const [formData, setFormData] = useState({
    // User fields
    name: '',
    email: '',
    phone: '',

    // TeamMember fields
    hourlyRate: '',
    employeeId: '',
    emergencyContact: '',
    emergencyPhone: '',
    specialties: '',

    // Address
    street: '',
    city: '',
    state: '',
    zip: '',

    // Work details
    experience: '',
    speed: '',
    serviceAreas: '',
  });

  useEffect(() => {
    fetchTeamMember();
  }, [memberId]);

  const fetchTeamMember = async () => {
    try {
      const response = await fetch(`/api/team/members/${memberId}`);
      const data = await response.json();

      if (data.success) {
        const member = data.data;

        // Check if current user can edit hourly rate
        // Only OWNER can edit hourly rates
        const userRole = (session?.user as any)?.role;
        setCanEditHourlyRate(userRole === 'OWNER');

        setFormData({
          name: member.user.name || '',
          email: member.user.email || '',
          phone: member.user.phone || '',
          hourlyRate: member.hourlyRate?.toString() || '',
          employeeId: member.employeeId || '',
          emergencyContact: member.emergencyContact || '',
          emergencyPhone: member.emergencyPhone || '',
          specialties: member.specialties?.join(', ') || '',
          street: member.street || '',
          city: member.city || '',
          state: member.state || '',
          zip: member.zip || '',
          experience: member.experience || '',
          speed: member.speed || '',
          serviceAreas: member.serviceAreas?.join(', ') || '',
        });
      } else {
        alert('Failed to load team member');
        router.back();
      }
    } catch (error) {
      console.error('Failed to fetch team member:', error);
      alert('Failed to load team member');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const payload: any = {
        // User fields
        name: formData.name,
        email: formData.email,
        phone: formData.phone || null,

        // TeamMember fields
        employeeId: formData.employeeId || null,
        emergencyContact: formData.emergencyContact || null,
        emergencyPhone: formData.emergencyPhone || null,
        specialties: formData.specialties
          ? formData.specialties.split(',').map(s => s.trim()).filter(Boolean)
          : [],

        // Address
        street: formData.street || null,
        city: formData.city || null,
        state: formData.state || null,
        zip: formData.zip || null,

        // Work details
        experience: formData.experience || null,
        speed: formData.speed || null,
        serviceAreas: formData.serviceAreas
          ? formData.serviceAreas.split(',').map(s => s.trim()).filter(Boolean)
          : [],
      };

      // Only include hourlyRate if user is OWNER
      if (canEditHourlyRate && formData.hourlyRate) {
        payload.hourlyRate = parseFloat(formData.hourlyRate);
      }

      const response = await fetch(`/api/team/members/${memberId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.success) {
        alert('Team member updated successfully!');
        router.push('/team');
      } else {
        alert(data.error || 'Failed to update team member');
      }
    } catch (error) {
      console.error('Update error:', error);
      alert('Failed to update team member');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="text-center">Loading team member...</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <Button variant="outline" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
      </div>

      <h1 className="text-3xl font-bold mb-6">Edit Team Member</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Basic Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Full Name <span className="text-red-500">*</span>
              </label>
              <Input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Email <span className="text-red-500">*</span>
              </label>
              <Input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Phone</label>
              <Input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="(555) 123-4567"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Employee ID</label>
              <Input
                type="text"
                name="employeeId"
                value={formData.employeeId}
                onChange={handleChange}
                placeholder="EMP-001"
              />
            </div>
          </div>
        </Card>

        {/* Employment Details */}
        {canEditHourlyRate && (
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Employment Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Hourly Rate ($)</label>
                <Input
                  type="number"
                  name="hourlyRate"
                  value={formData.hourlyRate}
                  onChange={handleChange}
                  step="0.01"
                  min="0"
                  placeholder="25.00"
                />
              </div>
            </div>
          </Card>
        )}

        {/* Address */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Address</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Street Address</label>
              <Input
                type="text"
                name="street"
                value={formData.street}
                onChange={handleChange}
                placeholder="123 Main St"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">City</label>
                <Input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  placeholder="San Francisco"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">State</label>
                <Input
                  type="text"
                  name="state"
                  value={formData.state}
                  onChange={handleChange}
                  placeholder="CA"
                  maxLength={2}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">ZIP Code</label>
                <Input
                  type="text"
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
          <h2 className="text-xl font-semibold mb-4">Emergency Contact</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Emergency Contact Name</label>
              <Input
                type="text"
                name="emergencyContact"
                value={formData.emergencyContact}
                onChange={handleChange}
                placeholder="John Doe"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Emergency Contact Phone</label>
              <Input
                type="tel"
                name="emergencyPhone"
                value={formData.emergencyPhone}
                onChange={handleChange}
                placeholder="(555) 123-4567"
              />
            </div>
          </div>
        </Card>

        {/* Work Details */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Work Details</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Experience Level</label>
                <Input
                  type="text"
                  name="experience"
                  value={formData.experience}
                  onChange={handleChange}
                  placeholder="e.g., Beginner, Intermediate, Expert"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Work Speed</label>
                <Input
                  type="text"
                  name="speed"
                  value={formData.speed}
                  onChange={handleChange}
                  placeholder="e.g., Fast, Medium, Thorough"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Specialties</label>
              <Input
                type="text"
                name="specialties"
                value={formData.specialties}
                onChange={handleChange}
                placeholder="Deep Cleaning, Move-out, Commercial (comma separated)"
              />
              <p className="text-xs text-gray-500 mt-1">Separate multiple specialties with commas</p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Service Areas</label>
              <Input
                type="text"
                name="serviceAreas"
                value={formData.serviceAreas}
                onChange={handleChange}
                placeholder="Downtown, Suburbs, North District (comma separated)"
              />
              <p className="text-xs text-gray-500 mt-1">Separate multiple areas with commas</p>
            </div>
          </div>
        </Card>

        {/* Submit Button */}
        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            <Save className="h-4 w-4 mr-2" />
            {submitting ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </div>
  );
}

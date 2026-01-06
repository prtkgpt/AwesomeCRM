'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { User, Mail, Phone, Building, Save } from 'lucide-react';

export default function CleanerProfilePage() {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
  });
  const [companyName, setCompanyName] = useState('');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated' && session?.user) {
      // Load user data from session
      setFormData({
        name: session.user.name || '',
        email: session.user.email || '',
        phone: session.user.phone || '',
      });
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
        });
        setCompanyName(data.companyName || '');
      }
    } catch (error) {
      console.error('Failed to fetch profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const res = await fetch('/api/cleaner/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          phone: formData.phone,
        }),
      });

      if (res.ok) {
        const data = await res.json();

        // Update session with new data
        await update({
          name: data.name,
          phone: data.phone,
        });

        alert('Profile updated successfully!');
      } else {
        const error = await res.json();
        alert(error.error || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Failed to update profile:', error);
      alert('Failed to update profile');
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
      <h1 className="text-3xl font-bold mb-6">My Profile</h1>

      <div className="grid gap-6">
        {/* Profile Information */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Profile Information</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium mb-2">
                <User className="h-4 w-4 inline mr-2" />
                Full Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
                placeholder="John Doe"
                required
              />
            </div>

            {/* Email (Read-only) */}
            <div>
              <label className="block text-sm font-medium mb-2">
                <Mail className="h-4 w-4 inline mr-2" />
                Email Address
              </label>
              <input
                type="email"
                value={formData.email}
                disabled
                className="w-full border rounded-lg px-3 py-2 bg-gray-100 cursor-not-allowed"
              />
              <p className="text-xs text-gray-500 mt-1">
                Email cannot be changed. Contact your administrator if you need to update it.
              </p>
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium mb-2">
                <Phone className="h-4 w-4 inline mr-2" />
                Phone Number
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
                placeholder="+1 (555) 123-4567"
              />
            </div>

            {/* Company (Read-only) */}
            <div>
              <label className="block text-sm font-medium mb-2">
                <Building className="h-4 w-4 inline mr-2" />
                Company
              </label>
              <input
                type="text"
                value={companyName}
                disabled
                className="w-full border rounded-lg px-3 py-2 bg-gray-100 cursor-not-allowed"
              />
            </div>

            {/* Save Button */}
            <div className="flex justify-end pt-4">
              <Button type="submit" disabled={saving}>
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </Card>

        {/* Account Info */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Account Information</h2>

          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-sm text-gray-600">Account Type</span>
              <span className="font-medium">Cleaner</span>
            </div>

            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-sm text-gray-600">Company</span>
              <span className="font-medium">{companyName}</span>
            </div>

            <div className="flex justify-between items-center py-2">
              <span className="text-sm text-gray-600">Email</span>
              <span className="font-medium">{formData.email}</span>
            </div>
          </div>
        </Card>

        {/* Help Section */}
        <Card className="p-6 bg-blue-50 border-blue-200">
          <h3 className="font-semibold mb-2">Need Help?</h3>
          <p className="text-sm text-gray-600">
            If you need to update your email address or have any account issues,
            please contact your office administrator.
          </p>
        </Card>
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Sparkles,
  ShoppingBag,
  Dog,
  Key,
  MessageSquare,
  FileText,
  Save,
  AlertCircle
} from 'lucide-react';

interface ClientPreferences {
  cleaningSequence?: string | null;
  areasToFocus?: string | null;
  areasToAvoid?: string | null;
  productAllergies?: string | null;
  preferredProducts?: string | null;
  avoidScents?: boolean;
  scentPreferences?: string | null;
  petHandlingInstructions?: string | null;
  petFeedingNeeded?: boolean;
  petFeedingInstructions?: string | null;
  preferredContactMethod?: string | null;
  notificationPreferences?: string | null;
  languagePreference?: string | null;
  keyLocation?: string | null;
  alarmCode?: string | null;
  entryInstructions?: string | null;
  specialRequests?: string | null;
  thingsToKnow?: string | null;
  temperaturePreferences?: string | null;
}

export default function CustomerPreferencesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [preferences, setPreferences] = useState<ClientPreferences>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated') {
      fetchPreferences();
    }
  }, [status, router]);

  const fetchPreferences = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/customer/preferences');
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.data) {
          setPreferences(data.data);
        }
      }
    } catch (error) {
      console.error('Failed to fetch preferences:', error);
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
      const res = await fetch('/api/customer/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(preferences),
      });

      const data = await res.json();

      if (data.success) {
        setMessage('✅ Preferences saved successfully!');
        setTimeout(() => setMessage(''), 3000);
      } else {
        setError(data.error || 'Failed to save preferences');
      }
    } catch (error) {
      setError('An error occurred. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const updatePreference = (field: keyof ClientPreferences, value: any) => {
    setPreferences(prev => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-center">Loading your preferences...</div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">My Cleaning Preferences</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Help us provide the best service by sharing your preferences and requirements.
          Our cleaners will see this information before each service.
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
        {/* Cleaning Preferences */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-blue-600" />
            Cleaning Preferences
          </h2>
          <div className="space-y-4">
            <div>
              <Label htmlFor="cleaningSequence">Preferred Cleaning Order</Label>
              <Textarea
                id="cleaningSequence"
                value={preferences.cleaningSequence || ''}
                onChange={(e) => updatePreference('cleaningSequence', e.target.value)}
                placeholder="e.g., Start with kitchen, then bathrooms, bedrooms last..."
                rows={3}
                className="mt-1"
              />
              <p className="text-xs text-gray-500 mt-1">Tell us which rooms to clean first</p>
            </div>

            <div>
              <Label htmlFor="areasToFocus">Areas Needing Extra Attention</Label>
              <Textarea
                id="areasToFocus"
                value={preferences.areasToFocus || ''}
                onChange={(e) => updatePreference('areasToFocus', e.target.value)}
                placeholder="e.g., Kitchen counters, bathroom tiles, hardwood floors..."
                rows={3}
                className="mt-1"
              />
              <p className="text-xs text-gray-500 mt-1">Areas you'd like us to focus on</p>
            </div>

            <div>
              <Label htmlFor="areasToAvoid">Areas to Avoid or Not Touch</Label>
              <Textarea
                id="areasToAvoid"
                value={preferences.areasToAvoid || ''}
                onChange={(e) => updatePreference('areasToAvoid', e.target.value)}
                placeholder="e.g., Home office desk, bedroom closet, antique furniture..."
                rows={3}
                className="mt-1"
              />
              <p className="text-xs text-gray-500 mt-1">Areas we should not touch</p>
            </div>
          </div>
        </Card>

        {/* Product Preferences */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-green-600" />
            Product Preferences & Allergies
          </h2>
          <div className="space-y-4">
            <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 p-4 rounded-lg">
              <Label htmlFor="productAllergies" className="text-red-800 dark:text-red-200 font-semibold">
                ⚠️ Product Allergies or Sensitivities
              </Label>
              <Textarea
                id="productAllergies"
                value={preferences.productAllergies || ''}
                onChange={(e) => updatePreference('productAllergies', e.target.value)}
                placeholder="e.g., Allergic to bleach, ammonia causes breathing issues..."
                rows={2}
                className="mt-2 bg-white dark:bg-gray-900"
              />
              <p className="text-xs text-red-700 dark:text-red-300 mt-1">
                Critical: Our cleaners will avoid these products
              </p>
            </div>

            <div>
              <Label htmlFor="preferredProducts">Preferred Cleaning Products</Label>
              <Textarea
                id="preferredProducts"
                value={preferences.preferredProducts || ''}
                onChange={(e) => updatePreference('preferredProducts', e.target.value)}
                placeholder="e.g., Only use Method brand, prefer eco-friendly products..."
                rows={2}
                className="mt-1"
              />
            </div>

            <div className="flex items-start space-x-3">
              <Checkbox
                id="avoidScents"
                checked={preferences.avoidScents || false}
                onCheckedChange={(checked) => updatePreference('avoidScents', checked)}
              />
              <div>
                <Label htmlFor="avoidScents" className="font-semibold">
                  Scent-Free Cleaning Required
                </Label>
                <p className="text-xs text-gray-500">Check if you need unscented products only</p>
              </div>
            </div>

            {preferences.avoidScents && (
              <div>
                <Label htmlFor="scentPreferences">Scent Sensitivity Details</Label>
                <Input
                  id="scentPreferences"
                  value={preferences.scentPreferences || ''}
                  onChange={(e) => updatePreference('scentPreferences', e.target.value)}
                  placeholder="e.g., Severe headaches from fragrances..."
                  className="mt-1"
                />
              </div>
            )}
          </div>
        </Card>

        {/* Pet Handling */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Dog className="h-5 w-5 text-purple-600" />
            Pet Care Instructions
          </h2>
          <div className="space-y-4">
            <div>
              <Label htmlFor="petHandlingInstructions">Pet Handling Instructions</Label>
              <Textarea
                id="petHandlingInstructions"
                value={preferences.petHandlingInstructions || ''}
                onChange={(e) => updatePreference('petHandlingInstructions', e.target.value)}
                placeholder="e.g., Dog is friendly but keep in backyard, cat hides under bed..."
                rows={3}
                className="mt-1"
              />
            </div>

            <div className="flex items-start space-x-3">
              <Checkbox
                id="petFeedingNeeded"
                checked={preferences.petFeedingNeeded || false}
                onCheckedChange={(checked) => updatePreference('petFeedingNeeded', checked)}
              />
              <div>
                <Label htmlFor="petFeedingNeeded" className="font-semibold">
                  Pet Feeding Required
                </Label>
                <p className="text-xs text-gray-500">Check if cleaner should feed your pets</p>
              </div>
            </div>

            {preferences.petFeedingNeeded && (
              <div>
                <Label htmlFor="petFeedingInstructions">Feeding Instructions</Label>
                <Textarea
                  id="petFeedingInstructions"
                  value={preferences.petFeedingInstructions || ''}
                  onChange={(e) => updatePreference('petFeedingInstructions', e.target.value)}
                  placeholder="e.g., 1 cup dry food in blue bowl at noon, fresh water daily..."
                  rows={2}
                  className="mt-1"
                />
              </div>
            )}
          </div>
        </Card>

        {/* Access & Entry */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Key className="h-5 w-5 text-orange-600" />
            Access & Entry Information
          </h2>
          <div className="space-y-4">
            <div>
              <Label htmlFor="keyLocation">Key Location</Label>
              <Input
                id="keyLocation"
                value={preferences.keyLocation || ''}
                onChange={(e) => updatePreference('keyLocation', e.target.value)}
                placeholder="e.g., Under flower pot by front door, with doorman..."
                className="mt-1"
              />
            </div>

            <div className="bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 p-4 rounded-lg">
              <Label htmlFor="alarmCode" className="font-semibold">
                🔐 Security Alarm Code
              </Label>
              <Input
                id="alarmCode"
                value={preferences.alarmCode || ''}
                onChange={(e) => updatePreference('alarmCode', e.target.value)}
                placeholder="e.g., 1234#"
                className="mt-2 font-mono bg-white dark:bg-gray-900"
              />
              <p className="text-xs text-orange-700 dark:text-orange-300 mt-1">
                Your alarm code is securely stored and only visible to assigned cleaners
              </p>
            </div>

            <div>
              <Label htmlFor="entryInstructions">Entry Instructions</Label>
              <Textarea
                id="entryInstructions"
                value={preferences.entryInstructions || ''}
                onChange={(e) => updatePreference('entryInstructions', e.target.value)}
                placeholder="e.g., Use side door, front door lock is broken..."
                rows={2}
                className="mt-1"
              />
            </div>
          </div>
        </Card>

        {/* Communication Preferences */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-blue-600" />
            Communication Preferences
          </h2>
          <div className="space-y-4">
            <div>
              <Label htmlFor="preferredContactMethod">Preferred Contact Method</Label>
              <select
                id="preferredContactMethod"
                value={preferences.preferredContactMethod || ''}
                onChange={(e) => updatePreference('preferredContactMethod', e.target.value)}
                className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800"
              >
                <option value="">Select...</option>
                <option value="Email">Email</option>
                <option value="Phone">Phone</option>
                <option value="Text">Text Message</option>
              </select>
            </div>

            <div>
              <Label htmlFor="notificationPreferences">Notification Preferences</Label>
              <Input
                id="notificationPreferences"
                value={preferences.notificationPreferences || ''}
                onChange={(e) => updatePreference('notificationPreferences', e.target.value)}
                placeholder="e.g., Text 30 minutes before arrival..."
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="languagePreference">Language Preference</Label>
              <Input
                id="languagePreference"
                value={preferences.languagePreference || ''}
                onChange={(e) => updatePreference('languagePreference', e.target.value)}
                placeholder="e.g., English, Spanish..."
                className="mt-1"
              />
            </div>
          </div>
        </Card>

        {/* Special Instructions */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <FileText className="h-5 w-5 text-indigo-600" />
            Additional Information
          </h2>
          <div className="space-y-4">
            <div>
              <Label htmlFor="specialRequests">Special Requests</Label>
              <Textarea
                id="specialRequests"
                value={preferences.specialRequests || ''}
                onChange={(e) => updatePreference('specialRequests', e.target.value)}
                placeholder="e.g., Please water plants in living room, bring in mail..."
                rows={3}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="thingsToKnow">Important Things to Know</Label>
              <Textarea
                id="thingsToKnow"
                value={preferences.thingsToKnow || ''}
                onChange={(e) => updatePreference('thingsToKnow', e.target.value)}
                placeholder="e.g., Security cameras in hallway, motion sensor lights activate at 6pm..."
                rows={3}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="temperaturePreferences">Temperature Preferences</Label>
              <Input
                id="temperaturePreferences"
                value={preferences.temperaturePreferences || ''}
                onChange={(e) => updatePreference('temperaturePreferences', e.target.value)}
                placeholder="e.g., Keep AC at 72°F, don't touch thermostat..."
                className="mt-1"
              />
            </div>
          </div>
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
            {saving ? 'Saving...' : 'Save Preferences'}
          </Button>
        </div>
      </form>
    </div>
  );
}

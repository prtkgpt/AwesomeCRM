'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Save, AlertCircle, CheckCircle2 } from 'lucide-react';

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
  lastVisitNotes?: string | null;
}

interface PreferenceFormProps {
  clientId: string;
}

export function PreferenceForm({ clientId }: PreferenceFormProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [preferences, setPreferences] = useState<ClientPreferences>({});

  useEffect(() => {
    fetchPreferences();
  }, [clientId]);

  const fetchPreferences = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/clients/${clientId}/preferences`);
      const data = await res.json();

      if (res.ok && data.success) {
        setPreferences(data.data || {});
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
    setError('');
    setSuccess(false);

    try {
      const res = await fetch(`/api/clients/${clientId}/preferences`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(preferences),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      } else {
        setError(data.error || 'Failed to save preferences');
      }
    } catch (error) {
      console.error('Failed to save preferences:', error);
      setError('Failed to save preferences');
    } finally {
      setSaving(false);
    }
  };

  const updateField = (field: keyof ClientPreferences, value: any) => {
    setPreferences((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="text-center text-gray-500">Loading preferences...</div>
      </Card>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Cleaning Preferences */}
      <Card className="p-6">
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
          🧹 Cleaning Preferences
        </h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Cleaning Sequence
            </label>
            <textarea
              value={preferences.cleaningSequence || ''}
              onChange={(e) => updateField('cleaningSequence', e.target.value)}
              placeholder="e.g., Start with kitchen, then bathrooms, bedrooms last"
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              rows={2}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Areas to Focus On
            </label>
            <textarea
              value={preferences.areasToFocus || ''}
              onChange={(e) => updateField('areasToFocus', e.target.value)}
              placeholder="e.g., Extra attention to kitchen counters and bathroom fixtures"
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              rows={2}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Areas to Avoid
            </label>
            <textarea
              value={preferences.areasToAvoid || ''}
              onChange={(e) => updateField('areasToAvoid', e.target.value)}
              placeholder="e.g., Don't move items on desk, avoid master bedroom closet"
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              rows={2}
            />
          </div>
        </div>
      </Card>

      {/* Product Preferences */}
      <Card className="p-6">
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
          🧴 Product Preferences
        </h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Product Allergies / Sensitivities
            </label>
            <textarea
              value={preferences.productAllergies || ''}
              onChange={(e) => updateField('productAllergies', e.target.value)}
              placeholder="e.g., Allergic to bleach, use only natural products"
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              rows={2}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Preferred Products
            </label>
            <input
              type="text"
              value={preferences.preferredProducts || ''}
              onChange={(e) => updateField('preferredProducts', e.target.value)}
              placeholder="e.g., Customer provides own eco-friendly products"
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            />
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="avoidScents"
              checked={preferences.avoidScents || false}
              onChange={(e) => updateField('avoidScents', e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="avoidScents" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Avoid scented products
            </label>
          </div>

          {!preferences.avoidScents && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Scent Preferences
              </label>
              <input
                type="text"
                value={preferences.scentPreferences || ''}
                onChange={(e) => updateField('scentPreferences', e.target.value)}
                placeholder="e.g., Lavender OK, no citrus"
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              />
            </div>
          )}
        </div>
      </Card>

      {/* Pet Handling */}
      <Card className="p-6">
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
          🐾 Pet Handling
        </h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Pet Handling Instructions
            </label>
            <textarea
              value={preferences.petHandlingInstructions || ''}
              onChange={(e) => updateField('petHandlingInstructions', e.target.value)}
              placeholder="e.g., Keep dog in backyard during cleaning, cat is shy and hides"
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              rows={2}
            />
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="petFeedingNeeded"
              checked={preferences.petFeedingNeeded || false}
              onChange={(e) => updateField('petFeedingNeeded', e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="petFeedingNeeded" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Pet feeding needed
            </label>
          </div>

          {preferences.petFeedingNeeded && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Pet Feeding Instructions
              </label>
              <textarea
                value={preferences.petFeedingInstructions || ''}
                onChange={(e) => updateField('petFeedingInstructions', e.target.value)}
                placeholder="e.g., Feed cat if visit is over 2 hours, food is in pantry"
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                rows={2}
              />
            </div>
          )}
        </div>
      </Card>

      {/* Access & Entry */}
      <Card className="p-6">
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
          🔑 Access & Entry
        </h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Key Location
            </label>
            <input
              type="text"
              value={preferences.keyLocation || ''}
              onChange={(e) => updateField('keyLocation', e.target.value)}
              placeholder="e.g., Spare key under flower pot by front door"
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Alarm Code
            </label>
            <input
              type="text"
              value={preferences.alarmCode || ''}
              onChange={(e) => updateField('alarmCode', e.target.value)}
              placeholder="Home alarm code"
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Entry Instructions
            </label>
            <textarea
              value={preferences.entryInstructions || ''}
              onChange={(e) => updateField('entryInstructions', e.target.value)}
              placeholder="e.g., Use back door, front door lock is broken"
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              rows={2}
            />
          </div>
        </div>
      </Card>

      {/* Communication */}
      <Card className="p-6">
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
          💬 Communication
        </h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Preferred Contact Method
            </label>
            <select
              value={preferences.preferredContactMethod || ''}
              onChange={(e) => updateField('preferredContactMethod', e.target.value)}
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            >
              <option value="">Select method...</option>
              <option value="SMS">SMS/Text</option>
              <option value="Email">Email</option>
              <option value="Phone">Phone Call</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Notification Preferences
            </label>
            <input
              type="text"
              value={preferences.notificationPreferences || ''}
              onChange={(e) => updateField('notificationPreferences', e.target.value)}
              placeholder="e.g., Text 30 min before arrival, no calls after 8pm"
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Language Preference
            </label>
            <select
              value={preferences.languagePreference || ''}
              onChange={(e) => updateField('languagePreference', e.target.value)}
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            >
              <option value="">Select language...</option>
              <option value="English">English</option>
              <option value="Spanish">Spanish</option>
              <option value="French">French</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Special Instructions */}
      <Card className="p-6">
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
          ⭐ Special Instructions
        </h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Special Requests
            </label>
            <textarea
              value={preferences.specialRequests || ''}
              onChange={(e) => updateField('specialRequests', e.target.value)}
              placeholder="e.g., Please water plants in living room"
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              rows={2}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Things to Know
            </label>
            <textarea
              value={preferences.thingsToKnow || ''}
              onChange={(e) => updateField('thingsToKnow', e.target.value)}
              placeholder="e.g., Toilet in hall bath doesn't flush well, jiggle handle"
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              rows={2}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Temperature Preferences
            </label>
            <input
              type="text"
              value={preferences.temperaturePreferences || ''}
              onChange={(e) => updateField('temperaturePreferences', e.target.value)}
              placeholder="e.g., Please keep AC at 72°F during summer"
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            />
          </div>
        </div>
      </Card>

      {/* Error/Success Messages */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2 text-red-600 dark:text-red-400">
          <AlertCircle className="h-5 w-5" />
          {error}
        </div>
      )}

      {success && (
        <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex items-center gap-2 text-green-600 dark:text-green-400">
          <CheckCircle2 className="h-5 w-5" />
          Preferences saved successfully!
        </div>
      )}

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          type="submit"
          disabled={saving}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Saving...' : 'Save Preferences'}
        </Button>
      </div>
    </form>
  );
}

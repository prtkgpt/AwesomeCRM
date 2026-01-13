'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Save, Gift, Users, DollarSign, TrendingUp } from 'lucide-react';

export default function ReferralSettingsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    referralEnabled: false,
    referralReferrerReward: 25,
    referralRefereeReward: 25,
  });

  useEffect(() => {
    // Check if user is OWNER
    const userRole = (session?.user as any)?.role;
    if (userRole && userRole !== 'OWNER') {
      router.push('/settings');
      return;
    }

    if (session) {
      fetchSettings();
    }
  }, [session, router]);

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/company/referral-settings');
      const data = await response.json();

      if (data.success) {
        setSettings(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch referral settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const response = await fetch('/api/company/referral-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      const data = await response.json();

      if (data.success) {
        alert('✅ Referral settings saved successfully!');
      } else {
        alert(`❌ ${data.error || 'Failed to save settings'}`);
      }
    } catch (error) {
      alert('An error occurred. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4 max-w-4xl mx-auto">
        <div className="text-center py-8">Loading...</div>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Referral Program</h1>
        <p className="text-gray-600 mt-1">
          Configure your customer referral program to grow through word-of-mouth
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Enable/Disable Toggle */}
        <Card className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h2 className="text-xl font-semibold mb-2 flex items-center gap-2">
                <Gift className="h-5 w-5 text-purple-600" />
                Enable Referral Program
              </h2>
              <p className="text-sm text-gray-600">
                Allow customers to refer friends and earn rewards. When enabled, customers will see their unique referral code and can track referrals.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer ml-4">
              <input
                type="checkbox"
                checked={settings.referralEnabled}
                onChange={(e) => setSettings({ ...settings, referralEnabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-14 h-7 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-purple-600"></div>
            </label>
          </div>
        </Card>

        {/* Reward Configuration */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-green-600" />
            Reward Amounts
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Referrer Reward */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reward for Referrer
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</div>
                <Input
                  type="number"
                  value={settings.referralReferrerReward}
                  onChange={(e) => setSettings({ ...settings, referralReferrerReward: parseFloat(e.target.value) || 0 })}
                  className="pl-7"
                  min="0"
                  step="0.01"
                  placeholder="25.00"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Credit given to existing customer who refers a friend
              </p>
            </div>

            {/* Referee Reward */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reward for New Customer
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</div>
                <Input
                  type="number"
                  value={settings.referralRefereeReward}
                  onChange={(e) => setSettings({ ...settings, referralRefereeReward: parseFloat(e.target.value) || 0 })}
                  className="pl-7"
                  min="0"
                  step="0.01"
                  placeholder="25.00"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Credit given to the new customer being referred
              </p>
            </div>
          </div>

          {/* Example Preview */}
          <div className="mt-6 p-4 bg-purple-50 border border-purple-200 rounded-lg">
            <h3 className="font-semibold text-purple-900 mb-2 flex items-center gap-2">
              <Users className="h-4 w-4" />
              How It Works
            </h3>
            <div className="text-sm text-purple-800 space-y-1">
              <p>
                1. <strong>Sarah</strong> (existing customer) shares her referral code with <strong>John</strong>
              </p>
              <p>
                2. <strong>John</strong> signs up using Sarah's code
              </p>
              <p>
                3. <strong>Sarah</strong> gets <span className="font-bold">${settings.referralReferrerReward.toFixed(2)} credit</span> added to her account
              </p>
              <p>
                4. <strong>John</strong> gets <span className="font-bold">${settings.referralRefereeReward.toFixed(2)} credit</span> off his first booking
              </p>
            </div>
          </div>
        </Card>

        {/* Benefits Card */}
        <Card className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200">
          <h2 className="text-xl font-semibold mb-3 flex items-center gap-2 text-blue-900">
            <TrendingUp className="h-5 w-5" />
            Benefits of Referral Program
          </h2>
          <ul className="space-y-2 text-sm text-blue-800">
            <li className="flex items-start gap-2">
              <span className="text-green-600 mt-0.5">✓</span>
              <span><strong>Lower acquisition cost:</strong> Referred customers cost less than paid ads</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-600 mt-0.5">✓</span>
              <span><strong>Higher trust:</strong> People trust recommendations from friends</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-600 mt-0.5">✓</span>
              <span><strong>Better retention:</strong> Referred customers tend to stay longer</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-600 mt-0.5">✓</span>
              <span><strong>Automatic marketing:</strong> Your happy customers become your sales team</span>
            </li>
          </ul>
        </Card>

        {/* Save Button */}
        <div className="flex gap-3">
          <Button
            type="submit"
            disabled={saving}
            className="flex-1 bg-purple-600 hover:bg-purple-700"
            size="lg"
          >
            <Save className="h-5 w-5 mr-2" />
            {saving ? 'Saving...' : 'Save Settings'}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push('/settings')}
            size="lg"
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}

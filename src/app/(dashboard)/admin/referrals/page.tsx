'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import {
  Trophy,
  TrendingUp,
  DollarSign,
  Users,
  Gift,
  AlertCircle,
} from 'lucide-react';
import Link from 'next/link';

interface ReferralAnalytics {
  programEnabled: boolean;
  referrerReward: number;
  refereeReward: number;
  totalReferrals: number;
  creditsIssued: number;
  creditsRedeemed: number;
  creditsOutstanding: number;
  topReferrers: Array<{
    id: string;
    name: string;
    email: string | null;
    referralCode: string | null;
    referralCount: number;
    creditsEarned: number;
    creditsBalance: number;
  }>;
  recentReferrals: Array<{
    id: string;
    name: string;
    email: string | null;
    createdAt: string;
    referredBy: {
      id: string;
      name: string;
    } | null;
  }>;
}

export default function AdminReferralsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<ReferralAnalytics | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check if user is ADMIN or OWNER
    const userRole = (session?.user as any)?.role;
    if (userRole && userRole !== 'OWNER' && userRole !== 'ADMIN') {
      router.push('/dashboard');
      return;
    }

    if (session) {
      fetchAnalytics();
    }
  }, [session, router]);

  const fetchAnalytics = async () => {
    try {
      const response = await fetch('/api/admin/referral-analytics');
      const data = await response.json();

      if (data.success) {
        setAnalytics(data.data);
        setError(null);
      } else {
        setError(data.error || 'Failed to load analytics');
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
      setError('An error occurred while loading analytics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4 max-w-7xl mx-auto">
        <div className="text-center py-8">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 max-w-7xl mx-auto">
        <Card className="p-6">
          <div className="text-center py-8">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-red-600 mb-2">{error}</p>
            <p className="text-sm text-gray-600">
              Please check your permissions or contact support.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  if (!analytics) {
    return null;
  }

  if (!analytics.programEnabled) {
    return (
      <div className="p-4 max-w-7xl mx-auto">
        <Card className="p-8 text-center">
          <Gift className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Referral Program Not Enabled</h2>
          <p className="text-gray-600 mb-6">
            Enable the referral program in settings to start tracking referrals and rewards.
          </p>
          <Link
            href="/settings/referral"
            className="inline-flex items-center px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-semibold"
          >
            Go to Referral Settings
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Trophy className="h-8 w-8 text-yellow-600" />
            Referral Analytics
          </h1>
          <p className="text-gray-600 mt-1">
            Track referral performance and customer growth
          </p>
        </div>
        <Link
          href="/settings/referral"
          className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium"
        >
          Settings
        </Link>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-6 bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Referrals</p>
              <p className="text-3xl font-bold text-purple-700 mt-1">
                {analytics.totalReferrals}
              </p>
            </div>
            <Users className="h-12 w-12 text-purple-400" />
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Credits Issued</p>
              <p className="text-3xl font-bold text-green-700 mt-1">
                ${analytics.creditsIssued.toFixed(0)}
              </p>
            </div>
            <TrendingUp className="h-12 w-12 text-green-400" />
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Credits Redeemed</p>
              <p className="text-3xl font-bold text-blue-700 mt-1">
                ${analytics.creditsRedeemed.toFixed(0)}
              </p>
            </div>
            <DollarSign className="h-12 w-12 text-blue-400" />
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-orange-50 to-amber-50 border-2 border-orange-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Outstanding</p>
              <p className="text-3xl font-bold text-orange-700 mt-1">
                ${analytics.creditsOutstanding.toFixed(0)}
              </p>
            </div>
            <Gift className="h-12 w-12 text-orange-400" />
          </div>
        </Card>
      </div>

      {/* Leaderboard */}
      <Card className="p-6">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Trophy className="h-6 w-6 text-yellow-600" />
          Top Referrers
        </h2>

        {analytics.topReferrers.length > 0 ? (
          <div className="space-y-2">
            {analytics.topReferrers.map((client, index) => (
              <div
                key={client.id}
                className={`flex items-center justify-between p-4 rounded-lg border-2 ${
                  index === 0
                    ? 'bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-300'
                    : index === 1
                    ? 'bg-gradient-to-r from-gray-50 to-slate-50 border-gray-300'
                    : index === 2
                    ? 'bg-gradient-to-r from-orange-50 to-amber-50 border-orange-200'
                    : 'bg-gray-50 border-gray-200'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${
                      index === 0
                        ? 'bg-yellow-400 text-yellow-900'
                        : index === 1
                        ? 'bg-gray-400 text-gray-900'
                        : index === 2
                        ? 'bg-orange-400 text-orange-900'
                        : 'bg-gray-300 text-gray-700'
                    }`}
                  >
                    {index + 1}
                  </div>
                  <div>
                    <Link
                      href={`/clients/${client.id}`}
                      className="font-semibold hover:underline"
                    >
                      {client.name}
                    </Link>
                    {client.email && (
                      <p className="text-sm text-gray-600">{client.email}</p>
                    )}
                    <p className="text-xs text-gray-500 mt-1">
                      Code: {client.referralCode}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-lg text-purple-700">
                    {client.referralCount} {client.referralCount === 1 ? 'referral' : 'referrals'}
                  </p>
                  <p className="text-sm text-green-600 font-semibold">
                    ${client.creditsEarned.toFixed(2)} earned
                  </p>
                  <p className="text-xs text-gray-500">
                    ${client.creditsBalance.toFixed(2)} available
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <Users className="h-12 w-12 mx-auto mb-2 text-gray-400" />
            <p>No referrals yet</p>
          </div>
        )}
      </Card>

      {/* Recent Referrals */}
      <Card className="p-6">
        <h2 className="text-xl font-bold mb-4">Recent Referrals (Last 30 Days)</h2>

        {analytics.recentReferrals.length > 0 ? (
          <div className="space-y-2">
            {analytics.recentReferrals.map((client) => (
              <div
                key={client.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border"
              >
                <div>
                  <Link
                    href={`/clients/${client.id}`}
                    className="font-semibold hover:underline"
                  >
                    {client.name}
                  </Link>
                  {client.email && (
                    <p className="text-sm text-gray-600">{client.email}</p>
                  )}
                  {client.referredBy && (
                    <p className="text-xs text-gray-500 mt-1">
                      Referred by: {client.referredBy.name}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600">
                    {new Date(client.createdAt).toLocaleDateString()}
                  </p>
                  <p className="text-xs text-green-600 font-medium">
                    +${analytics.referrerReward + analytics.refereeReward} value
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <Gift className="h-12 w-12 mx-auto mb-2 text-gray-400" />
            <p>No recent referrals</p>
          </div>
        )}
      </Card>
    </div>
  );
}

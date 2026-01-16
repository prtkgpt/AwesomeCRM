'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Gift,
  Copy,
  Check,
  Users,
  DollarSign,
  Share2,
  TrendingUp,
  Mail,
  MessageCircle,
  AlertCircle,
  Clock
} from 'lucide-react';

interface ReferralStats {
  referralCode: string;
  referralCount: number;
  referrals: Array<{
    id: string;
    name: string;
    email: string | null;
    createdAt: string;
  }>;
  creditsEarned: number;
  creditsUsed: number;
  creditsBalance: number;
  referrerReward: number;
  refereeReward: number;
  // Tier info
  currentTier: 'NONE' | 'BRONZE' | 'SILVER' | 'GOLD';
  tierInfo: {
    name: string;
    color: string;
    icon: string;
    bonus: number;
    minReferrals?: number;
    maxReferrals?: number;
  };
  tierBonusEarned: number;
  nextTier: string | null;
  referralsToNextTier: number;
  // Expiration info
  creditExpirationDays: number;
  expiringCredits: Array<{
    amount: number;
    expiresAt: string | null;
  }>;
  expiringAmount: number;
}

export default function ReferralsPage() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/referrals/stats');
      const data = await response.json();

      if (data.success) {
        setStats(data.data);
        setError(null);
      } else {
        setError(data.error || 'Failed to load referral statistics');
      }
    } catch (error) {
      console.error('Failed to fetch referral stats:', error);
      setError('An error occurred while loading referral statistics');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCode = async () => {
    if (!stats?.referralCode) return;

    try {
      await navigator.clipboard.writeText(stats.referralCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      alert('Failed to copy code');
    }
  };

  const handleShareEmail = () => {
    if (!stats) return;

    const subject = encodeURIComponent('Get $' + stats.refereeReward + ' off your first cleaning!');
    const body = encodeURIComponent(
      `Hi! I wanted to share this amazing cleaning service with you.\n\n` +
      `Use my referral code ${stats.referralCode} when you sign up and you'll get $${stats.refereeReward} off your first cleaning!\n\n` +
      `I've been really happy with their service and thought you might like it too.`
    );
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  const handleShareSMS = () => {
    if (!stats) return;

    const message = encodeURIComponent(
      `Hey! Use my code ${stats.referralCode} to get $${stats.refereeReward} off your first cleaning!`
    );
    window.location.href = `sms:?body=${message}`;
  };

  if (loading) {
    return (
      <div className="p-4 max-w-6xl mx-auto">
        <div className="text-center py-8">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 max-w-6xl mx-auto">
        <Card className="p-6">
          <div className="text-center py-8">
            <p className="text-red-600 mb-4">{error}</p>
            <p className="text-sm text-gray-600">
              The referral program may not be enabled for your account.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  return (
    <div className="p-4 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Gift className="h-8 w-8 text-purple-600" />
          Referral Program
        </h1>
        <p className="text-gray-600 mt-1">
          Share the love and earn rewards! Refer friends and get ${stats.referrerReward} per referral.
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Referrals */}
        <Card className="p-6 bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Referrals</p>
              <p className="text-3xl font-bold text-purple-700 mt-1">{stats.referralCount}</p>
            </div>
            <Users className="h-12 w-12 text-purple-400" />
          </div>
        </Card>

        {/* Credits Earned */}
        <Card className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Earned</p>
              <p className="text-3xl font-bold text-green-700 mt-1">${stats.creditsEarned.toFixed(2)}</p>
            </div>
            <TrendingUp className="h-12 w-12 text-green-400" />
          </div>
        </Card>

        {/* Available Credits */}
        <Card className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Available Credits</p>
              <p className="text-3xl font-bold text-blue-700 mt-1">${stats.creditsBalance.toFixed(2)}</p>
            </div>
            <DollarSign className="h-12 w-12 text-blue-400" />
          </div>
        </Card>
      </div>

      {/* Expiring Credits Warning */}
      {stats.expiringAmount > 0 && stats.expiringCredits.length > 0 && (
        <Card className="p-4 bg-gradient-to-r from-orange-50 to-yellow-50 border-2 border-orange-300">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-6 w-6 text-orange-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-bold text-orange-900 mb-1 flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Credits Expiring Soon
              </h3>
              <p className="text-sm text-orange-800">
                <strong>${stats.expiringAmount.toFixed(2)}</strong> in credits will expire within the next 30 days.
                {stats.expiringCredits[0]?.expiresAt && (
                  <span className="ml-1">
                    First expiration: <strong>{new Date(stats.expiringCredits[0].expiresAt).toLocaleDateString()}</strong>
                  </span>
                )}
              </p>
              <p className="text-xs text-orange-700 mt-2">
                💡 Credits expire after {stats.creditExpirationDays} days. Use them on your next booking to avoid losing them!
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Tier Progress Section */}
      <Card className="p-6" style={{ borderColor: stats.tierInfo.color, borderWidth: '2px' }}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <span className="text-3xl">{stats.tierInfo.icon}</span>
              Referral Tier: {stats.tierInfo.name}
            </h2>
            {stats.tierBonusEarned > 0 && (
              <p className="text-sm text-gray-600 mt-1">
                You've earned ${stats.tierBonusEarned.toFixed(2)} in tier bonuses!
              </p>
            )}
          </div>
          <div className="text-right">
            <div
              className="text-5xl font-black"
              style={{ color: stats.tierInfo.color }}
            >
              {stats.tierInfo.icon}
            </div>
          </div>
        </div>

        {/* Tier Progress Bar */}
        {stats.nextTier && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Progress to {stats.nextTier} Tier</span>
              <span className="text-gray-600">
                {stats.referralsToNextTier} more referral{stats.referralsToNextTier !== 1 ? 's' : ''} needed
              </span>
            </div>
            <div className="relative">
              <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full transition-all duration-500 rounded-full"
                  style={{
                    width: `${Math.min(100, ((stats.tierInfo.minReferrals || 0) / ((stats.tierInfo.minReferrals || 0) + stats.referralsToNextTier)) * 100)}%`,
                    backgroundColor: stats.tierInfo.color
                  }}
                />
              </div>
              <div className="flex justify-between mt-1 text-xs text-gray-500">
                <span>{stats.referralCount} referrals</span>
                <span>{(stats.tierInfo.minReferrals || 0) + stats.referralsToNextTier} needed</span>
              </div>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-900">
                <strong>Next Reward:</strong> Reach {stats.nextTier} tier and earn a ${
                  stats.nextTier === 'BRONZE' ? '10' : stats.nextTier === 'SILVER' ? '25' : '50'
                } bonus!
              </p>
            </div>
          </div>
        )}

        {/* Max Tier Achieved */}
        {!stats.nextTier && stats.currentTier === 'GOLD' && (
          <div className="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-4 text-center">
            <p className="text-lg font-bold text-yellow-900">🏆 Maximum Tier Achieved!</p>
            <p className="text-sm text-yellow-800 mt-1">
              You've reached the highest referral tier. Keep referring to earn more credits!
            </p>
          </div>
        )}

        {/* All Tier Badges */}
        <div className="mt-6 pt-6 border-t">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">All Tiers</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Bronze */}
            <div className={`p-4 rounded-lg border-2 ${stats.currentTier === 'BRONZE' || stats.currentTier === 'SILVER' || stats.currentTier === 'GOLD' ? 'bg-orange-50 border-orange-300' : 'bg-gray-50 border-gray-200 opacity-50'}`}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">🥉</span>
                <span className="font-bold" style={{ color: '#cd7f32' }}>Bronze</span>
              </div>
              <p className="text-xs text-gray-600">1-4 referrals</p>
              <p className="text-xs font-semibold text-green-600 mt-1">+$10 bonus</p>
            </div>

            {/* Silver */}
            <div className={`p-4 rounded-lg border-2 ${stats.currentTier === 'SILVER' || stats.currentTier === 'GOLD' ? 'bg-gray-100 border-gray-400' : 'bg-gray-50 border-gray-200 opacity-50'}`}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">🥈</span>
                <span className="font-bold" style={{ color: '#c0c0c0' }}>Silver</span>
              </div>
              <p className="text-xs text-gray-600">5-9 referrals</p>
              <p className="text-xs font-semibold text-green-600 mt-1">+$25 bonus</p>
            </div>

            {/* Gold */}
            <div className={`p-4 rounded-lg border-2 ${stats.currentTier === 'GOLD' ? 'bg-yellow-50 border-yellow-400' : 'bg-gray-50 border-gray-200 opacity-50'}`}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">🥇</span>
                <span className="font-bold" style={{ color: '#ffd700' }}>Gold</span>
              </div>
              <p className="text-xs text-gray-600">10+ referrals</p>
              <p className="text-xs font-semibold text-green-600 mt-1">+$50 bonus</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Referral Code Section */}
      <Card className="p-6 bg-gradient-to-r from-purple-100 to-pink-100 border-2 border-purple-300">
        <h2 className="text-xl font-bold mb-4 text-purple-900">Your Referral Code</h2>

        <div className="bg-white p-4 rounded-lg border-2 border-purple-300 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm text-gray-600 mb-1">Share this code with friends:</p>
              <p className="text-3xl font-black text-purple-700 font-mono tracking-wider">
                {stats.referralCode}
              </p>
            </div>
            <Button
              onClick={handleCopyCode}
              variant={copied ? 'default' : 'outline'}
              size="lg"
              className={copied ? 'bg-green-600 hover:bg-green-700' : ''}
            >
              {copied ? (
                <>
                  <Check className="h-5 w-5 mr-2" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-5 w-5 mr-2" />
                  Copy Code
                </>
              )}
            </Button>
          </div>
        </div>

        <div className="flex gap-3">
          <Button
            onClick={handleShareEmail}
            variant="outline"
            className="flex-1 bg-white hover:bg-gray-50"
          >
            <Mail className="h-4 w-4 mr-2" />
            Share via Email
          </Button>
          <Button
            onClick={handleShareSMS}
            variant="outline"
            className="flex-1 bg-white hover:bg-gray-50"
          >
            <MessageCircle className="h-4 w-4 mr-2" />
            Share via Text
          </Button>
        </div>
      </Card>

      {/* How It Works */}
      <Card className="p-6">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Share2 className="h-5 w-5 text-blue-600" />
          How It Works
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4">
            <div className="bg-purple-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
              <span className="text-2xl font-bold text-purple-700">1</span>
            </div>
            <h3 className="font-semibold mb-2">Share Your Code</h3>
            <p className="text-sm text-gray-600">
              Send your unique referral code to friends and family
            </p>
          </div>
          <div className="text-center p-4">
            <div className="bg-purple-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
              <span className="text-2xl font-bold text-purple-700">2</span>
            </div>
            <h3 className="font-semibold mb-2">They Sign Up</h3>
            <p className="text-sm text-gray-600">
              Your friend uses your code when booking their first cleaning
            </p>
          </div>
          <div className="text-center p-4">
            <div className="bg-purple-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
              <span className="text-2xl font-bold text-purple-700">3</span>
            </div>
            <h3 className="font-semibold mb-2">You Both Win!</h3>
            <p className="text-sm text-gray-600">
              You get ${stats.referrerReward}, they get ${stats.refereeReward} off their first cleaning
            </p>
          </div>
        </div>
      </Card>

      {/* Referral History */}
      {stats.referralCount > 0 && (
        <Card className="p-6">
          <h2 className="text-xl font-bold mb-4">Your Referrals ({stats.referralCount})</h2>
          <div className="space-y-3">
            {stats.referrals.map((referral) => (
              <div
                key={referral.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border"
              >
                <div className="flex items-center gap-3">
                  <div className="bg-purple-100 rounded-full w-10 h-10 flex items-center justify-center">
                    <Users className="h-5 w-5 text-purple-700" />
                  </div>
                  <div>
                    <p className="font-semibold">{referral.name}</p>
                    {referral.email && (
                      <p className="text-sm text-gray-600">{referral.email}</p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-green-600">
                    +${stats.referrerReward.toFixed(2)}
                  </p>
                  <p className="text-xs text-gray-500">
                    {new Date(referral.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Empty State */}
      {stats.referralCount === 0 && (
        <Card className="p-8 text-center bg-gradient-to-br from-gray-50 to-purple-50">
          <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">No referrals yet</h3>
          <p className="text-gray-600 mb-4">
            Start sharing your referral code to earn credits!
          </p>
          <Button
            onClick={handleCopyCode}
            size="lg"
            className="bg-purple-600 hover:bg-purple-700"
          >
            <Copy className="h-5 w-5 mr-2" />
            Copy Your Code
          </Button>
        </Card>
      )}
    </div>
  );
}

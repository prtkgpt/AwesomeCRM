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
  MessageCircle
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

'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import {
  TrendingUp,
  DollarSign,
  CheckCircle,
  Star,
  Calendar,
  Award,
  Clock,
  Gift,
  Target,
  ThumbsUp,
} from 'lucide-react';

interface PerformanceData {
  totalJobsCompleted: number;
  jobsThisWeek: number;
  jobsThisMonth: number;
  earningsThisWeek: number;
  earningsThisMonth: number;
  earningsAllTime: number;
  tipsThisWeek: number;
  tipsThisMonth: number;
  tipsAllTime: number;
  bonusesThisMonth: number;
  averageRating: number;
  totalRatingsReceived: number;
  averageDuration: number;
  hourlyRate: number;
  recentJobsWithRatings: Array<{
    id: string;
    date: string;
    client: string;
    city: string;
    rating: number;
    tip: number;
    feedback: string | null;
  }>;
  weeklyTrends: Array<{
    week: string;
    weekStart: string;
    jobs: number;
    earnings: number;
    tips: number;
  }>;
  cleanerReviews: Array<{
    id: string;
    date: string;
    overallRating: number;
    houseConditionRating: number | null;
    customerRating: number | null;
    tipRating: number | null;
    notes: string | null;
  }>;
}

export default function CleanerPerformancePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<PerformanceData | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated') {
      fetchPerformance();
    }
  }, [status, router]);

  const fetchPerformance = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/cleaner/performance');
      const result = await res.json();

      if (res.ok && result.success) {
        setData(result.data);
      } else {
        setError(result.error || 'Failed to load performance data');
      }
    } catch (error) {
      console.error('Failed to fetch performance:', error);
      setError('Failed to load performance data');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `$${amount.toFixed(2)}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${
              star <= rating
                ? 'fill-yellow-400 text-yellow-400'
                : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-center">Loading your performance stats...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8">
        <Card className="p-6">
          <div className="text-center text-red-600">
            {error || 'Failed to load performance data'}
          </div>
        </Card>
      </div>
    );
  }

  const totalEarnings = data.earningsThisMonth + data.tipsThisMonth + data.bonusesThisMonth;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <TrendingUp className="h-8 w-8 text-blue-600" />
          Your Performance
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Track your stats, earnings, and customer feedback
        </p>
      </div>

      {/* Key Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Jobs */}
        <Card className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Jobs</p>
              <p className="text-3xl font-bold text-blue-700 mt-1">
                {data.totalJobsCompleted}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {data.jobsThisWeek} this week
              </p>
            </div>
            <CheckCircle className="h-12 w-12 text-blue-400" />
          </div>
        </Card>

        {/* This Month Earnings */}
        <Card className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">This Month</p>
              <p className="text-3xl font-bold text-green-700 mt-1">
                {formatCurrency(totalEarnings)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {data.jobsThisMonth} jobs
              </p>
            </div>
            <DollarSign className="h-12 w-12 text-green-400" />
          </div>
        </Card>

        {/* Average Rating */}
        <Card className="p-6 bg-gradient-to-br from-yellow-50 to-orange-50 border-2 border-yellow-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Avg Rating</p>
              <p className="text-3xl font-bold text-yellow-700 mt-1">
                {data.averageRating.toFixed(1)}
                <span className="text-lg">★</span>
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {data.totalRatingsReceived} reviews
              </p>
            </div>
            <Star className="h-12 w-12 text-yellow-400 fill-yellow-400" />
          </div>
        </Card>

        {/* Total Tips */}
        <Card className="p-6 bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Tips (Month)</p>
              <p className="text-3xl font-bold text-purple-700 mt-1">
                {formatCurrency(data.tipsThisMonth)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                All time: {formatCurrency(data.tipsAllTime)}
              </p>
            </div>
            <Gift className="h-12 w-12 text-purple-400" />
          </div>
        </Card>
      </div>

      {/* Earnings Breakdown */}
      <Card className="p-6">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-green-600" />
          Earnings Breakdown (This Month)
        </h2>
        <div className="space-y-3">
          <div className="flex justify-between items-center p-4 bg-green-50 rounded-lg">
            <div>
              <p className="font-medium text-gray-700">Base Wage</p>
              <p className="text-sm text-gray-500">
                {data.jobsThisMonth} jobs × ${data.hourlyRate}/hr
              </p>
            </div>
            <p className="text-2xl font-bold text-green-700">
              {formatCurrency(data.earningsThisMonth)}
            </p>
          </div>

          <div className="flex justify-between items-center p-4 bg-purple-50 rounded-lg">
            <div>
              <p className="font-medium text-gray-700">Tips</p>
              <p className="text-sm text-gray-500">From customers</p>
            </div>
            <p className="text-2xl font-bold text-purple-700">
              {formatCurrency(data.tipsThisMonth)}
            </p>
          </div>

          {data.bonusesThisMonth > 0 && (
            <div className="flex justify-between items-center p-4 bg-blue-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-700">Bonuses & Reimbursements</p>
                <p className="text-sm text-gray-500">Extra income</p>
              </div>
              <p className="text-2xl font-bold text-blue-700">
                {formatCurrency(data.bonusesThisMonth)}
              </p>
            </div>
          )}

          <div className="flex justify-between items-center p-4 bg-gradient-to-r from-green-100 to-emerald-100 rounded-lg border-2 border-green-300">
            <div>
              <p className="font-bold text-gray-800">Total This Month</p>
              <p className="text-sm text-gray-600">All income combined</p>
            </div>
            <p className="text-3xl font-black text-green-700">
              {formatCurrency(totalEarnings)}
            </p>
          </div>
        </div>
      </Card>

      {/* Weekly Trends */}
      <Card className="p-6">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Calendar className="h-5 w-5 text-blue-600" />
          Weekly Performance (Last 4 Weeks)
        </h2>
        <div className="space-y-3">
          {data.weeklyTrends.map((week, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="flex-1">
                <p className="font-medium text-gray-700">{week.week}</p>
                <p className="text-xs text-gray-500">
                  {formatDate(week.weekStart)}
                </p>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <p className="text-sm text-gray-500">Jobs</p>
                  <p className="text-lg font-bold text-blue-600">{week.jobs}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-500">Earnings</p>
                  <p className="text-lg font-bold text-green-600">
                    {formatCurrency(week.earnings)}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-500">Tips</p>
                  <p className="text-lg font-bold text-purple-600">
                    {formatCurrency(week.tips)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-2">
            <Clock className="h-5 w-5 text-blue-600" />
            <h3 className="font-semibold">Avg Job Duration</h3>
          </div>
          <p className="text-3xl font-bold text-blue-700">
            {Math.floor(data.averageDuration / 60)}h {data.averageDuration % 60}m
          </p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3 mb-2">
            <Award className="h-5 w-5 text-yellow-600" />
            <h3 className="font-semibold">Customer Satisfaction</h3>
          </div>
          <p className="text-3xl font-bold text-yellow-700">
            {data.averageRating > 4.5 ? 'Excellent!' : data.averageRating > 4.0 ? 'Great!' : data.averageRating > 3.5 ? 'Good' : 'Keep Going!'}
          </p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3 mb-2">
            <Target className="h-5 w-5 text-green-600" />
            <h3 className="font-semibold">Hourly Rate</h3>
          </div>
          <p className="text-3xl font-bold text-green-700">
            {formatCurrency(data.hourlyRate)}/hr
          </p>
        </Card>
      </div>

      {/* Recent Customer Feedback */}
      {data.recentJobsWithRatings.length > 0 && (
        <Card className="p-6">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <ThumbsUp className="h-5 w-5 text-green-600" />
            Recent Customer Feedback
          </h2>
          <div className="space-y-3">
            {data.recentJobsWithRatings.map((job) => (
              <div
                key={job.id}
                className="p-4 bg-gray-50 rounded-lg border border-gray-200"
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-semibold text-gray-800">{job.client}</p>
                    <p className="text-sm text-gray-500">
                      {job.city} • {formatDate(job.date)}
                    </p>
                  </div>
                  <div className="text-right">
                    {renderStars(job.rating || 0)}
                    {job.tip > 0 && (
                      <p className="text-sm font-medium text-purple-600 mt-1">
                        💰 {formatCurrency(job.tip)} tip
                      </p>
                    )}
                  </div>
                </div>
                {job.feedback && (
                  <p className="text-sm text-gray-700 italic mt-2 pl-4 border-l-2 border-gray-300">
                    "{job.feedback}"
                  </p>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Motivational Footer */}
      <Card className="p-6 bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200">
        <div className="text-center">
          <h3 className="text-2xl font-bold text-gray-800 mb-2">
            {data.averageRating >= 4.5
              ? '🌟 You\'re doing amazing!'
              : data.jobsThisMonth >= 20
              ? '💪 Great work ethic!'
              : '🚀 Keep up the good work!'}
          </h3>
          <p className="text-gray-600">
            {data.totalJobsCompleted} jobs completed •{' '}
            {data.totalRatingsReceived} happy customers •{' '}
            {formatCurrency(data.earningsAllTime)} earned all-time
          </p>
        </div>
      </Card>
    </div>
  );
}

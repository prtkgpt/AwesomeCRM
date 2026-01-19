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
  Flame,
  ArrowUpRight,
  ArrowDownRight,
  Trophy,
  Zap,
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
  onTimeRate: number;
  currentStreak: number;
  earningsLastMonth: number;
  jobsLastMonth: number;
  earningsChange: number;
  jobsChange: number;
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
  achievements: Array<{
    icon: string;
    title: string;
    description: string;
  }>;
  personalBests: {
    bestWeekEarnings: number;
    bestWeekJobs: number;
    highestTip: number;
    longestStreak: number;
  };
  nextMilestone: {
    target: number;
    current: number;
    label: string;
  };
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
        <Card className="p-6 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/50 dark:to-pink-950/30 border-2 border-purple-200 dark:border-purple-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Tips (Month)</p>
              <p className="text-3xl font-bold text-purple-700 dark:text-purple-300 mt-1">
                {formatCurrency(data.tipsThisMonth)}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                All time: {formatCurrency(data.tipsAllTime)}
              </p>
            </div>
            <Gift className="h-12 w-12 text-purple-400" />
          </div>
        </Card>
      </div>

      {/* Streak & On-Time Rate */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Current Streak */}
        <Card className="p-6 bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-950/50 dark:to-red-950/30 border-2 border-orange-200 dark:border-orange-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400 flex items-center gap-1">
                <Flame className="h-4 w-4 text-orange-500" />
                Current Streak
              </p>
              <p className="text-4xl font-bold text-orange-600 dark:text-orange-400 mt-1">
                {data.currentStreak} {data.currentStreak === 1 ? 'day' : 'days'}
              </p>
              {data.currentStreak >= 3 && (
                <p className="text-sm text-orange-700 dark:text-orange-300 mt-1 font-medium">
                  {data.currentStreak >= 7 ? "You're on fire! Amazing consistency!" : "Great momentum! Keep it going!"}
                </p>
              )}
            </div>
            <div className="text-5xl">{data.currentStreak >= 5 ? '🔥' : data.currentStreak >= 3 ? '✨' : '💪'}</div>
          </div>
        </Card>

        {/* On-Time Rate */}
        <Card className="p-6 bg-gradient-to-br from-teal-50 to-cyan-50 dark:from-teal-950/50 dark:to-cyan-950/30 border-2 border-teal-200 dark:border-teal-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400 flex items-center gap-1">
                <Clock className="h-4 w-4 text-teal-500" />
                On-Time Completion
              </p>
              <p className="text-4xl font-bold text-teal-600 dark:text-teal-400 mt-1">
                {data.onTimeRate}%
              </p>
              <p className="text-sm text-teal-700 dark:text-teal-300 mt-1 font-medium">
                {data.onTimeRate >= 98 ? 'Perfect! Clients love reliability!' : data.onTimeRate >= 90 ? 'Great job staying on schedule!' : 'Room for improvement'}
              </p>
            </div>
            <div className="text-5xl">{data.onTimeRate >= 98 ? '⏰' : data.onTimeRate >= 90 ? '👍' : '📈'}</div>
          </div>
        </Card>
      </div>

      {/* Achievements */}
      {data.achievements && data.achievements.length > 0 && (
        <Card className="p-6 bg-gradient-to-r from-amber-50 via-yellow-50 to-orange-50 dark:from-amber-950/30 dark:via-yellow-950/30 dark:to-orange-950/30 border-2 border-amber-300 dark:border-amber-700">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            Your Achievements
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {data.achievements.map((achievement, index) => (
              <div
                key={index}
                className="flex items-center gap-3 p-3 bg-white/60 dark:bg-gray-800/60 rounded-xl border border-amber-200 dark:border-amber-800"
              >
                <span className="text-3xl">{achievement.icon}</span>
                <div>
                  <p className="font-semibold text-gray-800 dark:text-gray-200">{achievement.title}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">{achievement.description}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Progress to Next Milestone */}
      {data.nextMilestone && (
        <Card className="p-6">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Target className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            Progress to Next Milestone
          </h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-lg font-medium text-gray-700 dark:text-gray-300">
                {data.nextMilestone.label}
              </span>
              <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                {data.nextMilestone.current} / {data.nextMilestone.target}
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4 overflow-hidden">
              <div
                className="bg-gradient-to-r from-blue-500 to-blue-600 h-4 rounded-full transition-all duration-500"
                style={{ width: `${Math.min((data.nextMilestone.current / data.nextMilestone.target) * 100, 100)}%` }}
              />
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {data.nextMilestone.target - data.nextMilestone.current} more jobs to reach your next milestone!
              {data.nextMilestone.target - data.nextMilestone.current <= 5 && ' Almost there! 🎯'}
            </p>
          </div>
        </Card>
      )}

      {/* Month-over-Month Comparison */}
      {(data.earningsChange !== 0 || data.jobsChange !== 0) && (
        <Card className="p-6">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Zap className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            Compared to Last Month
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className={`p-4 rounded-lg ${data.earningsChange >= 0 ? 'bg-green-50 dark:bg-green-950/30' : 'bg-red-50 dark:bg-red-950/30'}`}>
              <div className="flex items-center gap-2">
                {data.earningsChange >= 0 ? (
                  <ArrowUpRight className="h-5 w-5 text-green-600 dark:text-green-400" />
                ) : (
                  <ArrowDownRight className="h-5 w-5 text-red-600 dark:text-red-400" />
                )}
                <span className="font-medium text-gray-700 dark:text-gray-300">Earnings</span>
              </div>
              <p className={`text-2xl font-bold mt-1 ${data.earningsChange >= 0 ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
                {data.earningsChange >= 0 ? '+' : ''}{data.earningsChange}%
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                vs. {formatCurrency(data.earningsLastMonth)} last month
              </p>
            </div>
            <div className={`p-4 rounded-lg ${data.jobsChange >= 0 ? 'bg-green-50 dark:bg-green-950/30' : 'bg-red-50 dark:bg-red-950/30'}`}>
              <div className="flex items-center gap-2">
                {data.jobsChange >= 0 ? (
                  <ArrowUpRight className="h-5 w-5 text-green-600 dark:text-green-400" />
                ) : (
                  <ArrowDownRight className="h-5 w-5 text-red-600 dark:text-red-400" />
                )}
                <span className="font-medium text-gray-700 dark:text-gray-300">Jobs Completed</span>
              </div>
              <p className={`text-2xl font-bold mt-1 ${data.jobsChange >= 0 ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
                {data.jobsChange >= 0 ? '+' : ''}{data.jobsChange}%
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                vs. {data.jobsLastMonth} jobs last month
              </p>
            </div>
          </div>
        </Card>
      )}

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

'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DollarSign,
  TrendingUp,
  Gift,
  Calendar,
  Briefcase,
  Clock,
  ChevronRight,
  Wallet,
  Target,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface EarningsData {
  summary: {
    hourlyRate: number;
    totalJobs: number;
    jobsThisWeek: number;
    jobsThisMonth: number;
    avgEarningsPerJob: number;
    projectedMonthlyTotal: number;
  };
  thisWeek: {
    wages: number;
    tips: number;
    bonuses: number;
    total: number;
    jobs: number;
  };
  thisMonth: {
    wages: number;
    tips: number;
    bonuses: number;
    total: number;
    jobs: number;
  };
  thisYear: {
    wages: number;
    tips: number;
    bonuses: number;
    total: number;
    jobs: number;
  };
  allTime: {
    wages: number;
    tips: number;
    total: number;
    jobs: number;
  };
  monthlyTrends: Array<{
    month: string;
    fullMonth: string;
    wages: number;
    tips: number;
    bonuses: number;
    total: number;
    jobs: number;
  }>;
  weeklyTrends: Array<{
    week: string;
    weekLabel: string;
    wages: number;
    tips: number;
    total: number;
    jobs: number;
  }>;
  dailyEarnings: Array<{
    day: string;
    fullDate: string;
    wages: number;
    tips: number;
    total: number;
    jobs: number;
  }>;
  serviceTypeData: Array<{
    name: string;
    wages: number;
    tips: number;
    total: number;
    jobs: number;
  }>;
  recentEarnings: Array<{
    id: string;
    date: string;
    client: string;
    city: string;
    duration: number;
    wage: number;
    tip: number;
    total: number;
    serviceType: string;
  }>;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];

export default function CleanerEarningsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<EarningsData | null>(null);
  const [error, setError] = useState('');
  const [activeView, setActiveView] = useState<'week' | 'month' | 'year'>('month');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated') {
      fetchEarnings();
    }
  }, [status, router]);

  const fetchEarnings = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/cleaner/earnings');
      const result = await res.json();

      if (res.ok && result.success) {
        setData(result.data);
      } else {
        setError(result.error || 'Failed to load earnings data');
      }
    } catch (error) {
      console.error('Failed to fetch earnings:', error);
      setError('Failed to load earnings data');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}m`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}m`;
  };

  if (loading) {
    return (
      <div className="p-4 md:p-8">
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading your earnings...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-4 md:p-8">
        <Card className="p-6">
          <div className="text-center text-red-600 dark:text-red-400">
            {error || 'Failed to load earnings data'}
          </div>
        </Card>
      </div>
    );
  }

  const getPeriodData = () => {
    switch (activeView) {
      case 'week':
        return data.thisWeek;
      case 'month':
        return data.thisMonth;
      case 'year':
        return data.thisYear;
      default:
        return data.thisMonth;
    }
  };

  const periodData = getPeriodData();
  const periodLabel = activeView === 'week' ? 'This Week' : activeView === 'month' ? 'This Month' : 'This Year';

  // Calculate week-over-week or month-over-month change
  const currentWeekTotal = data.weeklyTrends[data.weeklyTrends.length - 1]?.total || 0;
  const lastWeekTotal = data.weeklyTrends[data.weeklyTrends.length - 2]?.total || 0;
  const weekChange = lastWeekTotal > 0 ? ((currentWeekTotal - lastWeekTotal) / lastWeekTotal) * 100 : 0;

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <Wallet className="h-7 w-7 md:h-8 md:w-8 text-green-600" />
            My Earnings
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Track your income, tips, and financial progress
          </p>
        </div>

        {/* Period Toggle */}
        <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
          {(['week', 'month', 'year'] as const).map((view) => (
            <button
              key={view}
              onClick={() => setActiveView(view)}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                activeView === view
                  ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              {view.charAt(0).toUpperCase() + view.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Key Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {/* Total Earnings */}
        <Card className="p-4 md:p-6 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 border-2 border-green-200 dark:border-green-800">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs md:text-sm font-medium text-gray-600 dark:text-gray-400">{periodLabel}</p>
              <p className="text-xl md:text-3xl font-bold text-green-700 dark:text-green-400 mt-1">
                {formatCurrency(periodData.total)}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                {periodData.jobs} jobs
              </p>
            </div>
            <div className="p-2 md:p-3 bg-green-500 rounded-xl">
              <DollarSign className="h-5 w-5 md:h-6 md:w-6 text-white" />
            </div>
          </div>
        </Card>

        {/* Base Wages */}
        <Card className="p-4 md:p-6 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border-2 border-blue-200 dark:border-blue-800">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs md:text-sm font-medium text-gray-600 dark:text-gray-400">Wages</p>
              <p className="text-xl md:text-3xl font-bold text-blue-700 dark:text-blue-400 mt-1">
                {formatCurrency(periodData.wages)}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                ${data.summary.hourlyRate}/hr
              </p>
            </div>
            <div className="p-2 md:p-3 bg-blue-500 rounded-xl">
              <Briefcase className="h-5 w-5 md:h-6 md:w-6 text-white" />
            </div>
          </div>
        </Card>

        {/* Tips */}
        <Card className="p-4 md:p-6 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30 border-2 border-purple-200 dark:border-purple-800">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs md:text-sm font-medium text-gray-600 dark:text-gray-400">Tips</p>
              <p className="text-xl md:text-3xl font-bold text-purple-700 dark:text-purple-400 mt-1">
                {formatCurrency(periodData.tips)}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                From customers
              </p>
            </div>
            <div className="p-2 md:p-3 bg-purple-500 rounded-xl">
              <Gift className="h-5 w-5 md:h-6 md:w-6 text-white" />
            </div>
          </div>
        </Card>

        {/* Projected/Avg */}
        <Card className="p-4 md:p-6 bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-950/30 border-2 border-orange-200 dark:border-orange-800">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs md:text-sm font-medium text-gray-600 dark:text-gray-400">Avg/Job</p>
              <p className="text-xl md:text-3xl font-bold text-orange-700 dark:text-orange-400 mt-1">
                {formatCurrency(data.summary.avgEarningsPerJob)}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                {data.summary.totalJobs} total jobs
              </p>
            </div>
            <div className="p-2 md:p-3 bg-orange-500 rounded-xl">
              <Target className="h-5 w-5 md:h-6 md:w-6 text-white" />
            </div>
          </div>
        </Card>
      </div>

      {/* Projected Monthly Earnings Banner */}
      {activeView === 'month' && data.summary.projectedMonthlyTotal > 0 && (
        <Card className="p-4 md:p-6 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-blue-100">Projected Monthly Total</p>
              <p className="text-2xl md:text-3xl font-bold mt-1">
                {formatCurrency(data.summary.projectedMonthlyTotal)}
              </p>
              <p className="text-xs text-blue-200 mt-1">Based on your current pace this month</p>
            </div>
            <div className="flex items-center gap-2">
              {weekChange !== 0 && (
                <div className={`flex items-center gap-1 px-3 py-1 rounded-full ${
                  weekChange > 0 ? 'bg-green-500/20 text-green-100' : 'bg-red-500/20 text-red-100'
                }`}>
                  {weekChange > 0 ? (
                    <ArrowUpRight className="h-4 w-4" />
                  ) : (
                    <ArrowDownRight className="h-4 w-4" />
                  )}
                  <span className="text-sm font-medium">{Math.abs(weekChange).toFixed(0)}% vs last week</span>
                </div>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Earnings Trend Chart */}
        <Card className="p-4 md:p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-blue-600" />
            {activeView === 'week' ? 'Daily Earnings This Week' : 'Monthly Earnings Trend'}
          </h2>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={activeView === 'week' ? data.dailyEarnings : data.monthlyTrends}>
              <defs>
                <linearGradient id="colorWages" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorTips" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey={activeView === 'week' ? 'day' : 'month'}
                tick={{ fontSize: 12 }}
                stroke="#9ca3af"
              />
              <YAxis
                tick={{ fontSize: 12 }}
                stroke="#9ca3af"
                tickFormatter={(value) => `$${value}`}
              />
              <Tooltip
                formatter={(value: number | undefined) => value !== undefined ? formatCurrency(value) : ''}
                labelStyle={{ fontWeight: 'bold' }}
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
              />
              <Legend />
              <Area
                type="monotone"
                dataKey="wages"
                stroke="#3b82f6"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorWages)"
                name="Wages"
              />
              <Area
                type="monotone"
                dataKey="tips"
                stroke="#8b5cf6"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorTips)"
                name="Tips"
              />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        {/* Weekly Comparison Chart */}
        <Card className="p-4 md:p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Calendar className="h-5 w-5 text-green-600" />
            Weekly Comparison
          </h2>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data.weeklyTrends}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="weekLabel"
                tick={{ fontSize: 11 }}
                stroke="#9ca3af"
              />
              <YAxis
                tick={{ fontSize: 12 }}
                stroke="#9ca3af"
                tickFormatter={(value) => `$${value}`}
              />
              <Tooltip
                formatter={(value: number | undefined) => value !== undefined ? formatCurrency(value) : ''}
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
              />
              <Legend />
              <Bar dataKey="wages" fill="#3b82f6" name="Wages" radius={[4, 4, 0, 0]} />
              <Bar dataKey="tips" fill="#8b5cf6" name="Tips" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Service Type & Earnings Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Service Type Distribution */}
        <Card className="p-4 md:p-6">
          <h2 className="text-lg font-semibold mb-4">Earnings by Service Type</h2>
          {data.serviceTypeData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={data.serviceTypeData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="total"
                  nameKey="name"
                  label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {data.serviceTypeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number | undefined) => value !== undefined ? formatCurrency(value) : ''} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-gray-500">
              No data available
            </div>
          )}
        </Card>

        {/* Earnings Breakdown */}
        <Card className="p-4 md:p-6 lg:col-span-2">
          <h2 className="text-lg font-semibold mb-4">Earnings Breakdown ({periodLabel})</h2>
          <div className="space-y-4">
            {/* Wages */}
            <div className="relative">
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Base Wages</span>
                </div>
                <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                  {formatCurrency(periodData.wages)}
                </span>
              </div>
              <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full transition-all duration-500"
                  style={{ width: `${periodData.total > 0 ? (periodData.wages / periodData.total) * 100 : 0}%` }}
                ></div>
              </div>
            </div>

            {/* Tips */}
            <div className="relative">
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Tips</span>
                </div>
                <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                  {formatCurrency(periodData.tips)}
                </span>
              </div>
              <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-purple-500 rounded-full transition-all duration-500"
                  style={{ width: `${periodData.total > 0 ? (periodData.tips / periodData.total) * 100 : 0}%` }}
                ></div>
              </div>
            </div>

            {/* Bonuses (if any) */}
            {periodData.bonuses > 0 && (
              <div className="relative">
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Bonuses & Reimbursements</span>
                  </div>
                  <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                    {formatCurrency(periodData.bonuses)}
                  </span>
                </div>
                <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-500 rounded-full transition-all duration-500"
                    style={{ width: `${periodData.total > 0 ? (periodData.bonuses / periodData.total) * 100 : 0}%` }}
                  ></div>
                </div>
              </div>
            )}

            {/* Total */}
            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex justify-between items-center">
                <span className="text-base font-semibold text-gray-900 dark:text-gray-100">Total {periodLabel}</span>
                <span className="text-xl font-bold text-green-600 dark:text-green-400">
                  {formatCurrency(periodData.total)}
                </span>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Recent Earnings */}
      <Card className="p-4 md:p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Clock className="h-5 w-5 text-gray-600" />
          Recent Earnings
        </h2>
        {data.recentEarnings.length > 0 ? (
          <div className="overflow-x-auto -mx-4 md:mx-0">
            <table className="w-full min-w-[600px]">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Date</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Client</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Service</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Duration</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Wage</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Tip</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Total</th>
                </tr>
              </thead>
              <tbody>
                {data.recentEarnings.map((earning, index) => (
                  <tr
                    key={earning.id}
                    className={`border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${
                      index === 0 ? 'bg-green-50/50 dark:bg-green-900/10' : ''
                    }`}
                  >
                    <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">
                      {formatDate(earning.date)}
                    </td>
                    <td className="py-3 px-4">
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{earning.client}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-500">{earning.city}</p>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                        {earning.serviceType.charAt(0) + earning.serviceType.slice(1).toLowerCase().replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-right text-gray-600 dark:text-gray-400">
                      {formatDuration(earning.duration)}
                    </td>
                    <td className="py-3 px-4 text-sm text-right font-medium text-blue-600 dark:text-blue-400">
                      {formatCurrency(earning.wage)}
                    </td>
                    <td className="py-3 px-4 text-sm text-right font-medium text-purple-600 dark:text-purple-400">
                      {earning.tip > 0 ? formatCurrency(earning.tip) : '-'}
                    </td>
                    <td className="py-3 px-4 text-sm text-right font-bold text-green-600 dark:text-green-400">
                      {formatCurrency(earning.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            No recent earnings to display
          </div>
        )}
      </Card>

      {/* All-Time Stats Footer */}
      <Card className="p-4 md:p-6 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900">
        <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">All-Time Stats</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100">{data.allTime.jobs}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Jobs Completed</p>
          </div>
          <div>
            <p className="text-2xl md:text-3xl font-bold text-blue-600 dark:text-blue-400">{formatCurrency(data.allTime.wages)}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Total Wages</p>
          </div>
          <div>
            <p className="text-2xl md:text-3xl font-bold text-purple-600 dark:text-purple-400">{formatCurrency(data.allTime.tips)}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Total Tips</p>
          </div>
          <div>
            <p className="text-2xl md:text-3xl font-bold text-green-600 dark:text-green-400">{formatCurrency(data.allTime.total)}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Total Earnings</p>
          </div>
        </div>
      </Card>
    </div>
  );
}

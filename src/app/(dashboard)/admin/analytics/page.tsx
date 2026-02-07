'use client';

import { useEffect, useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Calendar,
  Clock,
  Star,
  Download,
  BarChart3,
  PieChart,
  Activity,
  UserPlus,
  UserMinus,
  Award,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PageTransition, FadeIn, SlideIn } from '@/components/ui/page-transition';

interface KPI {
  value: number;
  change: number | null;
  formatted: string;
}

interface OverviewData {
  period: string;
  startDate: string;
  endDate: string;
  kpis: {
    totalRevenue: KPI;
    unpaidRevenue: KPI;
    averageBookingValue: KPI;
    totalBookings: { value: number; change: number | null };
    completedBookings: { value: number; completionRate: number };
    cancelledBookings: { value: number; cancellationRate: number };
    totalClients: { value: number };
    newClients: { value: number; change: number | null };
    activeTeamMembers: { value: number };
    averageRating: { value: number; formatted: string };
    totalTips: KPI;
  };
}

interface RevenueData {
  period: { start: string; end: string; days: number; groupBy: string };
  summary: {
    totalRevenue: number;
    paidRevenue: number;
    unpaidRevenue: number;
    totalTips: number;
    totalCreditsUsed: number;
    averageBookingValue: number;
    totalBookings: number;
    collectionRate: number;
    trend: number;
  };
  revenueByPeriod: Array<{
    date: string;
    label: string;
    paidRevenue: number;
    unpaidRevenue: number;
    totalRevenue: number;
    tips: number;
    bookingCount: number;
  }>;
  revenueByServiceType: { STANDARD: number; DEEP: number; MOVE_OUT: number };
}

interface TeamData {
  summary: {
    totalTeamMembers: number;
    totalJobsCompleted: number;
    totalRevenue: number;
    totalTips: number;
    totalHoursWorked: number;
    averageJobsPerCleaner: number;
    averageRating: number | null;
  };
  topPerformers: {
    byRevenue: Array<{ name: string; metrics: { totalRevenue: number } }>;
    byJobs: Array<{ name: string; metrics: { completedJobs: number } }>;
    byRating: Array<{ name: string; metrics: { averageRating: number | null } }>;
  };
}

interface CustomerData {
  summary: {
    totalCustomers: number;
    newCustomers: number;
    activeCustomers: number;
    atRiskCustomers: number;
    churnedCustomers: number;
    churnRate: number;
    totalLifetimeValue: number;
    averageLifetimeValue: number;
  };
  clvDistribution: Record<string, number>;
  referralStats: {
    customersWithReferralCode: number;
    totalCreditsBalance: number;
    tierDistribution: { NONE: number; BRONZE: number; SILVER: number; GOLD: number };
  };
}

export default function AnalyticsPage() {
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [revenue, setRevenue] = useState<RevenueData | null>(null);
  const [team, setTeam] = useState<TeamData | null>(null);
  const [customers, setCustomers] = useState<CustomerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'day' | 'week' | 'month' | 'year'>('month');
  const [days, setDays] = useState(30);

  useEffect(() => {
    fetchAllData();
  }, [period, days]);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [overviewRes, revenueRes, teamRes, customerRes] = await Promise.all([
        fetch(`/api/analytics/overview?period=${period}&compare=true`),
        fetch(`/api/analytics/revenue?days=${days}&groupBy=${period === 'year' ? 'month' : 'day'}`),
        fetch(`/api/analytics/team-performance?days=${days}`),
        fetch(`/api/analytics/customer-insights?days=${days}`),
      ]);

      const [overviewData, revenueData, teamData, customerData] = await Promise.all([
        overviewRes.json(),
        revenueRes.json(),
        teamRes.json(),
        customerRes.json(),
      ]);

      setOverview(overviewData);
      setRevenue(revenueData);
      setTeam(teamData);
      setCustomers(customerData);
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (type: string) => {
    window.open(`/api/analytics/export?type=${type}&days=${days}&format=csv`, '_blank');
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const renderChange = (change: number | null) => {
    if (change === null) return null;
    const isPositive = change >= 0;
    return (
      <span className={`flex items-center text-sm ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
        {isPositive ? <TrendingUp className="w-4 h-4 mr-1" /> : <TrendingDown className="w-4 h-4 mr-1" />}
        {Math.abs(change)}%
      </span>
    );
  };

  if (loading) {
    return (
      <PageTransition>
        <div className="p-6 space-y-6">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold">Analytics</h1>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <Card key={i} className="p-4 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-3/4"></div>
              </Card>
            ))}
          </div>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold">Analytics Dashboard</h1>
            <p className="text-gray-500">
              {overview?.startDate} to {overview?.endDate}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={period}
              onChange={(e) => {
                const newPeriod = e.target.value as 'day' | 'week' | 'month' | 'year';
                setPeriod(newPeriod);
                setDays(newPeriod === 'day' ? 1 : newPeriod === 'week' ? 7 : newPeriod === 'month' ? 30 : 365);
              }}
              className="border rounded-md px-3 py-2"
            >
              <option value="day">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="year">This Year</option>
            </select>
            <div className="relative group">
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border hidden group-hover:block z-10">
                <button
                  onClick={() => handleExport('bookings')}
                  className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
                >
                  Export Bookings
                </button>
                <button
                  onClick={() => handleExport('customers')}
                  className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
                >
                  Export Customers
                </button>
                <button
                  onClick={() => handleExport('revenue')}
                  className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
                >
                  Export Revenue
                </button>
                <button
                  onClick={() => handleExport('team')}
                  className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
                >
                  Export Team
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* KPI Cards */}
        <FadeIn delay={0.1}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Revenue */}
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div className="p-2 bg-green-100 rounded-lg">
                  <DollarSign className="w-5 h-5 text-green-600" />
                </div>
                {renderChange(overview?.kpis.totalRevenue.change ?? null)}
              </div>
              <div className="mt-3">
                <p className="text-sm text-gray-500">Total Revenue</p>
                <p className="text-2xl font-bold">{overview?.kpis.totalRevenue.formatted}</p>
              </div>
            </Card>

            {/* Bookings */}
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Calendar className="w-5 h-5 text-blue-600" />
                </div>
                {renderChange(overview?.kpis.totalBookings.change ?? null)}
              </div>
              <div className="mt-3">
                <p className="text-sm text-gray-500">Total Bookings</p>
                <p className="text-2xl font-bold">{overview?.kpis.totalBookings.value}</p>
                <p className="text-xs text-gray-400">
                  {overview?.kpis.completedBookings.completionRate}% completion rate
                </p>
              </div>
            </Card>

            {/* New Customers */}
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <UserPlus className="w-5 h-5 text-purple-600" />
                </div>
                {renderChange(overview?.kpis.newClients.change ?? null)}
              </div>
              <div className="mt-3">
                <p className="text-sm text-gray-500">New Customers</p>
                <p className="text-2xl font-bold">{overview?.kpis.newClients.value}</p>
                <p className="text-xs text-gray-400">
                  {overview?.kpis.totalClients.value} total customers
                </p>
              </div>
            </Card>

            {/* Average Rating */}
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Star className="w-5 h-5 text-yellow-600" />
                </div>
              </div>
              <div className="mt-3">
                <p className="text-sm text-gray-500">Average Rating</p>
                <p className="text-2xl font-bold">{overview?.kpis.averageRating.formatted || 'N/A'}</p>
                <p className="text-xs text-gray-400">
                  {overview?.kpis.totalTips.formatted} in tips
                </p>
              </div>
            </Card>
          </div>
        </FadeIn>

        {/* Revenue Chart Section */}
        <FadeIn delay={0.2}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Revenue Trend */}
            <Card className="lg:col-span-2 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Revenue Trend</h2>
                <div className="flex items-center gap-2 text-sm">
                  <span className={`flex items-center ${(revenue?.summary.trend ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {(revenue?.summary.trend ?? 0) >= 0 ? <TrendingUp className="w-4 h-4 mr-1" /> : <TrendingDown className="w-4 h-4 mr-1" />}
                    {Math.abs(revenue?.summary.trend ?? 0)}% vs previous
                  </span>
                </div>
              </div>
              <div className="h-64 flex items-end gap-1">
                {revenue?.revenueByPeriod.slice(-14).map((day, index) => {
                  const maxRevenue = Math.max(...(revenue?.revenueByPeriod || []).map((d) => d.totalRevenue));
                  const height = maxRevenue > 0 ? (day.totalRevenue / maxRevenue) * 100 : 0;
                  return (
                    <div key={day.date} className="flex-1 flex flex-col items-center group">
                      <div className="relative w-full">
                        <div
                          className="w-full bg-blue-500 rounded-t hover:bg-blue-600 transition-colors cursor-pointer"
                          style={{ height: `${Math.max(height, 4)}%`, minHeight: '4px' }}
                        />
                        <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                          {formatCurrency(day.totalRevenue)}
                          <br />
                          {day.bookingCount} bookings
                        </div>
                      </div>
                      <span className="text-xs text-gray-500 mt-1 rotate-45 origin-left">
                        {day.label.split(' ')[1]}
                      </span>
                    </div>
                  );
                })}
              </div>
            </Card>

            {/* Revenue by Service Type */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4">Revenue by Service</h2>
              <div className="space-y-4">
                {revenue && (
                  <>
                    {[
                      { type: 'STANDARD', color: 'bg-blue-500' },
                      { type: 'DEEP', color: 'bg-green-500' },
                      { type: 'MOVE_OUT', color: 'bg-purple-500' },
                    ].map(({ type, color }) => {
                      const value = revenue.revenueByServiceType[type as keyof typeof revenue.revenueByServiceType];
                      const total = Object.values(revenue.revenueByServiceType).reduce((a, b) => a + b, 0);
                      const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
                      return (
                        <div key={type}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="capitalize">{type.replace('_', ' ').toLowerCase()}</span>
                            <span className="font-medium">{formatCurrency(value)}</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className={`${color} h-2 rounded-full transition-all duration-500`}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-500">{percentage}%</span>
                        </div>
                      );
                    })}
                  </>
                )}
              </div>
              <div className="mt-6 pt-4 border-t">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Collection Rate</span>
                  <span className="font-medium">{revenue?.summary.collectionRate}%</span>
                </div>
                <div className="flex justify-between text-sm mt-2">
                  <span className="text-gray-500">Avg Booking Value</span>
                  <span className="font-medium">{formatCurrency(revenue?.summary.averageBookingValue ?? 0)}</span>
                </div>
              </div>
            </Card>
          </div>
        </FadeIn>

        {/* Team & Customer Insights */}
        <FadeIn delay={0.3}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Team Performance */}
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Activity className="w-5 h-5 text-blue-600" />
                <h2 className="text-lg font-semibold">Team Performance</h2>
              </div>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <p className="text-sm text-gray-500">Active Cleaners</p>
                  <p className="text-xl font-bold">{team?.summary.totalTeamMembers}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Jobs Completed</p>
                  <p className="text-xl font-bold">{team?.summary.totalJobsCompleted}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Hours</p>
                  <p className="text-xl font-bold">{team?.summary.totalHoursWorked.toFixed(1)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Avg Jobs/Cleaner</p>
                  <p className="text-xl font-bold">{team?.summary.averageJobsPerCleaner}</p>
                </div>
              </div>
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-gray-500">Top Performers</h3>
                {team?.topPerformers.byRevenue.slice(0, 3).map((member, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">
                        {index + 1}
                      </span>
                      <span className="font-medium">{member.name}</span>
                    </div>
                    <span className="text-sm text-gray-500">
                      {formatCurrency(member.metrics.totalRevenue)}
                    </span>
                  </div>
                ))}
              </div>
            </Card>

            {/* Customer Insights */}
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Users className="w-5 h-5 text-purple-600" />
                <h2 className="text-lg font-semibold">Customer Insights</h2>
              </div>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <p className="text-sm text-gray-500">Total Customers</p>
                  <p className="text-xl font-bold">{customers?.summary.totalCustomers}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">New This Period</p>
                  <p className="text-xl font-bold text-green-600">+{customers?.summary.newCustomers}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Active</p>
                  <p className="text-xl font-bold">{customers?.summary.activeCustomers}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">At Risk</p>
                  <p className="text-xl font-bold text-yellow-600">{customers?.summary.atRiskCustomers}</p>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Churn Rate</span>
                  <span className={`font-medium ${(customers?.summary.churnRate ?? 0) > 10 ? 'text-red-600' : 'text-green-600'}`}>
                    {customers?.summary.churnRate}%
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Avg Customer Value</span>
                  <span className="font-medium">{formatCurrency(customers?.summary.averageLifetimeValue ?? 0)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Total CLV</span>
                  <span className="font-medium">{formatCurrency(customers?.summary.totalLifetimeValue ?? 0)}</span>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t">
                <h3 className="text-sm font-medium text-gray-500 mb-2">Referral Program</h3>
                <div className="flex justify-between text-sm">
                  <span>Active Referrers</span>
                  <span className="font-medium">{customers?.referralStats.customersWithReferralCode}</span>
                </div>
                <div className="flex gap-2 mt-2">
                  <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs">
                    Gold: {customers?.referralStats.tierDistribution.GOLD}
                  </span>
                  <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                    Silver: {customers?.referralStats.tierDistribution.SILVER}
                  </span>
                  <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs">
                    Bronze: {customers?.referralStats.tierDistribution.BRONZE}
                  </span>
                </div>
              </div>
            </Card>
          </div>
        </FadeIn>

        {/* Additional Metrics Row */}
        <FadeIn delay={0.4}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-500">Unpaid Revenue</span>
              </div>
              <p className="text-xl font-bold text-orange-600">
                {overview?.kpis.unpaidRevenue.formatted}
              </p>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-500">Cancellation Rate</span>
              </div>
              <p className="text-xl font-bold">
                {overview?.kpis.cancelledBookings.cancellationRate}%
              </p>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Award className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-500">Total Tips</span>
              </div>
              <p className="text-xl font-bold text-green-600">
                {formatCurrency(team?.summary.totalTips ?? 0)}
              </p>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-500">Team Members</span>
              </div>
              <p className="text-xl font-bold">
                {overview?.kpis.activeTeamMembers.value}
              </p>
            </Card>
          </div>
        </FadeIn>
      </div>
    </PageTransition>
  );
}

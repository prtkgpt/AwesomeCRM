'use client';

import { useState, useEffect } from 'react';
import { DollarSign, Users, Calendar, TrendingUp, Download, Filter, RefreshCw } from 'lucide-react';
import { BarChart, LineChart, DonutChart, StatCard } from '@/components/ui/chart';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { DatePicker } from '@/components/ui/date-picker';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';

interface RevenueData {
  summary: {
    total: number;
    avgBookingValue: number;
    totalBookings: number;
  };
  comparison: {
    revenueGrowth: number;
    bookingsGrowth: number;
  };
  byPeriod: { period: string; revenue: number; bookings: number }[];
  byServiceType: { serviceType: string; revenue: number; bookings: number }[];
  byCleaner: { cleanerId: string; cleanerName: string; revenue: number; bookings: number }[];
}

interface BookingData {
  summary: {
    total: number;
    completed: number;
    cancelled: number;
    pending: number;
    inProgress: number;
  };
  rates: {
    completionRate: number;
    cancellationRate: number;
    noShowRate: number;
  };
  byStatus: { status: string; count: number }[];
  byDayOfWeek: { day: string; count: number }[];
}

interface ClientData {
  summary: {
    total: number;
    newClients: number;
    returningClients: number;
    atRiskClients: number;
  };
  rates: {
    retentionRate: number;
    churnRate: number;
  };
  topClients: { id: string; name: string; revenue: number; bookings: number }[];
  byLoyaltyTier: { tier: string; count: number }[];
}

interface TeamData {
  members: {
    id: string;
    name: string;
    bookings: number;
    revenue: number;
    rating: number;
    efficiency: number;
    utilization: number;
  }[];
  averages: {
    rating: number;
    efficiency: number;
    utilization: number;
  };
}

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('revenue');
  const [period, setPeriod] = useState<'week' | 'month' | 'year'>('month');
  const [startDate, setStartDate] = useState<Date | null>(startOfMonth(new Date()));
  const [endDate, setEndDate] = useState<Date | null>(endOfMonth(new Date()));

  const [revenueData, setRevenueData] = useState<RevenueData | null>(null);
  const [bookingData, setBookingData] = useState<BookingData | null>(null);
  const [clientData, setClientData] = useState<ClientData | null>(null);
  const [teamData, setTeamData] = useState<TeamData | null>(null);

  useEffect(() => {
    fetchAllData();
  }, [period, startDate, endDate]);

  const fetchAllData = async () => {
    setLoading(true);
    const params = new URLSearchParams({ period });
    if (startDate) params.append('startDate', startDate.toISOString());
    if (endDate) params.append('endDate', endDate.toISOString());

    try {
      const [revenue, bookings, clients, team] = await Promise.all([
        fetch(`/api/reports/revenue?${params}`).then(r => r.json()),
        fetch(`/api/reports/bookings?${params}`).then(r => r.json()),
        fetch(`/api/reports/clients?${params}`).then(r => r.json()),
        fetch(`/api/reports/team?${params}`).then(r => r.json()),
      ]);

      if (revenue.success) setRevenueData(revenue.data);
      if (bookings.success) setBookingData(bookings.data);
      if (clients.success) setClientData(clients.data);
      if (team.success) setTeamData(team.data);
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (reportType: string) => {
    try {
      const res = await fetch('/api/reports/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportType,
          format: 'csv',
          period,
          startDate: startDate?.toISOString(),
          endDate: endDate?.toISOString(),
        }),
      });

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${reportType}-report-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      a.click();
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const formatCurrency = (value: number) => `$${value.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  const formatPercent = (value: number) => `${value.toFixed(1)}%`;

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Analytics & Reports</h1>
          <p className="text-gray-500 dark:text-gray-400">Track your business performance</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchAllData}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
          >
            <RefreshCw className={cn('w-5 h-5', loading && 'animate-spin')} />
          </button>
          <button
            onClick={() => handleExport(activeTab)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 mb-6 p-4 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">Period:</span>
          <div className="flex gap-1">
            {(['week', 'month', 'year'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={cn(
                  'px-3 py-1.5 text-sm rounded-md transition-colors',
                  period === p
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700'
                )}
              >
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <DatePicker value={startDate} onChange={setStartDate} placeholder="Start date" />
          <span className="text-gray-400">to</span>
          <DatePicker value={endDate} onChange={setEndDate} placeholder="End date" />
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="revenue" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="bookings">Bookings</TabsTrigger>
          <TabsTrigger value="clients">Clients</TabsTrigger>
          <TabsTrigger value="team">Team</TabsTrigger>
        </TabsList>

        {/* Revenue Tab */}
        <TabsContent value="revenue">
          {loading ? (
            <LoadingSkeleton />
          ) : revenueData ? (
            <div className="space-y-6">
              {/* Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <StatCard
                  title="Total Revenue"
                  value={formatCurrency(revenueData.summary.total)}
                  change={revenueData.comparison.revenueGrowth}
                  changeLabel="vs last period"
                  icon={<DollarSign className="w-6 h-6 text-green-600" />}
                />
                <StatCard
                  title="Total Bookings"
                  value={revenueData.summary.totalBookings}
                  change={revenueData.comparison.bookingsGrowth}
                  changeLabel="vs last period"
                  icon={<Calendar className="w-6 h-6 text-blue-600" />}
                />
                <StatCard
                  title="Avg Booking Value"
                  value={formatCurrency(revenueData.summary.avgBookingValue)}
                  icon={<TrendingUp className="w-6 h-6 text-purple-600" />}
                />
                <StatCard
                  title="Active Cleaners"
                  value={revenueData.byCleaner.length}
                  icon={<Users className="w-6 h-6 text-orange-600" />}
                />
              </div>

              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                  <h3 className="font-medium text-gray-900 dark:text-white mb-4">Revenue Over Time</h3>
                  <LineChart
                    data={revenueData.byPeriod.map(p => ({ label: p.period, value: p.revenue }))}
                    height={250}
                    showArea
                  />
                </div>
                <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                  <h3 className="font-medium text-gray-900 dark:text-white mb-4">Revenue by Service Type</h3>
                  <DonutChart
                    data={revenueData.byServiceType.map((s, i) => ({
                      label: s.serviceType,
                      value: s.revenue,
                      color: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'][i % 5],
                    }))}
                    size={180}
                  />
                </div>
              </div>

              {/* Top Cleaners */}
              <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="font-medium text-gray-900 dark:text-white mb-4">Revenue by Cleaner</h3>
                <BarChart
                  data={revenueData.byCleaner.slice(0, 10).map(c => ({
                    label: c.cleanerName,
                    value: c.revenue,
                    color: 'bg-blue-600',
                  }))}
                  height={200}
                />
              </div>
            </div>
          ) : (
            <EmptyState message="No revenue data available" />
          )}
        </TabsContent>

        {/* Bookings Tab */}
        <TabsContent value="bookings">
          {loading ? (
            <LoadingSkeleton />
          ) : bookingData ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <StatCard title="Total Bookings" value={bookingData.summary.total} />
                <StatCard title="Completed" value={bookingData.summary.completed} />
                <StatCard title="Pending" value={bookingData.summary.pending} />
                <StatCard title="Completion Rate" value={formatPercent(bookingData.rates.completionRate)} />
                <StatCard title="Cancellation Rate" value={formatPercent(bookingData.rates.cancellationRate)} />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                  <h3 className="font-medium text-gray-900 dark:text-white mb-4">Bookings by Status</h3>
                  <DonutChart
                    data={bookingData.byStatus.map((s, i) => ({
                      label: s.status,
                      value: s.count,
                      color: ['#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6'][i % 5],
                    }))}
                  />
                </div>
                <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                  <h3 className="font-medium text-gray-900 dark:text-white mb-4">Bookings by Day</h3>
                  <BarChart
                    data={bookingData.byDayOfWeek.map(d => ({
                      label: d.day,
                      value: d.count,
                      color: 'bg-blue-600',
                    }))}
                    height={200}
                  />
                </div>
              </div>
            </div>
          ) : (
            <EmptyState message="No booking data available" />
          )}
        </TabsContent>

        {/* Clients Tab */}
        <TabsContent value="clients">
          {loading ? (
            <LoadingSkeleton />
          ) : clientData ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <StatCard title="Total Clients" value={clientData.summary.total} />
                <StatCard title="New Clients" value={clientData.summary.newClients} />
                <StatCard title="Retention Rate" value={formatPercent(clientData.rates.retentionRate)} />
                <StatCard title="At Risk" value={clientData.summary.atRiskClients} />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                  <h3 className="font-medium text-gray-900 dark:text-white mb-4">Loyalty Tiers</h3>
                  <DonutChart
                    data={clientData.byLoyaltyTier.map((t, i) => ({
                      label: t.tier,
                      value: t.count,
                      color: ['#9ca3af', '#78716c', '#fbbf24', '#a855f7', '#06b6d4'][i % 5],
                    }))}
                  />
                </div>
                <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                  <h3 className="font-medium text-gray-900 dark:text-white mb-4">Top Clients by Revenue</h3>
                  <div className="space-y-3">
                    {clientData.topClients.slice(0, 5).map((client, idx) => (
                      <div key={client.id} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 text-sm flex items-center justify-center">
                            {idx + 1}
                          </span>
                          <span className="text-gray-900 dark:text-white">{client.name}</span>
                        </div>
                        <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(client.revenue)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <EmptyState message="No client data available" />
          )}
        </TabsContent>

        {/* Team Tab */}
        <TabsContent value="team">
          {loading ? (
            <LoadingSkeleton />
          ) : teamData ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatCard title="Avg Rating" value={teamData.averages.rating.toFixed(1)} />
                <StatCard title="Avg Efficiency" value={formatPercent(teamData.averages.efficiency)} />
                <StatCard title="Avg Utilization" value={formatPercent(teamData.averages.utilization)} />
              </div>

              <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="font-medium text-gray-900 dark:text-white">Team Performance</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-800">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Bookings</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Revenue</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Rating</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Efficiency</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Utilization</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {teamData.members.map((member) => (
                        <tr key={member.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                          <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">{member.name}</td>
                          <td className="px-4 py-3 text-sm text-right text-gray-600 dark:text-gray-400">{member.bookings}</td>
                          <td className="px-4 py-3 text-sm text-right text-gray-600 dark:text-gray-400">{formatCurrency(member.revenue)}</td>
                          <td className="px-4 py-3 text-sm text-right">
                            <Badge variant={member.rating >= 4.5 ? 'success' : member.rating >= 4 ? 'info' : 'warning'}>
                              {member.rating.toFixed(1)}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-sm text-right text-gray-600 dark:text-gray-400">{formatPercent(member.efficiency)}</td>
                          <td className="px-4 py-3 text-sm text-right text-gray-600 dark:text-gray-400">{formatPercent(member.utilization)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <EmptyState message="No team data available" />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-24 bg-gray-200 dark:bg-gray-800 rounded-lg" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="h-64 bg-gray-200 dark:bg-gray-800 rounded-lg" />
        <div className="h-64 bg-gray-200 dark:bg-gray-800 rounded-lg" />
      </div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="text-center py-12">
      <p className="text-gray-500 dark:text-gray-400">{message}</p>
    </div>
  );
}

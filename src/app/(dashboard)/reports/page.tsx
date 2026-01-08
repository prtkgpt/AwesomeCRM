'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DollarSign,
  TrendingUp,
  CheckCircle,
  Calendar,
  AlertCircle,
  Users,
  Clock,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface ReportData {
  period: string;
  revenue: number;
  completedJobs: number;
  unpaidAmount: number;
  upcomingJobs: number;
  dateRange: {
    start: string;
    end: string;
  };
}

interface TopClient {
  id: string;
  name: string;
  totalRevenue: number;
  jobCount: number;
  averageJobValue: number;
}

interface TeamMemberStats {
  id: string;
  name: string;
  revenue: number;
  jobsCompleted: number;
  averageJobValue: number;
}

export default function ReportsPage() {
  const [period, setPeriod] = useState<'week' | 'month' | 'year'>('month');
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [topClients, setTopClients] = useState<TopClient[]>([]);
  const [teamStats, setTeamStats] = useState<TeamMemberStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReportData();
    fetchTopClients();
    fetchTeamStats();
  }, [period]);

  const fetchReportData = async () => {
    try {
      const response = await fetch(`/api/reports?period=${period}`);
      const data = await response.json();

      if (data.success) {
        setReportData(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch report data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTopClients = async () => {
    try {
      const response = await fetch(`/api/reports/top-clients?period=${period}`);
      const data = await response.json();

      if (data.success) {
        setTopClients(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch top clients:', error);
    }
  };

  const fetchTeamStats = async () => {
    try {
      const response = await fetch(`/api/reports/team-performance?period=${period}`);
      const data = await response.json();

      if (data.success) {
        setTeamStats(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch team stats:', error);
    }
  };

  const formatDateRange = () => {
    if (!reportData) return '';
    const start = new Date(reportData.dateRange.start).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
    const end = new Date(reportData.dateRange.end).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    return `${start} - ${end}`;
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading reports...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Reports & Analytics
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {formatDateRange()}
          </p>
        </div>

        {/* Period Toggle */}
        <div className="flex gap-2 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
          <Button
            onClick={() => setPeriod('week')}
            variant={period === 'week' ? 'default' : 'ghost'}
            size="sm"
            className={period === 'week' ? 'bg-blue-600 text-white' : ''}
          >
            Week
          </Button>
          <Button
            onClick={() => setPeriod('month')}
            variant={period === 'month' ? 'default' : 'ghost'}
            size="sm"
            className={period === 'month' ? 'bg-blue-600 text-white' : ''}
          >
            Month
          </Button>
          <Button
            onClick={() => setPeriod('year')}
            variant={period === 'year' ? 'default' : 'ghost'}
            size="sm"
            className={period === 'year' ? 'bg-blue-600 text-white' : ''}
          >
            Year
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Revenue */}
        <Card className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium text-green-700 dark:text-green-300">
              Total Revenue
            </div>
            <DollarSign className="h-5 w-5 text-green-600 dark:text-green-400" />
          </div>
          <div className="text-3xl font-bold text-green-900 dark:text-green-100">
            {reportData ? formatCurrency(reportData.revenue) : '$0.00'}
          </div>
          <p className="text-xs text-green-600 dark:text-green-400 mt-2">
            From {reportData?.completedJobs || 0} completed jobs
          </p>
        </Card>

        {/* Unpaid Amount */}
        <Card className="p-6 bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 border-orange-200 dark:border-orange-800">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium text-orange-700 dark:text-orange-300">
              Unpaid Invoices
            </div>
            <AlertCircle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
          </div>
          <div className="text-3xl font-bold text-orange-900 dark:text-orange-100">
            {reportData ? formatCurrency(reportData.unpaidAmount) : '$0.00'}
          </div>
          <p className="text-xs text-orange-600 dark:text-orange-400 mt-2">
            Needs collection
          </p>
        </Card>

        {/* Completed Jobs */}
        <Card className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-800">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium text-blue-700 dark:text-blue-300">
              Completed Jobs
            </div>
            <CheckCircle className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="text-3xl font-bold text-blue-900 dark:text-blue-100">
            {reportData?.completedJobs || 0}
          </div>
          <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
            This {period}
          </p>
        </Card>

        {/* Upcoming Jobs */}
        <Card className="p-6 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border-purple-200 dark:border-purple-800">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium text-purple-700 dark:text-purple-300">
              Upcoming Jobs
            </div>
            <Calendar className="h-5 w-5 text-purple-600 dark:text-purple-400" />
          </div>
          <div className="text-3xl font-bold text-purple-900 dark:text-purple-100">
            {reportData?.upcomingJobs || 0}
          </div>
          <p className="text-xs text-purple-600 dark:text-purple-400 mt-2">
            Next 7 days
          </p>
        </Card>
      </div>

      {/* Top Clients */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              Top Clients by Revenue
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Your highest-value customers
            </p>
          </div>
          <TrendingUp className="h-6 w-6 text-blue-600 dark:text-blue-400" />
        </div>

        {topClients.length > 0 ? (
          <div className="space-y-3">
            {topClients.map((client, index) => (
              <div
                key={client.id}
                className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-bold">
                    {index + 1}
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900 dark:text-gray-100">
                      {client.name}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {client.jobCount} jobs • Avg: {formatCurrency(client.averageJobValue)}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xl font-bold text-green-600 dark:text-green-400">
                    {formatCurrency(client.totalRevenue)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            No client data available for this period
          </div>
        )}
      </Card>

      {/* Team Performance */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              Team Performance
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Revenue and productivity by team member
            </p>
          </div>
          <Users className="h-6 w-6 text-purple-600 dark:text-purple-400" />
        </div>

        {teamStats.length > 0 ? (
          <div className="space-y-3">
            {teamStats.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 font-bold">
                    {member.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900 dark:text-gray-100">
                      {member.name}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {member.jobsCompleted} jobs completed • Avg: {formatCurrency(member.averageJobValue)}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xl font-bold text-purple-600 dark:text-purple-400">
                    {formatCurrency(member.revenue)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            No team member data available for this period
          </div>
        )}
      </Card>

      {/* Average Job Value */}
      {reportData && reportData.completedJobs > 0 && (
        <Card className="p-6 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                Average Job Value
              </div>
              <div className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                {formatCurrency(reportData.revenue / reportData.completedJobs)}
              </div>
            </div>
            <div className="text-center">
              <div className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                Collection Rate
              </div>
              <div className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                {((reportData.revenue / (reportData.revenue + reportData.unpaidAmount)) * 100).toFixed(0)}%
              </div>
            </div>
            <div className="text-center">
              <div className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                Revenue Per Day
              </div>
              <div className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                {formatCurrency(
                  reportData.revenue /
                    Math.ceil(
                      (new Date(reportData.dateRange.end).getTime() -
                        new Date(reportData.dateRange.start).getTime()) /
                        (1000 * 60 * 60 * 24)
                    )
                )}
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

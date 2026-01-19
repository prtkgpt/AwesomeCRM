'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  History,
  Search,
  Filter,
  Clock,
  DollarSign,
  MapPin,
  Calendar,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Award,
  Briefcase,
  X
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDuration } from '@/lib/utils';

interface Job {
  id: string;
  scheduledDate: string;
  duration: number;
  serviceType: string;
  status: string;
  wage: number;
  hourlyRate: number;
  tip: number;
  totalEarned: number;
  notes: string | null;
  clockedInAt: string | null;
  clockedOutAt: string | null;
  client: {
    name: string;
    phone: string | null;
  };
  address: {
    street: string;
    city: string;
    state: string;
    zip: string;
  };
}

interface Stats {
  totalJobs: number;
  totalWages: number;
  totalTips: number;
  totalEarned: number;
  totalHours: number;
  avgPerJob: number;
}

interface Pagination {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
  hasMore: boolean;
}

export default function CleanerHistoryPage() {
  const { status } = useSession();
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [serviceTypes, setServiceTypes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [serviceType, setServiceType] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  const fetchHistory = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set('page', page.toString());
      params.set('limit', '20');
      if (search) params.set('search', search);
      if (serviceType !== 'all') params.set('serviceType', serviceType);
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);

      const res = await fetch(`/api/cleaner/history?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setJobs(data.data.jobs || []);
        setStats(data.data.stats || null);
        setPagination(data.data.pagination || null);
        setServiceTypes(data.data.serviceTypes || []);
      }
    } catch (error) {
      console.error('Failed to fetch job history:', error);
    } finally {
      setLoading(false);
    }
  }, [page, search, serviceType, startDate, endDate]);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated') {
      fetchHistory();
    }
  }, [status, router, fetchHistory]);

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (date: string) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const clearFilters = () => {
    setSearch('');
    setServiceType('all');
    setStartDate('');
    setEndDate('');
    setPage(1);
  };

  const hasActiveFilters = search || serviceType !== 'all' || startDate || endDate;

  if (loading && !jobs.length) {
    return (
      <div className="p-4 md:p-8 max-w-7xl mx-auto">
        <div className="mb-6 space-y-2">
          <Skeleton className="h-8 md:h-10 w-48" />
          <Skeleton className="h-4 md:h-5 w-72" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
            <History className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold">Job History</h1>
        </div>
        <p className="text-sm md:text-base text-gray-600 dark:text-gray-400">
          View your completed jobs and earnings over time
        </p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
          <Card className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/50 dark:to-blue-900/30 border-blue-200 dark:border-blue-800">
            <div className="flex items-center gap-2 mb-1">
              <Briefcase className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <span className="text-xs font-medium text-blue-700 dark:text-blue-300">Total Jobs</span>
            </div>
            <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{stats.totalJobs}</p>
          </Card>

          <Card className="p-4 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/50 dark:to-green-900/30 border-green-200 dark:border-green-800">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="h-4 w-4 text-green-600 dark:text-green-400" />
              <span className="text-xs font-medium text-green-700 dark:text-green-300">Total Earned</span>
            </div>
            <p className="text-2xl font-bold text-green-900 dark:text-green-100">${stats.totalEarned.toFixed(2)}</p>
          </Card>

          <Card className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/50 dark:to-purple-900/30 border-purple-200 dark:border-purple-800">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              <span className="text-xs font-medium text-purple-700 dark:text-purple-300">Total Hours</span>
            </div>
            <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">{stats.totalHours.toFixed(1)}h</p>
          </Card>

          <Card className="p-4 bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950/50 dark:to-orange-900/30 border-orange-200 dark:border-orange-800">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-orange-600 dark:text-orange-400" />
              <span className="text-xs font-medium text-orange-700 dark:text-orange-300">Avg/Job</span>
            </div>
            <p className="text-2xl font-bold text-orange-900 dark:text-orange-100">${stats.avgPerJob.toFixed(2)}</p>
          </Card>
        </div>
      )}

      {/* Tips Highlight */}
      {stats && stats.totalTips > 0 && (
        <Card className="p-4 mb-6 bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-950/30 dark:to-amber-950/30 border-yellow-300 dark:border-yellow-700">
          <div className="flex items-center gap-3">
            <Award className="h-8 w-8 text-yellow-600 dark:text-yellow-400" />
            <div>
              <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">Great work! You've earned</p>
              <p className="text-2xl font-bold text-yellow-900 dark:text-yellow-100">${stats.totalTips.toFixed(2)} in tips</p>
            </div>
          </div>
        </Card>
      )}

      {/* Search and Filters */}
      <div className="mb-6 space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search by client or address..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="pl-10"
            />
          </div>
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className={hasActiveFilters ? 'border-blue-500 text-blue-600' : ''}
          >
            <Filter className="h-4 w-4 mr-2" />
            Filters
            {hasActiveFilters && <span className="ml-1 w-2 h-2 bg-blue-500 rounded-full" />}
          </Button>
        </div>

        {/* Expandable Filters */}
        {showFilters && (
          <Card className="p-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Service Type</label>
                <select
                  value={serviceType}
                  onChange={(e) => { setServiceType(e.target.value); setPage(1); }}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
                >
                  <option value="all">All Types</option>
                  {serviceTypes.map((type) => (
                    <option key={type} value={type}>
                      {type.charAt(0) + type.slice(1).toLowerCase().replace('_', ' ')}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">From Date</label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">To Date</label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
                />
              </div>
            </div>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="text-gray-500">
                <X className="h-4 w-4 mr-1" />
                Clear all filters
              </Button>
            )}
          </Card>
        )}
      </div>

      {/* Jobs List */}
      {jobs.length === 0 ? (
        <Card className="p-12 text-center">
          <History className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-medium text-gray-600 dark:text-gray-400 mb-2">
            {hasActiveFilters ? 'No jobs match your filters' : 'No completed jobs yet'}
          </h3>
          <p className="text-sm text-gray-500">
            {hasActiveFilters
              ? 'Try adjusting your filters to see more results'
              : 'Your completed jobs will appear here'}
          </p>
          {hasActiveFilters && (
            <Button variant="outline" onClick={clearFilters} className="mt-4">
              Clear filters
            </Button>
          )}
        </Card>
      ) : (
        <div className="space-y-3">
          {jobs.map((job) => (
            <Card key={job.id} className="p-4 hover:shadow-md transition-shadow">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                {/* Job Info */}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-lg">{job.client.name}</h3>
                    <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                      {job.serviceType}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-600 dark:text-gray-400">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>{formatDate(job.scheduledDate)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      <span>{formatTime(job.scheduledDate)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      <span>{job.address.city}, {job.address.state}</span>
                    </div>
                  </div>
                </div>

                {/* Earnings */}
                <div className="flex items-center gap-4 md:text-right">
                  <div className="flex-1 md:flex-none">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Duration</p>
                    <p className="font-medium">{formatDuration(job.duration)}</p>
                  </div>
                  <div className="flex-1 md:flex-none">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Earned</p>
                    <p className="font-bold text-green-600 dark:text-green-400 text-lg">
                      ${job.totalEarned.toFixed(2)}
                    </p>
                    {job.tip > 0 && (
                      <p className="text-xs text-yellow-600 dark:text-yellow-400">
                        incl. ${job.tip.toFixed(2)} tip
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Time tracking details */}
              {(job.clockedInAt || job.clockedOutAt) && (
                <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
                  <div className="flex flex-wrap gap-4 text-xs text-gray-500">
                    {job.clockedInAt && (
                      <span>Clocked in: {formatTime(job.clockedInAt)}</span>
                    )}
                    {job.clockedOutAt && (
                      <span>Clocked out: {formatTime(job.clockedOutAt)}</span>
                    )}
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Showing {((pagination.page - 1) * pagination.limit) + 1} - {Math.min(pagination.page * pagination.limit, pagination.totalCount)} of {pagination.totalCount} jobs
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page === 1}
              onClick={() => setPage(pagination.page - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!pagination.hasMore}
              onClick={() => setPage(pagination.page + 1)}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

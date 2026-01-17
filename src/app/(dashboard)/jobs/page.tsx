'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Filter, X, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { formatDateTime, formatCurrency, formatDuration } from '@/lib/utils';
import type { BookingWithRelations } from '@/types';

export default function JobsPage() {
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming');
  const [bookings, setBookings] = useState<BookingWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  // Filter states
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [clientSearch, setClientSearch] = useState('');

  // Bulk action states
  const [selectedJobs, setSelectedJobs] = useState<Set<string>>(new Set());
  const [bulkUpdating, setBulkUpdating] = useState(false);

  useEffect(() => {
    fetchBookings();
  }, [tab, statusFilter, paymentFilter, dateFrom, dateTo, clientSearch]);

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const now = new Date();
      const params = new URLSearchParams();

      // Apply date range filters based on custom filters or tab
      if (dateFrom || dateTo) {
        // If user has custom date filters, use those
        if (dateFrom) {
          params.append('from', new Date(dateFrom).toISOString());
        }
        if (dateTo) {
          params.append('to', new Date(dateTo + 'T23:59:59').toISOString());
        }
      } else {
        // Otherwise, use tab-based date filters
        if (tab === 'upcoming') {
          params.append('from', now.toISOString());
        } else {
          params.append('to', now.toISOString());
        }
      }

      // Apply status filter
      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      } else if (tab === 'upcoming') {
        // Default to SCHEDULED for upcoming jobs if no status filter
        params.append('status', 'SCHEDULED');
      }

      const response = await fetch(`/api/bookings?${params}`);
      const data = await response.json();

      if (data.success) {
        let filtered = data.data;

        // Client-side filters
        if (clientSearch) {
          filtered = filtered.filter((booking: BookingWithRelations) => {
            const clientName = booking.client.name ?? `${booking.client.firstName || ''} ${booking.client.lastName || ''}`.trim();
            return clientName.toLowerCase().includes(clientSearch.toLowerCase());
          });
        }

        if (paymentFilter === 'paid') {
          filtered = filtered.filter((booking: BookingWithRelations) => booking.isPaid);
        } else if (paymentFilter === 'unpaid') {
          filtered = filtered.filter((booking: BookingWithRelations) => !booking.isPaid);
        }

        setBookings(filtered);
      }
    } catch (error) {
      console.error('Failed to fetch bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  const clearFilters = () => {
    setStatusFilter('all');
    setPaymentFilter('all');
    setDateFrom('');
    setDateTo('');
    setClientSearch('');
    setShowFilters(false);
  };

  const hasActiveFilters = statusFilter !== 'all' || paymentFilter !== 'all' || dateFrom || dateTo || clientSearch;

  // Bulk action handlers
  const toggleJobSelection = (jobId: string) => {
    const newSelected = new Set(selectedJobs);
    if (newSelected.has(jobId)) {
      newSelected.delete(jobId);
    } else {
      newSelected.add(jobId);
    }
    setSelectedJobs(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedJobs.size === bookings.length) {
      setSelectedJobs(new Set());
    } else {
      setSelectedJobs(new Set(bookings.map(b => b.id)));
    }
  };

  const bulkMarkComplete = async () => {
    setBulkUpdating(true);
    try {
      await Promise.all(
        Array.from(selectedJobs).map(jobId =>
          fetch(`/api/bookings/${jobId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'COMPLETED' }),
          })
        )
      );
      setSelectedJobs(new Set());
      fetchBookings();
    } catch (error) {
      alert('Failed to update jobs');
    } finally {
      setBulkUpdating(false);
    }
  };

  const bulkMarkPaid = async () => {
    setBulkUpdating(true);
    try {
      await Promise.all(
        Array.from(selectedJobs).map(jobId =>
          fetch('/api/payments/mark-paid', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ bookingId: jobId }),
          })
        )
      );
      setSelectedJobs(new Set());
      fetchBookings();
    } catch (error) {
      alert('Failed to mark jobs as paid');
    } finally {
      setBulkUpdating(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SCHEDULED':
        return 'bg-blue-100 text-blue-700';
      case 'COMPLETED':
        return 'bg-green-100 text-green-700';
      case 'CANCELLED':
        return 'bg-gray-100 text-gray-700';
      case 'NO_SHOW':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-6 md:space-y-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">Jobs</h1>
          <p className="text-gray-600 dark:text-gray-400 text-sm md:text-base mt-2">
            Manage your cleaning jobs and schedules
          </p>
        </div>
        <div className="flex gap-3">
          <Link href="/jobs/import">
            <Button variant="outline">
              <Upload className="h-4 w-4" />
              Import
            </Button>
          </Link>
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className={hasActiveFilters ? 'border-blue-500 dark:border-blue-400 text-blue-600 dark:text-blue-400' : ''}
          >
            <Filter className="h-4 w-4" />
            Filters
            {hasActiveFilters && (
              <span className="ml-2 bg-blue-500 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center font-bold">
                !
              </span>
            )}
          </Button>
          <Link href="/jobs/new">
            <Button>
              <Plus className="h-4 w-4" />
              New Job
            </Button>
          </Link>
        </div>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <Card className="p-6 md:p-8 space-y-6 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900/50 dark:to-gray-900/30 border-2">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-xl text-gray-900 dark:text-gray-100">Filters</h3>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="h-4 w-4" />
                Clear All
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">
                Status
              </label>
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All Status</option>
                <option value="SCHEDULED">Scheduled</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
                <option value="NO_SHOW">No Show</option>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">
                Payment
              </label>
              <Select
                value={paymentFilter}
                onChange={(e) => setPaymentFilter(e.target.value)}
              >
                <option value="all">All Payments</option>
                <option value="paid">Paid</option>
                <option value="unpaid">Unpaid</option>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">
                Search Client
              </label>
              <Input
                type="text"
                placeholder="Search by client name..."
                value={clientSearch}
                onChange={(e) => setClientSearch(e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">
                From Date
              </label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">
                To Date
              </label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
          </div>
        </Card>
      )}

      <div className="flex gap-2 bg-white p-1 rounded-lg shadow-sm">
        <button
          onClick={() => setTab('upcoming')}
          className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${
            tab === 'upcoming'
              ? 'bg-primary text-white'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Upcoming
        </button>
        <button
          onClick={() => setTab('past')}
          className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${
            tab === 'past'
              ? 'bg-primary text-white'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Past
        </button>
      </div>

      {loading ? (
        <div className="text-center py-8 text-gray-500">Loading...</div>
      ) : bookings.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">
            No {tab} jobs found
          </p>
          <Link href="/jobs/new">
            <Button>
              <Plus className="h-4 w-4 mr-1" />
              Create Your First Job
            </Button>
          </Link>
        </div>
      ) : (
        <>
          {bookings.length > 0 && (
            <div className="flex items-center gap-2 bg-white p-3 rounded-lg shadow-sm">
              <input
                type="checkbox"
                checked={selectedJobs.size === bookings.length && bookings.length > 0}
                onChange={toggleSelectAll}
                className="h-4 w-4 rounded border-gray-300"
              />
              <span className="text-sm text-gray-600">
                {selectedJobs.size > 0
                  ? `${selectedJobs.size} selected`
                  : 'Select all'}
              </span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
            {bookings.map((booking) => (
              <Card
                key={booking.id}
                className={`p-4 md:p-5 hover:shadow-lg transition-shadow ${
                  !booking.assignee
                    ? 'bg-pink-50 dark:bg-pink-950/20 border-pink-200 dark:border-pink-900'
                    : ''
                }`}
              >
                <div className="flex flex-col h-full">
                  <div className="flex items-start gap-3 mb-3">
                    <input
                      type="checkbox"
                      checked={selectedJobs.has(booking.id)}
                      onChange={(e) => {
                        e.stopPropagation();
                        toggleJobSelection(booking.id);
                      }}
                      className="h-5 w-5 rounded border-gray-300 mt-1"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span
                          className={`text-xs px-2 py-1 rounded-full ${getStatusColor(
                            booking.status
                          )}`}
                        >
                          {booking.status}
                        </span>
                        {booking.isRecurring && (
                          <span className="text-xs px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded-full">
                            Recurring
                          </span>
                        )}
                        {!booking.assignee && (
                          <span className="text-xs px-2 py-1 bg-pink-200 dark:bg-pink-900/60 text-pink-900 dark:text-pink-100 rounded-full font-medium">
                            ⚠️ No Cleaner
                          </span>
                        )}
                      </div>
                      <Link href={`/jobs/${booking.id}`}>
                        <h3 className="font-semibold text-lg mb-1 hover:text-blue-600 dark:hover:text-blue-400">
                          {booking.client.name ?? `${booking.client.firstName || ''} ${booking.client.lastName || ''}`.trim()}
                        </h3>
                      </Link>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {formatDateTime(booking.scheduledDate)}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {booking.address.street}, {booking.address.city}
                      </p>
                      {booking.assignee ? (
                        <p className="text-sm text-blue-600 dark:text-blue-400 mt-1 font-medium">
                          👤 {booking.assignee.user.name || 'Cleaner'}
                        </p>
                      ) : (
                        <p className="text-sm text-pink-700 dark:text-pink-300 mt-1 font-medium">
                          👤 Unassigned
                        </p>
                      )}
                      <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                        {booking.serviceType} • {formatDuration(booking.duration)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-auto pt-3 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
                    <div className="font-semibold text-lg">
                      {formatCurrency(booking.price ?? booking.finalPrice ?? 0)}
                    </div>
                    <div className="flex gap-1">
                      {!booking.isPaid && booking.status === 'COMPLETED' && (
                        <span className="text-xs px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 rounded-full">
                          Unpaid
                        </span>
                      )}
                      {booking.isPaid && (
                        <span className="text-xs px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full">
                          Paid
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* Bulk Action Bar */}
      {selectedJobs.size > 0 && (
        <div className="fixed bottom-20 md:bottom-6 left-0 right-0 mx-4 md:mx-auto md:max-w-2xl bg-blue-600 dark:bg-blue-500 text-white p-4 md:p-5 rounded-lg shadow-xl z-50">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <span className="font-semibold text-lg">{selectedJobs.size} job{selectedJobs.size > 1 ? 's' : ''} selected</span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={bulkMarkComplete}
                disabled={bulkUpdating}
                className="bg-white text-blue-600 hover:bg-gray-100 flex-1 md:flex-none"
              >
                Mark Completed
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={bulkMarkPaid}
                disabled={bulkUpdating}
                className="bg-white text-blue-600 hover:bg-gray-100 flex-1 md:flex-none"
              >
                Mark Paid
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedJobs(new Set())}
                className="text-white hover:bg-blue-700 dark:hover:bg-blue-600"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Filter, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { formatDateTime, formatCurrency } from '@/lib/utils';
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

  useEffect(() => {
    fetchBookings();
  }, [tab, statusFilter, paymentFilter, dateFrom, dateTo, clientSearch]);

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const now = new Date();
      const params = new URLSearchParams();

      // Apply tab-based date filters
      if (tab === 'upcoming') {
        params.append('from', now.toISOString());
        if (statusFilter === 'all') {
          params.append('status', 'SCHEDULED');
        }
      } else {
        params.append('to', now.toISOString());
      }

      // Apply status filter
      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }

      // Apply date range filters
      if (dateFrom) {
        params.append('from', new Date(dateFrom).toISOString());
      }
      if (dateTo) {
        params.append('to', new Date(dateTo + 'T23:59:59').toISOString());
      }

      const response = await fetch(`/api/bookings?${params}`);
      const data = await response.json();

      if (data.success) {
        let filtered = data.data;

        // Client-side filters
        if (clientSearch) {
          filtered = filtered.filter((booking: BookingWithRelations) =>
            booking.client.name.toLowerCase().includes(clientSearch.toLowerCase())
          );
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
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Jobs</h1>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className={hasActiveFilters ? 'border-blue-500 text-blue-600' : ''}
          >
            <Filter className="h-4 w-4 mr-1" />
            Filters
            {hasActiveFilters && (
              <span className="ml-1 bg-blue-500 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center">
                !
              </span>
            )}
          </Button>
          <Link href="/jobs/new">
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1" />
              New Job
            </Button>
          </Link>
        </div>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <Card className="p-4 space-y-4 bg-gray-50">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Filters</h3>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="h-4 w-4 mr-1" />
                Clear All
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">
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
              <label className="text-sm font-medium text-gray-700 mb-1 block">
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
              <label className="text-sm font-medium text-gray-700 mb-1 block">
                From Date
              </label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">
                To Date
              </label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-sm font-medium text-gray-700 mb-1 block">
                Search Client
              </label>
              <Input
                type="text"
                placeholder="Search by client name..."
                value={clientSearch}
                onChange={(e) => setClientSearch(e.target.value)}
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
        <div className="space-y-3">
          {bookings.map((booking) => (
            <Link key={booking.id} href={`/jobs/${booking.id}`}>
              <Card className="p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${getStatusColor(
                          booking.status
                        )}`}
                      >
                        {booking.status}
                      </span>
                      {booking.isRecurring && (
                        <span className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded-full">
                          Recurring
                        </span>
                      )}
                    </div>
                    <h3 className="font-semibold text-lg">{booking.client.name}</h3>
                    <p className="text-sm text-gray-600">
                      {formatDateTime(booking.scheduledDate)}
                    </p>
                    <p className="text-sm text-gray-600">
                      {booking.address.street}, {booking.address.city}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      {booking.serviceType} • {booking.duration} min
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-lg">
                      {formatCurrency(booking.price)}
                    </div>
                    {!booking.isPaid && booking.status === 'COMPLETED' && (
                      <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full">
                        Unpaid
                      </span>
                    )}
                    {booking.isPaid && (
                      <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full">
                        Paid
                      </span>
                    )}
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

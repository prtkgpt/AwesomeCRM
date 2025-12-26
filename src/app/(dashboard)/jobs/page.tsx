'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { formatDateTime, formatCurrency } from '@/lib/utils';
import type { BookingWithRelations } from '@/types';

export default function JobsPage() {
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming');
  const [bookings, setBookings] = useState<BookingWithRelations[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBookings();
  }, [tab]);

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const now = new Date();
      const params = new URLSearchParams();

      if (tab === 'upcoming') {
        params.append('from', now.toISOString());
        params.append('status', 'SCHEDULED');
      } else {
        params.append('to', now.toISOString());
      }

      const response = await fetch(`/api/bookings?${params}`);
      const data = await response.json();

      if (data.success) {
        setBookings(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch bookings:', error);
    } finally {
      setLoading(false);
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
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Jobs</h1>
        <Link href="/jobs/new">
          <Button size="sm">
            <Plus className="h-4 w-4 mr-1" />
            New Job
          </Button>
        </Link>
      </div>

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

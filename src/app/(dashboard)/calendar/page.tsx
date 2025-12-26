'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { formatDate, formatTime, formatCurrency } from '@/lib/utils';
import type { BookingWithRelations } from '@/types';
import { addDays, subDays, format } from 'date-fns';

export default function CalendarPage() {
  const [date, setDate] = useState(new Date());
  const [bookings, setBookings] = useState<BookingWithRelations[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCalendar();
  }, [date]);

  const fetchCalendar = async () => {
    try {
      const params = new URLSearchParams({
        date: date.toISOString(),
        view: 'day',
      });

      const response = await fetch(`/api/calendar?${params}`);
      const data = await response.json();

      if (data.success) {
        setBookings(data.data.bookings);
      }
    } catch (error) {
      console.error('Failed to fetch calendar:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePrevDay = () => setDate(subDays(date, 1));
  const handleNextDay = () => setDate(addDays(date, 1));
  const handleToday = () => setDate(new Date());

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
        <h1 className="text-2xl font-bold">Calendar</h1>
        <Link href="/jobs/new">
          <Button size="sm">
            <Plus className="h-4 w-4 mr-1" />
            New Job
          </Button>
        </Link>
      </div>

      <div className="flex items-center justify-between bg-white p-3 rounded-lg shadow-sm">
        <Button variant="outline" size="sm" onClick={handlePrevDay}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="text-center">
          <div className="font-semibold">{format(date, 'EEEE')}</div>
          <div className="text-sm text-gray-600">{formatDate(date, 'MMM d, yyyy')}</div>
        </div>
        <Button variant="outline" size="sm" onClick={handleNextDay}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="text-center">
        <Button variant="ghost" size="sm" onClick={handleToday}>
          Today
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-8 text-gray-500">Loading...</div>
      ) : bookings.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">No jobs scheduled for this day</p>
          <Link href="/jobs/new">
            <Button>
              <Plus className="h-4 w-4 mr-1" />
              Add a Job
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
                      <span className="font-semibold text-lg">
                        {formatTime(booking.scheduledDate)}
                      </span>
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${getStatusColor(
                          booking.status
                        )}`}
                      >
                        {booking.status}
                      </span>
                    </div>
                    <h3 className="font-semibold">{booking.client.name}</h3>
                    <p className="text-sm text-gray-600">
                      {booking.address.street}, {booking.address.city}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      {booking.serviceType} • {booking.duration} min •{' '}
                      {formatCurrency(booking.price)}
                    </p>
                  </div>
                  {!booking.isPaid && booking.status === 'COMPLETED' && (
                    <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full">
                      Unpaid
                    </span>
                  )}
                </div>
                {booking.notes && (
                  <p className="text-sm text-gray-600 mt-2 border-t pt-2">
                    {booking.notes}
                  </p>
                )}
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  ChevronLeft,
  ChevronRight,
  Search,
  Plus,
} from 'lucide-react';

interface Booking {
  id: string;
  scheduledDate: string;
  duration: number;
  serviceType: string;
  status: string;
  price: number;
  client: {
    id: string;
    name: string;
  };
  address: {
    street: string;
    city: string;
  };
  assignee?: {
    id: string;
    user: {
      name: string | null;
      email: string;
    };
  };
}

interface CleanerStats {
  id: string;
  name: string;
  email: string;
  jobCount: number;
  color: string;
}

type ViewMode = 'month' | 'list';

export default function CalendarPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [cleaners, setCleaners] = useState<CleanerStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCleaners, setSelectedCleaners] = useState<string[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch bookings
      const bookingsRes = await fetch('/api/bookings');
      if (bookingsRes.ok) {
        const data = await bookingsRes.json();
        setBookings(data.data || []);
      }

      // Fetch team members (cleaners)
      const teamRes = await fetch('/api/team/members');
      if (teamRes.ok) {
        const data = await teamRes.json();
        const members = data.data || [];

        // Assign colors to cleaners
        const colors = [
          '#3b82f6', '#10b981', '#f59e0b', '#ef4444',
          '#8b5cf6', '#ec4899', '#06b6d4', '#14b8a6',
        ];

        const stats: CleanerStats[] = members.map((member: any, index: number) => ({
          id: member.user.id,
          name: member.user.name || member.user.email,
          email: member.user.email,
          jobCount: 0,
          color: colors[index % colors.length],
        }));

        setCleaners(stats);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate job counts based on current view
  const getJobCounts = () => {
    const counts = new Map<string, number>();

    bookings.forEach((booking) => {
      const bookingDate = new Date(booking.scheduledDate);
      const cleanerId = booking.assignee?.id;

      if (!cleanerId) return;

      if (viewMode === 'month') {
        if (
          bookingDate.getMonth() === currentDate.getMonth() &&
          bookingDate.getFullYear() === currentDate.getFullYear()
        ) {
          counts.set(cleanerId, (counts.get(cleanerId) || 0) + 1);
        }
      } else {
        // For list view, count all
        counts.set(cleanerId, (counts.get(cleanerId) || 0) + 1);
      }
    });

    return cleaners.map((cleaner) => ({
      ...cleaner,
      jobCount: counts.get(cleaner.id) || 0,
    }));
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    return { daysInMonth, startingDayOfWeek };
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const getBookingsForDate = (date: Date) => {
    return bookings.filter((booking) => {
      const bookingDate = new Date(booking.scheduledDate);
      const cleanerMatch =
        selectedCleaners.length === 0 ||
        (booking.assignee && selectedCleaners.includes(booking.assignee.id));

      return (
        bookingDate.getDate() === date.getDate() &&
        bookingDate.getMonth() === date.getMonth() &&
        bookingDate.getFullYear() === date.getFullYear() &&
        cleanerMatch
      );
    });
  };

  const renderMonthView = () => {
    const { daysInMonth, startingDayOfWeek } = getDaysInMonth(currentDate);
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    const cells = [];

    // Empty cells before first day
    for (let i = 0; i < startingDayOfWeek; i++) {
      cells.push(
        <div
          key={`empty-${i}`}
          className="min-h-24 p-2 border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900"
        />
      );
    }

    // Days of month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
      const dayBookings = getBookingsForDate(date);
      const isToday =
        date.getDate() === new Date().getDate() &&
        date.getMonth() === new Date().getMonth() &&
        date.getFullYear() === new Date().getFullYear();

      cells.push(
        <div
          key={day}
          className={`min-h-24 p-2 border border-gray-200 dark:border-gray-700 overflow-hidden ${
            isToday
              ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-500'
              : 'bg-white dark:bg-gray-800'
          }`}
        >
          <div
            className={`text-sm font-semibold mb-1 ${
              isToday
                ? 'text-blue-600 dark:text-blue-400'
                : 'text-gray-700 dark:text-gray-300'
            }`}
          >
            {day}
          </div>
          <div className="space-y-1">
            {dayBookings.slice(0, 3).map((booking) => {
              const cleaner = cleaners.find(
                (c) => c.id === booking.assignee?.id
              );
              return (
                <Link key={booking.id} href={`/jobs/${booking.id}`}>
                  <div
                    className="text-xs p-1 rounded truncate cursor-pointer hover:opacity-80 transition-opacity"
                    style={{
                      backgroundColor: cleaner?.color || '#6b7280',
                      color: 'white',
                    }}
                    title={`${booking.client.name} - ${booking.serviceType}${
                      booking.assignee
                        ? ` - ${booking.assignee.user.name}`
                        : ''
                    }`}
                  >
                    {booking.client.name}
                  </div>
                </Link>
              );
            })}
            {dayBookings.length > 3 && (
              <div className="text-xs text-gray-500 dark:text-gray-400">
                +{dayBookings.length - 3} more
              </div>
            )}
          </div>
        </div>
      );
    }

    return (
      <div>
        <div className="grid grid-cols-7 gap-0 mb-2 bg-gray-100 dark:bg-gray-900">
          {dayNames.map((day) => (
            <div
              key={day}
              className="text-center font-semibold text-sm text-gray-700 dark:text-gray-300 py-3 border-b-2 border-gray-300 dark:border-gray-600"
            >
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-0">{cells}</div>
      </div>
    );
  };

  const renderListView = () => {
    const filteredBookings = bookings.filter((booking) => {
      const cleanerMatch =
        selectedCleaners.length === 0 ||
        (booking.assignee &&
          selectedCleaners.includes(booking.assignee.id));

      return cleanerMatch;
    });

    const sortedBookings = [...filteredBookings].sort(
      (a, b) =>
        new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime()
    );

    return (
      <div className="space-y-2">
        {sortedBookings.length === 0 ? (
          <div className="text-center py-8 text-gray-500">No bookings found</div>
        ) : (
          sortedBookings.map((booking) => {
            const cleaner = cleaners.find(
              (c) => c.id === booking.assignee?.id
            );
            return (
              <Link key={booking.id} href={`/jobs/${booking.id}`}>
                <Card className="p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        {cleaner && (
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: cleaner.color }}
                          />
                        )}
                        <h3 className="font-semibold">{booking.client.name}</h3>
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {booking.serviceType}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                        <p>
                          {new Date(booking.scheduledDate).toLocaleDateString(
                            'en-US',
                            {
                              weekday: 'long',
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                            }
                          )}{' '}
                          at{' '}
                          {new Date(booking.scheduledDate).toLocaleTimeString(
                            'en-US',
                            {
                              hour: 'numeric',
                              minute: '2-digit',
                            }
                          )}
                        </p>
                        <p>
                          {booking.address.street}, {booking.address.city}
                        </p>
                        {booking.assignee && (
                          <p>
                            Assigned to:{' '}
                            {booking.assignee.user.name ||
                              booking.assignee.user.email}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                        ${booking.price.toFixed(2)}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {booking.duration} min
                      </p>
                    </div>
                  </div>
                </Card>
              </Link>
            );
          })
        )}
      </div>
    );
  };

  const cleanerStats = getJobCounts();
  const filteredCleaners = cleanerStats.filter((cleaner) =>
    cleaner.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const unassignedCount = bookings.filter((b) => !b.assignee).length;

  return (
    <div className="p-4 md:p-8">
      <div className="flex gap-6">
        {/* Main Calendar Area */}
        <div className="flex-1">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-3xl md:text-4xl font-bold">Calendar</h1>
              <Link href="/jobs/new">
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  New Job
                </Button>
              </Link>
            </div>

            {/* Controls */}
            <div className="flex flex-wrap items-center gap-4">
              {/* Date Navigation */}
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigateMonth('prev')}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={goToToday}>
                  Today
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigateMonth('next')}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              {/* Current Date Display */}
              <div className="text-lg font-semibold">
                {currentDate.toLocaleDateString('en-US', {
                  month: 'long',
                  year: 'numeric',
                })}
              </div>

              {/* View Mode Selector */}
              <div className="ml-auto flex gap-2">
                <Button
                  variant={viewMode === 'month' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('month')}
                >
                  Month
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                >
                  List
                </Button>
              </div>
            </div>
          </div>

          {/* Calendar Display */}
          <Card className="p-4 overflow-hidden">
            {loading ? (
              <div className="text-center py-12 text-gray-500">Loading...</div>
            ) : (
              <>
                {viewMode === 'month' && renderMonthView()}
                {viewMode === 'list' && renderListView()}
              </>
            )}
          </Card>
        </div>

        {/* Providers Sidebar */}
        <div className="w-80 hidden lg:block">
          <Card className="p-4 sticky top-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Providers</h2>
            </div>

            {/* Search */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by name"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Unassigned */}
            <div className="mb-4 pb-4 border-b dark:border-gray-700">
              <div className="flex items-center gap-3 p-2">
                <div className="w-3 h-3 rounded-full bg-pink-500 flex-shrink-0" />
                <span className="flex-1 text-sm">Unassigned</span>
                <span className="text-sm text-gray-500 font-medium">
                  {unassignedCount}
                </span>
              </div>
            </div>

            {/* Cleaners List */}
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {filteredCleaners.map((cleaner) => (
                <label
                  key={cleaner.id}
                  className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 p-2 rounded transition-colors"
                >
                  <input
                    type="checkbox"
                    className="rounded"
                    checked={selectedCleaners.includes(cleaner.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedCleaners([...selectedCleaners, cleaner.id]);
                      } else {
                        setSelectedCleaners(
                          selectedCleaners.filter((id) => id !== cleaner.id)
                        );
                      }
                    }}
                  />
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: cleaner.color }}
                  />
                  <span className="flex-1 text-sm truncate">{cleaner.name}</span>
                  <span className="text-sm text-gray-500 font-medium">
                    {cleaner.jobCount}
                  </span>
                </label>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

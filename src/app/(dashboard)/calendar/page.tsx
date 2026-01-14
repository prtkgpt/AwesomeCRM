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
import { formatDuration } from '@/lib/utils';

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
  availability?: {
    recurring?: {
      [key: string]: { available: boolean; start: string; end: string };
    };
    overrides?: {
      [key: string]: { available: boolean; start?: string; end?: string };
    };
  };
}

type ViewMode = 'month' | 'week' | 'day' | 'list';

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

      // Fetch team members (cleaners only - exclude admin/office staff/owner)
      const teamRes = await fetch('/api/team/members');
      if (teamRes.ok) {
        const data = await teamRes.json();
        const members = data.data || [];

        // Filter to only show CLEANER role (exclude ADMIN, OWNER, etc.)
        const cleanerMembers = members.filter((member: any) => member.user.role === 'CLEANER');

        // Assign colors to cleaners
        const colors = [
          '#3b82f6', '#10b981', '#f59e0b', '#ef4444',
          '#8b5cf6', '#ec4899', '#06b6d4', '#14b8a6',
        ];

        const stats: CleanerStats[] = cleanerMembers.map((member: any, index: number) => ({
          id: member.user.id,
          name: member.user.name || member.user.email,
          email: member.user.email,
          jobCount: 0,
          color: colors[index % colors.length],
          teamMemberId: member.id, // Store team member ID for fetching availability
        }));

        // Fetch availability for each cleaner
        const statsWithAvailability = await Promise.all(
          stats.map(async (cleaner: any) => {
            try {
              const availRes = await fetch(`/api/team/members/${cleaner.teamMemberId}/availability`);
              if (availRes.ok) {
                const availData = await availRes.json();
                return {
                  ...cleaner,
                  availability: availData.data?.availability,
                };
              }
            } catch (err) {
              console.error(`Failed to fetch availability for ${cleaner.name}`, err);
            }
            return cleaner;
          })
        );

        setCleaners(statsWithAvailability);
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

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() + (direction === 'next' ? 7 : -7));
    setCurrentDate(newDate);
  };

  const navigateDay = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() + (direction === 'next' ? 1 : -1));
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const getWeekDays = () => {
    const start = new Date(currentDate);
    start.setDate(currentDate.getDate() - currentDate.getDay()); // Start from Sunday

    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      return date;
    });
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

  // Check if any selected cleaners are unavailable on this date
  const getUnavailableCleaners = (date: Date) => {
    if (selectedCleaners.length === 0) return [];

    const dayName = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][date.getDay()];
    const dateKey = date.toISOString().split('T')[0]; // YYYY-MM-DD

    return selectedCleaners.filter(cleanerId => {
      const cleaner = cleaners.find(c => c.id === cleanerId);
      if (!cleaner?.availability) return false;

      // Check override first
      if (cleaner.availability.overrides?.[dateKey]) {
        return !cleaner.availability.overrides[dateKey].available;
      }

      // Check recurring schedule
      if (cleaner.availability.recurring?.[dayName]) {
        return !cleaner.availability.recurring[dayName].available;
      }

      return false;
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
      const unavailableCleaners = getUnavailableCleaners(date);
      const isToday =
        date.getDate() === new Date().getDate() &&
        date.getMonth() === new Date().getMonth() &&
        date.getFullYear() === new Date().getFullYear();
      const hasUnavailable = unavailableCleaners.length > 0;

      cells.push(
        <div
          key={day}
          className={`min-h-24 p-2 border border-gray-200 dark:border-gray-700 overflow-hidden ${
            isToday
              ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-500'
              : hasUnavailable
              ? 'bg-red-50/50 dark:bg-red-900/10 border-red-200 dark:border-red-800'
              : 'bg-white dark:bg-gray-800'
          }`}
          style={hasUnavailable ? {
            backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(239, 68, 68, 0.1) 10px, rgba(239, 68, 68, 0.1) 20px)'
          } : undefined}
        >
          <div className="flex items-center justify-between mb-1">
            <div
              className={`text-sm font-semibold ${
                isToday
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-gray-700 dark:text-gray-300'
              }`}
            >
              {day}
            </div>
            {hasUnavailable && (
              <div className="text-xs text-red-600 dark:text-red-400" title={`${unavailableCleaners.length} cleaner(s) unavailable`}>
                🔒
              </div>
            )}
          </div>
          <div className="space-y-1">
            {dayBookings.slice(0, 3).map((booking) => {
              const cleaner = cleaners.find(
                (c) => c.id === booking.assignee?.id
              );
              const isUnassigned = !booking.assignee;
              return (
                <Link key={booking.id} href={`/jobs/${booking.id}`}>
                  <div
                    className="text-xs p-1 rounded truncate cursor-pointer hover:opacity-80 transition-opacity"
                    style={{
                      backgroundColor: isUnassigned ? '#ec4899' : (cleaner?.color || '#6b7280'),
                      color: 'white',
                    }}
                    title={`${booking.client.name} - ${booking.serviceType}${
                      booking.assignee
                        ? ` - ${booking.assignee.user.name}`
                        : ' - UNASSIGNED'
                    }`}
                  >
                    {isUnassigned && '⚠️ '}
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

  const renderWeekView = () => {
    const weekDays = getWeekDays();
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    return (
      <div>
        <div className="grid grid-cols-7 gap-2">
          {weekDays.map((date, index) => {
            const dayBookings = getBookingsForDate(date);
            const unavailableCleaners = getUnavailableCleaners(date);
            const isToday =
              date.getDate() === new Date().getDate() &&
              date.getMonth() === new Date().getMonth() &&
              date.getFullYear() === new Date().getFullYear();
            const hasUnavailable = unavailableCleaners.length > 0;

            return (
              <div
                key={index}
                className={`border rounded-lg p-3 min-h-[200px] ${
                  isToday
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/10'
                    : hasUnavailable
                    ? 'border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-900/10'
                    : 'border-gray-200 dark:border-gray-700'
                }`}
                style={hasUnavailable ? {
                  backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(239, 68, 68, 0.1) 10px, rgba(239, 68, 68, 0.1) 20px)'
                } : undefined}
              >
                <div className="text-center mb-2">
                  <div className="flex items-center justify-center gap-1">
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      {dayNames[index]}
                    </div>
                    {hasUnavailable && (
                      <div className="text-xs text-red-600 dark:text-red-400" title={`${unavailableCleaners.length} cleaner(s) unavailable`}>
                        🔒
                      </div>
                    )}
                  </div>
                  <div className={`text-lg font-bold ${
                    isToday ? 'text-blue-600 dark:text-blue-400' : ''
                  }`}>
                    {date.getDate()}
                  </div>
                </div>
                <div className="space-y-1">
                  {dayBookings.map((booking) => {
                    const cleaner = cleaners.find(
                      (c) => c.id === booking.assignee?.id
                    );
                    const isUnassigned = !booking.assignee;
                    return (
                      <Link key={booking.id} href={`/jobs/${booking.id}`}>
                        <div
                          className="text-xs p-1 rounded truncate cursor-pointer hover:opacity-80 transition-opacity"
                          style={{
                            backgroundColor: isUnassigned ? '#ec4899' : (cleaner?.color || '#6b7280'),
                            color: 'white',
                          }}
                          title={`${booking.client.name} - ${new Date(booking.scheduledDate).toLocaleTimeString('en-US', {
                            hour: 'numeric',
                            minute: '2-digit',
                          })}`}
                        >
                          {isUnassigned && '⚠️ '}
                          {new Date(booking.scheduledDate).toLocaleTimeString('en-US', {
                            hour: 'numeric',
                            minute: '2-digit',
                          })}
                          {' - '}
                          {booking.client.name}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderDayView = () => {
    const dayBookings = getBookingsForDate(currentDate).sort(
      (a, b) =>
        new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime()
    );

    if (dayBookings.length === 0) {
      return (
        <div className="text-center py-12 text-gray-500">
          No bookings scheduled for this day
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {dayBookings.map((booking) => {
          const cleaner = cleaners.find((c) => c.id === booking.assignee?.id);
          const isUnassigned = !booking.assignee;
          return (
            <Link key={booking.id} href={`/jobs/${booking.id}`}>
              <Card className={`p-4 hover:shadow-md transition-shadow ${
                isUnassigned
                  ? 'bg-pink-50 dark:bg-pink-950/20 border-pink-200 dark:border-pink-900'
                  : ''
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      {isUnassigned ? (
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: '#ec4899' }}
                        />
                      ) : cleaner && (
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: cleaner.color }}
                        />
                      )}
                      <h3 className="font-semibold">{booking.client.name}</h3>
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {booking.serviceType}
                      </span>
                      {isUnassigned && (
                        <span className="text-xs px-2 py-1 bg-pink-200 dark:bg-pink-900/60 text-pink-900 dark:text-pink-100 rounded-full">
                          ⚠️ No Cleaner
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                      <p>
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
                      {formatDuration(booking.duration)}
                    </p>
                  </div>
                </div>
              </Card>
            </Link>
          );
        })}
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
            const isUnassigned = !booking.assignee;
            return (
              <Link key={booking.id} href={`/jobs/${booking.id}`}>
                <Card className={`p-4 hover:shadow-md transition-shadow ${
                  isUnassigned
                    ? 'bg-pink-50 dark:bg-pink-950/20 border-pink-200 dark:border-pink-900'
                    : ''
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        {isUnassigned ? (
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: '#ec4899' }}
                          />
                        ) : cleaner && (
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: cleaner.color }}
                          />
                        )}
                        <h3 className="font-semibold">{booking.client.name}</h3>
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {booking.serviceType}
                        </span>
                        {isUnassigned && (
                          <span className="text-xs px-2 py-1 bg-pink-200 dark:bg-pink-900/60 text-pink-900 dark:text-pink-100 rounded-full">
                            ⚠️ No Cleaner
                          </span>
                        )}
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
                        {formatDuration(booking.duration)}
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
              <div>
                <h1 className="text-3xl md:text-4xl font-bold">Calendar</h1>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  ⏰ All times displayed in <strong>Pacific Time (PST/PDT)</strong>
                </p>
              </div>
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
                  onClick={() => {
                    if (viewMode === 'month') navigateMonth('prev');
                    else if (viewMode === 'week') navigateWeek('prev');
                    else if (viewMode === 'day') navigateDay('prev');
                  }}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={goToToday}>
                  Today
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (viewMode === 'month') navigateMonth('next');
                    else if (viewMode === 'week') navigateWeek('next');
                    else if (viewMode === 'day') navigateDay('next');
                  }}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              {/* Current Date Display */}
              <div className="text-lg font-semibold">
                {viewMode === 'month' && currentDate.toLocaleDateString('en-US', {
                  month: 'long',
                  year: 'numeric',
                })}
                {viewMode === 'week' && `Week of ${currentDate.toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}`}
                {viewMode === 'day' && currentDate.toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
                {viewMode === 'list' && 'All Bookings'}
              </div>

              {/* View Mode Selector */}
              <div className="ml-auto flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
                {(['month', 'week', 'day', 'list'] as ViewMode[]).map((view) => (
                  <button
                    key={view}
                    onClick={() => setViewMode(view)}
                    className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                      viewMode === view
                        ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                    }`}
                  >
                    {view.charAt(0).toUpperCase() + view.slice(1)}
                  </button>
                ))}
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
                {viewMode === 'week' && renderWeekView()}
                {viewMode === 'day' && renderDayView()}
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

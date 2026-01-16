'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import {
  Plus,
  TrendingUp,
  Calendar as CalendarIcon,
  DollarSign,
  Users,
  ChevronLeft,
  ChevronRight,
  Clock,
  User as UserIcon,
  Receipt,
  MessageSquare,
  CreditCard,
  Star,
  UserPlus,
  CheckCircle2,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Skeleton,
  SkeletonCalendarBox,
  SkeletonActivityItem,
  SkeletonStatsCard,
} from '@/components/ui/skeleton';
import { PageTransition, AnimatedList, AnimatedListItem, FadeIn, SlideIn } from '@/components/ui/page-transition';

interface DashboardStats {
  totalClients: number;
  upcomingJobs: number;
  completedThisMonth: number;
  revenueThisMonth: number;
  upcomingJobsList: Array<{
    id: string;
    scheduledDate: string;
    serviceType: string;
    client: { name: string };
    assignee?: { user: { name: string } };
  }>;
}

interface ActivityItem {
  id: string;
  type: 'action' | 'activity';
  category: string;
  title: string;
  description: string;
  timestamp: Date;
  priority: 'high' | 'medium' | 'low';
  metadata?: any;
}

type ViewType = 'month' | 'week' | 'day' | 'list';

export default function DashboardPage() {
  const { data: session } = useSession();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewType, setViewType] = useState<ViewType>('week');

  useEffect(() => {
    fetchDashboardStats();
    fetchActivities();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      const response = await fetch('/api/dashboard/stats');
      const data = await response.json();

      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchActivities = async () => {
    try {
      const response = await fetch('/api/feed');
      const data = await response.json();

      if (data.success) {
        setActivities(data.data.slice(0, 10)); // Show top 10
      }
    } catch (error) {
      console.error('Failed to fetch activities:', error);
    }
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

  const isSameDay = (date1: Date, date2: Date) => {
    return date1.getDate() === date2.getDate() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getFullYear() === date2.getFullYear();
  };

  const getJobsForDate = (date: Date) => {
    if (!stats?.upcomingJobsList) return [];

    return stats.upcomingJobsList.filter(job => {
      const jobDate = new Date(job.scheduledDate);
      return isSameDay(jobDate, date);
    });
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() + (direction === 'next' ? 7 : -7));
    setCurrentDate(newDate);
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    newDate.setMonth(currentDate.getMonth() + (direction === 'next' ? 1 : -1));
    setCurrentDate(newDate);
  };

  const navigateDay = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() + (direction === 'next' ? 1 : -1));
    setCurrentDate(newDate);
  };

  const getMonthDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    // First day of the month
    const firstDay = new Date(year, month, 1);
    const startingDayOfWeek = firstDay.getDay();

    // Last day of the month
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();

    // Days to show from previous month
    const daysFromPrevMonth = startingDayOfWeek;
    const prevMonth = new Date(year, month, 0);
    const daysInPrevMonth = prevMonth.getDate();

    const days: Date[] = [];

    // Add days from previous month
    for (let i = daysFromPrevMonth - 1; i >= 0; i--) {
      days.push(new Date(year, month - 1, daysInPrevMonth - i));
    }

    // Add days from current month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }

    // Add days from next month to complete the grid (6 weeks = 42 days)
    const remainingDays = 42 - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      days.push(new Date(year, month + 1, i));
    }

    return days;
  };

  const formatTime = (date: string) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;

    if (hours === 0) return `${mins} mins`;
    if (mins === 0) return `${hours} ${hours === 1 ? 'hr' : 'hrs'}`;
    return `${hours} ${hours === 1 ? 'hr' : 'hrs'} ${mins} mins`;
  };

  const getActivityIcon = (category: string) => {
    switch (category) {
      case 'on_my_way': return '🚗';
      case 'clocked_in': return '🏁';
      case 'clocked_out': return '✅';
      case 'cleaning_completed': return '🧹';
      case 'payment_charged': return '💰';
      case 'booking_created': return '📅';
      case 'client_created': return '👤';
      case 'estimate_sent': return '🧾';
      case 'team_member_added': return '👥';
      default: return '•';
    }
  };

  const getTimeAgo = (timestamp: Date) => {
    const now = new Date();
    const diff = now.getTime() - new Date(timestamp).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return new Date(timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const userRole = (session?.user as any)?.role as string | undefined;
  const userName = (session?.user as any)?.name || (session?.user as any)?.email || 'User';

  if (loading) {
    return (
      <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-950">
        {/* Main Content - Skeleton */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6 md:p-8 space-y-8">
            {/* Header Skeleton */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Skeleton className="w-14 h-14 rounded-2xl" />
                <div className="space-y-2">
                  <Skeleton className="h-8 w-48" />
                  <Skeleton className="h-4 w-24" />
                </div>
              </div>
              <div className="flex gap-3">
                <Skeleton className="h-10 w-32" />
                <Skeleton className="h-10 w-32" />
                <Skeleton className="h-10 w-32" />
              </div>
            </div>

            {/* Stats Cards Skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <SkeletonStatsCard />
              <SkeletonStatsCard />
              <SkeletonStatsCard />
              <SkeletonStatsCard />
            </div>

            {/* Calendar Skeleton */}
            <Card className="p-6">
              <div className="mb-6 space-y-2">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-64" />
              </div>
              <div className="flex items-center justify-between mb-6">
                <Skeleton className="h-10 w-10 rounded-lg" />
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-10 w-10 rounded-lg" />
              </div>
              <div className="grid grid-cols-7 gap-2">
                {Array.from({ length: 7 }).map((_, i) => (
                  <SkeletonCalendarBox key={i} />
                ))}
              </div>
            </Card>
          </div>
        </div>

        {/* Right Panel - Activity Feed Skeleton */}
        <div className="hidden lg:block w-80 border-l border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-y-auto">
          <div className="p-6">
            <div className="flex items-center justify-between mb-8">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-9 w-20" />
            </div>
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <SkeletonActivityItem key={i} />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <PageTransition>
      <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-950">
        {/* Main Content - Center Panel */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6 md:p-8 space-y-8">
            {/* Header with User Info */}
            <FadeIn>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
              <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg">
                <UserIcon className="h-7 w-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">
                  {userName}
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                  {userRole || 'USER'}
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <Link href="/jobs/new">
                <Button>
                  <Plus className="h-4 w-4" />
                  New Job
                </Button>
              </Link>
              <Link href="/clients/new">
                <Button variant="outline">
                  <Plus className="h-4 w-4" />
                  New Client
                </Button>
              </Link>
              <Link href="/estimates">
                <Button variant="outline">
                  <Receipt className="h-4 w-4" />
                  Estimates
                </Button>
              </Link>
            </div>
          </div>
            </FadeIn>

          {/* Metrics - Small Boxes */}
          <AnimatedList className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            <AnimatedListItem>
              <Card animated hoverable className="p-6 cursor-default">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-md">
                  <Users className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">Clients</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">{stats?.totalClients || 0}</p>
                </div>
              </div>
            </Card>
            </AnimatedListItem>

            <AnimatedListItem>
              <Card animated hoverable className="p-6 cursor-default">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-md">
                    <CalendarIcon className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">Upcoming</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">{stats?.upcomingJobs || 0}</p>
                  </div>
                </div>
              </Card>
            </AnimatedListItem>

            <AnimatedListItem>
              <Card animated hoverable className="p-6 cursor-default">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-md">
                    <TrendingUp className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">Completed</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">{stats?.completedThisMonth || 0}</p>
                  </div>
              </div>
            </Card>
            </AnimatedListItem>

            <AnimatedListItem>
              <Card animated hoverable className="p-6 cursor-default">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl shadow-md">
                    <DollarSign className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">Revenue MTD</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">${stats?.revenueThisMonth || 0}</p>
                  </div>
                </div>
              </Card>
            </AnimatedListItem>
          </AnimatedList>

          {/* Calendar Section */}
          <Card className="p-8">
            {/* Calendar Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
              <div className="flex items-center gap-4">
                <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {viewType === 'day'
                    ? currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
                    : currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </h2>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (viewType === 'month') navigateMonth('prev');
                      else if (viewType === 'week') navigateWeek('prev');
                      else if (viewType === 'day') navigateDay('prev');
                    }}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentDate(new Date())}
                  >
                    Today
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (viewType === 'month') navigateMonth('next');
                      else if (viewType === 'week') navigateWeek('next');
                      else if (viewType === 'day') navigateDay('next');
                    }}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* View Options */}
              <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1.5 rounded-xl">
                {(['month', 'week', 'day', 'list'] as ViewType[]).map((view) => (
                  <button
                    key={view}
                    onClick={() => setViewType(view)}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                      viewType === view
                        ? 'bg-white dark:bg-gray-700 text-primary shadow-md scale-105'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                    }`}
                  >
                    {view.charAt(0).toUpperCase() + view.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Calendar Grid - Month View */}
            {viewType === 'month' && (
              <div>
                {/* Day headers */}
                <div className="grid grid-cols-7 gap-px bg-gray-200 dark:bg-gray-700 mb-px">
                  {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((day) => (
                    <div
                      key={day}
                      className="bg-gray-50 dark:bg-gray-800 px-3 py-3 text-center text-sm font-bold text-gray-700 dark:text-gray-300"
                    >
                      {day}
                    </div>
                  ))}
                </div>

                {/* Calendar grid */}
                <div className="grid grid-cols-7 gap-px bg-gray-200 dark:bg-gray-700">
                  {getMonthDays().map((date, index) => {
                    const dayJobs = getJobsForDate(date);
                    const isCurrentMonth = date.getMonth() === currentDate.getMonth();
                    const isToday = isSameDay(date, new Date());
                    const hasUnassignedJobs = dayJobs.some(job => !job.assignee);

                    return (
                      <div
                        key={index}
                        className={`bg-white dark:bg-gray-900 min-h-[140px] p-3 ${
                          !isCurrentMonth ? 'opacity-40' : ''
                        } ${isToday ? 'ring-2 ring-blue-500 ring-inset' : ''} ${
                          hasUnassignedJobs ? 'bg-pink-50/50 dark:bg-pink-900/10' : ''
                        }`}
                      >
                        <div className={`text-sm mb-1 ${
                          isToday
                            ? 'inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-500 text-white font-bold'
                            : isCurrentMonth
                            ? 'text-gray-900 dark:text-gray-100'
                            : 'text-gray-400 dark:text-gray-600'
                        }`}>
                          {date.getDate()}
                        </div>

                        <div className="space-y-1.5">
                          {dayJobs.slice(0, 4).map((job) => {
                            const isUnassigned = !job.assignee;
                            return (
                              <Link key={job.id} href={`/jobs/${job.id}`}>
                                <div className={`text-xs px-2 py-1.5 rounded-lg truncate cursor-pointer transition-all hover:scale-[1.02] ${
                                  isUnassigned
                                    ? 'bg-pink-100 dark:bg-pink-900/40 text-pink-900 dark:text-pink-100 border border-pink-200 dark:border-pink-800 hover:bg-pink-200 dark:hover:bg-pink-900/60 font-semibold'
                                    : 'bg-blue-100 dark:bg-blue-900/30 text-blue-900 dark:text-blue-100 hover:bg-blue-200 dark:hover:bg-blue-900/50'
                                }`}>
                                  <div className="font-medium">{isUnassigned && '⚠️ '}{formatTime(job.scheduledDate)}</div>
                                  <div className="text-[10px] opacity-90 truncate">{job.client.name}</div>
                                </div>
                              </Link>
                            );
                          })}
                          {dayJobs.length > 4 && (
                            <div className="text-xs text-gray-500 dark:text-gray-400 px-2 py-1">
                              +{dayJobs.length - 4} more
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Calendar Grid - Week View */}
            {viewType === 'week' && (
              <div className="grid grid-cols-7 gap-2">
                {getWeekDays().map((date, index) => {
                  const dayJobs = getJobsForDate(date);
                  const isToday = isSameDay(date, new Date());
                  const hasUnassignedJobs = dayJobs.some(job => !job.assignee);

                  return (
                    <div
                      key={index}
                      className={`border rounded-lg p-3 min-h-[150px] ${
                        isToday
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/10'
                          : hasUnassignedJobs
                          ? 'border-pink-200 bg-pink-50/50 dark:border-pink-900 dark:bg-pink-900/10'
                          : 'border-gray-200 dark:border-gray-700'
                      }`}
                    >
                      <div className="text-center mb-2">
                        <div className="text-xs text-gray-600 dark:text-gray-400">
                          {date.toLocaleDateString('en-US', { weekday: 'short' })}
                        </div>
                        <div
                          className={`text-sm font-medium ${
                            isToday
                              ? 'text-blue-600 dark:text-blue-400 font-bold'
                              : 'text-gray-900 dark:text-gray-100'
                          }`}
                        >
                          {date.getDate()}
                        </div>
                      </div>

                      <div className="space-y-1">
                        {dayJobs.map((job) => {
                          const isUnassigned = !job.assignee;
                          return (
                            <Link key={job.id} href={`/jobs/${job.id}`}>
                              <div className={`text-xs p-2 rounded cursor-pointer transition-colors ${
                                isUnassigned
                                  ? 'bg-pink-100 dark:bg-pink-900/40 text-pink-900 dark:text-pink-100 border border-pink-200 dark:border-pink-800 hover:bg-pink-200 dark:hover:bg-pink-900/60'
                                  : 'bg-blue-100 dark:bg-blue-900/30 text-blue-900 dark:text-blue-100 hover:bg-blue-200 dark:hover:bg-blue-900/50'
                              }`}>
                                <div className="font-medium truncate">{job.client.name}</div>
                                <div className="text-[10px] opacity-80">{formatTime(job.scheduledDate)}</div>
                                {isUnassigned && (
                                  <div className="text-[10px] font-medium mt-0.5">⚠️ No cleaner</div>
                                )}
                              </div>
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Day View */}
            {viewType === 'day' && (
              <div className="space-y-3">
                {(() => {
                  const dayJobs = getJobsForDate(currentDate);

                  if (dayJobs.length === 0) {
                    return (
                      <div className="text-center py-12 text-gray-500">
                        No jobs scheduled for this day
                      </div>
                    );
                  }

                  return dayJobs.map((job) => {
                    const isUnassigned = !job.assignee;
                    return (
                      <Link key={job.id} href={`/jobs/${job.id}`}>
                        <div className={`p-4 rounded-lg border-2 transition-all hover:shadow-md ${
                          isUnassigned
                            ? 'bg-pink-50 dark:bg-pink-900/10 border-pink-200 dark:border-pink-800'
                            : 'bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800'
                        }`}>
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <Clock className={`h-4 w-4 ${
                                  isUnassigned ? 'text-pink-600 dark:text-pink-400' : 'text-blue-600 dark:text-blue-400'
                                }`} />
                                <span className={`font-semibold ${
                                  isUnassigned ? 'text-pink-900 dark:text-pink-100' : 'text-blue-900 dark:text-blue-100'
                                }`}>
                                  {formatTime(job.scheduledDate)}
                                </span>
                                {isUnassigned && (
                                  <span className="px-2 py-0.5 bg-pink-200 dark:bg-pink-900/60 text-pink-900 dark:text-pink-100 text-xs font-medium rounded-full">
                                    ⚠️ Needs Assignment
                                  </span>
                                )}
                              </div>

                              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
                                {job.client.name}
                              </h3>

                              <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">Service:</span>
                                  <span>{job.serviceType}</span>
                                </div>

                                {job.assignee ? (
                                  <div className="flex items-center gap-2">
                                    <UserIcon className="h-3.5 w-3.5" />
                                    <span>{job.assignee.user.name}</span>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2 text-pink-700 dark:text-pink-300 font-medium">
                                    <UserIcon className="h-3.5 w-3.5" />
                                    <span>No cleaner assigned</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </Link>
                    );
                  });
                })()}
              </div>
            )}

            {/* List View */}
            {viewType === 'list' && (
              <div className="space-y-2">
                {stats?.upcomingJobsList && stats.upcomingJobsList.length > 0 ? (
                  (() => {
                    // Sort jobs to put unassigned ones at the top
                    const sortedJobs = [...stats.upcomingJobsList].sort((a, b) => {
                      const aUnassigned = !a.assignee;
                      const bUnassigned = !b.assignee;
                      if (aUnassigned && !bUnassigned) return -1;
                      if (!aUnassigned && bUnassigned) return 1;
                      return new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime();
                    });

                    return sortedJobs.map((job) => {
                      const isUnassigned = !job.assignee;
                      return (
                        <Link key={job.id} href={`/jobs/${job.id}`}>
                          <div className={`flex items-center justify-between p-4 border-2 rounded-lg transition-all ${
                            isUnassigned
                              ? 'border-pink-200 bg-pink-50 dark:border-pink-800 dark:bg-pink-900/10 hover:bg-pink-100 dark:hover:bg-pink-900/20'
                              : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                          }`}>
                            <div className="flex items-center gap-4">
                              <div className="text-center">
                                <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                  {new Date(job.scheduledDate).getDate()}
                                </div>
                                <div className="text-xs text-gray-600 dark:text-gray-400">
                                  {new Date(job.scheduledDate).toLocaleDateString('en-US', { month: 'short' })}
                                </div>
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <div className="font-medium">{job.client.name}</div>
                                  {isUnassigned && (
                                    <span className="px-2 py-0.5 bg-pink-200 dark:bg-pink-900/60 text-pink-900 dark:text-pink-100 text-xs font-medium rounded-full">
                                      ⚠️ Needs Assignment
                                    </span>
                                  )}
                                </div>
                                <div className="text-sm text-gray-600 dark:text-gray-400">{job.serviceType}</div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className={`font-medium ${
                                isUnassigned ? 'text-pink-600 dark:text-pink-400' : 'text-blue-600 dark:text-blue-400'
                              }`}>
                                {formatTime(job.scheduledDate)}
                              </div>
                              {job.assignee ? (
                                <div className="text-xs text-gray-600 dark:text-gray-400">
                                  {job.assignee.user.name}
                                </div>
                              ) : (
                                <div className="text-xs text-pink-700 dark:text-pink-300 font-medium">
                                  No cleaner
                                </div>
                              )}
                            </div>
                          </div>
                        </Link>
                      );
                    });
                  })()
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    No upcoming jobs scheduled
                  </div>
                )}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Right Panel - Activity Feed */}
      <div className="hidden lg:block w-80 border-l border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">Activity Feed</h3>
            <Link href="/feed">
              <Button variant="ghost" size="sm">View All</Button>
            </Link>
          </div>

          <div className="space-y-4">
            {activities.length > 0 ? (
              (() => {
                // Sort activities: high priority (unassigned jobs) first
                const sortedActivities = [...activities].sort((a, b) => {
                  const priorityOrder = { high: 0, medium: 1, low: 2 };
                  const aPriority = priorityOrder[a.priority];
                  const bPriority = priorityOrder[b.priority];

                  if (aPriority !== bPriority) {
                    return aPriority - bPriority;
                  }

                  // If same priority, sort by timestamp (most recent first)
                  return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
                });

                return sortedActivities.map((activity) => {
                  const isUnassignedJob = activity.metadata?.cleanerName === 'Unassigned' ||
                    (activity.category === 'booking_created' && activity.metadata?.cleanerName === 'Unassigned');
                  const isCompletedJob = activity.category === 'cleaning_completed';
                  const isPendingReview = activity.category === 'pending_admin_review';
                  const isUpcomingJob = (activity.category === 'booking_created' ||
                    activity.category === 'cleaning_starting' ||
                    activity.category === 'reminder_needed') && !isUnassignedJob;
                  const jobId = activity.metadata?.jobId;

                  return (
                    <div
                      key={activity.id}
                      className={`p-4 rounded-xl border transition-all duration-200 hover:shadow-md ${
                        isUnassignedJob
                          ? 'border-pink-200 bg-pink-50 dark:border-pink-900 dark:bg-pink-900/10'
                          : activity.priority === 'high'
                          ? 'border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-900/10'
                          : activity.priority === 'medium'
                          ? 'border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-900/10'
                          : 'border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-xl">{getActivityIcon(activity.category)}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                              {activity.title}
                            </div>
                            {isUnassignedJob && (
                              <span className="px-2 py-0.5 bg-pink-200 dark:bg-pink-900/60 text-pink-900 dark:text-pink-100 text-[10px] font-bold rounded-full">
                                ⚠️
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 leading-relaxed">
                            {activity.description}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-500 mt-2 font-medium">
                            {getTimeAgo(activity.timestamp)}
                          </div>

                          {/* Action Buttons */}
                          {jobId && (
                            <div className="flex gap-2 mt-3">
                              {isUnassignedJob && (
                                <Link href={`/jobs/${jobId}`}>
                                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1 bg-pink-50 dark:bg-pink-900/20 border-pink-300 dark:border-pink-700 text-pink-700 dark:text-pink-300 hover:bg-pink-100 dark:hover:bg-pink-900/40">
                                    <UserPlus className="h-3 w-3" />
                                    Assign Cleaner
                                  </Button>
                                </Link>
                              )}
                              {isPendingReview && (
                                <>
                                  <Link href={`/jobs/${jobId}`}>
                                    <Button size="sm" variant="outline" className="h-7 text-xs gap-1 bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/40">
                                      <CheckCircle2 className="h-3 w-3" />
                                      Review & Approve
                                    </Button>
                                  </Link>
                                  <Link href={`/jobs/${jobId}`}>
                                    <Button size="sm" variant="ghost" className="h-7 text-xs">
                                      View Details
                                    </Button>
                                  </Link>
                                </>
                              )}
                              {isUpcomingJob && (
                                <>
                                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => alert('Send reminder SMS')}>
                                    <MessageSquare className="h-3 w-3" />
                                    Remind
                                  </Button>
                                  <Link href={`/jobs/${jobId}`}>
                                    <Button size="sm" variant="ghost" className="h-7 text-xs">
                                      View
                                    </Button>
                                  </Link>
                                </>
                              )}
                              {isCompletedJob && (
                                <>
                                  <Link href={`/jobs/${jobId}`}>
                                    <Button size="sm" variant="outline" className="h-7 text-xs gap-1 bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700 text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-900/40">
                                      <CreditCard className="h-3 w-3" />
                                      Collect $
                                    </Button>
                                  </Link>
                                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => alert('Send review request')}>
                                    <Star className="h-3 w-3" />
                                    Send Review
                                  </Button>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                });
              })()
            ) : (
              <div className="text-center py-12 text-gray-500 text-sm">
                No recent activity
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
    </PageTransition>
  );
}

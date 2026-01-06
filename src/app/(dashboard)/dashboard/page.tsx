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
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

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

  const formatTime = (date: string) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
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
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-500">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-950">
      {/* Main Content - Center Panel */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 md:p-6 space-y-6">
          {/* Header with User Info */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30">
                <UserIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                  {userName}
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {userRole || 'USER'}
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <Link href="/jobs/new">
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  New Job
                </Button>
              </Link>
              <Link href="/clients/new">
                <Button variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  New Client
                </Button>
              </Link>
            </div>
          </div>

          {/* Metrics - Small Boxes */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Clients</p>
                  <p className="text-xl font-bold">{stats?.totalClients || 0}</p>
                </div>
              </div>
            </Card>

            <Card className="p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <CalendarIcon className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Upcoming</p>
                  <p className="text-xl font-bold">{stats?.upcomingJobs || 0}</p>
                </div>
              </div>
            </Card>

            <Card className="p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Completed</p>
                  <p className="text-xl font-bold">{stats?.completedThisMonth || 0}</p>
                </div>
              </div>
            </Card>

            <Card className="p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                  <DollarSign className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                </div>
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Revenue MTD</p>
                  <p className="text-xl font-bold">${stats?.revenueThisMonth || 0}</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Calendar Section */}
          <Card className="p-6">
            {/* Calendar Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <h2 className="text-lg font-semibold">
                  {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </h2>
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigateWeek('prev')}
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
                    onClick={() => navigateWeek('next')}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* View Options */}
              <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
                {(['month', 'week', 'day', 'list'] as ViewType[]).map((view) => (
                  <button
                    key={view}
                    onClick={() => setViewType(view)}
                    className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                      viewType === view
                        ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                    }`}
                  >
                    {view.charAt(0).toUpperCase() + view.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Calendar Grid - Week View */}
            {viewType === 'week' && (
              <div className="grid grid-cols-7 gap-2">
                {getWeekDays().map((date, index) => {
                  const dayJobs = getJobsForDate(date);
                  const isToday = isSameDay(date, new Date());

                  return (
                    <div
                      key={index}
                      className={`border rounded-lg p-3 min-h-[150px] ${
                        isToday
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/10'
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
                        {dayJobs.map((job) => (
                          <Link key={job.id} href={`/jobs/${job.id}`}>
                            <div className="text-xs p-2 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-900 dark:text-blue-100 hover:bg-blue-200 dark:hover:bg-blue-900/50 cursor-pointer transition-colors">
                              <div className="font-medium truncate">{job.client.name}</div>
                              <div className="text-[10px] opacity-80">{formatTime(job.scheduledDate)}</div>
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* List View */}
            {viewType === 'list' && (
              <div className="space-y-2">
                {stats?.upcomingJobsList && stats.upcomingJobsList.length > 0 ? (
                  stats.upcomingJobsList.map((job) => (
                    <Link key={job.id} href={`/jobs/${job.id}`}>
                      <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
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
                            <div className="font-medium">{job.client.name}</div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">{job.serviceType}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium text-blue-600 dark:text-blue-400">
                            {formatTime(job.scheduledDate)}
                          </div>
                          {job.assignee && (
                            <div className="text-xs text-gray-600 dark:text-gray-400">
                              {job.assignee.user.name}
                            </div>
                          )}
                        </div>
                      </div>
                    </Link>
                  ))
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
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold">Activity Feed</h3>
            <Link href="/feed">
              <Button variant="ghost" size="sm">View All</Button>
            </Link>
          </div>

          <div className="space-y-4">
            {activities.length > 0 ? (
              activities.map((activity) => (
                <div
                  key={activity.id}
                  className={`p-3 rounded-lg border ${
                    activity.priority === 'high'
                      ? 'border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-900/10'
                      : activity.priority === 'medium'
                      ? 'border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-900/10'
                      : 'border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <span className="text-lg">{getActivityIcon(activity.category)}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {activity.title}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                        {activity.description}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                        {getTimeAgo(activity.timestamp)}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12 text-gray-500 text-sm">
                No recent activity
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, TrendingUp, Calendar as CalendarIcon, DollarSign, Users } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface DashboardStats {
  totalClients: number;
  upcomingJobs: number;
  completedThisMonth: number;
  revenueThisMonth: number;
  upcomingJobsList: Array<{
    id: string;
    scheduledFor: string;
    serviceType: string;
    client: { name: string };
  }>;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardStats();
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

  if (loading) {
    return (
      <div className="p-4">
        <div className="text-center py-12 text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-6 md:space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold">Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400 text-sm md:text-base mt-1">
            Welcome back! Here's your overview.
          </p>
        </div>

        {/* Desktop Quick Actions */}
        <div className="hidden md:flex gap-3">
          <Link href="/jobs/new">
            <Button size="lg">
              <Plus className="h-5 w-5 mr-2" />
              New Job
            </Button>
          </Link>
          <Link href="/clients/new">
            <Button variant="outline" size="lg">
              <Plus className="h-5 w-5 mr-2" />
              New Client
            </Button>
          </Link>
        </div>
      </div>

      {/* Mobile Quick Actions */}
      <div className="grid grid-cols-2 gap-3 md:hidden">
        <Link href="/jobs/new">
          <Button className="w-full h-auto py-4 flex flex-col gap-2">
            <Plus className="h-5 w-5" />
            <span className="text-sm">New Job</span>
          </Button>
        </Link>
        <Link href="/clients/new">
          <Button variant="outline" className="w-full h-auto py-4 flex flex-col gap-2">
            <Plus className="h-5 w-5" />
            <span className="text-sm">New Client</span>
          </Button>
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <Card className="p-4 md:p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center gap-3 md:gap-4">
            <div className="p-2 md:p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Users className="h-5 w-5 md:h-6 md:w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Clients</p>
              <p className="text-2xl md:text-3xl font-bold">{stats?.totalClients || 0}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 md:p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center gap-3 md:gap-4">
            <div className="p-2 md:p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <CalendarIcon className="h-5 w-5 md:h-6 md:w-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Upcoming Jobs</p>
              <p className="text-2xl md:text-3xl font-bold">{stats?.upcomingJobs || 0}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 md:p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center gap-3 md:gap-4">
            <div className="p-2 md:p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <TrendingUp className="h-5 w-5 md:h-6 md:w-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Completed</p>
              <p className="text-2xl md:text-3xl font-bold">{stats?.completedThisMonth || 0}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 md:p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center gap-3 md:gap-4">
            <div className="p-2 md:p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
              <DollarSign className="h-5 w-5 md:h-6 md:w-6 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Revenue MTD</p>
              <p className="text-2xl md:text-3xl font-bold">${stats?.revenueThisMonth || 0}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Upcoming Jobs */}
      <div>
        <div className="flex items-center justify-between mb-4 md:mb-6">
          <h2 className="text-xl md:text-2xl font-semibold">Upcoming Jobs</h2>
          <Link href="/jobs">
            <Button variant="outline" size="sm">View All</Button>
          </Link>
        </div>

        {stats?.upcomingJobsList && stats.upcomingJobsList.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
            {stats.upcomingJobsList.map((job) => (
              <Link key={job.id} href={`/jobs/${job.id}`}>
                <Card className="p-4 md:p-5 hover:shadow-lg transition-shadow h-full">
                  <div className="flex flex-col h-full">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <p className="font-semibold text-base md:text-lg">{job.client.name}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{job.serviceType}</p>
                      </div>
                    </div>
                    <div className="mt-auto pt-3 border-t border-gray-100 dark:border-gray-700">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500 dark:text-gray-400">
                          {new Date(job.scheduledFor).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </span>
                        <span className="font-medium text-blue-600 dark:text-blue-400">
                          {new Date(job.scheduledFor).toLocaleTimeString('en-US', {
                            hour: 'numeric',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <Card className="p-8 md:p-12 text-center">
            <p className="text-gray-500 dark:text-gray-400 text-lg">No upcoming jobs scheduled</p>
            <Link href="/jobs/new">
              <Button size="lg" className="mt-4">
                <Plus className="h-5 w-5 mr-2" />
                Schedule a Job
              </Button>
            </Link>
          </Card>
        )}
      </div>
    </div>
  );
}

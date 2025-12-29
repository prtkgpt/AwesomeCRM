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
    <div className="p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-gray-600 text-sm mt-1">Welcome back! Here's your overview.</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3">
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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Clients</p>
              <p className="text-2xl font-bold">{stats?.totalClients || 0}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CalendarIcon className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Upcoming</p>
              <p className="text-2xl font-bold">{stats?.upcomingJobs || 0}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <TrendingUp className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">This Month</p>
              <p className="text-2xl font-bold">{stats?.completedThisMonth || 0}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <DollarSign className="h-5 w-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Revenue</p>
              <p className="text-2xl font-bold">${stats?.revenueThisMonth || 0}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Upcoming Jobs */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Upcoming Jobs</h2>
          <Link href="/jobs">
            <Button variant="outline" size="sm">View All</Button>
          </Link>
        </div>

        {stats?.upcomingJobsList && stats.upcomingJobsList.length > 0 ? (
          <div className="space-y-3">
            {stats.upcomingJobsList.map((job) => (
              <Link key={job.id} href={`/jobs/${job.id}`}>
                <Card className="p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold">{job.client.name}</p>
                      <p className="text-sm text-gray-600">{job.serviceType}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-blue-600">
                        {new Date(job.scheduledFor).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(job.scheduledFor).toLocaleTimeString('en-US', {
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <Card className="p-8 text-center">
            <p className="text-gray-500">No upcoming jobs scheduled</p>
            <Link href="/jobs/new">
              <Button size="sm" className="mt-3">
                <Plus className="h-4 w-4 mr-1" />
                Schedule a Job
              </Button>
            </Link>
          </Card>
        )}
      </div>
    </div>
  );
}

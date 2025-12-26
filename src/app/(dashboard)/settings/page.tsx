'use client';

import { useEffect, useState } from 'react';
import { signOut, useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import { DollarSign, Briefcase, AlertCircle, Calendar } from 'lucide-react';

interface ReportData {
  revenue: number;
  completedJobs: number;
  unpaidAmount: number;
  upcomingJobs: number;
  period: string;
}

export default function SettingsPage() {
  const { data: session } = useSession();
  const [period, setPeriod] = useState<'week' | 'month'>('week');
  const [reports, setReports] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReports();
  }, [period]);

  const fetchReports = async () => {
    try {
      const response = await fetch(`/api/reports?period=${period}`);
      const data = await response.json();

      if (data.success) {
        setReports(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = () => {
    signOut({ callbackUrl: '/login' });
  };

  return (
    <div className="p-4 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Settings</h1>
      </div>

      {/* User Info */}
      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>Logged in as {session?.user?.email}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="destructive" onClick={handleSignOut}>
            Sign Out
          </Button>
        </CardContent>
      </Card>

      {/* Reports Dashboard */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Reports</h2>
          <div className="flex gap-2 bg-white p-1 rounded-lg shadow-sm">
            <button
              onClick={() => setPeriod('week')}
              className={`py-1 px-3 rounded-md text-sm font-medium transition-colors ${
                period === 'week'
                  ? 'bg-primary text-white'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Week
            </button>
            <button
              onClick={() => setPeriod('month')}
              className={`py-1 px-3 rounded-md text-sm font-medium transition-colors ${
                period === 'month'
                  ? 'bg-primary text-white'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Month
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8 text-gray-500">Loading...</div>
        ) : reports ? (
          <div className="grid grid-cols-2 gap-3">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <DollarSign className="h-5 w-5 text-green-700" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Revenue</p>
                    <p className="text-2xl font-bold">
                      {formatCurrency(reports.revenue)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Briefcase className="h-5 w-5 text-blue-700" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Completed</p>
                    <p className="text-2xl font-bold">{reports.completedJobs}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-yellow-100 rounded-lg">
                    <AlertCircle className="h-5 w-5 text-yellow-700" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Unpaid</p>
                    <p className="text-2xl font-bold">
                      {formatCurrency(reports.unpaidAmount)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Calendar className="h-5 w-5 text-purple-700" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Upcoming</p>
                    <p className="text-2xl font-bold">{reports.upcomingJobs}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : null}
      </div>

      {/* App Info */}
      <Card>
        <CardHeader>
          <CardTitle>About</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-gray-600">
          <p>CleanDayCRM v1.0</p>
          <p>Simple CRM for independent home cleaners</p>
          <p className="pt-2 text-xs text-gray-500">
            Built with Next.js, Prisma, Stripe, and Twilio
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

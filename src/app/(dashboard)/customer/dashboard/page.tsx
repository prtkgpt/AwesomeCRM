'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, DollarSign, ClipboardList, Clock, Sparkles, Gift, User } from 'lucide-react';
import { formatDuration } from '@/lib/utils';

interface DashboardStats {
  upcomingBookings: number;
  completedBookings: number;
  totalSpent: number;
  pendingInvoices: number;
}

interface UpcomingBooking {
  id: string;
  scheduledDate: string;
  serviceType: string;
  duration: number;
  price: number;
  status: string;
  address: {
    street: string;
    city: string;
  };
}

export default function CustomerDashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats>({
    upcomingBookings: 0,
    completedBookings: 0,
    totalSpent: 0,
    pendingInvoices: 0,
  });
  const [upcomingBookings, setUpcomingBookings] = useState<UpcomingBooking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated') {
      fetchDashboardData();
    }
  }, [status, router]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/customer/dashboard');
      if (res.ok) {
        const data = await res.json();
        setStats(data.stats || {});
        setUpcomingBookings(data.upcomingBookings || []);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (date: string) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">
          Welcome back, {session?.user?.name?.split(' ')[0] || 'there'}! 👋
        </h1>
        <p className="text-gray-600 dark:text-gray-400">Here's your cleaning service overview.</p>
      </div>

      {/* New Customer Welcome */}
      {stats.completedBookings === 0 && stats.upcomingBookings === 0 && (
        <Card className="p-6 mb-8 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 border-2 border-blue-200 dark:border-blue-800">
          <h2 className="text-xl font-bold mb-3 text-blue-900 dark:text-blue-100">
            🎉 Welcome to Your Self-Service Portal!
          </h2>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            Manage your cleaning services, preferences, and referrals all in one place. Here's what you can do:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div className="flex items-start gap-2">
              <Sparkles className="h-5 w-5 text-purple-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Set Your Preferences</p>
                <p className="text-gray-600 dark:text-gray-400">Tell us how you like your home cleaned</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Gift className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Earn Referral Credits</p>
                <p className="text-gray-600 dark:text-gray-400">Refer friends and get rewards</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Calendar className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Track Your Bookings</p>
                <p className="text-gray-600 dark:text-gray-400">View past and upcoming services</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <DollarSign className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Access Invoices</p>
                <p className="text-gray-600 dark:text-gray-400">Download and view your invoices anytime</p>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Upcoming Services</p>
              <p className="text-3xl font-bold">{stats.upcomingBookings}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <Calendar className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Completed Services</p>
              <p className="text-3xl font-bold">{stats.completedBookings}</p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <ClipboardList className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Spent</p>
              <p className="text-3xl font-bold">{formatCurrency(stats.totalSpent)}</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-full">
              <DollarSign className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Pending Invoices</p>
              <p className="text-3xl font-bold">{stats.pendingInvoices}</p>
            </div>
            <div className="p-3 bg-orange-100 rounded-full">
              <Clock className="h-6 w-6 text-orange-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* Upcoming Bookings */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-semibold">Upcoming Services</h2>
          <Link href="/customer/bookings">
            <Button variant="outline" size="sm">View All</Button>
          </Link>
        </div>

        {upcomingBookings.length === 0 ? (
          <Card className="p-8 text-center text-gray-500">
            <p className="mb-4">No upcoming services scheduled</p>
            <Button>Request Service</Button>
          </Card>
        ) : (
          <div className="space-y-4">
            {upcomingBookings.map((booking) => (
              <Card key={booking.id} className="p-6">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold">{booking.serviceType}</h3>
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                        {booking.status}
                      </span>
                    </div>
                    <div className="space-y-1 text-sm text-gray-600">
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-2" />
                        <span>{formatDate(booking.scheduledDate)}</span>
                        <span className="mx-2">•</span>
                        <Clock className="h-4 w-4 mr-2" />
                        <span>{formatTime(booking.scheduledDate)}</span>
                      </div>
                      <p className="flex items-start">
                        <span className="mr-2">📍</span>
                        {booking.address.street}, {booking.address.city}
                      </p>
                      <p>Duration: {formatDuration(booking.duration)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-blue-600">
                      {formatCurrency(booking.price)}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link href="/customer/bookings">
            <Button variant="outline" className="w-full justify-start">
              <Calendar className="h-4 w-4 mr-2" />
              View All Bookings
            </Button>
          </Link>
          <Link href="/customer/invoices">
            <Button variant="outline" className="w-full justify-start">
              <DollarSign className="h-4 w-4 mr-2" />
              View Invoices
            </Button>
          </Link>
          <Link href="/customer/preferences">
            <Button variant="outline" className="w-full justify-start">
              <Sparkles className="h-4 w-4 mr-2" />
              My Preferences
            </Button>
          </Link>
          <Link href="/referrals">
            <Button variant="outline" className="w-full justify-start">
              <Gift className="h-4 w-4 mr-2" />
              Refer & Earn
            </Button>
          </Link>
          <Link href="/customer/profile">
            <Button variant="outline" className="w-full justify-start">
              <User className="h-4 w-4 mr-2" />
              My Profile
            </Button>
          </Link>
          <Button variant="default" className="w-full justify-start">
            <ClipboardList className="h-4 w-4 mr-2" />
            Request New Service
          </Button>
        </div>
      </Card>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Calendar,
  DollarSign,
  ClipboardList,
  Clock,
  Sparkles,
  Gift,
  User,
  Settings,
  FileText,
  MapPin,
  Plus,
  RefreshCw,
  LogOut,
} from 'lucide-react';
import { signOut } from 'next-auth/react';

interface Company {
  id: string;
  name: string;
  slug: string;
  logo?: string;
  primaryColor?: string;
  email?: string;
  phone?: string;
}

interface DashboardStats {
  upcomingBookings: number;
  completedBookings: number;
  totalSpent: number;
  pendingInvoices: number;
  referralCreditsBalance?: number;
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

export default function CompanyCustomerPortal() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const slug = params.slug as string;

  const [company, setCompany] = useState<Company | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [upcomingBookings, setUpcomingBookings] = useState<UpcomingBooking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push(`/${slug}/login`);
    } else if (status === 'authenticated') {
      fetchData();
    }
  }, [status, slug, router]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch company details
      const companyRes = await fetch(`/api/public/company/${slug}`);
      if (companyRes.ok) {
        const companyData = await companyRes.json();
        setCompany(companyData);
      }

      // Fetch customer dashboard stats
      const statsRes = await fetch('/api/customer/dashboard');
      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data.stats || {});
        setUpcomingBookings(data.upcomingBookings || []);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (date: string) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  if (loading || !company) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
        <div className="max-w-7xl mx-auto p-6 md:p-8">
          <div className="mb-8">
            <Skeleton className="h-16 w-16 rounded-2xl mb-4" />
            <Skeleton className="h-10 w-64 mb-2" />
            <Skeleton className="h-6 w-48" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      <div className="max-w-7xl mx-auto p-6 md:p-8">
        {/* Header with Company Branding */}
        <div className="mb-8 flex items-start justify-between">
          <div className="flex items-center gap-4">
            {company.logo ? (
              <img
                src={company.logo}
                alt={company.name}
                className="h-16 w-auto object-contain"
              />
            ) : (
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-2xl font-bold shadow-lg"
                style={{ backgroundColor: company.primaryColor || '#3b82f6' }}
              >
                {company.name.charAt(0)}
              </div>
            )}
            <div>
              <h1 className="text-3xl font-bold mb-1">
                Welcome back, {session?.user?.name?.split(' ')[0]}! 👋
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Your {company.name} portal
              </p>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => signOut({ callbackUrl: `/${slug}/login` })}
            className="gap-2"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <Link href={`/${slug}/book`}>
            <Card className="p-6 hover:shadow-xl transition-all cursor-pointer border-2 hover:border-blue-500 dark:hover:border-blue-400">
              <div className="flex items-center gap-4">
                <div
                  className="p-4 rounded-2xl text-white"
                  style={{ backgroundColor: company.primaryColor || '#3b82f6' }}
                >
                  <Plus className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold">Book a Service</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Schedule a new cleaning appointment
                  </p>
                </div>
              </div>
            </Card>
          </Link>

          {upcomingBookings.length > 0 && (
            <Card className="p-6 border-2">
              <div className="flex items-center gap-4">
                <div className="p-4 bg-green-100 dark:bg-green-900/30 rounded-2xl">
                  <RefreshCw className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold">Book Again</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Repeat your last service
                  </p>
                </div>
              </div>
            </Card>
          )}
        </div>

        {/* Stats Grid */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card className="p-6 shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                    Upcoming Services
                  </p>
                  <p className="text-3xl font-bold">{stats.upcomingBookings}</p>
                </div>
                <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                  <Calendar className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </Card>

            <Card className="p-6 shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                    Completed Services
                  </p>
                  <p className="text-3xl font-bold">{stats.completedBookings}</p>
                </div>
                <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-full">
                  <ClipboardList className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </Card>

            <Card className="p-6 shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                    Total Spent
                  </p>
                  <p className="text-3xl font-bold">{formatCurrency(stats.totalSpent)}</p>
                </div>
                <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-full">
                  <DollarSign className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
            </Card>

            <Card className="p-6 shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                    Referral Credits
                  </p>
                  <p className="text-3xl font-bold">
                    {formatCurrency(stats.referralCreditsBalance || 0)}
                  </p>
                </div>
                <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-full">
                  <Gift className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Upcoming Bookings */}
        {upcomingBookings.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-4">Upcoming Services</h2>
            <div className="grid gap-4">
              {upcomingBookings.slice(0, 3).map((booking) => (
                <Card key={booking.id} className="p-6 shadow-lg">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <div
                          className="px-3 py-1 rounded-full text-sm font-semibold text-white"
                          style={{ backgroundColor: company.primaryColor || '#3b82f6' }}
                        >
                          {booking.serviceType.replace(/_/g, ' ')}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                          <Calendar className="h-4 w-4" />
                          {formatDate(booking.scheduledDate)} at {formatTime(booking.scheduledDate)}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300 mb-2">
                        <MapPin className="h-4 w-4" />
                        {booking.address.street}, {booking.address.city}
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        <span className="text-gray-600 dark:text-gray-400">
                          Duration: {Math.round(booking.duration / 60)} hours
                        </span>
                        <span className="font-semibold text-lg">
                          {formatCurrency(booking.price)}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        Reschedule
                      </Button>
                      <Button variant="outline" size="sm" className="text-destructive">
                        Cancel
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
            {upcomingBookings.length > 3 && (
              <Link href="/customer/bookings">
                <Button variant="outline" className="w-full mt-4">
                  View All Bookings
                </Button>
              </Link>
            )}
          </div>
        )}

        {/* Quick Links */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link href="/customer/bookings">
            <Card className="p-6 hover:shadow-lg transition-all cursor-pointer text-center">
              <Calendar className="h-8 w-8 mx-auto mb-3 text-blue-600 dark:text-blue-400" />
              <p className="font-semibold">All Bookings</p>
            </Card>
          </Link>

          <Link href="/customer/invoices">
            <Card className="p-6 hover:shadow-lg transition-all cursor-pointer text-center">
              <FileText className="h-8 w-8 mx-auto mb-3 text-purple-600 dark:text-purple-400" />
              <p className="font-semibold">Invoices</p>
            </Card>
          </Link>

          <Link href="/customer/profile">
            <Card className="p-6 hover:shadow-lg transition-all cursor-pointer text-center">
              <User className="h-8 w-8 mx-auto mb-3 text-green-600 dark:text-green-400" />
              <p className="font-semibold">My Profile</p>
            </Card>
          </Link>

          <Link href="/customer/preferences">
            <Card className="p-6 hover:shadow-lg transition-all cursor-pointer text-center">
              <Settings className="h-8 w-8 mx-auto mb-3 text-orange-600 dark:text-orange-400" />
              <p className="font-semibold">Preferences</p>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Building2,
  Users,
  UserCheck,
  CalendarDays,
  ArrowRight,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  XCircle,
} from 'lucide-react';

interface Stats {
  totalCompanies: number;
  totalUsers: number;
  totalClients: number;
  totalBookings: number;
  recentCompanies: {
    id: string;
    name: string;
    slug: string;
    plan: string;
    createdAt: string;
    _count: { users: number; clients: number };
  }[];
}

interface RevenueData {
  mrr: number;
  paidCompanies: number;
  freeCompanies: number;
  conversionRate: number;
}

interface TrialStatusData {
  expiringTrials: { id: string; name: string; trialEndsAt: string }[];
  expiredTrials: { id: string; name: string; trialEndsAt: string }[];
}

interface HealthScore {
  id: string;
  name: string;
  plan: string;
  clients: number;
  bookings: number;
  lastActivity: string | null;
  healthScore: number;
  trialEndsAt: string | null;
}

interface FunnelRow {
  month: string;
  signups: number;
  firstClient: number;
  firstBooking: number;
  firstPayment: number;
  convertedToPaid: number;
}

export default function PlatformDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [revenue, setRevenue] = useState<RevenueData | null>(null);
  const [trialStatus, setTrialStatus] = useState<TrialStatusData | null>(null);
  const [healthScores, setHealthScores] = useState<HealthScore[]>([]);
  const [funnel, setFunnel] = useState<FunnelRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [statsRes, funnelRes] = await Promise.all([
          fetch('/api/platform/stats'),
          fetch('/api/platform/funnel'),
        ]);
        const statsData = await statsRes.json();
        const funnelData = await funnelRes.json();

        if (statsData.success) {
          setStats(statsData.data);
          if (statsData.data.revenue) setRevenue(statsData.data.revenue);
          if (statsData.data.trialStatus) setTrialStatus(statsData.data.trialStatus);
          if (statsData.data.healthScores) setHealthScores(statsData.data.healthScores);
        }
        if (funnelData.success) {
          setFunnel(funnelData.data);
        }
      } catch (err) {
        console.error('Failed to fetch dashboard data:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Platform Dashboard</h1>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="h-16 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="h-16 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const statCards = [
    { label: 'Companies', value: stats?.totalCompanies || 0, icon: Building2, color: 'text-blue-600' },
    { label: 'Users', value: stats?.totalUsers || 0, icon: Users, color: 'text-green-600' },
    { label: 'Clients', value: stats?.totalClients || 0, icon: UserCheck, color: 'text-purple-600' },
    { label: 'Bookings', value: stats?.totalBookings || 0, icon: CalendarDays, color: 'text-orange-600' },
  ];

  const revenueCards = [
    {
      label: 'MRR',
      value: `$${(revenue?.mrr || 0).toLocaleString()}`,
      icon: DollarSign,
      color: 'text-emerald-600',
    },
    {
      label: 'Paid Companies',
      value: revenue?.paidCompanies || 0,
      icon: Building2,
      color: 'text-blue-600',
    },
    {
      label: 'Free Companies',
      value: revenue?.freeCompanies || 0,
      icon: Building2,
      color: 'text-gray-500',
    },
    {
      label: 'Conversion Rate',
      value: `${(revenue?.conversionRate || 0).toFixed(1)}%`,
      icon: TrendingUp,
      color: 'text-indigo-600',
    },
  ];

  function getHealthColor(score: number) {
    if (score >= 70) return 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400';
    if (score >= 40) return 'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
    return 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400';
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Platform Dashboard</h1>
        <Link
          href="/platform/companies"
          className="text-sm text-blue-600 hover:underline flex items-center gap-1"
        >
          View all companies <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {/* Top Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`${stat.color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {stat.value.toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-500">{stat.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Revenue Section */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Revenue</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {revenueCards.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.label}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={`${stat.color}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {stat.value}
                      </p>
                      <p className="text-xs text-gray-500">{stat.label}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Trial Status Section */}
      {trialStatus?.expiringTrials && trialStatus?.expiredTrials && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Expiring Trials */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="mt-0.5">
                  <AlertTriangle className="h-5 w-5 text-yellow-600" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-yellow-800 dark:text-yellow-400">
                    {trialStatus.expiringTrials.length} companies&apos; trials expiring in 7 days
                  </p>
                  {trialStatus.expiringTrials.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {trialStatus.expiringTrials.map((c) => (
                        <Link
                          key={c.id}
                          href={`/platform/companies/${c.id}`}
                          className="block text-sm text-yellow-700 dark:text-yellow-300 hover:underline"
                        >
                          {c.name}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Expired Trials */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="mt-0.5">
                  <XCircle className="h-5 w-5 text-red-600" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-red-800 dark:text-red-400">
                    {trialStatus.expiredTrials.length} companies with expired trials
                  </p>
                  {trialStatus.expiredTrials.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {trialStatus.expiredTrials.map((c) => (
                        <Link
                          key={c.id}
                          href={`/platform/companies/${c.id}`}
                          className="block text-sm text-red-700 dark:text-red-300 hover:underline"
                        >
                          {c.name}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Company Health Scores */}
      {healthScores.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Company Health Scores</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <div className="min-w-[700px]">
                {/* Table Header */}
                <div className="grid grid-cols-7 gap-2 text-xs font-medium text-gray-500 uppercase tracking-wider pb-2 border-b border-gray-200 dark:border-gray-700">
                  <div className="col-span-1">Company</div>
                  <div>Plan</div>
                  <div>Clients</div>
                  <div>Bookings</div>
                  <div>Last Activity</div>
                  <div>Health</div>
                  <div>Trial Expires</div>
                </div>
                {/* Table Rows */}
                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                  {healthScores.map((company) => (
                    <div
                      key={company.id}
                      className="grid grid-cols-7 gap-2 items-center py-3 text-sm"
                    >
                      <div className="col-span-1">
                        <Link
                          href={`/platform/companies/${company.id}`}
                          className="font-medium text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400"
                        >
                          {company.name}
                        </Link>
                      </div>
                      <div>
                        <span className="inline-block px-2 py-0.5 text-xs rounded-full bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                          {company.plan}
                        </span>
                      </div>
                      <div className="text-gray-600 dark:text-gray-400">{company.clients}</div>
                      <div className="text-gray-600 dark:text-gray-400">{company.bookings}</div>
                      <div className="text-gray-500 text-xs">
                        {company.lastActivity
                          ? new Date(company.lastActivity).toLocaleDateString()
                          : 'Never'}
                      </div>
                      <div>
                        <span
                          className={`inline-block px-2 py-0.5 text-xs rounded-full font-medium ${getHealthColor(company.healthScore)}`}
                        >
                          {company.healthScore}
                        </span>
                      </div>
                      <div className="text-gray-500 text-xs">
                        {company.trialEndsAt
                          ? new Date(company.trialEndsAt).toLocaleDateString()
                          : '-'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Onboarding Funnel */}
      {funnel.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Onboarding Funnel</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <div className="min-w-[600px]">
                {/* Table Header */}
                <div className="grid grid-cols-6 gap-2 text-xs font-medium text-gray-500 uppercase tracking-wider pb-2 border-b border-gray-200 dark:border-gray-700">
                  <div>Month</div>
                  <div>Signups</div>
                  <div>First Client</div>
                  <div>First Booking</div>
                  <div>First Payment</div>
                  <div>Converted to Paid</div>
                </div>
                {/* Table Rows */}
                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                  {funnel.map((row) => (
                    <div
                      key={row.month}
                      className="grid grid-cols-6 gap-2 items-center py-3 text-sm text-gray-700 dark:text-gray-300"
                    >
                      <div className="font-medium">{row.month}</div>
                      <div>{row.signups}</div>
                      <div>{row.firstClient}</div>
                      <div>{row.firstBooking}</div>
                      <div>{row.firstPayment}</div>
                      <div>{row.convertedToPaid}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Companies */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recently Onboarded</CardTitle>
        </CardHeader>
        <CardContent>
          {stats?.recentCompanies && stats.recentCompanies.length > 0 ? (
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {stats.recentCompanies.map((company) => (
                <Link
                  key={company.id}
                  href={`/platform/companies/${company.id}`}
                  className="flex items-center justify-between py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 -mx-2 px-2 rounded-lg transition-colors"
                >
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {company.name}
                    </p>
                    <p className="text-sm text-gray-500">
                      /{company.slug} &middot; {company._count.users} users &middot; {company._count.clients} clients
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="inline-block px-2 py-0.5 text-xs rounded-full bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                      {company.plan}
                    </span>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(company.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 text-center py-4">
              No companies onboarded yet
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

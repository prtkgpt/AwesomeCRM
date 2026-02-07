'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, Users, UserCheck, CalendarDays, ArrowRight } from 'lucide-react';

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

export default function PlatformDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch('/api/platform/stats');
        const data = await res.json();
        if (data.success) {
          setStats(data.data);
        }
      } catch (err) {
        console.error('Failed to fetch stats:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
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
      </div>
    );
  }

  const statCards = [
    { label: 'Companies', value: stats?.totalCompanies || 0, icon: Building2, color: 'text-blue-600' },
    { label: 'Users', value: stats?.totalUsers || 0, icon: Users, color: 'text-green-600' },
    { label: 'Clients', value: stats?.totalClients || 0, icon: UserCheck, color: 'text-purple-600' },
    { label: 'Bookings', value: stats?.totalBookings || 0, icon: CalendarDays, color: 'text-orange-600' },
  ];

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

      {/* Stats Grid */}
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

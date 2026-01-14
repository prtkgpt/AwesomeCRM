'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, DollarSign, Pause, Play, TrendingUp, Users, X } from 'lucide-react';

interface Subscription {
  id: string;
  client: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
  };
  address: {
    street: string;
    city: string;
    state: string;
  };
  scheduledDate: string;
  price: number;
  serviceType: string;
  recurrenceFrequency: string;
  recurrenceEndDate: string | null;
  subscriptionStatus: 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED';
  totalBookings: number;
  completedCount: number;
  upcomingCount: number;
  nextBookingDate: string | null;
  totalRevenue: number;
  paidRevenue: number;
  unpaidRevenue: number;
  internalNotes: string | null;
  assignee: {
    user: {
      name: string | null;
      email: string;
    };
  } | null;
}

export default function SubscriptionsPage() {
  const router = useRouter();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'ALL' | 'ACTIVE' | 'PAUSED' | 'COMPLETED'>('ALL');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  const fetchSubscriptions = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/subscriptions');
      const data = await response.json();

      if (data.success) {
        setSubscriptions(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch subscriptions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePause = async (subscriptionId: string) => {
    if (!confirm('Are you sure you want to pause this subscription? All future scheduled bookings will be cancelled.')) {
      return;
    }

    try {
      setActionLoading(subscriptionId);
      const response = await fetch(`/api/subscriptions/${subscriptionId}/pause`, {
        method: 'POST',
      });

      const data = await response.json();

      if (data.success) {
        alert(data.message);
        fetchSubscriptions(); // Refresh list
      } else {
        alert(data.error || 'Failed to pause subscription');
      }
    } catch (error) {
      console.error('Failed to pause subscription:', error);
      alert('An error occurred while pausing the subscription');
    } finally {
      setActionLoading(null);
    }
  };

  const handleResume = async (subscriptionId: string) => {
    if (!confirm('Resume this subscription? New future bookings will be generated.')) {
      return;
    }

    try {
      setActionLoading(subscriptionId);
      const response = await fetch(`/api/subscriptions/${subscriptionId}/resume`, {
        method: 'POST',
      });

      const data = await response.json();

      if (data.success) {
        alert(data.message);
        fetchSubscriptions(); // Refresh list
      } else {
        alert(data.error || 'Failed to resume subscription');
      }
    } catch (error) {
      console.error('Failed to resume subscription:', error);
      alert('An error occurred while resuming the subscription');
    } finally {
      setActionLoading(null);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      ACTIVE: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      PAUSED: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
      COMPLETED: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      CANCELLED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    };

    return (
      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${styles[status as keyof typeof styles]}`}>
        {status}
      </span>
    );
  };

  const getFrequencyLabel = (frequency: string) => {
    const labels = {
      WEEKLY: 'Weekly',
      BIWEEKLY: 'Bi-weekly',
      MONTHLY: 'Monthly',
    };
    return labels[frequency as keyof typeof labels] || frequency;
  };

  const isPaused = (subscription: Subscription) => {
    return subscription.internalNotes?.includes('[PAUSED]');
  };

  const filteredSubscriptions = subscriptions.filter((sub) => {
    if (filter === 'ALL') return true;
    if (filter === 'PAUSED') return isPaused(sub);
    return sub.subscriptionStatus === filter;
  });

  // Calculate summary stats
  const stats = {
    total: subscriptions.length,
    active: subscriptions.filter((s) => s.subscriptionStatus === 'ACTIVE' && !isPaused(s)).length,
    paused: subscriptions.filter((s) => isPaused(s)).length,
    totalRevenue: subscriptions.reduce((sum, s) => sum + s.totalRevenue, 0),
    monthlyRecurring: subscriptions
      .filter((s) => s.subscriptionStatus === 'ACTIVE' && !isPaused(s))
      .reduce((sum, s) => {
        // Estimate monthly revenue based on frequency
        if (s.recurrenceFrequency === 'WEEKLY') return sum + s.price * 4;
        if (s.recurrenceFrequency === 'BIWEEKLY') return sum + s.price * 2;
        if (s.recurrenceFrequency === 'MONTHLY') return sum + s.price;
        return sum;
      }, 0),
  };

  if (loading) {
    return (
      <div className="p-4 max-w-7xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Subscription Management
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage recurring bookings and subscriptions
          </p>
        </div>
        <Button onClick={() => router.push('/jobs/new')}>
          + New Booking
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/30 border-blue-200 dark:border-blue-800">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-blue-500 rounded-lg">
              <Users className="h-6 w-6 text-white" />
            </div>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">Total Subscriptions</p>
          <p className="text-3xl font-bold text-blue-900 dark:text-blue-100">{stats.total}</p>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
            {stats.active} active, {stats.paused} paused
          </p>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/30 dark:to-green-900/30 border-green-200 dark:border-green-800">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-green-500 rounded-lg">
              <TrendingUp className="h-6 w-6 text-white" />
            </div>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">Monthly Recurring</p>
          <p className="text-3xl font-bold text-green-900 dark:text-green-100">
            {formatCurrency(stats.monthlyRecurring)}
          </p>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Est. monthly revenue</p>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/30 dark:to-purple-900/30 border-purple-200 dark:border-purple-800">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-purple-500 rounded-lg">
              <DollarSign className="h-6 w-6 text-white" />
            </div>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">Total Revenue</p>
          <p className="text-3xl font-bold text-purple-900 dark:text-purple-100">
            {formatCurrency(stats.totalRevenue)}
          </p>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">All subscriptions</p>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950/30 dark:to-orange-900/30 border-orange-200 dark:border-orange-800">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-orange-500 rounded-lg">
              <Calendar className="h-6 w-6 text-white" />
            </div>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">Active Subscriptions</p>
          <p className="text-3xl font-bold text-orange-900 dark:text-orange-100">{stats.active}</p>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Currently running</p>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {['ALL', 'ACTIVE', 'PAUSED', 'COMPLETED'].map((filterOption) => (
          <Button
            key={filterOption}
            variant={filter === filterOption ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter(filterOption as any)}
          >
            {filterOption}
            {filterOption === 'ALL' && ` (${subscriptions.length})`}
            {filterOption === 'ACTIVE' && ` (${stats.active})`}
            {filterOption === 'PAUSED' && ` (${stats.paused})`}
            {filterOption === 'COMPLETED' && ` (${subscriptions.filter((s) => s.subscriptionStatus === 'COMPLETED').length})`}
          </Button>
        ))}
      </div>

      {/* Subscriptions List */}
      <div className="space-y-4">
        {filteredSubscriptions.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-gray-600 dark:text-gray-400">No subscriptions found</p>
          </Card>
        ) : (
          filteredSubscriptions.map((subscription) => {
            const paused = isPaused(subscription);
            const status = paused ? 'PAUSED' : subscription.subscriptionStatus;

            return (
              <Card key={subscription.id} className="p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between">
                  {/* Left: Client Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                        {subscription.client.name}
                      </h3>
                      {getStatusBadge(status)}
                      <span className="text-sm bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                        {getFrequencyLabel(subscription.recurrenceFrequency)}
                      </span>
                    </div>

                    <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                      <p>📍 {subscription.address.street}, {subscription.address.city}</p>
                      <p>💼 {subscription.serviceType} Clean - {formatCurrency(subscription.price)}</p>
                      {subscription.assignee && (
                        <p>👤 Assigned to: {subscription.assignee.user.name || subscription.assignee.user.email}</p>
                      )}
                      <p>📅 Started: {formatDate(subscription.scheduledDate)}</p>
                      {subscription.recurrenceEndDate && (
                        <p>🏁 Ends: {formatDate(subscription.recurrenceEndDate)}</p>
                      )}
                      {subscription.nextBookingDate && (
                        <p>⏭️ Next: {formatDate(subscription.nextBookingDate)}</p>
                      )}
                    </div>
                  </div>

                  {/* Right: Stats & Actions */}
                  <div className="flex flex-col items-end gap-4">
                    {/* Stats */}
                    <div className="text-right space-y-1">
                      <div className="text-2xl font-bold text-gray-900 dark:text-white">
                        {subscription.totalBookings}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {subscription.completedCount} completed | {subscription.upcomingCount} upcoming
                      </div>
                      <div className="text-sm font-semibold text-green-600 dark:text-green-400">
                        {formatCurrency(subscription.totalRevenue)}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        Paid: {formatCurrency(subscription.paidRevenue)}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      {!paused && status === 'ACTIVE' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handlePause(subscription.id)}
                          disabled={actionLoading === subscription.id}
                          className="text-yellow-600 hover:text-yellow-700 hover:bg-yellow-50"
                        >
                          <Pause className="h-4 w-4 mr-1" />
                          {actionLoading === subscription.id ? 'Pausing...' : 'Pause'}
                        </Button>
                      )}

                      {paused && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleResume(subscription.id)}
                          disabled={actionLoading === subscription.id}
                          className="text-green-600 hover:text-green-700 hover:bg-green-50"
                        >
                          <Play className="h-4 w-4 mr-1" />
                          {actionLoading === subscription.id ? 'Resuming...' : 'Resume'}
                        </Button>
                      )}

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => router.push(`/jobs?clientId=${subscription.client.id}`)}
                      >
                        View Jobs
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}

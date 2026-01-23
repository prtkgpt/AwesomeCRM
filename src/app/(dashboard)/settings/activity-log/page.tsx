'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Activity,
  Clock,
  User,
  Filter,
  ChevronLeft,
  ChevronRight,
  Users,
  Calendar,
  CreditCard,
  MessageSquare,
  Settings,
  UserPlus,
  FileText,
  LogIn,
  CheckCircle,
  XCircle,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Select } from '@/components/ui/select';

interface AuditLogEntry {
  id: string;
  action: string;
  description: string;
  entityType: string | null;
  entityId: string | null;
  metadata: Record<string, any> | null;
  createdAt: string;
  user: {
    id: string;
    name: string | null;
    email: string;
    role: string;
  } | null;
}

interface ActivityLogData {
  logs: AuditLogEntry[];
  pagination: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
  };
  stats: {
    totalActivities: number;
    actionBreakdown: Record<string, number>;
    uniqueUsers: Array<{
      id: string;
      name: string | null;
      email: string;
      role: string;
    }>;
  };
  filters: {
    days: number;
    fromDate: string;
  };
}

// Action type to icon and color mapping
const actionConfig: Record<string, { icon: any; color: string; bgColor: string }> = {
  LOGIN: { icon: LogIn, color: 'text-blue-600', bgColor: 'bg-blue-100' },
  LOGOUT: { icon: LogIn, color: 'text-gray-600', bgColor: 'bg-gray-100' },
  LOGIN_FAILED: { icon: XCircle, color: 'text-red-600', bgColor: 'bg-red-100' },
  CLIENT_CREATED: { icon: UserPlus, color: 'text-green-600', bgColor: 'bg-green-100' },
  CLIENT_UPDATED: { icon: Users, color: 'text-blue-600', bgColor: 'bg-blue-100' },
  CLIENT_DELETED: { icon: XCircle, color: 'text-red-600', bgColor: 'bg-red-100' },
  BOOKING_CREATED: { icon: Calendar, color: 'text-green-600', bgColor: 'bg-green-100' },
  BOOKING_UPDATED: { icon: Calendar, color: 'text-blue-600', bgColor: 'bg-blue-100' },
  BOOKING_CANCELLED: { icon: XCircle, color: 'text-red-600', bgColor: 'bg-red-100' },
  BOOKING_COMPLETED: { icon: CheckCircle, color: 'text-green-600', bgColor: 'bg-green-100' },
  BOOKING_APPROVED: { icon: CheckCircle, color: 'text-purple-600', bgColor: 'bg-purple-100' },
  PAYMENT_RECEIVED: { icon: CreditCard, color: 'text-green-600', bgColor: 'bg-green-100' },
  PAYMENT_FAILED: { icon: CreditCard, color: 'text-red-600', bgColor: 'bg-red-100' },
  MESSAGE_SENT: { icon: MessageSquare, color: 'text-blue-600', bgColor: 'bg-blue-100' },
  EMAIL_SENT: { icon: MessageSquare, color: 'text-indigo-600', bgColor: 'bg-indigo-100' },
  SETTINGS_UPDATED: { icon: Settings, color: 'text-gray-600', bgColor: 'bg-gray-100' },
  COMPANY_UPDATED: { icon: Settings, color: 'text-gray-600', bgColor: 'bg-gray-100' },
  TEAM_MEMBER_ADDED: { icon: UserPlus, color: 'text-green-600', bgColor: 'bg-green-100' },
  TEAM_MEMBER_UPDATED: { icon: Users, color: 'text-blue-600', bgColor: 'bg-blue-100' },
  TEAM_MEMBER_REMOVED: { icon: XCircle, color: 'text-red-600', bgColor: 'bg-red-100' },
  INVOICE_CREATED: { icon: FileText, color: 'text-green-600', bgColor: 'bg-green-100' },
  INVOICE_SENT: { icon: FileText, color: 'text-blue-600', bgColor: 'bg-blue-100' },
  ESTIMATE_CREATED: { icon: FileText, color: 'text-green-600', bgColor: 'bg-green-100' },
  ESTIMATE_SENT: { icon: FileText, color: 'text-blue-600', bgColor: 'bg-blue-100' },
  ESTIMATE_ACCEPTED: { icon: CheckCircle, color: 'text-green-600', bgColor: 'bg-green-100' },
  REVIEW_RECEIVED: { icon: Activity, color: 'text-yellow-600', bgColor: 'bg-yellow-100' },
  TIME_OFF_REQUESTED: { icon: Calendar, color: 'text-orange-600', bgColor: 'bg-orange-100' },
  TIME_OFF_APPROVED: { icon: CheckCircle, color: 'text-green-600', bgColor: 'bg-green-100' },
  TIME_OFF_DENIED: { icon: XCircle, color: 'text-red-600', bgColor: 'bg-red-100' },
};

const defaultActionConfig = { icon: Activity, color: 'text-gray-600', bgColor: 'bg-gray-100' };

export default function ActivityLogPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [data, setData] = useState<ActivityLogData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [days, setDays] = useState<number>(7);
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [userFilter, setUserFilter] = useState<string>('all');
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (status === 'loading') return;
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }

    // Check role
    const userRole = (session?.user as any)?.role;
    if (userRole !== 'OWNER' && userRole !== 'ADMIN') {
      router.push('/dashboard');
      return;
    }

    fetchActivityLog();
  }, [status, days, actionFilter, userFilter, page]);

  const fetchActivityLog = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        days: days.toString(),
        page: page.toString(),
        limit: '50',
      });

      if (actionFilter !== 'all') {
        params.append('action', actionFilter);
      }

      if (userFilter !== 'all') {
        params.append('userId', userFilter);
      }

      const response = await fetch(`/api/activity-log?${params}`);
      const result = await response.json();

      if (result.success) {
        setData(result.data);
      } else {
        setError(result.error || 'Failed to load activity log');
      }
    } catch (err) {
      setError('Failed to load activity log');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const formatActionName = (action: string) => {
    return action
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, l => l.toUpperCase());
  };

  const getActionIcon = (action: string) => {
    const config = actionConfig[action] || defaultActionConfig;
    const Icon = config.icon;
    return (
      <div className={`p-2 rounded-full ${config.bgColor}`}>
        <Icon className={`h-4 w-4 ${config.color}`} />
      </div>
    );
  };

  // Get unique actions from stats for filter dropdown
  const uniqueActions = data?.stats?.actionBreakdown
    ? Object.keys(data.stats.actionBreakdown)
    : [];

  if (status === 'loading' || loading) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/settings">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Activity className="h-6 w-6" />
              Activity Log
            </h1>
            <p className="text-sm text-gray-500">
              360-degree view of all business activities
            </p>
          </div>
        </div>
        <Button variant="outline" onClick={fetchActivityLog} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      {data?.stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="text-sm text-gray-500">Total Activities</div>
            <div className="text-2xl font-bold">{data.stats.totalActivities}</div>
            <div className="text-xs text-gray-400">Last {days} days</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-gray-500">Active Users</div>
            <div className="text-2xl font-bold">{data.stats.uniqueUsers.length}</div>
            <div className="text-xs text-gray-400">Performed actions</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-gray-500">Bookings</div>
            <div className="text-2xl font-bold">
              {(data.stats.actionBreakdown['BOOKING_CREATED'] || 0) +
                (data.stats.actionBreakdown['BOOKING_COMPLETED'] || 0)}
            </div>
            <div className="text-xs text-gray-400">Created & completed</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-gray-500">Messages Sent</div>
            <div className="text-2xl font-bold">
              {(data.stats.actionBreakdown['MESSAGE_SENT'] || 0) +
                (data.stats.actionBreakdown['EMAIL_SENT'] || 0)}
            </div>
            <div className="text-xs text-gray-400">SMS & Email</div>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-medium">Filters:</span>
          </div>

          {/* Time Range */}
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            {[7, 15, 30].map((d) => (
              <button
                key={d}
                onClick={() => { setDays(d); setPage(1); }}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  days === d
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {d} days
              </button>
            ))}
          </div>

          {/* Action Filter */}
          <Select
            value={actionFilter}
            onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
            className="w-48"
          >
            <option value="all">All Actions</option>
            {uniqueActions.map((action) => (
              <option key={action} value={action}>
                {formatActionName(action)}
              </option>
            ))}
          </Select>

          {/* User Filter */}
          {data?.stats?.uniqueUsers && data.stats.uniqueUsers.length > 0 && (
            <Select
              value={userFilter}
              onChange={(e) => { setUserFilter(e.target.value); setPage(1); }}
              className="w-48"
            >
              <option value="all">All Users</option>
              {data.stats.uniqueUsers.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name || user.email}
                </option>
              ))}
            </Select>
          )}
        </div>
      </Card>

      {/* Error State */}
      {error && (
        <Card className="p-4 bg-red-50 border-red-200">
          <p className="text-red-700">{error}</p>
        </Card>
      )}

      {/* Activity List */}
      <Card className="divide-y">
        {data?.logs && data.logs.length > 0 ? (
          data.logs.map((log) => (
            <div key={log.id} className="p-4 hover:bg-gray-50 transition-colors">
              <div className="flex items-start gap-4">
                {getActionIcon(log.action)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {log.description}
                    </p>
                    <span className="text-xs text-gray-500 whitespace-nowrap flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDate(log.createdAt)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    {log.user && (
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {log.user.name || log.user.email}
                      </span>
                    )}
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      actionConfig[log.action]?.bgColor || 'bg-gray-100'
                    } ${actionConfig[log.action]?.color || 'text-gray-600'}`}>
                      {formatActionName(log.action)}
                    </span>
                    {log.entityType && (
                      <span className="text-xs text-gray-400">
                        {log.entityType}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="p-8 text-center text-gray-500">
            <Activity className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>No activity found for the selected filters</p>
            <p className="text-sm mt-1">Try adjusting your filters or time range</p>
          </div>
        )}
      </Card>

      {/* Pagination */}
      {data?.pagination && data.pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Showing {((data.pagination.page - 1) * data.pagination.limit) + 1} to{' '}
            {Math.min(data.pagination.page * data.pagination.limit, data.pagination.totalCount)} of{' '}
            {data.pagination.totalCount} activities
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.min(data.pagination.totalPages, p + 1))}
              disabled={page === data.pagination.totalPages}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

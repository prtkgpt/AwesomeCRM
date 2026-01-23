'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  MessageSquare,
  Clock,
  User,
  Filter,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  XCircle,
  AlertCircle,
  Send,
  RefreshCw,
  Phone,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Select } from '@/components/ui/select';

interface MessageEntry {
  id: string;
  to: string;
  from: string;
  body: string;
  type: string;
  status: string;
  errorMessage: string | null;
  createdAt: string;
  sentBy: {
    id: string;
    name: string;
    email: string;
    role: string;
  } | null;
  recipientName: string | null;
  booking: {
    id: string;
    client: {
      id: string;
      name: string;
    };
  } | null;
}

interface MessageHistoryData {
  messages: MessageEntry[];
  pagination: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
  };
  stats: {
    totalMessages: number;
    typeBreakdown: Record<string, number>;
    statusBreakdown: Record<string, number>;
    uniqueSenders: Array<{
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

// Message type display names
const messageTypeNames: Record<string, string> = {
  CONFIRMATION: 'Booking Confirmation',
  REMINDER: 'Appointment Reminder',
  ON_MY_WAY: 'On My Way',
  THANK_YOU: 'Thank You',
  PAYMENT_REQUEST: 'Payment Request',
  CUSTOM: 'Custom Message',
  BIRTHDAY_GREETING: 'Birthday Greeting',
  ANNIVERSARY_GREETING: 'Anniversary Greeting',
  REVIEW_REQUEST: 'Review Request',
  TIME_OFF_REQUEST: 'Time Off Request',
  TIME_OFF_APPROVED: 'Time Off Approved',
  TIME_OFF_DENIED: 'Time Off Denied',
};

// Status colors
const statusConfig: Record<string, { icon: any; color: string; bgColor: string }> = {
  SENT: { icon: CheckCircle, color: 'text-green-600', bgColor: 'bg-green-100' },
  DELIVERED: { icon: CheckCircle, color: 'text-blue-600', bgColor: 'bg-blue-100' },
  FAILED: { icon: XCircle, color: 'text-red-600', bgColor: 'bg-red-100' },
  PENDING: { icon: AlertCircle, color: 'text-yellow-600', bgColor: 'bg-yellow-100' },
};

export default function CommunicationsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [data, setData] = useState<MessageHistoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [days, setDays] = useState<number>(7);
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [senderFilter, setSenderFilter] = useState<string>('all');
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

    fetchMessageHistory();
  }, [status, days, typeFilter, statusFilter, senderFilter, page]);

  const fetchMessageHistory = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        days: days.toString(),
        page: page.toString(),
        limit: '50',
      });

      if (typeFilter !== 'all') {
        params.append('type', typeFilter);
      }

      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }

      if (senderFilter !== 'all') {
        params.append('senderId', senderFilter);
      }

      const response = await fetch(`/api/messages/history?${params}`);
      const result = await response.json();

      if (result.success) {
        setData(result.data);
      } else {
        setError(result.error || 'Failed to load message history');
      }
    } catch (err) {
      setError('Failed to load message history');
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

  const formatPhoneNumber = (phone: string) => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 11 && cleaned.startsWith('1')) {
      return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
    }
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    return phone;
  };

  const truncateMessage = (message: string, maxLength: number = 100) => {
    if (message.length <= maxLength) return message;
    return message.slice(0, maxLength) + '...';
  };

  const getStatusIcon = (messageStatus: string) => {
    const config = statusConfig[messageStatus] || statusConfig.PENDING;
    const Icon = config.icon;
    return <Icon className={`h-4 w-4 ${config.color}`} />;
  };

  // Get unique types from stats
  const uniqueTypes = data?.stats?.typeBreakdown
    ? Object.keys(data.stats.typeBreakdown)
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
              <MessageSquare className="h-6 w-6" />
              Communications
            </h1>
            <p className="text-sm text-gray-500">
              Message history with sender information
            </p>
          </div>
        </div>
        <Button variant="outline" onClick={fetchMessageHistory} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      {data?.stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="text-sm text-gray-500">Total Messages</div>
            <div className="text-2xl font-bold">{data.stats.totalMessages}</div>
            <div className="text-xs text-gray-400">Last {days} days</div>
          </Card>
          <Card className="p-4 bg-green-50 border-green-200">
            <div className="text-sm text-green-700">Delivered</div>
            <div className="text-2xl font-bold text-green-600">
              {(data.stats.statusBreakdown['SENT'] || 0) +
                (data.stats.statusBreakdown['DELIVERED'] || 0)}
            </div>
            <div className="text-xs text-green-500">Successfully sent</div>
          </Card>
          <Card className="p-4 bg-red-50 border-red-200">
            <div className="text-sm text-red-700">Failed</div>
            <div className="text-2xl font-bold text-red-600">
              {data.stats.statusBreakdown['FAILED'] || 0}
            </div>
            <div className="text-xs text-red-500">Delivery errors</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-gray-500">Active Senders</div>
            <div className="text-2xl font-bold">{data.stats.uniqueSenders.length}</div>
            <div className="text-xs text-gray-400">Team members</div>
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

          {/* Type Filter */}
          <Select
            value={typeFilter}
            onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
            className="w-48"
          >
            <option value="all">All Types</option>
            {uniqueTypes.map((type) => (
              <option key={type} value={type}>
                {messageTypeNames[type] || type}
              </option>
            ))}
          </Select>

          {/* Status Filter */}
          <Select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="w-36"
          >
            <option value="all">All Status</option>
            <option value="SENT">Sent</option>
            <option value="DELIVERED">Delivered</option>
            <option value="FAILED">Failed</option>
            <option value="PENDING">Pending</option>
          </Select>

          {/* Sender Filter */}
          {data?.stats?.uniqueSenders && data.stats.uniqueSenders.length > 0 && (
            <Select
              value={senderFilter}
              onChange={(e) => { setSenderFilter(e.target.value); setPage(1); }}
              className="w-48"
            >
              <option value="all">All Senders</option>
              {data.stats.uniqueSenders.map((sender) => (
                <option key={sender.id} value={sender.id}>
                  {sender.name || sender.email}
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

      {/* Message List */}
      <Card className="divide-y">
        {data?.messages && data.messages.length > 0 ? (
          data.messages.map((msg) => (
            <div key={msg.id} className="p-4 hover:bg-gray-50 transition-colors">
              <div className="flex items-start gap-4">
                <div className={`p-2 rounded-full ${
                  statusConfig[msg.status]?.bgColor || 'bg-gray-100'
                }`}>
                  <Send className={`h-4 w-4 ${
                    statusConfig[msg.status]?.color || 'text-gray-600'
                  }`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900">
                        {messageTypeNames[msg.type] || msg.type}
                      </span>
                      <span className="flex items-center gap-1">
                        {getStatusIcon(msg.status)}
                        <span className="text-xs text-gray-500">{msg.status}</span>
                      </span>
                    </div>
                    <span className="text-xs text-gray-500 whitespace-nowrap flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDate(msg.createdAt)}
                    </span>
                  </div>

                  {/* Recipient */}
                  <div className="flex items-center gap-2 mt-1">
                    <Phone className="h-3 w-3 text-gray-400" />
                    <span className="text-sm text-gray-700">
                      To: {msg.recipientName || msg.booking?.client?.name || formatPhoneNumber(msg.to)}
                    </span>
                  </div>

                  {/* Message Preview */}
                  <p className="text-sm text-gray-600 mt-2 bg-gray-50 rounded p-2">
                    {truncateMessage(msg.body, 150)}
                  </p>

                  {/* Sender Info */}
                  <div className="flex items-center gap-4 mt-2">
                    {msg.sentBy && (
                      <span className="text-xs text-gray-500 flex items-center gap-1 bg-blue-50 px-2 py-1 rounded">
                        <User className="h-3 w-3" />
                        Sent by: <span className="font-medium">{msg.sentBy.name || msg.sentBy.email}</span>
                      </span>
                    )}
                    {msg.errorMessage && (
                      <span className="text-xs text-red-600 flex items-center gap-1">
                        <XCircle className="h-3 w-3" />
                        Error: {msg.errorMessage}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="p-8 text-center text-gray-500">
            <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>No messages found for the selected filters</p>
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
            {data.pagination.totalCount} messages
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

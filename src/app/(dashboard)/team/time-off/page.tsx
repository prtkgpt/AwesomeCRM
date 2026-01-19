'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Calendar,
  Clock,
  Check,
  X,
  CalendarDays,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Loader2,
  User,
  MapPin,
  Filter,
} from 'lucide-react';

interface TeamMember {
  id: string;
  user: {
    id: string;
    name: string | null;
    email: string;
    phone: string | null;
  };
}

interface ConflictingBooking {
  id: string;
  scheduledDate: string;
  client: { name: string };
  address: { street: string; city: string };
}

interface TimeOffRequest {
  id: string;
  type: string;
  startDate: string;
  endDate: string;
  reason: string | null;
  status: 'PENDING' | 'APPROVED' | 'DENIED' | 'CANCELLED';
  reviewNotes: string | null;
  conflictedBookingIds: string[];
  conflictingBookings: ConflictingBooking[];
  teamMember: TeamMember;
  createdAt: string;
  reviewedAt: string | null;
}

const TIME_OFF_TYPES: Record<string, { label: string; icon: string }> = {
  VACATION: { label: 'Vacation', icon: '🌴' },
  SICK_LEAVE: { label: 'Sick Leave', icon: '🤒' },
  PERSONAL: { label: 'Personal Day', icon: '👤' },
  FAMILY: { label: 'Family Emergency', icon: '👨‍👩‍👧' },
  BEREAVEMENT: { label: 'Bereavement', icon: '🕊️' },
  OTHER: { label: 'Other', icon: '📝' },
};

const STATUS_CONFIG = {
  PENDING: {
    label: 'Pending Review',
    color: 'bg-yellow-100 text-yellow-800',
    icon: Clock,
  },
  APPROVED: {
    label: 'Approved',
    color: 'bg-green-100 text-green-800',
    icon: CheckCircle2,
  },
  DENIED: {
    label: 'Denied',
    color: 'bg-red-100 text-red-800',
    icon: XCircle,
  },
  CANCELLED: {
    label: 'Cancelled',
    color: 'bg-gray-100 text-gray-800',
    icon: X,
  },
};

export default function AdminTimeOffPage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<TimeOffRequest[]>([]);
  const [stats, setStats] = useState({ pending: 0, approved: 0, total: 0 });
  const [filter, setFilter] = useState<string>('PENDING');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [reviewNotes, setReviewNotes] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    if (authStatus === 'unauthenticated') {
      router.push('/login');
    } else if (authStatus === 'authenticated') {
      fetchRequests();
    }
  }, [authStatus, router, filter]);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const queryParams = filter !== 'ALL' ? `?status=${filter}&upcoming=true` : '?upcoming=true';
      const res = await fetch(`/api/team/time-off${queryParams}`);
      if (res.ok) {
        const data = await res.json();
        setRequests(data.data || []);
        setStats(data.stats || { pending: 0, approved: 0, total: 0 });
      }
    } catch (error) {
      console.error('Failed to fetch time off requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    if (!confirm('Are you sure you want to approve this time off request?')) return;

    setActionLoading(id);
    try {
      const res = await fetch(`/api/team/time-off/${id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: reviewNotes[id] || null }),
      });

      if (res.ok) {
        fetchRequests();
        alert('Time off request approved! The cleaner has been notified.');
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to approve request');
      }
    } catch (error) {
      console.error('Failed to approve request:', error);
      alert('Failed to approve request');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeny = async (id: string) => {
    const reason = reviewNotes[id] || prompt('Please provide a reason for denial (optional):');

    setActionLoading(id);
    try {
      const res = await fetch(`/api/team/time-off/${id}/deny`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });

      if (res.ok) {
        fetchRequests();
        alert('Time off request denied. The cleaner has been notified.');
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to deny request');
      }
    } catch (error) {
      console.error('Failed to deny request:', error);
      alert('Failed to deny request');
    } finally {
      setActionLoading(null);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getTypeLabel = (type: string) => {
    const typeConfig = TIME_OFF_TYPES[type];
    return typeConfig ? `${typeConfig.icon} ${typeConfig.label}` : type;
  };

  const getDaysCount = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  };

  if (loading && requests.length === 0) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <span className="ml-2">Loading time off requests...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Time Off Management</h1>
        <p className="text-gray-600">
          Review and manage team member time off requests
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card
          className={`p-4 text-center cursor-pointer transition-all ${
            filter === 'PENDING' ? 'ring-2 ring-yellow-500' : ''
          }`}
          onClick={() => setFilter('PENDING')}
        >
          <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
          <div className="text-sm text-gray-600">Pending Review</div>
        </Card>
        <Card
          className={`p-4 text-center cursor-pointer transition-all ${
            filter === 'APPROVED' ? 'ring-2 ring-green-500' : ''
          }`}
          onClick={() => setFilter('APPROVED')}
        >
          <div className="text-2xl font-bold text-green-600">{stats.approved}</div>
          <div className="text-sm text-gray-600">Approved</div>
        </Card>
        <Card
          className={`p-4 text-center cursor-pointer transition-all ${
            filter === 'DENIED' ? 'ring-2 ring-red-500' : ''
          }`}
          onClick={() => setFilter('DENIED')}
        >
          <div className="text-2xl font-bold text-red-600">
            {requests.filter((r) => r.status === 'DENIED').length}
          </div>
          <div className="text-sm text-gray-600">Denied</div>
        </Card>
        <Card
          className={`p-4 text-center cursor-pointer transition-all ${
            filter === 'ALL' ? 'ring-2 ring-blue-500' : ''
          }`}
          onClick={() => setFilter('ALL')}
        >
          <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
          <div className="text-sm text-gray-600">View All</div>
        </Card>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center gap-2 mb-6">
        <Filter className="h-4 w-4 text-gray-500" />
        <span className="text-sm text-gray-600">Showing:</span>
        <Badge className={filter === 'PENDING' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100'}>
          {filter === 'ALL' ? 'All Requests' : filter.charAt(0) + filter.slice(1).toLowerCase()}
        </Badge>
        {loading && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
      </div>

      {/* Requests List */}
      {requests.length > 0 ? (
        <div className="space-y-4">
          {requests.map((request) => {
            const statusConfig = STATUS_CONFIG[request.status];
            const StatusIcon = statusConfig.icon;
            const isPending = request.status === 'PENDING';
            const cleanerName = request.teamMember.user.name || request.teamMember.user.email;

            return (
              <Card
                key={request.id}
                className={`p-6 ${
                  isPending ? 'border-l-4 border-yellow-500' : ''
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                  {/* Main Info */}
                  <div className="flex-1">
                    {/* Header with cleaner name and status */}
                    <div className="flex items-center gap-3 mb-3">
                      <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <User className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold">{cleanerName}</h3>
                        <p className="text-sm text-gray-500">
                          {request.teamMember.user.email}
                        </p>
                      </div>
                      <Badge className={statusConfig.color + ' ml-auto'}>
                        <StatusIcon className="h-3 w-3 mr-1" />
                        {statusConfig.label}
                      </Badge>
                    </div>

                    {/* Request Details */}
                    <div className="bg-gray-50 rounded-lg p-4 mb-3">
                      <div className="flex flex-wrap gap-4">
                        <div>
                          <span className="text-xs text-gray-500 uppercase">Type</span>
                          <p className="font-medium">{getTypeLabel(request.type)}</p>
                        </div>
                        <div>
                          <span className="text-xs text-gray-500 uppercase">Dates</span>
                          <p className="font-medium">
                            {formatDate(request.startDate)}
                            {request.startDate !== request.endDate && (
                              <> - {formatDate(request.endDate)}</>
                            )}
                          </p>
                        </div>
                        <div>
                          <span className="text-xs text-gray-500 uppercase">Duration</span>
                          <p className="font-medium">
                            {getDaysCount(request.startDate, request.endDate)} day
                            {getDaysCount(request.startDate, request.endDate) > 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>
                      {request.reason && (
                        <div className="mt-3 pt-3 border-t">
                          <span className="text-xs text-gray-500 uppercase">Reason</span>
                          <p className="text-gray-700">{request.reason}</p>
                        </div>
                      )}
                    </div>

                    {/* Conflicts Warning */}
                    {request.conflictingBookings && request.conflictingBookings.length > 0 && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-3">
                        <div className="flex items-center gap-2 text-yellow-800 mb-2">
                          <AlertTriangle className="h-5 w-5" />
                          <span className="font-semibold">
                            {request.conflictingBookings.length} Schedule Conflict
                            {request.conflictingBookings.length > 1 ? 's' : ''}
                          </span>
                        </div>
                        <div className="space-y-2">
                          {request.conflictingBookings.map((booking) => (
                            <div
                              key={booking.id}
                              className="flex items-center gap-2 text-sm text-yellow-700"
                            >
                              <CalendarDays className="h-4 w-4" />
                              <span>
                                {new Date(booking.scheduledDate).toLocaleDateString()} -{' '}
                                {booking.client.name}
                              </span>
                              <MapPin className="h-3 w-3 ml-2" />
                              <span className="text-xs">
                                {booking.address.street}, {booking.address.city}
                              </span>
                            </div>
                          ))}
                        </div>
                        <p className="text-xs text-yellow-600 mt-2">
                          You may need to reassign these jobs if you approve this request.
                        </p>
                      </div>
                    )}

                    {/* Review notes for non-pending */}
                    {!isPending && request.reviewNotes && (
                      <div
                        className={`p-3 rounded-lg text-sm ${
                          request.status === 'APPROVED'
                            ? 'bg-green-50 text-green-800'
                            : 'bg-red-50 text-red-800'
                        }`}
                      >
                        <strong>Review notes:</strong> {request.reviewNotes}
                      </div>
                    )}
                  </div>

                  {/* Actions for Pending Requests */}
                  {isPending && (
                    <div className="lg:w-72 border-t lg:border-t-0 lg:border-l pt-4 lg:pt-0 lg:pl-4">
                      <div className="mb-3">
                        <label className="block text-sm font-medium mb-2">
                          Notes (optional)
                        </label>
                        <textarea
                          value={reviewNotes[request.id] || ''}
                          onChange={(e) =>
                            setReviewNotes({
                              ...reviewNotes,
                              [request.id]: e.target.value,
                            })
                          }
                          placeholder="Add a note..."
                          className="w-full border rounded-lg px-3 py-2 text-sm"
                          rows={2}
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          className="flex-1 bg-green-600 hover:bg-green-700"
                          onClick={() => handleApprove(request.id)}
                          disabled={actionLoading === request.id}
                        >
                          {actionLoading === request.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <Check className="h-4 w-4 mr-1" />
                              Approve
                            </>
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleDeny(request.id)}
                          disabled={actionLoading === request.id}
                        >
                          {actionLoading === request.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <X className="h-4 w-4 mr-1" />
                              Deny
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="mt-4 pt-3 border-t text-xs text-gray-400 flex justify-between">
                  <span>Submitted {formatDate(request.createdAt)}</span>
                  {request.reviewedAt && (
                    <span>Reviewed {formatDate(request.reviewedAt)}</span>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="p-12 text-center">
          <CalendarDays className="h-16 w-16 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-semibold text-gray-700 mb-2">
            No Time Off Requests
          </h3>
          <p className="text-gray-500">
            {filter === 'PENDING'
              ? 'No pending requests to review'
              : filter === 'ALL'
              ? 'No time off requests have been submitted yet'
              : `No ${filter.toLowerCase()} requests`}
          </p>
        </Card>
      )}

      {/* Help Text */}
      <Card className="p-4 mt-6 bg-blue-50 border-blue-200">
        <p className="text-sm text-gray-700">
          <strong>Tip:</strong> When you approve a time off request, it will
          automatically block the cleaner&apos;s schedule for those dates.
          Make sure to review any conflicting jobs and reassign them to other
          team members.
        </p>
      </Card>
    </div>
  );
}

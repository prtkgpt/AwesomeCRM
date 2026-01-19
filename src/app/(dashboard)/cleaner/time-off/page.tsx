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
  Plus,
  X,
  CalendarDays,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Loader2,
} from 'lucide-react';

interface TimeOffRequest {
  id: string;
  type: string;
  startDate: string;
  endDate: string;
  reason: string | null;
  status: 'PENDING' | 'APPROVED' | 'DENIED' | 'CANCELLED';
  reviewNotes: string | null;
  conflictedBookingIds: string[];
  createdAt: string;
}

const TIME_OFF_TYPES = [
  { value: 'VACATION', label: 'Vacation', icon: '🌴' },
  { value: 'SICK_LEAVE', label: 'Sick Leave', icon: '🤒' },
  { value: 'PERSONAL', label: 'Personal Day', icon: '👤' },
  { value: 'FAMILY', label: 'Family Emergency', icon: '👨‍👩‍👧' },
  { value: 'BEREAVEMENT', label: 'Bereavement', icon: '🕊️' },
  { value: 'OTHER', label: 'Other', icon: '📝' },
];

const STATUS_CONFIG = {
  PENDING: {
    label: 'Pending',
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

export default function CleanerTimeOffPage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [requests, setRequests] = useState<TimeOffRequest[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    type: 'VACATION',
    startDate: '',
    endDate: '',
    reason: '',
  });
  const [error, setError] = useState('');

  useEffect(() => {
    if (authStatus === 'unauthenticated') {
      router.push('/login');
    } else if (authStatus === 'authenticated') {
      fetchRequests();
    }
  }, [authStatus, router]);

  const fetchRequests = async () => {
    try {
      const res = await fetch('/api/cleaner/time-off');
      if (res.ok) {
        const data = await res.json();
        setRequests(data.timeOffRequests || []);
      }
    } catch (error) {
      console.error('Failed to fetch time off requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const res = await fetch('/api/cleaner/time-off', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (res.ok) {
        setShowForm(false);
        setFormData({
          type: 'VACATION',
          startDate: '',
          endDate: '',
          reason: '',
        });
        fetchRequests();

        // Show success message with conflict warning if applicable
        if (data.conflictCount > 0) {
          alert(
            `Time off request submitted! Note: You have ${data.conflictCount} scheduled job(s) during this time. Your admin will review and may need to reassign them.`
          );
        } else {
          alert('Time off request submitted successfully! Your admin will review it soon.');
        }
      } else {
        setError(data.error || 'Failed to submit request');
      }
    } catch (error) {
      console.error('Failed to submit time off request:', error);
      setError('Failed to submit request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async (id: string) => {
    if (!confirm('Are you sure you want to cancel this request?')) return;

    try {
      const res = await fetch(`/api/cleaner/time-off/${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        fetchRequests();
        alert('Request cancelled successfully');
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to cancel request');
      }
    } catch (error) {
      console.error('Failed to cancel request:', error);
      alert('Failed to cancel request');
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
    const typeConfig = TIME_OFF_TYPES.find((t) => t.value === type);
    return typeConfig ? `${typeConfig.icon} ${typeConfig.label}` : type;
  };

  const getDaysCount = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  };

  // Set minimum date to today
  const today = new Date().toISOString().split('T')[0];

  if (loading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <span className="ml-2">Loading time off requests...</span>
        </div>
      </div>
    );
  }

  const pendingRequests = requests.filter((r) => r.status === 'PENDING');
  const otherRequests = requests.filter((r) => r.status !== 'PENDING');

  return (
    <div className="p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Time Off Requests</h1>
          <p className="text-gray-600">
            Request vacation, sick leave, or personal days
          </p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Request Time Off
        </Button>
      </div>

      {/* Request Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-lg mx-4 p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">Request Time Off</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowForm(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <form onSubmit={handleSubmit}>
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {error}
                </div>
              )}

              {/* Type Selection */}
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">
                  Type of Time Off
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {TIME_OFF_TYPES.map((type) => (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() =>
                        setFormData({ ...formData, type: type.value })
                      }
                      className={`p-3 border rounded-lg text-left transition-all ${
                        formData.type === type.value
                          ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <span className="text-lg mr-2">{type.icon}</span>
                      <span className="text-sm font-medium">{type.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Date Selection */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={formData.startDate}
                    min={today}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        startDate: e.target.value,
                        endDate:
                          e.target.value > formData.endDate
                            ? e.target.value
                            : formData.endDate,
                      })
                    }
                    className="w-full border rounded-lg px-3 py-2"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={formData.endDate}
                    min={formData.startDate || today}
                    onChange={(e) =>
                      setFormData({ ...formData, endDate: e.target.value })
                    }
                    className="w-full border rounded-lg px-3 py-2"
                    required
                  />
                </div>
              </div>

              {/* Duration Preview */}
              {formData.startDate && formData.endDate && (
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center text-blue-800">
                    <CalendarDays className="h-4 w-4 mr-2" />
                    <span className="text-sm">
                      <strong>
                        {getDaysCount(formData.startDate, formData.endDate)} day
                        {getDaysCount(formData.startDate, formData.endDate) > 1
                          ? 's'
                          : ''}
                      </strong>{' '}
                      off requested
                    </span>
                  </div>
                </div>
              )}

              {/* Reason */}
              <div className="mb-6">
                <label className="block text-sm font-medium mb-2">
                  Reason / Notes{' '}
                  <span className="text-gray-400">(optional)</span>
                </label>
                <textarea
                  value={formData.reason}
                  onChange={(e) =>
                    setFormData({ ...formData, reason: e.target.value })
                  }
                  className="w-full border rounded-lg px-3 py-2"
                  rows={3}
                  placeholder="Add any details your manager should know..."
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowForm(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={submitting || !formData.startDate || !formData.endDate}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Calendar className="h-4 w-4 mr-2" />
                      Submit Request
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold text-yellow-600">
            {pendingRequests.length}
          </div>
          <div className="text-sm text-gray-600">Pending</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold text-green-600">
            {requests.filter((r) => r.status === 'APPROVED').length}
          </div>
          <div className="text-sm text-gray-600">Approved</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold text-red-600">
            {requests.filter((r) => r.status === 'DENIED').length}
          </div>
          <div className="text-sm text-gray-600">Denied</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">
            {requests.filter((r) => r.status === 'APPROVED').reduce((total, r) => {
              return total + getDaysCount(r.startDate, r.endDate);
            }, 0)}
          </div>
          <div className="text-sm text-gray-600">Days Approved</div>
        </Card>
      </div>

      {/* Pending Requests */}
      {pendingRequests.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4 flex items-center">
            <Clock className="h-5 w-5 mr-2 text-yellow-600" />
            Pending Requests
          </h2>
          <div className="space-y-4">
            {pendingRequests.map((request) => (
              <Card key={request.id} className="p-6 border-l-4 border-yellow-500">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-lg font-semibold">
                        {getTypeLabel(request.type)}
                      </span>
                      <Badge className={STATUS_CONFIG.PENDING.color}>
                        {STATUS_CONFIG.PENDING.label}
                      </Badge>
                    </div>
                    <div className="text-gray-600 mb-2">
                      <CalendarDays className="h-4 w-4 inline mr-1" />
                      {formatDate(request.startDate)}
                      {request.startDate !== request.endDate && (
                        <> - {formatDate(request.endDate)}</>
                      )}
                      <span className="ml-2 text-sm">
                        ({getDaysCount(request.startDate, request.endDate)} day
                        {getDaysCount(request.startDate, request.endDate) > 1
                          ? 's'
                          : ''}
                        )
                      </span>
                    </div>
                    {request.reason && (
                      <p className="text-sm text-gray-500">{request.reason}</p>
                    )}
                    {request.conflictedBookingIds.length > 0 && (
                      <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <div className="flex items-center text-yellow-800 text-sm">
                          <AlertTriangle className="h-4 w-4 mr-1" />
                          {request.conflictedBookingIds.length} scheduled job
                          {request.conflictedBookingIds.length > 1 ? 's' : ''}{' '}
                          may be affected
                        </div>
                      </div>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCancel(request.id)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <X className="h-4 w-4 mr-1" />
                    Cancel
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Other Requests */}
      {otherRequests.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-4">Request History</h2>
          <div className="space-y-4">
            {otherRequests.map((request) => {
              const statusConfig = STATUS_CONFIG[request.status];
              const StatusIcon = statusConfig.icon;

              return (
                <Card
                  key={request.id}
                  className={`p-6 ${
                    request.status === 'DENIED' || request.status === 'CANCELLED'
                      ? 'opacity-60'
                      : ''
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-lg font-semibold">
                          {getTypeLabel(request.type)}
                        </span>
                        <Badge className={statusConfig.color}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {statusConfig.label}
                        </Badge>
                      </div>
                      <div className="text-gray-600 mb-2">
                        <CalendarDays className="h-4 w-4 inline mr-1" />
                        {formatDate(request.startDate)}
                        {request.startDate !== request.endDate && (
                          <> - {formatDate(request.endDate)}</>
                        )}
                        <span className="ml-2 text-sm">
                          ({getDaysCount(request.startDate, request.endDate)} day
                          {getDaysCount(request.startDate, request.endDate) > 1
                            ? 's'
                            : ''}
                          )
                        </span>
                      </div>
                      {request.reason && (
                        <p className="text-sm text-gray-500 mb-2">
                          {request.reason}
                        </p>
                      )}
                      {request.reviewNotes && (
                        <div
                          className={`mt-2 p-2 rounded-lg text-sm ${
                            request.status === 'APPROVED'
                              ? 'bg-green-50 text-green-800'
                              : 'bg-red-50 text-red-800'
                          }`}
                        >
                          <strong>Admin note:</strong> {request.reviewNotes}
                        </div>
                      )}
                    </div>
                    <div className="text-xs text-gray-400">
                      Submitted {formatDate(request.createdAt)}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty State */}
      {requests.length === 0 && (
        <Card className="p-12 text-center">
          <CalendarDays className="h-16 w-16 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-semibold text-gray-700 mb-2">
            No Time Off Requests
          </h3>
          <p className="text-gray-500 mb-4">
            Need a day off? Submit a request and your admin will review it.
          </p>
          <Button onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Request Time Off
          </Button>
        </Card>
      )}

      {/* Help Text */}
      <Card className="p-4 mt-6 bg-blue-50 border-blue-200">
        <p className="text-sm text-gray-700">
          <strong>How it works:</strong> Submit your time off request and your
          admin will review it. You&apos;ll receive a notification once
          it&apos;s approved or denied. Approved time off will automatically
          appear on your schedule.
        </p>
      </Card>
    </div>
  );
}

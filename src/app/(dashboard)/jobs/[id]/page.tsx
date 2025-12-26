'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  MapPin,
  Clock,
  DollarSign,
  Calendar,
  Trash2,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { formatDateTime, formatCurrency } from '@/lib/utils';
import type { BookingWithRelations } from '@/types';

export default function JobDetailPage() {
  const router = useRouter();
  const params = useParams();
  const jobId = params.id as string;

  const [job, setJob] = useState<BookingWithRelations | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchJob();
  }, [jobId]);

  const fetchJob = async () => {
    try {
      const response = await fetch(`/api/bookings/${jobId}`);
      const data = await response.json();

      if (data.success) {
        setJob(data.data);
      } else {
        router.push('/jobs');
      }
    } catch (error) {
      console.error('Failed to fetch job:', error);
      router.push('/jobs');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!job) return;

    setUpdating(true);
    try {
      const response = await fetch(`/api/bookings/${jobId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await response.json();

      if (data.success) {
        setJob(data.data);
      } else {
        alert(data.error || 'Failed to update status');
      }
    } catch (error) {
      alert('An error occurred. Please try again.');
    } finally {
      setUpdating(false);
    }
  };

  const handleMarkPaid = async () => {
    if (!job) return;

    setUpdating(true);
    try {
      const response = await fetch('/api/payments/mark-paid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId: jobId }),
      });

      const data = await response.json();

      if (data.success) {
        setJob(data.data);
      } else {
        alert(data.error || 'Failed to mark as paid');
      }
    } catch (error) {
      alert('An error occurred. Please try again.');
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this job?')) {
      return;
    }

    setDeleting(true);
    try {
      const response = await fetch(`/api/bookings/${jobId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        router.push('/jobs');
      } else {
        alert(data.error || 'Failed to delete job');
      }
    } catch (error) {
      alert('An error occurred. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SCHEDULED':
        return 'bg-blue-100 text-blue-700';
      case 'COMPLETED':
        return 'bg-green-100 text-green-700';
      case 'CANCELLED':
        return 'bg-gray-100 text-gray-700';
      case 'NO_SHOW':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  if (loading) {
    return <div className="p-4 text-center">Loading...</div>;
  }

  if (!job) {
    return null;
  }

  return (
    <div className="p-4 max-w-4xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Job Details</h1>
            <p className="text-sm text-gray-500">ID: {job.id.slice(0, 8)}</p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleDelete}
          disabled={deleting}
          className="text-red-600 hover:text-red-700"
        >
          <Trash2 className="h-4 w-4 mr-1" />
          {deleting ? 'Deleting...' : 'Delete'}
        </Button>
      </div>

      <Card className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <Link
              href={`/clients/${job.client.id}`}
              className="text-xl font-semibold hover:underline"
            >
              {job.client.name}
            </Link>
            {job.client.phone && (
              <p className="text-sm text-gray-600">
                <a href={`tel:${job.client.phone}`} className="hover:underline">
                  {job.client.phone}
                </a>
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-sm px-3 py-1 rounded-full ${getStatusColor(job.status)}`}>
              {job.status}
            </span>
            {job.isRecurring && (
              <span className="text-sm px-3 py-1 bg-purple-100 text-purple-700 rounded-full">
                Recurring {job.recurrenceFrequency}
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t">
          <div className="flex items-start gap-3">
            <Calendar className="h-5 w-5 text-gray-400 mt-0.5" />
            <div>
              <div className="text-sm font-medium text-gray-500">Date & Time</div>
              <div className="text-sm">{formatDateTime(job.scheduledDate)}</div>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Clock className="h-5 w-5 text-gray-400 mt-0.5" />
            <div>
              <div className="text-sm font-medium text-gray-500">Duration</div>
              <div className="text-sm">{job.duration} minutes</div>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <MapPin className="h-5 w-5 text-gray-400 mt-0.5" />
            <div>
              <div className="text-sm font-medium text-gray-500">Address</div>
              <div className="text-sm">
                {job.address.street}
                {job.address.unit && `, ${job.address.unit}`}
                <br />
                {job.address.city}, {job.address.state} {job.address.zip}
              </div>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <DollarSign className="h-5 w-5 text-gray-400 mt-0.5" />
            <div>
              <div className="text-sm font-medium text-gray-500">Price</div>
              <div className="text-lg font-bold">{formatCurrency(job.price)}</div>
              {job.isPaid ? (
                <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full">
                  Paid
                </span>
              ) : (
                <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full">
                  Unpaid
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="pt-2 border-t">
          <div className="text-sm font-medium text-gray-500 mb-1">Service Type</div>
          <div className="text-sm">{job.serviceType.replace('_', ' ')}</div>
        </div>

        {job.notes && (
          <div className="pt-2 border-t">
            <div className="text-sm font-medium text-gray-500 mb-1">Notes</div>
            <p className="text-sm text-gray-600 whitespace-pre-wrap">{job.notes}</p>
          </div>
        )}
      </Card>

      <Card className="p-4 space-y-4">
        <h2 className="font-semibold text-lg">Actions</h2>

        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Update Status
            </label>
            <div className="flex gap-2">
              <Button
                onClick={() => handleStatusChange('COMPLETED')}
                disabled={updating || job.status === 'COMPLETED'}
                size="sm"
                className="flex-1"
              >
                <CheckCircle className="h-4 w-4 mr-1" />
                Mark Completed
              </Button>
              <Button
                onClick={() => handleStatusChange('CANCELLED')}
                disabled={updating || job.status === 'CANCELLED'}
                variant="outline"
                size="sm"
                className="flex-1"
              >
                <XCircle className="h-4 w-4 mr-1" />
                Cancel
              </Button>
            </div>
          </div>

          {!job.isPaid && job.status === 'COMPLETED' && (
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Payment
              </label>
              <Button
                onClick={handleMarkPaid}
                disabled={updating}
                size="sm"
                className="w-full"
              >
                <DollarSign className="h-4 w-4 mr-1" />
                Mark as Paid
              </Button>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

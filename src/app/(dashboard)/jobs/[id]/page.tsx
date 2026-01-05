'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
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
  FileText,
  Share2,
  Copy,
  Check,
  Star,
  Edit,
  Save,
  X,
  Navigation,
  LogIn,
  LogOut,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { formatDateTime, formatCurrency } from '@/lib/utils';
import type { BookingWithRelations } from '@/types';
import { ReviewModal } from '@/components/reviews/ReviewModal';
import { ReviewDisplay } from '@/components/reviews/ReviewDisplay';

export default function JobDetailPage() {
  const router = useRouter();
  const params = useParams();
  const jobId = params.id as string;
  const { data: session } = useSession();

  const [job, setJob] = useState<BookingWithRelations | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [generatingInvoice, setGeneratingInvoice] = useState(false);
  const [hasInvoice, setHasInvoice] = useState(false);
  const [estimateUrl, setEstimateUrl] = useState<string>('');
  const [showEstimateModal, setShowEstimateModal] = useState(false);
  const [generatingEstimate, setGeneratingEstimate] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviews, setReviews] = useState<any[]>([]);
  const [insuranceDocumentation, setInsuranceDocumentation] = useState('');
  const [cleaningObservations, setCleaningObservations] = useState('');
  const [savingDocumentation, setSavingDocumentation] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    scheduledDate: '',
    duration: '',
    serviceType: '',
    price: '',
    notes: '',
    assignedTo: '',
  });
  const [processingAction, setProcessingAction] = useState(false);
  const [cleaners, setCleaners] = useState<any[]>([]);

  useEffect(() => {
    fetchJob();
    checkInvoice();
    fetchReviews();
    fetchCleaners();
  }, [jobId]);

  const fetchJob = async () => {
    try {
      const response = await fetch(`/api/bookings/${jobId}`);
      const data = await response.json();

      if (data.success) {
        setJob(data.data);
        setInsuranceDocumentation(data.data.insuranceDocumentation || '');
        setCleaningObservations(data.data.cleaningObservations || '');

        // Populate edit form
        const scheduledDate = new Date(data.data.scheduledDate);
        const formattedDate = scheduledDate.toISOString().slice(0, 16); // YYYY-MM-DDTHH:mm
        setEditForm({
          scheduledDate: formattedDate,
          duration: data.data.duration.toString(),
          serviceType: data.data.serviceType,
          price: data.data.price.toString(),
          notes: data.data.notes || '',
          assignedTo: data.data.assignedTo || '',
        });
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

  const checkInvoice = async () => {
    try {
      const response = await fetch(`/api/invoices?bookingId=${jobId}`);
      const data = await response.json();

      if (data.success && data.data.length > 0) {
        setHasInvoice(true);
      }
    } catch (error) {
      console.error('Failed to check invoice:', error);
    }
  };

  const fetchReviews = async () => {
    try {
      const response = await fetch(`/api/bookings/${jobId}/review`);
      const data = await response.json();

      if (data.success) {
        setReviews(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch reviews:', error);
    }
  };

  const fetchCleaners = async () => {
    try {
      const response = await fetch('/api/team/members');
      const data = await response.json();

      if (data.success) {
        // Filter only active cleaners
        const activeCleaners = data.data.filter(
          (member: any) => member.isActive && member.user.role === 'CLEANER'
        );
        setCleaners(activeCleaners);
      }
    } catch (error) {
      console.error('Failed to fetch cleaners:', error);
    }
  };

  const handleGenerateInvoice = async () => {
    setGeneratingInvoice(true);
    try {
      const response = await fetch('/api/invoices/from-booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId: jobId }),
      });

      const data = await response.json();

      if (data.success) {
        alert('Invoice generated successfully!');
        setHasInvoice(true);
        router.push(`/invoices`);
      } else {
        alert(data.error || 'Failed to generate invoice');
      }
    } catch (error) {
      alert('An error occurred. Please try again.');
    } finally {
      setGeneratingInvoice(false);
    }
  };

  const handleGenerateEstimate = async () => {
    setGeneratingEstimate(true);
    try {
      const response = await fetch(`/api/bookings/${jobId}/generate-estimate`, {
        method: 'POST',
      });

      const data = await response.json();

      if (data.success) {
        setEstimateUrl(data.data.url);
        setShowEstimateModal(true);
      } else {
        alert(data.error || 'Failed to generate estimate link');
      }
    } catch (error) {
      alert('An error occurred. Please try again.');
    } finally {
      setGeneratingEstimate(false);
    }
  };

  const handleCopyEstimateLink = async () => {
    try {
      await navigator.clipboard.writeText(estimateUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      alert('Failed to copy link');
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

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEditForm(prev => ({ ...prev, [name]: value }));
  };

  const handleStartEdit = () => {
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    if (!job) return;

    // Reset form to current job values
    const scheduledDate = new Date(job.scheduledDate);
    const formattedDate = scheduledDate.toISOString().slice(0, 16);
    setEditForm({
      scheduledDate: formattedDate,
      duration: job.duration.toString(),
      serviceType: job.serviceType,
      price: job.price.toString(),
      notes: job.notes || '',
      assignedTo: job.assignedTo || '',
    });
    setIsEditing(false);
  };

  const handleSaveEdit = async () => {
    setUpdating(true);
    try {
      const response = await fetch(`/api/bookings/${jobId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scheduledDate: new Date(editForm.scheduledDate),
          duration: parseInt(editForm.duration),
          serviceType: editForm.serviceType,
          price: parseFloat(editForm.price),
          notes: editForm.notes,
          assignedTo: editForm.assignedTo || null,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setJob(data.data);
        setIsEditing(false);
        alert('Job updated successfully!');
      } else {
        alert(data.error || 'Failed to update job');
      }
    } catch (error) {
      alert('An error occurred. Please try again.');
    } finally {
      setUpdating(false);
    }
  };

  const handleSaveDocumentation = async () => {
    setSavingDocumentation(true);
    try {
      const response = await fetch(`/api/bookings/${jobId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          insuranceDocumentation,
          cleaningObservations,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setJob(data.data);
        alert('Documentation saved successfully!');
      } else {
        alert(data.error || 'Failed to save documentation');
      }
    } catch (error) {
      alert('An error occurred. Please try again.');
    } finally {
      setSavingDocumentation(false);
    }
  };

  const handleCleanerAction = async (action: 'on_my_way' | 'clock_in' | 'clock_out') => {
    setProcessingAction(true);
    try {
      const response = await fetch(`/api/bookings/${jobId}/cleaner-actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });

      const data = await response.json();

      if (data.success) {
        setJob(data.data);
        alert(data.message);
      } else {
        alert(data.error || 'Failed to process action');
      }
    } catch (error) {
      alert('An error occurred. Please try again.');
    } finally {
      setProcessingAction(false);
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
        <div className="flex gap-2">
          {!isEditing && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleStartEdit}
            >
              <Edit className="h-4 w-4 mr-1" />
              Edit
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleDelete}
            disabled={deleting || isEditing}
            className="text-red-600 hover:text-red-700"
          >
            <Trash2 className="h-4 w-4 mr-1" />
            {deleting ? 'Deleting...' : 'Delete'}
          </Button>
        </div>
      </div>

      <Card className="p-4 space-y-4">
        {isEditing ? (
          /* Edit Mode */
          <div className="space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Edit className="h-5 w-5" />
              Edit Job
            </h2>

            <div className="space-y-4">
              <div>
                <label htmlFor="scheduledDate" className="block text-sm font-medium text-gray-700 mb-1">
                  Date & Time *
                </label>
                <input
                  type="datetime-local"
                  id="scheduledDate"
                  name="scheduledDate"
                  value={editForm.scheduledDate}
                  onChange={handleEditChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="duration" className="block text-sm font-medium text-gray-700 mb-1">
                    Duration (minutes) *
                  </label>
                  <input
                    type="number"
                    id="duration"
                    name="duration"
                    value={editForm.duration}
                    onChange={handleEditChange}
                    min="15"
                    step="15"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-1">
                    Price ($) *
                  </label>
                  <input
                    type="number"
                    id="price"
                    name="price"
                    value={editForm.price}
                    onChange={handleEditChange}
                    min="0"
                    step="0.01"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label htmlFor="serviceType" className="block text-sm font-medium text-gray-700 mb-1">
                  Service Type *
                </label>
                <select
                  id="serviceType"
                  name="serviceType"
                  value={editForm.serviceType}
                  onChange={handleEditChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="STANDARD">Standard Clean</option>
                  <option value="DEEP">Deep Clean</option>
                  <option value="MOVE_OUT">Move Out Clean</option>
                </select>
              </div>

              <div>
                <label htmlFor="assignedTo" className="block text-sm font-medium text-gray-700 mb-1">
                  Assigned Cleaner
                </label>
                <select
                  id="assignedTo"
                  name="assignedTo"
                  value={editForm.assignedTo}
                  onChange={handleEditChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Not Assigned</option>
                  {cleaners.map((cleaner) => (
                    <option key={cleaner.id} value={cleaner.id}>
                      {cleaner.user.name || cleaner.user.email}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  id="notes"
                  name="notes"
                  value={editForm.notes}
                  onChange={handleEditChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Add any special notes or instructions..."
                />
              </div>
            </div>

            <div className="flex gap-3 pt-4 border-t">
              <Button
                onClick={handleSaveEdit}
                disabled={updating}
                className="flex-1"
              >
                <Save className="h-4 w-4 mr-2" />
                {updating ? 'Saving...' : 'Save Changes'}
              </Button>
              <Button
                variant="outline"
                onClick={handleCancelEdit}
                disabled={updating}
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          /* View Mode */
          <>
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
          </>
        )}
      </Card>

      {/* Insurance Documentation - Only show if client has insurance */}
      {job.client.hasInsurance && (
        <Card className="p-6 space-y-4 bg-blue-50 dark:bg-blue-950/30 border-2 border-blue-300 dark:border-blue-700">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-full text-sm font-bold">
              <FileText className="h-4 w-4" />
              ✓ INSURANCE
            </span>
            <h2 className="font-bold text-xl text-blue-900 dark:text-blue-100">
              Insurance Documentation
            </h2>
          </div>
          <p className="text-sm text-blue-800 dark:text-blue-200 font-medium">
            📋 Document cleaning details and observations for insurance billing and records.
          </p>

          <div className="space-y-4">
            <div>
              <label htmlFor="insuranceDocumentation" className="block text-sm font-medium text-gray-700 mb-2">
                Insurance Documentation
              </label>
              <textarea
                id="insuranceDocumentation"
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Document cleaning details, areas serviced, time spent, etc. for insurance billing..."
                value={insuranceDocumentation}
                onChange={(e) => setInsuranceDocumentation(e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="cleaningObservations" className="block text-sm font-medium text-gray-700 mb-2">
                Observations & Notes
              </label>
              <textarea
                id="cleaningObservations"
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Note any observations, issues found, client feedback, or special considerations..."
                value={cleaningObservations}
                onChange={(e) => setCleaningObservations(e.target.value)}
              />
            </div>

            <Button
              onClick={handleSaveDocumentation}
              disabled={savingDocumentation}
              className="w-full"
            >
              {savingDocumentation ? 'Saving...' : 'Save Documentation'}
            </Button>
          </div>
        </Card>
      )}

      {/* Cleaner Workflow - Only show for assigned cleaner on day of cleaning */}
      {session?.user && job.assignee && job.assignee.userId === session.user.id && (
        <Card className="p-4 space-y-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <h2 className="font-semibold text-lg flex items-center gap-2">
            <Clock className="h-5 w-5 text-blue-600" />
            Today's Workflow
          </h2>

          <div className="space-y-3">
            {/* On My Way Button */}
            {!job.onMyWaySentAt && (
              <div>
                <Button
                  onClick={() => handleCleanerAction('on_my_way')}
                  disabled={processingAction}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                  size="lg"
                >
                  <Navigation className="h-5 w-5 mr-2" />
                  {processingAction ? 'Sending...' : "I'm On My Way"}
                </Button>
                <p className="text-xs text-gray-600 mt-1 text-center">
                  Notify customer that you're heading to their location
                </p>
              </div>
            )}
            {job.onMyWaySentAt && (
              <div className="flex items-center gap-2 p-3 bg-white rounded-md border border-green-200">
                <Check className="h-5 w-5 text-green-600" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-green-700">On My Way Sent</p>
                  <p className="text-xs text-gray-600">
                    {new Date(job.onMyWaySentAt).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            )}

            {/* Clock In Button */}
            {!job.clockedInAt && (
              <div>
                <Button
                  onClick={() => handleCleanerAction('clock_in')}
                  disabled={processingAction || !job.onMyWaySentAt}
                  className="w-full bg-green-600 hover:bg-green-700"
                  size="lg"
                >
                  <LogIn className="h-5 w-5 mr-2" />
                  {processingAction ? 'Clocking In...' : 'Clock In - Start Job'}
                </Button>
                <p className="text-xs text-gray-600 mt-1 text-center">
                  {!job.onMyWaySentAt ? 'Click "On My Way" first' : 'Mark when you arrive and start cleaning'}
                </p>
              </div>
            )}
            {job.clockedInAt && !job.clockedOutAt && (
              <div className="flex items-center gap-2 p-3 bg-white rounded-md border border-blue-200">
                <Clock className="h-5 w-5 text-blue-600 animate-pulse" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-blue-700">Job In Progress</p>
                  <p className="text-xs text-gray-600">
                    Started at {new Date(job.clockedInAt).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            )}

            {/* Clock Out Button */}
            {job.clockedInAt && !job.clockedOutAt && (
              <div>
                <Button
                  onClick={() => handleCleanerAction('clock_out')}
                  disabled={processingAction}
                  className="w-full bg-purple-600 hover:bg-purple-700"
                  size="lg"
                >
                  <LogOut className="h-5 w-5 mr-2" />
                  {processingAction ? 'Clocking Out...' : 'Clock Out - Job Complete'}
                </Button>
                <p className="text-xs text-gray-600 mt-1 text-center">
                  Mark job as finished and log completion time
                </p>
              </div>
            )}
            {job.clockedOutAt && (
              <div className="flex items-center gap-2 p-3 bg-white rounded-md border border-purple-200">
                <CheckCircle className="h-5 w-5 text-purple-600" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-purple-700">Job Completed</p>
                  <p className="text-xs text-gray-600">
                    Finished at {new Date(job.clockedOutAt).toLocaleTimeString()}
                  </p>
                  {job.clockedInAt && (
                    <p className="text-xs text-gray-500">
                      Duration: {Math.round((new Date(job.clockedOutAt).getTime() - new Date(job.clockedInAt).getTime()) / 60000)} minutes
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </Card>
      )}

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

          {job.status === 'COMPLETED' && (
            <>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Invoice
                </label>
                {hasInvoice ? (
                  <Button
                    onClick={() => router.push('/invoices')}
                    variant="outline"
                    size="sm"
                    className="w-full"
                  >
                    <FileText className="h-4 w-4 mr-1" />
                    View Invoice
                  </Button>
                ) : (
                  <Button
                    onClick={handleGenerateInvoice}
                    disabled={generatingInvoice}
                    size="sm"
                    className="w-full"
                  >
                    <FileText className="h-4 w-4 mr-1" />
                    {generatingInvoice ? 'Generating...' : 'Generate Invoice'}
                  </Button>
                )}
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Cleaning Review
                </label>
                <Button
                  onClick={() => setShowReviewModal(true)}
                  variant="outline"
                  size="sm"
                  className="w-full"
                >
                  <Star className="h-4 w-4 mr-1" />
                  {reviews.length > 0 ? 'Add Another Review' : 'Add Review'}
                </Button>
                <p className="text-xs text-gray-500 mt-1">
                  Rate house condition, customer, tip & overall experience
                </p>
              </div>
            </>
          )}

          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Share Estimate
            </label>
            <Button
              onClick={handleGenerateEstimate}
              disabled={generatingEstimate}
              variant="outline"
              size="sm"
              className="w-full"
            >
              <Share2 className="h-4 w-4 mr-1" />
              {generatingEstimate ? 'Generating...' : 'Generate Estimate Link'}
            </Button>
            <p className="text-xs text-gray-500 mt-1">
              Share this link with customers to accept the estimate
            </p>
          </div>
        </div>
      </Card>

      {/* Estimate Link Modal */}
      {showEstimateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="p-6 max-w-lg w-full">
            <div className="mb-4">
              <h2 className="text-2xl font-bold mb-2">Estimate Link Generated</h2>
              <p className="text-gray-600">
                Share this link with your customer to view and accept the estimate
              </p>
            </div>

            <div className="mb-4">
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Shareable Link
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={estimateUrl}
                  readOnly
                  className="flex-1 border rounded-lg px-3 py-2 bg-gray-50 text-sm"
                  onClick={(e) => e.currentTarget.select()}
                />
                <Button
                  onClick={handleCopyEstimateLink}
                  size="sm"
                  variant={copied ? 'default' : 'outline'}
                >
                  {copied ? (
                    <>
                      <Check className="h-4 w-4 mr-1" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 mr-1" />
                      Copy
                    </>
                  )}
                </Button>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-blue-800">
                <strong>What happens next:</strong>
                <br />
                1. Customer clicks the link and views the estimate
                <br />
                2. Customer can accept the estimate (optionally creating an account)
                <br />
                3. You'll see the estimate status updated in this job
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={() => setShowEstimateModal(false)}
                variant="outline"
                className="flex-1"
              >
                Close
              </Button>
              <Button
                onClick={() => {
                  handleCopyEstimateLink();
                  setShowEstimateModal(false);
                }}
                className="flex-1"
              >
                Copy & Close
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Review Modal */}
      {showReviewModal && job && (
        <ReviewModal
          bookingId={job.id}
          clientName={job.client.name}
          onClose={() => setShowReviewModal(false)}
          onSuccess={() => {
            fetchReviews();
            fetchJob();
          }}
        />
      )}

      {/* Display Reviews */}
      {reviews.length > 0 && (
        <div className="mt-6">
          <ReviewDisplay reviews={reviews} />
        </div>
      )}
    </div>
  );
}

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
  CreditCard,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { formatDateTime, formatCurrency, formatDuration } from '@/lib/utils';
import type { BookingWithRelations } from '@/types';
import { ReviewModal } from '@/components/reviews/ReviewModal';
import { ReviewDisplay } from '@/components/reviews/ReviewDisplay';

export default function JobDetailPage() {
  const router = useRouter();
  const params = useParams();
  const jobId = params.id as string;

  // Generate a fun, readable job ID from the hash
  const getFriendlyJobId = (id: string) => {
    // Convert first 6 chars of ID to a number for readability
    const hash = id.slice(0, 6);
    let num = 0;
    for (let i = 0; i < hash.length; i++) {
      num = num * 36 + parseInt(hash[i], 36);
    }
    // Keep it to 4-6 digits
    const shortNum = Math.abs(num) % 100000;
    return `JOB-${shortNum.toString().padStart(5, '0')}`;
  };
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
  const [sendingFeedback, setSendingFeedback] = useState(false);
  const [creatingPaymentLink, setCreatingPaymentLink] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<string>('stripe');
  const [copayPaymentMethod, setCopayPaymentMethod] = useState<string>('STRIPE');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [operationalExpenses, setOperationalExpenses] = useState<{
    insuranceCost: number;
    bondCost: number;
    workersCompCost: number;
    cleaningSuppliesCost: number;
    gasReimbursementRate: number;
    vaAdminSalary: number;
    ownerSalary: number;
    otherExpenses: number;
  } | null>(null);
  const [monthlyJobCount, setMonthlyJobCount] = useState<number>(0);

  useEffect(() => {
    fetchJob();
    checkInvoice();
    fetchReviews();
    fetchCleaners();
    if ((session?.user as any)?.role === 'OWNER') {
      fetchOperationalExpenses();
      fetchMonthlyJobCount();
    }
  }, [jobId, session]);

  const fetchJob = async () => {
    try {
      const response = await fetch(`/api/bookings/${jobId}`);
      const data = await response.json();

      if (data.success) {
        console.log('🔵 JOB DETAIL - Full job data:', data.data);
        console.log('🔵 JOB DETAIL - Client data:', data.data.client);
        console.log('🔵 JOB DETAIL - Client hasInsurance:', data.data.client?.hasInsurance);
        console.log('🔵 JOB DETAIL - Insurance documentation:', data.data.insuranceDocumentation);
        console.log('🔵 JOB DETAIL - Cleaning observations:', data.data.cleaningObservations);

        // Add backward-compatible fields
        const jobData = {
          ...data.data,
          price: data.data.price ?? data.data.finalPrice ?? 0,
          notes: data.data.notes ?? data.data.customerNotes ?? '',
          assignee: data.data.assignee ?? data.data.assignedCleaner,
          assignedTo: data.data.assignedTo ?? data.data.assignedCleanerId ?? '',
          onMyWaySentAt: data.data.onMyWaySentAt ?? data.data.onMyWayAt,
          feedbackLinkSentAt: data.data.feedbackLinkSentAt ?? data.data.feedbackSentAt,
          hasInsuranceCoverage: data.data.hasInsuranceCoverage ?? data.data.hasInsurance,
          finalCopayAmount: data.data.finalCopayAmount ?? data.data.copayAmount ?? 0,
          client: {
            ...data.data.client,
            name: data.data.client?.name ?? `${data.data.client?.firstName || ''} ${data.data.client?.lastName || ''}`.trim(),
            stripePaymentMethodId: data.data.client?.stripePaymentMethodId ?? data.data.client?.defaultPaymentMethodId,
          },
        };

        setJob(jobData);
        setInsuranceDocumentation(data.data.insuranceDocumentation || '');
        setCleaningObservations(data.data.cleaningObservations || '');

        // Populate edit form
        const scheduledDate = new Date(data.data.scheduledDate);
        // Convert to local datetime string for datetime-local input
        // datetime-local expects YYYY-MM-DDTHH:mm in LOCAL timezone
        const year = scheduledDate.getFullYear();
        const month = String(scheduledDate.getMonth() + 1).padStart(2, '0');
        const day = String(scheduledDate.getDate()).padStart(2, '0');
        const hours = String(scheduledDate.getHours()).padStart(2, '0');
        const minutes = String(scheduledDate.getMinutes()).padStart(2, '0');
        const formattedDate = `${year}-${month}-${day}T${hours}:${minutes}`;

        setEditForm({
          scheduledDate: formattedDate,
          duration: data.data.duration.toString(),
          serviceType: data.data.serviceType,
          price: (jobData.price ?? 0).toString(),
          notes: jobData.notes || '',
          assignedTo: jobData.assignedTo || '',
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

  const fetchOperationalExpenses = async () => {
    try {
      const response = await fetch('/api/company/operations');
      const data = await response.json();

      if (data.success) {
        setOperationalExpenses(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch operational expenses:', error);
    }
  };

  const fetchMonthlyJobCount = async () => {
    try {
      // Get current month's completed jobs count
      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      const response = await fetch(
        `/api/bookings?status=COMPLETED&from=${firstDayOfMonth.toISOString()}&to=${lastDayOfMonth.toISOString()}`
      );
      const data = await response.json();

      if (data.success) {
        setMonthlyJobCount(data.data.length);
      }
    } catch (error) {
      console.error('Failed to fetch monthly job count:', error);
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

  const handleSendFeedbackLink = async () => {
    setSendingFeedback(true);
    try {
      const response = await fetch(`/api/bookings/${jobId}/send-feedback-link`, {
        method: 'POST',
      });

      const data = await response.json();

      if (data.success) {
        alert(`Feedback link sent successfully via ${data.sentVia.join(' and ')}!${data.errors ? '\n\nPartial errors: ' + data.errors.join(', ') : ''}`);
        fetchJob(); // Refresh job data to show feedbackLinkSentAt
      } else {
        alert(data.error || 'Failed to send feedback link');
      }
    } catch (error) {
      alert('An error occurred. Please try again.');
    } finally {
      setSendingFeedback(false);
    }
  };

  const handleCreatePaymentLink = async () => {
    setCreatingPaymentLink(true);
    try {
      const response = await fetch('/api/payments/create-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId: jobId }),
      });

      const data = await response.json();

      if (data.success && data.data.paymentLink) {
        // Copy payment link to clipboard
        await navigator.clipboard.writeText(data.data.paymentLink);
        alert(`Payment link created and copied to clipboard!\n\nYou can now share this link with the customer:\n${data.data.paymentLink}`);
        fetchJob(); // Refresh to show updated payment info
      } else {
        alert(data.error || 'Failed to create payment link');
      }
    } catch (error) {
      alert('An error occurred. Please try again.');
    } finally {
      setCreatingPaymentLink(false);
    }
  };

  const handleAutoCharge = async () => {
    if (!confirm('Charge customer\'s saved card on file?')) {
      return;
    }

    setCreatingPaymentLink(true);
    try {
      const response = await fetch('/api/payments/auto-charge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId: jobId }),
      });

      const data = await response.json();

      if (data.success) {
        alert(`✅ Successfully charged $${data.data.amount}!\n\nPayment ID: ${data.data.paymentIntentId}`);
        fetchJob(); // Refresh to show updated payment status
      } else {
        alert(`❌ Failed to charge card:\n\n${data.error}\n\n${data.code ? `Error code: ${data.code}` : ''}`);
      }
    } catch (error) {
      alert('An error occurred. Please try again.');
    } finally {
      setCreatingPaymentLink(false);
    }
  };

  const handleApprove = async () => {
    if (!job) return;

    if (!confirm('Approve this job as completed? This will enable payment options.')) {
      return;
    }

    setUpdating(true);
    try {
      const response = await fetch(`/api/bookings/${jobId}/approve`, {
        method: 'POST',
      });

      const data = await response.json();

      if (data.success) {
        setJob(data.data);
        alert('✅ Job approved! Payment options are now available.');

        // Show payment modal after approval
        if (!data.data.isPaid) {
          setShowPaymentModal(true);
        }
      } else {
        alert(data.error || 'Failed to approve job');
      }
    } catch (error) {
      alert('An error occurred. Please try again.');
    } finally {
      setUpdating(false);
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

        // If marked as completed and unpaid, show payment modal
        if (newStatus === 'COMPLETED' && !data.data.isPaid) {
          setShowPaymentModal(true);
        }
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
        body: JSON.stringify({
          bookingId: jobId,
          paymentMethod: paymentMethod
        }),
      });

      const data = await response.json();

      if (data.success) {
        setJob(data.data);
        alert(`✅ Marked as paid via ${paymentMethod}`);
      } else {
        alert(data.error || 'Failed to mark as paid');
      }
    } catch (error) {
      alert('An error occurred. Please try again.');
    } finally {
      setUpdating(false);
    }
  };

  const handleMarkCopayPaid = async () => {
    if (!job) return;

    setUpdating(true);
    try {
      const response = await fetch(`/api/bookings/${jobId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          copayPaid: true,
          copayPaymentMethod: copayPaymentMethod,
          copayPaidAt: new Date().toISOString(),
        }),
      });

      const data = await response.json();

      if (data.success) {
        setJob(data.data);
        alert(`✅ Copay marked as paid via ${copayPaymentMethod}`);
      } else {
        alert(data.error || 'Failed to mark copay as paid');
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
      price: (job.price ?? job.finalPrice ?? 0).toString(),
      notes: job.notes ?? job.customerNotes ?? '',
      assignedTo: (job as any).assignedTo ?? job.assignedCleanerId ?? '',
    });
    setIsEditing(false);
  };

  const handleSaveEdit = async () => {
    setUpdating(true);
    try {
      // Convert datetime-local string to proper ISO string with timezone
      // datetime-local format: "2026-01-06T10:00"
      // We need to interpret this as local time and convert to ISO
      const localDate = new Date(editForm.scheduledDate);
      const isoString = localDate.toISOString();

      const response = await fetch(`/api/bookings/${jobId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scheduledDate: isoString, // Send as ISO string with timezone
          duration: parseInt(editForm.duration),
          serviceType: editForm.serviceType,
          price: parseFloat(editForm.price),
          notes: editForm.notes,
          assignedTo: editForm.assignedTo ? editForm.assignedTo : null, // Properly handle empty string
        }),
      });

      const data = await response.json();

      if (data.success) {
        setJob(data.data);
        setIsEditing(false);
        alert('Job updated successfully!');
        fetchJob(); // Refresh job data to ensure UI is in sync
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

  const handleDuplicate = () => {
    if (!job) return;

    // Navigate to new job page with current job data as query params
    const params = new URLSearchParams({
      duplicate: 'true',
      clientId: job.clientId,
      addressId: job.addressId,
      serviceType: job.serviceType,
      duration: job.duration.toString(),
      price: (job.price ?? job.finalPrice ?? 0).toString(),
      notes: job.notes ?? job.customerNotes ?? '',
      internalNotes: job.internalNotes ?? '',
      assignedTo: (job as any).assignedTo ?? job.assignedCleanerId ?? '',
      hasInsuranceCoverage: ((job as any).hasInsuranceCoverage ?? job.hasInsurance)?.toString() || 'false',
      insuranceAmount: job.insuranceAmount?.toString() || '0',
      copayAmount: job.copayAmount?.toString() || '0',
    });

    router.push(`/jobs/new?${params.toString()}`);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SCHEDULED':
        return 'bg-blue-100 text-blue-700';
      case 'CLEANER_COMPLETED':
        return 'bg-yellow-100 text-yellow-800';
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
            <p className="text-sm text-gray-500">{getFriendlyJobId(job.id)}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {!isEditing && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleStartEdit}
              >
                <Edit className="h-4 w-4 mr-1" />
                Edit
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDuplicate}
              >
                <Copy className="h-4 w-4 mr-1" />
                Duplicate
              </Button>
            </>
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
              <div className="flex flex-col items-end gap-2">
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
                {job.status === 'COMPLETED' && (job as any).completedByUser && (
                  <p className="text-xs text-gray-500">
                    Completed by {(job as any).completedByUser.name || (job as any).completedByUser.email}
                  </p>
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
                  <div className="text-sm">{formatDuration(job.duration)}</div>
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
                  <div className="text-lg font-bold">{formatCurrency(job.price ?? 0)}</div>
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

            {/* Referral Credits Applied */}
            {(job as any).referralCreditsApplied > 0 && (
              <div className="pt-2 border-t">
                <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">🎁</span>
                    <h3 className="font-semibold text-purple-900">Referral Credits Applied</h3>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Original Price:</span>
                      <span className="font-semibold">{formatCurrency(job.price ?? 0)}</span>
                    </div>
                    <div className="flex justify-between text-green-600">
                      <span>Credits Applied:</span>
                      <span className="font-semibold">-{formatCurrency((job as any).referralCreditsApplied)}</span>
                    </div>
                    <div className="flex justify-between text-base font-bold border-t border-purple-200 pt-2">
                      <span className="text-purple-900">Final Price:</span>
                      <span className="text-purple-700">{formatCurrency((job as any).finalPrice || 0)}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="pt-2 border-t">
              <div className="text-sm font-medium text-gray-500 mb-1">Service Type</div>
              <div className="text-sm">{job.serviceType.replace('_', ' ')}</div>
            </div>

            {job.assignee && (
              <div className="pt-2 border-t">
                <div className="text-sm font-medium text-gray-500 mb-1">Assigned Cleaner</div>
                <div className="text-sm font-semibold text-blue-600">
                  👤 {job.assignee.user.name || job.assignee.user.email}
                </div>
              </div>
            )}

            {job.notes && (
              <div className="pt-2 border-t">
                <div className="text-sm font-medium text-gray-500 mb-1">Notes</div>
                <p className="text-sm text-gray-600 whitespace-pre-wrap">{job.notes}</p>
              </div>
            )}
          </>
        )}
      </Card>

      {/* Financial Breakdown - Admin Only */}
      {(session?.user as any)?.role !== 'CLEANER' && job.assignee && job.assignee.hourlyRate && (
        <Card className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-green-600" />
            Financial Breakdown
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Customer Payment */}
            <div className="p-4 bg-white rounded-lg border border-green-200">
              <div className="text-sm font-medium text-gray-600 mb-1">Customer Pays</div>
              <div className="text-2xl font-bold text-green-700">
                {formatCurrency(job.price ?? 0)}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Total job price
              </div>
            </div>

            {/* Cleaner Wage */}
            <div className="p-4 bg-white rounded-lg border border-blue-200">
              <div className="text-sm font-medium text-gray-600 mb-1">Cleaner Wage</div>
              <div className="text-2xl font-bold text-blue-700">
                {formatCurrency(
                  (job.assignee.hourlyRate * job.duration) / 60
                )}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                ${job.assignee.hourlyRate.toFixed(2)}/hr × {formatDuration(job.duration)}
              </div>
            </div>

            {/* Time Spent */}
            <div className="p-4 bg-white rounded-lg border border-purple-200">
              <div className="text-sm font-medium text-gray-600 mb-1">Time Spent</div>
              <div className="text-2xl font-bold text-purple-700">
                {job.clockedInAt && job.clockedOutAt ? (
                  <>
                    {formatDuration(
                      Math.round(
                        (new Date(job.clockedOutAt).getTime() -
                          new Date(job.clockedInAt).getTime()) /
                          60000
                      )
                    )}
                  </>
                ) : (
                  <>{formatDuration(job.duration)}</>
                )}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {job.clockedInAt && job.clockedOutAt ? (
                  <>Actual (clocked in/out)</>
                ) : (
                  <>Scheduled duration</>
                )}
              </div>
            </div>

            {/* Tips */}
            <div className="p-4 bg-white rounded-lg border border-yellow-200">
              <div className="text-sm font-medium text-gray-600 mb-1">Tips</div>
              <div className="text-2xl font-bold text-yellow-700">
                {job.tipAmount ? formatCurrency(job.tipAmount) : '$0.00'}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {job.tipAmount ? `via ${job.tipPaidVia || 'N/A'}` : 'No tip yet'}
              </div>
            </div>
          </div>

          {/* Profit Analysis - Owner Only */}
          {(session?.user as any)?.role === 'OWNER' && (() => {
            const cleanerWage = ((job.assignee?.hourlyRate ?? 0) * job.duration) / 60;
            const grossProfit = (job.price ?? 0) - cleanerWage;

            // Calculate total monthly operational expenses
            const totalMonthlyExpenses = operationalExpenses
              ? operationalExpenses.insuranceCost +
                operationalExpenses.bondCost +
                operationalExpenses.workersCompCost +
                operationalExpenses.cleaningSuppliesCost +
                operationalExpenses.vaAdminSalary +
                operationalExpenses.ownerSalary +
                operationalExpenses.otherExpenses
              : 0;

            // Calculate allocated operational cost per job
            const allocatedCostPerJob = monthlyJobCount > 0
              ? totalMonthlyExpenses / monthlyJobCount
              : 0;

            // Calculate net profit
            const netProfit = grossProfit - allocatedCostPerJob;

            // Calculate profit margin percentage
            const jobPrice = job.price ?? 0;
            const profitMarginPercent = jobPrice > 0
              ? (netProfit / jobPrice) * 100
              : 0;

            return (
              <div className="mt-4 space-y-3">
                {/* Gross Profit */}
                <div className="p-4 bg-gradient-to-r from-indigo-50 to-blue-50 rounded-lg border-2 border-indigo-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-gray-700">Gross Profit</div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        Customer payment - cleaner wage
                      </div>
                    </div>
                    <div className="text-2xl font-bold text-indigo-700">
                      {formatCurrency(grossProfit)}
                    </div>
                  </div>
                </div>

                {/* Allocated Operational Costs */}
                {operationalExpenses && monthlyJobCount > 0 && (
                  <div className="p-4 bg-gradient-to-r from-orange-50 to-amber-50 rounded-lg border-2 border-orange-200">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-700">Allocated Operational Costs</div>
                        <div className="text-xs text-gray-500 mt-0.5">
                          ${totalMonthlyExpenses.toFixed(2)}/month ÷ {monthlyJobCount} jobs this month
                        </div>
                        <Link
                          href="/settings/operations"
                          className="text-xs text-orange-600 hover:text-orange-700 hover:underline mt-1 inline-block"
                        >
                          View breakdown →
                        </Link>
                      </div>
                      <div className="text-2xl font-bold text-orange-700">
                        {formatCurrency(allocatedCostPerJob)}
                      </div>
                    </div>
                  </div>
                )}

                {/* Net Profit */}
                {operationalExpenses && monthlyJobCount > 0 && (
                  <div className="p-4 bg-gradient-to-r from-emerald-50 to-green-50 rounded-lg border-2 border-emerald-300">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-lg font-bold text-gray-800">Net Profit</div>
                        <div className="text-xs text-gray-600 mt-0.5">
                          Gross profit - allocated operational costs
                        </div>
                        <div className="mt-2 flex items-center gap-2">
                          <span className={`text-sm font-semibold px-2 py-1 rounded ${
                            profitMarginPercent > 0
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {profitMarginPercent > 0 ? '+' : ''}{profitMarginPercent.toFixed(1)}% margin
                          </span>
                        </div>
                      </div>
                      <div className={`text-3xl font-black ${
                        netProfit > 0 ? 'text-green-700' : 'text-red-700'
                      }`}>
                        {formatCurrency(netProfit)}
                      </div>
                    </div>
                  </div>
                )}

                {/* No expenses configured message */}
                {(!operationalExpenses || monthlyJobCount === 0) && (
                  <div className="p-4 bg-yellow-50 border-2 border-yellow-200 rounded-lg">
                    <div className="flex items-start gap-2">
                      <div className="text-yellow-600 text-sm">⚠️</div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-yellow-800">
                          {!operationalExpenses
                            ? 'Operational expenses not configured'
                            : 'No completed jobs this month yet'}
                        </p>
                        <p className="text-xs text-yellow-700 mt-1">
                          {!operationalExpenses
                            ? 'Configure your monthly operational expenses to see true net profit and profit margins.'
                            : 'Operational cost allocation will appear once you have completed jobs this month.'}
                        </p>
                        {!operationalExpenses && (
                          <Link
                            href="/settings/operations"
                            className="text-xs text-yellow-800 hover:text-yellow-900 hover:underline mt-2 inline-block font-medium"
                          >
                            Configure expenses →
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
        </Card>
      )}

      {/* Insurance Documentation - Only show if client has insurance */}
      {job.client.hasInsurance && (
        <Card className="p-8 space-y-6 bg-blue-600 dark:bg-blue-700 border-4 border-blue-800 shadow-2xl">
          <div className="flex items-center gap-4">
            <div className="text-6xl">✓</div>
            <div className="flex-1">
              <h2 className="text-4xl font-black text-white uppercase tracking-wide">
                INSURANCE DOCUMENTATION
              </h2>
              <p className="text-blue-100 mt-2 text-lg font-bold">
                📋 Document cleaning details and observations for insurance billing and records
              </p>
            </div>
            <FileText className="h-16 w-16 text-white" />
          </div>

          <div className="space-y-4">
            <div>
              <label htmlFor="insuranceDocumentation" className="block text-base font-bold text-white mb-2">
                Insurance Documentation
              </label>
              <textarea
                id="insuranceDocumentation"
                rows={4}
                className="w-full px-4 py-3 border-2 border-white rounded-lg focus:outline-none focus:ring-4 focus:ring-white text-lg"
                placeholder="Document cleaning details, areas serviced, time spent, etc. for insurance billing..."
                value={insuranceDocumentation}
                onChange={(e) => setInsuranceDocumentation(e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="cleaningObservations" className="block text-base font-bold text-white mb-2">
                Cleaning Observations & Notes
              </label>
              <textarea
                id="cleaningObservations"
                rows={4}
                className="w-full px-4 py-3 border-2 border-white rounded-lg focus:outline-none focus:ring-4 focus:ring-white text-lg"
                placeholder="Note any observations, issues found, client feedback, or special considerations..."
                value={cleaningObservations}
                onChange={(e) => setCleaningObservations(e.target.value)}
              />
            </div>

            <Button
              onClick={handleSaveDocumentation}
              disabled={savingDocumentation}
              className="w-full bg-white text-blue-600 hover:bg-blue-50 font-black text-lg py-6 text-xl"
            >
              {savingDocumentation ? 'SAVING...' : 'SAVE DOCUMENTATION'}
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
                      Duration: {formatDuration(Math.round((new Date(job.clockedOutAt).getTime() - new Date(job.clockedInAt).getTime()) / 60000))}
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
          {/* Stage 1: Cleaner Completed, Pending Admin Review */}
          {job.status === 'CLEANER_COMPLETED' && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-2 w-2 rounded-full bg-yellow-500 animate-pulse"></div>
                <span className="text-sm font-medium text-yellow-800">
                  Cleaner Marked Complete - Pending Your Review
                </span>
              </div>
              <p className="text-xs text-yellow-700 mb-3">
                {job.assignee?.user?.name || 'Cleaner'} has marked this job as completed.
                Review and approve to enable payment options.
              </p>
              <Button
                onClick={handleApprove}
                disabled={updating}
                size="sm"
                className="w-full bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                {updating ? 'Approving...' : '✓ Review & Approve Job'}
              </Button>
            </div>
          )}

          {/* Completion Tracking */}
          {(job.status === 'CLEANER_COMPLETED' || job.status === 'COMPLETED') && (job as any).completedByUser && (
            <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <label className="text-xs font-medium text-gray-700 mb-2 block">Completion Tracking</label>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-blue-500"></div>
                  <span className="text-sm text-gray-700">
                    <span className="font-medium">Stage 1 - Completed by:</span>{' '}
                    {(job as any).completedByUser?.name || (job as any).completedByUser?.email || 'Unknown'}
                  </span>
                </div>
                {job.status === 'COMPLETED' && (job as any).approvedByUser && (
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-green-500"></div>
                    <span className="text-sm text-gray-700">
                      <span className="font-medium">Stage 2 - Approved by:</span>{' '}
                      {(job as any).approvedByUser?.name || (job as any).approvedByUser?.email || 'Unknown'}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Update Status
            </label>
            <div className="flex gap-2">
              <Button
                onClick={() => handleStatusChange('COMPLETED')}
                disabled={updating || job.status === 'COMPLETED' || job.status === 'CLEANER_COMPLETED'}
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
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Payment
              </label>

              {job.client.autoChargeEnabled && job.client.stripePaymentMethodId ? (
                <>
                  <Button
                    onClick={handleAutoCharge}
                    disabled={creatingPaymentLink}
                    size="sm"
                    className="w-full bg-green-600 hover:bg-green-700"
                  >
                    <CreditCard className="h-4 w-4 mr-1" />
                    {creatingPaymentLink ? 'Charging...' : 'Charge Saved Card'}
                  </Button>
                  <p className="text-xs text-green-700 font-medium">
                    💳 Card on file (****{job.client.stripePaymentMethodId.slice(-4)})
                  </p>
                </>
              ) : (
                <>
                  <Button
                    onClick={handleCreatePaymentLink}
                    disabled={creatingPaymentLink}
                    size="sm"
                    className="w-full bg-blue-600 hover:bg-blue-700"
                  >
                    <CreditCard className="h-4 w-4 mr-1" />
                    {creatingPaymentLink ? 'Creating...' : 'Create Payment Link'}
                  </Button>
                  <p className="text-xs text-gray-500">
                    Creates a Stripe payment link and copies to clipboard
                  </p>
                </>
              )}

              <div className="border-t pt-2 mt-2">
                <label className="text-xs font-medium text-gray-700 mb-2 block">
                  Payment Method (Manual)
                </label>
                <div className="space-y-1.5">
                  {['Stripe/Card', 'Zelle', 'Venmo', 'CashApp', 'Check', 'Cash', 'No Copay Insurance'].map((method) => (
                    <label key={method} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="paymentMethod"
                        value={method.toLowerCase().replace('/', '_').replace(' ', '_')}
                        checked={paymentMethod === method.toLowerCase().replace('/', '_').replace(' ', '_')}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        className="w-4 h-4 text-blue-600"
                      />
                      <span className="text-sm text-gray-700">{method}</span>
                    </label>
                  ))}
                </div>
              </div>

              <Button
                onClick={handleMarkPaid}
                disabled={updating}
                variant="outline"
                size="sm"
                className="w-full mt-2"
              >
                <DollarSign className="h-4 w-4 mr-1" />
                SAVE
              </Button>
            </div>
          )}

          {/* Copay Payment Section for Insurance Clients */}
          {job.client.hasInsurance && (job.hasInsuranceCoverage ?? job.hasInsurance) && !(job.copayPaid ?? false) && (job.finalCopayAmount ?? job.copayAmount ?? 0) > 0 && job.status === 'COMPLETED' && (
            <div className="space-y-2 border-2 border-purple-200 rounded-lg p-3 bg-purple-50">
              <label className="text-sm font-medium text-purple-900 mb-2 block">
                💳 Copay Payment (${job.finalCopayAmount ?? job.copayAmount ?? 0})
              </label>

              <div className="border-t border-purple-200 pt-2 mt-2">
                <label className="text-xs font-medium text-purple-800 mb-2 block">
                  Copay Payment Method
                </label>
                <div className="space-y-1.5">
                  {['STRIPE', 'ZELLE', 'VENMO', 'CASHAPP', 'CHECK', 'CASH'].map((method) => (
                    <label key={method} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="copayPaymentMethod"
                        value={method}
                        checked={copayPaymentMethod === method}
                        onChange={(e) => setCopayPaymentMethod(e.target.value)}
                        className="w-4 h-4 text-purple-600"
                      />
                      <span className="text-sm text-purple-900 capitalize">{method.toLowerCase()}</span>
                    </label>
                  ))}
                </div>
              </div>

              <Button
                onClick={handleMarkCopayPaid}
                disabled={updating}
                size="sm"
                className="w-full mt-2 bg-purple-600 hover:bg-purple-700"
              >
                <DollarSign className="h-4 w-4 mr-1" />
                SAVE
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

              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Customer Feedback
                </label>
                <Button
                  onClick={handleSendFeedbackLink}
                  disabled={sendingFeedback}
                  variant="outline"
                  size="sm"
                  className="w-full bg-green-50 hover:bg-green-100 border-green-200"
                >
                  <Share2 className="h-4 w-4 mr-1" />
                  {sendingFeedback ? 'Sending...' : 'Send Feedback Link to Customer'}
                </Button>
                <p className="text-xs text-gray-500 mt-1">
                  Send SMS/Email with link for customer to rate, tip, and pay
                </p>
                {job.feedbackLinkSentAt && (
                  <p className="text-xs text-green-600 mt-1">
                    ✓ Last sent {new Date(job.feedbackLinkSentAt).toLocaleString()}
                  </p>
                )}
              </div>
            </>
          )}
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

      {/* Payment Modal - Shows when job is marked as completed */}
      {showPaymentModal && job && job.status === 'COMPLETED' && !job.isPaid && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="mb-4">
              <h2 className="text-2xl font-bold mb-2">🎉 Job Completed!</h2>
              <p className="text-gray-600">
                Collect payment from {job.client.name} - ${job.price}
              </p>
            </div>

            <div className="space-y-4">
              {/* Auto-charge if card on file */}
              {job.client.autoChargeEnabled && job.client.stripePaymentMethodId ? (
                <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
                  <h3 className="font-semibold text-green-900 mb-2">💳 Card on File</h3>
                  <p className="text-sm text-green-700 mb-3">
                    Customer has auto-charge enabled (****{job.client.stripePaymentMethodId.slice(-4)})
                  </p>
                  <Button
                    onClick={() => {
                      handleAutoCharge();
                      setShowPaymentModal(false);
                    }}
                    disabled={creatingPaymentLink}
                    className="w-full bg-green-600 hover:bg-green-700"
                    size="lg"
                  >
                    <CreditCard className="h-5 w-5 mr-2" />
                    {creatingPaymentLink ? 'Charging...' : `Charge ${formatCurrency(job.price ?? 0)} Now`}
                  </Button>
                </div>
              ) : (
                <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                  <h3 className="font-semibold text-blue-900 mb-2">💳 Send Payment Link</h3>
                  <p className="text-sm text-blue-700 mb-3">
                    Create a Stripe payment link and copy to clipboard
                  </p>
                  <Button
                    onClick={() => {
                      handleCreatePaymentLink();
                      setShowPaymentModal(false);
                    }}
                    disabled={creatingPaymentLink}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                    size="lg"
                  >
                    <CreditCard className="h-5 w-5 mr-2" />
                    {creatingPaymentLink ? 'Creating...' : 'Create Payment Link'}
                  </Button>
                </div>
              )}

              {/* Manual payment methods */}
              <div className="border-t pt-4">
                <h3 className="font-semibold text-gray-900 mb-3">Or mark as paid manually:</h3>
                <div className="space-y-2">
                  {['Stripe/Card', 'Zelle', 'Venmo', 'CashApp', 'Check', 'Cash', 'No Copay Insurance'].map((method) => (
                    <label key={method} className="flex items-center gap-3 cursor-pointer p-2 hover:bg-gray-50 rounded">
                      <input
                        type="radio"
                        name="paymentMethodModal"
                        value={method.toLowerCase().replace('/', '_').replace(' ', '_')}
                        checked={paymentMethod === method.toLowerCase().replace('/', '_').replace(' ', '_')}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        className="w-4 h-4 text-blue-600"
                      />
                      <span className="text-sm font-medium text-gray-700">{method}</span>
                    </label>
                  ))}
                </div>
                <Button
                  onClick={() => {
                    handleMarkPaid();
                    setShowPaymentModal(false);
                  }}
                  disabled={updating}
                  variant="outline"
                  size="lg"
                  className="w-full mt-3"
                >
                  <DollarSign className="h-5 w-5 mr-2" />
                  Mark as Paid via {paymentMethod.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                </Button>
              </div>

              {/* Send feedback link */}
              <div className="border-t pt-4">
                <h3 className="font-semibold text-gray-900 mb-3">📧 Get Tip, Feedback & Review:</h3>
                <Button
                  onClick={() => {
                    handleSendFeedbackLink();
                    setShowPaymentModal(false);
                  }}
                  disabled={sendingFeedback}
                  variant="outline"
                  size="lg"
                  className="w-full bg-green-50 hover:bg-green-100 border-green-300"
                >
                  <Share2 className="h-5 w-5 mr-2" />
                  {sendingFeedback ? 'Sending...' : 'Send Feedback Link to Customer'}
                </Button>
                <p className="text-xs text-gray-500 mt-2 text-center">
                  Customer can rate, tip, and pay through the link
                </p>
              </div>

              {/* Copay Collection */}
              {job.client.hasInsurance && (job.hasInsuranceCoverage ?? job.hasInsurance) && !(job.copayPaid ?? false) && (job.finalCopayAmount ?? job.copayAmount ?? 0) > 0 && (
                <div className="border-t pt-4">
                  <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-4">
                    <h3 className="font-semibold text-purple-900 mb-2">💳 Collect Copay</h3>
                    <p className="text-sm text-purple-700 mb-3">
                      Copay amount: ${job.finalCopayAmount ?? job.copayAmount ?? 0}
                    </p>
                    <div className="space-y-2">
                      {['STRIPE', 'ZELLE', 'VENMO', 'CASHAPP', 'CHECK', 'CASH'].map((method) => (
                        <label key={method} className="flex items-center gap-3 cursor-pointer p-2 hover:bg-purple-100 rounded">
                          <input
                            type="radio"
                            name="copayPaymentMethodModal"
                            value={method}
                            checked={copayPaymentMethod === method}
                            onChange={(e) => setCopayPaymentMethod(e.target.value)}
                            className="w-4 h-4 text-purple-600"
                          />
                          <span className="text-sm font-medium text-purple-900 capitalize">{method.toLowerCase()}</span>
                        </label>
                      ))}
                    </div>
                    <Button
                      onClick={() => {
                        handleMarkCopayPaid();
                        setShowPaymentModal(false);
                      }}
                      disabled={updating}
                      className="w-full mt-3 bg-purple-600 hover:bg-purple-700"
                      size="lg"
                    >
                      <DollarSign className="h-5 w-5 mr-2" />
                      Mark Copay as Paid
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-2 mt-6 pt-4 border-t">
              <Button
                onClick={() => setShowPaymentModal(false)}
                variant="outline"
                className="flex-1"
              >
                Skip for Now
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Review Modal */}
      {showReviewModal && job && (
        <ReviewModal
          bookingId={job.id}
          clientName={job.client.name ?? `${job.client.firstName || ''} ${job.client.lastName || ''}`.trim()}
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

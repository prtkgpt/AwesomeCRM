'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Plus, Mail, Phone, MapPin, Trash2, Edit, Save, X, StickyNote, TrendingUp, DollarSign, Calendar, FileText, Download, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { formatDateTime, formatCurrency } from '@/lib/utils';
import type { ClientWithAddresses, BookingWithRelations } from '@/types';

export default function ClientDetailPage() {
  const router = useRouter();
  const params = useParams();
  const clientId = params.id as string;

  const [client, setClient] = useState<ClientWithAddresses | null>(null);
  const [bookings, setBookings] = useState<BookingWithRelations[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notes, setNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);

  useEffect(() => {
    fetchClient();
    fetchBookings();
    fetchInvoices();
  }, [clientId]);

  const fetchClient = async () => {
    try {
      const response = await fetch(`/api/clients/${clientId}`);
      const data = await response.json();

      if (data.success) {
        setClient(data.data);
        setNotes(data.data.notes || '');
      } else {
        router.push('/clients');
      }
    } catch (error) {
      console.error('Failed to fetch client:', error);
      router.push('/clients');
    } finally {
      setLoading(false);
    }
  };

  const fetchBookings = async () => {
    try {
      const response = await fetch(`/api/bookings?clientId=${clientId}`);
      const data = await response.json();

      if (data.success) {
        setBookings(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch bookings:', error);
    }
  };

  const fetchInvoices = async () => {
    try {
      const response = await fetch(`/api/invoices?clientId=${clientId}`);
      const data = await response.json();

      if (data.success) {
        setInvoices(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch invoices:', error);
    }
  };

  const handleDownloadPDF = async (invoiceId: string, invoiceNumber: string) => {
    try {
      const response = await fetch(`/api/invoices/${invoiceId}/pdf`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice-${invoiceNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading PDF:', error);
      alert('Failed to download PDF');
    }
  };

  const handleSaveNotes = async () => {
    setSavingNotes(true);
    try {
      const response = await fetch(`/api/clients/${clientId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes }),
      });

      const data = await response.json();

      if (data.success) {
        setClient(data.data);
        setEditingNotes(false);
      } else {
        alert(data.error || 'Failed to save notes');
      }
    } catch (error) {
      alert('An error occurred. Please try again.');
    } finally {
      setSavingNotes(false);
    }
  };

  const handleCancelNotes = () => {
    setNotes(client?.notes || '');
    setEditingNotes(false);
  };

  const handleDelete = async () => {
    if (
      !confirm(
        'Are you sure you want to delete this client? All associated bookings will also be deleted.'
      )
    ) {
      return;
    }

    setDeleting(true);
    try {
      const response = await fetch(`/api/clients/${clientId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        router.push('/clients');
      } else {
        alert(data.error || 'Failed to delete client');
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

  if (!client) {
    return null;
  }

  // Calculate job stats
  const totalJobs = bookings.length;
  const completedJobs = bookings.filter(b => b.status === 'COMPLETED').length;
  const totalRevenue = bookings
    .filter(b => b.status === 'COMPLETED' && b.isPaid)
    .reduce((sum, b) => sum + b.price, 0);
  const unpaidRevenue = bookings
    .filter(b => b.status === 'COMPLETED' && !b.isPaid)
    .reduce((sum, b) => sum + b.price, 0);

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl md:text-4xl font-bold">{client.name}</h1>
            {client.tags.length > 0 && (
              <div className="flex gap-1 mt-2">
                {client.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleDelete}
          disabled={deleting}
          className="text-red-600 hover:text-red-700 dark:text-red-400"
        >
          <Trash2 className="h-4 w-4 mr-1" />
          {deleting ? 'Deleting...' : 'Delete'}
        </Button>
      </div>

      {/* Job Stats */}
      {totalJobs > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Jobs</p>
                <p className="text-2xl font-bold">{totalJobs}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Completed</p>
                <p className="text-2xl font-bold">{completedJobs}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <DollarSign className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Revenue</p>
                <p className="text-2xl font-bold">{formatCurrency(totalRevenue)}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                <DollarSign className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Unpaid</p>
                <p className="text-2xl font-bold">{formatCurrency(unpaidRevenue)}</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      <Card className="p-4 space-y-3">
        <h2 className="font-semibold text-lg">Contact Information</h2>

        {client.email && (
          <div className="flex items-center gap-2 text-gray-700">
            <Mail className="h-4 w-4 text-gray-400" />
            <a href={`mailto:${client.email}`} className="hover:underline">
              {client.email}
            </a>
          </div>
        )}

        {client.phone && (
          <div className="flex items-center gap-2 text-gray-700">
            <Phone className="h-4 w-4 text-gray-400" />
            <a href={`tel:${client.phone}`} className="hover:underline">
              {client.phone}
            </a>
          </div>
        )}

        {client.addresses.length > 0 && (
          <div className="space-y-2 pt-2">
            <h3 className="font-medium flex items-center gap-2">
              <MapPin className="h-4 w-4 text-gray-400" />
              Addresses
            </h3>
            {client.addresses.map((address) => (
              <div
                key={address.id}
                className="pl-6 text-sm text-gray-600 border-l-2 border-gray-200"
              >
                <div>{address.street}</div>
                <div>
                  {address.city}, {address.state} {address.zip}
                </div>
              
              </div>
            ))}
          </div>
        )}

      </Card>

      {/* Insurance Information */}
      {client.hasInsurance && (
        <Card className="p-4 md:p-6 space-y-3 bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
          <h2 className="font-semibold text-lg flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            Insurance Coverage
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {client.insuranceProvider && (
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Provider</p>
                <p className="font-medium">{client.insuranceProvider}</p>
              </div>
            )}
            {client.helperBeesReferralId && (
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Helper Bee's Referral ID</p>
                <p className="font-medium">{client.helperBeesReferralId}</p>
              </div>
            )}
            {client.insurancePaymentAmount && (
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Insurance Payment Amount</p>
                <p className="font-medium">{formatCurrency(client.insurancePaymentAmount)}</p>
              </div>
            )}
            {client.standardCopayAmount && (
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Standard Copay Amount</p>
                <p className="font-medium">{formatCurrency(client.standardCopayAmount)}</p>
              </div>
            )}
            {client.hasDiscountedCopay && client.copayDiscountAmount && (
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Copay Discount</p>
                <p className="font-medium">{formatCurrency(client.copayDiscountAmount)} off</p>
              </div>
            )}
          </div>
          {client.copayNotes && (
            <div className="pt-2 border-t border-blue-200 dark:border-blue-800">
              <p className="text-sm text-gray-600 dark:text-gray-400">Copay Notes</p>
              <p className="text-sm mt-1">{client.copayNotes}</p>
            </div>
          )}
          <div className="pt-2 border-t border-blue-200 dark:border-blue-800">
            <p className="text-xs text-blue-700 dark:text-blue-300">
              📋 Documentation fields will appear on each booking for insurance billing records
            </p>
          </div>
        </Card>
      )}

      {/* Notes Section */}
      <Card className="p-4 md:p-6 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-lg flex items-center gap-2">
            <StickyNote className="h-5 w-5" />
            Notes
          </h2>
          {!editingNotes && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditingNotes(true)}
            >
              <Edit className="h-4 w-4 mr-1" />
              Edit
            </Button>
          )}
        </div>

        {editingNotes ? (
          <div className="space-y-3">
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add notes about this client..."
              rows={6}
              className="w-full"
            />
            <div className="flex gap-2">
              <Button
                onClick={handleSaveNotes}
                disabled={savingNotes}
                size="sm"
              >
                <Save className="h-4 w-4 mr-1" />
                {savingNotes ? 'Saving...' : 'Save'}
              </Button>
              <Button
                variant="outline"
                onClick={handleCancelNotes}
                disabled={savingNotes}
                size="sm"
              >
                <X className="h-4 w-4 mr-1" />
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div>
            {client.notes ? (
              <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                {client.notes}
              </p>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                No notes yet. Click Edit to add notes about this client.
              </p>
            )}
          </div>
        )}
      </Card>

      {/* Invoices Section */}
      {invoices.length > 0 && (
        <>
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Invoices
            </h2>
            <Link href="/invoices">
              <Button variant="outline" size="sm">
                View All
              </Button>
            </Link>
          </div>

          <div className="grid gap-3">
            {invoices.map((invoice) => (
              <Card key={invoice.id} className="p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {invoice.invoiceNumber}
                      </h3>
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${
                          invoice.status === 'PAID'
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                            : invoice.status === 'SENT'
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                            : invoice.status === 'OVERDUE'
                            ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                            : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                        }`}
                      >
                        {invoice.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Due: {new Date(invoice.dueDate).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-lg mb-2">
                      {formatCurrency(invoice.total)}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push(`/invoices`)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleDownloadPDF(invoice.id, invoice.invoiceNumber)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Jobs</h2>
        <Link href={`/jobs/new?clientId=${clientId}`}>
          <Button size="sm">
            <Plus className="h-4 w-4 mr-1" />
            New Job
          </Button>
        </Link>
      </div>

      {bookings.length === 0 ? (
        <Card className="p-8 text-center text-gray-500">
          <p className="mb-4">No jobs yet for this client</p>
          <Link href={`/jobs/new?clientId=${clientId}`}>
            <Button>
              <Plus className="h-4 w-4 mr-1" />
              Create First Job
            </Button>
          </Link>
        </Card>
      ) : (
        <div className="space-y-3">
          {bookings.map((booking) => (
            <Link key={booking.id} href={`/jobs/${booking.id}`}>
              <Card className="p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${getStatusColor(
                          booking.status
                        )}`}
                      >
                        {booking.status}
                      </span>
                      {booking.isRecurring && (
                        <span className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded-full">
                          Recurring
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-medium text-gray-900">
                      {formatDateTime(booking.scheduledDate)}
                    </p>
                    <p className="text-sm text-gray-600">
                      {booking.address.street}, {booking.address.city}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      {booking.serviceType} • {booking.duration} min
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">
                      {formatCurrency(booking.price)}
                    </div>
                    {!booking.isPaid && booking.status === 'COMPLETED' && (
                      <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full">
                        Unpaid
                      </span>
                    )}
                    {booking.isPaid && (
                      <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full">
                        Paid
                      </span>
                    )}
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

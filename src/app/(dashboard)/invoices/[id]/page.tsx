'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Download,
  Mail,
  Trash2,
  DollarSign,
  Calendar,
  FileText,
  Building2,
  User,
  MapPin,
  Phone,
  CheckCircle,
  Clock,
  AlertCircle,
  XCircle,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface LineItem {
  description: string;
  quantity: number;
  rate: number;
  amount: number;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  status: 'DRAFT' | 'SENT' | 'PAID' | 'OVERDUE' | 'CANCELLED';
  lineItems: LineItem[];
  subtotal: number;
  tax: number;
  total: number;
  notes?: string;
  terms?: string;
  sentAt?: string;
  sentTo?: string;
  client: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
  };
  booking?: {
    id: string;
    scheduledDate: string;
    serviceType: string;
    address: {
      street: string;
      city: string;
      state: string;
      zip: string;
    };
  };
  user: {
    name?: string;
    email?: string;
    phone?: string;
    businessName?: string;
  };
}

export default function InvoiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const invoiceId = params.id as string;

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetchInvoice();
  }, [invoiceId]);

  const fetchInvoice = async () => {
    try {
      const response = await fetch(`/api/invoices/${invoiceId}`);
      const data = await response.json();

      if (data.success) {
        setInvoice(data.data);
      } else {
        alert(data.error || 'Invoice not found');
        router.push('/invoices');
      }
    } catch (error) {
      console.error('Error fetching invoice:', error);
      alert('Failed to load invoice');
      router.push('/invoices');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (newStatus: string) => {
    if (!invoice) return;

    if (
      newStatus === 'PAID' &&
      !confirm('Mark this invoice as paid? This will also mark the associated booking as paid.')
    ) {
      return;
    }

    setUpdating(true);
    try {
      const response = await fetch(`/api/invoices/${invoiceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await response.json();

      if (data.success) {
        setInvoice(data.data);
        alert('Invoice status updated');
      } else {
        alert(data.error || 'Failed to update status');
      }
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Failed to update status');
    } finally {
      setUpdating(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!invoice) return;

    try {
      const response = await fetch(`/api/invoices/${invoiceId}/pdf`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice-${invoice.invoiceNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading PDF:', error);
      alert('Failed to download PDF');
    }
  };

  const handleSendInvoice = async () => {
    if (!invoice?.client.email) {
      alert('Client email not found');
      return;
    }

    if (!confirm(`Send invoice to ${invoice.client.email}?`)) {
      return;
    }

    setUpdating(true);
    try {
      console.log(`Sending invoice ${invoiceId} to ${invoice.client.email}`);
      const response = await fetch(`/api/invoices/${invoiceId}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await response.json();
      console.log('Send invoice response:', { status: response.status, data });

      if (data.success) {
        alert('Invoice sent successfully!');
        fetchInvoice(); // Refresh to show updated status
      } else {
        const errorMsg = data.error || 'Failed to send invoice';
        const details = data.details ? `\n\nDetails: ${data.details}` : '';
        console.error('Send invoice failed:', data);
        alert(errorMsg + details);
      }
    } catch (error) {
      console.error('Error sending invoice:', error);
      alert('Network error: Failed to send invoice. Please check your connection.');
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (!invoice) return;

    if (invoice.status === 'PAID') {
      alert('Cannot delete paid invoices');
      return;
    }

    if (!confirm('Are you sure you want to delete this invoice? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/invoices/${invoiceId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        alert('Invoice deleted');
        router.push('/invoices');
      } else {
        alert(data.error || 'Failed to delete invoice');
      }
    } catch (error) {
      console.error('Error deleting invoice:', error);
      alert('Failed to delete invoice');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PAID':
        return <CheckCircle className="w-6 h-6 text-green-500" />;
      case 'SENT':
        return <Clock className="w-6 h-6 text-blue-500" />;
      case 'OVERDUE':
        return <AlertCircle className="w-6 h-6 text-red-500" />;
      case 'CANCELLED':
        return <XCircle className="w-6 h-6 text-gray-500" />;
      default:
        return <FileText className="w-6 h-6 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PAID':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'SENT':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'OVERDUE':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      case 'CANCELLED':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatCurrency = (amount: number) => {
    return `$${amount.toFixed(2)}`;
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto p-4 md:p-6">
        <div className="text-center py-12">
          <p className="text-gray-600 dark:text-gray-400">Loading invoice...</p>
        </div>
      </div>
    );
  }

  if (!invoice) {
    return null;
  }

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          onClick={() => router.push('/invoices')}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>
      </div>

      {/* Invoice Header */}
      <Card className="p-6">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-3">
              {getStatusIcon(invoice.status)}
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  {invoice.invoiceNumber}
                </h1>
                <span
                  className={`inline-block px-3 py-1 text-sm font-medium rounded-full mt-2 ${getStatusColor(
                    invoice.status
                  )}`}
                >
                  {invoice.status}
                </span>
              </div>
            </div>

            <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>Issued: {formatDate(invoice.issueDate)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>Due: {formatDate(invoice.dueDate)}</span>
              </div>
              {invoice.sentAt && (
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  <span>Sent: {formatDate(invoice.sentAt)}</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              onClick={handleDownloadPDF}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              PDF
            </Button>
            {invoice.status !== 'CANCELLED' && (
              <Button
                onClick={handleSendInvoice}
                disabled={updating || !invoice.client.email}
                className="flex items-center gap-2"
              >
                <Mail className="w-4 h-4" />
                {invoice.status === 'DRAFT' ? 'Send' : invoice.status === 'PAID' ? 'Send Receipt' : 'Resend'}
              </Button>
            )}
            {invoice.status !== 'PAID' && (
              <Button
                onClick={handleDelete}
                variant="outline"
                className="flex items-center gap-2 text-red-600 hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Related Booking Link */}
      {invoice.booking && (
        <Card className="p-4 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-blue-900 dark:text-blue-300">
              <FileText className="w-5 h-5" />
              <span className="font-medium">
                Related Job: {invoice.booking.serviceType.replace('_', ' ')} on{' '}
                {formatDate(invoice.booking.scheduledDate)}
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/jobs/${invoice.booking?.id}`)}
              className="flex items-center gap-2"
            >
              View Job
              <ExternalLink className="w-4 h-4" />
            </Button>
          </div>
        </Card>
      )}

      {/* From / Bill To */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3 flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            FROM
          </h3>
          <div className="space-y-1">
            <p className="font-semibold text-gray-900 dark:text-white">
              {invoice.user.businessName || invoice.user.name || 'N/A'}
            </p>
            {invoice.user.email && (
              <p className="text-sm text-gray-600 dark:text-gray-400">{invoice.user.email}</p>
            )}
            {invoice.user.phone && (
              <p className="text-sm text-gray-600 dark:text-gray-400">{invoice.user.phone}</p>
            )}
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3 flex items-center gap-2">
            <User className="w-4 h-4" />
            BILL TO
          </h3>
          <div className="space-y-1">
            <p className="font-semibold text-gray-900 dark:text-white">{invoice.client.name}</p>
            {invoice.client.email && (
              <p className="text-sm text-gray-600 dark:text-gray-400">{invoice.client.email}</p>
            )}
            {invoice.client.phone && (
              <p className="text-sm text-gray-600 dark:text-gray-400">{invoice.client.phone}</p>
            )}
            {invoice.booking?.address && (
              <div className="flex items-start gap-2 mt-2">
                <MapPin className="w-4 h-4 mt-0.5 text-gray-400" />
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {invoice.booking.address.street}
                  <br />
                  {invoice.booking.address.city}, {invoice.booking.address.state}{' '}
                  {invoice.booking.address.zip}
                </p>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Line Items */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Items</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left py-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Description
                </th>
                <th className="text-right py-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Qty
                </th>
                <th className="text-right py-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Rate
                </th>
                <th className="text-right py-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Amount
                </th>
              </tr>
            </thead>
            <tbody>
              {(invoice.lineItems as LineItem[]).map((item, index) => (
                <tr
                  key={index}
                  className="border-b border-gray-100 dark:border-gray-800"
                >
                  <td className="py-3 text-gray-900 dark:text-white">{item.description}</td>
                  <td className="py-3 text-right text-gray-600 dark:text-gray-400">
                    {item.quantity}
                  </td>
                  <td className="py-3 text-right text-gray-600 dark:text-gray-400">
                    {formatCurrency(item.rate)}
                  </td>
                  <td className="py-3 text-right font-medium text-gray-900 dark:text-white">
                    {formatCurrency(item.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="mt-6 border-t border-gray-200 dark:border-gray-700 pt-4">
          <div className="flex justify-end">
            <div className="w-64 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Subtotal:</span>
                <span className="text-gray-900 dark:text-white font-medium">
                  {formatCurrency(invoice.subtotal)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Tax:</span>
                <span className="text-gray-900 dark:text-white font-medium">
                  {formatCurrency(invoice.tax)}
                </span>
              </div>
              <div className="flex justify-between text-lg font-bold border-t border-gray-200 dark:border-gray-700 pt-2">
                <span className="text-gray-900 dark:text-white">Total:</span>
                <span className="text-gray-900 dark:text-white">
                  {formatCurrency(invoice.total)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Notes and Terms */}
      {(invoice.notes || invoice.terms) && (
        <div className="grid md:grid-cols-2 gap-6">
          {invoice.notes && (
            <Card className="p-6">
              <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2">
                Notes
              </h3>
              <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                {invoice.notes}
              </p>
            </Card>
          )}
          {invoice.terms && (
            <Card className="p-6">
              <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2">
                Terms & Conditions
              </h3>
              <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                {invoice.terms}
              </p>
            </Card>
          )}
        </div>
      )}

      {/* Actions */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Actions</h3>
        <div className="flex flex-wrap gap-3">
          {invoice.status !== 'PAID' && (
            <Button
              onClick={() => handleStatusUpdate('PAID')}
              disabled={updating}
              className="bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Mark as Paid
            </Button>
          )}
          {invoice.status === 'DRAFT' && (
            <Button
              onClick={() => handleStatusUpdate('SENT')}
              disabled={updating}
              variant="outline"
            >
              <Mail className="w-4 h-4 mr-2" />
              Mark as Sent
            </Button>
          )}
          {invoice.status !== 'CANCELLED' && invoice.status !== 'PAID' && (
            <Button
              onClick={() => handleStatusUpdate('CANCELLED')}
              disabled={updating}
              variant="outline"
              className="text-gray-700 dark:text-gray-300"
            >
              <XCircle className="w-4 h-4 mr-2" />
              Cancel Invoice
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}

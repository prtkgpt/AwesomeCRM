'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  FileText,
  Download,
  Eye,
  Plus,
  Filter,
  DollarSign,
  Calendar,
  User,
  CheckCircle,
  AlertCircle,
  Clock,
  XCircle,
} from 'lucide-react';

interface Invoice {
  id: string;
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  status: 'DRAFT' | 'SENT' | 'PAID' | 'OVERDUE' | 'CANCELLED';
  total: number;
  client: {
    id: string;
    name: string;
    email?: string;
  };
  booking?: {
    id: string;
    scheduledDate: string;
    serviceType: string;
  };
}

export default function InvoicesPage() {
  const router = useRouter();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => {
    fetchInvoices();
  }, [filterStatus]);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterStatus !== 'all') {
        params.append('status', filterStatus);
      }

      const response = await fetch(`/api/invoices?${params}`);
      const data = await response.json();

      if (data.success) {
        setInvoices(data.data);
      }
    } catch (error) {
      console.error('Error fetching invoices:', error);
    } finally {
      setLoading(false);
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PAID':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'SENT':
        return <Clock className="w-5 h-5 text-blue-500" />;
      case 'OVERDUE':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'CANCELLED':
        return <XCircle className="w-5 h-5 text-gray-500" />;
      default:
        return <FileText className="w-5 h-5 text-gray-400" />;
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
      month: 'short',
      day: 'numeric',
    });
  };

  const formatCurrency = (amount: number) => {
    return `$${amount.toFixed(2)}`;
  };

  return (
    <div className="max-w-7xl mx-auto p-6 md:p-8 space-y-6 md:space-y-8">
      {/* Header */}
      <div>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">
              Invoices
            </h1>
            <p className="text-sm md:text-base text-gray-600 dark:text-gray-400 mt-2">
              Manage and track your invoices
            </p>
          </div>

          <button
            onClick={() => router.push('/jobs')}
            className="inline-flex items-center justify-center gap-2 h-11 px-6 py-2.5 rounded-xl text-sm font-semibold bg-primary text-primary-foreground shadow-lg hover:shadow-xl hover:bg-primary/90 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
          >
            <Plus className="w-4 h-4" />
            Create Invoice
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 overflow-x-auto pb-2">
        <Filter className="w-5 h-5 text-gray-400 flex-shrink-0" />
        <div className="flex gap-2 bg-gray-100 dark:bg-gray-800 p-1.5 rounded-xl">
          {['all', 'DRAFT', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED'].map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-all duration-200 ${
                filterStatus === status
                  ? 'bg-white dark:bg-gray-700 text-primary shadow-md scale-105'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              {status === 'all' ? 'All' : status}
            </button>
          ))}
        </div>
      </div>

      {/* Invoice List */}
      {loading ? (
        <div className="text-center py-12">
          <p className="text-gray-600 dark:text-gray-400">Loading invoices...</p>
        </div>
      ) : invoices.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400 mb-2">No invoices found</p>
          <p className="text-sm text-gray-500 dark:text-gray-500">
            Create invoices from completed jobs
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {invoices.map((invoice) => (
            <div
              key={invoice.id}
              className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 md:p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                {/* Invoice Info */}
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    {getStatusIcon(invoice.status)}
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {invoice.invoiceNumber}
                      </h3>
                      <span
                        className={`inline-block px-2 py-1 text-xs font-medium rounded-full mt-1 ${getStatusColor(
                          invoice.status
                        )}`}
                      >
                        {invoice.status}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                      <User className="w-4 h-4" />
                      <span>{invoice.client.name}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                      <Calendar className="w-4 h-4" />
                      <span>Due: {formatDate(invoice.dueDate)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                      <DollarSign className="w-4 h-4" />
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {formatCurrency(invoice.total)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => router.push(`/invoices/${invoice.id}`)}
                    className="flex items-center gap-2 px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    <Eye className="w-4 h-4" />
                    <span className="hidden md:inline">View</span>
                  </button>
                  <button
                    onClick={() => handleDownloadPDF(invoice.id, invoice.invoiceNumber)}
                    className="flex items-center gap-2 px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    <span className="hidden md:inline">PDF</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DollarSign, Download, Eye, Calendar } from 'lucide-react';

interface Invoice {
  id: string;
  invoiceNumber: string;
  dueDate: string;
  total: number;
  status: string;
  createdAt: string;
  booking: {
    scheduledDate: string;
    serviceType: string;
  } | null;
}

export default function CustomerInvoicesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [filter, setFilter] = useState<'all' | 'paid' | 'pending'>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated') {
      fetchInvoices();
    }
  }, [status, filter, router]);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/customer/invoices?status=${filter}`);
      if (res.ok) {
        const data = await res.json();
        setInvoices(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch invoices:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PAID':
        return 'bg-green-100 text-green-800';
      case 'SENT':
        return 'bg-blue-100 text-blue-800';
      case 'DRAFT':
        return 'bg-gray-100 text-gray-800';
      case 'OVERDUE':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const isOverdue = (dueDate: string, status: string) => {
    if (status === 'PAID') return false;
    return new Date(dueDate) < new Date();
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-center">Loading invoices...</div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-4">My Invoices</h1>

        {/* Filter Tabs */}
        <div className="flex gap-2 border-b">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${
              filter === 'all'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('pending')}
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${
              filter === 'pending'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Pending
          </button>
          <button
            onClick={() => setFilter('paid')}
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${
              filter === 'paid'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Paid
          </button>
        </div>
      </div>

      {/* Invoices List */}
      {invoices.length === 0 ? (
        <Card className="p-8 text-center text-gray-500">
          No invoices found
        </Card>
      ) : (
        <div className="space-y-4">
          {invoices.map((invoice) => (
            <Card key={invoice.id} className="p-6 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <h3 className="text-lg font-semibold">#{invoice.invoiceNumber}</h3>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(invoice.status)}`}>
                      {invoice.status}
                    </span>
                    {isOverdue(invoice.dueDate, invoice.status) && (
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
                        OVERDUE
                      </span>
                    )}
                  </div>

                  <div className="space-y-1 text-sm text-gray-600">
                    {invoice.booking && (
                      <p>Service: {invoice.booking.serviceType}</p>
                    )}
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 mr-2" />
                      <span>Issued: {formatDate(invoice.createdAt)}</span>
                      <span className="mx-2">•</span>
                      <span>Due: {formatDate(invoice.dueDate)}</span>
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-2xl font-bold text-blue-600 mb-3">
                    {formatCurrency(invoice.total)}
                  </p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-1" />
                      PDF
                    </Button>
                    {invoice.status !== 'PAID' && (
                      <Button size="sm">
                        <DollarSign className="h-4 w-4 mr-1" />
                        Pay Now
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Summary Card */}
      {invoices.length > 0 && (
        <Card className="mt-6 p-6">
          <h3 className="font-semibold mb-3">Summary</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-600">Total Invoices</p>
              <p className="text-2xl font-bold">{invoices.length}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Amount</p>
              <p className="text-2xl font-bold">
                {formatCurrency(invoices.reduce((sum, inv) => sum + inv.total, 0))}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Outstanding</p>
              <p className="text-2xl font-bold text-orange-600">
                {formatCurrency(
                  invoices
                    .filter((inv) => inv.status !== 'PAID')
                    .reduce((sum, inv) => sum + inv.total, 0)
                )}
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

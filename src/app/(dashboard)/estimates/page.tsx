'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Filter, X, Copy, Check, Share2, Eye, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { formatDateTime, formatCurrency } from '@/lib/utils';

interface Estimate {
  id: string;
  scheduledDate: string;
  duration: number;
  serviceType: string;
  status: string;
  price: number;
  estimateToken: string;
  estimateAccepted: boolean;
  estimateAcceptedAt: string | null;
  client: {
    id: string;
    name: string;
    email: string;
    phone: string;
  };
  address: {
    street: string;
    city: string;
    state: string;
  };
  createdAt: string;
}

export default function EstimatesPage() {
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [clientSearch, setClientSearch] = useState('');
  const [copiedToken, setCopiedToken] = useState<string>('');

  useEffect(() => {
    fetchEstimates();
  }, []);

  const fetchEstimates = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/estimates');
      const data = await response.json();

      if (data.success) {
        setEstimates(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch estimates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = async (token: string) => {
    const url = `${window.location.origin}/estimate/${token}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedToken(token);
      setTimeout(() => setCopiedToken(''), 2000);
    } catch (error) {
      alert('Failed to copy link');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this estimate?')) return;

    try {
      const response = await fetch(`/api/bookings/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchEstimates();
      } else {
        alert('Failed to delete estimate');
      }
    } catch (error) {
      alert('An error occurred');
    }
  };

  // Filter estimates
  const filteredEstimates = estimates.filter((estimate) => {
    // Status filter
    if (statusFilter === 'accepted' && !estimate.estimateAccepted) return false;
    if (statusFilter === 'pending' && estimate.estimateAccepted) return false;

    // Client search
    if (clientSearch && !estimate.client.name.toLowerCase().includes(clientSearch.toLowerCase())) {
      return false;
    }

    return true;
  });

  const hasActiveFilters = statusFilter !== 'all' || clientSearch !== '';

  const clearFilters = () => {
    setStatusFilter('all');
    setClientSearch('');
  };

  const getStatusBadge = (estimate: Estimate) => {
    if (estimate.estimateAccepted) {
      return (
        <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
          Accepted
        </span>
      );
    }
    return (
      <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
        Pending
      </span>
    );
  };

  return (
    <div className="p-4 md:p-8 space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold">Estimates</h1>
          <p className="text-gray-600 dark:text-gray-400 text-sm md:text-base mt-1">
            Create and manage customer estimates
          </p>
        </div>
        <div className="flex gap-2 md:gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className={hasActiveFilters ? 'border-blue-500 text-blue-600' : ''}
          >
            <Filter className="h-4 w-4 mr-1" />
            Filters
            {hasActiveFilters && (
              <span className="ml-1 bg-blue-500 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center">
                !
              </span>
            )}
          </Button>
          <Link href="/estimates/new">
            <Button size="sm" className="md:size-default">
              <Plus className="h-4 w-4 mr-1 md:mr-2" />
              New Estimate
            </Button>
          </Link>
        </div>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <Card className="p-4 md:p-6 space-y-4 bg-gray-50 dark:bg-gray-900/50">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-lg">Filters</h3>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="h-4 w-4 mr-1" />
                Clear All
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">
                Status
              </label>
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All Estimates</option>
                <option value="pending">Pending</option>
                <option value="accepted">Accepted</option>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">
                Search Client
              </label>
              <Input
                type="text"
                placeholder="Search by client name..."
                value={clientSearch}
                onChange={(e) => setClientSearch(e.target.value)}
              />
            </div>
          </div>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Estimates</p>
              <p className="text-2xl font-bold">{estimates.length}</p>
            </div>
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full">
              <Share2 className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Pending</p>
              <p className="text-2xl font-bold">
                {estimates.filter((e) => !e.estimateAccepted).length}
              </p>
            </div>
            <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-full">
              <Eye className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Accepted</p>
              <p className="text-2xl font-bold">
                {estimates.filter((e) => e.estimateAccepted).length}
              </p>
            </div>
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-full">
              <Check className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </Card>
      </div>

      {/* Estimates List */}
      {loading ? (
        <div className="text-center py-8 text-gray-500">Loading...</div>
      ) : filteredEstimates.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">
            {hasActiveFilters ? 'No estimates match your filters' : 'No estimates found'}
          </p>
          <Link href="/estimates/new">
            <Button>
              <Plus className="h-4 w-4 mr-1" />
              Create Your First Estimate
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredEstimates.map((estimate) => (
            <Card key={estimate.id} className="p-4 md:p-6 hover:shadow-lg transition-shadow">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                {/* Left side - Info */}
                <div className="flex-1 space-y-3">
                  <div className="flex items-center gap-3">
                    <Link
                      href={`/clients/${estimate.client.id}`}
                      className="text-xl font-semibold hover:text-blue-600 dark:hover:text-blue-400"
                    >
                      {estimate.client.name}
                    </Link>
                    {getStatusBadge(estimate)}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <div>
                      <span className="font-medium">Service:</span> {estimate.serviceType}
                    </div>
                    <div>
                      <span className="font-medium">Duration:</span> {estimate.duration} min
                    </div>
                    <div>
                      <span className="font-medium">Scheduled:</span>{' '}
                      {formatDateTime(estimate.scheduledDate)}
                    </div>
                    <div>
                      <span className="font-medium">Created:</span>{' '}
                      {new Date(estimate.createdAt).toLocaleDateString()}
                    </div>
                  </div>

                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    <span className="font-medium">Address:</span> {estimate.address.street},{' '}
                    {estimate.address.city}, {estimate.address.state}
                  </div>

                  {estimate.estimateAcceptedAt && (
                    <div className="text-sm text-green-600 dark:text-green-400">
                      ✓ Accepted on{' '}
                      {new Date(estimate.estimateAcceptedAt).toLocaleDateString()}
                    </div>
                  )}
                </div>

                {/* Right side - Price & Actions */}
                <div className="flex flex-col items-end gap-3">
                  <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                    {formatCurrency(estimate.price)}
                  </div>

                  <div className="flex flex-wrap gap-2 justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopyLink(estimate.estimateToken)}
                    >
                      {copiedToken === estimate.estimateToken ? (
                        <>
                          <Check className="h-4 w-4 mr-1" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4 mr-1" />
                          Copy Link
                        </>
                      )}
                    </Button>
                    <Link href={`/estimate/${estimate.estimateToken}`} target="_blank">
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4 mr-1" />
                        Preview
                      </Button>
                    </Link>
                    <Link href={`/jobs/${estimate.id}`}>
                      <Button variant="outline" size="sm">
                        View Job
                      </Button>
                    </Link>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(estimate.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

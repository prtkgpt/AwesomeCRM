'use client';

import { useState, useEffect } from 'react';
import {
  Search,
  Phone,
  Mail,
  Globe,
  MapPin,
  Building2,
  User,
  Clock,
  CheckCircle,
  XCircle,
  MessageSquare,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface Prospect {
  id: string;
  fullName: string;
  businessName: string;
  phone: string;
  email: string;
  area: string;
  website: string | null;
  source: string;
  status: string;
  notes: string | null;
  lastContactedAt: string | null;
  followUpDate: string | null;
  createdAt: string;
  updatedAt: string;
}

const statusColors: Record<string, string> = {
  NEW: 'bg-blue-100 text-blue-800',
  CONTACTED: 'bg-yellow-100 text-yellow-800',
  QUALIFIED: 'bg-green-100 text-green-800',
  CONVERTED: 'bg-purple-100 text-purple-800',
  NOT_INTERESTED: 'bg-gray-100 text-gray-800',
};

const statusLabels: Record<string, string> = {
  NEW: 'New',
  CONTACTED: 'Contacted',
  QUALIFIED: 'Qualified',
  CONVERTED: 'Converted',
  NOT_INTERESTED: 'Not Interested',
};

export default function ProspectsPage() {
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedProspect, setSelectedProspect] = useState<Prospect | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    fetchProspects();
  }, [search, statusFilter]);

  const fetchProspects = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);

      const response = await fetch(`/api/platform/prospects?${params}`);
      const data = await response.json();

      if (data.success) {
        setProspects(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch prospects:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateProspectStatus = async (id: string, status: string) => {
    setUpdatingStatus(id);
    try {
      const response = await fetch('/api/platform/prospects', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      });

      const data = await response.json();
      if (data.success) {
        setProspects((prev) =>
          prev.map((p) => (p.id === id ? data.data : p))
        );
        if (selectedProspect?.id === id) {
          setSelectedProspect(data.data);
        }
      }
    } catch (error) {
      console.error('Failed to update prospect:', error);
    } finally {
      setUpdatingStatus(null);
    }
  };

  const updateProspectNotes = async (id: string) => {
    try {
      const response = await fetch('/api/platform/prospects', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, notes }),
      });

      const data = await response.json();
      if (data.success) {
        setProspects((prev) =>
          prev.map((p) => (p.id === id ? data.data : p))
        );
        setSelectedProspect(data.data);
      }
    } catch (error) {
      console.error('Failed to update notes:', error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const statusCounts = prospects.reduce((acc, p) => {
    acc[p.status] = (acc[p.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Inbound Prospects</h1>
          <p className="text-gray-500 text-sm">
            Manage leads from the Switch & Save page
          </p>
        </div>
        <Button onClick={fetchProspects} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {Object.entries(statusLabels).map(([status, label]) => (
          <Card
            key={status}
            className={`p-4 cursor-pointer transition-all ${
              statusFilter === status ? 'ring-2 ring-blue-500' : ''
            }`}
            onClick={() => setStatusFilter(statusFilter === status ? '' : status)}
          >
            <p className="text-sm text-gray-500">{label}</p>
            <p className="text-2xl font-bold">{statusCounts[status] || 0}</p>
          </Card>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
        <Input
          placeholder="Search by name, business, email, phone, or area..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Prospects List */}
        <div className="lg:col-span-2 space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : prospects.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-gray-500">No prospects found</p>
            </Card>
          ) : (
            prospects.map((prospect) => (
              <Card
                key={prospect.id}
                className={`p-4 cursor-pointer hover:shadow-md transition-shadow ${
                  selectedProspect?.id === prospect.id
                    ? 'ring-2 ring-blue-500'
                    : ''
                }`}
                onClick={() => {
                  setSelectedProspect(prospect);
                  setNotes(prospect.notes || '');
                }}
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{prospect.fullName}</h3>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          statusColors[prospect.status]
                        }`}
                      >
                        {statusLabels[prospect.status]}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 flex items-center gap-1">
                      <Building2 className="w-3 h-3" />
                      {prospect.businessName}
                    </p>
                    <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {prospect.area}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDate(prospect.createdAt)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {updatingStatus === prospect.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            updateProspectStatus(prospect.id, 'CONTACTED');
                          }}
                          className="p-1.5 hover:bg-yellow-100 rounded"
                          title="Mark as Contacted"
                        >
                          <MessageSquare className="w-4 h-4 text-yellow-600" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            updateProspectStatus(prospect.id, 'QUALIFIED');
                          }}
                          className="p-1.5 hover:bg-green-100 rounded"
                          title="Mark as Qualified"
                        >
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            updateProspectStatus(prospect.id, 'NOT_INTERESTED');
                          }}
                          className="p-1.5 hover:bg-gray-100 rounded"
                          title="Mark as Not Interested"
                        >
                          <XCircle className="w-4 h-4 text-gray-500" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>

        {/* Prospect Detail */}
        <div className="lg:col-span-1">
          {selectedProspect ? (
            <Card className="p-5 sticky top-4">
              <h2 className="font-semibold text-lg mb-4">Prospect Details</h2>

              <div className="space-y-4">
                <div>
                  <p className="text-xs text-gray-500 uppercase mb-1">Name</p>
                  <p className="font-medium flex items-center gap-2">
                    <User className="w-4 h-4 text-gray-400" />
                    {selectedProspect.fullName}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-gray-500 uppercase mb-1">Business</p>
                  <p className="font-medium flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-gray-400" />
                    {selectedProspect.businessName}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-gray-500 uppercase mb-1">Phone</p>
                  <a
                    href={`tel:${selectedProspect.phone}`}
                    className="font-medium flex items-center gap-2 text-blue-600 hover:underline"
                  >
                    <Phone className="w-4 h-4 text-gray-400" />
                    {selectedProspect.phone}
                  </a>
                </div>

                <div>
                  <p className="text-xs text-gray-500 uppercase mb-1">Email</p>
                  <a
                    href={`mailto:${selectedProspect.email}`}
                    className="font-medium flex items-center gap-2 text-blue-600 hover:underline break-all"
                  >
                    <Mail className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    {selectedProspect.email}
                  </a>
                </div>

                <div>
                  <p className="text-xs text-gray-500 uppercase mb-1">Area</p>
                  <p className="font-medium flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    {selectedProspect.area}
                  </p>
                </div>

                {selectedProspect.website && (
                  <div>
                    <p className="text-xs text-gray-500 uppercase mb-1">Website</p>
                    <a
                      href={selectedProspect.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium flex items-center gap-2 text-blue-600 hover:underline break-all"
                    >
                      <Globe className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      {selectedProspect.website}
                    </a>
                  </div>
                )}

                <div>
                  <p className="text-xs text-gray-500 uppercase mb-1">Status</p>
                  <select
                    value={selectedProspect.status}
                    onChange={(e) =>
                      updateProspectStatus(selectedProspect.id, e.target.value)
                    }
                    className="w-full border rounded-md px-3 py-2 text-sm"
                  >
                    {Object.entries(statusLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <p className="text-xs text-gray-500 uppercase mb-1">Notes</p>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    onBlur={() => updateProspectNotes(selectedProspect.id)}
                    placeholder="Add notes about this prospect..."
                    className="w-full border rounded-md px-3 py-2 text-sm min-h-[80px]"
                  />
                </div>

                <div className="pt-4 border-t text-xs text-gray-500 space-y-1">
                  <p>Source: {selectedProspect.source}</p>
                  <p>Submitted: {formatDate(selectedProspect.createdAt)}</p>
                  {selectedProspect.lastContactedAt && (
                    <p>
                      Last Contacted:{' '}
                      {formatDate(selectedProspect.lastContactedAt)}
                    </p>
                  )}
                </div>
              </div>
            </Card>
          ) : (
            <Card className="p-8 text-center">
              <p className="text-gray-500">Select a prospect to view details</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Megaphone,
  Plus,
  Send,
  Clock,
  CheckCircle,
  XCircle,
  Pause,
  Edit,
  Trash2,
  Users,
  Mail,
  MessageSquare,
  RefreshCw,
  ChevronRight,
  AlertCircle,
  FileText,
  Calendar,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Select } from '@/components/ui/select';

interface Campaign {
  id: string;
  name: string;
  description: string | null;
  type: 'BULK_SMS' | 'BULK_EMAIL' | 'BOTH';
  status: 'DRAFT' | 'SCHEDULED' | 'SENDING' | 'COMPLETED' | 'PAUSED' | 'CANCELLED';
  segmentType: string;
  totalRecipients: number;
  sentCount: number;
  failedCount: number;
  scheduledAt: string | null;
  sentAt: string | null;
  completedAt: string | null;
  createdAt: string;
  createdBy: {
    id: string;
    name: string | null;
    email: string;
  };
  _count: {
    recipients: number;
  };
}

const statusConfig: Record<string, { icon: any; color: string; bgColor: string; label: string }> = {
  DRAFT: { icon: FileText, color: 'text-gray-600', bgColor: 'bg-gray-100', label: 'Draft' },
  SCHEDULED: { icon: Clock, color: 'text-blue-600', bgColor: 'bg-blue-100', label: 'Scheduled' },
  SENDING: { icon: Send, color: 'text-yellow-600', bgColor: 'bg-yellow-100', label: 'Sending' },
  COMPLETED: { icon: CheckCircle, color: 'text-green-600', bgColor: 'bg-green-100', label: 'Completed' },
  PAUSED: { icon: Pause, color: 'text-orange-600', bgColor: 'bg-orange-100', label: 'Paused' },
  CANCELLED: { icon: XCircle, color: 'text-red-600', bgColor: 'bg-red-100', label: 'Cancelled' },
};

const typeConfig: Record<string, { icon: any; label: string }> = {
  BULK_SMS: { icon: MessageSquare, label: 'SMS' },
  BULK_EMAIL: { icon: Mail, label: 'Email' },
  BOTH: { icon: Megaphone, label: 'SMS + Email' },
};

export default function MarketingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'loading') return;
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }

    const userRole = (session?.user as any)?.role;
    if (userRole !== 'OWNER' && userRole !== 'ADMIN') {
      router.push('/dashboard');
      return;
    }

    fetchCampaigns();
  }, [status, statusFilter]);

  const fetchCampaigns = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }

      const response = await fetch(`/api/marketing/campaigns?${params}`);
      const result = await response.json();

      if (result.success) {
        setCampaigns(result.data.campaigns);
      } else {
        setError(result.error || 'Failed to load campaigns');
      }
    } catch (err) {
      setError('Failed to load campaigns');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (campaignId: string) => {
    if (!confirm('Are you sure you want to delete this campaign?')) return;

    setDeleting(campaignId);
    try {
      const response = await fetch(`/api/marketing/campaigns/${campaignId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setCampaigns((prev) => prev.filter((c) => c.id !== campaignId));
      } else {
        const result = await response.json();
        alert(result.error || 'Failed to delete campaign');
      }
    } catch (err) {
      alert('Failed to delete campaign');
    } finally {
      setDeleting(null);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const getStats = () => {
    const total = campaigns.length;
    const sent = campaigns.filter((c) => c.status === 'COMPLETED').length;
    const scheduled = campaigns.filter((c) => c.status === 'SCHEDULED').length;
    const drafts = campaigns.filter((c) => c.status === 'DRAFT').length;
    const totalRecipients = campaigns.reduce((sum, c) => sum + c.sentCount, 0);

    return { total, sent, scheduled, drafts, totalRecipients };
  };

  const stats = getStats();

  if (status === 'loading') {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Megaphone className="h-6 w-6" />
            Marketing Hub
          </h1>
          <p className="text-sm text-gray-500">
            Create and manage marketing campaigns
          </p>
        </div>

        <Link href="/marketing/campaigns/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Campaign
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 text-gray-500 mb-1">
            <Megaphone className="h-4 w-4" />
            <span className="text-sm">Total Campaigns</span>
          </div>
          <div className="text-2xl font-bold">{stats.total}</div>
        </Card>
        <Card className="p-4 bg-green-50 border-green-200">
          <div className="flex items-center gap-2 text-green-700 mb-1">
            <CheckCircle className="h-4 w-4" />
            <span className="text-sm">Sent</span>
          </div>
          <div className="text-2xl font-bold text-green-700">{stats.sent}</div>
        </Card>
        <Card className="p-4 bg-blue-50 border-blue-200">
          <div className="flex items-center gap-2 text-blue-700 mb-1">
            <Clock className="h-4 w-4" />
            <span className="text-sm">Scheduled</span>
          </div>
          <div className="text-2xl font-bold text-blue-700">{stats.scheduled}</div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-gray-500 mb-1">
            <Users className="h-4 w-4" />
            <span className="text-sm">Total Reached</span>
          </div>
          <div className="text-2xl font-bold">{stats.totalRecipients.toLocaleString()}</div>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <Select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-40"
        >
          <option value="all">All Status</option>
          <option value="DRAFT">Drafts</option>
          <option value="SCHEDULED">Scheduled</option>
          <option value="SENDING">Sending</option>
          <option value="COMPLETED">Completed</option>
          <option value="PAUSED">Paused</option>
          <option value="CANCELLED">Cancelled</option>
        </Select>

        <Button variant="outline" onClick={fetchCampaigns} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Error State */}
      {error && (
        <Card className="p-4 bg-red-50 border-red-200">
          <div className="flex items-center gap-2 text-red-700">
            <AlertCircle className="h-5 w-5" />
            {error}
          </div>
        </Card>
      )}

      {/* Campaign List */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">
          <RefreshCw className="h-8 w-8 mx-auto animate-spin mb-4" />
          Loading campaigns...
        </div>
      ) : campaigns.length === 0 ? (
        <Card className="p-12 text-center">
          <Megaphone className="h-12 w-12 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-semibold mb-2">No campaigns yet</h3>
          <p className="text-gray-500 mb-4">Create your first marketing campaign to reach your clients</p>
          <Link href="/marketing/campaigns/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Campaign
            </Button>
          </Link>
        </Card>
      ) : (
        <div className="space-y-3">
          {campaigns.map((campaign) => {
            const statusInfo = statusConfig[campaign.status];
            const typeInfo = typeConfig[campaign.type];
            const StatusIcon = statusInfo.icon;
            const TypeIcon = typeInfo.icon;

            return (
              <Card key={campaign.id} className="p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-lg ${statusInfo.bgColor}`}>
                      <StatusIcon className={`h-5 w-5 ${statusInfo.color}`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/marketing/campaigns/${campaign.id}`}
                          className="font-semibold hover:text-blue-600"
                        >
                          {campaign.name}
                        </Link>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${statusInfo.bgColor} ${statusInfo.color}`}>
                          {statusInfo.label}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 flex items-center gap-1">
                          <TypeIcon className="h-3 w-3" />
                          {typeInfo.label}
                        </span>
                      </div>
                      <div className="text-sm text-gray-500 flex items-center gap-3 mt-1">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDate(campaign.createdAt)}
                        </span>
                        {campaign.createdBy && (
                          <span>by {campaign.createdBy.name || campaign.createdBy.email}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    {/* Stats */}
                    <div className="text-right hidden md:block">
                      <div className="text-sm text-gray-500">Recipients</div>
                      <div className="font-semibold">
                        {campaign.status === 'COMPLETED'
                          ? `${campaign.sentCount}/${campaign.totalRecipients}`
                          : campaign.totalRecipients || '-'}
                      </div>
                    </div>

                    {campaign.scheduledAt && campaign.status === 'SCHEDULED' && (
                      <div className="text-right hidden md:block">
                        <div className="text-sm text-gray-500">Scheduled</div>
                        <div className="font-semibold text-blue-600">
                          {formatDate(campaign.scheduledAt)}
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      {['DRAFT', 'SCHEDULED'].includes(campaign.status) && (
                        <Link href={`/marketing/campaigns/${campaign.id}`}>
                          <Button variant="outline" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </Link>
                      )}
                      {campaign.status === 'DRAFT' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(campaign.id)}
                          disabled={deleting === campaign.id}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                      <Link href={`/marketing/campaigns/${campaign.id}`}>
                        <Button variant="ghost" size="sm">
                          <ChevronRight className="h-5 w-5" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>

                {/* Description */}
                {campaign.description && (
                  <p className="text-sm text-gray-600 mt-2 ml-14">
                    {campaign.description}
                  </p>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

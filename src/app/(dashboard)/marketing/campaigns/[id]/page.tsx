'use client';

import { useState, useEffect, use } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Megaphone,
  MessageSquare,
  Mail,
  Users,
  Send,
  Clock,
  CheckCircle,
  XCircle,
  Pause,
  AlertCircle,
  RefreshCw,
  Edit,
  Trash2,
  Calendar,
  Eye,
  User,
  Phone,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface CampaignRecipient {
  id: string;
  channel: string;
  recipient: string;
  status: string;
  sentAt: string | null;
  errorMessage: string | null;
  client: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
  };
}

interface Campaign {
  id: string;
  name: string;
  description: string | null;
  type: 'BULK_SMS' | 'BULK_EMAIL' | 'BOTH';
  status: 'DRAFT' | 'SCHEDULED' | 'SENDING' | 'COMPLETED' | 'PAUSED' | 'CANCELLED';
  segmentType: string;
  segmentData: any;
  subject: string | null;
  messageBody: string;
  totalRecipients: number;
  sentCount: number;
  failedCount: number;
  deliveredCount: number;
  scheduledAt: string | null;
  sentAt: string | null;
  completedAt: string | null;
  createdAt: string;
  createdBy: {
    id: string;
    name: string | null;
    email: string;
  };
  recipients: CampaignRecipient[];
  _count: {
    recipients: number;
  };
  statusBreakdown: Record<string, number>;
}

const statusConfig: Record<string, { icon: any; color: string; bgColor: string; label: string }> = {
  DRAFT: { icon: Edit, color: 'text-gray-600', bgColor: 'bg-gray-100', label: 'Draft' },
  SCHEDULED: { icon: Clock, color: 'text-blue-600', bgColor: 'bg-blue-100', label: 'Scheduled' },
  SENDING: { icon: Send, color: 'text-yellow-600', bgColor: 'bg-yellow-100', label: 'Sending...' },
  COMPLETED: { icon: CheckCircle, color: 'text-green-600', bgColor: 'bg-green-100', label: 'Completed' },
  PAUSED: { icon: Pause, color: 'text-orange-600', bgColor: 'bg-orange-100', label: 'Paused' },
  CANCELLED: { icon: XCircle, color: 'text-red-600', bgColor: 'bg-red-100', label: 'Cancelled' },
};

export default function CampaignDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const { data: session, status } = useSession();
  const router = useRouter();

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<any>(null);
  const [showRecipients, setShowRecipients] = useState(false);
  const [recipientPreview, setRecipientPreview] = useState<any>(null);

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

    fetchCampaign();
  }, [status, resolvedParams.id]);

  const fetchCampaign = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/marketing/campaigns/${resolvedParams.id}`);
      const result = await response.json();

      if (result.success) {
        setCampaign(result.data);

        // If draft, fetch recipient preview
        if (['DRAFT', 'SCHEDULED'].includes(result.data.status)) {
          fetchRecipientPreview();
        }
      } else {
        setError(result.error || 'Failed to load campaign');
      }
    } catch (err) {
      setError('Failed to load campaign');
    } finally {
      setLoading(false);
    }
  };

  const fetchRecipientPreview = async () => {
    try {
      const response = await fetch(
        `/api/marketing/campaigns/${resolvedParams.id}/recipients?preview=true`
      );
      const result = await response.json();
      if (result.success) {
        setRecipientPreview(result.data);
      }
    } catch (err) {
      console.error('Failed to fetch recipient preview:', err);
    }
  };

  const handleSendCampaign = async () => {
    if (!confirm('Are you sure you want to send this campaign? This action cannot be undone.')) {
      return;
    }

    setSending(true);
    setSendResult(null);
    setError(null);

    try {
      const response = await fetch(`/api/marketing/campaigns/${resolvedParams.id}/send`, {
        method: 'POST',
      });
      const result = await response.json();

      if (result.success) {
        setSendResult(result.data);
        // Refresh campaign data
        fetchCampaign();
      } else {
        setError(result.error || 'Failed to send campaign');
      }
    } catch (err) {
      setError('Failed to send campaign');
    } finally {
      setSending(false);
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

  if (status === 'loading' || loading) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <Card className="p-8 text-center">
          <AlertCircle className="h-12 w-12 mx-auto text-red-500 mb-4" />
          <h2 className="text-xl font-semibold mb-2">Campaign Not Found</h2>
          <p className="text-gray-500 mb-4">{error || 'The campaign you are looking for does not exist.'}</p>
          <Link href="/marketing">
            <Button>Back to Marketing</Button>
          </Link>
        </Card>
      </div>
    );
  }

  const statusInfo = statusConfig[campaign.status];
  const StatusIcon = statusInfo.icon;
  const canEdit = ['DRAFT', 'SCHEDULED'].includes(campaign.status);
  const canSend = ['DRAFT', 'SCHEDULED'].includes(campaign.status);

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/marketing">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{campaign.name}</h1>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusInfo.bgColor} ${statusInfo.color}`}>
                <StatusIcon className="h-4 w-4 inline mr-1" />
                {statusInfo.label}
              </span>
            </div>
            {campaign.description && (
              <p className="text-sm text-gray-500 mt-1">{campaign.description}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={fetchCampaign}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          {canSend && (
            <Button onClick={handleSendCampaign} disabled={sending}>
              <Send className="h-4 w-4 mr-2" />
              {sending ? 'Sending...' : 'Send Now'}
            </Button>
          )}
        </div>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <Card className="p-4 bg-red-50 border-red-200">
          <div className="flex items-center gap-2 text-red-700">
            <AlertCircle className="h-5 w-5" />
            {error}
          </div>
        </Card>
      )}

      {sendResult && (
        <Card className="p-4 bg-green-50 border-green-200">
          <div className="flex items-center gap-2 text-green-700 mb-2">
            <CheckCircle className="h-5 w-5" />
            Campaign sent successfully!
          </div>
          <div className="text-sm text-green-600">
            Sent to {sendResult.sentCount} recipients ({sendResult.failedCount} failed)
          </div>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="text-sm text-gray-500">Total Recipients</div>
          <div className="text-2xl font-bold">
            {campaign.status === 'DRAFT' || campaign.status === 'SCHEDULED'
              ? recipientPreview?.totalCount || '-'
              : campaign.totalRecipients}
          </div>
        </Card>
        <Card className="p-4 bg-green-50 border-green-200">
          <div className="text-sm text-green-700">Sent</div>
          <div className="text-2xl font-bold text-green-700">{campaign.sentCount}</div>
        </Card>
        <Card className="p-4 bg-red-50 border-red-200">
          <div className="text-sm text-red-700">Failed</div>
          <div className="text-2xl font-bold text-red-700">{campaign.failedCount}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-gray-500">Delivered</div>
          <div className="text-2xl font-bold">{campaign.deliveredCount}</div>
        </Card>
      </div>

      {/* Campaign Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Column - Message Preview */}
        <Card className="p-6">
          <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Message Preview
          </h2>

          <div className="space-y-4">
            <div>
              <span className="text-sm text-gray-500">Type:</span>
              <span className="ml-2 font-medium">
                {campaign.type === 'BULK_SMS' && 'SMS'}
                {campaign.type === 'BULK_EMAIL' && 'Email'}
                {campaign.type === 'BOTH' && 'SMS + Email'}
              </span>
            </div>

            {campaign.subject && (
              <div>
                <span className="text-sm text-gray-500">Subject:</span>
                <p className="font-medium mt-1">{campaign.subject}</p>
              </div>
            )}

            <div>
              <span className="text-sm text-gray-500">Message:</span>
              <div className="mt-2 p-4 bg-gray-50 rounded-lg border">
                <p className="whitespace-pre-wrap">{campaign.messageBody}</p>
              </div>
            </div>
          </div>
        </Card>

        {/* Right Column - Details */}
        <Card className="p-6">
          <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
            <Users className="h-5 w-5" />
            Campaign Details
          </h2>

          <div className="space-y-4">
            <div>
              <span className="text-sm text-gray-500">Segment:</span>
              <span className="ml-2 font-medium">
                {campaign.segmentType === 'ALL' && 'All Clients'}
                {campaign.segmentType === 'TAGS' && `By Tags: ${campaign.segmentData?.tags?.join(', ') || 'None'}`}
                {campaign.segmentType === 'INACTIVE' && `Inactive ${campaign.segmentData?.inactiveDays || 30}+ days`}
                {campaign.segmentType === 'INSURANCE' && (campaign.segmentData?.hasInsurance ? 'Insurance Clients' : 'Non-Insurance Clients')}
              </span>
            </div>

            <div>
              <span className="text-sm text-gray-500">Created:</span>
              <span className="ml-2">{formatDate(campaign.createdAt)}</span>
            </div>

            <div>
              <span className="text-sm text-gray-500">Created by:</span>
              <span className="ml-2">{campaign.createdBy?.name || campaign.createdBy?.email}</span>
            </div>

            {campaign.scheduledAt && (
              <div>
                <span className="text-sm text-gray-500">Scheduled:</span>
                <span className="ml-2 text-blue-600">{formatDate(campaign.scheduledAt)}</span>
              </div>
            )}

            {campaign.sentAt && (
              <div>
                <span className="text-sm text-gray-500">Sent:</span>
                <span className="ml-2">{formatDate(campaign.sentAt)}</span>
              </div>
            )}

            {campaign.completedAt && (
              <div>
                <span className="text-sm text-gray-500">Completed:</span>
                <span className="ml-2">{formatDate(campaign.completedAt)}</span>
              </div>
            )}
          </div>

          {/* Recipient Preview for Draft */}
          {recipientPreview && canSend && (
            <div className="mt-6 pt-4 border-t">
              <h3 className="font-medium mb-2">Recipient Preview</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-gray-500">With Phone:</span>
                  <span className="ml-2 font-medium">{recipientPreview.withPhone}</span>
                </div>
                <div>
                  <span className="text-gray-500">With Email:</span>
                  <span className="ml-2 font-medium">{recipientPreview.withEmail}</span>
                </div>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Recipients List (for completed campaigns) */}
      {campaign.status === 'COMPLETED' && campaign.recipients.length > 0 && (
        <Card className="p-6">
          <button
            className="w-full flex items-center justify-between"
            onClick={() => setShowRecipients(!showRecipients)}
          >
            <h2 className="font-semibold text-lg flex items-center gap-2">
              <Users className="h-5 w-5" />
              Recipients ({campaign._count.recipients})
            </h2>
            {showRecipients ? (
              <ChevronUp className="h-5 w-5 text-gray-500" />
            ) : (
              <ChevronDown className="h-5 w-5 text-gray-500" />
            )}
          </button>

          {showRecipients && (
            <div className="mt-4 space-y-2">
              {campaign.recipients.map((recipient) => (
                <div
                  key={recipient.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <User className="h-4 w-4 text-gray-400" />
                    <div>
                      <div className="font-medium">{recipient.client.name}</div>
                      <div className="text-sm text-gray-500">
                        {recipient.channel === 'BULK_SMS' ? (
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {recipient.recipient}
                          </span>
                        ) : (
                          <span className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {recipient.recipient}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span
                      className={`text-sm px-2 py-1 rounded ${
                        recipient.status === 'SENT' || recipient.status === 'DELIVERED'
                          ? 'bg-green-100 text-green-700'
                          : recipient.status === 'FAILED'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {recipient.status}
                    </span>
                    {recipient.errorMessage && (
                      <div className="text-xs text-red-500 mt-1">{recipient.errorMessage}</div>
                    )}
                  </div>
                </div>
              ))}
              {campaign._count.recipients > campaign.recipients.length && (
                <p className="text-center text-sm text-gray-500 py-2">
                  Showing first {campaign.recipients.length} of {campaign._count.recipients} recipients
                </p>
              )}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

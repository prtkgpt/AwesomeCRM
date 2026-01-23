'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Megaphone,
  MessageSquare,
  Mail,
  Users,
  Tag,
  MapPin,
  Clock,
  Shield,
  Calendar,
  Send,
  Save,
  Eye,
  AlertCircle,
  CheckCircle,
  Info,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';

interface RecipientPreview {
  totalCount: number;
  withEmail: number;
  withPhone: number;
  withBoth: number;
}

export default function NewCampaignPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'BULK_SMS' | 'BULK_EMAIL' | 'BOTH'>('BULK_SMS');
  const [segmentType, setSegmentType] = useState('ALL');
  const [segmentData, setSegmentData] = useState<any>({});
  const [subject, setSubject] = useState('');
  const [messageBody, setMessageBody] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');

  // Tags for filtering
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  // UI state
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [recipientPreview, setRecipientPreview] = useState<RecipientPreview | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [createdCampaignId, setCreatedCampaignId] = useState<string | null>(null);

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

    fetchTags();
  }, [status]);

  const fetchTags = async () => {
    try {
      const response = await fetch('/api/clients');
      const result = await response.json();
      if (result.success) {
        // Extract unique tags from all clients
        const tags = new Set<string>();
        result.data.forEach((client: any) => {
          client.tags?.forEach((tag: string) => tags.add(tag));
        });
        setAvailableTags(Array.from(tags).sort());
      }
    } catch (err) {
      console.error('Failed to fetch tags:', err);
    }
  };

  // Update segment data when segment type or options change
  useEffect(() => {
    const newSegmentData: any = {};

    if (segmentType === 'TAGS' && selectedTags.length > 0) {
      newSegmentData.tags = selectedTags;
    }

    if (segmentType === 'INACTIVE') {
      newSegmentData.inactiveDays = segmentData.inactiveDays || 30;
    }

    if (segmentType === 'INSURANCE') {
      newSegmentData.hasInsurance = segmentData.hasInsurance ?? true;
    }

    setSegmentData(newSegmentData);
  }, [segmentType, selectedTags]);

  const handleSaveDraft = async () => {
    if (!name.trim()) {
      setError('Campaign name is required');
      return;
    }
    if (!messageBody.trim()) {
      setError('Message body is required');
      return;
    }
    if ((type === 'BULK_EMAIL' || type === 'BOTH') && !subject.trim()) {
      setError('Email subject is required for email campaigns');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const response = await fetch('/api/marketing/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description: description || undefined,
          type,
          segmentType,
          segmentData: Object.keys(segmentData).length > 0 ? segmentData : undefined,
          subject: subject || undefined,
          messageBody,
          scheduledAt: scheduledAt || undefined,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setCreatedCampaignId(result.data.id);
        setSuccess('Campaign saved as draft');
        router.push(`/marketing/campaigns/${result.data.id}`);
      } else {
        setError(result.error || 'Failed to save campaign');
      }
    } catch (err) {
      setError('Failed to save campaign');
    } finally {
      setSaving(false);
    }
  };

  const handlePreviewRecipients = async () => {
    setLoadingPreview(true);

    try {
      // First save the campaign to get an ID
      const saveResponse = await fetch('/api/marketing/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name || 'Untitled Campaign',
          type,
          segmentType,
          segmentData: Object.keys(segmentData).length > 0 ? segmentData : undefined,
          messageBody: messageBody || 'Preview message',
        }),
      });

      const saveResult = await saveResponse.json();

      if (saveResult.success) {
        setCreatedCampaignId(saveResult.data.id);

        // Now get recipients preview
        const previewResponse = await fetch(
          `/api/marketing/campaigns/${saveResult.data.id}/recipients?preview=true`
        );
        const previewResult = await previewResponse.json();

        if (previewResult.success) {
          setRecipientPreview(previewResult.data);
        }
      }
    } catch (err) {
      console.error('Failed to preview recipients:', err);
    } finally {
      setLoadingPreview(false);
    }
  };

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  if (status === 'loading') {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/marketing">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Megaphone className="h-6 w-6" />
            Create Campaign
          </h1>
          <p className="text-sm text-gray-500">
            Set up a new marketing campaign
          </p>
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
      {success && (
        <Card className="p-4 bg-green-50 border-green-200">
          <div className="flex items-center gap-2 text-green-700">
            <CheckCircle className="h-5 w-5" />
            {success}
          </div>
        </Card>
      )}

      {/* Campaign Details */}
      <Card className="p-6 space-y-4">
        <h2 className="font-semibold text-lg">Campaign Details</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              Campaign Name *
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Spring Cleaning Special"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              Campaign Type *
            </label>
            <Select value={type} onChange={(e) => setType(e.target.value as any)}>
              <option value="BULK_SMS">SMS Only</option>
              <option value="BULK_EMAIL">Email Only</option>
              <option value="BOTH">Both SMS + Email</option>
            </Select>
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700 mb-1 block">
            Description (optional)
          </label>
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Brief description of this campaign"
          />
        </div>
      </Card>

      {/* Audience Targeting */}
      <Card className="p-6 space-y-4">
        <h2 className="font-semibold text-lg flex items-center gap-2">
          <Users className="h-5 w-5" />
          Audience Targeting
        </h2>

        <div>
          <label className="text-sm font-medium text-gray-700 mb-1 block">
            Target Audience
          </label>
          <Select value={segmentType} onChange={(e) => setSegmentType(e.target.value)}>
            <option value="ALL">All Clients (opted-in)</option>
            <option value="TAGS">By Tags</option>
            <option value="INACTIVE">Inactive Clients</option>
            <option value="INSURANCE">Insurance Status</option>
            <option value="LOCATION">By Location</option>
          </Select>
        </div>

        {/* Tag Selection */}
        {segmentType === 'TAGS' && (
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Select Tags
            </label>
            <div className="flex flex-wrap gap-2">
              {availableTags.length === 0 ? (
                <p className="text-sm text-gray-500">No tags found. Add tags to clients first.</p>
              ) : (
                availableTags.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                      selectedTags.includes(tag)
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <Tag className="h-3 w-3 inline mr-1" />
                    {tag}
                  </button>
                ))
              )}
            </div>
            {selectedTags.length > 0 && (
              <p className="text-sm text-gray-500 mt-2">
                Targeting clients with tags: {selectedTags.join(', ')}
              </p>
            )}
          </div>
        )}

        {/* Inactive Days */}
        {segmentType === 'INACTIVE' && (
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              Days Since Last Booking
            </label>
            <Select
              value={segmentData.inactiveDays?.toString() || '30'}
              onChange={(e) =>
                setSegmentData({ ...segmentData, inactiveDays: parseInt(e.target.value, 10) })
              }
            >
              <option value="30">30 days</option>
              <option value="60">60 days</option>
              <option value="90">90 days</option>
              <option value="180">6 months</option>
              <option value="365">1 year</option>
            </Select>
            <p className="text-sm text-gray-500 mt-1">
              Target clients who haven't booked in the selected timeframe
            </p>
          </div>
        )}

        {/* Insurance Status */}
        {segmentType === 'INSURANCE' && (
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              Insurance Status
            </label>
            <Select
              value={segmentData.hasInsurance?.toString() || 'true'}
              onChange={(e) =>
                setSegmentData({ ...segmentData, hasInsurance: e.target.value === 'true' })
              }
            >
              <option value="true">Has Insurance</option>
              <option value="false">No Insurance</option>
            </Select>
          </div>
        )}

        {/* Recipient Preview */}
        <div className="pt-4 border-t">
          <Button variant="outline" onClick={handlePreviewRecipients} disabled={loadingPreview}>
            <Eye className="h-4 w-4 mr-2" />
            {loadingPreview ? 'Loading...' : 'Preview Recipients'}
          </Button>

          {recipientPreview && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-2 text-blue-700 mb-2">
                <Users className="h-5 w-5" />
                <span className="font-semibold">{recipientPreview.totalCount} recipients</span>
              </div>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">With Phone:</span>
                  <span className="ml-2 font-medium">{recipientPreview.withPhone}</span>
                </div>
                <div>
                  <span className="text-gray-600">With Email:</span>
                  <span className="ml-2 font-medium">{recipientPreview.withEmail}</span>
                </div>
                <div>
                  <span className="text-gray-600">With Both:</span>
                  <span className="ml-2 font-medium">{recipientPreview.withBoth}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Message Content */}
      <Card className="p-6 space-y-4">
        <h2 className="font-semibold text-lg flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Message Content
        </h2>

        {/* Email Subject */}
        {(type === 'BULK_EMAIL' || type === 'BOTH') && (
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              Email Subject *
            </label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g., Special Offer Just For You!"
            />
          </div>
        )}

        {/* Message Body */}
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1 block">
            Message Body *
          </label>
          <textarea
            value={messageBody}
            onChange={(e) => setMessageBody(e.target.value)}
            placeholder="Hi {{clientName}}! We have a special offer for you..."
            rows={6}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="flex justify-between mt-1">
            <p className="text-xs text-gray-500">
              Available placeholders: {'{{clientName}}'}, {'{{businessName}}'}
            </p>
            <p className="text-xs text-gray-500">{messageBody.length} / 1600 characters</p>
          </div>
        </div>

        {/* Info about SMS length */}
        {(type === 'BULK_SMS' || type === 'BOTH') && messageBody.length > 160 && (
          <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-lg text-amber-700 text-sm">
            <Info className="h-4 w-4 mt-0.5" />
            <span>
              Messages over 160 characters will be sent as multiple SMS segments, which may increase costs.
            </span>
          </div>
        )}
      </Card>

      {/* Scheduling */}
      <Card className="p-6 space-y-4">
        <h2 className="font-semibold text-lg flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Scheduling (Optional)
        </h2>

        <div>
          <label className="text-sm font-medium text-gray-700 mb-1 block">
            Schedule for Later
          </label>
          <Input
            type="datetime-local"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
            min={new Date().toISOString().slice(0, 16)}
          />
          <p className="text-xs text-gray-500 mt-1">
            Leave empty to save as draft (can be sent manually later)
          </p>
        </div>
      </Card>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3">
        <Link href="/marketing">
          <Button variant="outline">Cancel</Button>
        </Link>
        <Button variant="outline" onClick={handleSaveDraft} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Saving...' : 'Save Draft'}
        </Button>
      </div>
    </div>
  );
}

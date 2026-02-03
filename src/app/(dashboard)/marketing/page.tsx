'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { motion, AnimatePresence } from 'framer-motion';
import { tabContentVariants } from '@/lib/animations';
import {
  Send,
  Megaphone,
  FileText,
  Users,
  Check,
  AlertCircle,
  Trash2,
  Plus,
  Mail,
  Phone,
  Search,
  ArrowRight,
  Clock,
  CheckCircle,
  XCircle,
  TrendingDown,
  RefreshCw,
  Zap,
  ToggleLeft,
  ToggleRight,
  DollarSign,
  UserCheck,
  ChevronDown,
  ChevronUp,
  Edit3,
  Save,
  Tag,
  Percent,
  Copy,
  Calendar,
  Eye,
  ChevronRight,
} from 'lucide-react';

type MarketingTab = 'messaging' | 'campaigns' | 'templates' | 'retention' | 'automations' | 'discounts';

interface Recipient {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  tags: string[];
}

interface CampaignRecipientData {
  id: string;
  clientId: string;
  channel: 'SMS' | 'EMAIL' | 'BOTH';
  status: string;
  sentAt: string | null;
  client: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    tags: string[];
  };
}

interface Campaign {
  id: string;
  name: string;
  channel: 'SMS' | 'EMAIL' | 'BOTH';
  status: string;
  subject: string | null;
  body: string;
  segmentFilter: any;
  recipientCount: number;
  sentCount: number;
  failedCount: number;
  scheduledFor: string | null;
  sentAt: string | null;
  createdAt: string;
  user: { name: string };
  _count?: { recipients: number };
}

interface RetentionData {
  summary: {
    totalClients: number;
    activeClients: number;
    atRiskCount: number;
    dormantCount: number;
    lostCount: number;
    neverBooked: number;
    recentCampaigns: number;
    marketingMessagesSent: number;
  };
  atRiskClients: (Recipient & { bookings: { scheduledDate: string; price: number }[] })[];
  dormantClients: (Recipient & { bookings: { scheduledDate: string; price: number }[] })[];
  lostClients: (Recipient & { bookings: { scheduledDate: string; price: number }[] })[];
}

interface WinBackStep {
  days: number;
  channel: 'SMS' | 'EMAIL' | 'BOTH';
  template: string;
  emailSubject?: string;
  discountPercent: number;
}

interface WinBackAttempt {
  id: string;
  client: { id: string; name: string; email: string | null; phone: string | null };
  step: number;
  channel: string;
  discountPercent: number;
  result: string;
  sentAt: string;
  convertedAt: string | null;
  convertedRevenue: number | null;
}

interface WinBackData {
  enabled: boolean;
  config: { steps: WinBackStep[] };
  stats: {
    totalAttempts: number;
    totalConverted: number;
    conversionRate: number;
    last30DaysAttempts: number;
    last30DaysConverted: number;
    revenueRecovered: number;
    eligibleClients: number;
  };
  recentAttempts: WinBackAttempt[];
}

interface MessageTemplate {
  id: string;
  type: string;
  name: string;
  template: string;
  isActive: boolean;
}

interface DiscountCode {
  id: string;
  code: string;
  discountType: 'PERCENT' | 'FIXED';
  discountValue: number;
  validFrom: string;
  validUntil: string;
  isActive: boolean;
  maxUses: number | null;
  usedCount: number;
  createdAt: string;
}

export default function MarketingPage() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState<MarketingTab>('messaging');

  // Messaging state
  const [channel, setChannel] = useState<'SMS' | 'EMAIL' | 'BOTH'>('SMS');
  const [filterTags, setFilterTags] = useState<string[]>([]);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [messageBody, setMessageBody] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [loadingRecipients, setLoadingRecipients] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ sentCount: number; failedCount: number } | null>(null);
  const [recipientSearch, setRecipientSearch] = useState('');

  // Campaigns state
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loadingCampaigns, setLoadingCampaigns] = useState(false);
  const [showCampaignForm, setShowCampaignForm] = useState(false);
  const [campaignForm, setCampaignForm] = useState({
    name: '',
    channel: 'SMS' as 'SMS' | 'EMAIL' | 'BOTH',
    subject: '',
    body: '',
    tags: [] as string[],
    noBookingDays: 0,
  });
  const [savingCampaign, setSavingCampaign] = useState(false);
  const [sendingCampaignId, setSendingCampaignId] = useState<string | null>(null);
  const [expandedCampaignId, setExpandedCampaignId] = useState<string | null>(null);
  const [campaignRecipients, setCampaignRecipients] = useState<CampaignRecipientData[]>([]);
  const [loadingRecipientsCampaign, setLoadingRecipientsCampaign] = useState(false);

  // Templates state
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<string | null>(null);
  const [templateForm, setTemplateForm] = useState({ name: '', template: '', type: 'CUSTOM' });
  const [savingTemplate, setSavingTemplate] = useState(false);

  // Retention state
  const [retention, setRetention] = useState<RetentionData | null>(null);
  const [loadingRetention, setLoadingRetention] = useState(false);
  const [retentionTab, setRetentionTab] = useState<'at_risk' | 'dormant' | 'lost'>('at_risk');

  // Win-back automations state
  const [winBack, setWinBack] = useState<WinBackData | null>(null);
  const [loadingWinBack, setLoadingWinBack] = useState(false);
  const [savingWinBack, setSavingWinBack] = useState(false);
  const [editingSteps, setEditingSteps] = useState(false);
  const [editSteps, setEditSteps] = useState<WinBackStep[]>([]);
  const [expandedStep, setExpandedStep] = useState<number | null>(null);

  // Discounts state
  const [discounts, setDiscounts] = useState<DiscountCode[]>([]);
  const [loadingDiscounts, setLoadingDiscounts] = useState(false);
  const [showDiscountForm, setShowDiscountForm] = useState(false);
  const [savingDiscount, setSavingDiscount] = useState(false);
  const [editingDiscountId, setEditingDiscountId] = useState<string | null>(null);
  const [discountForm, setDiscountForm] = useState({
    code: '',
    discountType: 'PERCENT' as 'PERCENT' | 'FIXED',
    discountValue: '',
    validFrom: '',
    validUntil: '',
    maxUses: '',
  });
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const availableTags = ['VIP', 'Weekly', 'Monthly', 'Biweekly', 'One-time', 'Pain'];

  // Fetch recipients when filters change
  const fetchRecipients = useCallback(async () => {
    setLoadingRecipients(true);
    try {
      const res = await fetch('/api/marketing/recipients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tags: filterTags.length > 0 ? filterTags : undefined, channel }),
      });
      const data = await res.json();
      if (data.success) {
        setRecipients(data.data.recipients);
        if (selectAll) {
          setSelectedIds(data.data.recipients.map((r: Recipient) => r.id));
        }
      }
    } catch {
      console.error('Failed to fetch recipients');
    } finally {
      setLoadingRecipients(false);
    }
  }, [filterTags, channel, selectAll]);

  const fetchCampaigns = useCallback(async () => {
    setLoadingCampaigns(true);
    try {
      const res = await fetch('/api/marketing/campaigns');
      const data = await res.json();
      if (data.success) setCampaigns(data.data);
    } catch {
      console.error('Failed to fetch campaigns');
    } finally {
      setLoadingCampaigns(false);
    }
  }, []);

  const fetchTemplates = useCallback(async () => {
    setLoadingTemplates(true);
    try {
      const res = await fetch('/api/messages/templates');
      const data = await res.json();
      if (data.success) setTemplates(data.data);
    } catch {
      console.error('Failed to fetch templates');
    } finally {
      setLoadingTemplates(false);
    }
  }, []);

  const fetchRetention = useCallback(async () => {
    setLoadingRetention(true);
    try {
      const res = await fetch('/api/marketing/retention');
      const data = await res.json();
      if (data.success) setRetention(data.data);
    } catch {
      console.error('Failed to fetch retention');
    } finally {
      setLoadingRetention(false);
    }
  }, []);

  const fetchWinBack = useCallback(async () => {
    setLoadingWinBack(true);
    try {
      const res = await fetch('/api/marketing/winback');
      const data = await res.json();
      if (data.success) {
        setWinBack(data.data);
        if (!editingSteps) {
          setEditSteps(data.data.config.steps);
        }
      }
    } catch {
      console.error('Failed to fetch win-back data');
    } finally {
      setLoadingWinBack(false);
    }
  }, [editingSteps]);

  const toggleWinBack = async () => {
    if (!winBack) return;
    setSavingWinBack(true);
    try {
      const res = await fetch('/api/marketing/winback', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !winBack.enabled }),
      });
      const data = await res.json();
      if (data.success) {
        setWinBack({ ...winBack, enabled: !winBack.enabled });
      }
    } catch {
      console.error('Failed to toggle win-back');
    } finally {
      setSavingWinBack(false);
    }
  };

  const saveWinBackConfig = async () => {
    setSavingWinBack(true);
    try {
      const res = await fetch('/api/marketing/winback', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config: { steps: editSteps } }),
      });
      const data = await res.json();
      if (data.success) {
        setEditingSteps(false);
        fetchWinBack();
      }
    } catch {
      console.error('Failed to save win-back config');
    } finally {
      setSavingWinBack(false);
    }
  };

  const fetchDiscounts = useCallback(async () => {
    setLoadingDiscounts(true);
    try {
      const res = await fetch('/api/marketing/discounts');
      const data = await res.json();
      if (data.success) setDiscounts(data.data);
    } catch {
      console.error('Failed to fetch discounts');
    } finally {
      setLoadingDiscounts(false);
    }
  }, []);

  const handleSaveDiscount = async () => {
    setSavingDiscount(true);
    try {
      const url = editingDiscountId
        ? `/api/marketing/discounts/${editingDiscountId}`
        : '/api/marketing/discounts';
      const res = await fetch(url, {
        method: editingDiscountId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...discountForm,
          discountValue: parseFloat(discountForm.discountValue),
          maxUses: discountForm.maxUses ? parseInt(discountForm.maxUses) : null,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowDiscountForm(false);
        setEditingDiscountId(null);
        setDiscountForm({ code: '', discountType: 'PERCENT', discountValue: '', validFrom: '', validUntil: '', maxUses: '' });
        fetchDiscounts();
      } else {
        alert(data.error || 'Failed to save discount');
      }
    } catch {
      alert('Failed to save discount');
    } finally {
      setSavingDiscount(false);
    }
  };

  const handleDeleteDiscount = async (id: string) => {
    if (!confirm('Delete this discount code?')) return;
    try {
      const res = await fetch(`/api/marketing/discounts/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) fetchDiscounts();
    } catch {
      console.error('Failed to delete discount');
    }
  };

  const handleToggleDiscount = async (id: string, currentActive: boolean) => {
    try {
      const res = await fetch(`/api/marketing/discounts/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentActive }),
      });
      const data = await res.json();
      if (data.success) fetchDiscounts();
    } catch {
      console.error('Failed to toggle discount');
    }
  };

  const copyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
    } catch {
      // fallback
      const textarea = document.createElement('textarea');
      textarea.value = code;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      try { document.execCommand('copy'); setCopiedCode(code); setTimeout(() => setCopiedCode(null), 2000); } catch {}
      document.body.removeChild(textarea);
    }
  };

  useEffect(() => {
    if (activeTab === 'messaging') fetchRecipients();
    if (activeTab === 'campaigns') fetchCampaigns();
    if (activeTab === 'templates') fetchTemplates();
    if (activeTab === 'retention') fetchRetention();
    if (activeTab === 'automations') fetchWinBack();
    if (activeTab === 'discounts') fetchDiscounts();
  }, [activeTab, fetchRecipients, fetchCampaigns, fetchTemplates, fetchRetention, fetchWinBack, fetchDiscounts]);

  const fetchCampaignRecipients = async (campaignId: string) => {
    if (expandedCampaignId === campaignId) {
      setExpandedCampaignId(null);
      setCampaignRecipients([]);
      return;
    }
    setExpandedCampaignId(campaignId);
    setLoadingRecipientsCampaign(true);
    try {
      const res = await fetch(`/api/marketing/campaigns/${campaignId}/recipients`);
      const data = await res.json();
      if (data.success) setCampaignRecipients(data.data);
      else setCampaignRecipients([]);
    } catch {
      setCampaignRecipients([]);
    } finally {
      setLoadingRecipientsCampaign(false);
    }
  };

  const handleSendBulk = async () => {
    if (selectedIds.length === 0 || !messageBody) return;
    setSending(true);
    setSendResult(null);
    try {
      const res = await fetch('/api/marketing/send-bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientIds: selectedIds,
          channel,
          subject: emailSubject || undefined,
          message: messageBody,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSendResult(data.data);
        setMessageBody('');
        setEmailSubject('');
      } else {
        alert(data.error || 'Failed to send');
      }
    } catch {
      alert('Failed to send messages');
    } finally {
      setSending(false);
    }
  };

  const handleCreateCampaign = async () => {
    if (!campaignForm.name || !campaignForm.body) return;
    setSavingCampaign(true);
    try {
      const segmentFilter: any = {};
      if (campaignForm.tags.length > 0) segmentFilter.tags = campaignForm.tags;
      if (campaignForm.noBookingDays > 0) segmentFilter.noBookingDays = campaignForm.noBookingDays;

      const res = await fetch('/api/marketing/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: campaignForm.name,
          channel: campaignForm.channel,
          subject: campaignForm.subject || undefined,
          body: campaignForm.body,
          segmentFilter: Object.keys(segmentFilter).length > 0 ? segmentFilter : undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowCampaignForm(false);
        setCampaignForm({ name: '', channel: 'SMS', subject: '', body: '', tags: [], noBookingDays: 0 });
        fetchCampaigns();
      } else {
        alert(data.error || 'Failed to create campaign');
      }
    } catch {
      alert('Failed to create campaign');
    } finally {
      setSavingCampaign(false);
    }
  };

  const handleSendCampaign = async (id: string) => {
    if (!confirm('Send this campaign to all matching recipients? This cannot be undone.')) return;
    setSendingCampaignId(id);
    try {
      const res = await fetch(`/api/marketing/campaigns/${id}/send`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        alert(`Campaign sent! ${data.data.sentCount} sent, ${data.data.failedCount} failed.`);
        fetchCampaigns();
      } else {
        alert(data.error || 'Failed to send campaign');
      }
    } catch {
      alert('Failed to send campaign');
    } finally {
      setSendingCampaignId(null);
    }
  };

  const handleDeleteCampaign = async (id: string) => {
    if (!confirm('Delete this campaign?')) return;
    try {
      await fetch(`/api/marketing/campaigns/${id}`, { method: 'DELETE' });
      fetchCampaigns();
    } catch {
      alert('Failed to delete');
    }
  };

  const handleSaveTemplate = async () => {
    if (!templateForm.name || !templateForm.template) return;
    setSavingTemplate(true);
    try {
      const res = await fetch('/api/messages/templates', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: templateForm.type,
          name: templateForm.name,
          template: templateForm.template,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setEditingTemplate(null);
        setTemplateForm({ name: '', template: '', type: 'CUSTOM' });
        fetchTemplates();
      }
    } catch {
      alert('Failed to save template');
    } finally {
      setSavingTemplate(false);
    }
  };

  const toggleRecipient = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedIds([]);
      setSelectAll(false);
    } else {
      setSelectedIds(filteredRecipients.map((r) => r.id));
      setSelectAll(true);
    }
  };

  const filteredRecipients = recipients.filter((r) =>
    !recipientSearch || r.name.toLowerCase().includes(recipientSearch.toLowerCase()) ||
    r.email?.toLowerCase().includes(recipientSearch.toLowerCase()) ||
    r.phone?.includes(recipientSearch)
  );

  const tabs = [
    { id: 'messaging' as MarketingTab, label: 'Messaging', icon: Send },
    { id: 'campaigns' as MarketingTab, label: 'Campaigns', icon: Megaphone },
    { id: 'templates' as MarketingTab, label: 'Templates', icon: FileText },
    { id: 'retention' as MarketingTab, label: 'Customer Retention', icon: Users },
    { id: 'automations' as MarketingTab, label: 'Automations', icon: Zap },
    { id: 'discounts' as MarketingTab, label: 'Discounts', icon: Tag },
  ];

  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const daysAgo = (d: string) => Math.floor((Date.now() - new Date(d).getTime()) / (1000 * 60 * 60 * 24));

  const statusBadge = (status: string) => {
    const styles: Record<string, string> = {
      DRAFT: 'bg-gray-100 text-gray-700',
      SCHEDULED: 'bg-blue-100 text-blue-700',
      SENDING: 'bg-yellow-100 text-yellow-700',
      SENT: 'bg-green-100 text-green-700',
      FAILED: 'bg-red-100 text-red-700',
      CANCELLED: 'bg-gray-100 text-gray-500',
    };
    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100'}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Marketing</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
          Send messages, manage campaigns, and retain customers
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700 mb-6 overflow-x-auto pb-px">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold whitespace-nowrap transition-all duration-200 border-b-2 ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:border-gray-300'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          variants={tabContentVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
        >
          {/* ============ MESSAGING TAB ============ */}
          {activeTab === 'messaging' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left: Recipient Selection */}
              <Card className="p-6">
                <h2 className="font-semibold text-lg mb-4">Select Recipients</h2>

                {/* Channel */}
                <div className="mb-4">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-2">Channel</label>
                  <div className="flex gap-2">
                    {(['SMS', 'EMAIL', 'BOTH'] as const).map((ch) => (
                      <button
                        key={ch}
                        onClick={() => setChannel(ch)}
                        className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
                          channel === ch
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200'
                        }`}
                      >
                        {ch === 'SMS' && <Phone className="inline h-3.5 w-3.5 mr-1" />}
                        {ch === 'EMAIL' && <Mail className="inline h-3.5 w-3.5 mr-1" />}
                        {ch === 'BOTH' && <><Phone className="inline h-3.5 w-3.5 mr-1" /><Mail className="inline h-3.5 w-3.5" /></>}
                        {' '}{ch}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Tag Filter */}
                <div className="mb-4">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-2">Filter by Tag</label>
                  <div className="flex flex-wrap gap-2">
                    {availableTags.map((tag) => (
                      <button
                        key={tag}
                        onClick={() => {
                          setFilterTags((prev) =>
                            prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
                          );
                        }}
                        className={`px-2.5 py-1 rounded-full text-xs font-medium transition ${
                          filterTags.includes(tag)
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200'
                        }`}
                      >
                        {tag}
                      </button>
                    ))}
                    {filterTags.length > 0 && (
                      <button
                        onClick={() => setFilterTags([])}
                        className="text-xs text-red-500 hover:underline ml-1"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>

                {/* Search */}
                <div className="mb-3 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search recipients..."
                    value={recipientSearch}
                    onChange={(e) => setRecipientSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>

                {/* Recipients List */}
                <div className="border rounded-lg max-h-80 overflow-y-auto">
                  <div className="sticky top-0 bg-gray-50 dark:bg-gray-900 px-3 py-2 border-b flex items-center justify-between">
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectAll}
                        onChange={handleSelectAll}
                        className="w-4 h-4 rounded text-blue-600"
                      />
                      Select all ({filteredRecipients.length})
                    </label>
                    <span className="text-xs text-gray-500">{selectedIds.length} selected</span>
                  </div>
                  {loadingRecipients ? (
                    <div className="p-4 text-center text-gray-500 text-sm">Loading...</div>
                  ) : filteredRecipients.length === 0 ? (
                    <div className="p-4 text-center text-gray-500 text-sm">No recipients found</div>
                  ) : (
                    filteredRecipients.map((r) => (
                      <label
                        key={r.id}
                        className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer border-b last:border-0"
                      >
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(r.id)}
                          onChange={() => toggleRecipient(r.id)}
                          className="w-4 h-4 rounded text-blue-600"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{r.name}</p>
                          <p className="text-xs text-gray-500 truncate">
                            {r.phone || 'No phone'} {r.email ? `• ${r.email}` : ''}
                          </p>
                        </div>
                        {r.tags.length > 0 && (
                          <div className="flex gap-1">
                            {r.tags.slice(0, 2).map((t) => (
                              <span key={t} className="text-[10px] bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded">
                                {t}
                              </span>
                            ))}
                          </div>
                        )}
                      </label>
                    ))
                  )}
                </div>
              </Card>

              {/* Right: Compose */}
              <Card className="p-6">
                <h2 className="font-semibold text-lg mb-4">Compose Message</h2>

                {(channel === 'EMAIL' || channel === 'BOTH') && (
                  <div className="mb-4">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">
                      Email Subject
                    </label>
                    <Input
                      value={emailSubject}
                      onChange={(e) => setEmailSubject(e.target.value)}
                      placeholder="e.g. Special offer from {{company.name}}"
                    />
                  </div>
                )}

                <div className="mb-3">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">
                    Message
                  </label>
                  <textarea
                    value={messageBody}
                    onChange={(e) => setMessageBody(e.target.value)}
                    placeholder={`Hi {{client.name}}, we have a special offer for you...`}
                    rows={6}
                    className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Variables: {'{{client.name}}'}, {'{{company.name}}'}
                  </p>
                </div>

                {/* Preview */}
                {messageBody && (
                  <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <p className="text-xs font-medium text-gray-500 mb-1">Preview</p>
                    <p className="text-sm">
                      {messageBody
                        .replace(/\{\{client\.name\}\}/g, 'John Smith')
                        .replace(/\{\{clientName\}\}/g, 'John Smith')
                        .replace(/\{\{company\.name\}\}/g, 'Your Company')}
                    </p>
                  </div>
                )}

                {sendResult && (
                  <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <p className="text-sm font-medium text-green-800 dark:text-green-200">
                        Sent: {sendResult.sentCount} {sendResult.failedCount > 0 && `• Failed: ${sendResult.failedCount}`}
                      </p>
                    </div>
                  </div>
                )}

                <Button
                  onClick={handleSendBulk}
                  disabled={sending || selectedIds.length === 0 || !messageBody}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  <Send className="h-4 w-4 mr-2" />
                  {sending ? 'Sending...' : `Send to ${selectedIds.length} recipient${selectedIds.length !== 1 ? 's' : ''}`}
                </Button>
              </Card>
            </div>
          )}

          {/* ============ CAMPAIGNS TAB ============ */}
          {activeTab === 'campaigns' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-lg">Campaigns</h2>
                <Button onClick={() => setShowCampaignForm(true)} size="sm">
                  <Plus className="h-4 w-4 mr-1" /> New Campaign
                </Button>
              </div>

              {/* New Campaign Form */}
              {showCampaignForm && (
                <Card className="p-6 mb-6">
                  <h3 className="font-semibold mb-4">Create Campaign</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="text-sm font-medium block mb-1">Campaign Name</label>
                      <Input
                        value={campaignForm.name}
                        onChange={(e) => setCampaignForm({ ...campaignForm, name: e.target.value })}
                        placeholder="e.g. Spring Cleaning Promo"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium block mb-1">Channel</label>
                      <select
                        value={campaignForm.channel}
                        onChange={(e) => setCampaignForm({ ...campaignForm, channel: e.target.value as any })}
                        className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
                      >
                        <option value="SMS">SMS</option>
                        <option value="EMAIL">Email</option>
                        <option value="BOTH">Both</option>
                      </select>
                    </div>
                  </div>

                  {(campaignForm.channel === 'EMAIL' || campaignForm.channel === 'BOTH') && (
                    <div className="mb-4">
                      <label className="text-sm font-medium block mb-1">Email Subject</label>
                      <Input
                        value={campaignForm.subject}
                        onChange={(e) => setCampaignForm({ ...campaignForm, subject: e.target.value })}
                        placeholder="Email subject line"
                      />
                    </div>
                  )}

                  <div className="mb-4">
                    <label className="text-sm font-medium block mb-1">Message Body</label>
                    <textarea
                      value={campaignForm.body}
                      onChange={(e) => setCampaignForm({ ...campaignForm, body: e.target.value })}
                      placeholder={`Hi {{client.name}}, ...`}
                      rows={4}
                      className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
                    />
                  </div>

                  {/* Audience Segment */}
                  <div className="mb-4">
                    <label className="text-sm font-medium block mb-2">Target Audience</label>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {availableTags.map((tag) => (
                        <button
                          key={tag}
                          onClick={() => {
                            const tags = campaignForm.tags.includes(tag)
                              ? campaignForm.tags.filter((t) => t !== tag)
                              : [...campaignForm.tags, tag];
                            setCampaignForm({ ...campaignForm, tags });
                          }}
                          className={`px-2.5 py-1 rounded-full text-xs font-medium transition ${
                            campaignForm.tags.includes(tag)
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                          }`}
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">No booking in last</span>
                      <Input
                        type="number"
                        value={campaignForm.noBookingDays || ''}
                        onChange={(e) => setCampaignForm({ ...campaignForm, noBookingDays: parseInt(e.target.value) || 0 })}
                        className="w-20"
                        placeholder="0"
                      />
                      <span className="text-sm text-gray-600">days</span>
                    </div>
                    {!campaignForm.tags.length && !campaignForm.noBookingDays && (
                      <p className="text-xs text-gray-500 mt-1">No filters = send to all clients</p>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button onClick={handleCreateCampaign} disabled={savingCampaign || !campaignForm.name || !campaignForm.body}>
                      {savingCampaign ? 'Saving...' : 'Save as Draft'}
                    </Button>
                    <Button variant="outline" onClick={() => setShowCampaignForm(false)}>Cancel</Button>
                  </div>
                </Card>
              )}

              {/* Campaign List */}
              {loadingCampaigns ? (
                <Card className="p-6 text-center text-gray-500">Loading campaigns...</Card>
              ) : campaigns.length === 0 ? (
                <Card className="p-8 text-center">
                  <Megaphone className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-500">No campaigns yet. Create your first one.</p>
                </Card>
              ) : (
                <div className="space-y-3">
                  {campaigns.map((c) => (
                    <Card key={c.id} className="overflow-hidden">
                      <div className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold text-sm truncate">{c.name}</h3>
                              {statusBadge(c.status)}
                              <span className="text-xs text-gray-500">{c.channel}</span>
                            </div>
                            <p className="text-xs text-gray-500 truncate">{c.body}</p>
                            <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                              <span>{formatDate(c.createdAt)}</span>
                              {c.status === 'SENT' && (
                                <>
                                  <span className="text-green-600">{c.sentCount} sent</span>
                                  {c.failedCount > 0 && <span className="text-red-600">{c.failedCount} failed</span>}
                                </>
                              )}
                              <span>by {c.user.name}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 ml-4">
                            {(c.status === 'SENT' || c.status === 'FAILED' || c.status === 'SENDING') && (c._count?.recipients || 0) > 0 && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => fetchCampaignRecipients(c.id)}
                                className="text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                              >
                                <Eye className="h-3.5 w-3.5 mr-1" />
                                {c._count?.recipients || c.recipientCount} recipients
                                <ChevronDown className={`h-3.5 w-3.5 ml-1 transition-transform ${expandedCampaignId === c.id ? 'rotate-180' : ''}`} />
                              </Button>
                            )}
                            {c.status === 'DRAFT' && (
                              <Button
                                size="sm"
                                onClick={() => handleSendCampaign(c.id)}
                                disabled={sendingCampaignId === c.id}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                <Send className="h-3.5 w-3.5 mr-1" />
                                {sendingCampaignId === c.id ? 'Sending...' : 'Send'}
                              </Button>
                            )}
                            {(c.status === 'DRAFT' || c.status === 'SENT' || c.status === 'FAILED') && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDeleteCampaign(c.id)}
                                className="text-red-600 hover:bg-red-50"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Expanded Recipients List */}
                      {expandedCampaignId === c.id && (
                        <div className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                              <Users className="h-4 w-4" />
                              Recipients ({campaignRecipients.length})
                            </h4>
                            <div className="flex items-center gap-3 text-xs">
                              <span className="flex items-center gap-1 text-green-600">
                                <CheckCircle className="h-3 w-3" />
                                {campaignRecipients.filter(r => r.status === 'SENT').length} sent
                              </span>
                              {campaignRecipients.filter(r => r.status === 'FAILED').length > 0 && (
                                <span className="flex items-center gap-1 text-red-600">
                                  <XCircle className="h-3 w-3" />
                                  {campaignRecipients.filter(r => r.status === 'FAILED').length} failed
                                </span>
                              )}
                              {campaignRecipients.filter(r => r.status === 'PENDING').length > 0 && (
                                <span className="flex items-center gap-1 text-gray-500">
                                  <Clock className="h-3 w-3" />
                                  {campaignRecipients.filter(r => r.status === 'PENDING').length} pending
                                </span>
                              )}
                            </div>
                          </div>
                          {loadingRecipientsCampaign ? (
                            <div className="p-6 text-center text-gray-500 text-sm">Loading recipients...</div>
                          ) : campaignRecipients.length === 0 ? (
                            <div className="p-6 text-center text-gray-500 text-sm">No recipient data available</div>
                          ) : (
                            <div className="max-h-80 overflow-y-auto divide-y divide-gray-200 dark:divide-gray-700">
                              {campaignRecipients.map((r) => (
                                <div key={r.id} className="px-4 py-2.5 flex items-center justify-between hover:bg-gray-100 dark:hover:bg-gray-800">
                                  <div className="flex items-center gap-3 min-w-0 flex-1">
                                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                                      r.status === 'SENT' ? 'bg-green-500' :
                                      r.status === 'FAILED' ? 'bg-red-500' :
                                      'bg-gray-400'
                                    }`} />
                                    <div className="min-w-0 flex-1">
                                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                        {r.client.name}
                                      </p>
                                      <p className="text-xs text-gray-500 truncate">
                                        {r.channel === 'SMS' || r.channel === 'BOTH' ? r.client.phone || '' : ''}
                                        {r.channel === 'BOTH' && r.client.phone && r.client.email ? ' • ' : ''}
                                        {r.channel === 'EMAIL' || r.channel === 'BOTH' ? r.client.email || '' : ''}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-3 ml-3">
                                    {r.client.tags.length > 0 && (
                                      <div className="hidden sm:flex gap-1">
                                        {r.client.tags.slice(0, 2).map((t) => (
                                          <span key={t} className="text-[10px] bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 rounded">
                                            {t}
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                      r.status === 'SENT' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                                      r.status === 'FAILED' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                                      'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                                    }`}>
                                      {r.status}
                                    </span>
                                    {r.sentAt && (
                                      <span className="text-xs text-gray-400 hidden sm:inline">
                                        {new Date(r.sentAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ============ TEMPLATES TAB ============ */}
          {activeTab === 'templates' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-lg">Message Templates</h2>
                <Button
                  size="sm"
                  onClick={() => {
                    setEditingTemplate('new');
                    setTemplateForm({ name: '', template: '', type: 'CUSTOM' });
                  }}
                >
                  <Plus className="h-4 w-4 mr-1" /> New Template
                </Button>
              </div>

              {/* Template Editor */}
              {editingTemplate && (
                <Card className="p-6 mb-6">
                  <h3 className="font-semibold mb-4">{editingTemplate === 'new' ? 'New Template' : 'Edit Template'}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="text-sm font-medium block mb-1">Template Name</label>
                      <Input
                        value={templateForm.name}
                        onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                        placeholder="e.g. Welcome Back Offer"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium block mb-1">Type</label>
                      <select
                        value={templateForm.type}
                        onChange={(e) => setTemplateForm({ ...templateForm, type: e.target.value })}
                        className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
                      >
                        <option value="CUSTOM">Custom</option>
                        <option value="MARKETING_SMS">Marketing SMS</option>
                        <option value="MARKETING_EMAIL">Marketing Email</option>
                        <option value="CONFIRMATION">Booking Confirmation</option>
                        <option value="REMINDER">Reminder</option>
                        <option value="REVIEW_REQUEST">Review Request</option>
                      </select>
                    </div>
                  </div>
                  <div className="mb-4">
                    <label className="text-sm font-medium block mb-1">Template Content</label>
                    <textarea
                      value={templateForm.template}
                      onChange={(e) => setTemplateForm({ ...templateForm, template: e.target.value })}
                      placeholder={`Hi {{clientName}}, thank you for choosing {{companyName}}...`}
                      rows={5}
                      className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Variables: {'{{clientName}}'}, {'{{companyName}}'}, {'{{date}}'}, {'{{time}}'}, {'{{price}}'}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleSaveTemplate} disabled={savingTemplate}>
                      {savingTemplate ? 'Saving...' : 'Save Template'}
                    </Button>
                    <Button variant="outline" onClick={() => setEditingTemplate(null)}>Cancel</Button>
                  </div>
                </Card>
              )}

              {/* Template List */}
              {loadingTemplates ? (
                <Card className="p-6 text-center text-gray-500">Loading templates...</Card>
              ) : templates.length === 0 && !editingTemplate ? (
                <Card className="p-8 text-center">
                  <FileText className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-500">No templates yet. Create reusable message templates.</p>
                </Card>
              ) : (
                <div className="space-y-3">
                  {templates.map((t) => (
                    <Card key={t.id} className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-sm">{t.name}</h3>
                            <span className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">{t.type}</span>
                            {!t.isActive && (
                              <span className="text-xs text-gray-400">Inactive</span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 truncate">{t.template}</p>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingTemplate(t.id);
                            setTemplateForm({ name: t.name, template: t.template, type: t.type });
                          }}
                        >
                          Edit
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ============ RETENTION TAB ============ */}
          {activeTab === 'retention' && (
            <div>
              {/* Summary Cards */}
              {retention && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <Card className="p-4 text-center">
                    <p className="text-2xl font-bold text-green-600">{retention.summary.activeClients}</p>
                    <p className="text-xs text-gray-500">Active (30d)</p>
                  </Card>
                  <Card className="p-4 text-center">
                    <p className="text-2xl font-bold text-yellow-600">{retention.summary.atRiskCount}</p>
                    <p className="text-xs text-gray-500">At Risk (30-60d)</p>
                  </Card>
                  <Card className="p-4 text-center">
                    <p className="text-2xl font-bold text-orange-600">{retention.summary.dormantCount}</p>
                    <p className="text-xs text-gray-500">Dormant (60-90d)</p>
                  </Card>
                  <Card className="p-4 text-center">
                    <p className="text-2xl font-bold text-red-600">{retention.summary.lostCount}</p>
                    <p className="text-xs text-gray-500">Lost (90d+)</p>
                  </Card>
                </div>
              )}

              {/* Additional Stats */}
              {retention && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <Card className="p-3">
                    <p className="text-sm font-medium">{retention.summary.totalClients}</p>
                    <p className="text-xs text-gray-500">Total Clients</p>
                  </Card>
                  <Card className="p-3">
                    <p className="text-sm font-medium">{retention.summary.neverBooked}</p>
                    <p className="text-xs text-gray-500">Never Booked</p>
                  </Card>
                  <Card className="p-3">
                    <p className="text-sm font-medium">{retention.summary.recentCampaigns}</p>
                    <p className="text-xs text-gray-500">Campaigns (30d)</p>
                  </Card>
                  <Card className="p-3">
                    <p className="text-sm font-medium">{retention.summary.marketingMessagesSent}</p>
                    <p className="text-xs text-gray-500">Messages Sent (30d)</p>
                  </Card>
                </div>
              )}

              {/* Retention Sub-tabs */}
              <div className="flex gap-2 mb-4">
                {[
                  { id: 'at_risk' as const, label: 'At Risk', count: retention?.summary.atRiskCount || 0, color: 'yellow' },
                  { id: 'dormant' as const, label: 'Dormant', count: retention?.summary.dormantCount || 0, color: 'orange' },
                  { id: 'lost' as const, label: 'Lost', count: retention?.summary.lostCount || 0, color: 'red' },
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setRetentionTab(t.id)}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
                      retentionTab === t.id
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {t.label} ({t.count})
                  </button>
                ))}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={fetchRetention}
                  disabled={loadingRetention}
                  className="ml-auto"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${loadingRetention ? 'animate-spin' : ''}`} />
                </Button>
              </div>

              {/* Client List */}
              {loadingRetention ? (
                <Card className="p-6 text-center text-gray-500">Loading retention data...</Card>
              ) : !retention ? (
                <Card className="p-6 text-center text-gray-500">Failed to load data</Card>
              ) : (
                <div className="space-y-2">
                  {(retentionTab === 'at_risk'
                    ? retention.atRiskClients
                    : retentionTab === 'dormant'
                    ? retention.dormantClients
                    : retention.lostClients
                  ).length === 0 ? (
                    <Card className="p-8 text-center">
                      <CheckCircle className="h-8 w-8 text-green-400 mx-auto mb-2" />
                      <p className="text-gray-500">
                        No {retentionTab === 'at_risk' ? 'at-risk' : retentionTab} clients. Great retention!
                      </p>
                    </Card>
                  ) : (
                    (retentionTab === 'at_risk'
                      ? retention.atRiskClients
                      : retentionTab === 'dormant'
                      ? retention.dormantClients
                      : retention.lostClients
                    ).map((client) => (
                      <Card key={client.id} className="p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm">{client.name}</p>
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                              {client.phone && <span>{client.phone}</span>}
                              {client.email && <span>{client.email}</span>}
                            </div>
                            {client.bookings[0] && (
                              <p className="text-xs text-gray-400 mt-0.5">
                                Last booked: {formatDate(client.bookings[0].scheduledDate)} ({daysAgo(client.bookings[0].scheduledDate)} days ago)
                                {' '}• ${client.bookings[0].price}
                              </p>
                            )}
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setActiveTab('messaging');
                              setSelectedIds([client.id]);
                              setSelectAll(false);
                            }}
                            className="text-xs"
                          >
                            <Send className="h-3 w-3 mr-1" /> Message
                          </Button>
                        </div>
                      </Card>
                    ))
                  )}
                </div>
              )}
            </div>
          )}

          {/* ============ AUTOMATIONS TAB ============ */}
          {activeTab === 'automations' && (
            <div className="space-y-6">
              {loadingWinBack ? (
                <Card className="p-8 text-center text-gray-500">Loading automation data...</Card>
              ) : !winBack ? (
                <Card className="p-8 text-center text-gray-500">Failed to load automation data</Card>
              ) : (
                <>
                  {/* Win-Back Engine Header */}
                  <Card className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                            <Zap className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div>
                            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Win-Back Engine</h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              Automatically re-engage clients who stop booking
                            </p>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={toggleWinBack}
                        disabled={savingWinBack}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors"
                      >
                        {winBack.enabled ? (
                          <>
                            <ToggleRight className="h-8 w-8 text-green-500" />
                            <span className="text-sm font-semibold text-green-600">Active</span>
                          </>
                        ) : (
                          <>
                            <ToggleLeft className="h-8 w-8 text-gray-400" />
                            <span className="text-sm font-semibold text-gray-500">Disabled</span>
                          </>
                        )}
                      </button>
                    </div>

                    {winBack.enabled && (
                      <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3 text-sm text-green-700 dark:text-green-400">
                        Win-back automation is running. Clients who stop booking will automatically receive your message sequence.
                        {winBack.stats.eligibleClients > 0 && (
                          <span className="font-semibold"> {winBack.stats.eligibleClients} clients currently eligible.</span>
                        )}
                      </div>
                    )}
                  </Card>

                  {/* Stats Cards */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card className="p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <Send className="h-4 w-4 text-blue-500" />
                        <span className="text-xs text-gray-500 dark:text-gray-400">Messages Sent</span>
                      </div>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">{winBack.stats.totalAttempts}</p>
                      <p className="text-xs text-gray-400">Last 30d: {winBack.stats.last30DaysAttempts}</p>
                    </Card>
                    <Card className="p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <UserCheck className="h-4 w-4 text-green-500" />
                        <span className="text-xs text-gray-500 dark:text-gray-400">Won Back</span>
                      </div>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">{winBack.stats.totalConverted}</p>
                      <p className="text-xs text-gray-400">Last 30d: {winBack.stats.last30DaysConverted}</p>
                    </Card>
                    <Card className="p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <TrendingDown className="h-4 w-4 text-purple-500" />
                        <span className="text-xs text-gray-500 dark:text-gray-400">Conversion Rate</span>
                      </div>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">{winBack.stats.conversionRate}%</p>
                      <p className="text-xs text-gray-400">of messages → rebookings</p>
                    </Card>
                    <Card className="p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <DollarSign className="h-4 w-4 text-emerald-500" />
                        <span className="text-xs text-gray-500 dark:text-gray-400">Revenue Recovered</span>
                      </div>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        ${winBack.stats.revenueRecovered.toLocaleString()}
                      </p>
                      <p className="text-xs text-gray-400">from won-back clients</p>
                    </Card>
                  </div>

                  {/* Message Sequence Configuration */}
                  <Card className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-gray-900 dark:text-white">Message Sequence</h3>
                      {editingSteps ? (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingSteps(false);
                              setEditSteps(winBack.config.steps);
                            }}
                          >
                            Cancel
                          </Button>
                          <Button
                            size="sm"
                            onClick={saveWinBackConfig}
                            disabled={savingWinBack}
                          >
                            <Save className="h-3.5 w-3.5 mr-1" />
                            {savingWinBack ? 'Saving...' : 'Save Changes'}
                          </Button>
                        </div>
                      ) : (
                        <Button size="sm" variant="outline" onClick={() => setEditingSteps(true)}>
                          <Edit3 className="h-3.5 w-3.5 mr-1" /> Edit Sequence
                        </Button>
                      )}
                    </div>

                    <div className="space-y-3">
                      {(editingSteps ? editSteps : winBack.config.steps).map((step, idx) => (
                        <div
                          key={idx}
                          className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden"
                        >
                          <button
                            className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                            onClick={() => setExpandedStep(expandedStep === idx ? null : idx)}
                          >
                            <div className="flex items-center gap-4">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                                idx === 0 ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' :
                                idx === 1 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300' :
                                'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                              }`}>
                                {idx + 1}
                              </div>
                              <div>
                                <p className="font-medium text-gray-900 dark:text-white">
                                  {step.days === 1 ? '1 day' : `${step.days} days`} after last booking
                                </p>
                                <div className="flex items-center gap-2 text-xs text-gray-500">
                                  <span className="inline-flex items-center gap-1">
                                    {step.channel === 'SMS' && <><Phone className="h-3 w-3" /> SMS</>}
                                    {step.channel === 'EMAIL' && <><Mail className="h-3 w-3" /> Email</>}
                                    {step.channel === 'BOTH' && <><Phone className="h-3 w-3" /><Mail className="h-3 w-3" /> SMS + Email</>}
                                  </span>
                                  {step.discountPercent > 0 && (
                                    <span className="text-green-600 dark:text-green-400 font-medium">
                                      • {step.discountPercent}% discount
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            {expandedStep === idx ? (
                              <ChevronUp className="h-4 w-4 text-gray-400" />
                            ) : (
                              <ChevronDown className="h-4 w-4 text-gray-400" />
                            )}
                          </button>

                          {expandedStep === idx && (
                            <div className="px-4 pb-4 border-t border-gray-100 dark:border-gray-700 pt-3 space-y-3">
                              {editingSteps ? (
                                <>
                                  <div className="grid grid-cols-3 gap-3">
                                    <div>
                                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Days After Last Booking</label>
                                      <Input
                                        type="number"
                                        min={1}
                                        value={step.days}
                                        onChange={(e) => {
                                          const updated = [...editSteps];
                                          updated[idx] = { ...updated[idx], days: parseInt(e.target.value) || 1 };
                                          setEditSteps(updated);
                                        }}
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Channel</label>
                                      <select
                                        className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-800"
                                        value={step.channel}
                                        onChange={(e) => {
                                          const updated = [...editSteps];
                                          updated[idx] = { ...updated[idx], channel: e.target.value as 'SMS' | 'EMAIL' | 'BOTH' };
                                          setEditSteps(updated);
                                        }}
                                      >
                                        <option value="SMS">SMS</option>
                                        <option value="EMAIL">Email</option>
                                        <option value="BOTH">Both</option>
                                      </select>
                                    </div>
                                    <div>
                                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Discount %</label>
                                      <Input
                                        type="number"
                                        min={0}
                                        max={100}
                                        value={step.discountPercent}
                                        onChange={(e) => {
                                          const updated = [...editSteps];
                                          updated[idx] = { ...updated[idx], discountPercent: parseInt(e.target.value) || 0 };
                                          setEditSteps(updated);
                                        }}
                                      />
                                    </div>
                                  </div>
                                  {(step.channel === 'EMAIL' || step.channel === 'BOTH') && (
                                    <div>
                                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Email Subject</label>
                                      <Input
                                        value={step.emailSubject || ''}
                                        onChange={(e) => {
                                          const updated = [...editSteps];
                                          updated[idx] = { ...updated[idx], emailSubject: e.target.value };
                                          setEditSteps(updated);
                                        }}
                                        placeholder="e.g., We miss you! Here's {{discount}}% off"
                                      />
                                    </div>
                                  )}
                                  <div>
                                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Message Template</label>
                                    <textarea
                                      className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-800 min-h-[80px]"
                                      value={step.template}
                                      onChange={(e) => {
                                        const updated = [...editSteps];
                                        updated[idx] = { ...updated[idx], template: e.target.value };
                                        setEditSteps(updated);
                                      }}
                                    />
                                    <p className="text-xs text-gray-400 mt-1">
                                      Variables: {'{{firstName}}'}, {'{{clientName}}'}, {'{{companyName}}'}, {'{{discount}}'}, {'{{bookingLink}}'}
                                    </p>
                                  </div>
                                </>
                              ) : (
                                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                                  <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{step.template}</p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}

                      {editingSteps && editSteps.length < 5 && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full"
                          onClick={() => {
                            const lastStep = editSteps[editSteps.length - 1];
                            setEditSteps([
                              ...editSteps,
                              {
                                days: (lastStep?.days || 30) + 30,
                                channel: 'BOTH',
                                template: 'Hi {{firstName}}, we\'d love to see you again at {{companyName}}!',
                                discountPercent: 0,
                              },
                            ]);
                          }}
                        >
                          <Plus className="h-3.5 w-3.5 mr-1" /> Add Step
                        </Button>
                      )}
                    </div>
                  </Card>

                  {/* Recent Activity */}
                  <Card className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-gray-900 dark:text-white">Recent Activity</h3>
                      <Button size="sm" variant="outline" onClick={fetchWinBack} disabled={loadingWinBack}>
                        <RefreshCw className={`h-3.5 w-3.5 ${loadingWinBack ? 'animate-spin' : ''}`} />
                      </Button>
                    </div>

                    {winBack.recentAttempts.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <Zap className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p>No win-back messages sent yet.</p>
                        <p className="text-sm">Enable the engine and messages will be sent automatically.</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {winBack.recentAttempts.map((attempt) => (
                          <div
                            key={attempt.id}
                            className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-2 h-2 rounded-full ${
                                attempt.result === 'CONVERTED' ? 'bg-green-500' :
                                attempt.result === 'SENT' ? 'bg-blue-500' :
                                attempt.result === 'DELIVERED' ? 'bg-blue-400' :
                                attempt.result === 'FAILED' ? 'bg-red-500' :
                                'bg-gray-400'
                              }`} />
                              <div>
                                <p className="text-sm font-medium text-gray-900 dark:text-white">
                                  {attempt.client.name}
                                </p>
                                <p className="text-xs text-gray-500">
                                  Step {attempt.step === 14 ? '1' : attempt.step === 30 ? '2' : attempt.step === 60 ? '3' : attempt.step} • {attempt.channel}
                                  {attempt.discountPercent > 0 && ` • ${attempt.discountPercent}% off`}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                                attempt.result === 'CONVERTED' ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' :
                                attempt.result === 'SENT' || attempt.result === 'DELIVERED' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' :
                                attempt.result === 'FAILED' ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' :
                                'bg-gray-100 text-gray-600'
                              }`}>
                                {attempt.result}
                                {attempt.convertedRevenue ? ` • $${attempt.convertedRevenue}` : ''}
                              </span>
                              <p className="text-xs text-gray-400 mt-1">{formatDate(attempt.sentAt)}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </Card>
                </>
              )}
            </div>
          )}

          {/* ============ DISCOUNTS TAB ============ */}
          {activeTab === 'discounts' && (
            <div className="space-y-6">
              {/* Header + Create Button */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">Discount Codes</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Create and manage discount codes for your customers
                  </p>
                </div>
                <Button
                  onClick={() => {
                    setShowDiscountForm(true);
                    setEditingDiscountId(null);
                    setDiscountForm({ code: '', discountType: 'PERCENT', discountValue: '', validFrom: '', validUntil: '', maxUses: '' });
                  }}
                >
                  <Plus className="h-4 w-4 mr-1" /> Create Discount
                </Button>
              </div>

              {/* Create/Edit Form */}
              {showDiscountForm && (
                <Card className="p-6">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
                    {editingDiscountId ? 'Edit Discount Code' : 'Create Discount Code'}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Discount Code
                      </label>
                      <Input
                        value={discountForm.code}
                        onChange={(e) => setDiscountForm({ ...discountForm, code: e.target.value.toUpperCase() })}
                        placeholder="e.g., SPRING25"
                        className="uppercase"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Discount Type
                      </label>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setDiscountForm({ ...discountForm, discountType: 'PERCENT' })}
                          className={`flex-1 py-2 px-3 rounded-md text-sm font-medium border transition-colors ${
                            discountForm.discountType === 'PERCENT'
                              ? 'bg-blue-50 border-blue-300 text-blue-700 dark:bg-blue-900/30 dark:border-blue-700 dark:text-blue-300'
                              : 'border-gray-300 text-gray-600 dark:border-gray-600 dark:text-gray-400'
                          }`}
                        >
                          <Percent className="h-4 w-4 inline mr-1" /> Percentage
                        </button>
                        <button
                          onClick={() => setDiscountForm({ ...discountForm, discountType: 'FIXED' })}
                          className={`flex-1 py-2 px-3 rounded-md text-sm font-medium border transition-colors ${
                            discountForm.discountType === 'FIXED'
                              ? 'bg-blue-50 border-blue-300 text-blue-700 dark:bg-blue-900/30 dark:border-blue-700 dark:text-blue-300'
                              : 'border-gray-300 text-gray-600 dark:border-gray-600 dark:text-gray-400'
                          }`}
                        >
                          <DollarSign className="h-4 w-4 inline mr-1" /> Fixed Amount
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Discount Value {discountForm.discountType === 'PERCENT' ? '(%)' : '($)'}
                      </label>
                      <Input
                        type="number"
                        min="0"
                        max={discountForm.discountType === 'PERCENT' ? '100' : undefined}
                        value={discountForm.discountValue}
                        onChange={(e) => setDiscountForm({ ...discountForm, discountValue: e.target.value })}
                        placeholder={discountForm.discountType === 'PERCENT' ? 'e.g., 25' : 'e.g., 50'}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Max Uses <span className="text-gray-400 font-normal">(leave empty for unlimited)</span>
                      </label>
                      <Input
                        type="number"
                        min="1"
                        value={discountForm.maxUses}
                        onChange={(e) => setDiscountForm({ ...discountForm, maxUses: e.target.value })}
                        placeholder="Unlimited"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Valid From
                      </label>
                      <Input
                        type="date"
                        value={discountForm.validFrom}
                        onChange={(e) => setDiscountForm({ ...discountForm, validFrom: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Valid Until
                      </label>
                      <Input
                        type="date"
                        value={discountForm.validUntil}
                        onChange={(e) => setDiscountForm({ ...discountForm, validUntil: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* Preview */}
                  {discountForm.code && discountForm.discountValue && (
                    <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg flex items-center gap-3">
                      <Tag className="h-5 w-5 text-blue-500" />
                      <span className="text-sm text-gray-600 dark:text-gray-300">
                        Code <span className="font-bold text-gray-900 dark:text-white">{discountForm.code}</span> gives{' '}
                        <span className="font-bold text-green-600 dark:text-green-400">
                          {discountForm.discountType === 'PERCENT'
                            ? `${discountForm.discountValue}% off`
                            : `$${discountForm.discountValue} off`}
                        </span>
                        {discountForm.validFrom && discountForm.validUntil && (
                          <> from {discountForm.validFrom} to {discountForm.validUntil}</>
                        )}
                      </span>
                    </div>
                  )}

                  <div className="mt-4 flex gap-2 justify-end">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowDiscountForm(false);
                        setEditingDiscountId(null);
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleSaveDiscount}
                      disabled={savingDiscount || !discountForm.code || !discountForm.discountValue || !discountForm.validFrom || !discountForm.validUntil}
                    >
                      {savingDiscount ? 'Saving...' : editingDiscountId ? 'Update Discount' : 'Create Discount'}
                    </Button>
                  </div>
                </Card>
              )}

              {/* Discount List */}
              {loadingDiscounts ? (
                <Card className="p-8 text-center text-gray-500">Loading discount codes...</Card>
              ) : discounts.length === 0 ? (
                <Card className="p-8 text-center">
                  <Tag className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 mb-1">No discount codes yet</p>
                  <p className="text-sm text-gray-400">Create your first discount code to offer deals to customers</p>
                </Card>
              ) : (
                <div className="space-y-3">
                  {discounts.map((d) => {
                    const now = new Date();
                    const isExpired = new Date(d.validUntil) < now;
                    const notStarted = new Date(d.validFrom) > now;
                    const isMaxed = d.maxUses !== null && d.usedCount >= d.maxUses;
                    const isLive = d.isActive && !isExpired && !notStarted && !isMaxed;

                    return (
                      <Card key={d.id} className={`p-4 ${!d.isActive ? 'opacity-60' : ''}`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            {/* Code badge */}
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => copyCode(d.code)}
                                className="flex items-center gap-1.5 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 font-mono font-bold text-sm tracking-wider hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                                title="Click to copy"
                              >
                                {d.code}
                                {copiedCode === d.code ? (
                                  <Check className="h-3.5 w-3.5 text-green-500" />
                                ) : (
                                  <Copy className="h-3.5 w-3.5 text-gray-400" />
                                )}
                              </button>
                            </div>

                            {/* Details */}
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-gray-900 dark:text-white">
                                  {d.discountType === 'PERCENT' ? `${d.discountValue}% off` : `$${d.discountValue} off`}
                                </span>
                                {isLive && (
                                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                                    Live
                                  </span>
                                )}
                                {isExpired && (
                                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                                    Expired
                                  </span>
                                )}
                                {notStarted && (
                                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                                    Scheduled
                                  </span>
                                )}
                                {isMaxed && (
                                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                                    Maxed Out
                                  </span>
                                )}
                                {!d.isActive && (
                                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
                                    Disabled
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {formatDate(d.validFrom)} - {formatDate(d.validUntil)}
                                </span>
                                <span>
                                  Used: {d.usedCount}{d.maxUses !== null ? `/${d.maxUses}` : ''}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleToggleDiscount(d.id, d.isActive)}
                              className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                              title={d.isActive ? 'Disable' : 'Enable'}
                            >
                              {d.isActive ? (
                                <ToggleRight className="h-5 w-5 text-green-500" />
                              ) : (
                                <ToggleLeft className="h-5 w-5 text-gray-400" />
                              )}
                            </button>
                            <button
                              onClick={() => {
                                setEditingDiscountId(d.id);
                                setDiscountForm({
                                  code: d.code,
                                  discountType: d.discountType,
                                  discountValue: String(d.discountValue),
                                  validFrom: d.validFrom.split('T')[0],
                                  validUntil: d.validUntil.split('T')[0],
                                  maxUses: d.maxUses !== null ? String(d.maxUses) : '',
                                });
                                setShowDiscountForm(true);
                              }}
                              className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                              title="Edit"
                            >
                              <Edit3 className="h-4 w-4 text-gray-500" />
                            </button>
                            <button
                              onClick={() => handleDeleteDiscount(d.id)}
                              className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4 text-red-400" />
                            </button>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

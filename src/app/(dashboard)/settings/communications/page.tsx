'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  MessageSquare,
  Clock,
  User,
  Filter,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  XCircle,
  AlertCircle,
  Send,
  RefreshCw,
  Phone,
  Users,
  Search,
  FileText,
  Save,
  Edit3,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';

interface MessageEntry {
  id: string;
  to: string;
  from: string;
  body: string;
  type: string;
  status: string;
  errorMessage: string | null;
  createdAt: string;
  sentBy: {
    id: string;
    name: string;
    email: string;
    role: string;
  } | null;
  recipientName: string | null;
  booking: {
    id: string;
    client: {
      id: string;
      name: string;
    };
  } | null;
}

interface MessageHistoryData {
  messages: MessageEntry[];
  pagination: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
  };
  stats: {
    totalMessages: number;
    typeBreakdown: Record<string, number>;
    statusBreakdown: Record<string, number>;
    uniqueSenders: Array<{
      id: string;
      name: string | null;
      email: string;
      role: string;
    }>;
  };
  filters: {
    days: number;
    fromDate: string;
  };
}

interface Recipient {
  id: string;
  name: string;
  phone: string;
  type: 'client' | 'cleaner';
  email?: string;
}

interface MessageTemplate {
  id: string;
  type: string;
  name: string;
  template: string;
  isActive: boolean;
}

// Default templates for new companies
const defaultTemplates: Record<string, { name: string; template: string }> = {
  CONFIRMATION: {
    name: 'Booking Confirmation',
    template: 'Hi {{clientName}}! Your cleaning is confirmed for {{date}} at {{time}}. We look forward to serving you!',
  },
  REMINDER: {
    name: 'Appointment Reminder',
    template: 'Hi {{clientName}}! This is a reminder that your cleaning is scheduled for tomorrow at {{time}}. See you soon!',
  },
  ON_MY_WAY: {
    name: 'On My Way',
    template: 'Hi {{clientName}}! Your cleaner {{cleanerName}} is on the way and will arrive in approximately {{eta}} minutes.',
  },
  THANK_YOU: {
    name: 'Thank You',
    template: 'Thank you {{clientName}} for choosing us! We hope you love your sparkling clean home. Please let us know if you have any feedback!',
  },
  PAYMENT_REQUEST: {
    name: 'Payment Request',
    template: 'Hi {{clientName}}! Your invoice of {{amount}} for the cleaning on {{date}} is ready. Please submit payment at your earliest convenience.',
  },
  REVIEW_REQUEST: {
    name: 'Review Request',
    template: 'Hi {{clientName}}! We hope you enjoyed your recent cleaning. Would you mind leaving us a review? It helps us grow! {{reviewLink}}',
  },
  CUSTOM: {
    name: 'Custom Message',
    template: '',
  },
};

// Message type display names
const messageTypeNames: Record<string, string> = {
  CONFIRMATION: 'Booking Confirmation',
  REMINDER: 'Appointment Reminder',
  ON_MY_WAY: 'On My Way',
  THANK_YOU: 'Thank You',
  PAYMENT_REQUEST: 'Payment Request',
  CUSTOM: 'Custom Message',
  BIRTHDAY_GREETING: 'Birthday Greeting',
  ANNIVERSARY_GREETING: 'Anniversary Greeting',
  REVIEW_REQUEST: 'Review Request',
  TIME_OFF_REQUEST: 'Time Off Request',
  TIME_OFF_APPROVED: 'Time Off Approved',
  TIME_OFF_DENIED: 'Time Off Denied',
};

// Status colors
const statusConfig: Record<string, { icon: any; color: string; bgColor: string }> = {
  SENT: { icon: CheckCircle, color: 'text-green-600', bgColor: 'bg-green-100' },
  DELIVERED: { icon: CheckCircle, color: 'text-blue-600', bgColor: 'bg-blue-100' },
  FAILED: { icon: XCircle, color: 'text-red-600', bgColor: 'bg-red-100' },
  PENDING: { icon: AlertCircle, color: 'text-yellow-600', bgColor: 'bg-yellow-100' },
};

export default function CommunicationsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Message history state
  const [data, setData] = useState<MessageHistoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Send message state
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [loadingRecipients, setLoadingRecipients] = useState(false);
  const [recipientSearch, setRecipientSearch] = useState('');
  const [recipientType, setRecipientType] = useState<'all' | 'client' | 'cleaner'>('all');
  const [selectedRecipient, setSelectedRecipient] = useState<Recipient | null>(null);
  const [messageType, setMessageType] = useState<string>('CUSTOM');
  const [messageBody, setMessageBody] = useState('');
  const [sending, setSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);

  // History filters
  const [days, setDays] = useState<number>(7);
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [senderFilter, setSenderFilter] = useState<string>('all');
  const [page, setPage] = useState(1);

  // Active tab
  const [activeTab, setActiveTab] = useState<'send' | 'templates' | 'history'>('send');

  // Templates state
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<string | null>(null);
  const [templateForm, setTemplateForm] = useState({ name: '', template: '', isActive: true });
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [templateSuccess, setTemplateSuccess] = useState<string | null>(null);
  const [templateError, setTemplateError] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'loading') return;
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }

    // Check role
    const userRole = (session?.user as any)?.role;
    if (userRole !== 'OWNER' && userRole !== 'ADMIN') {
      router.push('/dashboard');
      return;
    }

    fetchRecipients();
    fetchMessageHistory();
    fetchTemplates();
  }, [status]);

  const fetchTemplates = async () => {
    setLoadingTemplates(true);
    try {
      const response = await fetch('/api/messages/templates');
      const result = await response.json();
      if (result.success) {
        setTemplates(result.data);
      }
    } catch (err) {
      console.error('Failed to fetch templates:', err);
    } finally {
      setLoadingTemplates(false);
    }
  };

  const getTemplateForType = (type: string): string => {
    const saved = templates.find(t => t.type === type);
    if (saved) return saved.template;
    return defaultTemplates[type]?.template || '';
  };

  const handleLoadTemplate = () => {
    const template = getTemplateForType(messageType);
    if (template) {
      setMessageBody(template);
    }
  };

  const handleEditTemplate = (type: string) => {
    const saved = templates.find(t => t.type === type);
    const defaults = defaultTemplates[type] || { name: type, template: '' };
    setEditingTemplate(type);
    setTemplateForm({
      name: saved?.name || defaults.name,
      template: saved?.template || defaults.template,
      isActive: saved?.isActive ?? true,
    });
    setTemplateSuccess(null);
    setTemplateError(null);
  };

  const handleSaveTemplate = async () => {
    if (!editingTemplate) return;

    setSavingTemplate(true);
    setTemplateError(null);
    setTemplateSuccess(null);

    try {
      const response = await fetch('/api/messages/templates', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: editingTemplate,
          ...templateForm,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setTemplateSuccess('Template saved successfully');
        fetchTemplates();
        setEditingTemplate(null);
      } else {
        setTemplateError(result.error || 'Failed to save template');
      }
    } catch (err) {
      setTemplateError('Failed to save template');
    } finally {
      setSavingTemplate(false);
    }
  };

  useEffect(() => {
    if (status === 'authenticated') {
      fetchMessageHistory();
    }
  }, [days, typeFilter, statusFilter, senderFilter, page]);

  const fetchRecipients = async () => {
    setLoadingRecipients(true);
    try {
      // Fetch clients
      const clientsRes = await fetch('/api/clients');
      const clientsData = await clientsRes.json();

      // Fetch team members (cleaners)
      const teamRes = await fetch('/api/team/members');
      const teamData = await teamRes.json();

      const allRecipients: Recipient[] = [];

      if (clientsData.success) {
        clientsData.data.forEach((client: any) => {
          if (client.phone) {
            allRecipients.push({
              id: client.id,
              name: client.name,
              phone: client.phone,
              type: 'client',
              email: client.email,
            });
          }
        });
      }

      if (teamData.success) {
        teamData.data.forEach((member: any) => {
          if (member.user?.phone) {
            allRecipients.push({
              id: member.id,
              name: member.user.name || member.user.email,
              phone: member.user.phone,
              type: 'cleaner',
              email: member.user.email,
            });
          }
        });
      }

      setRecipients(allRecipients);
    } catch (err) {
      console.error('Failed to fetch recipients:', err);
    } finally {
      setLoadingRecipients(false);
    }
  };

  const fetchMessageHistory = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        days: days.toString(),
        page: page.toString(),
        limit: '50',
      });

      if (typeFilter !== 'all') {
        params.append('type', typeFilter);
      }

      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }

      if (senderFilter !== 'all') {
        params.append('senderId', senderFilter);
      }

      const response = await fetch(`/api/messages/history?${params}`);
      const result = await response.json();

      if (result.success) {
        setData(result.data);
      } else {
        setError(result.error || 'Failed to load message history');
      }
    } catch (err) {
      setError('Failed to load message history');
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!selectedRecipient || !messageBody.trim()) {
      setSendError('Please select a recipient and enter a message');
      return;
    }

    setSending(true);
    setSendError(null);
    setSendSuccess(null);

    try {
      const response = await fetch('/api/messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: selectedRecipient.phone,
          body: messageBody,
          type: messageType,
          recipientId: selectedRecipient.type === 'client' ? selectedRecipient.id : undefined,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setSendSuccess(`Message sent to ${selectedRecipient.name}`);
        setMessageBody('');
        setSelectedRecipient(null);
        fetchMessageHistory(); // Refresh history
      } else {
        setSendError(result.error || 'Failed to send message');
      }
    } catch (err) {
      setSendError('Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const formatPhoneNumber = (phone: string) => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 11 && cleaned.startsWith('1')) {
      return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
    }
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    return phone;
  };

  const truncateMessage = (message: string, maxLength: number = 100) => {
    if (message.length <= maxLength) return message;
    return message.slice(0, maxLength) + '...';
  };

  const getStatusIcon = (messageStatus: string) => {
    const config = statusConfig[messageStatus] || statusConfig.PENDING;
    const Icon = config.icon;
    return <Icon className={`h-4 w-4 ${config.color}`} />;
  };

  // Filter recipients based on search and type
  const filteredRecipients = recipients.filter((r) => {
    const matchesSearch = r.name.toLowerCase().includes(recipientSearch.toLowerCase()) ||
      r.phone.includes(recipientSearch);
    const matchesType = recipientType === 'all' || r.type === recipientType;
    return matchesSearch && matchesType;
  });

  // Get unique types from stats
  const uniqueTypes = data?.stats?.typeBreakdown
    ? Object.keys(data.stats.typeBreakdown)
    : [];

  if (status === 'loading') {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/settings">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <MessageSquare className="h-6 w-6" />
              Communications Hub
            </h1>
            <p className="text-sm text-gray-500">
              Send messages and view communication history
            </p>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 bg-gray-100 p-1 rounded-lg w-fit">
        <button
          onClick={() => setActiveTab('send')}
          className={`px-4 py-2 rounded-md font-medium transition-colors ${
            activeTab === 'send'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Send className="h-4 w-4 inline mr-2" />
          Send Message
        </button>
        <button
          onClick={() => setActiveTab('templates')}
          className={`px-4 py-2 rounded-md font-medium transition-colors ${
            activeTab === 'templates'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <FileText className="h-4 w-4 inline mr-2" />
          Templates
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2 rounded-md font-medium transition-colors ${
            activeTab === 'history'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Clock className="h-4 w-4 inline mr-2" />
          Message History
        </button>
      </div>

      {/* Send Message Tab */}
      {activeTab === 'send' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recipient Selection */}
          <Card className="p-6 space-y-4">
            <h2 className="font-semibold text-lg flex items-center gap-2">
              <Users className="h-5 w-5" />
              Select Recipient
            </h2>

            {/* Search and Filter */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by name or phone..."
                  value={recipientSearch}
                  onChange={(e) => setRecipientSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select
                value={recipientType}
                onChange={(e) => setRecipientType(e.target.value as any)}
                className="w-36"
              >
                <option value="all">All</option>
                <option value="client">Clients</option>
                <option value="cleaner">Cleaners</option>
              </Select>
            </div>

            {/* Selected Recipient */}
            {selectedRecipient && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`p-2 rounded-full ${
                    selectedRecipient.type === 'client' ? 'bg-green-100' : 'bg-purple-100'
                  }`}>
                    <User className={`h-4 w-4 ${
                      selectedRecipient.type === 'client' ? 'text-green-600' : 'text-purple-600'
                    }`} />
                  </div>
                  <div>
                    <p className="font-medium">{selectedRecipient.name}</p>
                    <p className="text-sm text-gray-500">{formatPhoneNumber(selectedRecipient.phone)}</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedRecipient(null)}
                >
                  <XCircle className="h-4 w-4" />
                </Button>
              </div>
            )}

            {/* Recipient List */}
            <div className="max-h-64 overflow-y-auto border rounded-lg divide-y">
              {loadingRecipients ? (
                <div className="p-4 text-center text-gray-500">Loading...</div>
              ) : filteredRecipients.length === 0 ? (
                <div className="p-4 text-center text-gray-500">No recipients found</div>
              ) : (
                filteredRecipients.map((recipient) => (
                  <div
                    key={`${recipient.type}-${recipient.id}`}
                    onClick={() => setSelectedRecipient(recipient)}
                    className={`p-3 cursor-pointer hover:bg-gray-50 transition-colors ${
                      selectedRecipient?.id === recipient.id && selectedRecipient?.type === recipient.type
                        ? 'bg-blue-50'
                        : ''
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full ${
                        recipient.type === 'client' ? 'bg-green-100' : 'bg-purple-100'
                      }`}>
                        <User className={`h-4 w-4 ${
                          recipient.type === 'client' ? 'text-green-600' : 'text-purple-600'
                        }`} />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{recipient.name}</p>
                        <p className="text-sm text-gray-500">{formatPhoneNumber(recipient.phone)}</p>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        recipient.type === 'client'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-purple-100 text-purple-700'
                      }`}>
                        {recipient.type === 'client' ? 'Client' : 'Cleaner'}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>

          {/* Compose Message */}
          <Card className="p-6 space-y-4">
            <h2 className="font-semibold text-lg flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Compose Message
            </h2>

            {/* Message Type */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">
                Message Type
              </label>
              <div className="flex gap-2">
                <Select
                  value={messageType}
                  onChange={(e) => setMessageType(e.target.value)}
                  className="flex-1"
                >
                  <option value="CUSTOM">Custom Message</option>
                  <option value="REMINDER">Appointment Reminder</option>
                  <option value="CONFIRMATION">Booking Confirmation</option>
                  <option value="ON_MY_WAY">On My Way</option>
                  <option value="THANK_YOU">Thank You</option>
                  <option value="PAYMENT_REQUEST">Payment Request</option>
                  <option value="REVIEW_REQUEST">Review Request</option>
                </Select>
                <Button
                  variant="outline"
                  onClick={handleLoadTemplate}
                  disabled={messageType === 'CUSTOM'}
                  title="Load template for this message type"
                >
                  <FileText className="h-4 w-4" />
                </Button>
              </div>
              {messageType !== 'CUSTOM' && (
                <p className="text-xs text-gray-500 mt-1">
                  Click the template icon to load the saved template
                </p>
              )}
            </div>

            {/* Message Body */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">
                Message
              </label>
              <textarea
                value={messageBody}
                onChange={(e) => setMessageBody(e.target.value)}
                placeholder="Type your message here..."
                rows={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                {messageBody.length} characters
              </p>
            </div>

            {/* Success/Error Messages */}
            {sendSuccess && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-700">
                <CheckCircle className="h-4 w-4" />
                {sendSuccess}
              </div>
            )}
            {sendError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
                <XCircle className="h-4 w-4" />
                {sendError}
              </div>
            )}

            {/* Send Button */}
            <Button
              onClick={handleSendMessage}
              disabled={sending || !selectedRecipient || !messageBody.trim()}
              className="w-full"
              size="lg"
            >
              <Send className="h-4 w-4 mr-2" />
              {sending ? 'Sending...' : 'Send Message'}
            </Button>

            {!selectedRecipient && (
              <p className="text-sm text-gray-500 text-center">
                Select a recipient from the list to send a message
              </p>
            )}
          </Card>
        </div>
      )}

      {/* Templates Tab */}
      {activeTab === 'templates' && (
        <div className="space-y-6">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="font-semibold text-lg flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Message Templates
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  Customize templates for different message types. Use placeholders like {'{{clientName}}'}, {'{{date}}'}, {'{{time}}'}, etc.
                </p>
              </div>
            </div>

            {/* Success/Error Messages */}
            {templateSuccess && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-700">
                <CheckCircle className="h-4 w-4" />
                {templateSuccess}
              </div>
            )}
            {templateError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
                <XCircle className="h-4 w-4" />
                {templateError}
              </div>
            )}

            {/* Template List */}
            <div className="space-y-4">
              {Object.entries(defaultTemplates).map(([type, defaults]) => {
                const saved = templates.find(t => t.type === type);
                const isEditing = editingTemplate === type;

                return (
                  <div
                    key={type}
                    className={`border rounded-lg p-4 ${isEditing ? 'border-blue-300 bg-blue-50' : ''}`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-medium">{saved?.name || defaults.name}</h3>
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                          {type}
                        </span>
                      </div>
                      {!isEditing && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditTemplate(type)}
                        >
                          <Edit3 className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                      )}
                    </div>

                    {isEditing ? (
                      <div className="space-y-3 mt-4">
                        <div>
                          <label className="text-sm font-medium text-gray-700 mb-1 block">
                            Template Name
                          </label>
                          <Input
                            value={templateForm.name}
                            onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                            placeholder="Template name"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-700 mb-1 block">
                            Message Template
                          </label>
                          <textarea
                            value={templateForm.template}
                            onChange={(e) => setTemplateForm({ ...templateForm, template: e.target.value })}
                            placeholder="Enter your message template..."
                            rows={4}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            Available placeholders: {'{{clientName}}'}, {'{{businessName}}'}, {'{{companyName}}'}, {'{{date}}'}, {'{{time}}'}, {'{{cleanerName}}'}, {'{{amount}}'}, {'{{reviewLink}}'}, {'{{eta}}'}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id={`active-${type}`}
                            checked={templateForm.isActive}
                            onChange={(e) => setTemplateForm({ ...templateForm, isActive: e.target.checked })}
                            className="h-4 w-4 rounded border-gray-300"
                          />
                          <label htmlFor={`active-${type}`} className="text-sm text-gray-700">
                            Template is active
                          </label>
                        </div>
                        <div className="flex gap-2 pt-2">
                          <Button
                            onClick={handleSaveTemplate}
                            disabled={savingTemplate}
                          >
                            <Save className="h-4 w-4 mr-1" />
                            {savingTemplate ? 'Saving...' : 'Save Template'}
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => setEditingTemplate(null)}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-2">
                        <p className="text-sm text-gray-600 bg-gray-50 rounded p-3">
                          {saved?.template || defaults.template || <span className="italic text-gray-400">No template set</span>}
                        </p>
                        {saved && !saved.isActive && (
                          <span className="text-xs text-yellow-600 mt-1 inline-block">
                            Template is inactive
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Placeholder Reference */}
          <Card className="p-6">
            <h3 className="font-semibold mb-4">Placeholder Reference</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <code className="bg-gray-100 px-2 py-1 rounded">{'{{clientName}}'}</code>
                  <span className="text-gray-600">Client's first name</span>
                </div>
                <div className="flex justify-between">
                  <code className="bg-gray-100 px-2 py-1 rounded">{'{{businessName}}'}</code>
                  <span className="text-gray-600">Your business name</span>
                </div>
                <div className="flex justify-between">
                  <code className="bg-gray-100 px-2 py-1 rounded">{'{{companyName}}'}</code>
                  <span className="text-gray-600">Your company name</span>
                </div>
                <div className="flex justify-between">
                  <code className="bg-gray-100 px-2 py-1 rounded">{'{{senderName}}'}</code>
                  <span className="text-gray-600">Your name (sender)</span>
                </div>
                <div className="flex justify-between">
                  <code className="bg-gray-100 px-2 py-1 rounded">{'{{date}}'}</code>
                  <span className="text-gray-600">Appointment date</span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <code className="bg-gray-100 px-2 py-1 rounded">{'{{time}}'}</code>
                  <span className="text-gray-600">Appointment time</span>
                </div>
                <div className="flex justify-between">
                  <code className="bg-gray-100 px-2 py-1 rounded">{'{{cleanerName}}'}</code>
                  <span className="text-gray-600">Assigned cleaner</span>
                </div>
                <div className="flex justify-between">
                  <code className="bg-gray-100 px-2 py-1 rounded">{'{{amount}}'}</code>
                  <span className="text-gray-600">Invoice amount</span>
                </div>
                <div className="flex justify-between">
                  <code className="bg-gray-100 px-2 py-1 rounded">{'{{eta}}'}</code>
                  <span className="text-gray-600">Estimated arrival</span>
                </div>
                <div className="flex justify-between">
                  <code className="bg-gray-100 px-2 py-1 rounded">{'{{reviewLink}}'}</code>
                  <span className="text-gray-600">Review page link</span>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Message History Tab */}
      {activeTab === 'history' && (
        <>
          {/* Stats Cards */}
          {data?.stats && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="p-4">
                <div className="text-sm text-gray-500">Total Messages</div>
                <div className="text-2xl font-bold">{data.stats.totalMessages}</div>
                <div className="text-xs text-gray-400">Last {days} days</div>
              </Card>
              <Card className="p-4 bg-green-50 border-green-200">
                <div className="text-sm text-green-700">Delivered</div>
                <div className="text-2xl font-bold text-green-600">
                  {(data.stats.statusBreakdown['SENT'] || 0) +
                    (data.stats.statusBreakdown['DELIVERED'] || 0)}
                </div>
                <div className="text-xs text-green-500">Successfully sent</div>
              </Card>
              <Card className="p-4 bg-red-50 border-red-200">
                <div className="text-sm text-red-700">Failed</div>
                <div className="text-2xl font-bold text-red-600">
                  {data.stats.statusBreakdown['FAILED'] || 0}
                </div>
                <div className="text-xs text-red-500">Delivery errors</div>
              </Card>
              <Card className="p-4">
                <div className="text-sm text-gray-500">Active Senders</div>
                <div className="text-2xl font-bold">{data.stats.uniqueSenders.length}</div>
                <div className="text-xs text-gray-400">Team members</div>
              </Card>
            </div>
          )}

          {/* Filters */}
          <Card className="p-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium">Filters:</span>
              </div>

              {/* Time Range */}
              <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
                {[7, 15, 30].map((d) => (
                  <button
                    key={d}
                    onClick={() => { setDays(d); setPage(1); }}
                    className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                      days === d
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    {d} days
                  </button>
                ))}
              </div>

              {/* Type Filter */}
              <Select
                value={typeFilter}
                onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
                className="w-48"
              >
                <option value="all">All Types</option>
                {uniqueTypes.map((type) => (
                  <option key={type} value={type}>
                    {messageTypeNames[type] || type}
                  </option>
                ))}
              </Select>

              {/* Status Filter */}
              <Select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                className="w-36"
              >
                <option value="all">All Status</option>
                <option value="SENT">Sent</option>
                <option value="DELIVERED">Delivered</option>
                <option value="FAILED">Failed</option>
                <option value="PENDING">Pending</option>
              </Select>

              {/* Sender Filter */}
              {data?.stats?.uniqueSenders && data.stats.uniqueSenders.length > 0 && (
                <Select
                  value={senderFilter}
                  onChange={(e) => { setSenderFilter(e.target.value); setPage(1); }}
                  className="w-48"
                >
                  <option value="all">All Senders</option>
                  {data.stats.uniqueSenders.map((sender) => (
                    <option key={sender.id} value={sender.id}>
                      {sender.name || sender.email}
                    </option>
                  ))}
                </Select>
              )}

              <Button variant="outline" onClick={fetchMessageHistory} disabled={loading}>
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </Card>

          {/* Error State */}
          {error && (
            <Card className="p-4 bg-red-50 border-red-200">
              <p className="text-red-700">{error}</p>
            </Card>
          )}

          {/* Message List */}
          <Card className="divide-y">
            {loading ? (
              <div className="p-8 text-center text-gray-500">Loading...</div>
            ) : data?.messages && data.messages.length > 0 ? (
              data.messages.map((msg) => (
                <div key={msg.id} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start gap-4">
                    <div className={`p-2 rounded-full ${
                      statusConfig[msg.status]?.bgColor || 'bg-gray-100'
                    }`}>
                      <Send className={`h-4 w-4 ${
                        statusConfig[msg.status]?.color || 'text-gray-600'
                      }`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-900">
                            {messageTypeNames[msg.type] || msg.type}
                          </span>
                          <span className="flex items-center gap-1">
                            {getStatusIcon(msg.status)}
                            <span className="text-xs text-gray-500">{msg.status}</span>
                          </span>
                        </div>
                        <span className="text-xs text-gray-500 whitespace-nowrap flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDate(msg.createdAt)}
                        </span>
                      </div>

                      {/* Recipient */}
                      <div className="flex items-center gap-2 mt-1">
                        <Phone className="h-3 w-3 text-gray-400" />
                        <span className="text-sm text-gray-700">
                          To: {msg.recipientName || msg.booking?.client?.name || formatPhoneNumber(msg.to)}
                        </span>
                      </div>

                      {/* Message Preview */}
                      <p className="text-sm text-gray-600 mt-2 bg-gray-50 rounded p-2">
                        {truncateMessage(msg.body, 150)}
                      </p>

                      {/* Sender Info */}
                      <div className="flex items-center gap-4 mt-2">
                        {msg.sentBy && (
                          <span className="text-xs text-gray-500 flex items-center gap-1 bg-blue-50 px-2 py-1 rounded">
                            <User className="h-3 w-3" />
                            Sent by: <span className="font-medium">{msg.sentBy.name || msg.sentBy.email}</span>
                          </span>
                        )}
                        {msg.errorMessage && (
                          <span className="text-xs text-red-600 flex items-center gap-1">
                            <XCircle className="h-3 w-3" />
                            Error: {msg.errorMessage}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-gray-500">
                <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No messages found for the selected filters</p>
                <p className="text-sm mt-1">Try adjusting your filters or time range</p>
              </div>
            )}
          </Card>

          {/* Pagination */}
          {data?.pagination && data.pagination.totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">
                Showing {((data.pagination.page - 1) * data.pagination.limit) + 1} to{' '}
                {Math.min(data.pagination.page * data.pagination.limit, data.pagination.totalCount)} of{' '}
                {data.pagination.totalCount} messages
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.min(data.pagination.totalPages, p + 1))}
                  disabled={page === data.pagination.totalPages}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

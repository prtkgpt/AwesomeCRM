'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Plus, Mail, Phone, MapPin, Trash2, Edit, Save, X, StickyNote,
  TrendingUp, DollarSign, Calendar, FileText, Download, Eye, Star, Gift,
  Users, Crown, Shield, Clock, MessageSquare, CreditCard, Award,
  Copy, ExternalLink, ChevronRight, Home, Building, Sparkles, Heart,
  PawPrint, Leaf, Ban, CheckCircle2, AlertCircle, Send, Receipt
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { formatDateTime, formatCurrency, formatDuration } from '@/lib/utils';
import type { ClientWithAddresses, BookingWithRelations } from '@/types';
import { PreferenceForm } from '@/components/client/preference-form';

// Referral tier configuration
const REFERRAL_TIERS = {
  NONE: { name: 'None', referrals: 0, color: 'gray', icon: '🌱' },
  BRONZE: { name: 'Bronze', referrals: 1, color: 'amber', icon: '🥉' },
  SILVER: { name: 'Silver', referrals: 5, color: 'slate', icon: '🥈' },
  GOLD: { name: 'Gold', referrals: 10, color: 'yellow', icon: '🥇' },
};

export default function ClientDetailPage() {
  const router = useRouter();
  const params = useParams();
  const clientId = params.id as string;

  const [client, setClient] = useState<ClientWithAddresses | null>(null);
  const [bookings, setBookings] = useState<BookingWithRelations[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [creditTransactions, setCreditTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notes, setNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [bookingFilter, setBookingFilter] = useState<'all' | 'upcoming' | 'past' | 'cancelled'>('all');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchClient();
    fetchBookings();
    fetchInvoices();
    fetchCreditTransactions();
  }, [clientId]);

  const fetchClient = async () => {
    try {
      const response = await fetch(`/api/clients/${clientId}`);
      const data = await response.json();

      if (data.success) {
        setClient(data.data);
        setNotes(data.data.notes || '');
        setError(null);
      } else {
        console.error('Client API error:', data.error);
        setError(data.error || 'Failed to load client');
      }
    } catch (err) {
      console.error('Failed to fetch client:', err);
      setError('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  };

  const fetchBookings = async () => {
    try {
      const response = await fetch(`/api/bookings?clientId=${clientId}`);
      const data = await response.json();
      if (data.success) {
        setBookings(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch bookings:', error);
    }
  };

  const fetchInvoices = async () => {
    try {
      const response = await fetch(`/api/invoices?clientId=${clientId}`);
      const data = await response.json();
      if (data.success) {
        setInvoices(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch invoices:', error);
    }
  };

  const fetchCreditTransactions = async () => {
    try {
      const response = await fetch(`/api/clients/${clientId}/credits`);
      const data = await response.json();
      if (data.success) {
        setCreditTransactions(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch credit transactions:', error);
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

  const handleSaveNotes = async () => {
    setSavingNotes(true);
    try {
      const response = await fetch(`/api/clients/${clientId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes }),
      });
      const data = await response.json();
      if (data.success) {
        setClient(data.data);
        setEditingNotes(false);
      } else {
        alert(data.error || 'Failed to save notes');
      }
    } catch (error) {
      alert('An error occurred. Please try again.');
    } finally {
      setSavingNotes(false);
    }
  };

  const handleCancelNotes = () => {
    setNotes(client?.notes || '');
    setEditingNotes(false);
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this client? All associated bookings will also be deleted.')) {
      return;
    }
    setDeleting(true);
    try {
      const response = await fetch(`/api/clients/${clientId}`, { method: 'DELETE' });
      const data = await response.json();
      if (data.success) {
        router.push('/clients');
      } else {
        alert(data.error || 'Failed to delete client');
      }
    } catch (error) {
      alert('An error occurred. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  // Computed values
  const clientStats = useMemo(() => {
    const now = new Date();
    const totalJobs = bookings.length;
    const completedJobs = bookings.filter(b => b.status === 'COMPLETED').length;
    const cancelledJobs = bookings.filter(b => b.status === 'CANCELLED').length;
    const upcomingJobs = bookings.filter(b => new Date(b.scheduledDate) > now && b.status !== 'CANCELLED').length;
    const totalRevenue = bookings
      .filter(b => b.status === 'COMPLETED' && b.isPaid)
      .reduce((sum, b) => sum + (b.price ?? 0), 0);
    const unpaidRevenue = bookings
      .filter(b => b.status === 'COMPLETED' && !b.isPaid)
      .reduce((sum, b) => sum + (b.price ?? 0), 0);
    const averageRating = bookings
      .filter(b => b.customerRating)
      .reduce((sum, b, _, arr) => sum + (b.customerRating || 0) / arr.length, 0);
    const totalRatings = bookings.filter(b => b.customerRating).length;

    return { totalJobs, completedJobs, cancelledJobs, upcomingJobs, totalRevenue, unpaidRevenue, averageRating, totalRatings };
  }, [bookings]);

  const filteredBookings = useMemo(() => {
    const now = new Date();
    switch (bookingFilter) {
      case 'upcoming':
        return bookings.filter(b => new Date(b.scheduledDate) > now && b.status !== 'CANCELLED');
      case 'past':
        return bookings.filter(b => new Date(b.scheduledDate) <= now && b.status !== 'CANCELLED');
      case 'cancelled':
        return bookings.filter(b => b.status === 'CANCELLED');
      default:
        return bookings;
    }
  }, [bookings, bookingFilter]);

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      SCHEDULED: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      CLEANER_COMPLETED: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
      COMPLETED: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      CANCELLED: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
      NO_SHOW: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    };
    return colors[status] || colors.SCHEDULED;
  };

  const getInitials = (name: string) => {
    if (!name) return '?';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
    }
    return name.charAt(0).toUpperCase();
  };

  // Check if client is VIP based on tags
  const isVip = client?.tags?.some(tag => tag.toLowerCase() === 'vip') || false;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !client) {
    return (
      <div className="p-8 max-w-xl mx-auto">
        <Card className="p-6 text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Failed to Load Client</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">{error || 'Client not found'}</p>
          <div className="flex gap-3 justify-center">
            <Button variant="outline" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go Back
            </Button>
            <Button onClick={() => fetchClient()}>
              Try Again
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const referralTierConfig = REFERRAL_TIERS[(client as any).referralTier as keyof typeof REFERRAL_TIERS] || REFERRAL_TIERS.NONE;

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-start gap-6">
        {/* Back button - mobile */}
        <div className="lg:hidden">
          <Button variant="outline" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>

        {/* Client Avatar & Info */}
        <div className="flex-1">
          <div className="flex items-start gap-4 md:gap-6">
            {/* Back button - desktop */}
            <Button variant="outline" size="sm" onClick={() => router.back()} className="hidden lg:flex">
              <ArrowLeft className="h-4 w-4" />
            </Button>

            {/* Avatar */}
            <div className="relative">
              <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-2xl md:text-3xl font-bold shadow-lg">
                {getInitials(client.name)}
              </div>
              {isVip && (
                <div className="absolute -top-1 -right-1 w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center shadow-md">
                  <Crown className="w-5 h-5 text-yellow-800" />
                </div>
              )}
            </div>

            {/* Name & Badges */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white truncate">
                  {client.name}
                </h1>
                {isVip && (
                  <Badge variant="warning" className="gap-1">
                    <Crown className="w-3 h-3" />
                    VIP
                  </Badge>
                )}
                {client.hasInsurance && (
                  <Badge variant="info" className="gap-1">
                    <Shield className="w-3 h-3" />
                    Insured
                  </Badge>
                )}
                {(client as any).referralTier && (client as any).referralTier !== 'NONE' && (
                  <Badge variant="default" className="gap-1">
                    {referralTierConfig.icon} {referralTierConfig.name}
                  </Badge>
                )}
              </div>

              {/* Quick contact */}
              <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                {client.email && (
                  <a href={`mailto:${client.email}`} className="flex items-center gap-1 hover:text-blue-600">
                    <Mail className="w-4 h-4" />
                    <span className="hidden sm:inline">{client.email}</span>
                  </a>
                )}
                {client.phone && (
                  <a href={`tel:${client.phone}`} className="flex items-center gap-1 hover:text-blue-600">
                    <Phone className="w-4 h-4" />
                    <span className="hidden sm:inline">{client.phone}</span>
                  </a>
                )}
              </div>

              {/* Tags */}
              {client.tags && client.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {client.tags.map((tag) => (
                    <span key={tag} className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-2">
          <Link href={`/jobs/new?clientId=${clientId}`}>
            <Button size="sm" className="gap-1">
              <Plus className="h-4 w-4" />
              New Job
            </Button>
          </Link>
          <Button variant="outline" size="sm" className="gap-1" onClick={() => client.phone && window.open(`sms:${client.phone}`)}>
            <MessageSquare className="h-4 w-4" />
            Text
          </Button>
          <Link href={`/clients/${clientId}/edit`}>
            <Button variant="outline" size="sm" className="gap-1">
              <Edit className="h-4 w-4" />
              Edit
            </Button>
          </Link>
          <Button variant="outline" size="sm" onClick={handleDelete} disabled={deleting} className="text-red-600 hover:text-red-700 dark:text-red-400 gap-1">
            <Trash2 className="h-4 w-4" />
            {deleting ? '...' : 'Delete'}
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
        <Card className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500 rounded-lg">
              <Calendar className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-xs text-blue-700 dark:text-blue-400">Total Jobs</p>
              <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{clientStats.totalJobs}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-green-200 dark:border-green-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-500 rounded-lg">
              <CheckCircle2 className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-xs text-green-700 dark:text-green-400">Completed</p>
              <p className="text-2xl font-bold text-green-900 dark:text-green-100">{clientStats.completedJobs}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border-purple-200 dark:border-purple-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500 rounded-lg">
              <DollarSign className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-xs text-purple-700 dark:text-purple-400">Revenue</p>
              <p className="text-xl font-bold text-purple-900 dark:text-purple-100">{formatCurrency(clientStats.totalRevenue)}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20 border-yellow-200 dark:border-yellow-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-500 rounded-lg">
              <Gift className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-xs text-yellow-700 dark:text-yellow-400">Referral Credits</p>
              <p className="text-xl font-bold text-yellow-900 dark:text-yellow-100">{formatCurrency((client as any).referralCreditsBalance || 0)}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 border-orange-200 dark:border-orange-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-500 rounded-lg">
              <Star className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-xs text-orange-700 dark:text-orange-400">Avg Rating</p>
              <p className="text-2xl font-bold text-orange-900 dark:text-orange-100">
                {clientStats.averageRating > 0 ? clientStats.averageRating.toFixed(1) : '-'}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Insurance Banner */}
      {client.hasInsurance && (
        <Card className="p-4 bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500 rounded-lg">
                <Shield className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-blue-900 dark:text-blue-100">Insurance Coverage Active</h3>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  {client.insuranceProvider || 'Insurance Provider'}
                  {client.insurancePaymentAmount && ` - ${formatCurrency(client.insurancePaymentAmount)} covered`}
                </p>
              </div>
            </div>
            {((client as any).standardCopayAmount || (client as any).copayDiscountAmount) && (
              <div className="text-right">
                <p className="text-xs text-blue-600 dark:text-blue-400">Copay Amount</p>
                <p className="font-semibold text-blue-900 dark:text-blue-100">
                  {formatCurrency(
                    ((client as any).standardCopayAmount || 0) - ((client as any).copayDiscountAmount || 0)
                  )}
                </p>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full overflow-x-auto flex-nowrap">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="bookings">Bookings</TabsTrigger>
          <TabsTrigger value="financial">Financial</TabsTrigger>
          <TabsTrigger value="referrals">Referrals</TabsTrigger>
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview">
          <div className="grid md:grid-cols-2 gap-4">
            {/* Contact Information */}
            <Card className="p-5">
              <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                <Phone className="h-5 w-5 text-gray-400" />
                Contact Information
              </h3>
              <div className="space-y-3">
                {client.email && (
                  <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                    <div className="flex items-center gap-3">
                      <Mail className="h-4 w-4 text-gray-400" />
                      <span className="text-sm">Email</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <a href={`mailto:${client.email}`} className="text-sm text-blue-600 hover:underline">{client.email}</a>
                      <button onClick={() => copyToClipboard(client.email!)} className="text-gray-400 hover:text-gray-600">
                        <Copy className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}
                {client.phone && (
                  <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                    <div className="flex items-center gap-3">
                      <Phone className="h-4 w-4 text-gray-400" />
                      <span className="text-sm">Phone</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <a href={`tel:${client.phone}`} className="text-sm text-blue-600 hover:underline">{client.phone}</a>
                      <button onClick={() => copyToClipboard(client.phone!)} className="text-gray-400 hover:text-gray-600">
                        <Copy className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}
                <div className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-3">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <span className="text-sm">Customer Since</span>
                  </div>
                  <span className="text-sm">{new Date(client.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            </Card>

            {/* Addresses */}
            <Card className="p-5">
              <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                <MapPin className="h-5 w-5 text-gray-400" />
                Addresses
              </h3>
              {client.addresses.length === 0 ? (
                <p className="text-sm text-gray-500 italic">No addresses on file</p>
              ) : (
                <div className="space-y-3">
                  {client.addresses.map((address) => (
                    <div key={address.id} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {(address as any).propertyType === 'Single Family' && <Home className="h-4 w-4 text-gray-400" />}
                          {(address as any).propertyType === 'Condo' && <Building className="h-4 w-4 text-gray-400" />}
                          {(address as any).propertyType === 'Apartment' && <Building className="h-4 w-4 text-gray-400" />}
                          {!(address as any).propertyType && <MapPin className="h-4 w-4 text-gray-400" />}
                          <span className="text-sm font-medium">{address.label || 'Address'}</span>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{address.street}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{address.city}, {address.state} {address.zip}</p>
                      {((address as any).bedrooms || (address as any).bathrooms || (address as any).squareFootage) && (
                        <div className="flex gap-3 mt-2 text-xs text-gray-500">
                          {(address as any).bedrooms && <span>{(address as any).bedrooms} bed</span>}
                          {(address as any).bathrooms && <span>{(address as any).bathrooms} bath</span>}
                          {(address as any).squareFootage && <span>{(address as any).squareFootage} sqft</span>}
                        </div>
                      )}
                      {(address as any).petInfo && (
                        <div className="flex items-center gap-1 mt-2 text-xs text-amber-600">
                          <PawPrint className="h-3 w-3" />
                          {(address as any).petInfo}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Notes */}
            <Card className="p-5 md:col-span-2">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <StickyNote className="h-5 w-5 text-gray-400" />
                  Notes
                </h3>
                {!editingNotes && (
                  <Button variant="outline" size="sm" onClick={() => setEditingNotes(true)}>
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                )}
              </div>
              {editingNotes ? (
                <div className="space-y-3">
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add notes about this client..."
                    rows={6}
                    className="w-full"
                  />
                  <div className="flex gap-2">
                    <Button onClick={handleSaveNotes} disabled={savingNotes} size="sm">
                      <Save className="h-4 w-4 mr-1" />
                      {savingNotes ? 'Saving...' : 'Save'}
                    </Button>
                    <Button variant="outline" onClick={handleCancelNotes} disabled={savingNotes} size="sm">
                      <X className="h-4 w-4 mr-1" />
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div>
                  {client.notes ? (
                    <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{client.notes}</p>
                  ) : (
                    <p className="text-sm text-gray-500 italic">No notes yet. Click Edit to add notes about this client.</p>
                  )}
                </div>
              )}
            </Card>
          </div>
        </TabsContent>

        {/* Bookings Tab */}
        <TabsContent value="bookings">
          <Card className="p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <h3 className="font-semibold text-lg">Booking History</h3>
              <div className="flex gap-2">
                <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                  {(['all', 'upcoming', 'past', 'cancelled'] as const).map((filter) => (
                    <button
                      key={filter}
                      onClick={() => setBookingFilter(filter)}
                      className={`px-3 py-1 text-sm rounded-md transition-colors ${
                        bookingFilter === filter
                          ? 'bg-white dark:bg-gray-700 shadow-sm font-medium'
                          : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'
                      }`}
                    >
                      {filter.charAt(0).toUpperCase() + filter.slice(1)}
                    </button>
                  ))}
                </div>
                <Link href={`/jobs/new?clientId=${clientId}`}>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-1" />
                    New
                  </Button>
                </Link>
              </div>
            </div>

            {filteredBookings.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No {bookingFilter !== 'all' ? bookingFilter : ''} bookings found</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredBookings.map((booking) => (
                  <Link key={booking.id} href={`/jobs/${booking.id}`}>
                    <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-sm transition-all">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(booking.status)}`}>
                              {booking.status.replace('_', ' ')}
                            </span>
                            {booking.isRecurring && (
                              <Badge variant="outline" size="sm">Recurring</Badge>
                            )}
                            {(booking as any).hasInsuranceCoverage && (
                              <Badge variant="info" size="sm">Insurance</Badge>
                            )}
                          </div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {formatDateTime(booking.scheduledDate)}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                            {booking.address?.street}, {booking.address?.city}
                          </p>
                          <p className="text-sm text-gray-500 mt-1">
                            {booking.serviceType} - {formatDuration(booking.duration)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-lg">{formatCurrency(booking.price ?? 0)}</p>
                          {booking.isPaid ? (
                            <Badge variant="success" size="sm">Paid</Badge>
                          ) : booking.status === 'COMPLETED' && (
                            <Badge variant="warning" size="sm">Unpaid</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>

        {/* Financial Tab */}
        <TabsContent value="financial">
          <div className="grid md:grid-cols-3 gap-4 mb-4">
            <Card className="p-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Revenue</p>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(clientStats.totalRevenue)}</p>
            </Card>
            <Card className="p-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">Referral Credits</p>
              <p className="text-2xl font-bold text-blue-600">{formatCurrency((client as any).referralCreditsBalance || 0)}</p>
            </Card>
            <Card className="p-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">Outstanding</p>
              <p className="text-2xl font-bold text-yellow-600">{formatCurrency(clientStats.unpaidRevenue)}</p>
            </Card>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {/* Invoices */}
            <Card className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <Receipt className="h-5 w-5 text-gray-400" />
                  Invoices
                </h3>
                <Link href="/invoices">
                  <Button variant="outline" size="sm">View All</Button>
                </Link>
              </div>
              {invoices.length === 0 ? (
                <p className="text-sm text-gray-500 italic text-center py-4">No invoices yet</p>
              ) : (
                <div className="space-y-2">
                  {invoices.slice(0, 5).map((invoice) => (
                    <div key={invoice.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div>
                        <p className="font-medium text-sm">{invoice.invoiceNumber}</p>
                        <p className="text-xs text-gray-500">Due: {new Date(invoice.dueDate).toLocaleDateString()}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          invoice.status === 'PAID' ? 'bg-green-100 text-green-700' :
                          invoice.status === 'OVERDUE' ? 'bg-red-100 text-red-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {invoice.status}
                        </span>
                        <span className="font-medium">{formatCurrency(invoice.total)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Credit Transactions */}
            <Card className="p-5">
              <h3 className="font-semibold text-lg flex items-center gap-2 mb-4">
                <CreditCard className="h-5 w-5 text-gray-400" />
                Credit History
              </h3>
              {creditTransactions.length === 0 ? (
                <p className="text-sm text-gray-500 italic text-center py-4">No credit transactions</p>
              ) : (
                <div className="space-y-2">
                  {creditTransactions.slice(0, 5).map((tx: any) => (
                    <div key={tx.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div>
                        <p className="font-medium text-sm">{tx.description || tx.type}</p>
                        <p className="text-xs text-gray-500">{new Date(tx.createdAt).toLocaleDateString()}</p>
                      </div>
                      <span className={`font-medium ${tx.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {tx.amount > 0 ? '+' : ''}{formatCurrency(tx.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </TabsContent>

        {/* Referrals Tab */}
        <TabsContent value="referrals">
          <div className="grid md:grid-cols-2 gap-4">
            {/* Referral Program */}
            <Card className="p-5">
              <h3 className="font-semibold text-lg flex items-center gap-2 mb-4">
                <Users className="h-5 w-5 text-gray-400" />
                Referral Program
              </h3>

              {(client as any).referralCode ? (
                <div className="space-y-4">
                  <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <p className="text-xs text-gray-500 mb-1">Referral Code</p>
                    <div className="flex items-center justify-between">
                      <code className="font-mono text-lg font-bold">{(client as any).referralCode}</code>
                      <Button variant="outline" size="sm" onClick={() => copyToClipboard((client as any).referralCode!)}>
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                      <p className="text-xl font-bold text-green-600">{formatCurrency((client as any).referralCreditsEarned || 0)}</p>
                      <p className="text-xs text-gray-500">Earned</p>
                    </div>
                    <div className="text-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                      <p className="text-xl font-bold text-red-600">{formatCurrency((client as any).referralCreditsUsed || 0)}</p>
                      <p className="text-xs text-gray-500">Used</p>
                    </div>
                    <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <p className="text-xl font-bold text-blue-600">{formatCurrency((client as any).referralCreditsBalance || 0)}</p>
                      <p className="text-xs text-gray-500">Available</p>
                    </div>
                  </div>

                  <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <span className="text-3xl">{referralTierConfig.icon}</span>
                    <p className="font-semibold mt-1">{referralTierConfig.name} Tier</p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6 text-gray-500">
                  <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No referral code assigned</p>
                </div>
              )}
            </Card>

            {/* Important Dates */}
            <Card className="p-5">
              <h3 className="font-semibold text-lg flex items-center gap-2 mb-4">
                <Calendar className="h-5 w-5 text-gray-400" />
                Important Dates
              </h3>
              <div className="space-y-4">
                <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">Customer Since</p>
                  <p className="font-medium">{new Date(client.createdAt).toLocaleDateString()}</p>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">Birthday</p>
                  <p className="font-medium">{(client as any).birthday ? new Date((client as any).birthday).toLocaleDateString() : '-'}</p>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">Anniversary</p>
                  <p className="font-medium">{(client as any).anniversary ? new Date((client as any).anniversary).toLocaleDateString() : '-'}</p>
                </div>
              </div>
            </Card>
          </div>
        </TabsContent>

        {/* Preferences Tab */}
        <TabsContent value="preferences">
          <Card className="p-5">
            <h3 className="font-semibold text-lg flex items-center gap-2 mb-4">
              <Sparkles className="h-5 w-5 text-gray-400" />
              Customer Preferences
            </h3>
            <PreferenceForm clientId={clientId} />
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

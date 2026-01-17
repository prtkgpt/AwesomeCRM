'use client';

import { useState, useEffect } from 'react';
import { Plus, Gift, CreditCard, DollarSign, Calendar, Search, Copy, CheckCircle, XCircle, Clock } from 'lucide-react';
import { DataTable, Column } from '@/components/ui/data-table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge, StatusBadge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { DatePicker } from '@/components/ui/date-picker';
import { cn } from '@/lib/utils';
import { format, addMonths, addYears } from 'date-fns';

interface GiftCard {
  id: string;
  code: string;
  originalAmount: number;
  currentBalance: number;
  status: 'ACTIVE' | 'REDEEMED' | 'EXPIRED' | 'CANCELLED';
  purchasedBy?: { firstName: string; lastName: string; email: string };
  recipientEmail?: string;
  recipientName?: string;
  message?: string;
  expiresAt: string;
  createdAt: string;
  redeemedBy?: { firstName: string; lastName: string };
  redeemedAt?: string;
}

interface Promotion {
  id: string;
  code: string;
  name: string;
  type: 'PERCENTAGE' | 'FIXED_AMOUNT' | 'FREE_SERVICE';
  value: number;
  minOrderValue: number;
  maxDiscount?: number;
  usageLimit?: number;
  usageLimitPerUser: number;
  usageCount: number;
  validFrom: string;
  validTo: string;
  isActive: boolean;
  isFirstTimeOnly: boolean;
}

export default function GiftCardsPage() {
  const [giftCards, setGiftCards] = useState<GiftCard[]>([]);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('gift-cards');
  const [showCreateGiftCard, setShowCreateGiftCard] = useState(false);
  const [showCreatePromo, setShowCreatePromo] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const [giftCardForm, setGiftCardForm] = useState({
    amount: 50,
    recipientEmail: '',
    recipientName: '',
    message: '',
    expiresAt: addYears(new Date(), 1),
  });

  const [promoForm, setPromoForm] = useState({
    code: '',
    name: '',
    type: 'PERCENTAGE' as Promotion['type'],
    value: 10,
    minOrderValue: 0,
    maxDiscount: 0,
    usageLimit: 0,
    usageLimitPerUser: 1,
    validFrom: new Date(),
    validTo: addMonths(new Date(), 1),
    isFirstTimeOnly: false,
  });

  useEffect(() => {
    fetchGiftCards();
    fetchPromotions();
  }, []);

  const fetchGiftCards = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/payments/gift-cards');
      const data = await res.json();
      if (data.success) {
        setGiftCards(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch gift cards:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPromotions = async () => {
    try {
      const res = await fetch('/api/promotions');
      const data = await res.json();
      if (data.success) {
        setPromotions(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch promotions:', error);
    }
  };

  const handleCreateGiftCard = async () => {
    try {
      const res = await fetch('/api/payments/gift-cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(giftCardForm),
      });
      if (res.ok) {
        setShowCreateGiftCard(false);
        fetchGiftCards();
        setGiftCardForm({
          amount: 50,
          recipientEmail: '',
          recipientName: '',
          message: '',
          expiresAt: addYears(new Date(), 1),
        });
      }
    } catch (error) {
      console.error('Failed to create gift card:', error);
    }
  };

  const handleCreatePromo = async () => {
    try {
      const res = await fetch('/api/promotions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(promoForm),
      });
      if (res.ok) {
        setShowCreatePromo(false);
        fetchPromotions();
        setPromoForm({
          code: '',
          name: '',
          type: 'PERCENTAGE',
          value: 10,
          minOrderValue: 0,
          maxDiscount: 0,
          usageLimit: 0,
          usageLimitPerUser: 1,
          validFrom: new Date(),
          validTo: addMonths(new Date(), 1),
          isFirstTimeOnly: false,
        });
      }
    } catch (error) {
      console.error('Failed to create promotion:', error);
    }
  };

  const handleTogglePromo = async (id: string, isActive: boolean) => {
    try {
      await fetch(`/api/promotions?id=${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !isActive }),
      });
      fetchPromotions();
    } catch (error) {
      console.error('Failed to toggle promotion:', error);
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const giftCardColumns: Column<GiftCard>[] = [
    {
      key: 'code',
      header: 'Code',
      render: (gc) => (
        <div className="flex items-center gap-2">
          <code className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded font-mono text-sm">
            {gc.code}
          </code>
          <button
            onClick={(e) => { e.stopPropagation(); copyCode(gc.code); }}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
          >
            {copiedCode === gc.code ? (
              <CheckCircle className="w-4 h-4 text-green-600" />
            ) : (
              <Copy className="w-4 h-4 text-gray-400" />
            )}
          </button>
        </div>
      ),
    },
    {
      key: 'amount',
      header: 'Value',
      render: (gc) => (
        <div>
          <p className="font-medium text-gray-900 dark:text-white">${gc.currentBalance.toFixed(2)}</p>
          {gc.currentBalance !== gc.originalAmount && (
            <p className="text-xs text-gray-500">of ${gc.originalAmount.toFixed(2)}</p>
          )}
        </div>
      ),
    },
    {
      key: 'recipient',
      header: 'Recipient',
      render: (gc) => (
        gc.recipientName ? (
          <div>
            <p className="text-sm text-gray-900 dark:text-white">{gc.recipientName}</p>
            <p className="text-xs text-gray-500">{gc.recipientEmail}</p>
          </div>
        ) : (
          <span className="text-gray-400">-</span>
        )
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (gc) => (
        <StatusBadge
          status={
            gc.status === 'ACTIVE' ? 'active' :
            gc.status === 'REDEEMED' ? 'completed' :
            gc.status === 'EXPIRED' ? 'error' : 'cancelled'
          }
          label={gc.status}
        />
      ),
    },
    {
      key: 'expires',
      header: 'Expires',
      render: (gc) => (
        <span className={cn(
          'text-sm',
          new Date(gc.expiresAt) < new Date() ? 'text-red-600' : 'text-gray-600 dark:text-gray-400'
        )}>
          {format(new Date(gc.expiresAt), 'MMM d, yyyy')}
        </span>
      ),
    },
    {
      key: 'created',
      header: 'Created',
      render: (gc) => format(new Date(gc.createdAt), 'MMM d, yyyy'),
    },
  ];

  const promoColumns: Column<Promotion>[] = [
    {
      key: 'code',
      header: 'Code',
      render: (p) => (
        <div className="flex items-center gap-2">
          <code className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded font-mono text-sm font-bold">
            {p.code}
          </code>
          <button
            onClick={(e) => { e.stopPropagation(); copyCode(p.code); }}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
          >
            {copiedCode === p.code ? (
              <CheckCircle className="w-4 h-4 text-green-600" />
            ) : (
              <Copy className="w-4 h-4 text-gray-400" />
            )}
          </button>
        </div>
      ),
    },
    {
      key: 'name',
      header: 'Name',
      render: (p) => (
        <div>
          <p className="font-medium text-gray-900 dark:text-white">{p.name}</p>
          {p.isFirstTimeOnly && (
            <Badge variant="info" size="sm" className="mt-1">First-time only</Badge>
          )}
        </div>
      ),
    },
    {
      key: 'discount',
      header: 'Discount',
      render: (p) => (
        <span className="font-medium text-green-600">
          {p.type === 'PERCENTAGE' ? `${p.value}% off` :
           p.type === 'FIXED_AMOUNT' ? `$${p.value} off` :
           'Free service'}
        </span>
      ),
    },
    {
      key: 'usage',
      header: 'Usage',
      render: (p) => (
        <div>
          <p className="text-sm text-gray-900 dark:text-white">
            {p.usageCount}{p.usageLimit ? ` / ${p.usageLimit}` : ''} uses
          </p>
          {p.minOrderValue > 0 && (
            <p className="text-xs text-gray-500">Min. ${p.minOrderValue}</p>
          )}
        </div>
      ),
    },
    {
      key: 'validity',
      header: 'Valid Period',
      render: (p) => (
        <div className="text-sm">
          <p>{format(new Date(p.validFrom), 'MMM d')} - {format(new Date(p.validTo), 'MMM d, yyyy')}</p>
          {new Date(p.validTo) < new Date() && (
            <Badge variant="error" size="sm">Expired</Badge>
          )}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (p) => (
        <button
          onClick={(e) => { e.stopPropagation(); handleTogglePromo(p.id, p.isActive); }}
          className={cn(
            'relative w-12 h-6 rounded-full transition-colors',
            p.isActive ? 'bg-green-600' : 'bg-gray-300 dark:bg-gray-600'
          )}
        >
          <span
            className={cn(
              'absolute top-1 w-4 h-4 bg-white rounded-full transition-transform',
              p.isActive ? 'left-7' : 'left-1'
            )}
          />
        </button>
      ),
    },
  ];

  const giftCardStats = {
    total: giftCards.length,
    active: giftCards.filter(gc => gc.status === 'ACTIVE').length,
    totalValue: giftCards.filter(gc => gc.status === 'ACTIVE').reduce((sum, gc) => sum + gc.currentBalance, 0),
    redeemed: giftCards.filter(gc => gc.status === 'REDEEMED').length,
  };

  const promoStats = {
    total: promotions.length,
    active: promotions.filter(p => p.isActive && new Date(p.validTo) >= new Date()).length,
    totalUsage: promotions.reduce((sum, p) => sum + p.usageCount, 0),
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Gift Cards & Promotions</h1>
          <p className="text-gray-500 dark:text-gray-400">Manage gift cards and promotional codes</p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="gift-cards" value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between mb-6">
          <TabsList>
            <TabsTrigger value="gift-cards">Gift Cards</TabsTrigger>
            <TabsTrigger value="promotions">Promotions</TabsTrigger>
          </TabsList>
          <button
            onClick={() => activeTab === 'gift-cards' ? setShowCreateGiftCard(true) : setShowCreatePromo(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            {activeTab === 'gift-cards' ? 'Create Gift Card' : 'Create Promotion'}
          </button>
        </div>

        {/* Gift Cards Tab */}
        <TabsContent value="gift-cards">
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                  <Gift className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Cards</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">{giftCardStats.total}</p>
                </div>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <CreditCard className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Active Cards</p>
                  <p className="text-xl font-bold text-green-600">{giftCardStats.active}</p>
                </div>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <DollarSign className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Outstanding Value</p>
                  <p className="text-xl font-bold text-blue-600">${giftCardStats.totalValue.toFixed(2)}</p>
                </div>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-gray-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Redeemed</p>
                  <p className="text-xl font-bold text-gray-600">{giftCardStats.redeemed}</p>
                </div>
              </div>
            </div>
          </div>

          <DataTable
            data={giftCards}
            columns={giftCardColumns}
            keyField="id"
            searchable
            searchPlaceholder="Search gift cards..."
            loading={loading}
            emptyMessage="No gift cards found"
          />
        </TabsContent>

        {/* Promotions Tab */}
        <TabsContent value="promotions">
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
              <p className="text-sm text-gray-500">Total Promotions</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{promoStats.total}</p>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
              <p className="text-sm text-gray-500">Active Promotions</p>
              <p className="text-xl font-bold text-green-600">{promoStats.active}</p>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
              <p className="text-sm text-gray-500">Total Redemptions</p>
              <p className="text-xl font-bold text-blue-600">{promoStats.totalUsage}</p>
            </div>
          </div>

          <DataTable
            data={promotions}
            columns={promoColumns}
            keyField="id"
            searchable
            searchPlaceholder="Search promotions..."
            emptyMessage="No promotions found"
          />
        </TabsContent>
      </Tabs>

      {/* Create Gift Card Dialog */}
      <Dialog open={showCreateGiftCard} onClose={() => setShowCreateGiftCard(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Gift Card</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Amount ($)</label>
              <div className="flex gap-2">
                {[25, 50, 75, 100, 150, 200].map(amount => (
                  <button
                    key={amount}
                    onClick={() => setGiftCardForm({ ...giftCardForm, amount })}
                    className={cn(
                      'px-3 py-2 rounded-md text-sm',
                      giftCardForm.amount === amount
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700'
                    )}
                  >
                    ${amount}
                  </button>
                ))}
              </div>
              <input
                type="number"
                value={giftCardForm.amount}
                onChange={(e) => setGiftCardForm({ ...giftCardForm, amount: parseFloat(e.target.value) || 0 })}
                className="w-full mt-2 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Recipient Name</label>
                <input
                  type="text"
                  value={giftCardForm.recipientName}
                  onChange={(e) => setGiftCardForm({ ...giftCardForm, recipientName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Recipient Email</label>
                <input
                  type="email"
                  value={giftCardForm.recipientEmail}
                  onChange={(e) => setGiftCardForm({ ...giftCardForm, recipientEmail: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Personal Message</label>
              <textarea
                value={giftCardForm.message}
                onChange={(e) => setGiftCardForm({ ...giftCardForm, message: e.target.value })}
                rows={2}
                placeholder="Add a personal message (optional)"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900 resize-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Expires</label>
              <DatePicker
                value={giftCardForm.expiresAt}
                onChange={(date) => date && setGiftCardForm({ ...giftCardForm, expiresAt: date })}
                minDate={new Date()}
              />
            </div>
          </div>
          <DialogFooter>
            <button onClick={() => setShowCreateGiftCard(false)} className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-md">
              Cancel
            </button>
            <button onClick={handleCreateGiftCard} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
              Create Gift Card
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Promotion Dialog */}
      <Dialog open={showCreatePromo} onClose={() => setShowCreatePromo(false)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Promotion</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Promo Code</label>
                <input
                  type="text"
                  value={promoForm.code}
                  onChange={(e) => setPromoForm({ ...promoForm, code: e.target.value.toUpperCase() })}
                  placeholder="e.g., SPRING20"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900 uppercase"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
                <input
                  type="text"
                  value={promoForm.name}
                  onChange={(e) => setPromoForm({ ...promoForm, name: e.target.value })}
                  placeholder="Spring Sale"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Discount Type</label>
                <select
                  value={promoForm.type}
                  onChange={(e) => setPromoForm({ ...promoForm, type: e.target.value as Promotion['type'] })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900"
                >
                  <option value="PERCENTAGE">Percentage Off</option>
                  <option value="FIXED_AMOUNT">Fixed Amount Off</option>
                  <option value="FREE_SERVICE">Free Service</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {promoForm.type === 'PERCENTAGE' ? 'Percentage' : 'Amount ($)'}
                </label>
                <input
                  type="number"
                  value={promoForm.value}
                  onChange={(e) => setPromoForm({ ...promoForm, value: parseFloat(e.target.value) || 0 })}
                  min={0}
                  max={promoForm.type === 'PERCENTAGE' ? 100 : undefined}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Min. Order Value ($)</label>
                <input
                  type="number"
                  value={promoForm.minOrderValue}
                  onChange={(e) => setPromoForm({ ...promoForm, minOrderValue: parseFloat(e.target.value) || 0 })}
                  min={0}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Max Discount ($)</label>
                <input
                  type="number"
                  value={promoForm.maxDiscount}
                  onChange={(e) => setPromoForm({ ...promoForm, maxDiscount: parseFloat(e.target.value) || 0 })}
                  min={0}
                  placeholder="0 = no limit"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Total Usage Limit</label>
                <input
                  type="number"
                  value={promoForm.usageLimit}
                  onChange={(e) => setPromoForm({ ...promoForm, usageLimit: parseInt(e.target.value) || 0 })}
                  min={0}
                  placeholder="0 = unlimited"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Per Customer Limit</label>
                <input
                  type="number"
                  value={promoForm.usageLimitPerUser}
                  onChange={(e) => setPromoForm({ ...promoForm, usageLimitPerUser: parseInt(e.target.value) || 1 })}
                  min={1}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Valid From</label>
                <DatePicker
                  value={promoForm.validFrom}
                  onChange={(date) => date && setPromoForm({ ...promoForm, validFrom: date })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Valid To</label>
                <DatePicker
                  value={promoForm.validTo}
                  onChange={(date) => date && setPromoForm({ ...promoForm, validTo: date })}
                  minDate={promoForm.validFrom}
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="firstTimeOnly"
                checked={promoForm.isFirstTimeOnly}
                onChange={(e) => setPromoForm({ ...promoForm, isFirstTimeOnly: e.target.checked })}
                className="rounded border-gray-300 dark:border-gray-600"
              />
              <label htmlFor="firstTimeOnly" className="text-sm text-gray-700 dark:text-gray-300">
                First-time customers only
              </label>
            </div>
          </div>
          <DialogFooter>
            <button onClick={() => setShowCreatePromo(false)} className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-md">
              Cancel
            </button>
            <button onClick={handleCreatePromo} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
              Create Promotion
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

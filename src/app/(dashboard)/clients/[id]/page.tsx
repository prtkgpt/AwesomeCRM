'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  DollarSign,
  CreditCard,
  ClipboardList,
  MessageSquare,
  Save,
  Edit2,
  X,
  Star,
  Gift,
  Shield,
  Clock,
  CheckCircle,
  Home,
  Key,
  Sparkles,
  PawPrint,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format } from 'date-fns';

interface Client {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  tags: string[];
  notes: string | null;
  internalNotes: string | null;
  cleaningTeamNotes: string | null;
  hasInsurance: boolean;
  insuranceProvider: string | null;
  insurancePaymentAmount: number | null;
  standardCopayAmount: number | null;
  hasDiscountedCopay: boolean;
  copayDiscountAmount: number | null;
  copayNotes: string | null;
  stripeCustomerId: string | null;
  zelleId: string | null;
  venmoUsername: string | null;
  cashAppUsername: string | null;
  autoChargeEnabled: boolean;
  referralCode: string | null;
  referralCreditsBalance: number;
  referralCreditsEarned: number;
  referralCreditsUsed: number;
  birthday: string | null;
  createdAt: string;
  addresses: Array<{
    id: string;
    street: string;
    city: string;
    state: string;
    zip: string;
    propertyType: string | null;
    squareFootage: number | null;
    bedrooms: number | null;
    bathrooms: number | null;
    petInfo: string | null;
  }>;
  bookings: Array<{
    id: string;
    scheduledDate: string;
    status: string;
    serviceType: string;
    price: number;
    assignee: { user: { name: string } | null } | null;
  }>;
  preferences: {
    cleaningSequence: string | null;
    areasToFocus: string | null;
    areasToAvoid: string | null;
    productAllergies: string | null;
    preferredProducts: string | null;
    avoidScents: boolean;
    scentPreferences: string | null;
    petHandlingInstructions: string | null;
    petFeedingNeeded: boolean;
    petFeedingInstructions: string | null;
    keyLocation: string | null;
    alarmCode: string | null;
    entryInstructions: string | null;
    specialRequests: string | null;
    thingsToKnow: string | null;
    temperaturePreferences: string | null;
  } | null;
}

export default function ClientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const clientId = params.id as string;

  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Record<string, any>>({});

  const loadClient = useCallback(async () => {
    try {
      const res = await fetch(`/api/clients/${clientId}`);
      const data = await res.json();
      if (data.success) {
        setClient(data.data);
      } else {
        setError(data.error || 'Failed to load client');
      }
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    if (clientId) loadClient();
  }, [clientId, loadClient]);

  const saveChanges = async (data: Record<string, any>) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/clients/${clientId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (result.success) {
        await loadClient();
        setEditingSection(null);
        setEditForm({});
      } else {
        alert('Failed to save: ' + result.error);
      }
    } catch {
      alert('Network error while saving');
    } finally {
      setSaving(false);
    }
  };

  const savePreferences = async (data: Record<string, any>) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/clients/${clientId}/preferences`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (result.success) {
        await loadClient();
        setEditingSection(null);
        setEditForm({});
      } else {
        alert('Failed to save: ' + result.error);
      }
    } catch {
      alert('Network error');
    } finally {
      setSaving(false);
    }
  };

  const startEditing = (section: string, initialData: Record<string, any>) => {
    setEditingSection(section);
    setEditForm(initialData);
  };

  const cancelEditing = () => {
    setEditingSection(null);
    setEditForm({});
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-gray-200 rounded"></div>
          <div className="h-64 bg-gray-100 rounded"></div>
        </div>
      </div>
    );
  }

  if (error || !client) {
    return (
      <div className="p-6">
        <Card className="p-6">
          <h1 className="text-xl font-bold text-red-600 mb-4">Error</h1>
          <p className="mb-4">{error}</p>
          <Link href="/clients">
            <Button><ArrowLeft className="h-4 w-4 mr-2" />Back</Button>
          </Link>
        </Card>
      </div>
    );
  }

  const primaryAddress = client.addresses?.[0];
  const completedBookings = client.bookings?.filter(b => b.status === 'COMPLETED') || [];
  const upcomingBookings = client.bookings?.filter(b => b.status === 'SCHEDULED' && new Date(b.scheduledDate) > new Date()) || [];
  const totalSpent = completedBookings.reduce((sum, b) => sum + (b.price || 0), 0);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/clients">
            <Button variant="outline" size="sm"><ArrowLeft className="h-4 w-4 mr-2" />Back</Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              {client.name}
              {client.hasInsurance && <Badge variant="secondary"><Shield className="h-3 w-3 mr-1" />Insurance</Badge>}
            </h1>
            <p className="text-sm text-gray-500">Customer since {format(new Date(client.createdAt), 'MMM yyyy')}</p>
          </div>
        </div>
        <Button onClick={() => router.push(`/jobs/new?clientId=${client.id}`)}>
          <Calendar className="h-4 w-4 mr-2" />Book Service
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg"><Calendar className="h-5 w-5 text-blue-600" /></div>
            <div>
              <p className="text-2xl font-bold">{completedBookings.length}</p>
              <p className="text-xs text-gray-500">Bookings</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg"><DollarSign className="h-5 w-5 text-green-600" /></div>
            <div>
              <p className="text-2xl font-bold">${totalSpent.toFixed(0)}</p>
              <p className="text-xs text-gray-500">Total Spent</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg"><Gift className="h-5 w-5 text-purple-600" /></div>
            <div>
              <p className="text-2xl font-bold">${client.referralCreditsBalance.toFixed(0)}</p>
              <p className="text-xs text-gray-500">Credits</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg"><Clock className="h-5 w-5 text-orange-600" /></div>
            <div>
              <p className="text-2xl font-bold">{upcomingBookings.length}</p>
              <p className="text-xs text-gray-500">Upcoming</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-5 w-full max-w-2xl">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
          <TabsTrigger value="bookings">Bookings</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4 mt-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Card className="p-4">
              <h3 className="font-semibold mb-3 flex items-center gap-2"><User className="h-4 w-4" />Contact</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2"><Mail className="h-4 w-4 text-gray-400" />{client.email || 'No email'}</div>
                <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-gray-400" />{client.phone || 'No phone'}</div>
                {primaryAddress && (
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
                    <div>
                      <p>{primaryAddress.street}</p>
                      <p>{primaryAddress.city}, {primaryAddress.state} {primaryAddress.zip}</p>
                    </div>
                  </div>
                )}
              </div>
            </Card>

            {primaryAddress && (
              <Card className="p-4">
                <h3 className="font-semibold mb-3 flex items-center gap-2"><Home className="h-4 w-4" />Property</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {primaryAddress.propertyType && <div><span className="text-gray-500">Type:</span> {primaryAddress.propertyType}</div>}
                  {primaryAddress.squareFootage && <div><span className="text-gray-500">Size:</span> {primaryAddress.squareFootage} sqft</div>}
                  {primaryAddress.bedrooms && <div><span className="text-gray-500">Beds:</span> {primaryAddress.bedrooms}</div>}
                  {primaryAddress.bathrooms && <div><span className="text-gray-500">Baths:</span> {primaryAddress.bathrooms}</div>}
                  {primaryAddress.petInfo && <div className="col-span-2 flex items-center gap-1"><PawPrint className="h-3 w-3" />{primaryAddress.petInfo}</div>}
                </div>
              </Card>
            )}
          </div>

          <Card className="p-4">
            <h3 className="font-semibold mb-3 flex items-center gap-2"><Calendar className="h-4 w-4" />Recent Bookings</h3>
            {client.bookings?.length > 0 ? (
              <div className="space-y-2">
                {client.bookings.slice(0, 5).map(booking => (
                  <div key={booking.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <div className="flex items-center gap-3">
                      <div className={`p-1.5 rounded ${booking.status === 'COMPLETED' ? 'bg-green-100' : 'bg-blue-100'}`}>
                        {booking.status === 'COMPLETED' ? <CheckCircle className="h-4 w-4 text-green-600" /> : <Clock className="h-4 w-4 text-blue-600" />}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{format(new Date(booking.scheduledDate), 'MMM d, yyyy')}</p>
                        <p className="text-xs text-gray-500">{booking.serviceType}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">${booking.price}</p>
                      <Badge variant={booking.status === 'COMPLETED' ? 'default' : 'secondary'} className="text-xs">{booking.status}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No bookings yet</p>
            )}
          </Card>
        </TabsContent>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-4 mt-4">
          {/* Contact */}
          <Card className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold flex items-center gap-2"><User className="h-4 w-4" />Contact</h3>
              {editingSection !== 'contact' ? (
                <Button variant="ghost" size="sm" onClick={() => startEditing('contact', { name: client.name, email: client.email || '', phone: client.phone || '' })}><Edit2 className="h-4 w-4" /></Button>
              ) : (
                <div className="flex gap-2">
                  <Button size="sm" disabled={saving} onClick={() => saveChanges(editForm)}><Save className="h-4 w-4 mr-1" />{saving ? 'Saving...' : 'Save'}</Button>
                  <Button variant="ghost" size="sm" onClick={cancelEditing}><X className="h-4 w-4" /></Button>
                </div>
              )}
            </div>
            {editingSection === 'contact' ? (
              <div className="space-y-3">
                <div><label className="text-sm font-medium">Name</label><input type="text" className="w-full mt-1 px-3 py-2 border rounded-md" value={editForm.name || ''} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} /></div>
                <div><label className="text-sm font-medium">Email</label><input type="email" className="w-full mt-1 px-3 py-2 border rounded-md" value={editForm.email || ''} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} /></div>
                <div><label className="text-sm font-medium">Phone</label><input type="tel" className="w-full mt-1 px-3 py-2 border rounded-md" value={editForm.phone || ''} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} /></div>
              </div>
            ) : (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">Name:</span><span className="font-medium">{client.name}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Email:</span><span>{client.email || 'Not set'}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Phone:</span><span>{client.phone || 'Not set'}</span></div>
              </div>
            )}
          </Card>

          {/* Payment */}
          <Card className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold flex items-center gap-2"><CreditCard className="h-4 w-4" />Payment Methods</h3>
              {editingSection !== 'payment' ? (
                <Button variant="ghost" size="sm" onClick={() => startEditing('payment', { stripeCustomerId: client.stripeCustomerId || '', zelleId: client.zelleId || '', venmoUsername: client.venmoUsername || '', cashAppUsername: client.cashAppUsername || '' })}><Edit2 className="h-4 w-4" /></Button>
              ) : (
                <div className="flex gap-2">
                  <Button size="sm" disabled={saving} onClick={() => saveChanges(editForm)}><Save className="h-4 w-4 mr-1" />{saving ? 'Saving...' : 'Save'}</Button>
                  <Button variant="ghost" size="sm" onClick={cancelEditing}><X className="h-4 w-4" /></Button>
                </div>
              )}
            </div>
            {editingSection === 'payment' ? (
              <div className="space-y-3">
                <div><label className="text-sm font-medium">Stripe ID</label><input type="text" placeholder="cus_..." className="w-full mt-1 px-3 py-2 border rounded-md font-mono text-sm" value={editForm.stripeCustomerId || ''} onChange={(e) => setEditForm({ ...editForm, stripeCustomerId: e.target.value })} /></div>
                <div><label className="text-sm font-medium">Zelle</label><input type="text" placeholder="Email or phone" className="w-full mt-1 px-3 py-2 border rounded-md" value={editForm.zelleId || ''} onChange={(e) => setEditForm({ ...editForm, zelleId: e.target.value })} /></div>
                <div><label className="text-sm font-medium">Venmo</label><input type="text" placeholder="@username" className="w-full mt-1 px-3 py-2 border rounded-md" value={editForm.venmoUsername || ''} onChange={(e) => setEditForm({ ...editForm, venmoUsername: e.target.value })} /></div>
                <div><label className="text-sm font-medium">Cash App</label><input type="text" placeholder="$cashtag" className="w-full mt-1 px-3 py-2 border rounded-md" value={editForm.cashAppUsername || ''} onChange={(e) => setEditForm({ ...editForm, cashAppUsername: e.target.value })} /></div>
              </div>
            ) : (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">Stripe ID:</span><span className="font-mono">{client.stripeCustomerId || 'Not set'}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Zelle:</span><span>{client.zelleId || 'Not set'}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Venmo:</span><span>{client.venmoUsername || 'Not set'}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Cash App:</span><span>{client.cashAppUsername || 'Not set'}</span></div>
              </div>
            )}
          </Card>

          {/* Insurance */}
          {client.hasInsurance && (
            <Card className="p-4">
              <h3 className="font-semibold mb-3 flex items-center gap-2"><Shield className="h-4 w-4" />Insurance</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">Provider:</span><span>{client.insuranceProvider || 'Not specified'}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Insurance Pays:</span><span className="font-medium">${client.insurancePaymentAmount || 0}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Copay:</span><span>${client.standardCopayAmount || 0}</span></div>
              </div>
            </Card>
          )}

          {/* Referrals */}
          <Card className="p-4">
            <h3 className="font-semibold mb-3 flex items-center gap-2"><Gift className="h-4 w-4" />Referrals</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Code:</span><span className="font-mono bg-gray-100 px-2 py-0.5 rounded">{client.referralCode || 'Not generated'}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Earned:</span><span className="text-green-600">${client.referralCreditsEarned}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Used:</span><span>${client.referralCreditsUsed}</span></div>
              <div className="flex justify-between font-medium"><span>Balance:</span><span className="text-purple-600">${client.referralCreditsBalance}</span></div>
            </div>
          </Card>
        </TabsContent>

        {/* Preferences Tab */}
        <TabsContent value="preferences" className="space-y-4 mt-4">
          {/* Cleaning */}
          <Card className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold flex items-center gap-2"><Sparkles className="h-4 w-4" />Cleaning Preferences</h3>
              {editingSection !== 'cleaning' ? (
                <Button variant="ghost" size="sm" onClick={() => startEditing('cleaning', { cleaningSequence: client.preferences?.cleaningSequence || '', areasToFocus: client.preferences?.areasToFocus || '', areasToAvoid: client.preferences?.areasToAvoid || '' })}><Edit2 className="h-4 w-4" /></Button>
              ) : (
                <div className="flex gap-2">
                  <Button size="sm" disabled={saving} onClick={() => savePreferences(editForm)}><Save className="h-4 w-4 mr-1" />{saving ? 'Saving...' : 'Save'}</Button>
                  <Button variant="ghost" size="sm" onClick={cancelEditing}><X className="h-4 w-4" /></Button>
                </div>
              )}
            </div>
            {editingSection === 'cleaning' ? (
              <div className="space-y-3">
                <div><label className="text-sm font-medium">Cleaning Sequence</label><textarea rows={2} placeholder="Start with kitchen, then bathrooms..." className="w-full mt-1 px-3 py-2 border rounded-md text-sm" value={editForm.cleaningSequence || ''} onChange={(e) => setEditForm({ ...editForm, cleaningSequence: e.target.value })} /></div>
                <div><label className="text-sm font-medium">Areas to Focus</label><textarea rows={2} placeholder="Extra attention to..." className="w-full mt-1 px-3 py-2 border rounded-md text-sm" value={editForm.areasToFocus || ''} onChange={(e) => setEditForm({ ...editForm, areasToFocus: e.target.value })} /></div>
                <div><label className="text-sm font-medium">Areas to Avoid</label><textarea rows={2} placeholder="Don't move items on..." className="w-full mt-1 px-3 py-2 border rounded-md text-sm" value={editForm.areasToAvoid || ''} onChange={(e) => setEditForm({ ...editForm, areasToAvoid: e.target.value })} /></div>
              </div>
            ) : (
              <div className="space-y-3 text-sm">
                <div><p className="text-gray-500 text-xs mb-1">Cleaning Sequence</p><p className="bg-gray-50 p-2 rounded">{client.preferences?.cleaningSequence || 'Not specified'}</p></div>
                <div><p className="text-gray-500 text-xs mb-1">Areas to Focus</p><p className="bg-green-50 p-2 rounded text-green-800">{client.preferences?.areasToFocus || 'Not specified'}</p></div>
                <div><p className="text-gray-500 text-xs mb-1">Areas to Avoid</p><p className="bg-red-50 p-2 rounded text-red-800">{client.preferences?.areasToAvoid || 'Not specified'}</p></div>
              </div>
            )}
          </Card>

          {/* Allergies */}
          <Card className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold flex items-center gap-2"><AlertCircle className="h-4 w-4" />Products & Sensitivities</h3>
              {editingSection !== 'products' ? (
                <Button variant="ghost" size="sm" onClick={() => startEditing('products', { productAllergies: client.preferences?.productAllergies || '', preferredProducts: client.preferences?.preferredProducts || '', avoidScents: client.preferences?.avoidScents || false })}><Edit2 className="h-4 w-4" /></Button>
              ) : (
                <div className="flex gap-2">
                  <Button size="sm" disabled={saving} onClick={() => savePreferences(editForm)}><Save className="h-4 w-4 mr-1" />{saving ? 'Saving...' : 'Save'}</Button>
                  <Button variant="ghost" size="sm" onClick={cancelEditing}><X className="h-4 w-4" /></Button>
                </div>
              )}
            </div>
            {editingSection === 'products' ? (
              <div className="space-y-3">
                <div><label className="text-sm font-medium text-red-700">Allergies/Sensitivities</label><textarea rows={2} placeholder="Allergic to bleach..." className="w-full mt-1 px-3 py-2 border border-red-200 rounded-md text-sm" value={editForm.productAllergies || ''} onChange={(e) => setEditForm({ ...editForm, productAllergies: e.target.value })} /></div>
                <div><label className="text-sm font-medium">Preferred Products</label><textarea rows={2} placeholder="Customer provides own..." className="w-full mt-1 px-3 py-2 border rounded-md text-sm" value={editForm.preferredProducts || ''} onChange={(e) => setEditForm({ ...editForm, preferredProducts: e.target.value })} /></div>
                <div className="flex items-center gap-2"><input type="checkbox" id="avoidScents" checked={editForm.avoidScents || false} onChange={(e) => setEditForm({ ...editForm, avoidScents: e.target.checked })} /><label htmlFor="avoidScents" className="text-sm">Avoid scented products</label></div>
              </div>
            ) : (
              <div className="space-y-3 text-sm">
                {client.preferences?.productAllergies && <div className="bg-red-50 border border-red-200 p-3 rounded"><p className="text-red-800 font-medium text-xs mb-1">⚠️ ALLERGIES</p><p className="text-red-700">{client.preferences.productAllergies}</p></div>}
                <div><p className="text-gray-500 text-xs mb-1">Preferred Products</p><p>{client.preferences?.preferredProducts || 'No preference'}</p></div>
                {client.preferences?.avoidScents && <Badge variant="secondary">Avoid scented products</Badge>}
              </div>
            )}
          </Card>

          {/* Pets */}
          <Card className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold flex items-center gap-2"><PawPrint className="h-4 w-4" />Pet Handling</h3>
              {editingSection !== 'pets' ? (
                <Button variant="ghost" size="sm" onClick={() => startEditing('pets', { petHandlingInstructions: client.preferences?.petHandlingInstructions || '', petFeedingNeeded: client.preferences?.petFeedingNeeded || false, petFeedingInstructions: client.preferences?.petFeedingInstructions || '' })}><Edit2 className="h-4 w-4" /></Button>
              ) : (
                <div className="flex gap-2">
                  <Button size="sm" disabled={saving} onClick={() => savePreferences(editForm)}><Save className="h-4 w-4 mr-1" />{saving ? 'Saving...' : 'Save'}</Button>
                  <Button variant="ghost" size="sm" onClick={cancelEditing}><X className="h-4 w-4" /></Button>
                </div>
              )}
            </div>
            {editingSection === 'pets' ? (
              <div className="space-y-3">
                <div><label className="text-sm font-medium">Pet Instructions</label><textarea rows={2} placeholder="Keep dog in backyard..." className="w-full mt-1 px-3 py-2 border rounded-md text-sm" value={editForm.petHandlingInstructions || ''} onChange={(e) => setEditForm({ ...editForm, petHandlingInstructions: e.target.value })} /></div>
                <div className="flex items-center gap-2"><input type="checkbox" id="petFeeding" checked={editForm.petFeedingNeeded || false} onChange={(e) => setEditForm({ ...editForm, petFeedingNeeded: e.target.checked })} /><label htmlFor="petFeeding" className="text-sm">Pet feeding needed</label></div>
                {editForm.petFeedingNeeded && <div><label className="text-sm font-medium">Feeding Instructions</label><textarea rows={2} className="w-full mt-1 px-3 py-2 border rounded-md text-sm" value={editForm.petFeedingInstructions || ''} onChange={(e) => setEditForm({ ...editForm, petFeedingInstructions: e.target.value })} /></div>}
              </div>
            ) : (
              <div className="space-y-2 text-sm">
                <p>{client.preferences?.petHandlingInstructions || 'No pet instructions'}</p>
                {client.preferences?.petFeedingNeeded && <div className="bg-yellow-50 p-2 rounded"><p className="font-medium text-yellow-800">🐾 Pet feeding required</p><p className="text-yellow-700">{client.preferences.petFeedingInstructions}</p></div>}
              </div>
            )}
          </Card>

          {/* Access */}
          <Card className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold flex items-center gap-2"><Key className="h-4 w-4" />Access & Entry</h3>
              {editingSection !== 'access' ? (
                <Button variant="ghost" size="sm" onClick={() => startEditing('access', { keyLocation: client.preferences?.keyLocation || '', alarmCode: client.preferences?.alarmCode || '', entryInstructions: client.preferences?.entryInstructions || '' })}><Edit2 className="h-4 w-4" /></Button>
              ) : (
                <div className="flex gap-2">
                  <Button size="sm" disabled={saving} onClick={() => savePreferences(editForm)}><Save className="h-4 w-4 mr-1" />{saving ? 'Saving...' : 'Save'}</Button>
                  <Button variant="ghost" size="sm" onClick={cancelEditing}><X className="h-4 w-4" /></Button>
                </div>
              )}
            </div>
            {editingSection === 'access' ? (
              <div className="space-y-3">
                <div><label className="text-sm font-medium">Key Location</label><input type="text" placeholder="Under flower pot..." className="w-full mt-1 px-3 py-2 border rounded-md text-sm" value={editForm.keyLocation || ''} onChange={(e) => setEditForm({ ...editForm, keyLocation: e.target.value })} /></div>
                <div><label className="text-sm font-medium">Alarm Code</label><input type="text" placeholder="1234" className="w-full mt-1 px-3 py-2 border rounded-md text-sm font-mono" value={editForm.alarmCode || ''} onChange={(e) => setEditForm({ ...editForm, alarmCode: e.target.value })} /></div>
                <div><label className="text-sm font-medium">Entry Instructions</label><textarea rows={2} placeholder="Use back door..." className="w-full mt-1 px-3 py-2 border rounded-md text-sm" value={editForm.entryInstructions || ''} onChange={(e) => setEditForm({ ...editForm, entryInstructions: e.target.value })} /></div>
              </div>
            ) : (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">Key:</span><span>{client.preferences?.keyLocation || 'Not set'}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Alarm:</span><span className="font-mono bg-gray-100 px-2 rounded">{client.preferences?.alarmCode || 'Not set'}</span></div>
                {client.preferences?.entryInstructions && <div><p className="text-gray-500 text-xs mb-1">Entry</p><p className="bg-blue-50 p-2 rounded text-blue-800">{client.preferences.entryInstructions}</p></div>}
              </div>
            )}
          </Card>

          {/* Special */}
          <Card className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold flex items-center gap-2"><Star className="h-4 w-4" />Special Requests</h3>
              {editingSection !== 'special' ? (
                <Button variant="ghost" size="sm" onClick={() => startEditing('special', { specialRequests: client.preferences?.specialRequests || '', thingsToKnow: client.preferences?.thingsToKnow || '' })}><Edit2 className="h-4 w-4" /></Button>
              ) : (
                <div className="flex gap-2">
                  <Button size="sm" disabled={saving} onClick={() => savePreferences(editForm)}><Save className="h-4 w-4 mr-1" />{saving ? 'Saving...' : 'Save'}</Button>
                  <Button variant="ghost" size="sm" onClick={cancelEditing}><X className="h-4 w-4" /></Button>
                </div>
              )}
            </div>
            {editingSection === 'special' ? (
              <div className="space-y-3">
                <div><label className="text-sm font-medium">Special Requests</label><textarea rows={2} placeholder="Water plants..." className="w-full mt-1 px-3 py-2 border rounded-md text-sm" value={editForm.specialRequests || ''} onChange={(e) => setEditForm({ ...editForm, specialRequests: e.target.value })} /></div>
                <div><label className="text-sm font-medium">Things to Know</label><textarea rows={2} placeholder="Toilet doesn't flush..." className="w-full mt-1 px-3 py-2 border rounded-md text-sm" value={editForm.thingsToKnow || ''} onChange={(e) => setEditForm({ ...editForm, thingsToKnow: e.target.value })} /></div>
              </div>
            ) : (
              <div className="space-y-3 text-sm">
                {client.preferences?.specialRequests && <div className="bg-purple-50 p-2 rounded"><p className="text-purple-800 font-medium text-xs mb-1">Special Requests</p><p className="text-purple-700">{client.preferences.specialRequests}</p></div>}
                {client.preferences?.thingsToKnow && <div className="bg-yellow-50 p-2 rounded"><p className="text-yellow-800 font-medium text-xs mb-1">Things to Know</p><p className="text-yellow-700">{client.preferences.thingsToKnow}</p></div>}
                {!client.preferences?.specialRequests && !client.preferences?.thingsToKnow && <p className="text-gray-500">No special requests</p>}
              </div>
            )}
          </Card>
        </TabsContent>

        {/* Notes Tab */}
        <TabsContent value="notes" className="space-y-4 mt-4">
          <Card className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold flex items-center gap-2"><MessageSquare className="h-4 w-4" />General Notes</h3>
              {editingSection !== 'notes' ? (
                <Button variant="ghost" size="sm" onClick={() => startEditing('notes', { notes: client.notes || '' })}><Edit2 className="h-4 w-4" /></Button>
              ) : (
                <div className="flex gap-2">
                  <Button size="sm" disabled={saving} onClick={() => saveChanges(editForm)}><Save className="h-4 w-4 mr-1" />{saving ? 'Saving...' : 'Save'}</Button>
                  <Button variant="ghost" size="sm" onClick={cancelEditing}><X className="h-4 w-4" /></Button>
                </div>
              )}
            </div>
            {editingSection === 'notes' ? (
              <textarea rows={4} placeholder="General notes..." className="w-full px-3 py-2 border rounded-md text-sm" value={editForm.notes || ''} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} />
            ) : (
              <p className="text-sm whitespace-pre-wrap">{client.notes || 'No notes'}</p>
            )}
          </Card>

          <Card className="p-4 border-orange-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold flex items-center gap-2 text-orange-700"><Shield className="h-4 w-4" />Internal Notes (Admin Only)</h3>
              {editingSection !== 'internalNotes' ? (
                <Button variant="ghost" size="sm" onClick={() => startEditing('internalNotes', { internalNotes: client.internalNotes || '' })}><Edit2 className="h-4 w-4" /></Button>
              ) : (
                <div className="flex gap-2">
                  <Button size="sm" disabled={saving} onClick={() => saveChanges(editForm)}><Save className="h-4 w-4 mr-1" />{saving ? 'Saving...' : 'Save'}</Button>
                  <Button variant="ghost" size="sm" onClick={cancelEditing}><X className="h-4 w-4" /></Button>
                </div>
              )}
            </div>
            <p className="text-xs text-orange-600 mb-2">Only visible to admin/staff</p>
            {editingSection === 'internalNotes' ? (
              <textarea rows={4} placeholder="Private notes..." className="w-full px-3 py-2 border border-orange-200 rounded-md text-sm" value={editForm.internalNotes || ''} onChange={(e) => setEditForm({ ...editForm, internalNotes: e.target.value })} />
            ) : (
              <p className="text-sm whitespace-pre-wrap bg-orange-50 p-3 rounded">{client.internalNotes || 'No internal notes'}</p>
            )}
          </Card>

          <Card className="p-4 border-blue-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold flex items-center gap-2 text-blue-700"><ClipboardList className="h-4 w-4" />Cleaning Team Notes</h3>
              {editingSection !== 'cleaningTeamNotes' ? (
                <Button variant="ghost" size="sm" onClick={() => startEditing('cleaningTeamNotes', { cleaningTeamNotes: client.cleaningTeamNotes || '' })}><Edit2 className="h-4 w-4" /></Button>
              ) : (
                <div className="flex gap-2">
                  <Button size="sm" disabled={saving} onClick={() => saveChanges(editForm)}><Save className="h-4 w-4 mr-1" />{saving ? 'Saving...' : 'Save'}</Button>
                  <Button variant="ghost" size="sm" onClick={cancelEditing}><X className="h-4 w-4" /></Button>
                </div>
              )}
            </div>
            <p className="text-xs text-blue-600 mb-2">Visible to cleaners during jobs</p>
            {editingSection === 'cleaningTeamNotes' ? (
              <textarea rows={4} placeholder="Instructions for cleaning team..." className="w-full px-3 py-2 border border-blue-200 rounded-md text-sm" value={editForm.cleaningTeamNotes || ''} onChange={(e) => setEditForm({ ...editForm, cleaningTeamNotes: e.target.value })} />
            ) : (
              <p className="text-sm whitespace-pre-wrap bg-blue-50 p-3 rounded">{client.cleaningTeamNotes || 'No cleaning team notes'}</p>
            )}
          </Card>
        </TabsContent>

        {/* Bookings Tab */}
        <TabsContent value="bookings" className="space-y-4 mt-4">
          <Card className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Booking History</h3>
              <Button size="sm" onClick={() => router.push(`/jobs/new?clientId=${client.id}`)}><Calendar className="h-4 w-4 mr-2" />New Booking</Button>
            </div>
            {client.bookings?.length > 0 ? (
              <div className="space-y-2">
                {client.bookings.map(booking => (
                  <Link key={booking.id} href={`/jobs/${booking.id}`}>
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded hover:bg-gray-100 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded ${booking.status === 'COMPLETED' ? 'bg-green-100' : booking.status === 'CANCELLED' ? 'bg-red-100' : 'bg-blue-100'}`}>
                          {booking.status === 'COMPLETED' ? <CheckCircle className="h-4 w-4 text-green-600" /> : booking.status === 'CANCELLED' ? <X className="h-4 w-4 text-red-600" /> : <Clock className="h-4 w-4 text-blue-600" />}
                        </div>
                        <div>
                          <p className="font-medium">{format(new Date(booking.scheduledDate), 'EEE, MMM d, yyyy')}</p>
                          <p className="text-sm text-gray-500">{booking.serviceType} • {booking.assignee?.user?.name || 'Unassigned'}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">${booking.price}</p>
                        <Badge variant={booking.status === 'COMPLETED' ? 'default' : booking.status === 'CANCELLED' ? 'destructive' : 'secondary'}>{booking.status}</Badge>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Calendar className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p>No bookings yet</p>
                <Button className="mt-3" onClick={() => router.push(`/jobs/new?clientId=${client.id}`)}>Create First Booking</Button>
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

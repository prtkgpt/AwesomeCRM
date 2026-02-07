'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Save, Users, UserCheck, CalendarDays, FileText, Megaphone } from 'lucide-react';

interface CompanyDetail {
  id: string;
  name: string;
  slug: string;
  email: string | null;
  phone: string | null;
  plan: string;
  subscriptionStatus: string;
  createdAt: string;
  users: {
    id: string;
    email: string;
    name: string | null;
    role: string;
    createdAt: string;
  }[];
  _count: {
    clients: number;
    bookings: number;
    invoices: number;
    campaigns: number;
    teamMembers: number;
  };
}

export default function CompanyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const companyId = params.id as string;

  const [company, setCompany] = useState<CompanyDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Editable fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [plan, setPlan] = useState('');

  useEffect(() => {
    async function fetchCompany() {
      try {
        const res = await fetch(`/api/platform/companies/${companyId}`);
        const data = await res.json();
        if (data.success) {
          setCompany(data.data);
          setName(data.data.name);
          setEmail(data.data.email || '');
          setPhone(data.data.phone || '');
          setPlan(data.data.plan);
        }
      } catch (err) {
        console.error('Failed to fetch company:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchCompany();
  }, [companyId]);

  async function handleSave() {
    setError('');
    setSuccess('');
    setSaving(true);
    try {
      const res = await fetch(`/api/platform/companies/${companyId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, phone, plan }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess('Company updated');
        setCompany((prev) => prev ? { ...prev, name, email, phone, plan } : prev);
      } else {
        setError(data.error || 'Failed to update');
      }
    } catch (err) {
      setError('An error occurred');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
        <div className="h-64 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
      </div>
    );
  }

  if (!company) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Company not found</p>
        <Link href="/platform/companies">
          <Button variant="ghost" className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to companies
          </Button>
        </Link>
      </div>
    );
  }

  const statItems = [
    { label: 'Users', value: company.users.length, icon: Users },
    { label: 'Clients', value: company._count.clients, icon: UserCheck },
    { label: 'Bookings', value: company._count.bookings, icon: CalendarDays },
    { label: 'Invoices', value: company._count.invoices, icon: FileText },
    { label: 'Team', value: company._count.teamMembers, icon: Users },
    { label: 'Campaigns', value: company._count.campaigns, icon: Megaphone },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/platform/companies">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{company.name}</h1>
          <p className="text-sm text-gray-500">/{company.slug} &middot; Created {new Date(company.createdAt).toLocaleDateString()}</p>
        </div>
      </div>

      {success && (
        <div className="bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400 text-sm p-3 rounded-lg border border-green-200 dark:border-green-800">
          {success}
        </div>
      )}
      {error && (
        <div className="bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400 text-sm p-3 rounded-lg border border-red-200 dark:border-red-800">
          {error}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
        {statItems.map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.label}>
              <CardContent className="p-3 text-center">
                <Icon className="h-4 w-4 mx-auto text-gray-400 mb-1" />
                <p className="text-lg font-bold text-gray-900 dark:text-white">{item.value}</p>
                <p className="text-xs text-gray-500">{item.label}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Edit Company */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Company Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <Label>Slug (read-only)</Label>
              <Input value={company.slug} disabled className="bg-gray-50 dark:bg-gray-800" />
            </div>
            <div>
              <Label>Email</Label>
              <Input value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div>
              <Label>Phone</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div>
              <Label>Plan</Label>
              <select
                value={plan}
                onChange={(e) => setPlan(e.target.value)}
                className="w-full h-9 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 text-sm"
              >
                <option value="FREE">Free</option>
                <option value="BASIC">Basic</option>
                <option value="PRO">Pro</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving} size="sm">
              <Save className="h-4 w-4 mr-1" />
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Users */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Users ({company.users.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {company.users.map((user) => (
              <div key={user.id} className="py-3 flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {user.name || 'No name'}
                  </p>
                  <p className="text-sm text-gray-500">{user.email}</p>
                </div>
                <div className="text-right">
                  <span
                    className={`inline-block px-2 py-0.5 text-xs rounded-full ${
                      user.role === 'OWNER'
                        ? 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                        : user.role === 'ADMIN'
                        ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                        : user.role === 'CLEANER'
                        ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-gray-50 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400'
                    }`}
                  >
                    {user.role}
                  </span>
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

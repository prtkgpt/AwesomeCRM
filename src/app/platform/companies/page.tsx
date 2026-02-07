'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Building2, Plus, Search, X, Eye, Users, UserCheck } from 'lucide-react';

interface Company {
  id: string;
  name: string;
  slug: string;
  email: string | null;
  phone: string | null;
  plan: string;
  subscriptionStatus: string;
  createdAt: string;
  _count: { users: number; clients: number; bookings: number };
}

export default function PlatformCompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form state
  const [form, setForm] = useState({
    companyName: '',
    companySlug: '',
    companyEmail: '',
    companyPhone: '',
    ownerName: '',
    ownerEmail: '',
    ownerPassword: '',
    plan: 'FREE',
  });

  async function fetchCompanies() {
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      const res = await fetch(`/api/platform/companies?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setCompanies(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch companies:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchCompanies();
  }, [search]);

  // Auto-generate slug from company name
  function handleNameChange(name: string) {
    setForm((prev) => ({
      ...prev,
      companyName: name,
      companySlug: name
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, ''),
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);

    try {
      const res = await fetch('/api/platform/companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();

      if (!data.success) {
        setError(data.error || 'Failed to create company');
        return;
      }

      setSuccess(`Company "${data.data.company.name}" created! Owner login: ${data.data.owner.email}`);
      setForm({
        companyName: '',
        companySlug: '',
        companyEmail: '',
        companyPhone: '',
        ownerName: '',
        ownerEmail: '',
        ownerPassword: '',
        plan: 'FREE',
      });
      setShowForm(false);
      fetchCompanies();
    } catch (err) {
      setError('An error occurred');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Companies</h1>
        <Button onClick={() => setShowForm(!showForm)} size="sm">
          {showForm ? (
            <>
              <X className="h-4 w-4 mr-1" /> Cancel
            </>
          ) : (
            <>
              <Plus className="h-4 w-4 mr-1" /> Onboard Company
            </>
          )}
        </Button>
      </div>

      {/* Success / Error Messages */}
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

      {/* Onboarding Form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Onboard New Company</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Company Info */}
                <div className="space-y-3">
                  <h3 className="font-medium text-sm text-gray-700 dark:text-gray-300">Company Details</h3>
                  <div>
                    <Label htmlFor="companyName">Company Name *</Label>
                    <Input
                      id="companyName"
                      value={form.companyName}
                      onChange={(e) => handleNameChange(e.target.value)}
                      placeholder="Sparkle Cleaning LLC"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="companySlug">URL Slug *</Label>
                    <div className="flex items-center gap-1">
                      <span className="text-sm text-gray-500">cleandaycrm.com/</span>
                      <Input
                        id="companySlug"
                        value={form.companySlug}
                        onChange={(e) => setForm((prev) => ({ ...prev, companySlug: e.target.value }))}
                        placeholder="sparkle-cleaning-llc"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="companyEmail">Company Email</Label>
                    <Input
                      id="companyEmail"
                      type="email"
                      value={form.companyEmail}
                      onChange={(e) => setForm((prev) => ({ ...prev, companyEmail: e.target.value }))}
                      placeholder="info@sparklecleaning.com"
                    />
                  </div>
                  <div>
                    <Label htmlFor="companyPhone">Company Phone</Label>
                    <Input
                      id="companyPhone"
                      value={form.companyPhone}
                      onChange={(e) => setForm((prev) => ({ ...prev, companyPhone: e.target.value }))}
                      placeholder="(555) 123-4567"
                    />
                  </div>
                  <div>
                    <Label htmlFor="plan">Plan</Label>
                    <select
                      id="plan"
                      value={form.plan}
                      onChange={(e) => setForm((prev) => ({ ...prev, plan: e.target.value }))}
                      className="w-full h-9 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 text-sm"
                    >
                      <option value="FREE">Free</option>
                      <option value="BASIC">Basic</option>
                      <option value="PRO">Pro</option>
                    </select>
                  </div>
                </div>

                {/* Owner Account */}
                <div className="space-y-3">
                  <h3 className="font-medium text-sm text-gray-700 dark:text-gray-300">Owner Account</h3>
                  <div>
                    <Label htmlFor="ownerName">Owner Name</Label>
                    <Input
                      id="ownerName"
                      value={form.ownerName}
                      onChange={(e) => setForm((prev) => ({ ...prev, ownerName: e.target.value }))}
                      placeholder="Jane Smith"
                    />
                  </div>
                  <div>
                    <Label htmlFor="ownerEmail">Owner Email *</Label>
                    <Input
                      id="ownerEmail"
                      type="email"
                      value={form.ownerEmail}
                      onChange={(e) => setForm((prev) => ({ ...prev, ownerEmail: e.target.value }))}
                      placeholder="jane@sparklecleaning.com"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="ownerPassword">Initial Password *</Label>
                    <Input
                      id="ownerPassword"
                      type="text"
                      value={form.ownerPassword}
                      onChange={(e) => setForm((prev) => ({ ...prev, ownerPassword: e.target.value }))}
                      placeholder="Temporary password"
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Share this with the owner so they can log in and change it
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button type="submit" disabled={saving}>
                  {saving ? 'Creating...' : 'Create Company & Owner'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search companies..."
          className="pl-9"
        />
      </div>

      {/* Companies List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="h-12 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : companies.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Building2 className="h-8 w-8 mx-auto text-gray-400 mb-2" />
            <p className="text-gray-500">No companies found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {companies.map((company) => (
            <Card key={company.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-gray-900 dark:text-white truncate">
                        {company.name}
                      </h3>
                      <span className="inline-block px-2 py-0.5 text-xs rounded-full bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 shrink-0">
                        {company.plan}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                      <span>/{company.slug}</span>
                      {company.email && <span>{company.email}</span>}
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" /> {company._count.users} users
                      </span>
                      <span className="flex items-center gap-1">
                        <UserCheck className="h-3 w-3" /> {company._count.clients} clients
                      </span>
                      <span>
                        {company._count.bookings} bookings
                      </span>
                      <span>
                        Joined {new Date(company.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <Link href={`/platform/companies/${company.id}`}>
                    <Button variant="ghost" size="sm">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

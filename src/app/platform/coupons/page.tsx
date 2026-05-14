'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, X, Tag, Trash2 } from 'lucide-react';

interface Coupon {
  id: string;
  code: string;
  discount: number;
  discountType: string;
  uses: number;
  maxUses: number | null;
  active: boolean;
  expiresAt: string | null;
  createdAt: string;
}

const emptyForm = {
  code: '',
  discount: '',
  discountType: 'PERCENT',
  maxUses: '',
  expiresAt: '',
};

export default function PlatformCouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function fetchCoupons() {
    try {
      const res = await fetch('/api/platform/coupons');
      const data = await res.json();
      if (data.success) {
        setCoupons(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch coupons:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchCoupons();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);

    const payload = {
      code: form.code.toUpperCase(),
      discount: parseFloat(form.discount),
      discountType: form.discountType,
      maxUses: form.maxUses ? parseInt(form.maxUses) : null,
      expiresAt: form.expiresAt || null,
    };

    try {
      const res = await fetch('/api/platform/coupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!data.success) {
        setError(data.error || 'Failed to create coupon');
        return;
      }

      setSuccess('Coupon created successfully');
      setForm(emptyForm);
      setShowForm(false);
      fetchCoupons();
    } catch (err) {
      setError('An error occurred');
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(coupon: Coupon) {
    try {
      const res = await fetch(`/api/platform/coupons/${coupon.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !coupon.active }),
      });
      const data = await res.json();
      if (data.success) {
        fetchCoupons();
      }
    } catch (err) {
      console.error('Failed to toggle coupon:', err);
    }
  }

  async function deleteCoupon(id: string) {
    if (!confirm('Are you sure you want to delete this coupon?')) return;

    try {
      const res = await fetch(`/api/platform/coupons/${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        setSuccess('Coupon deleted');
        fetchCoupons();
      } else {
        setError(data.error || 'Failed to delete coupon');
      }
    } catch (err) {
      setError('An error occurred');
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Coupons</h1>
        <Button onClick={() => { setShowForm(!showForm); setForm(emptyForm); }} size="sm">
          {showForm ? (
            <>
              <X className="h-4 w-4 mr-1" /> Cancel
            </>
          ) : (
            <>
              <Plus className="h-4 w-4 mr-1" /> New Coupon
            </>
          )}
        </Button>
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

      {/* Create Coupon Form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">New Coupon</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="code">Coupon Code *</Label>
                  <Input
                    id="code"
                    value={form.code}
                    onChange={(e) => setForm((prev) => ({ ...prev, code: e.target.value }))}
                    placeholder="SUMMER25"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="discountType">Discount Type</Label>
                  <select
                    id="discountType"
                    value={form.discountType}
                    onChange={(e) => setForm((prev) => ({ ...prev, discountType: e.target.value }))}
                    className="w-full h-9 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 text-sm"
                  >
                    <option value="PERCENT">Percentage</option>
                    <option value="FIXED">Fixed Amount</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="discount">
                    Discount {form.discountType === 'PERCENT' ? '(%)' : '($)'} *
                  </Label>
                  <Input
                    id="discount"
                    type="number"
                    step="0.01"
                    value={form.discount}
                    onChange={(e) => setForm((prev) => ({ ...prev, discount: e.target.value }))}
                    placeholder={form.discountType === 'PERCENT' ? '25' : '5.00'}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="maxUses">Max Uses (blank = unlimited)</Label>
                  <Input
                    id="maxUses"
                    type="number"
                    value={form.maxUses}
                    onChange={(e) => setForm((prev) => ({ ...prev, maxUses: e.target.value }))}
                    placeholder="100"
                  />
                </div>
                <div>
                  <Label htmlFor="expiresAt">Expiry Date</Label>
                  <Input
                    id="expiresAt"
                    type="date"
                    value={form.expiresAt}
                    onChange={(e) => setForm((prev) => ({ ...prev, expiresAt: e.target.value }))}
                  />
                </div>
              </div>
              <div className="flex justify-end pt-2">
                <Button type="submit" disabled={saving}>
                  {saving ? 'Creating...' : 'Create Coupon'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Coupons List */}
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
      ) : coupons.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Tag className="h-8 w-8 mx-auto text-gray-400 mb-2" />
            <p className="text-gray-500">No coupons found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {coupons.map((coupon) => (
            <Card key={coupon.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-mono font-bold text-gray-900 dark:text-white">
                        {coupon.code}
                      </h3>
                      <span
                        className={`inline-block px-2 py-0.5 text-xs rounded-full ${
                          coupon.active
                            ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500'
                        }`}
                      >
                        {coupon.active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                      <span>
                        {coupon.discountType === 'PERCENT'
                          ? `${coupon.discount}% off`
                          : `$${coupon.discount} off`}
                      </span>
                      <span>
                        {coupon.uses}{coupon.maxUses ? `/${coupon.maxUses}` : ''} uses
                      </span>
                      {coupon.expiresAt && (
                        <span>
                          Expires {new Date(coupon.expiresAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleActive(coupon)}
                    >
                      {coupon.active ? 'Deactivate' : 'Activate'}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteCoupon(coupon.id)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, X, Pencil, CreditCard } from 'lucide-react';

interface Plan {
  id: string;
  name: string;
  price: number;
  maxClients: number;
  maxUsers: number;
  maxBookings: number;
  features: string[];
  createdAt: string;
}

const emptyForm = {
  name: '',
  price: '',
  maxClients: '',
  maxUsers: '',
  maxBookings: '',
  features: '',
};

export default function PlatformPlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function fetchPlans() {
    try {
      const res = await fetch('/api/platform/plans');
      const data = await res.json();
      if (data.success) {
        setPlans(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch plans:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchPlans();
  }, []);

  function startEdit(plan: Plan) {
    setEditingId(plan.id);
    setForm({
      name: plan.name,
      price: String(plan.price),
      maxClients: String(plan.maxClients),
      maxUsers: String(plan.maxUsers),
      maxBookings: String(plan.maxBookings),
      features: plan.features.join(', '),
    });
    setShowForm(false);
    setError('');
    setSuccess('');
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(emptyForm);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);

    const payload = {
      name: form.name,
      price: parseFloat(form.price),
      maxClients: parseInt(form.maxClients),
      maxUsers: parseInt(form.maxUsers),
      maxBookings: parseInt(form.maxBookings),
      features: form.features
        .split(',')
        .map((f) => f.trim())
        .filter(Boolean),
    };

    try {
      const url = editingId
        ? `/api/platform/plans/${editingId}`
        : '/api/platform/plans';
      const method = editingId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!data.success) {
        setError(data.error || 'Failed to save plan');
        return;
      }

      setSuccess(editingId ? 'Plan updated successfully' : 'Plan created successfully');
      setForm(emptyForm);
      setShowForm(false);
      setEditingId(null);
      fetchPlans();
    } catch (err) {
      setError('An error occurred');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Plans</h1>
        <Button onClick={() => { setShowForm(!showForm); setEditingId(null); setForm(emptyForm); }} size="sm">
          {showForm ? (
            <>
              <X className="h-4 w-4 mr-1" /> Cancel
            </>
          ) : (
            <>
              <Plus className="h-4 w-4 mr-1" /> Add Plan
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

      {/* New Plan Form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">New Plan</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Plan Name *</Label>
                  <Input
                    id="name"
                    value={form.name}
                    onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="Pro"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="price">Price ($/month) *</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    value={form.price}
                    onChange={(e) => setForm((prev) => ({ ...prev, price: e.target.value }))}
                    placeholder="20"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="maxClients">Max Clients *</Label>
                  <Input
                    id="maxClients"
                    type="number"
                    value={form.maxClients}
                    onChange={(e) => setForm((prev) => ({ ...prev, maxClients: e.target.value }))}
                    placeholder="100"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="maxUsers">Max Users *</Label>
                  <Input
                    id="maxUsers"
                    type="number"
                    value={form.maxUsers}
                    onChange={(e) => setForm((prev) => ({ ...prev, maxUsers: e.target.value }))}
                    placeholder="10"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="maxBookings">Max Bookings *</Label>
                  <Input
                    id="maxBookings"
                    type="number"
                    value={form.maxBookings}
                    onChange={(e) => setForm((prev) => ({ ...prev, maxBookings: e.target.value }))}
                    placeholder="500"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="features">Features (comma-separated)</Label>
                  <Input
                    id="features"
                    value={form.features}
                    onChange={(e) => setForm((prev) => ({ ...prev, features: e.target.value }))}
                    placeholder="Invoicing, SMS reminders, Reports"
                  />
                </div>
              </div>
              <div className="flex justify-end pt-2">
                <Button type="submit" disabled={saving}>
                  {saving ? 'Saving...' : 'Create Plan'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Plans List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="h-16 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : plans.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <CreditCard className="h-8 w-8 mx-auto text-gray-400 mb-2" />
            <p className="text-gray-500">No plans found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {plans.map((plan) =>
            editingId === plan.id ? (
              <Card key={plan.id}>
                <CardHeader>
                  <CardTitle className="text-lg">Edit Plan: {plan.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor={`edit-name-${plan.id}`}>Plan Name *</Label>
                        <Input
                          id={`edit-name-${plan.id}`}
                          value={form.name}
                          onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor={`edit-price-${plan.id}`}>Price ($/month) *</Label>
                        <Input
                          id={`edit-price-${plan.id}`}
                          type="number"
                          step="0.01"
                          value={form.price}
                          onChange={(e) => setForm((prev) => ({ ...prev, price: e.target.value }))}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor={`edit-maxClients-${plan.id}`}>Max Clients *</Label>
                        <Input
                          id={`edit-maxClients-${plan.id}`}
                          type="number"
                          value={form.maxClients}
                          onChange={(e) => setForm((prev) => ({ ...prev, maxClients: e.target.value }))}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor={`edit-maxUsers-${plan.id}`}>Max Users *</Label>
                        <Input
                          id={`edit-maxUsers-${plan.id}`}
                          type="number"
                          value={form.maxUsers}
                          onChange={(e) => setForm((prev) => ({ ...prev, maxUsers: e.target.value }))}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor={`edit-maxBookings-${plan.id}`}>Max Bookings *</Label>
                        <Input
                          id={`edit-maxBookings-${plan.id}`}
                          type="number"
                          value={form.maxBookings}
                          onChange={(e) => setForm((prev) => ({ ...prev, maxBookings: e.target.value }))}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor={`edit-features-${plan.id}`}>Features (comma-separated)</Label>
                        <Input
                          id={`edit-features-${plan.id}`}
                          value={form.features}
                          onChange={(e) => setForm((prev) => ({ ...prev, features: e.target.value }))}
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                      <Button type="button" variant="ghost" size="sm" onClick={cancelEdit}>
                        Cancel
                      </Button>
                      <Button type="submit" size="sm" disabled={saving}>
                        {saving ? 'Saving...' : 'Update Plan'}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            ) : (
              <Card key={plan.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-gray-900 dark:text-white">{plan.name}</h3>
                        <span className="inline-block px-2 py-0.5 text-xs rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                          ${plan.price}/mo
                        </span>
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                        <span>{plan.maxClients} clients</span>
                        <span>{plan.maxUsers} users</span>
                        <span>{plan.maxBookings} bookings</span>
                      </div>
                      {plan.features.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {plan.features.map((feature) => (
                            <span
                              key={feature}
                              className="inline-block px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                            >
                              {feature}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => startEdit(plan)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          )}
        </div>
      )}
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, X, Megaphone, Pencil, Trash2 } from 'lucide-react';

interface Announcement {
  id: string;
  title: string;
  message: string;
  type: string;
  targetPlans: string[];
  dismissible: boolean;
  active: boolean;
  expiresAt: string | null;
  createdAt: string;
}

const ANNOUNCEMENT_TYPES = ['info', 'warning', 'update', 'promo'];
const ALL_PLANS = ['FREE', 'BASIC', 'PRO'];

const emptyForm = {
  title: '',
  message: '',
  type: 'info',
  targetPlans: [] as string[],
  dismissible: true,
  expiresAt: '',
};

function typeBadgeColor(type: string) {
  switch (type) {
    case 'info':
      return 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
    case 'warning':
      return 'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
    case 'update':
      return 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400';
    case 'promo':
      return 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
    default:
      return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400';
  }
}

export default function PlatformAnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function fetchAnnouncements() {
    try {
      const res = await fetch('/api/platform/announcements');
      const data = await res.json();
      if (data.success) {
        setAnnouncements(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch announcements:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  function startEdit(announcement: Announcement) {
    setEditingId(announcement.id);
    setForm({
      title: announcement.title,
      message: announcement.message,
      type: announcement.type,
      targetPlans: announcement.targetPlans,
      dismissible: announcement.dismissible,
      expiresAt: announcement.expiresAt
        ? new Date(announcement.expiresAt).toISOString().split('T')[0]
        : '',
    });
    setShowForm(true);
    setError('');
    setSuccess('');
  }

  function cancelForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
  }

  function togglePlan(plan: string) {
    setForm((prev) => ({
      ...prev,
      targetPlans: prev.targetPlans.includes(plan)
        ? prev.targetPlans.filter((p) => p !== plan)
        : [...prev.targetPlans, plan],
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);

    const payload = {
      title: form.title,
      message: form.message,
      type: form.type,
      targetPlans: form.targetPlans,
      dismissible: form.dismissible,
      expiresAt: form.expiresAt || null,
    };

    try {
      const url = editingId
        ? `/api/platform/announcements/${editingId}`
        : '/api/platform/announcements';
      const method = editingId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!data.success) {
        setError(data.error || 'Failed to save announcement');
        return;
      }

      setSuccess(editingId ? 'Announcement updated' : 'Announcement created');
      cancelForm();
      fetchAnnouncements();
    } catch (err) {
      setError('An error occurred');
    } finally {
      setSaving(false);
    }
  }

  async function deleteAnnouncement(id: string) {
    if (!confirm('Are you sure you want to delete this announcement?')) return;

    try {
      const res = await fetch(`/api/platform/announcements/${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        setSuccess('Announcement deleted');
        fetchAnnouncements();
      } else {
        setError(data.error || 'Failed to delete');
      }
    } catch (err) {
      setError('An error occurred');
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Announcements</h1>
        <Button
          onClick={() => {
            if (showForm) {
              cancelForm();
            } else {
              setShowForm(true);
              setEditingId(null);
              setForm(emptyForm);
            }
          }}
          size="sm"
        >
          {showForm ? (
            <>
              <X className="h-4 w-4 mr-1" /> Cancel
            </>
          ) : (
            <>
              <Plus className="h-4 w-4 mr-1" /> New Announcement
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

      {/* Create / Edit Form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {editingId ? 'Edit Announcement' : 'New Announcement'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    value={form.title}
                    onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                    placeholder="New feature: SMS reminders"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="type">Type</Label>
                  <select
                    id="type"
                    value={form.type}
                    onChange={(e) => setForm((prev) => ({ ...prev, type: e.target.value }))}
                    className="w-full h-9 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 text-sm"
                  >
                    {ANNOUNCEMENT_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t.charAt(0).toUpperCase() + t.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="message">Message *</Label>
                  <textarea
                    id="message"
                    value={form.message}
                    onChange={(e) => setForm((prev) => ({ ...prev, message: e.target.value }))}
                    placeholder="We are excited to announce..."
                    required
                    rows={3}
                    className="w-full rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <Label>Target Plans</Label>
                  <div className="flex gap-2 mt-1">
                    {ALL_PLANS.map((plan) => (
                      <label key={plan} className="flex items-center gap-1.5 text-sm">
                        <input
                          type="checkbox"
                          checked={form.targetPlans.includes(plan)}
                          onChange={() => togglePlan(plan)}
                          className="rounded border-gray-300"
                        />
                        {plan}
                      </label>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Leave empty to target all plans</p>
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
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="dismissible"
                    checked={form.dismissible}
                    onChange={(e) => setForm((prev) => ({ ...prev, dismissible: e.target.checked }))}
                    className="rounded border-gray-300"
                  />
                  <Label htmlFor="dismissible">Dismissible by users</Label>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="ghost" size="sm" onClick={cancelForm}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={saving}>
                  {saving ? 'Saving...' : editingId ? 'Update' : 'Create'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Announcements List */}
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
      ) : announcements.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Megaphone className="h-8 w-8 mx-auto text-gray-400 mb-2" />
            <p className="text-gray-500">No announcements found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {announcements.map((a) => (
            <Card key={a.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-medium text-gray-900 dark:text-white">{a.title}</h3>
                      <span className={`inline-block px-2 py-0.5 text-xs rounded-full ${typeBadgeColor(a.type)}`}>
                        {a.type}
                      </span>
                      <span
                        className={`inline-block px-2 py-0.5 text-xs rounded-full ${
                          a.active
                            ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500'
                        }`}
                      >
                        {a.active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                      {a.message}
                    </p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                      {a.targetPlans.length > 0 && (
                        <span>Plans: {a.targetPlans.join(', ')}</span>
                      )}
                      {a.expiresAt && (
                        <span>Expires: {new Date(a.expiresAt).toLocaleDateString()}</span>
                      )}
                      <span>{a.dismissible ? 'Dismissible' : 'Persistent'}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0 ml-2">
                    <Button variant="ghost" size="sm" onClick={() => startEdit(a)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => deleteAnnouncement(a.id)}>
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

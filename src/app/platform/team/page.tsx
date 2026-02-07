'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, X, Trash2, Shield } from 'lucide-react';

interface PlatformMember {
  id: string;
  email: string;
  name: string | null;
  role: string;
  createdAt: string;
}

export default function PlatformTeamPage() {
  const [members, setMembers] = useState<PlatformMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
  });

  async function fetchMembers() {
    try {
      const res = await fetch('/api/platform/team');
      const data = await res.json();
      if (data.success) {
        setMembers(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch team:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchMembers();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);

    try {
      const res = await fetch('/api/platform/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();

      if (!data.success) {
        setError(data.error || 'Failed to create team member');
        return;
      }

      setSuccess(`Team member "${data.data.name}" added. They can now log in at /admin/login`);
      setForm({ name: '', email: '', password: '' });
      setShowForm(false);
      fetchMembers();
    } catch (err) {
      setError('An error occurred');
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove(member: PlatformMember) {
    if (!confirm(`Remove "${member.name || member.email}" from the platform team? This will delete their account.`)) {
      return;
    }

    setError('');
    setSuccess('');
    setRemovingId(member.id);

    try {
      const res = await fetch(`/api/platform/team/${member.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();

      if (!data.success) {
        setError(data.error || 'Failed to remove team member');
        return;
      }

      setSuccess(data.message);
      fetchMembers();
    } catch (err) {
      setError('An error occurred');
    } finally {
      setRemovingId(null);
    }
  }

  function generatePassword() {
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$';
    let password = '';
    for (let i = 0; i < 14; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setForm((prev) => ({ ...prev, password }));
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Platform Team</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage who can access the platform admin portal
          </p>
        </div>
        <Button onClick={() => { setShowForm(!showForm); setError(''); setSuccess(''); }} size="sm">
          {showForm ? (
            <>
              <X className="h-4 w-4 mr-1" /> Cancel
            </>
          ) : (
            <>
              <Plus className="h-4 w-4 mr-1" /> Add Member
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

      {/* Add Member Form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Add Platform Team Member</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      value={form.name}
                      onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                      placeholder="John Doe"
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                      placeholder="john@cleandaycrm.com"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="password">Password *</Label>
                    <div className="flex gap-2">
                      <Input
                        id="password"
                        type="text"
                        value={form.password}
                        onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
                        placeholder="Min 8 characters"
                        required
                        minLength={8}
                      />
                      <Button type="button" variant="outline" size="sm" onClick={generatePassword}>
                        Generate
                      </Button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Share this password with the team member so they can log in at /admin/login
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex justify-end pt-2">
                <Button type="submit" disabled={saving}>
                  {saving ? 'Creating...' : 'Add Team Member'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Team Members List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="h-12 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : members.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Shield className="h-8 w-8 mx-auto text-gray-400 mb-2" />
            <p className="text-gray-500">No platform team members</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {members.map((member) => (
            <Card key={member.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                      <Shield className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {member.name || 'Unnamed'}
                      </p>
                      <p className="text-sm text-gray-500">{member.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-400">
                      Added {new Date(member.createdAt).toLocaleDateString()}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemove(member)}
                      disabled={removingId === member.id}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <p className="text-xs text-gray-400 text-center">
        Platform team members can log in at /admin/login and access the platform admin dashboard.
      </p>
    </div>
  );
}

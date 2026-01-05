'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface InvitationData {
  id: string;
  email: string;
  role: string;
  company: {
    name: string;
    slug: string;
  };
  expiresAt: string;
}

export default function AcceptInvitePage({ params }: { params: { token: string } | Promise<{ token: string }> }) {
  const router = useRouter();
  const [invitation, setInvitation] = useState<InvitationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [token, setToken] = useState<string>('');
  const [formData, setFormData] = useState({
    name: '',
    password: '',
    confirmPassword: '',
    phone: '',
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const loadParams = async () => {
      const resolvedParams = await Promise.resolve(params);
      setToken(resolvedParams.token);
    };
    loadParams();
  }, [params]);

  useEffect(() => {
    if (token) {
      fetchInvitation();
    }
  }, [token]);

  const fetchInvitation = async () => {
    try {
      console.log('🔍 Fetching invitation for token:', token);
      const res = await fetch(`/api/team/invite/${token}`);
      const data = await res.json();

      console.log('📨 Invitation response:', { status: res.status, data });

      if (res.ok) {
        console.log('✅ Invitation loaded successfully');
        setInvitation(data.data);
      } else {
        console.error('❌ Invitation fetch failed:', data);
        setError(data.error || 'Invalid or expired invitation');
      }
    } catch (err) {
      console.error('❌ Invitation fetch error:', err);
      setError('Failed to load invitation. Please check the invitation link.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch('/api/team/accept-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: token,
          name: formData.name,
          password: formData.password,
          phone: formData.phone,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        // Auto-login after successful signup
        const signInResult = await signIn('credentials', {
          email: invitation?.email,
          password: formData.password,
          redirect: false,
        });

        if (signInResult?.ok) {
          router.push('/dashboard');
        } else {
          router.push('/login');
        }
      } else {
        setError(data.error || 'Failed to accept invitation');
      }
    } catch (err) {
      setError('Failed to accept invitation');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  if (error && !invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="p-8 max-w-md w-full">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Invalid Invitation</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <Button onClick={() => router.push('/login')}>Go to Login</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="p-8 max-w-md w-full">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Join Team</h1>
          <p className="text-gray-600">
            You've been invited to join <strong>{invitation?.company.name}</strong> as a{' '}
            <strong>{invitation?.role}</strong>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              value={invitation?.email || ''}
              disabled
              className="w-full border rounded-lg px-3 py-2 bg-gray-100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Full Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full border rounded-lg px-3 py-2"
              placeholder="John Doe"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Phone</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full border rounded-lg px-3 py-2"
              placeholder="+1 (555) 123-4567"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Password *</label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full border rounded-lg px-3 py-2"
              placeholder="Min 8 characters"
              required
              minLength={8}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Confirm Password *</label>
            <input
              type="password"
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              className="w-full border rounded-lg px-3 py-2"
              placeholder="Re-enter password"
              required
              minLength={8}
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
              {error}
            </div>
          )}

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? 'Creating Account...' : 'Accept Invitation & Create Account'}
          </Button>
        </form>

        <p className="text-xs text-gray-500 mt-4 text-center">
          Invitation expires on {new Date(invitation?.expiresAt || '').toLocaleDateString()}
        </p>
      </Card>
    </div>
  );
}

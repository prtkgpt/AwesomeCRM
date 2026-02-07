'use client';

import { useState, useEffect } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [setupRequired, setSetupRequired] = useState<boolean | null>(null);
  const [setupComplete, setSetupComplete] = useState(false);

  useEffect(() => {
    fetch('/api/platform/setup')
      .then((res) => res.json())
      .then((data) => setSetupRequired(data.setupRequired))
      .catch(() => setSetupRequired(false));
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError('Invalid email or password');
      } else {
        const response = await fetch('/api/auth/session');
        const session = await response.json();

        if (!session?.user?.isPlatformAdmin) {
          setError('This account does not have platform admin access');
          return;
        }

        router.push('/platform');
        router.refresh();
      }
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/platform/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Setup failed');
        return;
      }

      setSetupComplete(true);
      setSetupRequired(false);

      // Auto-login after setup
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (!result?.error) {
        router.push('/platform');
        router.refresh();
      }
    } catch {
      setError('An error occurred during setup.');
    } finally {
      setLoading(false);
    }
  };

  if (setupRequired === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4 py-8">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            CleanDay CRM
          </CardTitle>
          <CardDescription className="text-center">
            {setupRequired
              ? 'Set up your platform admin account'
              : 'Platform Admin Login'}
          </CardDescription>
        </CardHeader>

        <form onSubmit={setupRequired ? handleSetup : handleLogin}>
          <CardContent className="space-y-4">
            {error && (
              <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
                {error}
              </div>
            )}
            {setupComplete && (
              <div className="bg-green-50 text-green-700 text-sm p-3 rounded-md">
                Admin account created! Signing you in...
              </div>
            )}

            {setupRequired && (
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@cleandaycrm.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete={setupRequired ? 'new-password' : 'current-password'}
              />
            </div>
          </CardContent>

          <CardFooter>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading
                ? setupRequired
                  ? 'Setting up...'
                  : 'Signing in...'
                : setupRequired
                  ? 'Create Admin Account'
                  : 'Sign In'}
            </Button>
          </CardFooter>
        </form>
      </Card>

      <footer className="mt-8 text-center">
        <p className="text-xs text-gray-500">
          CleanDay CRM Platform Administration
        </p>
      </footer>
    </div>
  );
}

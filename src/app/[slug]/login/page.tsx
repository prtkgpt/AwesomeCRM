'use client';

import { useState, useEffect } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface Company {
  id: string;
  name: string;
  slug: string;
  logo?: string;
  primaryColor?: string;
  email?: string;
  phone?: string;
}

export default function CustomerLoginPage() {
  const router = useRouter();
  const params = useParams();
  const slug = params.slug as string;

  const [company, setCompany] = useState<Company | null>(null);
  const [loadingCompany, setLoadingCompany] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Fetch company details
    async function fetchCompany() {
      try {
        const response = await fetch(`/api/public/company/${slug}`);
        if (!response.ok) {
          throw new Error('Company not found');
        }
        const data = await response.json();
        setCompany(data);
      } catch (err) {
        setError('Company not found. Please check the URL.');
      } finally {
        setLoadingCompany(false);
      }
    }

    if (slug) {
      fetchCompany();
    }
  }, [slug]);

  const handleSubmit = async (e: React.FormEvent) => {
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
        // Fetch session to verify user belongs to this company and is a customer
        const response = await fetch('/api/auth/session');
        const session = await response.json();

        if (session?.user?.role !== 'CUSTOMER') {
          setError('This login is for customers only. Please use the main login for staff.');
          await signIn('', { redirect: false }); // Sign out
          setLoading(false);
          return;
        }

        // Redirect to company-specific portal
        router.push(`/${slug}/portal`);
        router.refresh();
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (loadingCompany) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 px-4 py-8">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-3">
            <Skeleton className="h-16 w-16 rounded-full mx-auto" />
            <Skeleton className="h-8 w-48 mx-auto" />
            <Skeleton className="h-4 w-32 mx-auto" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 px-4 py-8">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl text-center text-destructive">Company Not Found</CardTitle>
            <CardDescription className="text-center">
              {error || 'The company you\'re looking for doesn\'t exist.'}
            </CardDescription>
          </CardHeader>
          <CardFooter className="flex justify-center">
            <Link href="/">
              <Button>Go Home</Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 px-4 py-8">
      <Card className="w-full max-w-md shadow-2xl border-2">
        <CardHeader className="space-y-3 text-center">
          {/* Company Logo */}
          {company.logo ? (
            <div className="flex justify-center">
              <img
                src={company.logo}
                alt={company.name}
                className="h-16 w-auto object-contain"
              />
            </div>
          ) : (
            <div
              className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center text-white text-2xl font-bold"
              style={{ backgroundColor: company.primaryColor || '#3b82f6' }}
            >
              {company.name.charAt(0)}
            </div>
          )}

          <div>
            <CardTitle className="text-2xl font-bold">
              Welcome back!
            </CardTitle>
            <CardDescription className="text-base mt-2">
              Sign in to your {company.name} account
            </CardDescription>
          </div>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-lg border border-destructive/20">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link
                  href="/forgot-password"
                  className="text-xs hover:underline"
                  style={{ color: company.primaryColor || '#3b82f6' }}
                >
                  Forgot password?
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="h-11"
              />
            </div>
          </CardContent>

          <CardFooter className="flex flex-col space-y-4">
            <Button
              type="submit"
              className="w-full h-11 text-base font-semibold"
              disabled={loading}
              style={{ backgroundColor: company.primaryColor || undefined }}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>

            <p className="text-sm text-center text-muted-foreground">
              Don't have an account?{' '}
              <Link
                href={`/${slug}/signup`}
                className="font-semibold hover:underline"
                style={{ color: company.primaryColor || '#3b82f6' }}
              >
                Sign up
              </Link>
            </p>

            <div className="pt-4 border-t">
              <p className="text-xs text-center text-muted-foreground">
                Need to book a service?{' '}
                <Link
                  href={`/${slug}/book`}
                  className="font-semibold hover:underline"
                  style={{ color: company.primaryColor || '#3b82f6' }}
                >
                  Book now
                </Link>
              </p>
            </div>
          </CardFooter>
        </form>
      </Card>

      {/* Footer */}
      <footer className="mt-8 text-center">
        <p className="text-xs text-gray-600 dark:text-gray-400">
          Powered by CleanDay CRM
        </p>
      </footer>
    </div>
  );
}

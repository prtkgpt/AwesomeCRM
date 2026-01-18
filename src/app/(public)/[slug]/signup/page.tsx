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
import { Sparkles } from 'lucide-react';

interface Company {
  id: string;
  name: string;
  slug: string;
  logo?: string;
  primaryColor?: string;
  email?: string;
  phone?: string;
}

export default function CustomerSignupPage() {
  const router = useRouter();
  const params = useParams();
  const slug = params.slug as string;

  const [company, setCompany] = useState<Company | null>(null);
  const [loadingCompany, setLoadingCompany] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
  });
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Create customer account
      const response = await fetch(`/api/public/customer/signup/${slug}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to create account');
        setLoading(false);
        return;
      }

      // Auto-login after signup
      const result = await signIn('credentials', {
        email: formData.email,
        password: formData.password,
        redirect: false,
      });

      if (result?.error) {
        setError('Account created but failed to log in. Please try logging in manually.');
        setLoading(false);
      } else {
        // Redirect to company-specific portal
        router.push(`/${slug}/portal`);
        router.refresh();
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
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
              Join {company.name}
            </CardTitle>
            <CardDescription className="text-base mt-2">
              Create your customer account
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
              <Label htmlFor="name">Full Name *</Label>
              <Input
                id="name"
                name="name"
                type="text"
                placeholder="Jane Doe"
                value={formData.name}
                onChange={handleChange}
                required
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="you@example.com"
                value={formData.email}
                onChange={handleChange}
                required
                autoComplete="email"
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                placeholder="(555) 123-4567"
                value={formData.phone}
                onChange={handleChange}
                className="h-11"
              />
              <p className="text-xs text-muted-foreground">
                We'll send booking reminders and updates
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password *</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange}
                required
                minLength={8}
                autoComplete="new-password"
                className="h-11"
              />
              <p className="text-xs text-muted-foreground">At least 8 characters</p>
            </div>

            {/* Benefits Section */}
            <div className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex items-start gap-2 mb-2">
                <Sparkles className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-sm text-blue-900 dark:text-blue-100">
                    Benefits of creating an account:
                  </p>
                </div>
              </div>
              <ul className="space-y-1.5 text-xs text-blue-800 dark:text-blue-200 ml-7">
                <li>• View and manage all your bookings</li>
                <li>• Set cleaning preferences and special instructions</li>
                <li>• Track service history and invoices</li>
                <li>• Earn and redeem referral credits</li>
                <li>• Get exclusive offers and reminders</li>
              </ul>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col space-y-4">
            <Button
              type="submit"
              className="w-full h-11 text-base font-semibold"
              disabled={loading}
              style={{ backgroundColor: company.primaryColor || undefined }}
            >
              {loading ? 'Creating account...' : 'Create Account'}
            </Button>

            <p className="text-sm text-center text-muted-foreground">
              Already have an account?{' '}
              <Link
                href={`/${slug}/login`}
                className="font-semibold hover:underline"
                style={{ color: company.primaryColor || '#3b82f6' }}
              >
                Sign in
              </Link>
            </p>

            <div className="pt-4 border-t">
              <p className="text-xs text-center text-muted-foreground">
                By creating an account, you agree to receive service updates and promotional communications from {company.name}.
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

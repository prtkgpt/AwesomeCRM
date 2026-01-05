'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Eye, EyeOff, Copy, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface CreatedAccount {
  email: string;
  password: string;
  name: string;
}

export default function AddCleanerPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [createdAccount, setCreatedAccount] = useState<CreatedAccount | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    generatePassword: true,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value,
    });
  };

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const password = formData.generatePassword
        ? generateRandomPassword()
        : formData.password;

      const payload = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone || undefined,
        password,
        role: 'CLEANER',
      };

      const response = await fetch('/api/team/create-cleaner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.success) {
        setCreatedAccount({
          email: formData.email,
          password,
          name: formData.name,
        });
      } else {
        setError(data.error || 'Failed to create cleaner account');
      }
    } catch (err: any) {
      console.error('Create cleaner error:', err);
      setError(err.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const copyCredentials = () => {
    if (!createdAccount) return;

    const text = `Login Credentials for ${createdAccount.name}\n\nWebsite: ${window.location.origin}/login\nEmail: ${createdAccount.email}\nPassword: ${createdAccount.password}\n\nPlease log in and change your password after your first login.`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (createdAccount) {
    return (
      <div className="p-4 max-w-2xl mx-auto space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => router.push('/team')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">Cleaner Account Created</h1>
        </div>

        <Card className="p-6 space-y-6">
          <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-md">
            <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-green-900">Account created successfully!</p>
              <p className="text-sm text-green-800 mt-1">
                Share these login credentials with {createdAccount.name}. They can log in immediately.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-md space-y-3">
              <div>
                <Label className="text-xs text-gray-600">Login Website</Label>
                <p className="font-mono text-sm">{window.location.origin}/login</p>
              </div>

              <div>
                <Label className="text-xs text-gray-600">Email</Label>
                <p className="font-mono text-sm">{createdAccount.email}</p>
              </div>

              <div>
                <Label className="text-xs text-gray-600">Temporary Password</Label>
                <div className="flex items-center gap-2">
                  <p className="font-mono text-sm font-semibold">
                    {showPassword ? createdAccount.password : '••••••••••••'}
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>

            <div className="bg-yellow-50 p-4 rounded-md">
              <p className="text-sm text-yellow-900">
                <strong>Important:</strong> Make sure to copy these credentials now. For security
                reasons, the password cannot be retrieved later. The cleaner should change their
                password after first login.
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <Button onClick={copyCredentials} className="flex-1">
              <Copy className="h-4 w-4 mr-2" />
              {copied ? 'Copied!' : 'Copy Credentials'}
            </Button>
            <Button variant="outline" onClick={() => router.push('/team')}>
              Done
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-2xl mx-auto space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold">Add New Cleaner</h1>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="p-4 space-y-4">
          <h2 className="font-semibold text-lg">Cleaner Information</h2>

          <div>
            <Label htmlFor="name">Full Name *</Label>
            <Input
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              placeholder="John Doe"
            />
          </div>

          <div>
            <Label htmlFor="email">Email Address *</Label>
            <Input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder="john@example.com"
            />
            <p className="text-xs text-gray-500 mt-1">
              This will be used as their login username
            </p>
          </div>

          <div>
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              name="phone"
              type="tel"
              value={formData.phone}
              onChange={handleChange}
              placeholder="(555) 123-4567"
            />
          </div>
        </Card>

        <Card className="p-4 space-y-4">
          <h2 className="font-semibold text-lg">Login Credentials</h2>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="generatePassword"
              name="generatePassword"
              checked={formData.generatePassword}
              onChange={handleChange}
              className="h-4 w-4 rounded border-gray-300"
            />
            <Label htmlFor="generatePassword" className="cursor-pointer">
              Generate a secure password automatically (Recommended)
            </Label>
          </div>

          {!formData.generatePassword && (
            <div>
              <Label htmlFor="password">Password *</Label>
              <Input
                id="password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                required={!formData.generatePassword}
                placeholder="Enter a secure password"
                minLength={8}
              />
              <p className="text-xs text-gray-500 mt-1">
                Must be at least 8 characters long
              </p>
            </div>
          )}

          <div className="bg-blue-50 p-4 rounded-md">
            <p className="text-sm text-blue-900">
              After creating the account, you'll see the login credentials that you can share
              with the cleaner. Make sure to copy them before leaving this page.
            </p>
          </div>
        </Card>

        <div className="flex gap-3">
          <Button type="submit" disabled={loading} className="flex-1">
            {loading ? 'Creating Account...' : 'Create Cleaner Account'}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}

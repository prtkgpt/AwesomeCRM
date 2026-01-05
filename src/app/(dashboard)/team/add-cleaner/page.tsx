'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Eye, EyeOff, Copy, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

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
    // Basic Info
    name: '',
    email: '',
    phone: '',
    password: '',
    generatePassword: true,

    // Address
    street: '',
    city: '',
    state: '',
    zip: '',

    // Emergency Contact
    emergencyContact: '',
    emergencyPhone: '',

    // Employment
    hourlyRate: '',
    employeeId: '',

    // Work Details
    experience: '',
    speed: 'Medium',
    serviceAreas: '',
    specialties: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
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
        // User fields
        name: formData.name,
        email: formData.email,
        phone: formData.phone || undefined,
        password,
        role: 'CLEANER',

        // TeamMember fields
        street: formData.street || undefined,
        city: formData.city || undefined,
        state: formData.state || undefined,
        zip: formData.zip || undefined,
        emergencyContact: formData.emergencyContact || undefined,
        emergencyPhone: formData.emergencyPhone || undefined,
        hourlyRate: formData.hourlyRate ? parseFloat(formData.hourlyRate) : undefined,
        employeeId: formData.employeeId || undefined,
        experience: formData.experience || undefined,
        speed: formData.speed || undefined,
        serviceAreas: formData.serviceAreas ? formData.serviceAreas.split(',').map(a => a.trim()).filter(Boolean) : [],
        specialties: formData.specialties ? formData.specialties.split(',').map(s => s.trim()).filter(Boolean) : [],
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
    <div className="p-4 max-w-4xl mx-auto space-y-4">
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
        {/* Basic Information */}
        <Card className="p-4 space-y-4">
          <h2 className="font-semibold text-lg">Basic Information</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              <Label htmlFor="phone">Phone Number *</Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                value={formData.phone}
                onChange={handleChange}
                required
                placeholder="(555) 123-4567"
              />
            </div>

            <div>
              <Label htmlFor="employeeId">Employee ID (Optional)</Label>
              <Input
                id="employeeId"
                name="employeeId"
                value={formData.employeeId}
                onChange={handleChange}
                placeholder="EMP001"
              />
            </div>
          </div>
        </Card>

        {/* Address */}
        <Card className="p-4 space-y-4">
          <h2 className="font-semibold text-lg">Address</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Label htmlFor="street">Street Address</Label>
              <Input
                id="street"
                name="street"
                value={formData.street}
                onChange={handleChange}
                placeholder="123 Main St"
              />
            </div>

            <div>
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                name="city"
                value={formData.city}
                onChange={handleChange}
                placeholder="San Francisco"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="state">State</Label>
                <Input
                  id="state"
                  name="state"
                  value={formData.state}
                  onChange={handleChange}
                  placeholder="CA"
                  maxLength={2}
                />
              </div>
              <div>
                <Label htmlFor="zip">ZIP Code</Label>
                <Input
                  id="zip"
                  name="zip"
                  value={formData.zip}
                  onChange={handleChange}
                  placeholder="94102"
                />
              </div>
            </div>
          </div>
        </Card>

        {/* Emergency Contact */}
        <Card className="p-4 space-y-4">
          <h2 className="font-semibold text-lg">Emergency Contact</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="emergencyContact">Emergency Contact Name</Label>
              <Input
                id="emergencyContact"
                name="emergencyContact"
                value={formData.emergencyContact}
                onChange={handleChange}
                placeholder="Jane Doe"
              />
            </div>

            <div>
              <Label htmlFor="emergencyPhone">Emergency Contact Phone</Label>
              <Input
                id="emergencyPhone"
                name="emergencyPhone"
                type="tel"
                value={formData.emergencyPhone}
                onChange={handleChange}
                placeholder="(555) 987-6543"
              />
            </div>
          </div>
        </Card>

        {/* Employment Details */}
        <Card className="p-4 space-y-4">
          <h2 className="font-semibold text-lg">Employment Details</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="hourlyRate">Hourly Rate ($)</Label>
              <Input
                id="hourlyRate"
                name="hourlyRate"
                type="number"
                value={formData.hourlyRate}
                onChange={handleChange}
                placeholder="25.00"
                step="0.01"
                min="0"
              />
            </div>

            <div>
              <Label htmlFor="experience">Experience</Label>
              <Input
                id="experience"
                name="experience"
                value={formData.experience}
                onChange={handleChange}
                placeholder="5 years or Experienced"
              />
            </div>

            <div>
              <Label htmlFor="speed">Work Speed</Label>
              <Select
                id="speed"
                name="speed"
                value={formData.speed}
                onChange={handleChange}
              >
                <option value="Fast">Fast</option>
                <option value="Medium">Medium</option>
                <option value="Thorough">Thorough/Detailed</option>
              </Select>
              <p className="text-xs text-gray-500 mt-1">
                How they balance speed vs attention to detail
              </p>
            </div>

            <div>
              <Label htmlFor="specialties">Specialties (comma separated)</Label>
              <Input
                id="specialties"
                name="specialties"
                value={formData.specialties}
                onChange={handleChange}
                placeholder="Deep Clean, Move-Out, Windows"
              />
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="serviceAreas">Service Areas (comma separated)</Label>
              <Input
                id="serviceAreas"
                name="serviceAreas"
                value={formData.serviceAreas}
                onChange={handleChange}
                placeholder="94102, 94103, San Francisco, Oakland"
              />
              <p className="text-xs text-gray-500 mt-1">
                ZIP codes or city names where they can work
              </p>
            </div>
          </div>
        </Card>

        {/* Login Credentials */}
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

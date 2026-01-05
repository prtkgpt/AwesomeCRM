'use client';

import { useEffect, useState } from 'react';
import { signOut, useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  User,
  Lock,
  Building2,
  Bell,
  Info,
  LogOut,
  Save,
  Eye,
  EyeOff,
  Mail,
  Phone,
  Key,
  Briefcase,
  Upload,
  FileSpreadsheet,
  CheckCircle,
  AlertCircle,
  Loader2,
} from 'lucide-react';

type TabType = 'profile' | 'security' | 'company' | 'import' | 'preferences' | 'about';

interface UserProfile {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  role: string;
  company: {
    id: string;
    name: string;
  };
  createdAt: string;
}

interface CompanySettings {
  id: string;
  name: string;
  emailDomain: string | null;
  twilioAccountSid: string | null;
  twilioPhoneNumber: string | null;
  resendApiKey: string | null;
}

export default function SettingsPage() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState<TabType>('profile');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Profile state
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileForm, setProfileForm] = useState({
    name: '',
    email: '',
    phone: '',
  });

  // Password state
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  // Company settings state
  const [companySettings, setCompanySettings] = useState<CompanySettings | null>(null);
  const [companyForm, setCompanyForm] = useState({
    name: '',
    emailDomain: '',
    twilioAccountSid: '',
    twilioAuthToken: '',
    twilioPhoneNumber: '',
    resendApiKey: '',
  });

  useEffect(() => {
    fetchProfile();
    const userRole = (session?.user as any)?.role;
    if (userRole === 'OWNER' || userRole === 'ADMIN') {
      fetchCompanySettings();
    }
  }, [session]);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/user/profile');
      const data = await response.json();

      if (data.success) {
        setProfile(data.data);
        setProfileForm({
          name: data.data.name || '',
          email: data.data.email || '',
          phone: data.data.phone || '',
        });
      }
    } catch (error) {
      console.error('Failed to fetch profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCompanySettings = async () => {
    try {
      const response = await fetch('/api/company/settings');
      const data = await response.json();

      if (data.success) {
        setCompanySettings(data.data);
        setCompanyForm({
          name: data.data.name || '',
          emailDomain: data.data.emailDomain || '',
          twilioAccountSid: data.data.twilioAccountSid || '',
          twilioAuthToken: '',
          twilioPhoneNumber: data.data.twilioPhoneNumber || '',
          resendApiKey: data.data.resendApiKey || '',
        });
      }
    } catch (error) {
      console.error('Failed to fetch company settings:', error);
    }
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const response = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileForm),
      });

      const data = await response.json();

      if (data.success) {
        alert('Profile updated successfully!');
        fetchProfile();
      } else {
        alert(data.error || 'Failed to update profile');
      }
    } catch (error) {
      alert('An error occurred. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const response = await fetch('/api/user/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(passwordForm),
      });

      const data = await response.json();

      if (data.success) {
        alert('Password changed successfully!');
        setPasswordForm({
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        });
      } else {
        alert(data.error || 'Failed to change password');
      }
    } catch (error) {
      alert('An error occurred. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleCompanyUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const response = await fetch('/api/company/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(companyForm),
      });

      const data = await response.json();

      if (data.success) {
        alert('Company settings updated successfully!');
        fetchCompanySettings();
      } else {
        alert(data.error || 'Failed to update company settings');
      }
    } catch (error) {
      alert('An error occurred. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = () => {
    signOut({ callbackUrl: '/login' });
  };

  // CSV Import handlers
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportFile(file);
    setImportResult(null);

    // Parse CSV preview
    const text = await file.text();
    const lines = text.split('\n').filter(line => line.trim());
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    setImportHeaders(headers);

    // Get first 5 rows for preview
    const previewData = lines.slice(1, 6).map(line => {
      const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
      const row: Record<string, string> = {};
      headers.forEach((h, i) => {
        row[h] = values[i] || '';
      });
      return row;
    });
    setImportPreview(previewData);
  };

  const handleImport = async () => {
    if (!importFile) return;

    setImporting(true);
    setImportResult(null);

    try {
      const formData = new FormData();
      formData.append('file', importFile);
      formData.append('type', importType);

      const response = await fetch('/api/import/csv', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        setImportResult({
          success: true,
          imported: data.imported,
          errors: data.errors || [],
        });
        // Clear file after successful import
        setImportFile(null);
        setImportPreview([]);
        setImportHeaders([]);
      } else {
        setImportResult({
          success: false,
          imported: 0,
          errors: [data.error || 'Import failed'],
        });
      }
    } catch (error) {
      setImportResult({
        success: false,
        imported: 0,
        errors: ['An error occurred during import'],
      });
    } finally {
      setImporting(false);
    }
  };

  // Import state
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importType, setImportType] = useState<'bookings' | 'clients'>('bookings');
  const [importPreview, setImportPreview] = useState<any[]>([]);
  const [importHeaders, setImportHeaders] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    success: boolean;
    imported: number;
    errors: string[];
  } | null>(null);

  const userRole = (session?.user as any)?.role;
  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'security', label: 'Security', icon: Lock },
    ...(userRole === 'OWNER' || userRole === 'ADMIN'
      ? [
          { id: 'company', label: 'Company', icon: Building2 },
          { id: 'import', label: 'Import Data', icon: Upload },
        ]
      : []),
    { id: 'preferences', label: 'Preferences', icon: Bell },
    { id: 'about', label: 'About', icon: Info },
  ];

  return (
    <div className="p-4 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Manage your account and preferences
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar Tabs */}
        <div className="lg:col-span-1">
          <Card className="p-2">
            <nav className="space-y-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as TabType)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                      activeTab === tab.id
                        ? 'bg-primary text-white'
                        : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="font-medium">{tab.label}</span>
                  </button>
                );
              })}
              <button
                onClick={handleSignOut}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
              >
                <LogOut className="h-5 w-5" />
                <span className="font-medium">Sign Out</span>
              </button>
            </nav>
          </Card>
        </div>

        {/* Content Area */}
        <div className="lg:col-span-3">
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <Card className="p-6">
              <div className="mb-6">
                <h2 className="text-2xl font-bold">Profile Information</h2>
                <p className="text-gray-600 dark:text-gray-400 mt-1">
                  Update your personal information
                </p>
              </div>

              {loading ? (
                <div className="text-center py-8">Loading...</div>
              ) : (
                <form onSubmit={handleProfileUpdate} className="space-y-6">
                  {/* Role Badge */}
                  <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <div className="flex items-center gap-2">
                      <Briefcase className="h-5 w-5 text-blue-600" />
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Role
                        </p>
                        <p className="font-semibold text-blue-600">
                          {profile?.role}
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-blue-200 dark:border-blue-800">
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Company
                      </p>
                      <p className="font-medium">{profile?.company?.name}</p>
                    </div>
                  </div>

                  {/* Name */}
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Full Name
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <Input
                        type="text"
                        value={profileForm.name}
                        onChange={(e) =>
                          setProfileForm({ ...profileForm, name: e.target.value })
                        }
                        className="pl-10"
                        placeholder="Enter your name"
                      />
                    </div>
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <Input
                        type="email"
                        value={profileForm.email}
                        onChange={(e) =>
                          setProfileForm({ ...profileForm, email: e.target.value })
                        }
                        className="pl-10"
                        placeholder="your@email.com"
                      />
                    </div>
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Phone Number
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <Input
                        type="tel"
                        value={profileForm.phone}
                        onChange={(e) =>
                          setProfileForm({ ...profileForm, phone: e.target.value })
                        }
                        className="pl-10"
                        placeholder="(555) 123-4567"
                      />
                    </div>
                  </div>

                  {/* Member Since */}
                  <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Member since
                    </p>
                    <p className="font-medium">
                      {profile?.createdAt
                        ? new Date(profile.createdAt).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })
                        : 'N/A'}
                    </p>
                  </div>

                  <Button type="submit" disabled={saving} className="w-full">
                    <Save className="h-4 w-4 mr-2" />
                    {saving ? 'Saving...' : 'Save Changes'}
                  </Button>
                </form>
              )}
            </Card>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <Card className="p-6">
              <div className="mb-6">
                <h2 className="text-2xl font-bold">Security Settings</h2>
                <p className="text-gray-600 dark:text-gray-400 mt-1">
                  Update your password and security preferences
                </p>
              </div>

              <form onSubmit={handlePasswordChange} className="space-y-6">
                {/* Current Password */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Current Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input
                      type={showPasswords.current ? 'text' : 'password'}
                      value={passwordForm.currentPassword}
                      onChange={(e) =>
                        setPasswordForm({
                          ...passwordForm,
                          currentPassword: e.target.value,
                        })
                      }
                      className="pl-10 pr-10"
                      placeholder="Enter current password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setShowPasswords({
                          ...showPasswords,
                          current: !showPasswords.current,
                        })
                      }
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPasswords.current ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* New Password */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    New Password
                  </label>
                  <div className="relative">
                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input
                      type={showPasswords.new ? 'text' : 'password'}
                      value={passwordForm.newPassword}
                      onChange={(e) =>
                        setPasswordForm({
                          ...passwordForm,
                          newPassword: e.target.value,
                        })
                      }
                      className="pl-10 pr-10"
                      placeholder="Enter new password (min 8 characters)"
                      required
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setShowPasswords({
                          ...showPasswords,
                          new: !showPasswords.new,
                        })
                      }
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPasswords.new ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Password must be at least 8 characters long
                  </p>
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input
                      type={showPasswords.confirm ? 'text' : 'password'}
                      value={passwordForm.confirmPassword}
                      onChange={(e) =>
                        setPasswordForm({
                          ...passwordForm,
                          confirmPassword: e.target.value,
                        })
                      }
                      className="pl-10 pr-10"
                      placeholder="Confirm new password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setShowPasswords({
                          ...showPasswords,
                          confirm: !showPasswords.confirm,
                        })
                      }
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPasswords.confirm ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    <strong>Security tip:</strong> Use a strong password with a mix
                    of letters, numbers, and symbols. Don't reuse passwords from
                    other sites.
                  </p>
                </div>

                <Button type="submit" disabled={saving} className="w-full">
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? 'Updating...' : 'Update Password'}
                </Button>
              </form>
            </Card>
          )}

          {/* Company Tab */}
          {activeTab === 'company' && (
            <Card className="p-6">
              <div className="mb-6">
                <h2 className="text-2xl font-bold">Company Settings</h2>
                <p className="text-gray-600 dark:text-gray-400 mt-1">
                  Manage company information and integrations
                </p>
              </div>

              {userRole !== 'OWNER' ? (
                <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                  <p className="text-yellow-800 dark:text-yellow-200">
                    Only company owners can update company settings.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleCompanyUpdate} className="space-y-6">
                  {/* Company Name */}
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Company Name
                    </label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <Input
                        type="text"
                        value={companyForm.name}
                        onChange={(e) =>
                          setCompanyForm({ ...companyForm, name: e.target.value })
                        }
                        className="pl-10"
                        placeholder="Your Company Name"
                      />
                    </div>
                  </div>

                  {/* Email Domain */}
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Email Domain
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <Input
                        type="text"
                        value={companyForm.emailDomain}
                        onChange={(e) =>
                          setCompanyForm({
                            ...companyForm,
                            emailDomain: e.target.value,
                          })
                        }
                        className="pl-10"
                        placeholder="yourdomain.com"
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Used for sending emails (e.g., estimates@yourdomain.com)
                    </p>
                  </div>

                  <div className="border-t pt-6">
                    <h3 className="font-semibold mb-4">Twilio SMS Integration</h3>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Account SID
                        </label>
                        <Input
                          type="text"
                          value={companyForm.twilioAccountSid}
                          onChange={(e) =>
                            setCompanyForm({
                              ...companyForm,
                              twilioAccountSid: e.target.value,
                            })
                          }
                          placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Auth Token
                        </label>
                        <Input
                          type="password"
                          value={companyForm.twilioAuthToken}
                          onChange={(e) =>
                            setCompanyForm({
                              ...companyForm,
                              twilioAuthToken: e.target.value,
                            })
                          }
                          placeholder="Enter to update token"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Phone Number
                        </label>
                        <Input
                          type="tel"
                          value={companyForm.twilioPhoneNumber}
                          onChange={(e) =>
                            setCompanyForm({
                              ...companyForm,
                              twilioPhoneNumber: e.target.value,
                            })
                          }
                          placeholder="+15551234567"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="border-t pt-6">
                    <h3 className="font-semibold mb-4">Resend Email Integration</h3>

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        API Key
                      </label>
                      <Input
                        type="password"
                        value={companyForm.resendApiKey}
                        onChange={(e) =>
                          setCompanyForm({
                            ...companyForm,
                            resendApiKey: e.target.value,
                          })
                        }
                        placeholder="re_xxxxxxxxxxxxxxxxxxxxxxxx"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Get your API key from{' '}
                        <a
                          href="https://resend.com"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          resend.com
                        </a>
                      </p>
                    </div>
                  </div>

                  <Button type="submit" disabled={saving} className="w-full">
                    <Save className="h-4 w-4 mr-2" />
                    {saving ? 'Saving...' : 'Save Company Settings'}
                  </Button>
                </form>
              )}
            </Card>
          )}

          {/* Import Tab */}
          {activeTab === 'import' && (
            <Card className="p-6">
              <div className="mb-6">
                <h2 className="text-2xl font-bold">Import Data</h2>
                <p className="text-gray-600 dark:text-gray-400 mt-1">
                  Upload CSV files to import historical data for AI training
                </p>
              </div>

              <div className="space-y-6">
                {/* Import Type Selection */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    What are you importing?
                  </label>
                  <div className="flex gap-4">
                    <button
                      onClick={() => setImportType('bookings')}
                      className={`flex-1 p-4 rounded-lg border-2 transition-colors ${
                        importType === 'bookings'
                          ? 'border-primary bg-primary/5'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <FileSpreadsheet className="h-8 w-8 mx-auto mb-2 text-primary" />
                      <p className="font-medium">Bookings / Jobs</p>
                      <p className="text-xs text-gray-500 mt-1">
                        Historical cleaning jobs with dates, prices, addresses
                      </p>
                    </button>
                    <button
                      onClick={() => setImportType('clients')}
                      className={`flex-1 p-4 rounded-lg border-2 transition-colors ${
                        importType === 'clients'
                          ? 'border-primary bg-primary/5'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <User className="h-8 w-8 mx-auto mb-2 text-primary" />
                      <p className="font-medium">Clients</p>
                      <p className="text-xs text-gray-500 mt-1">
                        Customer list with names, emails, phones, addresses
                      </p>
                    </button>
                  </div>
                </div>

                {/* File Upload */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Upload CSV File
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-primary transition-colors">
                    <input
                      type="file"
                      accept=".csv"
                      onChange={handleFileSelect}
                      className="hidden"
                      id="csv-upload"
                    />
                    <label htmlFor="csv-upload" className="cursor-pointer">
                      <Upload className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                      {importFile ? (
                        <div>
                          <p className="font-medium text-primary">{importFile.name}</p>
                          <p className="text-sm text-gray-500 mt-1">
                            {(importFile.size / 1024).toFixed(1)} KB
                          </p>
                        </div>
                      ) : (
                        <div>
                          <p className="font-medium">Click to upload or drag and drop</p>
                          <p className="text-sm text-gray-500 mt-1">CSV files only</p>
                        </div>
                      )}
                    </label>
                  </div>
                </div>

                {/* Preview */}
                {importPreview.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-3">Preview (first 5 rows)</h3>
                    <div className="overflow-x-auto border rounded-lg">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 dark:bg-gray-900">
                          <tr>
                            {importHeaders.map((header, i) => (
                              <th key={i} className="px-3 py-2 text-left font-medium">
                                {header}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {importPreview.map((row, i) => (
                            <tr key={i} className="border-t">
                              {importHeaders.map((header, j) => (
                                <td key={j} className="px-3 py-2 truncate max-w-[150px]">
                                  {row[header]}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      Found {importHeaders.length} columns
                    </p>
                  </div>
                )}

                {/* Import Result */}
                {importResult && (
                  <div
                    className={`p-4 rounded-lg ${
                      importResult.success
                        ? 'bg-green-50 border border-green-200'
                        : 'bg-red-50 border border-red-200'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      {importResult.success ? (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      ) : (
                        <AlertCircle className="h-5 w-5 text-red-600" />
                      )}
                      <p className={`font-medium ${importResult.success ? 'text-green-800' : 'text-red-800'}`}>
                        {importResult.success
                          ? `Successfully imported ${importResult.imported} records!`
                          : 'Import failed'}
                      </p>
                    </div>
                    {importResult.errors.length > 0 && (
                      <ul className="text-sm text-red-700 list-disc list-inside">
                        {importResult.errors.slice(0, 5).map((err, i) => (
                          <li key={i}>{err}</li>
                        ))}
                        {importResult.errors.length > 5 && (
                          <li>...and {importResult.errors.length - 5} more errors</li>
                        )}
                      </ul>
                    )}
                  </div>
                )}

                {/* Import Button */}
                <Button
                  onClick={handleImport}
                  disabled={!importFile || importing}
                  className="w-full"
                >
                  {importing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Import {importType === 'bookings' ? 'Bookings' : 'Clients'}
                    </>
                  )}
                </Button>

                {/* Help Section */}
                <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">
                    CSV Format Tips
                  </h4>
                  <div className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                    {importType === 'bookings' ? (
                      <>
                        <p>Expected columns for bookings:</p>
                        <code className="block bg-blue-100 dark:bg-blue-900 p-2 rounded mt-1 text-xs">
                          date, client_name, address, city, state, zip, service_type, price, status, cleaner
                        </code>
                      </>
                    ) : (
                      <>
                        <p>Expected columns for clients:</p>
                        <code className="block bg-blue-100 dark:bg-blue-900 p-2 rounded mt-1 text-xs">
                          name, email, phone, address, city, state, zip, tags
                        </code>
                      </>
                    )}
                  </div>
                </div>

                {/* Google Sheets Note */}
                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    <strong>Using Google Sheets?</strong> Go to File → Download → CSV (.csv)
                    to export your spreadsheet, then upload it here.
                  </p>
                </div>
              </div>
            </Card>
          )}

          {/* Preferences Tab */}
          {activeTab === 'preferences' && (
            <Card className="p-6">
              <div className="mb-6">
                <h2 className="text-2xl font-bold">Preferences</h2>
                <p className="text-gray-600 dark:text-gray-400 mt-1">
                  Customize your experience
                </p>
              </div>

              <div className="space-y-6">
                <div>
                  <h3 className="font-semibold mb-4">Notifications</h3>
                  <div className="space-y-3">
                    <label className="flex items-center justify-between p-4 border rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900">
                      <div>
                        <p className="font-medium">Email Notifications</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Receive notifications via email
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        defaultChecked
                        className="h-5 w-5 rounded"
                      />
                    </label>

                    <label className="flex items-center justify-between p-4 border rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900">
                      <div>
                        <p className="font-medium">SMS Notifications</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Receive notifications via SMS
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        defaultChecked
                        className="h-5 w-5 rounded"
                      />
                    </label>

                    <label className="flex items-center justify-between p-4 border rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900">
                      <div>
                        <p className="font-medium">Booking Reminders</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Get reminded about upcoming jobs
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        defaultChecked
                        className="h-5 w-5 rounded"
                      />
                    </label>
                  </div>
                </div>

                <div className="border-t pt-6">
                  <h3 className="font-semibold mb-4">Display</h3>
                  <div className="space-y-3">
                    <div className="p-4 border rounded-lg">
                      <label className="block font-medium mb-2">Theme</label>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                        Theme is managed by your system preferences
                      </p>
                      <div className="flex gap-2">
                        <button className="px-4 py-2 bg-white border rounded-lg text-sm">
                          Light
                        </button>
                        <button className="px-4 py-2 bg-gray-900 text-white border rounded-lg text-sm">
                          Dark
                        </button>
                        <button className="px-4 py-2 border rounded-lg text-sm">
                          Auto
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    <strong>Note:</strong> Notification preferences are currently
                    for display only. Full notification settings will be available
                    in a future update.
                  </p>
                </div>
              </div>
            </Card>
          )}

          {/* About Tab */}
          {activeTab === 'about' && (
            <Card className="p-6">
              <div className="mb-6">
                <h2 className="text-2xl font-bold">About CleanDay CRM</h2>
                <p className="text-gray-600 dark:text-gray-400 mt-1">
                  Application information and resources
                </p>
              </div>

              <div className="space-y-6">
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950 rounded-lg p-6">
                  <h3 className="text-xl font-bold mb-2">CleanDay CRM</h3>
                  <p className="text-gray-600 dark:text-gray-400">Version 1.0.0</p>
                </div>

                <div>
                  <h3 className="font-semibold mb-3">Features</h3>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-start gap-2">
                      <span className="text-green-600 mt-0.5">✓</span>
                      <span>Multi-tenant client management</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-600 mt-0.5">✓</span>
                      <span>Job scheduling and tracking</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-600 mt-0.5">✓</span>
                      <span>Team member management</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-600 mt-0.5">✓</span>
                      <span>Invoicing and payments</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-600 mt-0.5">✓</span>
                      <span>SMS and email notifications</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-600 mt-0.5">✓</span>
                      <span>Activity feed and action items</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-600 mt-0.5">✓</span>
                      <span>Cleaning reviews and ratings</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-600 mt-0.5">✓</span>
                      <span>Enhanced calendar with provider tracking</span>
                    </li>
                  </ul>
                </div>

                <div className="border-t pt-6">
                  <h3 className="font-semibold mb-3">Technology Stack</h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                      <p className="font-medium">Frontend</p>
                      <p className="text-gray-600 dark:text-gray-400">
                        Next.js 14, React, TypeScript
                      </p>
                    </div>
                    <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                      <p className="font-medium">Backend</p>
                      <p className="text-gray-600 dark:text-gray-400">
                        Next.js API, Prisma ORM
                      </p>
                    </div>
                    <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                      <p className="font-medium">Database</p>
                      <p className="text-gray-600 dark:text-gray-400">PostgreSQL</p>
                    </div>
                    <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                      <p className="font-medium">Integrations</p>
                      <p className="text-gray-600 dark:text-gray-400">
                        Stripe, Twilio, Resend
                      </p>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-6">
                  <h3 className="font-semibold mb-3">Support</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    Need help? Contact your system administrator or check our
                    documentation.
                  </p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      Documentation
                    </Button>
                    <Button variant="outline" size="sm">
                      Contact Support
                    </Button>
                  </div>
                </div>

                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 text-center">
                  <p className="text-xs text-gray-500">
                    © 2026 CleanDay CRM. All rights reserved.
                  </p>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

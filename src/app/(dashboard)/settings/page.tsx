'use client';

import { useEffect, useState } from 'react';
import { signOut, useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Skeleton,
  SkeletonFormField,
  SkeletonTableRow,
  ProgressBar,
} from '@/components/ui/skeleton';
import { motion, AnimatePresence } from 'framer-motion';
import { tabContentVariants } from '@/lib/animations';
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
  Download,
  FileText,
  CheckCircle,
  XCircle,
  AlertCircle,
  DollarSign,
  Copy,
  Check,
  Globe,
  Plus,
  Edit,
  Trash2,
  X,
  Gift,
  Users,
  TrendingUp,
  Link,
  ExternalLink,
} from 'lucide-react';

type TabType = 'profile' | 'security' | 'company' | 'preferences' | 'about' | 'import' | 'pricing' | 'operations' | 'referral';

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
  slug: string;
  emailDomain: string | null;
  googleReviewUrl: string | null;
  yelpReviewUrl: string | null;
  twilioAccountSid: string | null;
  twilioPhoneNumber: string | null;
  resendApiKey: string | null;
  stripeSecretKey: string | null;
  stripePublishableKey: string | null;
  stripeWebhookSecret: string | null;
  timezone: string;
  onlineBookingEnabled: boolean;
  minimumLeadTimeHours: number;
  maxDaysAhead: number;
  requireApproval: boolean;
}

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const [activeTab, setActiveTab] = useState<TabType>('profile');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [webhookUrlCopied, setWebhookUrlCopied] = useState(false);

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
    googleReviewUrl: '',
    yelpReviewUrl: '',
    twilioAccountSid: '',
    twilioAuthToken: '',
    twilioPhoneNumber: '',
    resendApiKey: '',
    stripeSecretKey: '',
    stripePublishableKey: '',
    stripeWebhookSecret: '',
    timezone: 'America/Los_Angeles',
    onlineBookingEnabled: true,
    minimumLeadTimeHours: 2,
    maxDaysAhead: 60,
    requireApproval: false,
  });

  // Import data state
  const [importType, setImportType] = useState<'clients' | 'bookings'>('clients');
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResults, setImportResults] = useState<{
    success: boolean;
    message: string;
    imported: number;
    failed: number;
    errors?: string[];
  } | null>(null);

  // Restore data state
  const [restoring, setRestoring] = useState(false);
  const [restoreResults, setRestoreResults] = useState<{
    success: boolean;
    message: string;
    clients?: { restored: number; skipped: number };
    bookings?: { restored: number; skipped: number; matchedFromBackup: number };
  } | null>(null);

  useEffect(() => {
    // Wait for session to finish loading before fetching data
    if (status === 'loading') return;

    fetchProfile();
    const userRole = (session?.user as any)?.role;
    if (userRole === 'OWNER' || userRole === 'ADMIN') {
      fetchCompanySettings();
    }
  }, [session, status]);

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
          googleReviewUrl: data.data.googleReviewUrl || '',
          yelpReviewUrl: data.data.yelpReviewUrl || '',
          twilioAccountSid: data.data.twilioAccountSid || '',
          twilioAuthToken: '',
          twilioPhoneNumber: data.data.twilioPhoneNumber || '',
          resendApiKey: data.data.resendApiKey || '',
          stripeSecretKey: data.data.stripeSecretKey || '',
          stripePublishableKey: data.data.stripePublishableKey || '',
          stripeWebhookSecret: data.data.stripeWebhookSecret || '',
          timezone: data.data.timezone || 'America/Los_Angeles',
          onlineBookingEnabled: data.data.onlineBookingEnabled ?? true,
          minimumLeadTimeHours: data.data.minimumLeadTimeHours ?? 2,
          maxDaysAhead: data.data.maxDaysAhead ?? 60,
          requireApproval: data.data.requireApproval ?? false,
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

  const copyWebhookUrl = async () => {
    if (!companySettings?.id) return;

    const webhookUrl = `${window.location.origin}/api/webhooks/stripe/${companySettings.id}`;

    try {
      await navigator.clipboard.writeText(webhookUrl);
      setWebhookUrlCopied(true);
      setTimeout(() => setWebhookUrlCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy webhook URL:', error);
      alert('Failed to copy URL. Please copy manually.');
    }
  };

  const handleSignOut = () => {
    signOut({ callbackUrl: '/login' });
  };

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!importFile) {
      alert('Please select a file to import');
      return;
    }

    setImporting(true);
    setImportResults(null);

    try {
      const formData = new FormData();
      formData.append('file', importFile);
      formData.append('type', importType);

      const response = await fetch('/api/import', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      setImportResults(data);

      if (data.success) {
        setImportFile(null);
        // Reset file input
        const fileInput = document.getElementById('import-file') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
      }
    } catch (error) {
      console.error('Import error:', error);
      setImportResults({
        success: false,
        message: 'Failed to import data. Please try again.',
        imported: 0,
        failed: 0,
      });
    } finally {
      setImporting(false);
    }
  };

  const downloadSampleCSV = (type: 'clients' | 'bookings') => {
    let csvContent = '';
    let filename = '';

    if (type === 'clients') {
      csvContent = `name,email,phone,street,city,state,zip,hasInsurance,insuranceProvider,copayAmount\nJohn Doe,john@example.com,(555) 123-4567,123 Main St,Los Angeles,CA,90001,true,Helper Bees,25\nJane Smith,jane@example.com,(555) 987-6543,456 Oak Ave,Los Angeles,CA,90002,false,,`;
      filename = 'clients_sample.csv';
    } else {
      csvContent = `clientEmail,date,serviceType,status,price\njohn@example.com,2026-01-15,STANDARD,SCHEDULED,150\njane@example.com,2026-01-16,DEEP,SCHEDULED,300`;
      filename = 'bookings_sample.csv';
    }

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const userRole = (session?.user as any)?.role;
  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'security', label: 'Security', icon: Lock },
    ...(userRole === 'OWNER' || userRole === 'ADMIN'
      ? [
          { id: 'company', label: 'Company', icon: Building2 },
          { id: 'import', label: 'Import Data', icon: Upload },
          { id: 'pricing', label: 'Pricing Configuration', icon: DollarSign },
        ]
      : []),
    { id: 'preferences', label: 'Preferences', icon: Bell },
    ...(userRole === 'OWNER'
      ? [
          { id: 'operations', label: 'Operations', icon: Briefcase },
          { id: 'referral', label: 'Referral Program', icon: Gift },
        ]
      : []),
    { id: 'about', label: 'About', icon: Info },
  ];

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">Settings</h1>
        <p className="text-sm md:text-base text-gray-600 dark:text-gray-400 mt-2">
          Manage your business settings and preferences
        </p>
      </div>

      {/* Horizontal Tab Navigation */}
      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700 mb-6 overflow-x-auto pb-px">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold whitespace-nowrap transition-all duration-200 border-b-2 ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:border-gray-300'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Content Area */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          variants={tabContentVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
        >
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
                  {/* Company ID (Read-only) */}
                  {companySettings?.id && (
                    <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                      <label className="block text-sm font-medium mb-2">
                        Company ID
                      </label>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 text-sm bg-white dark:bg-gray-800 p-3 rounded border border-gray-200 dark:border-gray-700 font-mono">
                          {companySettings.id}
                        </code>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={async () => {
                            try {
                              await navigator.clipboard.writeText(companySettings.id);
                              alert('Company ID copied to clipboard!');
                            } catch (error) {
                              console.error('Failed to copy:', error);
                            }
                          }}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        This is your unique company identifier used in API integrations and webhooks
                      </p>
                    </div>
                  )}

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

                  {/* Business Timezone */}
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Business Timezone
                    </label>
                    <div className="relative">
                      <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <select
                        value={companyForm.timezone}
                        onChange={(e) =>
                          setCompanyForm({
                            ...companyForm,
                            timezone: e.target.value,
                          })
                        }
                        className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <optgroup label="US Timezones">
                          <option value="America/New_York">Eastern Time (EST/EDT)</option>
                          <option value="America/Chicago">Central Time (CST/CDT)</option>
                          <option value="America/Denver">Mountain Time (MST/MDT)</option>
                          <option value="America/Phoenix">Arizona (MST - No DST)</option>
                          <option value="America/Los_Angeles">Pacific Time (PST/PDT)</option>
                          <option value="America/Anchorage">Alaska Time (AKST/AKDT)</option>
                          <option value="Pacific/Honolulu">Hawaii Time (HST)</option>
                        </optgroup>
                        <optgroup label="Other Timezones">
                          <option value="America/Toronto">Toronto (EST/EDT)</option>
                          <option value="America/Vancouver">Vancouver (PST/PDT)</option>
                          <option value="Europe/London">London (GMT/BST)</option>
                          <option value="Europe/Paris">Paris (CET/CEST)</option>
                          <option value="Asia/Tokyo">Tokyo (JST)</option>
                          <option value="Australia/Sydney">Sydney (AEDT/AEST)</option>
                        </optgroup>
                      </select>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      All job scheduling times will be displayed in this timezone. Business hours validation (8am-5pm start, 8pm end) applies in this timezone.
                    </p>
                  </div>

                  {/* Online Booking Section */}
                  <div className="border-t pt-6">
                    <div className="flex items-center gap-3 mb-6">
                      <Globe className="h-6 w-6 text-blue-600" />
                      <div>
                        <h3 className="font-semibold text-lg">Online Booking</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Allow customers to book appointments online
                        </p>
                      </div>
                    </div>

                    {/* Online Booking Toggle */}
                    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-lg mb-6">
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Enable Online Booking
                        </label>
                        <p className="text-xs text-gray-500">
                          Allow customers to book appointments through your public booking page
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          checked={companyForm.onlineBookingEnabled}
                          onChange={(e) =>
                            setCompanyForm({
                              ...companyForm,
                              onlineBookingEnabled: e.target.checked,
                            })
                          }
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                      </label>
                    </div>

                    {/* Business URL */}
                    {companySettings?.slug && (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium mb-2">
                            Your Business URL <span className="text-red-500">*</span>
                          </label>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                              {typeof window !== 'undefined' ? window.location.origin : ''}/
                            </span>
                            <Input
                              type="text"
                              value={companySettings.slug}
                              disabled
                              className="flex-1 bg-gray-100 dark:bg-gray-800"
                              placeholder="your-business-name"
                            />
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            Only lowercase letters, numbers, and hyphens allowed
                          </p>
                        </div>

                        {/* Landing Page URL */}
                        <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                          <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                            <Link className="h-4 w-4" />
                            Landing Page
                          </label>
                          <div className="flex items-center gap-2">
                            <code className="flex-1 text-sm bg-white dark:bg-gray-800 p-3 rounded border border-blue-200 dark:border-blue-700 font-mono break-all">
                              {typeof window !== 'undefined' ? window.location.origin : ''}/{companySettings.slug}
                            </code>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                window.open(`/${companySettings.slug}`, '_blank');
                              }}
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={async () => {
                                try {
                                  const url = `${window.location.origin}/${companySettings.slug}`;
                                  await navigator.clipboard.writeText(url);
                                  alert('Landing page URL copied!');
                                } catch (error) {
                                  console.error('Failed to copy:', error);
                                }
                              }}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        {/* Booking Page URL */}
                        <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-4">
                          <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                            <Link className="h-4 w-4" />
                            Booking Page
                          </label>
                          <div className="flex items-center gap-2">
                            <code className="flex-1 text-sm bg-white dark:bg-gray-800 p-3 rounded border border-green-200 dark:border-green-700 font-mono break-all">
                              {typeof window !== 'undefined' ? window.location.origin : ''}/{companySettings.slug}/book
                            </code>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                window.open(`/${companySettings.slug}/book`, '_blank');
                              }}
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={async () => {
                                try {
                                  const url = `${window.location.origin}/${companySettings.slug}/book`;
                                  await navigator.clipboard.writeText(url);
                                  alert('Booking page URL copied!');
                                } catch (error) {
                                  console.error('Failed to copy:', error);
                                }
                              }}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Booking Settings */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                      {/* Minimum Lead Time */}
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Minimum Lead Time (hours)
                        </label>
                        <Input
                          type="number"
                          min="0"
                          max="168"
                          value={companyForm.minimumLeadTimeHours}
                          onChange={(e) =>
                            setCompanyForm({
                              ...companyForm,
                              minimumLeadTimeHours: parseInt(e.target.value) || 0,
                            })
                          }
                          placeholder="2"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          How far in advance customers must book
                        </p>
                      </div>

                      {/* Max Days Ahead */}
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Max Days Ahead
                        </label>
                        <Input
                          type="number"
                          min="1"
                          max="365"
                          value={companyForm.maxDaysAhead}
                          onChange={(e) =>
                            setCompanyForm({
                              ...companyForm,
                              maxDaysAhead: parseInt(e.target.value) || 60,
                            })
                          }
                          placeholder="60"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          How far in advance customers can book
                        </p>
                      </div>
                    </div>

                    {/* Require Approval Toggle */}
                    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-lg mt-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Require Approval
                        </label>
                        <p className="text-xs text-gray-500">
                          Manually approve each online booking
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          checked={companyForm.requireApproval}
                          onChange={(e) =>
                            setCompanyForm({
                              ...companyForm,
                              requireApproval: e.target.checked,
                            })
                          }
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                  </div>

                  <div className="border-t pt-6">
                    <h3 className="font-semibold mb-4">Customer Review Links</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                      Add links to your business review pages. These will be shown on the customer feedback page.
                    </p>

                    <div className="space-y-4">
                      {/* Google Review URL */}
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Google Review URL
                        </label>
                        <Input
                          type="url"
                          value={companyForm.googleReviewUrl}
                          onChange={(e) =>
                            setCompanyForm({
                              ...companyForm,
                              googleReviewUrl: e.target.value,
                            })
                          }
                          placeholder="https://g.page/r/..."
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Your Google Business review link
                        </p>
                      </div>

                      {/* Yelp Review URL */}
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Yelp Review URL
                        </label>
                        <Input
                          type="url"
                          value={companyForm.yelpReviewUrl}
                          onChange={(e) =>
                            setCompanyForm({
                              ...companyForm,
                              yelpReviewUrl: e.target.value,
                            })
                          }
                          placeholder="https://www.yelp.com/biz/..."
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Your Yelp Business review link
                        </p>
                      </div>
                    </div>
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

                  <div className="border-t pt-6">
                    <h3 className="font-semibold mb-4">Stripe Payment Integration</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                      Configure Stripe to enable credit card payments for your customers
                    </p>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Secret Key
                        </label>
                        <Input
                          type="password"
                          value={companyForm.stripeSecretKey}
                          onChange={(e) =>
                            setCompanyForm({
                              ...companyForm,
                              stripeSecretKey: e.target.value,
                            })
                          }
                          placeholder="Enter your Stripe secret key"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Your Stripe secret key (starts with sk_live_ or sk_test_)
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Publishable Key
                        </label>
                        <Input
                          type="text"
                          value={companyForm.stripePublishableKey}
                          onChange={(e) =>
                            setCompanyForm({
                              ...companyForm,
                              stripePublishableKey: e.target.value,
                            })
                          }
                          placeholder="Enter your Stripe publishable key"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Your Stripe publishable key (starts with pk_live_ or pk_test_)
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Webhook Signing Secret
                        </label>
                        <Input
                          type="password"
                          value={companyForm.stripeWebhookSecret}
                          onChange={(e) =>
                            setCompanyForm({
                              ...companyForm,
                              stripeWebhookSecret: e.target.value,
                            })
                          }
                          placeholder="Enter your webhook signing secret"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Your webhook signing secret from{' '}
                          <a
                            href="https://dashboard.stripe.com/webhooks"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                          >
                            Stripe Dashboard
                          </a>
                        </p>
                      </div>

                      {/* Webhook URL Display */}
                      <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <label className="block text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
                              Your Webhook URL
                            </label>
                            <code className="block text-xs bg-white dark:bg-gray-800 p-3 rounded border border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200 break-all">
                              {companySettings?.id
                                ? `${typeof window !== 'undefined' ? window.location.origin : 'https://cleandaycrm.com'}/api/webhooks/stripe/${companySettings.id}`
                                : 'Save your settings first to see your webhook URL'}
                            </code>
                            <p className="text-xs text-blue-700 dark:text-blue-300 mt-2">
                              📋 Copy this URL and add it to your Stripe Dashboard → Webhooks
                            </p>
                          </div>
                          {companySettings?.id && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={copyWebhookUrl}
                              className="mt-6 shrink-0"
                            >
                              {webhookUrlCopied ? (
                                <>
                                  <Check className="h-4 w-4 mr-1 text-green-600" />
                                  Copied!
                                </>
                              ) : (
                                <>
                                  <Copy className="h-4 w-4 mr-1" />
                                  Copy
                                </>
                              )}
                            </Button>
                          )}
                        </div>
                      </div>
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

          {/* Import Data Tab */}
          {activeTab === 'import' && (
            <Card className="p-6">
              <div className="mb-6">
                <h2 className="text-2xl font-bold">Import Data</h2>
                <p className="text-gray-600 dark:text-gray-400 mt-1">
                  Bulk import clients and bookings from CSV files
                </p>
              </div>

              <form onSubmit={handleImport} className="space-y-6">
                {/* Import Type Selection */}
                <div>
                  <label className="block text-sm font-medium mb-3">
                    What would you like to import?
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setImportType('clients')}
                      className={`p-4 border-2 rounded-lg text-left transition-all ${
                        importType === 'clients'
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <User className="h-6 w-6 mb-2 text-blue-600" />
                      <p className="font-semibold">Clients</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                        Import client information and addresses
                      </p>
                    </button>
                    <button
                      type="button"
                      onClick={() => setImportType('bookings')}
                      className={`p-4 border-2 rounded-lg text-left transition-all ${
                        importType === 'bookings'
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <FileText className="h-6 w-6 mb-2 text-blue-600" />
                      <p className="font-semibold">Bookings</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                        Import job bookings and schedules
                      </p>
                    </button>
                  </div>
                </div>

                {/* Download Sample CSV */}
                <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <Download className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-medium text-blue-900 dark:text-blue-100">
                        Need a template?
                      </p>
                      <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                        Download a sample CSV file to see the required format for importing{' '}
                        {importType}.
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => downloadSampleCSV(importType)}
                        className="mt-3"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download Sample CSV
                      </Button>
                    </div>
                  </div>
                </div>

                {/* File Upload */}
                <div>
                  <label htmlFor="import-file" className="block text-sm font-medium mb-2">
                    Select CSV File
                  </label>
                  <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
                    <Upload className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                    <Input
                      id="import-file"
                      type="file"
                      accept=".csv"
                      onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                      className="max-w-xs mx-auto"
                    />
                    {importFile && (
                      <p className="text-sm text-green-600 dark:text-green-400 mt-2">
                        Selected: {importFile.name}
                      </p>
                    )}
                  </div>
                </div>

                {/* CSV Format Guide */}
                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    CSV Format Requirements
                  </h3>
                  {importType === 'clients' ? (
                    <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                      <p><strong>Required columns:</strong> name, phone, street, city, state, zip</p>
                      <p><strong>Optional columns:</strong> email, hasInsurance, insuranceProvider, copayAmount, cleaningObservations</p>
                      <p className="text-xs mt-2">Note: Email addresses must be unique. Duplicate emails will be skipped.</p>
                    </div>
                  ) : (
                    <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                      <p><strong>Required columns:</strong> clientEmail, date, serviceType, status, price</p>
                      <p><strong>Date format:</strong> YYYY-MM-DD (e.g., 2026-01-15)</p>
                      <p><strong>Valid service types:</strong> STANDARD, DEEP, MOVE_OUT</p>
                      <p><strong>Valid statuses:</strong> SCHEDULED, IN_PROGRESS, COMPLETED, CANCELLED</p>
                      <p className="text-xs mt-2">Note: Client must exist before importing their bookings.</p>
                    </div>
                  )}
                </div>

                {/* Import Progress */}
                {importing && (
                  <div className="rounded-lg p-6 bg-blue-50 dark:bg-blue-950 border-2 border-blue-500">
                    <ProgressBar
                      progress={50}
                      label={`Importing ${importType === 'clients' ? 'clients' : 'bookings'}...`}
                      size="lg"
                      showPercentage={false}
                    />
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-3 text-center">
                      Please wait while we process your file. This may take a moment.
                    </p>
                  </div>
                )}

                {/* Import Results */}
                {importResults && (
                  <div
                    className={`rounded-lg p-4 border-2 ${
                      importResults.success
                        ? 'bg-green-50 dark:bg-green-950 border-green-500'
                        : 'bg-red-50 dark:bg-red-950 border-red-500'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {importResults.success ? (
                        <CheckCircle className="h-6 w-6 text-green-600 mt-0.5" />
                      ) : (
                        <XCircle className="h-6 w-6 text-red-600 mt-0.5" />
                      )}
                      <div className="flex-1">
                        <p className="font-semibold">
                          {importResults.message}
                        </p>
                        <div className="mt-2 text-sm">
                          <p>
                            ✓ Successfully imported: <strong>{importResults.imported}</strong>
                          </p>
                          {importResults.failed > 0 && (
                            <p className="text-red-600 dark:text-red-400">
                              ✗ Failed: <strong>{importResults.failed}</strong>
                            </p>
                          )}
                        </div>
                        {importResults.errors && importResults.errors.length > 0 && (
                          <div className="mt-3 text-xs">
                            <p className="font-medium mb-1">Errors:</p>
                            <ul className="list-disc list-inside space-y-1 max-h-32 overflow-y-auto">
                              {importResults.errors.map((error, idx) => (
                                <li key={idx}>{error}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Import Button */}
                <Button
                  type="submit"
                  disabled={!importFile || importing}
                  className="w-full"
                  size="lg"
                >
                  <Upload className="h-5 w-5 mr-2" />
                  {importing
                    ? 'Importing...'
                    : `Import ${importType === 'clients' ? 'Clients' : 'Bookings'}`}
                </Button>

                {/* Warning */}
                <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                    <div className="text-sm text-yellow-800 dark:text-yellow-200">
                      <p className="font-medium">Important Notes:</p>
                      <ul className="list-disc list-inside mt-2 space-y-1">
                        <li>CSV file must be UTF-8 encoded</li>
                        <li>Maximum file size: 5MB</li>
                        <li>Duplicate entries (by email) will be skipped</li>
                        <li>All imported data is scoped to your company</li>
                        <li>This action cannot be undone - please verify your CSV before importing</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </form>

              {/* Data Restoration Section */}
              <div className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-700">
                <div className="mb-6">
                  <h3 className="text-xl font-bold text-red-600">Emergency Data Restoration</h3>
                  <p className="text-gray-600 dark:text-gray-400 mt-1">
                    Restore deleted client and booking data from backup
                  </p>
                </div>

                <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                    <div className="text-sm text-red-800 dark:text-red-200">
                      <p className="font-medium">This will restore:</p>
                      <ul className="list-disc list-inside mt-2 space-y-1">
                        <li>45 clients for Awesome Maids LLC</li>
                        <li>Their associated addresses</li>
                        <li>Their bookings/jobs from backup</li>
                      </ul>
                      <p className="mt-2 text-xs">Existing records will be skipped (no duplicates).</p>
                    </div>
                  </div>
                </div>

                {restoreResults && (
                  <div
                    className={`rounded-lg p-4 border-2 mb-4 ${
                      restoreResults.success
                        ? 'bg-green-50 dark:bg-green-950 border-green-500'
                        : 'bg-red-50 dark:bg-red-950 border-red-500'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {restoreResults.success ? (
                        <CheckCircle className="h-6 w-6 text-green-600 mt-0.5" />
                      ) : (
                        <XCircle className="h-6 w-6 text-red-600 mt-0.5" />
                      )}
                      <div className="flex-1">
                        <p className="font-semibold">{restoreResults.message}</p>
                        {restoreResults.clients && (
                          <p className="text-sm mt-1">
                            Clients: {restoreResults.clients.restored} restored, {restoreResults.clients.skipped} skipped
                          </p>
                        )}
                        {restoreResults.bookings && (
                          <p className="text-sm">
                            Bookings: {restoreResults.bookings.restored} restored, {restoreResults.bookings.skipped} skipped
                            (matched {restoreResults.bookings.matchedFromBackup} from backup)
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                <Button
                  type="button"
                  variant="destructive"
                  disabled={restoring}
                  className="w-full"
                  size="lg"
                  onClick={async () => {
                    if (!confirm('Are you sure you want to restore data? This will restore 45 clients and their bookings.')) {
                      return;
                    }
                    setRestoring(true);
                    setRestoreResults(null);
                    try {
                      const response = await fetch('/api/admin/restore-from-backup', {
                        method: 'POST',
                      });
                      const data = await response.json();
                      setRestoreResults({
                        success: data.success,
                        message: data.message || (data.success ? 'Restoration completed!' : data.error),
                        clients: data.results?.clients,
                        bookings: data.results?.bookings,
                      });
                    } catch (error: any) {
                      setRestoreResults({
                        success: false,
                        message: error.message || 'Restoration failed',
                      });
                    } finally {
                      setRestoring(false);
                    }
                  }}
                >
                  {restoring ? (
                    <>Restoring Data...</>
                  ) : (
                    <>
                      <Download className="h-5 w-5 mr-2" />
                      Restore 45 Clients &amp; Bookings
                    </>
                  )}
                </Button>
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
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                    Built with love by{' '}
                    <a
                      href="https://www.prateekgupta.org"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      Prateek Gupta
                    </a>
                    {' '}and{' '}
                    <a
                      href="https://getawesomemaids.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      Team
                    </a>
                  </p>
                  <p className="text-xs text-gray-500">
                    © 2026 CleanDay CRM. All rights reserved.
                  </p>
                </div>
              </div>
            </Card>
          )}

          {/* Pricing Configuration Tab */}
          {activeTab === 'pricing' && <PricingTabContent />}

          {/* Operations Tab */}
          {activeTab === 'operations' && <OperationsTabContent />}

          {/* Referral Program Tab */}
          {activeTab === 'referral' && <ReferralTabContent />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// Pricing Tab Component (extracted from /settings/pricing/page.tsx)
function PricingTabContent() {
  const [loading, setLoading] = useState(true);
  const [bedroomRules, setBedroomRules] = useState<any[]>([]);
  const [bathroomRules, setBathroomRules] = useState<any[]>([]);
  const [addonRules, setAddonRules] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [isAddingBedroom, setIsAddingBedroom] = useState(false);
  const [isAddingBathroom, setIsAddingBathroom] = useState(false);
  const [isAddingAddon, setIsAddingAddon] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchPricingRules();
  }, []);

  const fetchPricingRules = async () => {
    try {
      const response = await fetch('/api/pricing/rules');
      const data = await response.json();

      if (data.success) {
        const bedrooms = data.data.filter((r: any) => r.type === 'BEDROOM');
        const bathrooms = data.data.filter((r: any) => r.type === 'BATHROOM');
        const addons = data.data.filter((r: any) => r.type === 'ADDON' || r.type === 'CUSTOM');

        setBedroomRules(bedrooms);
        setBathroomRules(bathrooms);
        setAddonRules(addons);
      }
    } catch (error) {
      console.error('Failed to fetch pricing rules:', error);
      alert('Failed to load pricing rules');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (rule: any) => {
    setEditingId(rule.id);
    setEditForm(rule);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditForm({});
    setIsAddingBedroom(false);
    setIsAddingBathroom(false);
    setIsAddingAddon(false);
  };

  const handleSave = async () => {
    if (!editForm.name || editForm.price === undefined || editForm.duration === undefined) {
      alert('Please fill in all required fields');
      return;
    }

    setSaving(true);
    try {
      let response;

      if (editingId) {
        response = await fetch(`/api/pricing/rules/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(editForm),
        });
      } else {
        response = await fetch('/api/pricing/rules', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(editForm),
        });
      }

      const data = await response.json();

      if (data.success) {
        await fetchPricingRules();
        handleCancelEdit();
      } else {
        alert(data.error || 'Failed to save pricing rule');
      }
    } catch (error) {
      alert('An error occurred. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this pricing rule?')) {
      return;
    }

    try {
      const response = await fetch(`/api/pricing/rules/${id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        await fetchPricingRules();
      } else {
        alert(data.error || 'Failed to delete pricing rule');
      }
    } catch (error) {
      alert('An error occurred. Please try again.');
    }
  };

  const startAddingBedroom = () => {
    setIsAddingBedroom(true);
    setEditForm({
      type: 'BEDROOM',
      name: '',
      price: 0,
      duration: 120,
      display: 'BOTH',
      sortOrder: bedroomRules.length,
      quantity: null,
      serviceType: null,
      frequency: null,
      isActive: true,
    });
  };

  const startAddingBathroom = () => {
    setIsAddingBathroom(true);
    setEditForm({
      type: 'BATHROOM',
      name: '',
      price: 0,
      duration: 40,
      display: 'BOTH',
      sortOrder: bathroomRules.length,
      quantity: null,
      serviceType: null,
      frequency: null,
      isActive: true,
    });
  };

  const startAddingAddon = () => {
    setIsAddingAddon(true);
    setEditForm({
      type: 'ADDON',
      name: '',
      price: 0,
      duration: 30,
      display: 'BOTH',
      sortOrder: addonRules.length,
      quantity: null,
      serviceType: null,
      frequency: null,
      isActive: true,
    });
  };

  const formatDuration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;

    if (hours === 0) return `${mins}Min`;
    if (mins === 0) return `${hours}Hr`;
    return `${hours}Hr ${mins}Min`;
  };

  const renderTable = (rules: any[], type: string, isAdding: boolean, startAdding: () => void) => {
    const isEditing = (isAdding && editForm.type === type) || editingId;

    return (
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">{type === 'BEDROOM' ? 'Bedrooms' : type === 'BATHROOM' ? 'Bathrooms' : 'Add-ons'}</h2>
          <Button onClick={startAdding} size="sm" disabled={!!isEditing}>
            <Plus className="h-4 w-4 mr-2" />
            Add {type === 'BEDROOM' ? 'Bedroom' : type === 'BATHROOM' ? 'Bathroom' : 'Add-on'}
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">Name</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">Price</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">Time</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">Display</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">Service Category</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">Frequency</th>
                {type !== 'ADDON' && (
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">Quantity</th>
                )}
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {isAdding && editForm.type === type && (
                <tr className="bg-blue-50 dark:bg-blue-900/20">
                  <td className="px-4 py-3">
                    <input
                      type="text"
                      value={editForm.name || ''}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      className="w-full px-2 py-1 border rounded dark:bg-gray-700 dark:border-gray-600"
                      placeholder="e.g., Studio Apartment"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      value={editForm.price || 0}
                      onChange={(e) => setEditForm({ ...editForm, price: parseFloat(e.target.value) })}
                      className="w-24 px-2 py-1 border rounded dark:bg-gray-700 dark:border-gray-600"
                      step="0.01"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      value={editForm.duration || 0}
                      onChange={(e) => setEditForm({ ...editForm, duration: parseInt(e.target.value) })}
                      className="w-24 px-2 py-1 border rounded dark:bg-gray-700 dark:border-gray-600"
                      placeholder="Minutes"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={editForm.display || 'BOTH'}
                      onChange={(e) => setEditForm({ ...editForm, display: e.target.value as any })}
                      className="px-2 py-1 border rounded dark:bg-gray-700 dark:border-gray-600"
                    >
                      <option value="BOTH">Both</option>
                      <option value="BOOKING">Booking</option>
                      <option value="ESTIMATE">Estimate</option>
                      <option value="HIDDEN">Hidden</option>
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={editForm.serviceType || ''}
                      onChange={(e) => setEditForm({ ...editForm, serviceType: e.target.value || null })}
                      className="px-2 py-1 border rounded dark:bg-gray-700 dark:border-gray-600"
                    >
                      <option value="">-NA-</option>
                      <option value="STANDARD">Standard</option>
                      <option value="DEEP">Deep</option>
                      <option value="MOVE_OUT">Move-Out</option>
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={editForm.frequency || ''}
                      onChange={(e) => setEditForm({ ...editForm, frequency: e.target.value || null })}
                      className="px-2 py-1 border rounded dark:bg-gray-700 dark:border-gray-600"
                    >
                      <option value="">-NA-</option>
                      <option value="ONE_TIME">One Time</option>
                      <option value="WEEKLY">Weekly</option>
                      <option value="BIWEEKLY">Biweekly</option>
                      <option value="MONTHLY">Monthly</option>
                    </select>
                  </td>
                  {type !== 'ADDON' && (
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        value={editForm.quantity ?? ''}
                        onChange={(e) => setEditForm({ ...editForm, quantity: e.target.value ? parseFloat(e.target.value) : null })}
                        className="w-20 px-2 py-1 border rounded dark:bg-gray-700 dark:border-gray-600"
                        step="0.5"
                        placeholder="e.g., 1"
                      />
                    </td>
                  )}
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Button onClick={handleSave} size="sm" disabled={saving}>
                        <Save className="h-4 w-4" />
                      </Button>
                      <Button onClick={handleCancelEdit} size="sm" variant="outline">
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              )}
              {rules.map((rule) => (
                editingId === rule.id ? (
                  <tr key={rule.id} className="bg-blue-50 dark:bg-blue-900/20">
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        value={editForm.name || ''}
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        className="w-full px-2 py-1 border rounded dark:bg-gray-700 dark:border-gray-600"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        value={editForm.price ?? 0}
                        onChange={(e) => setEditForm({ ...editForm, price: parseFloat(e.target.value) })}
                        className="w-24 px-2 py-1 border rounded dark:bg-gray-700 dark:border-gray-600"
                        step="0.01"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        value={editForm.duration ?? 0}
                        onChange={(e) => setEditForm({ ...editForm, duration: parseInt(e.target.value) })}
                        className="w-24 px-2 py-1 border rounded dark:bg-gray-700 dark:border-gray-600"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={editForm.display || 'BOTH'}
                        onChange={(e) => setEditForm({ ...editForm, display: e.target.value as any })}
                        className="px-2 py-1 border rounded dark:bg-gray-700 dark:border-gray-600"
                      >
                        <option value="BOTH">Both</option>
                        <option value="BOOKING">Booking</option>
                        <option value="ESTIMATE">Estimate</option>
                        <option value="HIDDEN">Hidden</option>
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={editForm.serviceType || ''}
                        onChange={(e) => setEditForm({ ...editForm, serviceType: e.target.value || null })}
                        className="px-2 py-1 border rounded dark:bg-gray-700 dark:border-gray-600"
                      >
                        <option value="">-NA-</option>
                        <option value="STANDARD">Standard</option>
                        <option value="DEEP">Deep</option>
                        <option value="MOVE_OUT">Move-Out</option>
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={editForm.frequency || ''}
                        onChange={(e) => setEditForm({ ...editForm, frequency: e.target.value || null })}
                        className="px-2 py-1 border rounded dark:bg-gray-700 dark:border-gray-600"
                      >
                        <option value="">-NA-</option>
                        <option value="ONE_TIME">One Time</option>
                        <option value="WEEKLY">Weekly</option>
                        <option value="BIWEEKLY">Biweekly</option>
                        <option value="MONTHLY">Monthly</option>
                      </select>
                    </td>
                    {type !== 'ADDON' && (
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          value={editForm.quantity ?? ''}
                          onChange={(e) => setEditForm({ ...editForm, quantity: e.target.value ? parseFloat(e.target.value) : null })}
                          className="w-20 px-2 py-1 border rounded dark:bg-gray-700 dark:border-gray-600"
                          step="0.5"
                        />
                      </td>
                    )}
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <Button onClick={handleSave} size="sm" disabled={saving}>
                          <Save className="h-4 w-4" />
                        </Button>
                        <Button onClick={handleCancelEdit} size="sm" variant="outline">
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <tr key={rule.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="px-4 py-3 text-sm">{rule.name}</td>
                    <td className="px-4 py-3 text-sm">${rule.price.toFixed(2)}</td>
                    <td className="px-4 py-3 text-sm">{formatDuration(rule.duration)}</td>
                    <td className="px-4 py-3 text-sm">{rule.display}</td>
                    <td className="px-4 py-3 text-sm">{rule.serviceType || '-NA-'}</td>
                    <td className="px-4 py-3 text-sm">{rule.frequency || '-NA-'}</td>
                    {type !== 'ADDON' && (
                      <td className="px-4 py-3 text-sm">{rule.quantity !== null ? rule.quantity : '-'}</td>
                    )}
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <Button onClick={() => handleEdit(rule)} size="sm" variant="outline" disabled={!!isEditing}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button onClick={() => handleDelete(rule.id)} size="sm" variant="outline" disabled={!!isEditing}>
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                )
              ))}
              {rules.length === 0 && !isAdding && (
                <tr>
                  <td colSpan={type !== 'ADDON' ? 8 : 7} className="px-4 py-8 text-center text-gray-500">
                    No pricing rules configured. Click "Add {type === 'BEDROOM' ? 'Bedroom' : type === 'BATHROOM' ? 'Bathroom' : 'Add-on'}" to get started.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        {/* Three table skeletons for bedrooms, bathrooms, addons */}
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="p-6">
            <div className="flex items-center justify-between mb-4">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-9 w-32" />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    {Array.from({ length: 8 }).map((_, j) => (
                      <th key={j} className="px-4 py-3">
                        <Skeleton className="h-4 w-20" />
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: 3 }).map((_, k) => (
                    <SkeletonTableRow key={k} columns={8} />
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Pricing Configuration</h2>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Configure your pricing for bedrooms, bathrooms, and add-on services
        </p>
      </div>

      {renderTable(bedroomRules, 'BEDROOM', isAddingBedroom, startAddingBedroom)}
      {renderTable(bathroomRules, 'BATHROOM', isAddingBathroom, startAddingBathroom)}
      {renderTable(addonRules, 'ADDON', isAddingAddon, startAddingAddon)}
    </div>
  );
}

// Operations Tab Component (extracted from /settings/operations/page.tsx)
function OperationsTabContent() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [expenses, setExpenses] = useState({
    insuranceCost: 0,
    bondCost: 0,
    workersCompCost: 0,
    cleaningSuppliesCost: 0,
    gasReimbursementRate: 0,
    vaAdminSalary: 0,
    ownerSalary: 0,
    otherExpenses: 0,
  });

  useEffect(() => {
    fetchExpenses();
  }, []);

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/company/operations');
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.data) {
          setExpenses({
            insuranceCost: data.data.insuranceCost || 0,
            bondCost: data.data.bondCost || 0,
            workersCompCost: data.data.workersCompCost || 0,
            cleaningSuppliesCost: data.data.cleaningSuppliesCost || 0,
            gasReimbursementRate: data.data.gasReimbursementRate || 0,
            vaAdminSalary: data.data.vaAdminSalary || 0,
            ownerSalary: data.data.ownerSalary || 0,
            otherExpenses: data.data.otherExpenses || 0,
          });
        }
      }
    } catch (error) {
      console.error('Failed to fetch expenses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch('/api/company/operations', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(expenses),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setMessage({ type: 'success', text: 'Operational expenses saved successfully!' });
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to save expenses' });
      }
    } catch (error) {
      console.error('Failed to save expenses:', error);
      setMessage({ type: 'error', text: 'Failed to save expenses' });
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field: keyof typeof expenses, value: string) => {
    const numValue = parseFloat(value) || 0;
    setExpenses((prev) => ({ ...prev, [field]: numValue }));
  };

  const totalMonthlyExpenses =
    expenses.insuranceCost +
    expenses.bondCost +
    expenses.workersCompCost +
    expenses.cleaningSuppliesCost +
    expenses.vaAdminSalary +
    expenses.ownerSalary +
    expenses.otherExpenses;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-72" />
          <Skeleton className="h-4 w-96" />
        </div>
        <Card className="p-6">
          <div className="space-y-2 mb-4">
            <Skeleton className="h-6 w-64" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <SkeletonFormField key={i} />
            ))}
          </div>
        </Card>
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <Skeleton className="h-4 w-56" />
              <Skeleton className="h-3 w-48" />
            </div>
            <Skeleton className="h-10 w-32" />
          </div>
        </Card>
        <div className="flex justify-end">
          <Skeleton className="h-10 w-40" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Operational Expenses</h2>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Configure your monthly business expenses for accurate profit tracking
        </p>
      </div>

      {message && (
        <div
          className={`p-4 rounded-lg flex items-center gap-2 ${
            message.type === 'success'
              ? 'bg-green-50 text-green-700 border border-green-200 dark:bg-green-900/20 dark:border-green-700 dark:text-green-300'
              : 'bg-red-50 text-red-700 border border-red-200 dark:bg-red-900/20 dark:border-red-700 dark:text-red-300'
          }`}
        >
          {message.type === 'success' ? (
            <DollarSign className="h-5 w-5" />
          ) : (
            <AlertCircle className="h-5 w-5" />
          )}
          {message.text}
        </div>
      )}

      <Card className="p-6">
        <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-blue-600" />
          Monthly Fixed Expenses
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Insurance (Monthly)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
              <input
                type="number"
                value={expenses.insuranceCost}
                onChange={(e) => handleInputChange('insuranceCost', e.target.value)}
                className="pl-7 w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                placeholder="0.00"
                step="0.01"
                min="0"
              />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Business liability insurance</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Bond (Monthly)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
              <input
                type="number"
                value={expenses.bondCost}
                onChange={(e) => handleInputChange('bondCost', e.target.value)}
                className="pl-7 w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                placeholder="0.00"
                step="0.01"
                min="0"
              />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Surety bond cost</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Workers Compensation (Monthly)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
              <input
                type="number"
                value={expenses.workersCompCost}
                onChange={(e) => handleInputChange('workersCompCost', e.target.value)}
                className="pl-7 w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                placeholder="0.00"
                step="0.01"
                min="0"
              />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Workers comp insurance</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Cleaning Supplies (Monthly)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
              <input
                type="number"
                value={expenses.cleaningSuppliesCost}
                onChange={(e) => handleInputChange('cleaningSuppliesCost', e.target.value)}
                className="pl-7 w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                placeholder="0.00"
                step="0.01"
                min="0"
              />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Equipment & supplies</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              VA/Admin Salary (Monthly)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
              <input
                type="number"
                value={expenses.vaAdminSalary}
                onChange={(e) => handleInputChange('vaAdminSalary', e.target.value)}
                className="pl-7 w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                placeholder="0.00"
                step="0.01"
                min="0"
              />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Administrative staff salary</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Owner Salary (Monthly)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
              <input
                type="number"
                value={expenses.ownerSalary}
                onChange={(e) => handleInputChange('ownerSalary', e.target.value)}
                className="pl-7 w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                placeholder="0.00"
                step="0.01"
                min="0"
              />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Owner compensation</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Gas Reimbursement Rate
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
              <input
                type="number"
                value={expenses.gasReimbursementRate}
                onChange={(e) => handleInputChange('gasReimbursementRate', e.target.value)}
                className="pl-7 w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                placeholder="0.00"
                step="0.01"
                min="0"
              />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Per mile or per job</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Other Expenses (Monthly)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
              <input
                type="number"
                value={expenses.otherExpenses}
                onChange={(e) => handleInputChange('otherExpenses', e.target.value)}
                className="pl-7 w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                placeholder="0.00"
                step="0.01"
                min="0"
              />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Miscellaneous costs</p>
          </div>
        </div>
      </Card>

      <Card className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-2 border-blue-200 dark:border-blue-700">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Total Monthly Operational Expenses
            </h3>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Excludes gas reimbursement (calculated per job)
            </p>
          </div>
          <div className="text-3xl font-bold text-blue-700 dark:text-blue-300">
            ${totalMonthlyExpenses.toFixed(2)}
          </div>
        </div>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Saving...' : 'Save Expenses'}
        </Button>
      </div>

      <Card className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-700">
        <div className="flex gap-3">
          <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-yellow-800 dark:text-yellow-200">
            <p className="font-medium mb-1">How this affects profit calculations:</p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>These expenses are used for financial reporting and profit analysis</li>
              <li>Monthly expenses are distributed across all jobs in that month</li>
              <li>Gas reimbursement is calculated per job based on distance or fixed rate</li>
              <li>Only owners can see the full profit breakdown</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
}

// Referral Tab Component (extracted from /settings/referral/page.tsx)
function ReferralTabContent() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    referralEnabled: false,
    referralReferrerReward: 25,
    referralRefereeReward: 25,
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/company/referral-settings');
      const data = await response.json();

      if (data.success) {
        setSettings(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch referral settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const response = await fetch('/api/company/referral-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      const data = await response.json();

      if (data.success) {
        alert('✅ Referral settings saved successfully!');
      } else {
        alert(`❌ ${data.error || 'Failed to save settings'}`);
      }
    } catch (error) {
      alert('An error occurred. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-4 w-96" />
        </div>
        <Card className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1 space-y-2">
              <Skeleton className="h-6 w-64" />
              <Skeleton className="h-4 w-full" />
            </div>
            <Skeleton className="w-14 h-7 rounded-full" />
          </div>
        </Card>
        <Card className="p-6">
          <Skeleton className="h-6 w-48 mb-4" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <SkeletonFormField />
            <SkeletonFormField />
          </div>
          <div className="mt-6 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <Skeleton className="h-5 w-32 mb-2" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </div>
        </Card>
        <Card className="p-6">
          <Skeleton className="h-6 w-64 mb-3" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
          </div>
        </Card>
        <div className="flex justify-end">
          <Skeleton className="h-10 w-40" />
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Referral Program</h2>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Configure your customer referral program to grow through word-of-mouth
        </p>
      </div>

      <Card className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="text-xl font-semibold mb-2 flex items-center gap-2">
              <Gift className="h-5 w-5 text-purple-600" />
              Enable Referral Program
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Allow customers to refer friends and earn rewards. When enabled, customers will see their unique referral code and can track referrals.
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer ml-4">
            <input
              type="checkbox"
              checked={settings.referralEnabled}
              onChange={(e) => setSettings({ ...settings, referralEnabled: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-14 h-7 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-purple-600"></div>
          </label>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-green-600" />
          Reward Amounts
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Reward for Referrer
            </label>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</div>
              <Input
                type="number"
                value={settings.referralReferrerReward}
                onChange={(e) => setSettings({ ...settings, referralReferrerReward: parseFloat(e.target.value) || 0 })}
                className="pl-7"
                min="0"
                step="0.01"
                placeholder="25.00"
              />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Credit given to existing customer who refers a friend
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Reward for New Customer
            </label>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</div>
              <Input
                type="number"
                value={settings.referralRefereeReward}
                onChange={(e) => setSettings({ ...settings, referralRefereeReward: parseFloat(e.target.value) || 0 })}
                className="pl-7"
                min="0"
                step="0.01"
                placeholder="25.00"
              />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Credit given to the new customer being referred
            </p>
          </div>
        </div>

        <div className="mt-6 p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700 rounded-lg">
          <h4 className="font-semibold text-purple-900 dark:text-purple-100 mb-2 flex items-center gap-2">
            <Users className="h-4 w-4" />
            How It Works
          </h4>
          <div className="text-sm text-purple-800 dark:text-purple-200 space-y-1">
            <p>
              1. <strong>Sarah</strong> (existing customer) shares her referral code with <strong>John</strong>
            </p>
            <p>
              2. <strong>John</strong> signs up using Sarah's code
            </p>
            <p>
              3. <strong>Sarah</strong> gets <span className="font-bold">${settings.referralReferrerReward.toFixed(2)} credit</span> added to her account
            </p>
            <p>
              4. <strong>John</strong> gets <span className="font-bold">${settings.referralRefereeReward.toFixed(2)} credit</span> off his first booking
            </p>
          </div>
        </div>
      </Card>

      <Card className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-2 border-blue-200 dark:border-blue-700">
        <h3 className="text-xl font-semibold mb-3 flex items-center gap-2 text-blue-900 dark:text-blue-100">
          <TrendingUp className="h-5 w-5" />
          Benefits of Referral Program
        </h3>
        <ul className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
          <li className="flex items-start gap-2">
            <span className="text-green-600 mt-0.5">✓</span>
            <span><strong>Lower acquisition cost:</strong> Referred customers cost less than paid ads</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-600 mt-0.5">✓</span>
            <span><strong>Higher trust:</strong> People trust recommendations from friends</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-600 mt-0.5">✓</span>
            <span><strong>Better retention:</strong> Referred customers tend to stay longer</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-600 mt-0.5">✓</span>
            <span><strong>Automatic marketing:</strong> Your happy customers become your sales team</span>
          </li>
        </ul>
      </Card>

      <div className="flex justify-end">
        <Button
          type="submit"
          disabled={saving}
          className="bg-purple-600 hover:bg-purple-700"
        >
          <Save className="h-5 w-5 mr-2" />
          {saving ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>
    </form>
  );
}

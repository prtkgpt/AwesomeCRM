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
  Download,
  FileText,
  CheckCircle,
  XCircle,
  AlertCircle,
} from 'lucide-react';

type TabType = 'profile' | 'security' | 'company' | 'preferences' | 'about' | 'import';

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
      csvContent = `clientEmail,date,serviceType,status,price\njohn@example.com,2026-01-15,Regular Cleaning,SCHEDULED,150\njane@example.com,2026-01-16,Deep Cleaning,SCHEDULED,300`;
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
                      <p><strong>Valid statuses:</strong> SCHEDULED, IN_PROGRESS, COMPLETED, CANCELLED</p>
                      <p className="text-xs mt-2">Note: Client must exist before importing their bookings.</p>
                    </div>
                  )}
                </div>

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

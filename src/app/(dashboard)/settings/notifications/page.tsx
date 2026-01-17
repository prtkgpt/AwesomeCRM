'use client';

import { useState, useEffect } from 'react';
import { Bell, Mail, MessageSquare, Clock, Save, AlertCircle, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

interface NotificationSettings {
  // Customer notifications
  customerBookingConfirmation: boolean;
  customerBookingReminder: boolean;
  customerReminderHours: number;
  customerMorningOfReminder: boolean;
  customerMorningOfTime: string;
  customerJobComplete: boolean;
  customerReviewRequest: boolean;
  customerPaymentReceipt: boolean;
  customerUpcomingRecurring: boolean;

  // Cleaner notifications
  cleanerNewAssignment: boolean;
  cleanerJobReminder: boolean;
  cleanerReminderHours: number;
  cleanerScheduleChange: boolean;
  cleanerPaymentSent: boolean;

  // Admin notifications
  adminNewBooking: boolean;
  adminCancellation: boolean;
  adminLowInventory: boolean;
  adminNewReview: boolean;
  adminPaymentReceived: boolean;
  adminDailyReport: boolean;
  adminDailyReportTime: string;

  // Channels
  enableSms: boolean;
  enableEmail: boolean;
  enablePush: boolean;
}

interface NotificationTemplate {
  id: string;
  type: string;
  name: string;
  subject?: string;
  body: string;
  channel: 'EMAIL' | 'SMS' | 'BOTH';
}

const defaultTemplates: NotificationTemplate[] = [
  {
    id: '1',
    type: 'BOOKING_CONFIRMATION',
    name: 'Booking Confirmation',
    subject: 'Your cleaning is confirmed!',
    body: 'Hi {customerName}, your cleaning is confirmed for {date} at {time}. Your cleaner will be {cleanerName}. See you then!',
    channel: 'BOTH',
  },
  {
    id: '2',
    type: 'BOOKING_REMINDER',
    name: 'Booking Reminder',
    subject: 'Reminder: Cleaning tomorrow',
    body: 'Hi {customerName}, just a reminder that your cleaning is scheduled for tomorrow at {time}. Please ensure access to your home.',
    channel: 'BOTH',
  },
  {
    id: '3',
    type: 'ON_MY_WAY',
    name: 'Cleaner On The Way',
    body: 'Hi {customerName}, your cleaner {cleanerName} is on the way and will arrive in approximately {eta} minutes.',
    channel: 'SMS',
  },
  {
    id: '4',
    type: 'JOB_COMPLETE',
    name: 'Job Complete',
    subject: 'Your cleaning is complete!',
    body: 'Hi {customerName}, your cleaning has been completed. We hope everything looks great! Please let us know if you have any feedback.',
    channel: 'BOTH',
  },
  {
    id: '5',
    type: 'REVIEW_REQUEST',
    name: 'Review Request',
    subject: 'How did we do?',
    body: 'Hi {customerName}, thank you for choosing us! We\'d love your feedback. Please take a moment to leave us a review: {reviewLink}',
    channel: 'EMAIL',
  },
  {
    id: '6',
    type: 'PAYMENT_RECEIPT',
    name: 'Payment Receipt',
    subject: 'Payment Receipt - {invoiceNumber}',
    body: 'Hi {customerName}, we\'ve received your payment of ${amount}. Thank you for your business!',
    channel: 'EMAIL',
  },
];

export default function NotificationSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState('settings');

  const [settings, setSettings] = useState<NotificationSettings>({
    customerBookingConfirmation: true,
    customerBookingReminder: true,
    customerReminderHours: 24,
    customerMorningOfReminder: true,
    customerMorningOfTime: '08:00',
    customerJobComplete: true,
    customerReviewRequest: true,
    customerPaymentReceipt: true,
    customerUpcomingRecurring: true,
    cleanerNewAssignment: true,
    cleanerJobReminder: true,
    cleanerReminderHours: 12,
    cleanerScheduleChange: true,
    cleanerPaymentSent: true,
    adminNewBooking: true,
    adminCancellation: true,
    adminLowInventory: true,
    adminNewReview: true,
    adminPaymentReceived: false,
    adminDailyReport: true,
    adminDailyReportTime: '18:00',
    enableSms: true,
    enableEmail: true,
    enablePush: false,
  });

  const [templates, setTemplates] = useState<NotificationTemplate[]>(defaultTemplates);
  const [editingTemplate, setEditingTemplate] = useState<NotificationTemplate | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/company/settings');
      const data = await res.json();
      if (data.success && data.data) {
        // Map company settings to notification settings
        setSettings(prev => ({
          ...prev,
          customerBookingReminder: data.data.enableCustomerReminders ?? true,
          customerReminderHours: data.data.customerReminderHours ?? 24,
          customerMorningOfReminder: data.data.enableMorningOfReminder ?? true,
          customerMorningOfTime: data.data.morningOfReminderTime ?? '08:00',
          cleanerJobReminder: data.data.enableCleanerReminders ?? true,
          cleanerReminderHours: data.data.cleanerReminderHours ?? 12,
        }));
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/company/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enableCustomerReminders: settings.customerBookingReminder,
          customerReminderHours: settings.customerReminderHours,
          enableMorningOfReminder: settings.customerMorningOfReminder,
          morningOfReminderTime: settings.customerMorningOfTime,
          enableCleanerReminders: settings.cleanerJobReminder,
          cleanerReminderHours: settings.cleanerReminderHours,
        }),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch (error) {
      console.error('Failed to save:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveTemplate = (template: NotificationTemplate) => {
    setTemplates(prev => prev.map(t => t.id === template.id ? template : t));
    setEditingTemplate(null);
  };

  const NotificationToggle = ({
    label,
    description,
    checked,
    onChange,
    disabled = false,
  }: {
    label: string;
    description?: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
    disabled?: boolean;
  }) => (
    <div className="flex items-start justify-between py-3">
      <div>
        <p className="font-medium text-gray-900 dark:text-white">{label}</p>
        {description && <p className="text-sm text-gray-500">{description}</p>}
      </div>
      <button
        onClick={() => !disabled && onChange(!checked)}
        disabled={disabled}
        className={cn(
          'relative w-12 h-6 rounded-full transition-colors',
          checked ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        <span
          className={cn(
            'absolute top-1 w-4 h-4 bg-white rounded-full transition-transform',
            checked ? 'left-7' : 'left-1'
          )}
        />
      </button>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Notification Settings</h1>
          <p className="text-gray-500 dark:text-gray-400">Configure how and when notifications are sent</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors',
            saved
              ? 'bg-green-600 text-white'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          )}
        >
          {saving ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Saving...
            </>
          ) : saved ? (
            <>
              <CheckCircle className="w-4 h-4" />
              Saved!
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Save Changes
            </>
          )}
        </button>
      </div>

      <Tabs defaultValue="settings" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
        </TabsList>

        {/* Settings Tab */}
        <TabsContent value="settings">
          <div className="space-y-6">
            {/* Channels */}
            <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Notification Channels</h2>
              <div className="grid grid-cols-3 gap-4">
                <div
                  onClick={() => setSettings({ ...settings, enableEmail: !settings.enableEmail })}
                  className={cn(
                    'p-4 rounded-lg border-2 cursor-pointer transition-colors',
                    settings.enableEmail
                      ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700'
                  )}
                >
                  <Mail className={cn('w-6 h-6 mb-2', settings.enableEmail ? 'text-blue-600' : 'text-gray-400')} />
                  <p className="font-medium">Email</p>
                  <p className="text-sm text-gray-500">Transactional emails</p>
                </div>
                <div
                  onClick={() => setSettings({ ...settings, enableSms: !settings.enableSms })}
                  className={cn(
                    'p-4 rounded-lg border-2 cursor-pointer transition-colors',
                    settings.enableSms
                      ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700'
                  )}
                >
                  <MessageSquare className={cn('w-6 h-6 mb-2', settings.enableSms ? 'text-blue-600' : 'text-gray-400')} />
                  <p className="font-medium">SMS</p>
                  <p className="text-sm text-gray-500">Text messages</p>
                </div>
                <div
                  onClick={() => setSettings({ ...settings, enablePush: !settings.enablePush })}
                  className={cn(
                    'p-4 rounded-lg border-2 cursor-pointer transition-colors',
                    settings.enablePush
                      ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700'
                  )}
                >
                  <Bell className={cn('w-6 h-6 mb-2', settings.enablePush ? 'text-blue-600' : 'text-gray-400')} />
                  <p className="font-medium">Push</p>
                  <p className="text-sm text-gray-500">App notifications</p>
                </div>
              </div>
            </div>

            {/* Customer Notifications */}
            <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Customer Notifications</h2>
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                <NotificationToggle
                  label="Booking Confirmation"
                  description="Send confirmation when a booking is created"
                  checked={settings.customerBookingConfirmation}
                  onChange={(checked) => setSettings({ ...settings, customerBookingConfirmation: checked })}
                />
                <NotificationToggle
                  label="Booking Reminder"
                  description="Remind customers before their appointment"
                  checked={settings.customerBookingReminder}
                  onChange={(checked) => setSettings({ ...settings, customerBookingReminder: checked })}
                />
                {settings.customerBookingReminder && (
                  <div className="py-3 pl-6">
                    <label className="block text-sm text-gray-600 dark:text-gray-400 mb-2">
                      Send reminder how many hours before?
                    </label>
                    <select
                      value={settings.customerReminderHours}
                      onChange={(e) => setSettings({ ...settings, customerReminderHours: parseInt(e.target.value) })}
                      className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900"
                    >
                      <option value={12}>12 hours</option>
                      <option value={24}>24 hours</option>
                      <option value={48}>48 hours</option>
                    </select>
                  </div>
                )}
                <NotificationToggle
                  label="Morning-of Reminder"
                  description="Send reminder on the morning of the appointment"
                  checked={settings.customerMorningOfReminder}
                  onChange={(checked) => setSettings({ ...settings, customerMorningOfReminder: checked })}
                />
                {settings.customerMorningOfReminder && (
                  <div className="py-3 pl-6">
                    <label className="block text-sm text-gray-600 dark:text-gray-400 mb-2">
                      Send morning reminder at:
                    </label>
                    <input
                      type="time"
                      value={settings.customerMorningOfTime}
                      onChange={(e) => setSettings({ ...settings, customerMorningOfTime: e.target.value })}
                      className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900"
                    />
                  </div>
                )}
                <NotificationToggle
                  label="Job Complete"
                  description="Notify when the cleaning is finished"
                  checked={settings.customerJobComplete}
                  onChange={(checked) => setSettings({ ...settings, customerJobComplete: checked })}
                />
                <NotificationToggle
                  label="Review Request"
                  description="Ask for a review after job completion"
                  checked={settings.customerReviewRequest}
                  onChange={(checked) => setSettings({ ...settings, customerReviewRequest: checked })}
                />
                <NotificationToggle
                  label="Payment Receipt"
                  description="Send receipt when payment is received"
                  checked={settings.customerPaymentReceipt}
                  onChange={(checked) => setSettings({ ...settings, customerPaymentReceipt: checked })}
                />
              </div>
            </div>

            {/* Cleaner Notifications */}
            <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Cleaner Notifications</h2>
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                <NotificationToggle
                  label="New Assignment"
                  description="Notify when assigned to a new job"
                  checked={settings.cleanerNewAssignment}
                  onChange={(checked) => setSettings({ ...settings, cleanerNewAssignment: checked })}
                />
                <NotificationToggle
                  label="Job Reminder"
                  description="Remind cleaners before their appointments"
                  checked={settings.cleanerJobReminder}
                  onChange={(checked) => setSettings({ ...settings, cleanerJobReminder: checked })}
                />
                {settings.cleanerJobReminder && (
                  <div className="py-3 pl-6">
                    <label className="block text-sm text-gray-600 dark:text-gray-400 mb-2">
                      Send reminder how many hours before?
                    </label>
                    <select
                      value={settings.cleanerReminderHours}
                      onChange={(e) => setSettings({ ...settings, cleanerReminderHours: parseInt(e.target.value) })}
                      className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900"
                    >
                      <option value={2}>2 hours</option>
                      <option value={6}>6 hours</option>
                      <option value={12}>12 hours</option>
                      <option value={24}>24 hours</option>
                    </select>
                  </div>
                )}
                <NotificationToggle
                  label="Schedule Changes"
                  description="Notify about cancellations or rescheduling"
                  checked={settings.cleanerScheduleChange}
                  onChange={(checked) => setSettings({ ...settings, cleanerScheduleChange: checked })}
                />
                <NotificationToggle
                  label="Payment Sent"
                  description="Notify when payment is processed"
                  checked={settings.cleanerPaymentSent}
                  onChange={(checked) => setSettings({ ...settings, cleanerPaymentSent: checked })}
                />
              </div>
            </div>

            {/* Admin Notifications */}
            <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Admin Notifications</h2>
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                <NotificationToggle
                  label="New Booking"
                  description="Get notified about new bookings"
                  checked={settings.adminNewBooking}
                  onChange={(checked) => setSettings({ ...settings, adminNewBooking: checked })}
                />
                <NotificationToggle
                  label="Cancellations"
                  description="Get notified when bookings are cancelled"
                  checked={settings.adminCancellation}
                  onChange={(checked) => setSettings({ ...settings, adminCancellation: checked })}
                />
                <NotificationToggle
                  label="Low Inventory"
                  description="Alert when inventory items are low"
                  checked={settings.adminLowInventory}
                  onChange={(checked) => setSettings({ ...settings, adminLowInventory: checked })}
                />
                <NotificationToggle
                  label="New Reviews"
                  description="Get notified about new customer reviews"
                  checked={settings.adminNewReview}
                  onChange={(checked) => setSettings({ ...settings, adminNewReview: checked })}
                />
                <NotificationToggle
                  label="Daily Report"
                  description="Receive daily summary email"
                  checked={settings.adminDailyReport}
                  onChange={(checked) => setSettings({ ...settings, adminDailyReport: checked })}
                />
                {settings.adminDailyReport && (
                  <div className="py-3 pl-6">
                    <label className="block text-sm text-gray-600 dark:text-gray-400 mb-2">
                      Send daily report at:
                    </label>
                    <input
                      type="time"
                      value={settings.adminDailyReportTime}
                      onChange={(e) => setSettings({ ...settings, adminDailyReportTime: e.target.value })}
                      className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates">
          <div className="space-y-4">
            {templates.map(template => (
              <div
                key={template.id}
                className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4"
              >
                {editingTemplate?.id === template.id ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
                      <input
                        type="text"
                        value={editingTemplate.name}
                        onChange={(e) => setEditingTemplate({ ...editingTemplate, name: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900"
                      />
                    </div>
                    {editingTemplate.subject !== undefined && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Subject (Email)</label>
                        <input
                          type="text"
                          value={editingTemplate.subject}
                          onChange={(e) => setEditingTemplate({ ...editingTemplate, subject: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900"
                        />
                      </div>
                    )}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Message Body</label>
                      <textarea
                        value={editingTemplate.body}
                        onChange={(e) => setEditingTemplate({ ...editingTemplate, body: e.target.value })}
                        rows={4}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900 resize-none"
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        Available variables: {'{customerName}'}, {'{cleanerName}'}, {'{date}'}, {'{time}'}, {'{amount}'}, {'{reviewLink}'}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSaveTemplate(editingTemplate)}
                        className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingTemplate(null)}
                        className="px-3 py-1.5 text-gray-700 dark:text-gray-300 text-sm rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium text-gray-900 dark:text-white">{template.name}</h3>
                        <span className={cn(
                          'text-xs px-2 py-0.5 rounded',
                          template.channel === 'EMAIL' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600' :
                          template.channel === 'SMS' ? 'bg-green-100 dark:bg-green-900/30 text-green-600' :
                          'bg-purple-100 dark:bg-purple-900/30 text-purple-600'
                        )}>
                          {template.channel}
                        </span>
                      </div>
                      {template.subject && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                          <span className="font-medium">Subject:</span> {template.subject}
                        </p>
                      )}
                      <p className="text-sm text-gray-500">{template.body}</p>
                    </div>
                    <button
                      onClick={() => setEditingTemplate(template)}
                      className="px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md"
                    >
                      Edit
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

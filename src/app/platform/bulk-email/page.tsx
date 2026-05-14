'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Mail, Send, CheckCircle, XCircle } from 'lucide-react';

const ALL_PLANS = ['FREE', 'BASIC', 'PRO'];
const ALL_STATUSES = ['ACTIVE', 'INACTIVE'];

interface SendResult {
  sent: number;
  failed: number;
}

export default function BulkEmailPage() {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [targetPlans, setTargetPlans] = useState<string[]>([]);
  const [targetStatuses, setTargetStatuses] = useState<string[]>([]);
  const [recipientCount, setRecipientCount] = useState<number | null>(null);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<SendResult | null>(null);
  const [error, setError] = useState('');
  const [statsData, setStatsData] = useState<any>(null);

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    computeRecipientCount();
  }, [targetPlans, targetStatuses, statsData]);

  async function fetchStats() {
    try {
      const res = await fetch('/api/platform/stats');
      const json = await res.json();
      if (json.success) {
        setStatsData(json.data);
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  }

  function computeRecipientCount() {
    if (!statsData) {
      setRecipientCount(null);
      return;
    }

    const revenue = statsData.revenue;
    if (!revenue) {
      setRecipientCount(statsData.totalCompanies || 0);
      return;
    }

    let count = 0;
    const hasPlanFilter = targetPlans.length > 0;

    if (!hasPlanFilter) {
      count = (revenue.paidCompanies || 0) + (revenue.freeCompanies || 0);
    } else {
      if (targetPlans.includes('FREE')) count += revenue.freeCompanies || 0;
      if (targetPlans.includes('BASIC') || targetPlans.includes('PRO')) {
        count += revenue.paidCompanies || 0;
      }
    }

    setRecipientCount(count);
  }

  function togglePlan(plan: string) {
    setTargetPlans((prev) =>
      prev.includes(plan) ? prev.filter((p) => p !== plan) : [...prev, plan]
    );
  }

  function toggleStatus(status: string) {
    setTargetStatuses((prev) =>
      prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status]
    );
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setResult(null);

    if (!subject.trim() || !message.trim()) {
      setError('Subject and message are required');
      return;
    }

    const confirmed = confirm(
      `Are you sure you want to send this email to ${recipientCount ?? 'all'} recipients?\n\nSubject: ${subject}`
    );
    if (!confirmed) return;

    setSending(true);
    try {
      const res = await fetch('/api/platform/bulk-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject,
          message,
          targetPlans: targetPlans.length > 0 ? targetPlans : undefined,
          targetStatuses: targetStatuses.length > 0 ? targetStatuses : undefined,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setResult(json.data || { sent: recipientCount || 0, failed: 0 });
        setSubject('');
        setMessage('');
        setTargetPlans([]);
        setTargetStatuses([]);
      } else {
        setError(json.error || 'Failed to send emails');
      }
    } catch (err) {
      setError('An error occurred while sending');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Bulk Email</h1>

      {error && (
        <div className="bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400 text-sm p-3 rounded-lg border border-red-200 dark:border-red-800">
          {error}
        </div>
      )}

      {result && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <CheckCircle className="h-6 w-6 text-green-600" />
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Email send complete</p>
                <p className="text-sm text-gray-500 mt-0.5">
                  <span className="text-green-600 font-medium">{result.sent} sent</span>
                  {result.failed > 0 && (
                    <span className="text-red-600 font-medium ml-3">{result.failed} failed</span>
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Compose Email</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSend} className="space-y-4">
            <div>
              <Label htmlFor="subject">Subject *</Label>
              <Input
                id="subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Important platform update"
                required
              />
            </div>

            <div>
              <Label htmlFor="message">Message *</Label>
              <textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Write your email message here..."
                required
                rows={8}
                className="w-full rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Target Plans</Label>
                <div className="flex gap-3 mt-1">
                  {ALL_PLANS.map((plan) => (
                    <label key={plan} className="flex items-center gap-1.5 text-sm">
                      <input
                        type="checkbox"
                        checked={targetPlans.includes(plan)}
                        onChange={() => togglePlan(plan)}
                        className="rounded border-gray-300"
                      />
                      {plan}
                    </label>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-1">Leave empty to target all plans</p>
              </div>

              <div>
                <Label>Target Status</Label>
                <div className="flex gap-3 mt-1">
                  {ALL_STATUSES.map((status) => (
                    <label key={status} className="flex items-center gap-1.5 text-sm">
                      <input
                        type="checkbox"
                        checked={targetStatuses.includes(status)}
                        onChange={() => toggleStatus(status)}
                        className="rounded border-gray-300"
                      />
                      {status}
                    </label>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-1">Leave empty to target all statuses</p>
              </div>
            </div>

            {/* Preview */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-blue-600" />
                <p className="text-sm text-blue-700 dark:text-blue-400">
                  {recipientCount !== null
                    ? `This email will be sent to approximately ${recipientCount} recipient${recipientCount === 1 ? '' : 's'}`
                    : 'Loading recipient count...'}
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button type="submit" disabled={sending}>
                {sending ? (
                  'Sending...'
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-1" /> Send Email
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

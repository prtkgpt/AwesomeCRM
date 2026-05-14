'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LifeBuoy, Plus, X, ChevronDown, ChevronUp } from 'lucide-react';

interface Ticket {
  id: string;
  subject: string;
  message: string;
  priority: string;
  status: string;
  adminNotes: string | null;
  resolution: string | null;
  createdAt: string;
  updatedAt: string;
}

function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin} minute${diffMin === 1 ? '' : 's'} ago`;
  const diffHrs = Math.floor(diffMin / 60);
  if (diffHrs < 24) return `${diffHrs} hour${diffHrs === 1 ? '' : 's'} ago`;
  const diffDays = Math.floor(diffHrs / 24);
  if (diffDays < 30) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
  return new Date(dateStr).toLocaleDateString();
}

function statusBadgeColor(status: string): string {
  switch (status.toLowerCase().replace(' ', '_')) {
    case 'open':
      return 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
    case 'in_progress':
      return 'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
    case 'resolved':
      return 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400';
    case 'closed':
      return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400';
    default:
      return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400';
  }
}

function priorityBadgeColor(priority: string): string {
  switch (priority.toLowerCase()) {
    case 'low':
      return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400';
    case 'normal':
      return 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
    case 'high':
      return 'bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400';
    case 'urgent':
      return 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400';
    default:
      return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400';
  }
}

function formatStatus(status: string): string {
  return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

const PRIORITY_OPTIONS = ['low', 'normal', 'high', 'urgent'];

export default function SupportPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [priority, setPriority] = useState('normal');
  const [submitting, setSubmitting] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchTickets();
  }, []);

  async function fetchTickets() {
    try {
      const res = await fetch('/api/tickets');
      const json = await res.json();
      if (json.success) {
        setTickets(json.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch tickets:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);

    try {
      const res = await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, message, priority }),
      });
      const json = await res.json();

      if (json.success) {
        setSuccess('Ticket submitted successfully');
        setSubject('');
        setMessage('');
        setPriority('normal');
        setShowForm(false);
        fetchTickets();
      } else {
        setError(json.error || 'Failed to submit ticket');
      }
    } catch (err) {
      setError('An error occurred');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Support</h1>
        <Button
          onClick={() => {
            if (showForm) {
              setShowForm(false);
            } else {
              setShowForm(true);
              setError('');
              setSuccess('');
            }
          }}
          size="sm"
        >
          {showForm ? (
            <>
              <X className="h-4 w-4 mr-1" /> Cancel
            </>
          ) : (
            <>
              <Plus className="h-4 w-4 mr-1" /> New Ticket
            </>
          )}
        </Button>
      </div>

      {success && (
        <div className="bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400 text-sm p-3 rounded-lg border border-green-200 dark:border-green-800">
          {success}
        </div>
      )}
      {error && (
        <div className="bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400 text-sm p-3 rounded-lg border border-red-200 dark:border-red-800">
          {error}
        </div>
      )}

      {/* Submit Form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Submit a Support Ticket</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="ticket-subject">Subject *</Label>
                <Input
                  id="ticket-subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Brief description of your issue"
                  required
                />
              </div>
              <div>
                <Label htmlFor="ticket-message">Message *</Label>
                <textarea
                  id="ticket-message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Describe your issue in detail..."
                  required
                  rows={5}
                  className="w-full rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <Label htmlFor="ticket-priority">Priority</Label>
                <select
                  id="ticket-priority"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full h-9 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 text-sm"
                >
                  {PRIORITY_OPTIONS.map((p) => (
                    <option key={p} value={p}>
                      {p.charAt(0).toUpperCase() + p.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="ghost" size="sm" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={submitting}>
                  {submitting ? 'Submitting...' : 'Submit Ticket'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Tickets List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="h-12 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : tickets.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <LifeBuoy className="h-8 w-8 mx-auto text-gray-400 mb-2" />
            <p className="text-gray-500">No support tickets yet</p>
            <p className="text-sm text-gray-400 mt-1">Click &quot;New Ticket&quot; to submit a request</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {tickets.map((ticket) => (
            <Card key={ticket.id}>
              <CardContent className="p-4">
                <button
                  onClick={() => setExpandedId(expandedId === ticket.id ? null : ticket.id)}
                  className="w-full text-left"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-medium text-gray-900 dark:text-white">{ticket.subject}</h3>
                        <span className={`inline-block px-2 py-0.5 text-xs rounded-full ${statusBadgeColor(ticket.status)}`}>
                          {formatStatus(ticket.status)}
                        </span>
                        <span className={`inline-block px-2 py-0.5 text-xs rounded-full ${priorityBadgeColor(ticket.priority)}`}>
                          {ticket.priority}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">{relativeTime(ticket.createdAt)}</p>
                    </div>
                    {expandedId === ticket.id ? (
                      <ChevronUp className="h-4 w-4 text-gray-400 shrink-0 ml-2" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-gray-400 shrink-0 ml-2" />
                    )}
                  </div>
                </button>

                {expandedId === ticket.id && (
                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 space-y-3">
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-1">Your Message</p>
                      <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                        {ticket.message}
                      </p>
                    </div>

                    {ticket.resolution && (
                      <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
                        <p className="text-xs font-medium text-green-700 dark:text-green-400 mb-1">Resolution</p>
                        <p className="text-sm text-green-800 dark:text-green-300 whitespace-pre-wrap">
                          {ticket.resolution}
                        </p>
                      </div>
                    )}

                    {ticket.adminNotes && (
                      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                        <p className="text-xs font-medium text-blue-700 dark:text-blue-400 mb-1">Admin Notes</p>
                        <p className="text-sm text-blue-800 dark:text-blue-300 whitespace-pre-wrap">
                          {ticket.adminNotes}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

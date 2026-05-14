'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { LifeBuoy, ChevronDown, ChevronUp } from 'lucide-react';

interface Ticket {
  id: string;
  subject: string;
  message: string;
  priority: string;
  status: string;
  companyName: string;
  userName: string;
  assignedTo: string | null;
  adminNotes: string | null;
  resolution: string | null;
  createdAt: string;
  updatedAt: string;
}

interface TicketStats {
  open: number;
  inProgress: number;
  resolvedThisWeek: number;
}

function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHrs = Math.floor(diffMin / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  const diffDays = Math.floor(diffHrs / 24);
  if (diffDays < 30) return `${diffDays}d ago`;
  return new Date(dateStr).toLocaleDateString();
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

function formatStatus(status: string): string {
  return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

const STATUS_OPTIONS = ['All', 'open', 'in_progress', 'resolved', 'closed'];
const PRIORITY_OPTIONS = ['All', 'low', 'normal', 'high', 'urgent'];

export default function PlatformTicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [stats, setStats] = useState<TicketStats>({ open: 0, inProgress: 0, resolvedThisWeek: 0 });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editData, setEditData] = useState<{
    adminNotes: string;
    resolution: string;
    status: string;
    priority: string;
  }>({ adminNotes: '', resolution: '', status: '', priority: '' });
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetchTickets();
  }, [statusFilter, priorityFilter]);

  async function fetchTickets() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'All') params.set('status', statusFilter);
      if (priorityFilter !== 'All') params.set('priority', priorityFilter);

      const res = await fetch(`/api/platform/tickets?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setTickets(json.data.tickets || json.data || []);
        if (json.data.stats) {
          setStats(json.data.stats);
        } else {
          // Compute stats from tickets
          const all = json.data.tickets || json.data || [];
          const now = new Date();
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          setStats({
            open: all.filter((t: Ticket) => t.status === 'open').length,
            inProgress: all.filter((t: Ticket) => t.status === 'in_progress').length,
            resolvedThisWeek: all.filter(
              (t: Ticket) => t.status === 'resolved' && new Date(t.updatedAt) >= weekAgo
            ).length,
          });
        }
      }
    } catch (err) {
      console.error('Failed to fetch tickets:', err);
    } finally {
      setLoading(false);
    }
  }

  function toggleExpand(ticket: Ticket) {
    if (expandedId === ticket.id) {
      setExpandedId(null);
    } else {
      setExpandedId(ticket.id);
      setEditData({
        adminNotes: ticket.adminNotes || '',
        resolution: ticket.resolution || '',
        status: ticket.status,
        priority: ticket.priority,
      });
    }
    setSuccess('');
    setError('');
  }

  async function handleSave(ticketId: string) {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch(`/api/platform/tickets/${ticketId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editData),
      });
      const json = await res.json();
      if (json.success) {
        setSuccess('Ticket updated');
        fetchTickets();
      } else {
        setError(json.error || 'Failed to update ticket');
      }
    } catch (err) {
      setError('An error occurred');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Support Tickets</h1>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div>
              <p className="text-2xl font-bold text-blue-600">{stats.open}</p>
              <p className="text-xs text-gray-500">Open</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div>
              <p className="text-2xl font-bold text-yellow-600">{stats.inProgress}</p>
              <p className="text-xs text-gray-500">In Progress</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div>
              <p className="text-2xl font-bold text-green-600">{stats.resolvedThisWeek}</p>
              <p className="text-xs text-gray-500">Resolved This Week</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-9 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 text-sm"
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt === 'All' ? 'All' : formatStatus(opt)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Priority</label>
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="h-9 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 text-sm"
              >
                {PRIORITY_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt === 'All' ? 'All' : opt.charAt(0).toUpperCase() + opt.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tickets Table */}
      <Card>
        <CardContent className="p-4">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
              ))}
            </div>
          ) : tickets.length === 0 ? (
            <div className="text-center py-8">
              <LifeBuoy className="h-8 w-8 mx-auto text-gray-400 mb-2" />
              <p className="text-gray-500">No tickets found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <div className="min-w-[700px]">
                {/* Table Header */}
                <div className="grid grid-cols-6 gap-2 text-xs font-medium text-gray-500 uppercase tracking-wider pb-2 border-b border-gray-200 dark:border-gray-700">
                  <div className="col-span-2">Subject</div>
                  <div>Priority</div>
                  <div>Status</div>
                  <div>Created</div>
                  <div>Assigned To</div>
                </div>
                {/* Table Rows */}
                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                  {tickets.map((ticket) => (
                    <div key={ticket.id}>
                      <button
                        onClick={() => toggleExpand(ticket)}
                        className="w-full grid grid-cols-6 gap-2 items-center py-3 text-sm text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                      >
                        <div className="col-span-2">
                          <p className="font-medium text-gray-900 dark:text-white truncate">{ticket.subject}</p>
                          <p className="text-xs text-gray-500 truncate">{ticket.companyName}</p>
                        </div>
                        <div>
                          <span className={`inline-block px-2 py-0.5 text-xs rounded-full ${priorityBadgeColor(ticket.priority)}`}>
                            {ticket.priority}
                          </span>
                        </div>
                        <div>
                          <span className={`inline-block px-2 py-0.5 text-xs rounded-full ${statusBadgeColor(ticket.status)}`}>
                            {formatStatus(ticket.status)}
                          </span>
                        </div>
                        <div className="text-gray-500 text-xs">{relativeTime(ticket.createdAt)}</div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600 dark:text-gray-400 truncate">
                            {ticket.assignedTo || '-'}
                          </span>
                          {expandedId === ticket.id ? (
                            <ChevronUp className="h-4 w-4 text-gray-400 shrink-0" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" />
                          )}
                        </div>
                      </button>

                      {/* Expanded Detail */}
                      {expandedId === ticket.id && (
                        <div className="pb-4 pl-4 pr-4">
                          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 space-y-4">
                            <div>
                              <p className="text-xs font-medium text-gray-500 mb-1">Full Message</p>
                              <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                                {ticket.message}
                              </p>
                            </div>

                            {success && (
                              <div className="bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400 text-sm p-2 rounded border border-green-200 dark:border-green-800">
                                {success}
                              </div>
                            )}
                            {error && (
                              <div className="bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400 text-sm p-2 rounded border border-red-200 dark:border-red-800">
                                {error}
                              </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <Label>Status</Label>
                                <select
                                  value={editData.status}
                                  onChange={(e) => setEditData((prev) => ({ ...prev, status: e.target.value }))}
                                  className="w-full h-9 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 text-sm mt-1"
                                >
                                  {STATUS_OPTIONS.filter((s) => s !== 'All').map((s) => (
                                    <option key={s} value={s}>{formatStatus(s)}</option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <Label>Priority</Label>
                                <select
                                  value={editData.priority}
                                  onChange={(e) => setEditData((prev) => ({ ...prev, priority: e.target.value }))}
                                  className="w-full h-9 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 text-sm mt-1"
                                >
                                  {PRIORITY_OPTIONS.filter((p) => p !== 'All').map((p) => (
                                    <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                                  ))}
                                </select>
                              </div>
                            </div>

                            <div>
                              <Label>Admin Notes</Label>
                              <textarea
                                value={editData.adminNotes}
                                onChange={(e) => setEditData((prev) => ({ ...prev, adminNotes: e.target.value }))}
                                rows={3}
                                className="w-full rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm mt-1"
                                placeholder="Internal notes..."
                              />
                            </div>

                            <div>
                              <Label>Resolution</Label>
                              <textarea
                                value={editData.resolution}
                                onChange={(e) => setEditData((prev) => ({ ...prev, resolution: e.target.value }))}
                                rows={3}
                                className="w-full rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm mt-1"
                                placeholder="Resolution details (visible to submitter)..."
                              />
                            </div>

                            <div className="flex justify-end">
                              <Button size="sm" onClick={() => handleSave(ticket.id)} disabled={saving}>
                                {saving ? 'Saving...' : 'Save Changes'}
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

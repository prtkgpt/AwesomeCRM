'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollText } from 'lucide-react';

interface AuditEntry {
  id: string;
  userId: string;
  userName: string;
  action: string;
  entity: string;
  entityId: string;
  description: string;
  companyName: string;
  createdAt: string;
}

interface AuditResponse {
  entries: AuditEntry[];
  total: number;
  page: number;
  totalPages: number;
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

function actionBadgeColor(action: string): string {
  switch (action) {
    case 'CREATE':
      return 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400';
    case 'UPDATE':
      return 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
    case 'DELETE':
      return 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400';
    case 'LOGIN':
      return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400';
    case 'EXPORT':
      return 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
    default:
      return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400';
  }
}

const ENTITY_OPTIONS = ['All', 'Company', 'Client', 'Booking', 'User', 'Invoice'];
const ACTION_OPTIONS = ['All', 'CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'EXPORT'];

export default function AuditLogPage() {
  const [data, setData] = useState<AuditResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [entityFilter, setEntityFilter] = useState('All');
  const [actionFilter, setActionFilter] = useState('All');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    fetchData();
  }, [page, entityFilter, actionFilter, dateFrom, dateTo]);

  async function fetchData() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '50' });
      if (entityFilter !== 'All') params.set('entity', entityFilter);
      if (actionFilter !== 'All') params.set('action', actionFilter);
      if (dateFrom) params.set('from', dateFrom);
      if (dateTo) params.set('to', dateTo);

      const res = await fetch(`/api/platform/audit-log?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      } else {
        setData({ entries: [], total: 0, page: 1, totalPages: 1 });
      }
    } catch (err) {
      console.error('Failed to fetch audit log:', err);
      setData({ entries: [], total: 0, page: 1, totalPages: 1 });
    } finally {
      setLoading(false);
    }
  }

  function handleFilterChange() {
    setPage(1);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Audit Log</h1>

      {/* Filter Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Entity</label>
              <select
                value={entityFilter}
                onChange={(e) => { setEntityFilter(e.target.value); setPage(1); }}
                className="h-9 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 text-sm"
              >
                {ENTITY_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Action</label>
              <select
                value={actionFilter}
                onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
                className="h-9 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 text-sm"
              >
                {ACTION_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">From</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
                className="h-9 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">To</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
                className="h-9 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 text-sm"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-4">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-10 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
              ))}
            </div>
          ) : !data || data.entries.length === 0 ? (
            <div className="text-center py-8">
              <ScrollText className="h-8 w-8 mx-auto text-gray-400 mb-2" />
              <p className="text-gray-500">No audit log entries found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <div className="min-w-[800px]">
                {/* Table Header */}
                <div className="grid grid-cols-6 gap-2 text-xs font-medium text-gray-500 uppercase tracking-wider pb-2 border-b border-gray-200 dark:border-gray-700">
                  <div>Time</div>
                  <div>User</div>
                  <div>Action</div>
                  <div>Entity</div>
                  <div>Description</div>
                  <div>Company</div>
                </div>
                {/* Table Rows */}
                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                  {data.entries.map((entry) => (
                    <div
                      key={entry.id}
                      className="grid grid-cols-6 gap-2 items-center py-3 text-sm"
                    >
                      <div className="text-gray-500 text-xs">{relativeTime(entry.createdAt)}</div>
                      <div className="text-gray-900 dark:text-white font-medium truncate">{entry.userName}</div>
                      <div>
                        <span className={`inline-block px-2 py-0.5 text-xs rounded-full ${actionBadgeColor(entry.action)}`}>
                          {entry.action}
                        </span>
                      </div>
                      <div className="text-gray-600 dark:text-gray-400">{entry.entity}</div>
                      <div className="text-gray-600 dark:text-gray-400 truncate">{entry.description}</div>
                      <div className="text-gray-500 truncate">{entry.companyName}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Pagination */}
          {data && data.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-3 py-1.5 text-sm rounded-md border border-gray-200 dark:border-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                Previous
              </button>
              <span className="text-sm text-gray-500">
                Page {data.page} of {data.totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
                disabled={page >= data.totalPages}
                className="px-3 py-1.5 text-sm rounded-md border border-gray-200 dark:border-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                Next
              </button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

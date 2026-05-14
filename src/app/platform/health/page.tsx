'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, AlertTriangle, CheckCircle, XCircle, ChevronDown, ChevronUp } from 'lucide-react';

interface HealthEvent {
  id: string;
  source: string;
  level: string;
  message: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

interface SourceStatus {
  source: string;
  total: number;
  errors: number;
  lastEvent: string;
}

interface HealthData {
  summary: {
    total: number;
    errors: number;
    warnings: number;
    successes: number;
  };
  sources: SourceStatus[];
  recentErrors: HealthEvent[];
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

const TIME_RANGES = [
  { label: '1h', hours: 1 },
  { label: '6h', hours: 6 },
  { label: '24h', hours: 24 },
  { label: '7d', hours: 168 },
];

export default function SystemHealthPage() {
  const [data, setData] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [hours, setHours] = useState(24);
  const [expandedErrors, setExpandedErrors] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchData();
  }, [hours]);

  async function fetchData() {
    setLoading(true);
    try {
      const res = await fetch(`/api/platform/health?hours=${hours}`);
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      } else {
        setData({
          summary: { total: 0, errors: 0, warnings: 0, successes: 0 },
          sources: [],
          recentErrors: [],
        });
      }
    } catch (err) {
      console.error('Failed to fetch health data:', err);
      setData({
        summary: { total: 0, errors: 0, warnings: 0, successes: 0 },
        sources: [],
        recentErrors: [],
      });
    } finally {
      setLoading(false);
    }
  }

  function toggleErrorExpand(id: string) {
    setExpandedErrors((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">System Health</h1>
        <div className="flex gap-1">
          {TIME_RANGES.map((range) => (
            <button
              key={range.label}
              onClick={() => setHours(range.hours)}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                hours === range.hours
                  ? 'bg-blue-600 text-white'
                  : 'border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400'
              }`}
            >
              {range.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="h-16 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : data ? (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Activity className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {data.summary.total}
                    </p>
                    <p className="text-xs text-gray-500">Total Events</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <XCircle className="h-5 w-5 text-red-600" />
                  <div>
                    <p className="text-2xl font-bold text-red-600">
                      {data.summary.errors}
                    </p>
                    <p className="text-xs text-gray-500">Errors</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-5 w-5 text-yellow-600" />
                  <div>
                    <p className="text-2xl font-bold text-yellow-600">
                      {data.summary.warnings}
                    </p>
                    <p className="text-xs text-gray-500">Warnings</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="text-2xl font-bold text-green-600">
                      {data.summary.successes}
                    </p>
                    <p className="text-xs text-gray-500">Successes</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Status by Source */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Status by Source</CardTitle>
            </CardHeader>
            <CardContent>
              {data.sources.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">No sources found</p>
              ) : (
                <div className="overflow-x-auto">
                  <div className="min-w-[500px]">
                    <div className="grid grid-cols-4 gap-2 text-xs font-medium text-gray-500 uppercase tracking-wider pb-2 border-b border-gray-200 dark:border-gray-700">
                      <div>Source</div>
                      <div>Total</div>
                      <div>Errors</div>
                      <div>Last Event</div>
                    </div>
                    <div className="divide-y divide-gray-100 dark:divide-gray-800">
                      {data.sources.map((source) => (
                        <div
                          key={source.source}
                          className="grid grid-cols-4 gap-2 items-center py-3 text-sm"
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className={`inline-block w-2 h-2 rounded-full ${
                                source.errors > 0 ? 'bg-red-500' : 'bg-green-500'
                              }`}
                            />
                            <span className="text-gray-900 dark:text-white font-medium">
                              {source.source}
                            </span>
                          </div>
                          <div className="text-gray-600 dark:text-gray-400">{source.total}</div>
                          <div className={source.errors > 0 ? 'text-red-600 font-medium' : 'text-gray-600 dark:text-gray-400'}>
                            {source.errors}
                          </div>
                          <div className="text-gray-500 text-xs">{relativeTime(source.lastEvent)}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Errors */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Recent Errors</CardTitle>
            </CardHeader>
            <CardContent>
              {data.recentErrors.length === 0 ? (
                <div className="text-center py-6">
                  <CheckCircle className="h-8 w-8 mx-auto text-green-400 mb-2" />
                  <p className="text-sm text-gray-500">No errors in the selected time range</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {data.recentErrors.map((error) => (
                    <div
                      key={error.id}
                      className="border border-red-100 dark:border-red-900/30 rounded-lg"
                    >
                      <button
                        onClick={() => toggleErrorExpand(error.id)}
                        className="w-full flex items-center justify-between p-3 text-left hover:bg-red-50/50 dark:hover:bg-red-900/10 rounded-lg transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                            <span>{relativeTime(error.createdAt)}</span>
                            <span className="inline-block px-2 py-0.5 rounded-full bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                              {error.source}
                            </span>
                          </div>
                          <p className="text-sm text-gray-900 dark:text-white truncate">
                            {error.message}
                          </p>
                        </div>
                        {error.metadata && (
                          expandedErrors.has(error.id) ? (
                            <ChevronUp className="h-4 w-4 text-gray-400 shrink-0 ml-2" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-gray-400 shrink-0 ml-2" />
                          )
                        )}
                      </button>
                      {expandedErrors.has(error.id) && error.metadata && (
                        <div className="px-3 pb-3">
                          <pre className="text-xs bg-gray-50 dark:bg-gray-800 rounded p-3 overflow-x-auto text-gray-700 dark:text-gray-300">
                            {JSON.stringify(error.metadata, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface ActiveAnnouncement {
  id: string;
  title: string;
  message: string;
  type: string;
  dismissible: boolean;
}

function typeColors(type: string) {
  switch (type) {
    case 'info':
      return 'bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800';
    case 'warning':
      return 'bg-yellow-50 text-yellow-800 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-300 dark:border-yellow-800';
    case 'update':
      return 'bg-green-50 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800';
    case 'promo':
      return 'bg-purple-50 text-purple-800 border-purple-200 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800';
    default:
      return 'bg-gray-50 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700';
  }
}

export function AnnouncementsBanner() {
  const [announcements, setAnnouncements] = useState<ActiveAnnouncement[]>([]);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    async function fetchAnnouncements() {
      try {
        const res = await fetch('/api/announcements/active');
        const data = await res.json();
        if (data.success) {
          setAnnouncements(data.data);
        }
      } catch (err) {
        // Silently fail
      }
    }
    fetchAnnouncements();
  }, []);

  function dismiss(id: string) {
    setDismissedIds((prev) => {
      const next = new Set(Array.from(prev));
      next.add(id);
      return next;
    });
  }

  const visible = announcements.filter((a) => !dismissedIds.has(a.id));

  if (visible.length === 0) return null;

  return (
    <div className="space-y-0">
      {visible.map((a) => (
        <div
          key={a.id}
          className={`px-4 py-3 text-sm border-b ${typeColors(a.type)}`}
        >
          <div className="max-w-7xl mx-auto flex items-start justify-between gap-4">
            <div>
              <p className="font-medium">{a.title}</p>
              <p className="mt-0.5 opacity-90">{a.message}</p>
            </div>
            {a.dismissible && (
              <button
                onClick={() => dismiss(a.id)}
                className="p-1 rounded hover:bg-black/10 shrink-0 mt-0.5"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

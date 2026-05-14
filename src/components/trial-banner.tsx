'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { X } from 'lucide-react';

interface TrialStatus {
  plan: string;
  trialEndsAt: string | null;
  daysLeft: number | null;
  isExpired: boolean;
  isPaid: boolean;
}

export function TrialBanner() {
  const [status, setStatus] = useState<TrialStatus | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    async function fetchTrialStatus() {
      try {
        const res = await fetch('/api/trial/status');
        const data = await res.json();
        if (data.success) {
          setStatus(data.data);
        }
      } catch (err) {
        // Silently fail - don't block the UI
      }
    }
    fetchTrialStatus();
  }, []);

  if (!status || status.isPaid || dismissed) return null;

  const isExpired = status.isExpired;
  const daysLeft = status.daysLeft;

  return (
    <div
      className={`relative px-4 py-3 text-sm ${
        isExpired
          ? 'bg-red-50 text-red-800 border-b border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800'
          : 'bg-yellow-50 text-yellow-800 border-b border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-300 dark:border-yellow-800'
      }`}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        <p>
          {isExpired
            ? 'Your free trial has ended. Upgrade now to continue using CleanDay CRM.'
            : `You have ${daysLeft} day${daysLeft !== 1 ? 's' : ''} left in your free trial. Upgrade to keep all features.`}
        </p>
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/settings"
            className={`inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-lg ${
              isExpired
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'bg-yellow-600 text-white hover:bg-yellow-700'
            }`}
          >
            Upgrade Now
          </Link>
          <button
            onClick={() => setDismissed(true)}
            className={`p-1 rounded hover:bg-black/10 ${
              isExpired ? 'text-red-600' : 'text-yellow-600'
            }`}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

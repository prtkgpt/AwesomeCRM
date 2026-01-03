'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Calendar, Briefcase, Users, Settings, Home, LogOut, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { signOut } from 'next-auth/react';
import { ThemeToggle } from '@/components/theme-toggle';

const navItems = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    icon: Home,
  },
  {
    href: '/calendar',
    label: 'Calendar',
    icon: Calendar,
  },
  {
    href: '/jobs',
    label: 'Jobs',
    icon: Briefcase,
  },
  {
    href: '/clients',
    label: 'Clients',
    icon: Users,
  },
  {
    href: '/invoices',
    label: 'Invoices',
    icon: FileText,
  },
  {
    href: '/settings',
    label: 'Settings',
    icon: Settings,
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex md:flex-col md:fixed md:inset-y-0 md:w-64 md:bg-white dark:md:bg-gray-900 md:border-r md:border-gray-200 dark:md:border-gray-700">
      <div className="flex flex-col flex-1 min-h-0">
        {/* Logo/Brand */}
        <div className="flex items-center h-16 px-6 border-b border-gray-200 dark:border-gray-700">
          <h1 className="text-xl font-bold text-blue-600 dark:text-blue-400">CleanDay CRM</h1>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors',
                  isActive
                    ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100'
                )}
              >
                <Icon className={cn('h-5 w-5 mr-3', isActive && 'text-blue-600 dark:text-blue-400')} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User section */}
        <div className="flex-shrink-0 p-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
          <ThemeToggle />
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="flex items-center w-full px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
          >
            <LogOut className="h-5 w-5 mr-3" />
            Sign Out
          </button>
        </div>
      </div>
    </aside>
  );
}

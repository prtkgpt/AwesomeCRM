'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Calendar, Briefcase, Users, Home, Menu, FileText, Receipt } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { signOut } from 'next-auth/react';
import { ThemeToggle } from '@/components/theme-toggle';

const navItems = [
  {
    href: '/dashboard',
    label: 'Home',
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
];

export function MobileNav() {
  const pathname = usePathname();
  const [showMenu, setShowMenu] = useState(false);

  return (
    <>
      {/* Menu overlay */}
      {showMenu && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={() => setShowMenu(false)}
        />
      )}

      {/* Slide-out menu */}
      <div
        className={cn(
          'fixed right-0 top-0 bottom-0 w-64 bg-white dark:bg-gray-900 shadow-xl z-50 transform transition-transform duration-300 ease-in-out md:hidden',
          showMenu ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        <div className="flex flex-col h-full">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold dark:text-gray-100">Menu</h2>
          </div>

          <nav className="flex-1 p-4 space-y-2">
            <Link
              href="/estimates"
              className="flex items-center gap-3 px-3 py-3 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
              onClick={() => setShowMenu(false)}
            >
              <Receipt className="w-5 h-5" />
              <span className="text-sm font-medium">Estimates</span>
            </Link>

            <Link
              href="/invoices"
              className="flex items-center gap-3 px-3 py-3 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
              onClick={() => setShowMenu(false)}
            >
              <FileText className="w-5 h-5" />
              <span className="text-sm font-medium">Invoices</span>
            </Link>

            <Link
              href="/settings"
              className="flex items-center px-3 py-3 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
              onClick={() => setShowMenu(false)}
            >
              <span className="text-sm font-medium">Settings</span>
            </Link>

            <div className="pt-2">
              <ThemeToggle />
            </div>
          </nav>

          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="w-full px-3 py-2 text-sm font-medium text-red-600 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>

      {/* Bottom navigation bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 md:hidden">
        <div className="flex items-center justify-around h-16">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex flex-col items-center justify-center flex-1 h-full space-y-1 transition-colors',
                  isActive
                    ? 'text-blue-600 dark:text-blue-400'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
                )}
              >
                <Icon className={cn('h-5 w-5', isActive && 'stroke-2')} />
                <span className="text-xs font-medium">{item.label}</span>
              </Link>
            );
          })}

          {/* Menu button */}
          <button
            onClick={() => setShowMenu(true)}
            className="flex flex-col items-center justify-center flex-1 h-full space-y-1 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
          >
            <Menu className="h-5 w-5" />
            <span className="text-xs font-medium">More</span>
          </button>
        </div>
      </nav>
    </>
  );
}

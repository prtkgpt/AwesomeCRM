'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Calendar, Briefcase, Users, Home, Menu, FileText, Receipt, TrendingUp, MapPin, Wallet, User, Settings, ClipboardList } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { signOut, useSession } from 'next-auth/react';
import { ThemeToggle } from '@/components/theme-toggle';

// Owner/Admin bottom nav items
const ownerAdminNavItems = [
  { href: '/dashboard', label: 'Home', icon: Home },
  { href: '/calendar', label: 'Calendar', icon: Calendar },
  { href: '/jobs', label: 'Jobs', icon: Briefcase },
  { href: '/clients', label: 'Clients', icon: Users },
];

// Owner/Admin menu items (slide-out)
const ownerAdminMenuItems = [
  { href: '/reports', label: 'Reports', icon: TrendingUp },
  { href: '/estimates', label: 'Estimates', icon: Receipt },
  { href: '/invoices', label: 'Invoices', icon: FileText },
  { href: '/settings', label: 'Settings', icon: Settings },
];

// Cleaner bottom nav items
const cleanerNavItems = [
  { href: '/cleaner/today', label: 'Today', icon: MapPin },
  { href: '/cleaner/dashboard', label: 'Jobs', icon: Briefcase },
  { href: '/cleaner/earnings', label: 'Earnings', icon: Wallet },
  { href: '/cleaner/performance', label: 'Stats', icon: TrendingUp },
];

// Cleaner menu items (slide-out)
const cleanerMenuItems = [
  { href: '/cleaner/history', label: 'Job History', icon: ClipboardList },
  { href: '/cleaner/schedule', label: 'Schedule', icon: Calendar },
  { href: '/cleaner/profile', label: 'Profile', icon: User },
  { href: '/cleaner/settings', label: 'Settings', icon: Settings },
];

// Customer bottom nav items
const customerNavItems = [
  { href: '/customer/dashboard', label: 'Home', icon: Home },
  { href: '/customer/bookings', label: 'Bookings', icon: ClipboardList },
  { href: '/customer/invoices', label: 'Invoices', icon: FileText },
];

// Customer menu items (slide-out)
const customerMenuItems = [
  { href: '/customer/settings', label: 'Settings', icon: Settings },
];

export function MobileNav() {
  const pathname = usePathname();
  const [showMenu, setShowMenu] = useState(false);
  const { data: session } = useSession();

  const userRole = (session?.user as any)?.role as string | undefined;

  // Determine which nav items to show based on role
  let navItems = ownerAdminNavItems;
  let menuItems = ownerAdminMenuItems;

  if (userRole === 'CLEANER') {
    navItems = cleanerNavItems;
    menuItems = cleanerMenuItems;
  } else if (userRole === 'CUSTOMER') {
    navItems = customerNavItems;
    menuItems = customerMenuItems;
  }

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
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-3 rounded-lg',
                    isActive
                      ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                  )}
                  onClick={() => setShowMenu(false)}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-sm font-medium">{item.label}</span>
                </Link>
              );
            })}

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

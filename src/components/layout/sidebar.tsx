'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Calendar, Briefcase, Users, Settings, Home, LogOut, FileText, Users2, ClipboardList, Receipt, Activity, User, TrendingUp, Repeat, Wallet, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import { signOut, useSession } from 'next-auth/react';
import { ThemeToggle } from '@/components/theme-toggle';
import GlobalSearch from '@/components/search/global-search';

const ownerAdminNavItems = [
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
    href: '/team',
    label: 'Team',
    icon: Users2,
  },
  {
    href: '/invoices',
    label: 'Invoices',
    icon: FileText,
  },
  {
    href: '/reports',
    label: 'Reports',
    icon: TrendingUp,
  },
  {
    href: '/settings',
    label: 'Settings',
    icon: Settings,
  },
];

const cleanerNavItems = [
  {
    href: '/cleaner/today',
    label: "Today's Route",
    icon: MapPin,
  },
  {
    href: '/cleaner/dashboard',
    label: 'My Jobs',
    icon: Briefcase,
  },
  {
    href: '/cleaner/history',
    label: 'Job History',
    icon: ClipboardList,
  },
  {
    href: '/cleaner/earnings',
    label: 'Earnings',
    icon: Wallet,
  },
  {
    href: '/cleaner/performance',
    label: 'Performance',
    icon: TrendingUp,
  },
  {
    href: '/cleaner/schedule',
    label: 'Schedule',
    icon: Calendar,
  },
  {
    href: '/cleaner/profile',
    label: 'Profile',
    icon: User,
  },
  {
    href: '/cleaner/settings',
    label: 'Settings',
    icon: Settings,
  },
];

const customerNavItems = [
  {
    href: '/customer/dashboard',
    label: 'Dashboard',
    icon: Home,
  },
  {
    href: '/customer/bookings',
    label: 'My Bookings',
    icon: ClipboardList,
  },
  {
    href: '/customer/invoices',
    label: 'Invoices',
    icon: FileText,
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  const userRole = (session?.user as any)?.role as string | undefined;

  // Determine which nav items to show based on role
  let navItems = ownerAdminNavItems;
  if (userRole === 'CLEANER') {
    navItems = cleanerNavItems;
  } else if (userRole === 'CUSTOMER') {
    navItems = customerNavItems;
  }

  return (
    <aside className="hidden md:flex md:flex-col md:fixed md:inset-y-0 md:w-64 md:bg-white dark:md:bg-gray-900 md:border-r md:border-gray-200 dark:md:border-gray-700">
      <div className="flex flex-col flex-1 min-h-0">
        {/* Logo/Brand */}
        <div className="flex items-center h-20 px-6 border-b border-gray-200 dark:border-gray-700">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-blue-500 dark:from-blue-400 dark:to-blue-300 bg-clip-text text-transparent tracking-tight">CleanDay CRM</h1>
        </div>

        {/* Global Search */}
        <div className="px-4 pt-6 pb-4">
          <GlobalSearch />
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-2 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center px-4 py-3 text-sm font-semibold rounded-xl transition-all duration-200',
                  isActive
                    ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/30 scale-[1.02]'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100 hover:scale-[1.01] hover:shadow-sm'
                )}
              >
                <Icon className={cn('h-5 w-5 mr-3', isActive && 'text-white')} />
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
            className="flex items-center w-full px-4 py-3 text-sm font-semibold text-gray-700 dark:text-gray-300 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 transition-all duration-200 hover:scale-[1.01]"
          >
            <LogOut className="h-5 w-5 mr-3" />
            Sign Out
          </button>
        </div>
      </div>
    </aside>
  );
}

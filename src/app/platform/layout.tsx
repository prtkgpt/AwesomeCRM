'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Building2, FileText, BarChart3, LogOut } from 'lucide-react';
import { signOut } from 'next-auth/react';

const navItems = [
  { label: 'Dashboard', href: '/platform', icon: BarChart3 },
  { label: 'Companies', href: '/platform/companies', icon: Building2 },
  { label: 'Blog', href: '/platform/blog', icon: FileText },
];

export default function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 w-60 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 hidden md:flex flex-col z-30">
        <div className="p-4 border-b border-gray-200 dark:border-gray-800">
          <h1 className="text-lg font-bold text-gray-900 dark:text-white">
            CleanDay CRM
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">Platform Admin</p>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === '/platform'
                ? pathname === '/platform'
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                    : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-gray-200 dark:border-gray-800">
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 w-full transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile header */}
      <div className="md:hidden fixed top-0 left-0 right-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 z-30 px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-sm font-bold text-gray-900 dark:text-white">
              CleanDay CRM
            </h1>
            <p className="text-xs text-gray-500">Platform Admin</p>
          </div>
          <nav className="flex gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.href === '/platform'
                  ? pathname === '/platform'
                  : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`p-2 rounded-lg ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                      : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 md:ml-60 mt-14 md:mt-0">
        <div className="max-w-6xl mx-auto p-4 md:p-6">
          {children}
        </div>
      </main>
    </div>
  );
}

import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { MobileNav } from '@/components/layout/mobile-nav';
import { Sidebar } from '@/components/layout/sidebar';
import { PageFooter } from '@/components/layout/page-footer';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col">
      {/* Desktop Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="md:pl-64 pb-16 md:pb-0 flex-1 flex flex-col">
        <main className="mx-auto max-w-7xl flex-1 w-full">
          {children}
        </main>

        {/* Page Footer */}
        <PageFooter />
      </div>

      {/* Mobile Bottom Nav */}
      <MobileNav />
    </div>
  );
}

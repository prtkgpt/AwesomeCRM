import Link from 'next/link';
import { BookOpen, Clock, ArrowRight } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Tutorials - CleanDay CRM',
  description: 'Step-by-step guides to help you get the most out of CleanDay CRM for your cleaning business.',
};

const tutorials = [
  {
    slug: 'setting-up-your-account',
    title: 'Setting Up Your Account',
    description: 'Complete guide to initial account setup and configuration for your cleaning company.',
    duration: '10 min',
    topics: ['Account creation', 'Company profile', 'Pricing setup', 'Payment integrations'],
  },
  {
    slug: 'managing-clients',
    title: 'Managing Clients',
    description: 'Learn how to add, organize, and manage your client database effectively.',
    duration: '8 min',
    topics: ['Adding clients', 'Client profiles', 'Service preferences', 'Communication'],
  },
  {
    slug: 'scheduling-jobs',
    title: 'Scheduling Jobs',
    description: 'Master the calendar and scheduling system to efficiently manage your cleaning appointments.',
    duration: '12 min',
    topics: ['Creating jobs', 'Calendar views', 'Recurring schedules', 'Assigning cleaners'],
  },
  {
    slug: 'payments-and-invoices',
    title: 'Payments and Invoices',
    description: 'Handle billing, invoicing, and payment collection with ease.',
    duration: '10 min',
    topics: ['Creating invoices', 'Payment methods', 'Tracking payments', 'Refunds'],
  },
  {
    slug: 'team-management',
    title: 'Team Management',
    description: 'Add team members, manage schedules, and track performance.',
    duration: '12 min',
    topics: ['Adding cleaners', 'Roles & permissions', 'Availability', 'Performance tracking'],
  },
  {
    slug: 'marketing-and-campaigns',
    title: 'Marketing and Campaigns',
    description: 'Grow your business with built-in marketing tools and referral programs.',
    duration: '15 min',
    topics: ['Email campaigns', 'Referral programs', 'Review requests', 'Promotions'],
  },
  {
    slug: 'reports-and-analytics',
    title: 'Reports and Analytics',
    description: 'Understand your business performance with comprehensive reports and insights.',
    duration: '10 min',
    topics: ['Revenue reports', 'Team performance', 'Customer insights', 'Data export'],
  },
];

export default function TutorialsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-950">
      {/* Header */}
      <header className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        <div className="max-w-5xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <Link href="/" className="text-3xl font-bold text-blue-600 dark:text-blue-400">
              CleanDay CRM
            </Link>
            <div className="flex gap-4">
              <Link
                href="/login"
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              >
                Sign In
              </Link>
              <Link
                href="/signup"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-6 py-12">
        {/* Page Title */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full mb-4">
            <BookOpen className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Tutorials
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Step-by-step guides to help you master CleanDay CRM and grow your cleaning business.
          </p>
        </div>

        {/* Tutorials Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {tutorials.map((tutorial, index) => (
            <Link
              key={tutorial.slug}
              href={`/tutorials/${tutorial.slug}`}
              className="group bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-lg transition-all"
            >
              <div className="flex items-start justify-between mb-4">
                <span className="inline-flex items-center justify-center w-8 h-8 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full text-sm font-bold">
                  {index + 1}
                </span>
                <span className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                  <Clock className="w-4 h-4" />
                  {tutorial.duration}
                </span>
              </div>

              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                {tutorial.title}
              </h2>

              <p className="text-gray-600 dark:text-gray-400 mb-4 text-sm leading-relaxed">
                {tutorial.description}
              </p>

              <div className="flex flex-wrap gap-2 mb-4">
                {tutorial.topics.slice(0, 3).map((topic) => (
                  <span
                    key={topic}
                    className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded text-xs"
                  >
                    {topic}
                  </span>
                ))}
                {tutorial.topics.length > 3 && (
                  <span className="px-2 py-1 text-gray-500 dark:text-gray-400 text-xs">
                    +{tutorial.topics.length - 3} more
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 text-sm font-medium group-hover:gap-3 transition-all">
                Read tutorial
                <ArrowRight className="w-4 h-4" />
              </div>
            </Link>
          ))}
        </div>

        {/* Help Section */}
        <div className="mt-16 bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-700 dark:to-purple-700 rounded-xl p-8 text-center">
          <h2 className="text-2xl font-bold text-white mb-4">
            Need more help?
          </h2>
          <p className="text-blue-100 mb-6 max-w-2xl mx-auto">
            Check out our FAQ for quick answers, or reach out to our support team.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link
              href="/faq"
              className="inline-flex items-center gap-2 px-6 py-3 bg-white text-blue-600 font-semibold rounded-lg hover:bg-blue-50 transition-colors"
            >
              View FAQ
            </Link>
            <a
              href="mailto:support@cleandaycrm.com"
              className="inline-flex items-center gap-2 px-6 py-3 bg-white/10 text-white font-semibold rounded-lg hover:bg-white/20 transition-colors backdrop-blur"
            >
              Contact Support
            </a>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 dark:border-gray-800 mt-20 py-8">
        <div className="max-w-5xl mx-auto px-6">
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-gray-500 dark:text-gray-400">
            <Link
              href="/faq"
              className="hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
            >
              FAQ
            </Link>
            <span className="text-gray-300 dark:text-gray-600">|</span>
            <a
              href="mailto:support@cleandaycrm.com"
              className="hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
            >
              Support
            </a>
            <span className="text-gray-300 dark:text-gray-600">|</span>
            <Link
              href="/terms"
              className="hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
            >
              Terms of Service
            </Link>
            <span className="text-gray-300 dark:text-gray-600">|</span>
            <Link
              href="/privacy"
              className="hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
            >
              Privacy Policy
            </Link>
            <span className="text-gray-300 dark:text-gray-600">|</span>
            <span>&copy; {new Date().getFullYear()} CleanDay CRM</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

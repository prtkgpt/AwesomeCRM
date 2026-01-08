import Link from 'next/link';
import { CheckCircle, Calendar, Users, Search, TrendingUp, Star } from 'lucide-react';

export default function ProductReleasePage() {
  const releases = [
    {
      version: '1.2.0',
      date: 'January 2026',
      title: 'Enhanced Search & UX Improvements',
      features: [
        {
          icon: Search,
          title: 'Global Search (Cmd+K)',
          description: 'Search across clients, jobs, invoices, estimates, and team members with keyboard shortcuts',
        },
        {
          icon: CheckCircle,
          title: 'Cleaner Navigation',
          description: 'Redesigned sidebar and footer for better space utilization',
        },
        {
          icon: Star,
          title: 'Automated Review Requests',
          description: 'Automatically send feedback requests 24 hours after job completion',
        },
      ],
    },
    {
      version: '1.1.0',
      date: 'December 2025',
      title: 'Reports & Analytics',
      features: [
        {
          icon: TrendingUp,
          title: 'Reports Dashboard',
          description: 'Comprehensive analytics with revenue tracking, top clients, and team performance',
        },
        {
          icon: Calendar,
          title: 'Calendar Improvements',
          description: 'Better visibility for unassigned jobs with color coding and warnings',
        },
        {
          icon: Users,
          title: 'Team Management',
          description: 'Enhanced team member profiles and performance tracking',
        },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-950">
      {/* Header */}
      <header className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        <div className="max-w-5xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-blue-600 dark:text-blue-400">CleanDay CRM</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">Product Updates</p>
            </div>
            <Link
              href="/login"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              Sign In
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-6 py-12">
        {/* Introduction */}
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            What's New in CleanDay CRM
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-400">
            Stay up to date with the latest features and improvements
          </p>
        </div>

        {/* Release Timeline */}
        <div className="space-y-12">
          {releases.map((release, index) => (
            <div
              key={release.version}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden"
            >
              {/* Release Header */}
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-700 dark:to-blue-800 px-6 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-2xl font-bold text-white">
                      {release.title}
                    </h3>
                    <p className="text-blue-100 mt-1">{release.date}</p>
                  </div>
                  <span className="px-4 py-2 bg-white/20 rounded-lg text-white font-mono text-sm">
                    v{release.version}
                  </span>
                </div>
              </div>

              {/* Features List */}
              <div className="p-6 space-y-6">
                {release.features.map((feature, featureIndex) => {
                  const Icon = feature.icon;
                  return (
                    <div key={featureIndex} className="flex gap-4">
                      <div className="flex-shrink-0">
                        <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                          <Icon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                        </div>
                      </div>
                      <div>
                        <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                          {feature.title}
                        </h4>
                        <p className="text-gray-600 dark:text-gray-400 mt-1">
                          {feature.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Call to Action */}
        <div className="mt-16 text-center bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-700 dark:to-purple-700 rounded-xl p-12">
          <h3 className="text-3xl font-bold text-white mb-4">
            Ready to streamline your cleaning business?
          </h3>
          <p className="text-blue-100 text-lg mb-8 max-w-2xl mx-auto">
            Join hundreds of cleaning businesses using CleanDay CRM to manage clients, schedule jobs, and grow their revenue.
          </p>
          <div className="flex gap-4 justify-center">
            <Link
              href="/signup"
              className="px-8 py-3 bg-white text-blue-600 font-semibold rounded-lg hover:bg-blue-50 transition-colors"
            >
              Get Started
            </Link>
            <Link
              href="/login"
              className="px-8 py-3 bg-white/10 text-white font-semibold rounded-lg hover:bg-white/20 transition-colors backdrop-blur"
            >
              Sign In
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 dark:border-gray-800 mt-20 py-8">
        <div className="max-w-5xl mx-auto px-6">
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-gray-500 dark:text-gray-400">
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
            <a
              href="https://www.prateekgupta.org"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
            >
              © 2026 CleanDay CRM
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

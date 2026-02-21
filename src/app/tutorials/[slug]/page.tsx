import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ArrowRight, Clock } from 'lucide-react';
import { marked } from 'marked';
import fs from 'fs';
import path from 'path';
import type { Metadata } from 'next';

const tutorials = [
  {
    slug: 'setting-up-your-account',
    file: '01-setting-up-your-account.md',
    title: 'Setting Up Your Account',
    description: 'Complete guide to initial account setup and configuration for your cleaning company.',
    duration: '10 min',
  },
  {
    slug: 'managing-clients',
    file: '02-managing-clients.md',
    title: 'Managing Clients',
    description: 'Learn how to add, organize, and manage your client database effectively.',
    duration: '8 min',
  },
  {
    slug: 'scheduling-jobs',
    file: '03-scheduling-jobs.md',
    title: 'Scheduling Jobs',
    description: 'Master the calendar and scheduling system to efficiently manage your cleaning appointments.',
    duration: '12 min',
  },
  {
    slug: 'payments-and-invoices',
    file: '04-payments-and-invoices.md',
    title: 'Payments and Invoices',
    description: 'Handle billing, invoicing, and payment collection with ease.',
    duration: '10 min',
  },
  {
    slug: 'team-management',
    file: '05-team-management.md',
    title: 'Team Management',
    description: 'Add team members, manage schedules, and track performance.',
    duration: '12 min',
  },
  {
    slug: 'marketing-and-campaigns',
    file: '06-marketing-and-campaigns.md',
    title: 'Marketing and Campaigns',
    description: 'Grow your business with built-in marketing tools and referral programs.',
    duration: '15 min',
  },
  {
    slug: 'reports-and-analytics',
    file: '07-reports-and-analytics.md',
    title: 'Reports and Analytics',
    description: 'Understand your business performance with comprehensive reports and insights.',
    duration: '10 min',
  },
];

function getTutorial(slug: string) {
  return tutorials.find((t) => t.slug === slug);
}

function getTutorialContent(filename: string): string | null {
  try {
    const filePath = path.join(process.cwd(), 'docs', 'tutorials', filename);
    return fs.readFileSync(filePath, 'utf-8');
  } catch {
    return null;
  }
}

function getAdjacentTutorials(slug: string) {
  const index = tutorials.findIndex((t) => t.slug === slug);
  return {
    prev: index > 0 ? tutorials[index - 1] : null,
    next: index < tutorials.length - 1 ? tutorials[index + 1] : null,
  };
}

export async function generateStaticParams() {
  return tutorials.map((tutorial) => ({
    slug: tutorial.slug,
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const tutorial = getTutorial(slug);

  if (!tutorial) {
    return { title: 'Tutorial Not Found - CleanDay CRM' };
  }

  return {
    title: `${tutorial.title} - CleanDay CRM Tutorials`,
    description: tutorial.description,
  };
}

export default async function TutorialPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const tutorial = getTutorial(slug);

  if (!tutorial) {
    notFound();
  }

  const content = getTutorialContent(tutorial.file);
  if (!content) {
    notFound();
  }

  // Remove the first heading (title) from markdown since we display it separately
  const contentWithoutTitle = content.replace(/^#\s+.*\n/, '');
  const htmlContent = await marked(contentWithoutTitle);

  const { prev, next } = getAdjacentTutorials(slug);
  const currentIndex = tutorials.findIndex((t) => t.slug === slug);

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      {/* Header */}
      <header className="border-b border-gray-100 dark:border-gray-800 sticky top-0 bg-white/95 dark:bg-gray-950/95 backdrop-blur z-10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="text-lg font-bold text-gray-900 dark:text-white">
            CleanDay<span className="text-blue-600">CRM</span>
          </Link>
          <Link
            href="/tutorials"
            className="text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            All Tutorials
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-12">
        {/* Breadcrumb & Meta */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-4">
            <Link href="/tutorials" className="hover:text-blue-600 transition-colors">
              Tutorials
            </Link>
            <span>/</span>
            <span>Part {currentIndex + 1} of {tutorials.length}</span>
            <span className="mx-2">•</span>
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {tutorial.duration}
            </span>
          </div>

          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            {tutorial.title}
          </h1>

          <p className="text-lg text-gray-600 dark:text-gray-400">
            {tutorial.description}
          </p>
        </div>

        {/* Tutorial Content */}
        <article
          className="prose prose-lg dark:prose-invert max-w-none
            prose-headings:font-bold prose-headings:text-gray-900 dark:prose-headings:text-white
            prose-h2:text-2xl prose-h2:mt-10 prose-h2:mb-4 prose-h2:pb-2 prose-h2:border-b prose-h2:border-gray-200 dark:prose-h2:border-gray-700
            prose-h3:text-xl prose-h3:mt-8 prose-h3:mb-3
            prose-p:text-gray-600 dark:prose-p:text-gray-300 prose-p:leading-relaxed
            prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline
            prose-strong:text-gray-900 dark:prose-strong:text-white
            prose-code:bg-gray-100 dark:prose-code:bg-gray-800 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:before:content-none prose-code:after:content-none
            prose-pre:bg-gray-900 prose-pre:text-gray-100
            prose-ul:my-4 prose-li:text-gray-600 dark:prose-li:text-gray-300
            prose-ol:my-4
            prose-table:border-collapse prose-table:w-full
            prose-th:border prose-th:border-gray-300 dark:prose-th:border-gray-600 prose-th:bg-gray-100 dark:prose-th:bg-gray-800 prose-th:px-4 prose-th:py-2 prose-th:text-left
            prose-td:border prose-td:border-gray-300 dark:prose-td:border-gray-600 prose-td:px-4 prose-td:py-2
            prose-blockquote:border-l-blue-500 prose-blockquote:bg-blue-50 dark:prose-blockquote:bg-blue-900/20 prose-blockquote:py-1 prose-blockquote:not-italic
            prose-hr:my-8"
          dangerouslySetInnerHTML={{ __html: htmlContent }}
        />

        {/* Navigation */}
        <nav className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-700">
          <div className="flex flex-col sm:flex-row gap-4 justify-between">
            {prev ? (
              <Link
                href={`/tutorials/${prev.slug}`}
                className="flex-1 group p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-300 dark:hover:border-blue-600 transition-colors"
              >
                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-1">
                  <ArrowLeft className="w-4 h-4" />
                  Previous
                </div>
                <div className="font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  {prev.title}
                </div>
              </Link>
            ) : (
              <div className="flex-1" />
            )}

            {next ? (
              <Link
                href={`/tutorials/${next.slug}`}
                className="flex-1 group p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-300 dark:hover:border-blue-600 transition-colors text-right"
              >
                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-1 justify-end">
                  Next
                  <ArrowRight className="w-4 h-4" />
                </div>
                <div className="font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  {next.title}
                </div>
              </Link>
            ) : (
              <Link
                href="/tutorials"
                className="flex-1 group p-4 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors text-right"
              >
                <div className="flex items-center gap-2 text-sm text-blue-200 mb-1 justify-end">
                  Completed!
                </div>
                <div className="font-semibold text-white">
                  Back to All Tutorials
                </div>
              </Link>
            )}
          </div>
        </nav>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-100 dark:border-gray-800 py-8 mt-12">
        <div className="max-w-4xl mx-auto px-6 text-center text-sm text-gray-400">
          &copy; {new Date().getFullYear()} CleanDay CRM. All rights reserved.
        </div>
      </footer>
    </div>
  );
}

import Link from 'next/link';
import type { Metadata } from 'next';
import { prisma } from '@/lib/prisma';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Blog - CleanDayCRM | Tips & Insights for Cleaning Businesses',
  description:
    'Expert advice, industry insights, and practical tips for running a successful cleaning business. Learn from the CleanDayCRM team.',
  openGraph: {
    title: 'Blog - CleanDayCRM',
    description: 'Expert advice and tips for cleaning businesses',
    type: 'website',
  },
};

async function getPosts() {
  return prisma.blogPost.findMany({
    where: { published: true },
    orderBy: { publishedAt: 'desc' },
    take: 20,
    select: {
      id: true,
      title: true,
      slug: true,
      excerpt: true,
      content: true,
      coverImage: true,
      publishedAt: true,
      author: { select: { name: true } },
    },
  });
}

const ACCENTS = [
  'from-blue-500 to-cyan-500',
  'from-purple-500 to-pink-500',
  'from-emerald-500 to-teal-500',
  'from-orange-500 to-amber-500',
  'from-rose-500 to-red-500',
  'from-indigo-500 to-violet-500',
];

function readingTime(content: string): number {
  const words = content.replace(/<[^>]*>/g, ' ').trim().split(/\s+/).length;
  return Math.max(1, Math.round(words / 220));
}

function formatDate(d: Date | null) {
  if (!d) return null;
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default async function BlogListPage() {
  const posts = await getPosts();
  const [featured, ...rest] = posts;

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      {/* Header */}
      <header className="sticky top-0 z-10 backdrop-blur bg-white/80 dark:bg-gray-950/80 border-b border-gray-100 dark:border-gray-800">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-lg font-bold text-gray-900 dark:text-white">
            CleanDay<span className="text-blue-600">CRM</span>
          </Link>
          <Link
            href="/"
            className="text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            Back to Home
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-gray-100 dark:border-gray-800">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-blue-950/30 dark:via-gray-950 dark:to-purple-950/30" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(59,130,246,0.08),transparent_50%)]" />
        <div className="relative max-w-6xl mx-auto px-4 py-16 md:py-24">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 text-xs font-medium mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
            CleanDayCRM Blog
          </div>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-gray-900 dark:text-white max-w-3xl">
            Run a smarter cleaning business.
          </h1>
          <p className="mt-4 text-lg md:text-xl text-gray-500 dark:text-gray-400 max-w-2xl">
            Tactical guides, pricing playbooks, and operations advice from people who've grown cleaning companies past seven figures.
          </p>
        </div>
      </section>

      {posts.length === 0 ? (
        <section className="max-w-6xl mx-auto px-4 py-24 text-center">
          <p className="text-gray-500">No posts yet. Check back soon!</p>
        </section>
      ) : (
        <>
          {/* Featured post */}
          {featured && (
            <section className="max-w-6xl mx-auto px-4 pt-12 md:pt-16">
              <Link
                href={`/blog/${featured.slug}`}
                className="group grid md:grid-cols-5 gap-6 md:gap-10 items-center"
              >
                <div className="md:col-span-2 relative aspect-[4/3] rounded-2xl overflow-hidden">
                  {featured.coverImage ? (
                    <img
                      src={featured.coverImage}
                      alt={featured.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className={`w-full h-full bg-gradient-to-br ${ACCENTS[0]} flex items-center justify-center p-8`}>
                      <span className="text-5xl md:text-6xl font-bold text-white/90 leading-tight">
                        {featured.title.split(' ').slice(0, 4).join(' ')}
                      </span>
                    </div>
                  )}
                </div>
                <div className="md:col-span-3">
                  <div className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-blue-600 dark:text-blue-400 mb-3">
                    <span className="w-8 h-px bg-blue-600 dark:bg-blue-400" />
                    Featured
                  </div>
                  <h2 className="text-2xl md:text-4xl font-bold text-gray-900 dark:text-white leading-tight group-hover:text-blue-600 transition-colors">
                    {featured.title}
                  </h2>
                  {featured.excerpt && (
                    <p className="mt-4 text-base md:text-lg text-gray-500 dark:text-gray-400 leading-relaxed line-clamp-3">
                      {featured.excerpt}
                    </p>
                  )}
                  <div className="mt-5 flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
                    {featured.author.name && (
                      <span className="font-medium text-gray-700 dark:text-gray-300">{featured.author.name}</span>
                    )}
                    {featured.publishedAt && (
                      <>
                        <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-700" />
                        <time>{formatDate(featured.publishedAt)}</time>
                      </>
                    )}
                    <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-700" />
                    <span>{readingTime(featured.content)} min read</span>
                  </div>
                </div>
              </Link>
            </section>
          )}

          {/* Divider label */}
          {rest.length > 0 && (
            <section className="max-w-6xl mx-auto px-4 mt-16 md:mt-20 mb-6 flex items-end justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                More articles
              </h2>
              <span className="text-xs text-gray-400 dark:text-gray-600">{rest.length} {rest.length === 1 ? 'post' : 'posts'}</span>
            </section>
          )}

          {/* Posts Grid */}
          <section className="max-w-6xl mx-auto px-4 pb-20">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-gray-100 dark:bg-gray-800 rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-800">
              {rest.map((post, i) => {
                const accent = ACCENTS[(i + 1) % ACCENTS.length];
                return (
                  <Link
                    key={post.id}
                    href={`/blog/${post.slug}`}
                    className="group relative block bg-white dark:bg-gray-950 p-6 md:p-8 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
                  >
                    <div className={`absolute left-0 top-6 md:top-8 bottom-6 md:bottom-8 w-0.5 bg-gradient-to-b ${accent} opacity-0 group-hover:opacity-100 transition-opacity`} />
                    <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500 mb-3">
                      {post.publishedAt && <time>{formatDate(post.publishedAt)}</time>}
                      <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-700" />
                      <span>{readingTime(post.content)} min read</span>
                    </div>
                    <h3 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white leading-snug group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {post.title}
                    </h3>
                    {post.excerpt && (
                      <p className="mt-3 text-gray-500 dark:text-gray-400 leading-relaxed line-clamp-2">
                        {post.excerpt}
                      </p>
                    )}
                    {post.author.name && (
                      <div className="mt-5 text-sm font-medium text-gray-700 dark:text-gray-300">
                        {post.author.name}
                      </div>
                    )}
                  </Link>
                );
              })}
            </div>
          </section>
        </>
      )}

      {/* CTA */}
      <section className="border-t border-gray-100 dark:border-gray-800">
        <div className="max-w-6xl mx-auto px-4 py-16 md:py-20 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
            Ready to run a smoother cleaning business?
          </h2>
          <p className="mt-3 text-gray-500 dark:text-gray-400 max-w-xl mx-auto">
            Try CleanDayCRM free. Scheduling, clients, payments, and team management — all in one place.
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 mt-6 px-6 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors"
          >
            Start free trial
            <span aria-hidden>&rarr;</span>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 dark:border-gray-800 py-8">
        <div className="max-w-6xl mx-auto px-4 text-center text-sm text-gray-400">
          &copy; {new Date().getFullYear()} CleanDayCRM. All rights reserved.
        </div>
      </footer>
    </div>
  );
}

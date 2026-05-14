import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { prisma } from '@/lib/prisma';

export const revalidate = 60;

async function getPost(slug: string) {
  const post = await prisma.blogPost.findUnique({
    where: { slug },
    include: { author: { select: { name: true } } },
  });
  if (!post || !post.published) return null;
  return post;
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const post = await getPost(params.slug);

  if (!post) {
    return { title: 'Post Not Found - CleanDayCRM' };
  }

  const title = post.metaTitle || post.title;
  const description = post.metaDescription || post.excerpt || `Read "${post.title}" on the CleanDayCRM blog.`;

  return {
    title: `${title} - CleanDayCRM Blog`,
    description,
    openGraph: {
      title,
      description,
      type: 'article',
      publishedTime: post.publishedAt?.toISOString(),
      authors: post.author.name ? [post.author.name] : undefined,
      images: post.coverImage ? [{ url: post.coverImage }] : undefined,
    },
    twitter: {
      card: post.coverImage ? 'summary_large_image' : 'summary',
      title,
      description,
      images: post.coverImage ? [post.coverImage] : undefined,
    },
  };
}

function readingTime(content: string): number {
  const words = content.replace(/<[^>]*>/g, ' ').trim().split(/\s+/).length;
  return Math.max(1, Math.round(words / 220));
}

export default async function BlogPostPage({
  params,
}: {
  params: { slug: string };
}) {
  const post = await getPost(params.slug);

  if (!post) {
    notFound();
  }

  const isHtml = post.content.includes('<') && post.content.includes('>');
  const minutes = readingTime(post.content);

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      {/* Header */}
      <header className="sticky top-0 z-10 backdrop-blur bg-white/80 dark:bg-gray-950/80 border-b border-gray-100 dark:border-gray-800">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-lg font-bold text-gray-900 dark:text-white">
            CleanDay<span className="text-blue-600">CRM</span>
          </Link>
          <Link
            href="/blog"
            className="text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            All Posts
          </Link>
        </div>
      </header>

      {/* Article hero */}
      <section className="max-w-3xl mx-auto px-4 pt-12 md:pt-20 pb-8">
        <Link
          href="/blog"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-blue-600 transition-colors mb-6"
        >
          <span aria-hidden>&larr;</span> Back to blog
        </Link>

        <h1 className="text-3xl md:text-5xl font-bold text-gray-900 dark:text-white leading-[1.1] tracking-tight">
          {post.title}
        </h1>

        {post.excerpt && (
          <p className="mt-5 text-lg md:text-xl text-gray-500 dark:text-gray-400 leading-relaxed">
            {post.excerpt}
          </p>
        )}

        <div className="mt-8 flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
          {post.author.name && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-xs font-semibold">
                {post.author.name.charAt(0)}
              </div>
              <span className="font-medium text-gray-700 dark:text-gray-300">{post.author.name}</span>
            </div>
          )}
          {post.publishedAt && (
            <>
              <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-700" />
              <time>
                {new Date(post.publishedAt).toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </time>
            </>
          )}
          <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-700" />
          <span>{minutes} min read</span>
        </div>
      </section>

      {/* Cover Image */}
      {post.coverImage && (
        <div className="max-w-4xl mx-auto px-4 mb-8">
          <img
            src={post.coverImage}
            alt={post.title}
            className="w-full h-64 md:h-96 object-cover rounded-2xl"
          />
        </div>
      )}

      {/* Article body */}
      <article className="max-w-3xl mx-auto px-4 pb-16">
        {isHtml ? (
          <div
            className="prose prose-lg dark:prose-invert max-w-none
              prose-headings:font-bold prose-headings:tracking-tight
              prose-h2:text-2xl md:prose-h2:text-3xl prose-h2:mt-12 prose-h2:mb-4
              prose-h3:text-xl md:prose-h3:text-2xl prose-h3:mt-10 prose-h3:mb-3
              prose-p:text-gray-700 dark:prose-p:text-gray-300 prose-p:leading-relaxed
              prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline
              prose-strong:text-gray-900 dark:prose-strong:text-white
              prose-li:text-gray-700 dark:prose-li:text-gray-300 prose-li:my-1
              prose-ul:my-6 prose-ol:my-6
              prose-img:rounded-xl
              prose-blockquote:border-l-4 prose-blockquote:border-blue-500 prose-blockquote:bg-blue-50 dark:prose-blockquote:bg-blue-950/20 prose-blockquote:py-1 prose-blockquote:px-6 prose-blockquote:rounded-r-lg prose-blockquote:not-italic"
            dangerouslySetInnerHTML={{ __html: post.content }}
          />
        ) : (
          <div className="prose prose-lg dark:prose-invert max-w-none whitespace-pre-wrap">
            {post.content}
          </div>
        )}
      </article>

      {/* CTA */}
      <section className="border-t border-gray-100 dark:border-gray-800 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20">
        <div className="max-w-3xl mx-auto px-4 py-12 md:py-16 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
            Run your cleaning business with CleanDayCRM
          </h2>
          <p className="mt-3 text-gray-600 dark:text-gray-400 max-w-xl mx-auto">
            Scheduling, clients, payments, and team management — all in one place. Try it free.
          </p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors"
            >
              Start free trial
              <span aria-hidden>&rarr;</span>
            </Link>
            <Link
              href="/blog"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg border border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-900 font-medium transition-colors"
            >
              More articles
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 dark:border-gray-800 py-8">
        <div className="max-w-3xl mx-auto px-4 text-center text-sm text-gray-400">
          &copy; {new Date().getFullYear()} CleanDayCRM. All rights reserved.
        </div>
      </footer>
    </div>
  );
}

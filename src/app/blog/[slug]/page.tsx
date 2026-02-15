import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { marked } from 'marked';

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  coverImage: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  publishedAt: string | null;
  author: { name: string | null };
}

async function getPost(slug: string): Promise<BlogPost | null> {
  try {
    const baseUrl = process.env.NEXTAUTH_URL
      || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
    const res = await fetch(`${baseUrl}/api/public/blog/${slug}`, {
      next: { revalidate: 60 },
    });
    const data = await res.json();
    return data.success ? data.data : null;
  } catch {
    return null;
  }
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
      publishedTime: post.publishedAt || undefined,
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

export default async function BlogPostPage({
  params,
}: {
  params: { slug: string };
}) {
  const post = await getPost(params.slug);

  if (!post) {
    notFound();
  }

  // Simple check if content looks like HTML
  const isHtml = post.content.includes('<') && post.content.includes('>');

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      {/* Header */}
      <header className="border-b border-gray-100 dark:border-gray-800">
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

      {/* Article */}
      <article className="max-w-3xl mx-auto px-4 py-8 md:py-12">
        {/* Cover Image */}
        {post.coverImage && (
          <img
            src={post.coverImage}
            alt={post.title}
            className="w-full h-64 md:h-80 object-cover rounded-xl mb-8"
          />
        )}

        {/* Meta */}
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
          {post.author.name && <span>{post.author.name}</span>}
          {post.publishedAt && (
            <>
              <span>&middot;</span>
              <time>
                {new Date(post.publishedAt).toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </time>
            </>
          )}
        </div>

        {/* Title */}
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white leading-tight">
          {post.title}
        </h1>

        {post.excerpt && (
          <p className="mt-4 text-lg text-gray-500 leading-relaxed">
            {post.excerpt}
          </p>
        )}

        {/* Content */}
        <div
          className="mt-8 prose prose-lg dark:prose-invert max-w-none prose-headings:font-bold prose-a:text-blue-600 prose-img:rounded-xl"
          dangerouslySetInnerHTML={{ __html: isHtml ? post.content : marked.parse(post.content) as string }}
        />
      </article>

      {/* Back link */}
      <div className="max-w-3xl mx-auto px-4 pb-12">
        <Link
          href="/blog"
          className="text-sm text-blue-600 hover:underline"
        >
          &larr; Back to all posts
        </Link>
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-100 dark:border-gray-800 py-8">
        <div className="max-w-3xl mx-auto px-4 text-center text-sm text-gray-400">
          &copy; {new Date().getFullYear()} CleanDayCRM. All rights reserved.
        </div>
      </footer>
    </div>
  );
}

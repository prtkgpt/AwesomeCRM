'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, FileText, Eye, Pencil, Trash2, Globe, EyeOff } from 'lucide-react';

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  coverImage: string | null;
  published: boolean;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  author: { name: string | null; email: string };
}

export default function PlatformBlogPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchPosts() {
    try {
      const res = await fetch('/api/platform/blog');
      const data = await res.json();
      if (data.success) {
        setPosts(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch posts:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchPosts();
  }, []);

  async function handleDelete(id: string, title: string) {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;

    try {
      const res = await fetch(`/api/platform/blog/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setPosts((prev) => prev.filter((p) => p.id !== id));
      }
    } catch (err) {
      console.error('Failed to delete post:', err);
    }
  }

  async function handleTogglePublish(id: string, currentlyPublished: boolean) {
    try {
      const res = await fetch(`/api/platform/blog/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ published: !currentlyPublished }),
      });
      const data = await res.json();
      if (data.success) {
        setPosts((prev) =>
          prev.map((p) =>
            p.id === id
              ? { ...p, published: !currentlyPublished, publishedAt: data.data.publishedAt }
              : p
          )
        );
      }
    } catch (err) {
      console.error('Failed to toggle publish:', err);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Blog Posts</h1>
        <Link href="/platform/blog/new">
          <Button size="sm">
            <Plus className="h-4 w-4 mr-1" /> New Post
          </Button>
        </Link>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="h-16 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : posts.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <FileText className="h-8 w-8 mx-auto text-gray-400 mb-2" />
            <p className="text-gray-500">No blog posts yet</p>
            <Link href="/platform/blog/new">
              <Button variant="ghost" className="mt-2" size="sm">
                <Plus className="h-4 w-4 mr-1" /> Write your first post
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {posts.map((post) => (
            <Card key={post.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-gray-900 dark:text-white truncate">
                        {post.title}
                      </h3>
                      {post.published ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400 shrink-0">
                          <Globe className="h-3 w-3" /> Published
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 shrink-0">
                          <EyeOff className="h-3 w-3" /> Draft
                        </span>
                      )}
                    </div>
                    {post.excerpt && (
                      <p className="text-sm text-gray-500 mt-1 line-clamp-1">
                        {post.excerpt}
                      </p>
                    )}
                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                      <span>/blog/{post.slug}</span>
                      <span>by {post.author.name || post.author.email}</span>
                      <span>
                        {post.publishedAt
                          ? `Published ${new Date(post.publishedAt).toLocaleDateString()}`
                          : `Created ${new Date(post.createdAt).toLocaleDateString()}`}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {post.published && (
                      <Link href={`/blog/${post.slug}`} target="_blank">
                        <Button variant="ghost" size="sm" title="View live">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleTogglePublish(post.id, post.published)}
                      title={post.published ? 'Unpublish' : 'Publish'}
                    >
                      {post.published ? <EyeOff className="h-4 w-4" /> : <Globe className="h-4 w-4" />}
                    </Button>
                    <Link href={`/platform/blog/${post.id}`}>
                      <Button variant="ghost" size="sm" title="Edit">
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(post.id, post.title)}
                      className="text-red-500 hover:text-red-700"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

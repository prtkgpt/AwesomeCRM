'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Save, Globe, EyeOff, Eye } from 'lucide-react';

export default function EditBlogPostPage() {
  const params = useParams();
  const router = useRouter();
  const postId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [content, setContent] = useState('');
  const [coverImage, setCoverImage] = useState('');
  const [metaTitle, setMetaTitle] = useState('');
  const [metaDescription, setMetaDescription] = useState('');
  const [published, setPublished] = useState(false);

  useEffect(() => {
    async function fetchPost() {
      try {
        const res = await fetch(`/api/platform/blog/${postId}`);
        const data = await res.json();
        if (data.success) {
          const post = data.data;
          setTitle(post.title);
          setSlug(post.slug);
          setExcerpt(post.excerpt || '');
          setContent(post.content);
          setCoverImage(post.coverImage || '');
          setMetaTitle(post.metaTitle || '');
          setMetaDescription(post.metaDescription || '');
          setPublished(post.published);
        }
      } catch (err) {
        console.error('Failed to fetch post:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchPost();
  }, [postId]);

  async function handleSave(newPublished?: boolean) {
    setError('');
    setSuccess('');
    setSaving(true);

    const publishState = newPublished !== undefined ? newPublished : published;

    try {
      const res = await fetch(`/api/platform/blog/${postId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          slug,
          excerpt: excerpt || null,
          content,
          coverImage: coverImage || null,
          metaTitle: metaTitle || null,
          metaDescription: metaDescription || null,
          published: publishState,
        }),
      });
      const data = await res.json();

      if (!data.success) {
        setError(data.error || 'Failed to save post');
        return;
      }

      setPublished(publishState);
      setSuccess('Post saved');
    } catch (err) {
      setError('An error occurred');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
        <div className="h-96 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/platform/blog">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Edit Post</h1>
        {published && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400">
            <Globe className="h-3 w-3" /> Published
          </span>
        )}
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400 text-sm p-3 rounded-lg border border-red-200 dark:border-red-800">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400 text-sm p-3 rounded-lg border border-green-200 dark:border-green-800">
          {success}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Editor */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardContent className="p-4 space-y-4">
              <div>
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="text-lg font-medium"
                />
              </div>
              <div>
                <Label htmlFor="slug">URL Slug *</Label>
                <div className="flex items-center gap-1">
                  <span className="text-sm text-gray-500 shrink-0">cleandaycrm.com/blog/</span>
                  <Input
                    id="slug"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="excerpt">Excerpt</Label>
                <textarea
                  id="excerpt"
                  value={excerpt}
                  onChange={(e) => setExcerpt(e.target.value)}
                  rows={2}
                  className="w-full rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <Label htmlFor="content">Content * (HTML or Markdown)</Label>
                <textarea
                  id="content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={20}
                  className="w-full rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm font-mono"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                onClick={() => handleSave()}
                disabled={saving || !title || !slug || !content}
                variant="outline"
                className="w-full"
                size="sm"
              >
                <Save className="h-4 w-4 mr-1" />
                {saving ? 'Saving...' : 'Save'}
              </Button>
              {published ? (
                <Button
                  onClick={() => handleSave(false)}
                  disabled={saving}
                  variant="outline"
                  className="w-full"
                  size="sm"
                >
                  <EyeOff className="h-4 w-4 mr-1" /> Unpublish
                </Button>
              ) : (
                <Button
                  onClick={() => handleSave(true)}
                  disabled={saving || !title || !slug || !content}
                  className="w-full"
                  size="sm"
                >
                  <Globe className="h-4 w-4 mr-1" /> Publish
                </Button>
              )}
              {published && (
                <Link href={`/blog/${slug}`} target="_blank" className="block">
                  <Button variant="ghost" className="w-full" size="sm">
                    <Eye className="h-4 w-4 mr-1" /> View Live
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>

          {/* Cover Image */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Cover Image</CardTitle>
            </CardHeader>
            <CardContent>
              <Input
                value={coverImage}
                onChange={(e) => setCoverImage(e.target.value)}
                placeholder="https://example.com/image.jpg"
              />
              {coverImage && (
                <img
                  src={coverImage}
                  alt="Cover preview"
                  className="mt-2 rounded-lg w-full h-32 object-cover"
                />
              )}
            </CardContent>
          </Card>

          {/* SEO */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">SEO</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label htmlFor="metaTitle" className="text-xs">Meta Title</Label>
                <Input
                  id="metaTitle"
                  value={metaTitle}
                  onChange={(e) => setMetaTitle(e.target.value)}
                  placeholder="Custom page title for search engines"
                />
                <p className="text-xs text-gray-400 mt-1">
                  {(metaTitle || title).length}/60 characters
                </p>
              </div>
              <div>
                <Label htmlFor="metaDescription" className="text-xs">Meta Description</Label>
                <textarea
                  id="metaDescription"
                  value={metaDescription}
                  onChange={(e) => setMetaDescription(e.target.value)}
                  placeholder="Description shown in search results"
                  rows={3}
                  className="w-full rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
                />
                <p className="text-xs text-gray-400 mt-1">
                  {(metaDescription || excerpt).length}/160 characters
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

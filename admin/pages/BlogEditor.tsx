import React, { useState } from 'react';
import Markdown from 'react-markdown';
import { Sparkles } from 'lucide-react';
import { adminService, BlogPostAdmin } from '../../src/services/adminService';
import { supabase } from '../../src/services/supabaseService';
import '../../src/pages/Blog.css';

const CATEGORIES = [
  { value: 'general', label: 'General' },
  { value: 'gear', label: 'Gear' },
  { value: 'collecting', label: 'Collecting' },
  { value: 'culture', label: 'Culture' },
  { value: 'how-to', label: 'How-To' },
  { value: 'news', label: 'News' },
  { value: 'reviews', label: 'Reviews' },
] as const;

type ScheduleStatus = 'draft' | 'published' | 'scheduled';

function getDefaultScheduleDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(9, 0, 0, 0);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function toDatetimeLocal(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function getInitialScheduleStatus(post?: BlogPostAdmin): ScheduleStatus {
  if (!post) return 'draft';
  if (post.status === 'published') return 'published';
  if (post.status === 'draft' && post.published_at) return 'scheduled';
  return 'draft';
}

interface BlogEditorProps {
  post?: BlogPostAdmin;
  onSave: () => void;
  onCancel: () => void;
}

const BlogEditor: React.FC<BlogEditorProps> = ({ post, onSave, onCancel }) => {
  const [title, setTitle] = useState(post?.title || '');
  const [excerpt, setExcerpt] = useState(post?.excerpt || '');
  const [body, setBody] = useState(post?.body || '');
  const [tags, setTags] = useState<string[]>(post?.tags || []);
  const [tagInput, setTagInput] = useState('');
  const [author, setAuthor] = useState(post?.author || 'Rekkrd');
  const [category, setCategory] = useState((post as any)?.category || 'general');
  const [featuredImage, setFeaturedImage] = useState(post?.featured_image || '');
  const [scheduleStatus, setScheduleStatus] = useState<ScheduleStatus>(getInitialScheduleStatus(post));
  const [scheduledDate, setScheduledDate] = useState(
    post?.published_at && post.status === 'draft' ? toDatetimeLocal(post.published_at) : getDefaultScheduleDate()
  );
  const [saving, setSaving] = useState(false);
  const [generatingImage, setGeneratingImage] = useState(false);
  const [imagePrompt, setImagePrompt] = useState<string | null>(null);
  const [showImageUrl, setShowImageUrl] = useState(false);
  const [showImagePrompt, setShowImagePrompt] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ text: string; isError: boolean } | null>(null);

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const value = tagInput.trim().replace(/,/g, '');
      if (value && !tags.includes(value)) {
        setTags(prev => [...prev, value]);
      }
      setTagInput('');
    }
  };

  const handleTagBlur = () => {
    const value = tagInput.trim().replace(/,/g, '');
    if (value && !tags.includes(value)) {
      setTags(prev => [...prev, value]);
    }
    setTagInput('');
  };

  const removeTag = (tag: string) => {
    setTags(prev => prev.filter(t => t !== tag));
  };

  const handleSave = async () => {
    if (!title.trim() || !body.trim()) return;
    setSaving(true);
    setStatusMsg(null);

    const formData: Record<string, unknown> = {
      title: title.trim(),
      body: body,
      excerpt: excerpt.trim() || undefined,
      featured_image: featuredImage.trim() || undefined,
      tags,
      author: author.trim() || 'Rekkrd',
      category,
      status: scheduleStatus === 'published' ? 'published' : 'draft',
      published_at:
        scheduleStatus === 'published'
          ? new Date().toISOString()
          : scheduleStatus === 'scheduled'
            ? new Date(scheduledDate).toISOString()
            : null,
    };

    try {
      if (post) {
        await adminService.updateBlogPost(post.id, formData as any);
      } else {
        await adminService.createBlogPost(formData as any);
      }
      setStatusMsg({ text: post ? 'Post updated successfully.' : 'Post created successfully.', isError: false });
      setTimeout(() => onSave(), 600);
    } catch (err) {
      setStatusMsg({ text: err instanceof Error ? err.message : 'Failed to save post', isError: true });
      setSaving(false);
    }
  };

  const handleGenerateImage = async () => {
    if (!post) return;
    setGeneratingImage(true);
    setStatusMsg(null);
    setImagePrompt(null);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (supabase) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          headers['Authorization'] = `Bearer ${session.access_token}`;
        }
      }
      const resp = await fetch('/api/blog/generate-image', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          post_id: post.id,
          title: title,
          excerpt: excerpt,
        }),
      });
      if (!resp.ok) throw new Error(`Image generation failed: ${resp.status}`);
      const data = await resp.json();
      setFeaturedImage(data.featured_image);
      if (data.image_prompt) setImagePrompt(data.image_prompt);
      setStatusMsg({ text: 'Hero image generated successfully.', isError: false });
    } catch (err) {
      setStatusMsg({ text: err instanceof Error ? err.message : 'Failed to generate image', isError: true });
    } finally {
      setGeneratingImage(false);
    }
  };

  const inputClass = 'w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-[rgb(99,102,241)] focus:ring-opacity-20 focus:border-[rgb(99,102,241)]';

  return (
    <div className="rounded-xl border mb-6" style={{ backgroundColor: 'rgb(255,255,255)', borderColor: 'rgb(229,231,235)' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'rgb(229,231,235)' }}>
        <h3 className="text-sm font-semibold" style={{ color: 'rgb(17,24,39)' }}>
          {post ? `Editing: ${post.title}` : 'New Post'}
        </h3>
        <div className="flex items-center gap-2">
          <button
            onClick={onCancel}
            className="text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
            style={{ backgroundColor: 'rgb(243,244,246)', color: 'rgb(107,114,128)' }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !title.trim() || !body.trim()}
            className="text-xs font-medium px-4 py-1.5 rounded-lg text-white transition-colors disabled:opacity-50 flex items-center gap-1.5"
            style={{ backgroundColor: 'rgb(99,102,241)' }}
          >
            {saving && (
              <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
            )}
            {saving ? 'Saving...' : (post ? 'Update' : 'Create')}
          </button>
        </div>
      </div>

      {/* Status message */}
      {statusMsg && (
        <div
          className="mx-6 mt-4 rounded-lg px-4 py-3 text-sm"
          style={{
            backgroundColor: statusMsg.isError ? 'rgb(254,242,242)' : 'rgb(240,253,244)',
            color: statusMsg.isError ? 'rgb(239,68,68)' : 'rgb(22,163,74)',
          }}
        >
          {statusMsg.text}
        </div>
      )}

      <div className="p-6">
        {/* Meta fields */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          {/* Title */}
          <div className="lg:col-span-2">
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgb(107,114,128)' }}>
              Title <span style={{ color: 'rgb(239,68,68)' }}>*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Post title"
              className={inputClass}
              style={{ borderColor: 'rgb(229,231,235)' }}
            />
          </div>

          {/* Excerpt */}
          <div className="lg:col-span-2">
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgb(107,114,128)' }}>Excerpt</label>
            <input
              type="text"
              value={excerpt}
              onChange={e => setExcerpt(e.target.value)}
              placeholder="Short summary for blog cards"
              className={inputClass}
              style={{ borderColor: 'rgb(229,231,235)' }}
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgb(107,114,128)' }}>Category</label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              className={inputClass}
              style={{ borderColor: 'rgb(229,231,235)' }}
              aria-label="Post category"
            >
              {CATEGORIES.map(c => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>

          {/* Author */}
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgb(107,114,128)' }}>Author</label>
            <input
              type="text"
              value={author}
              onChange={e => setAuthor(e.target.value)}
              placeholder="Rekkrd"
              className={inputClass}
              style={{ borderColor: 'rgb(229,231,235)' }}
            />
          </div>

          {/* Status */}
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgb(107,114,128)' }}>Status</label>
            <select
              value={scheduleStatus}
              onChange={e => setScheduleStatus(e.target.value as ScheduleStatus)}
              className={inputClass}
              style={{ borderColor: 'rgb(229,231,235)' }}
            >
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="scheduled">Scheduled</option>
            </select>
            {scheduleStatus === 'scheduled' && (
              <div className="mt-3">
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgb(107,114,128)' }}>Publish Date</label>
                <input
                  type="datetime-local"
                  value={scheduledDate}
                  onChange={e => setScheduledDate(e.target.value)}
                  className={inputClass}
                  style={{ borderColor: 'rgb(229,231,235)' }}
                  aria-label="Scheduled publish date"
                />
                <p className="text-xs mt-1.5" style={{ color: 'rgb(156,163,175)' }}>
                  Scheduled posts will be published automatically at the selected time.
                </p>
              </div>
            )}
          </div>

          {/* Hero Image */}
          <div className="lg:col-span-2">
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgb(107,114,128)' }}>Hero Image</label>
            {featuredImage ? (
              <div>
                <img
                  src={featuredImage.replace(/^=+/, '')}
                  alt={`Hero image for ${title || 'blog post'}`}
                  className="w-full rounded-lg object-cover border mb-3"
                  style={{ aspectRatio: '16/9', maxWidth: '100%', borderColor: 'rgb(229,231,235)' }}
                  loading="lazy"
                  onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleGenerateImage}
                    disabled={generatingImage || !post}
                    title={!post ? 'Save as draft first to generate an image' : undefined}
                    aria-label="Generate hero image with AI"
                    className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg text-white transition-colors disabled:opacity-50"
                    style={{ backgroundColor: 'rgb(99,102,241)' }}
                  >
                    {generatingImage ? (
                      <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5" />
                    )}
                    {generatingImage ? 'Generating hero image...' : 'Generate Hero Image'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowImageUrl(v => !v)}
                    className="text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
                    style={{ backgroundColor: 'rgb(243,244,246)', color: 'rgb(107,114,128)' }}
                  >
                    {showImageUrl ? 'Hide URL' : 'Edit URL'}
                  </button>
                </div>
              </div>
            ) : (
              <div
                className="w-full rounded-lg flex flex-col items-center justify-center gap-3 border-2 border-dashed"
                style={{ aspectRatio: '16/9', maxWidth: '100%', borderColor: 'rgb(209,213,219)', backgroundColor: 'rgb(249,250,251)' }}
              >
                <button
                  type="button"
                  onClick={handleGenerateImage}
                  disabled={generatingImage || !post}
                  title={!post ? 'Save as draft first to generate an image' : undefined}
                  aria-label="Generate hero image with AI"
                  className="inline-flex items-center gap-1.5 text-xs font-medium px-4 py-2 rounded-lg text-white transition-colors disabled:opacity-50"
                  style={{ backgroundColor: 'rgb(99,102,241)' }}
                >
                  {generatingImage ? (
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5" />
                  )}
                  {generatingImage ? 'Generating hero image...' : 'Generate Hero Image'}
                </button>
                {!post && (
                  <p className="text-xs" style={{ color: 'rgb(156,163,175)' }}>Save as draft first to generate an image</p>
                )}
                <button
                  type="button"
                  onClick={() => setShowImageUrl(v => !v)}
                  className="text-xs font-medium transition-colors"
                  style={{ color: 'rgb(107,114,128)' }}
                >
                  {showImageUrl ? 'Hide URL input' : 'Or enter URL manually'}
                </button>
              </div>
            )}

            {/* Collapsible URL input */}
            {showImageUrl && (
              <div className="mt-2">
                <input
                  type="text"
                  value={featuredImage}
                  onChange={e => setFeaturedImage(e.target.value)}
                  placeholder="https://example.com/image.jpg"
                  className={inputClass}
                  style={{ borderColor: 'rgb(229,231,235)' }}
                />
              </div>
            )}

            {/* Collapsible image prompt */}
            {imagePrompt && (
              <div className="mt-2">
                <button
                  type="button"
                  onClick={() => setShowImagePrompt(v => !v)}
                  className="text-xs font-medium transition-colors"
                  style={{ color: 'rgb(107,114,128)' }}
                >
                  {showImagePrompt ? 'Hide prompt' : 'Show image prompt'}
                </button>
                {showImagePrompt && (
                  <p className="mt-1 text-xs rounded-lg px-3 py-2" style={{ backgroundColor: 'rgb(249,250,251)', color: 'rgb(107,114,128)' }}>
                    {imagePrompt}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Tags */}
          <div className="lg:col-span-2">
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgb(107,114,128)' }}>Tags</label>
            <input
              type="text"
              value={tagInput}
              onChange={e => setTagInput(e.target.value)}
              onKeyDown={handleTagKeyDown}
              onBlur={handleTagBlur}
              placeholder="Type a tag and press Enter or comma"
              className={inputClass}
              style={{ borderColor: 'rgb(229,231,235)' }}
            />
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {tags.map(tag => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium"
                    style={{ backgroundColor: 'rgb(238,242,255)', color: 'rgb(99,102,241)' }}
                  >
                    {tag}
                    <button
                      onClick={() => removeTag(tag)}
                      className="hover:text-[rgb(239,68,68)] transition-colors"
                      type="button"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Body editor + preview split */}
        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgb(107,114,128)' }}>
            Body (Markdown) <span style={{ color: 'rgb(239,68,68)' }}>*</span>
          </label>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Editor */}
            <div>
              <textarea
                value={body}
                onChange={e => setBody(e.target.value)}
                placeholder="Write your post in Markdown..."
                className={`${inputClass} font-mono text-xs resize-y`}
                style={{ borderColor: 'rgb(229,231,235)', minHeight: 400 }}
              />
            </div>

            {/* Live preview */}
            <div
              className="rounded-lg border overflow-auto blog-page"
              style={{ borderColor: 'rgb(229,231,235)', minHeight: 400, maxHeight: 600, padding: '20px 24px' }}
            >
              {body.trim() ? (
                <div className="blog-post-body">
                  <Markdown>{body}</Markdown>
                </div>
              ) : (
                <p className="text-sm" style={{ color: 'rgb(156,163,175)' }}>
                  Markdown preview will appear here as you type...
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BlogEditor;

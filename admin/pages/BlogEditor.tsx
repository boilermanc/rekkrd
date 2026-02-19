import React, { useState } from 'react';
import Markdown from 'react-markdown';
import { adminService, BlogPostAdmin } from '../../services/adminService';
import '../../pages/Blog.css';

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
  const [featuredImage, setFeaturedImage] = useState(post?.featured_image || '');
  const [status, setStatus] = useState<'draft' | 'published'>(post?.status || 'draft');
  const [saving, setSaving] = useState(false);
  const [generatingImage, setGeneratingImage] = useState(false);
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

    const formData = {
      title: title.trim(),
      body: body,
      excerpt: excerpt.trim() || undefined,
      featured_image: featuredImage.trim() || undefined,
      tags,
      author: author.trim() || 'Rekkrd',
      status,
    };

    try {
      if (post) {
        await adminService.updateBlogPost(post.id, formData);
      } else {
        await adminService.createBlogPost(formData);
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
    try {
      const resp = await fetch('https://n8n.sproutify.app/webhook/blog-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          post_id: post.id,
          title: post.title,
          slug: post.slug,
          excerpt: post.excerpt,
        }),
      });
      if (!resp.ok) throw new Error(`Webhook returned ${resp.status}`);
      setStatusMsg({ text: 'Image generation started — it may take 30–60 seconds to appear.', isError: false });
    } catch (err) {
      setStatusMsg({ text: err instanceof Error ? err.message : 'Failed to trigger image generation', isError: true });
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
              value={status}
              onChange={e => setStatus(e.target.value as 'draft' | 'published')}
              className={inputClass}
              style={{ borderColor: 'rgb(229,231,235)' }}
            >
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </select>
          </div>

          {/* Featured Image URL */}
          <div className="lg:col-span-2">
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgb(107,114,128)' }}>Featured Image URL</label>
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={featuredImage}
                onChange={e => setFeaturedImage(e.target.value)}
                placeholder="https://example.com/image.jpg"
                className={`${inputClass} flex-1`}
                style={{ borderColor: 'rgb(229,231,235)' }}
              />
              {featuredImage && (
                <img
                  src={featuredImage}
                  alt="Preview"
                  className="w-10 h-10 rounded-lg object-cover shrink-0 border"
                  style={{ borderColor: 'rgb(229,231,235)' }}
                  loading="lazy"
                  onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              )}
            </div>
          </div>

          {/* Image preview & generate */}
          {post && (
            <div className="lg:col-span-2">
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgb(107,114,128)' }}>Image</label>
              {featuredImage ? (
                <div className="flex items-start gap-3">
                  <img
                    src={featuredImage.replace(/^=+/, '')}
                    alt={`Hero image for ${title}`}
                    className="rounded-lg object-cover border"
                    style={{ maxHeight: 200, maxWidth: '100%', borderColor: 'rgb(229,231,235)' }}
                    loading="lazy"
                    onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                  <button
                    type="button"
                    onClick={handleGenerateImage}
                    disabled={generatingImage}
                    aria-label="Regenerate blog image"
                    className="shrink-0 inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                    style={{ backgroundColor: 'rgb(243,244,246)', color: 'rgb(107,114,128)' }}
                  >
                    {generatingImage ? (
                      <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    )}
                    {generatingImage ? 'Generating...' : 'Regenerate'}
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleGenerateImage}
                  disabled={generatingImage}
                  aria-label="Regenerate blog image"
                  className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg text-white transition-colors disabled:opacity-50"
                  style={{ backgroundColor: 'rgb(99,102,241)' }}
                >
                  {generatingImage ? (
                    <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  )}
                  {generatingImage ? 'Generating...' : 'Generate Image'}
                </button>
              )}
            </div>
          )}

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

import React, { useEffect, useState, useCallback } from 'react';
import { adminService, BlogPostAdmin, BlogIdeaAdmin } from '../../services/adminService';
import BlogEditor from './BlogEditor';
import BlogIdeaForm from './BlogIdeaForm';

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

const IDEA_STATUS_STYLES: Record<string, { bg: string; color: string }> = {
  pending:      { bg: 'rgb(243,244,246)', color: 'rgb(107,114,128)' },
  options_sent: { bg: 'rgb(219,234,254)', color: 'rgb(37,99,235)' },
  draft_ready:  { bg: 'rgb(254,243,199)', color: 'rgb(161,98,7)' },
  approved:     { bg: 'rgb(240,253,244)', color: 'rgb(22,163,74)' },
  published:    { bg: 'rgb(240,253,244)', color: 'rgb(22,163,74)' },
  rejected:     { bg: 'rgb(254,242,242)', color: 'rgb(239,68,68)' },
};

function IdeaStatusBadge({ status }: { status: string }) {
  const style = IDEA_STATUS_STYLES[status] || IDEA_STATUS_STYLES.pending;
  return (
    <span
      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
      style={{ backgroundColor: style.bg, color: style.color }}
    >
      {status.replace(/_/g, ' ')}
    </span>
  );
}

const BlogPage: React.FC = () => {
  const [posts, setPosts] = useState<BlogPostAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusMsg, setStatusMsg] = useState<{ text: string; isError: boolean } | null>(null);

  // Editor state for Task 4 to consume
  const [editingPost, setEditingPost] = useState<BlogPostAdmin | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Ideas state
  const [ideas, setIdeas] = useState<BlogIdeaAdmin[]>([]);

  // Delete confirmation
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const refreshIdeas = useCallback(() => {
    adminService.getBlogIdeas()
      .then(setIdeas)
      .catch(err => console.error('Failed to load blog ideas:', err));
  }, []);

  useEffect(() => {
    Promise.all([
      adminService.getBlogPosts().then(setPosts),
      adminService.getBlogIdeas().then(setIdeas),
    ])
      .catch(err => console.error('Failed to load blog data:', err))
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id: string) => {
    setDeleteLoading(true);
    try {
      await adminService.deleteBlogPost(id);
      setPosts(prev => prev.filter(p => p.id !== id));
      setStatusMsg({ text: 'Post deleted successfully.', isError: false });
      if (editingPost?.id === id) {
        setEditingPost(null);
      }
    } catch (err) {
      setStatusMsg({ text: err instanceof Error ? err.message : 'Failed to delete post', isError: true });
    } finally {
      setDeletingId(null);
      setDeleteLoading(false);
      setTimeout(() => setStatusMsg(null), 4000);
    }
  };

  const refreshPosts = useCallback(() => {
    adminService.getBlogPosts()
      .then(setPosts)
      .catch(err => console.error('Failed to refresh blog posts:', err));
  }, []);

  const handleNewPost = () => {
    setEditingPost(null);
    setIsCreating(true);
  };

  const handleEditPost = (post: BlogPostAdmin) => {
    setIsCreating(false);
    setEditingPost(post);
  };

  const handleEditorSave = () => {
    setIsCreating(false);
    setEditingPost(null);
    refreshPosts();
  };

  const handleEditorCancel = () => {
    setIsCreating(false);
    setEditingPost(null);
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="w-6 h-6 border-2 border-[rgb(99,102,241)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: 'rgb(17,24,39)' }}>Blog Management</h1>
          <p className="text-sm mt-1" style={{ color: 'rgb(107,114,128)' }}>
            {posts.length} post{posts.length !== 1 ? 's' : ''} total
          </p>
        </div>
        <button
          onClick={handleNewPost}
          className="flex items-center gap-2 text-sm font-medium px-4 py-2.5 rounded-lg text-white transition-colors"
          style={{ backgroundColor: 'rgb(99,102,241)' }}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Post
        </button>
      </div>

      {/* Status message */}
      {statusMsg && (
        <div
          className="rounded-lg px-4 py-3 text-sm mb-4"
          style={{
            backgroundColor: statusMsg.isError ? 'rgb(254,242,242)' : 'rgb(240,253,244)',
            color: statusMsg.isError ? 'rgb(239,68,68)' : 'rgb(22,163,74)',
          }}
        >
          {statusMsg.text}
        </div>
      )}

      {/* Blog Idea Quick Submit */}
      <BlogIdeaForm onSubmitted={refreshIdeas} />

      {/* Blog Editor */}
      {(isCreating || editingPost) && (
        <BlogEditor
          key={editingPost?.id || 'new'}
          post={editingPost || undefined}
          onSave={handleEditorSave}
          onCancel={handleEditorCancel}
        />
      )}

      {/* Posts table */}
      <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: 'rgb(255,255,255)', borderColor: 'rgb(229,231,235)' }}>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b" style={{ borderColor: 'rgb(229,231,235)', backgroundColor: 'rgb(249,250,251)' }}>
              <th className="text-left px-5 py-3 font-medium" style={{ color: 'rgb(107,114,128)' }}>Title</th>
              <th className="text-left px-5 py-3 font-medium" style={{ color: 'rgb(107,114,128)' }}>Status</th>
              <th className="text-left px-5 py-3 font-medium hidden md:table-cell" style={{ color: 'rgb(107,114,128)' }}>Author</th>
              <th className="text-left px-5 py-3 font-medium hidden lg:table-cell" style={{ color: 'rgb(107,114,128)' }}>Published</th>
              <th className="text-left px-5 py-3 font-medium hidden lg:table-cell" style={{ color: 'rgb(107,114,128)' }}>Updated</th>
              <th className="text-right px-5 py-3 font-medium" style={{ color: 'rgb(107,114,128)' }}>Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y" style={{ borderColor: 'rgb(243,244,246)' }}>
            {posts.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-12 text-center" style={{ color: 'rgb(156,163,175)' }}>
                  No blog posts yet. Click "New Post" to create one.
                </td>
              </tr>
            ) : (
              posts.map(post => (
                <tr key={post.id} className="hover:bg-[rgb(249,250,251)] transition-colors">
                  <td className="px-5 py-3">
                    <div className="min-w-0">
                      <p className="font-medium truncate max-w-[300px]" style={{ color: 'rgb(17,24,39)' }}>
                        {post.title}
                      </p>
                      <p className="text-xs truncate max-w-[300px]" style={{ color: 'rgb(156,163,175)' }}>
                        /{post.slug}
                      </p>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                      style={post.status === 'published' ? {
                        backgroundColor: 'rgb(240,253,244)',
                        color: 'rgb(22,163,74)',
                      } : {
                        backgroundColor: 'rgb(254,252,232)',
                        color: 'rgb(161,98,7)',
                      }}
                    >
                      {post.status === 'published' ? 'Published' : 'Draft'}
                    </span>
                  </td>
                  <td className="px-5 py-3 hidden md:table-cell" style={{ color: 'rgb(107,114,128)' }}>
                    {post.author}
                  </td>
                  <td className="px-5 py-3 hidden lg:table-cell text-xs" style={{ color: 'rgb(156,163,175)' }}>
                    {formatDate(post.published_at)}
                  </td>
                  <td className="px-5 py-3 hidden lg:table-cell text-xs" style={{ color: 'rgb(156,163,175)' }}>
                    {formatDate(post.updated_at)}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => handleEditPost(post)}
                        className="p-1.5 rounded-lg hover:bg-[rgb(238,242,255)] transition-colors"
                        title="Edit post"
                      >
                        <svg className="w-4 h-4" style={{ color: 'rgb(99,102,241)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => setDeletingId(post.id)}
                        className="p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                        title="Delete post"
                      >
                        <svg className="w-4 h-4 text-[rgb(239,68,68)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Recent Ideas */}
      {ideas.length > 0 && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold mb-3" style={{ color: 'rgb(17,24,39)' }}>
            Blog Ideas ({ideas.length})
          </h2>
          <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: 'rgb(255,255,255)', borderColor: 'rgb(229,231,235)' }}>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b" style={{ borderColor: 'rgb(229,231,235)', backgroundColor: 'rgb(249,250,251)' }}>
                  <th className="text-left px-5 py-3 font-medium" style={{ color: 'rgb(107,114,128)' }}>Idea</th>
                  <th className="text-left px-5 py-3 font-medium" style={{ color: 'rgb(107,114,128)' }}>Source</th>
                  <th className="text-left px-5 py-3 font-medium" style={{ color: 'rgb(107,114,128)' }}>Status</th>
                  <th className="text-left px-5 py-3 font-medium hidden md:table-cell" style={{ color: 'rgb(107,114,128)' }}>Date</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: 'rgb(243,244,246)' }}>
                {ideas.map(idea => (
                  <tr key={idea.id} className="hover:bg-[rgb(249,250,251)] transition-colors">
                    <td className="px-5 py-3">
                      <p className="truncate max-w-[400px]" style={{ color: 'rgb(17,24,39)' }}>
                        {idea.idea}
                      </p>
                    </td>
                    <td className="px-5 py-3" style={{ color: 'rgb(107,114,128)' }}>
                      {idea.source}
                    </td>
                    <td className="px-5 py-3">
                      <IdeaStatusBadge status={idea.status} />
                    </td>
                    <td className="px-5 py-3 hidden md:table-cell text-xs" style={{ color: 'rgb(156,163,175)' }}>
                      {formatDate(idea.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Delete confirmation overlay */}
      {deletingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <div className="rounded-xl border p-6 max-w-sm w-full mx-4 shadow-lg" style={{ backgroundColor: 'rgb(255,255,255)', borderColor: 'rgb(229,231,235)' }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: 'rgb(254,242,242)' }}>
                <svg className="w-5 h-5 text-[rgb(239,68,68)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.072 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-semibold" style={{ color: 'rgb(17,24,39)' }}>Delete post?</h3>
                <p className="text-xs mt-0.5" style={{ color: 'rgb(107,114,128)' }}>
                  This action cannot be undone. The post will be permanently removed.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setDeletingId(null)}
                disabled={deleteLoading}
                className="text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                style={{ backgroundColor: 'rgb(243,244,246)', color: 'rgb(107,114,128)' }}
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deletingId)}
                disabled={deleteLoading}
                className="text-sm font-medium px-4 py-2 rounded-lg text-white transition-colors disabled:opacity-50 flex items-center gap-2"
                style={{ backgroundColor: 'rgb(239,68,68)' }}
              >
                {deleteLoading && (
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                )}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BlogPage;

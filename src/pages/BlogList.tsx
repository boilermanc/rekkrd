import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import SEO from '../components/SEO';
import { useAuthContext } from '../contexts/AuthContext';
import BlogFilterBar from '../components/blog/BlogFilterBar';
import './Blog.css';

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  featured_image: string | null;
  tags: string[];
  author: string;
  published_at: string;
}

interface BlogResponse {
  posts: BlogPost[];
  total: number;
}

const PAGE_SIZE = 9;

const API_BASE = import.meta.env.VITE_API_URL || '';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max).replace(/\s+\S*$/, '') + '…';
}

const BlogList: React.FC = () => {
  const { user } = useAuthContext();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter state
  const [categories, setCategories] = useState<{ category: string; count: number }[]>([]);
  const [popularTags, setPopularTags] = useState<{ tag: string; count: number }[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch filter options on mount
  useEffect(() => {
    fetch(`${API_BASE}/api/blog/categories`)
      .then(res => res.ok ? res.json() : { categories: [] })
      .then(data => setCategories(data.categories || []))
      .catch(() => {});

    fetch(`${API_BASE}/api/blog/tags`)
      .then(res => res.ok ? res.json() : { tags: [] })
      .then(data => setPopularTags(data.tags || []))
      .catch(() => {});
  }, []);

  // Reset to page 1 when filters change
  const handleCategoryChange = useCallback((cat: string | null) => {
    setActiveCategory(cat);
    setPage(1);
  }, []);

  const handleTagChange = useCallback((tag: string | null) => {
    setActiveTag(tag);
    setPage(1);
  }, []);

  const handleSearchChange = useCallback((query: string) => {
    setSearchQuery(query);
    setPage(1);
  }, []);

  const hasActiveFilters = activeCategory !== null || activeTag !== null || searchQuery !== '';

  function clearFilters() {
    setActiveCategory(null);
    setActiveTag(null);
    setSearchQuery('');
    setPage(1);
  }

  // Fetch posts when page or filters change
  useEffect(() => {
    setLoading(true);
    setError(null);
    const offset = (page - 1) * PAGE_SIZE;
    const params = new URLSearchParams();
    params.set('limit', String(PAGE_SIZE));
    params.set('offset', String(offset));
    if (activeCategory) params.set('category', activeCategory);
    if (activeTag) params.set('tag', activeTag);
    if (searchQuery) params.set('search', searchQuery);

    fetch(`${API_BASE}/api/blog?${params.toString()}`)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data: BlogResponse) => {
        setPosts(data.posts);
        setTotal(data.total);
      })
      .catch(err => {
        setError(err.message || 'Failed to load posts');
      })
      .finally(() => setLoading(false));
  }, [page, activeCategory, activeTag, searchQuery]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="blog-page">
      <SEO
        title="Blog"
        description="Tips, guides, and stories for vinyl collectors and audiophiles."
      />
      {/* Nav */}
      <nav className="nav">
        <div className="container">
          <Link to="/" className="nav-logo">
            <svg className="nav-logo-icon" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="11" fill="#2d3a3e"/>
              <circle cx="12" cy="12" r="9.5" fill="none" stroke="#d48a6a" strokeWidth="0.4" opacity="0.5"/>
              <circle cx="12" cy="12" r="8" fill="none" stroke="#d48a6a" strokeWidth="0.3" opacity="0.4"/>
              <circle cx="12" cy="12" r="6.5" fill="none" stroke="#d48a6a" strokeWidth="0.3" opacity="0.3"/>
              <circle cx="12" cy="12" r="5.2" fill="#c45a30"/>
              <text x="12" y="12.5" textAnchor="middle" dominantBaseline="central" fontFamily="Georgia,serif" fontWeight="bold" fontSize="7" fill="#f0a882">R</text>
            </svg>
            <span>Rekk<span>r</span>d</span>
          </Link>
          <div className="nav-links">
            <Link to="/">{user ? 'My Collection' : 'Home'}</Link>
            <Link to="/blog">Blog</Link>
          </div>
        </div>
      </nav>

      {/* Header */}
      <header className="blog-header">
        <div className="container">
          <p className="section-label">From the Crate</p>
          <h1>The Rekk<span style={{ color: 'var(--peach-dark)' }}>r</span>d Blog</h1>
          <p>Stories, tips, and deep cuts from the world of vinyl collecting.</p>
        </div>
      </header>

      {/* Content */}
      <main className="container">
        <BlogFilterBar
          categories={categories}
          popularTags={popularTags}
          activeCategory={activeCategory}
          activeTag={activeTag}
          searchQuery={searchQuery}
          onCategoryChange={handleCategoryChange}
          onTagChange={handleTagChange}
          onSearchChange={handleSearchChange}
        />

        {loading ? (
          <div className="blog-loading">
            <div className="blog-spinner" />
            <p>Loading posts…</p>
          </div>
        ) : error ? (
          <div className="blog-empty">
            <h2>Something went wrong</h2>
            <p>{error}</p>
          </div>
        ) : posts.length === 0 ? (
          <div className="blog-empty">
            <h2>No posts found</h2>
            {hasActiveFilters ? (
              <>
                <p>No articles match your current filters.</p>
                <button
                  onClick={clearFilters}
                  style={{
                    marginTop: '12px',
                    padding: '8px 20px',
                    background: '#E8927C',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Clear filters
                </button>
              </>
            ) : (
              <p>Check back soon — we're warming up the turntable.</p>
            )}
          </div>
        ) : (
          <>
            {/* Featured latest post — only on page 1 with no filters */}
            {page === 1 && !hasActiveFilters && posts.length > 0 && (() => {
              const featured = posts[0];
              return (
                <Link to={`/blog/${featured.slug}`} className="blog-featured">
                  {featured.featured_image ? (
                    <img
                      className="blog-featured-image"
                      src={featured.featured_image.replace(/^=+/, '')}
                      alt={`Hero image for ${featured.title}`}
                    />
                  ) : (
                    <div className="blog-featured-image blog-card-image-placeholder">
                      <svg viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="256" cy="256" r="250" fill="#f0a882"/>
                        <circle cx="256" cy="256" r="250" fill="none" stroke="#dd6e42" strokeWidth="4" opacity="0.3"/>
                        <circle cx="256" cy="256" r="225" fill="none" stroke="#d48a6a" strokeWidth="2" opacity="0.35"/>
                        <circle cx="256" cy="256" r="200" fill="none" stroke="#d48a6a" strokeWidth="1.5" opacity="0.3"/>
                        <circle cx="256" cy="256" r="175" fill="none" stroke="#d48a6a" strokeWidth="1.5" opacity="0.3"/>
                        <circle cx="256" cy="256" r="150" fill="none" stroke="#d48a6a" strokeWidth="1.5" opacity="0.25"/>
                        <circle cx="256" cy="256" r="120" fill="#c45a30"/>
                        <circle cx="256" cy="256" r="105" fill="none" stroke="#a8481f" strokeWidth="1" opacity="0.3"/>
                        <text x="256" y="264" textAnchor="middle" dominantBaseline="central" fontFamily="Georgia,'Times New Roman',serif" fontWeight="bold" fontSize="140" fill="#f0a882">R</text>
                        <circle cx="256" cy="256" r="12" fill="#f0a882" opacity="0.4"/>
                      </svg>
                    </div>
                  )}
                  <div className="blog-featured-body">
                    <span className="blog-featured-label">Latest</span>
                    <h2>{featured.title}</h2>
                    {featured.excerpt && (
                      <p className="blog-featured-excerpt">{truncate(featured.excerpt, 280)}</p>
                    )}
                    <div className="blog-card-meta">
                      <span className="blog-card-author">{featured.author}</span>
                      <span className="blog-card-date">{formatDate(featured.published_at)}</span>
                    </div>
                    {featured.tags.length > 0 && (
                      <div className="blog-card-tags">
                        {featured.tags.map(tag => (
                          <span key={tag} className="blog-tag">{tag}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </Link>
              );
            })()}

            {/* Remaining posts grid */}
            <div className="blog-grid">
              {(page === 1 && !hasActiveFilters ? posts.slice(1) : posts).map(post => (
                <Link key={post.id} to={`/blog/${post.slug}`} className="blog-card">
                  {post.featured_image ? (
                    <img
                      className="blog-card-image"
                      src={post.featured_image.replace(/^=+/, '')}
                      alt={`Hero image for ${post.title}`}
                      loading="lazy"
                    />
                  ) : (
                    <div className="blog-card-image-placeholder">
                      <svg viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="256" cy="256" r="250" fill="#f0a882"/>
                        <circle cx="256" cy="256" r="250" fill="none" stroke="#dd6e42" strokeWidth="4" opacity="0.3"/>
                        <circle cx="256" cy="256" r="225" fill="none" stroke="#d48a6a" strokeWidth="2" opacity="0.35"/>
                        <circle cx="256" cy="256" r="200" fill="none" stroke="#d48a6a" strokeWidth="1.5" opacity="0.3"/>
                        <circle cx="256" cy="256" r="175" fill="none" stroke="#d48a6a" strokeWidth="1.5" opacity="0.3"/>
                        <circle cx="256" cy="256" r="150" fill="none" stroke="#d48a6a" strokeWidth="1.5" opacity="0.25"/>
                        <circle cx="256" cy="256" r="120" fill="#c45a30"/>
                        <circle cx="256" cy="256" r="105" fill="none" stroke="#a8481f" strokeWidth="1" opacity="0.3"/>
                        <text x="256" y="264" textAnchor="middle" dominantBaseline="central" fontFamily="Georgia,'Times New Roman',serif" fontWeight="bold" fontSize="140" fill="#f0a882">R</text>
                        <circle cx="256" cy="256" r="12" fill="#f0a882" opacity="0.4"/>
                      </svg>
                    </div>
                  )}
                  <div className="blog-card-body">
                    <h2>{post.title}</h2>
                    {post.excerpt && (
                      <p className="blog-card-excerpt">{truncate(post.excerpt, 150)}</p>
                    )}
                    <div className="blog-card-meta">
                      <span className="blog-card-author">{post.author}</span>
                      <span className="blog-card-date">{formatDate(post.published_at)}</span>
                    </div>
                    {post.tags.length > 0 && (
                      <div className="blog-card-tags">
                        {post.tags.map(tag => (
                          <span key={tag} className="blog-tag">{tag}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="blog-pagination">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage(p => p - 1)}
                >
                  ← Previous
                </button>
                <span className="page-info">
                  Page {page} of {totalPages}
                </span>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage(p => p + 1)}
                >
                  Next →
                </button>
              </div>
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="footer">
        <div className="container">
          <div className="footer-bottom">
            <span>© {new Date().getFullYear()} <a href="https://www.sweetwater.technology" target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'none' }}>Sweetwater Technology</a></span>
            <span>
              <Link to="/privacy">Privacy</Link>
              {' · '}
              <Link to="/terms">Terms</Link>
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default BlogList;

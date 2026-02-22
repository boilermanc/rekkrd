import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import SEO from '../components/SEO';
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
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);


  useEffect(() => {
    setLoading(true);
    setError(null);
    const offset = (page - 1) * PAGE_SIZE;
    fetch(`${API_BASE}/api/blog?limit=${PAGE_SIZE}&offset=${offset}`)
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
  }, [page]);

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
            <Link to="/">Home</Link>
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
            <h2>No posts yet</h2>
            <p>Check back soon — we're warming up the turntable.</p>
          </div>
        ) : (
          <>
            <div className="blog-grid">
              {posts.map(post => (
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

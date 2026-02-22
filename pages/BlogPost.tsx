import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import Markdown from 'react-markdown';
import { Helmet } from 'react-helmet-async';
import SEO from '../components/SEO';
import './Blog.css';

interface BlogPostData {
  id: string;
  title: string;
  slug: string;
  body: string;
  excerpt: string | null;
  featured_image: string | null;
  tags: string[];
  author: string;
  published_at: string;
  updated_at?: string;
}

const API_BASE = import.meta.env.VITE_API_URL || '';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

const BlogPost: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [post, setPost] = useState<BlogPostData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    setNotFound(false);
    setError(null);

    fetch(`${API_BASE}/api/blog/${slug}`)
      .then(res => {
        if (res.status === 404) {
          setNotFound(true);
          return null;
        }
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data: BlogPostData | null) => {
        if (data) setPost(data);
      })
      .catch(err => {
        setError(err.message || 'Failed to load post');
      })
      .finally(() => setLoading(false));
  }, [slug]);

  const jsonLd = post ? {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    ...(post.excerpt && { description: post.excerpt }),
    ...(post.featured_image && { image: post.featured_image.replace(/^=+/, '') }),
    datePublished: post.published_at,
    ...(post.updated_at && { dateModified: post.updated_at }),
    author: { '@type': 'Person', name: post.author },
    publisher: { '@type': 'Organization', name: 'Rekkrd' },
  } : null;

  return (
    <div className="blog-page">
      {post ? (
        <SEO
          title={post.title}
          description={post.excerpt || `Read ${post.title} on the Rekkrd blog.`}
          image={post.featured_image || undefined}
          type="article"
        />
      ) : notFound ? (
        <SEO title="Not Found" description="The post you're looking for doesn't exist." />
      ) : null}
      {jsonLd && (
        <Helmet>
          <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
        </Helmet>
      )}
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

      <main className="container">
        {loading ? (
          <div className="blog-loading">
            <div className="blog-spinner" />
            <p>Loading post…</p>
          </div>
        ) : notFound ? (
          <div className="blog-empty">
            <h2>Post not found</h2>
            <p>The post you're looking for doesn't exist or has been removed.</p>
            <Link to="/blog" className="blog-back-link">← Back to Blog</Link>
          </div>
        ) : error ? (
          <div className="blog-empty">
            <h2>Something went wrong</h2>
            <p>{error}</p>
            <Link to="/blog" className="blog-back-link">← Back to Blog</Link>
          </div>
        ) : post ? (
          <article className="blog-post-detail">
            <Link to="/blog" className="blog-back-link">← Back to Blog</Link>

            {post.featured_image && (
              <img
                className="blog-post-hero"
                src={post.featured_image.replace(/^=+/, '')}
                alt={`Hero image for ${post.title}`}
                loading="lazy"
              />
            )}

            <header className="blog-post-header">
              <h1>{post.title}</h1>
              <div className="blog-post-meta">
                <span className="blog-post-author">{post.author}</span>
                <span className="blog-post-meta-sep">·</span>
                <time className="blog-post-date" dateTime={post.published_at}>
                  {formatDate(post.published_at)}
                </time>
              </div>
              {post.tags.length > 0 && (
                <div className="blog-card-tags">
                  {post.tags.map(tag => (
                    <span key={tag} className="blog-tag">{tag}</span>
                  ))}
                </div>
              )}
            </header>

            <div className="blog-post-body">
              <Markdown>{post.body}</Markdown>
            </div>

            <div className="blog-post-footer-nav">
              <Link to="/blog" className="blog-back-link">← Back to Blog</Link>
            </div>
          </article>
        ) : null}
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

export default BlogPost;

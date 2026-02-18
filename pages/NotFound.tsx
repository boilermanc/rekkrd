import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import './Blog.css';

const NotFound: React.FC = () => {
  useEffect(() => {
    document.title = 'Not Found | Rekkrd';
    return () => { document.title = 'Rekkrd'; };
  }, []);

  return (
    <div className="blog-page">
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
        <div className="blog-header" style={{ padding: '96px 0 32px' }}>
          <p className="section-label">404</p>
          <h1>Page Not Found</h1>
          <p>The page you're looking for doesn't exist or has been moved.</p>
        </div>
        <div style={{ textAlign: 'center', paddingBottom: 96, display: 'flex', justifyContent: 'center', gap: 24 }}>
          <Link to="/" className="blog-back-link">← Home</Link>
          <Link to="/blog" className="blog-back-link">Blog →</Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="footer">
        <div className="container">
          <div className="footer-bottom">
            <span>© {new Date().getFullYear()} Rekkrd. All rights reserved.</span>
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

export default NotFound;

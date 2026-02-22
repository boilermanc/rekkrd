import React, { useState, useRef, useEffect, useCallback, FormEvent } from 'react';
import './Landing.css';
import { useAuthContext } from '../contexts/AuthContext';
import { supabase } from '../services/supabaseService';
import { getPageContent } from '../services/contentService';
import { LANDING_DEFAULTS } from '../constants/landingDefaults';
import type { CmsLandingContent } from '../types/cms';
import SEO from '../components/SEO';
import Turnstile from '../components/Turnstile';

interface LandingProps {
  onEnterApp?: () => void;
  scrollToPricing?: boolean;
}

const Check: React.FC = () => (
  <svg viewBox="0 0 24 24" style={{ width: 18, height: 18, stroke: '#dd6e42', fill: 'none', strokeWidth: 2.5 }}>
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const X: React.FC = () => (
  <svg viewBox="0 0 24 24" style={{ width: 18, height: 18, stroke: '#c0d6df', fill: 'none', strokeWidth: 2.5 }}>
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const SmallCheck: React.FC = () => (
  <svg viewBox="0 0 24 24" style={{ width: 14, height: 14, stroke: '#dd6e42', fill: 'none', strokeWidth: 3 }}>
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const Arrow: React.FC = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <path d="M5 12h14M12 5l7 7-7 7" />
  </svg>
);

const PlusIcon: React.FC<{ open: boolean }> = ({ open }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    style={{
      width: 24,
      height: 24,
      flexShrink: 0,
      transition: 'transform .3s',
      color: open ? '#dd6e42' : '#7d9199',
      transform: open ? 'rotate(45deg)' : 'none',
    }}
  >
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

/** Replace plain "Rekkrd" in text with orange-styled brand span */
const brandify = (text: string): React.ReactNode => {
  const parts = text.split('Rekkrd');
  if (parts.length === 1) return text;
  return parts.flatMap((part, i) =>
    i < parts.length - 1
      ? [part, <span key={i} className="brand-name">Rekkrd</span>]
      : [part]
  );
};

const Landing: React.FC<LandingProps> = ({ onEnterApp, scrollToPricing }) => {
  const { user, signOut } = useAuthContext();
  const [isAnnual, setIsAnnual] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  // Latest blog post
  interface LatestPost { id: string; title: string; slug: string; excerpt: string | null; featured_image: string | null; author: string; published_at: string; }
  const [latestPost, setLatestPost] = useState<LatestPost | null>(null);
  const [blogLoading, setBlogLoading] = useState(true);

  useEffect(() => {
    fetch('/api/blog?limit=1')
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.posts?.[0]) setLatestPost(data.posts[0]); })
      .catch(() => {})
      .finally(() => setBlogLoading(false));
  }, []);

  // CMS content with defaults
  const [content, setContent] = useState<CmsLandingContent>({ ...LANDING_DEFAULTS });

  useEffect(() => {
    getPageContent('landing').then(cms => {
      if (Object.keys(cms).length > 0) {
        setContent(prev => {
          const merged = { ...prev };
          for (const key of Object.keys(LANDING_DEFAULTS) as (keyof CmsLandingContent)[]) {
            if (cms[key] !== undefined) {
              (merged as Record<string, unknown>)[key] = cms[key];
            }
          }
          return merged;
        });
      }
    });
  }, []);

  // Dynamic pricing from Stripe
  interface TierPrice { priceId: string; amount: number; currency: string; interval: string; }
  interface PricingData { tiers: Record<string, { monthly?: TierPrice; annual?: TierPrice; name: string }>; }
  const [pricing, setPricing] = useState<PricingData | null>(null);

  useEffect(() => {
    fetch('/api/prices')
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setPricing(data); })
      .catch(() => {});
  }, []);

  // Scroll to pricing section when navigating from upgrade prompt
  useEffect(() => {
    if (scrollToPricing) {
      const el = document.getElementById('pricing');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
  }, [scrollToPricing]);

  // Auth overlay state
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const authRef = useRef<HTMLDivElement>(null);

  const handleTurnstileVerify = useCallback((token: string) => setTurnstileToken(token), []);
  const handleTurnstileExpire = useCallback(() => setTurnstileToken(null), []);

  // Close on outside click
  useEffect(() => {
    if (!showAuth) return;
    const handle = (e: MouseEvent) => {
      if (authRef.current && !authRef.current.contains(e.target as Node)) {
        setShowAuth(false);
      }
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [showAuth]);

  // Close on Escape
  useEffect(() => {
    if (!showAuth) return;
    const handle = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowAuth(false);
    };
    document.addEventListener('keydown', handle);
    return () => document.removeEventListener('keydown', handle);
  }, [showAuth]);

  const openAuthPanel = (mode: 'signin' | 'signup') => {
    setAuthMode(mode);
    setAuthError(null);
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setTurnstileToken(null);
    setShowAuth(true);
  };

  // Auto-open signup panel from /welcome CTA query params
  const queryParamsHandled = useRef(false);
  useEffect(() => {
    if (queryParamsHandled.current) return;
    queryParamsHandled.current = true;

    const params = new URLSearchParams(window.location.search);
    const wantSignup = params.get('signup') === 'true';
    const tier = params.get('tier');

    if (tier && ['collector', 'curator', 'enthusiast'].includes(tier)) {
      sessionStorage.setItem('selected_tier', tier);
    }

    // Clean query params from URL
    if (wantSignup || tier) {
      const url = new URL(window.location.href);
      url.searchParams.delete('signup');
      url.searchParams.delete('tier');
      const clean = url.pathname + (url.searchParams.toString() ? `?${url.searchParams}` : '');
      window.history.replaceState({}, '', clean);
    }

    if (wantSignup && !user) {
      openAuthPanel('signup');
    }
  }, [user]);

  const handleAuthSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    if (!supabase) {
      setAuthError('Database connection is not available.');
      return;
    }
    if (!email.trim() || !password.trim()) {
      setAuthError('Email and password are required.');
      return;
    }
    if (authMode === 'signup' && password !== confirmPassword) {
      setAuthError('Passwords don\u2019t match.');
      return;
    }
    if (!turnstileToken) {
      setAuthError('Please complete the verification challenge.');
      return;
    }
    setAuthLoading(true);
    try {
      // Verify Turnstile token server-side first
      const verifyRes = await fetch('/api/auth/verify-turnstile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ turnstileToken }),
      });
      if (!verifyRes.ok) {
        const data = await verifyRes.json().catch(() => ({}));
        setTurnstileToken(null);
        throw new Error(data.error || 'Verification failed. Please try again.');
      }

      if (authMode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
      } else {
        const { error: signUpError } = await supabase.auth.signUp({ email: email.trim(), password });
        if (signUpError) throw signUpError;
        const { error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (signInError) throw signInError;
      }
    } catch (err: unknown) {
      setAuthError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleCTA = () => {
    if (user && onEnterApp) {
      onEnterApp();
    } else if (!user) {
      openAuthPanel('signup');
    }
  };

  const handleCheckout = async (tier: 'curator' | 'enthusiast') => {
    if (!user) {
      openAuthPanel('signup');
      return;
    }

    const priceData = pricing?.tiers?.[tier];
    const priceId = isAnnual ? priceData?.annual?.priceId : priceData?.monthly?.priceId;
    if (!priceId) {
      if (onEnterApp) onEnterApp();
      return;
    }

    try {
      const session = await supabase?.auth.getSession();
      const token = session?.data?.session?.access_token;
      if (!token) {
        openAuthPanel('signup');
        return;
      }

      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ priceId }),
      });
      const { url } = await response.json();
      if (url) window.location.href = url;
    } catch (err) {
      console.error('Checkout error:', err);
    }
  };

  const checkItem = (text: string) => (
    <li key={text}>
      <span className="chk"><SmallCheck /></span>
      <span>{text}</span>
    </li>
  );

  return (
    <div className="landing-page">
      <SEO
        title="Rekkrd — Your Vinyl Collection, Elevated"
        description="Scan, catalog, and explore your vinyl record collection with AI-powered tools."
      />
      <nav className="nav">
        <div className="container">
          <a href="#" className="nav-logo">
            <svg className="nav-logo-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="12" cy="12" r="11" fill="#3a525d"/>
              <circle cx="12" cy="12" r="9.5" fill="none" stroke="#4f6d7a" strokeWidth="0.4" opacity="0.5"/>
              <circle cx="12" cy="12" r="8" fill="none" stroke="#4f6d7a" strokeWidth="0.3" opacity="0.4"/>
              <circle cx="12" cy="12" r="6.5" fill="none" stroke="#4f6d7a" strokeWidth="0.3" opacity="0.3"/>
              <circle cx="12" cy="12" r="5.2" fill="#2a3d46"/>
              <text x="12" y="12.5" textAnchor="middle" dominantBaseline="central" fontFamily="Georgia,serif" fontWeight="bold" fontSize="7" fill="#dd6e42">R</text>
            </svg>
            <span>Rekk<span>r</span>d</span>
          </a>
          <div className="nav-links">
            <a href="#features">Features</a>
            <a href="#how-it-works">How It Works</a>
            <a href="#playlist">Playlists</a>
            <a href="#stakkd">Stakkd</a>
            <a href="#pricing">Pricing</a>
            <a href="#faq">FAQ</a>
            <a href="/blog">Blog</a>
            {user ? (
              <>
                <button className="nav-sign-in" onClick={signOut}>Sign Out</button>
                <button className="nav-cta" onClick={handleCTA}>My Collection</button>
              </>
            ) : (
              <>
                <button className="nav-sign-in" onClick={() => openAuthPanel('signin')}>Sign In</button>
                <button className="nav-cta" onClick={() => openAuthPanel('signup')}>Get Started</button>
              </>
            )}
          </div>
          {!user && (
            <div className="nav-mobile-auth-group">
              <button className="nav-mobile-auth" onClick={() => openAuthPanel('signin')}>Sign In</button>
              <button className="nav-mobile-cta" onClick={() => openAuthPanel('signup')}>Get Started</button>
            </div>
          )}
        </div>
      </nav>

      <section className="hero">
        <div className="hero-vinyl" aria-hidden="true">
          <svg viewBox="0 0 400 400" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="200" cy="200" r="195" fill="#4f6d7a" />
            <circle cx="200" cy="200" r="175" stroke="#2d3a3e" strokeWidth="0.8" />
            <circle cx="200" cy="200" r="165" stroke="#2d3a3e" strokeWidth="0.6" />
            <circle cx="200" cy="200" r="155" stroke="#2d3a3e" strokeWidth="0.8" />
            <circle cx="200" cy="200" r="145" stroke="#2d3a3e" strokeWidth="0.6" />
            <circle cx="200" cy="200" r="135" stroke="#2d3a3e" strokeWidth="0.8" />
            <circle cx="200" cy="200" r="125" stroke="#2d3a3e" strokeWidth="0.6" />
            <circle cx="200" cy="200" r="115" stroke="#2d3a3e" strokeWidth="0.8" />
            <circle cx="200" cy="200" r="105" stroke="#2d3a3e" strokeWidth="0.6" />
            <circle cx="200" cy="200" r="95" stroke="#2d3a3e" strokeWidth="0.8" />
            <circle cx="200" cy="200" r="85" stroke="#2d3a3e" strokeWidth="0.6" />
            <circle cx="200" cy="200" r="60" fill="#dd6e42" opacity="0.6" />
            <circle cx="200" cy="200" r="45" stroke="#2d3a3e" strokeWidth="0.4" opacity="0.3" />
            <circle cx="200" cy="200" r="8" fill="#f7f4ef" />
          </svg>
        </div>
        <div className="container">
          <div>
            <div className="hero-badge">
              <span className="dot"></span> {content.hero.badge}
            </div>
            <h1 dangerouslySetInnerHTML={{ __html: content.hero.heading }} />
            <p>{content.hero.subheading}</p>
            <div className="hero-actions">
              <button className="btn-primary" onClick={handleCTA}>{content.hero.cta_primary} <Arrow /></button>
              <a href="#features" className="btn-secondary">{content.hero.cta_secondary}</a>
            </div>
          </div>
          <div className="hero-video">
            <div className="hero-video-inner">
              <video
                autoPlay
                loop
                muted
                playsInline
                aria-label="Product demo video"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              >
                <source src="/hero-bg.mp4" type="video/mp4" />
              </video>
            </div>
          </div>
        </div>
      </section>

      <section className="proof-bar">
        <div className="container">
          {content.proof_stats.map(stat => (
            <div className="proof-stat" key={stat.label}>
              <div className="num">{stat.value}</div>
              <div className="label">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="section features" id="features">
        <div className="container">
          <div className="section-header">
            <div className="section-label">{content.features_header.label}</div>
            <h2 className="section-title">{content.features_header.title}</h2>
            <p className="section-sub">{brandify(content.features_header.subtitle)}</p>
          </div>
          <div className="features-grid">
            {content.features.map(f => (
              <div className="feature-card" key={f.title}>
                <div className={`feature-icon ${f.cls}`}>{f.icon}</div>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section how-it-works" id="how-it-works">
        <div className="container">
          <div className="section-header">
            <div className="section-label">{content.how_it_works_header.label}</div>
            <h2 className="section-title">{content.how_it_works_header.title}</h2>
            <p className="section-sub">{content.how_it_works_header.subtitle}</p>
          </div>
          <div className="steps">
            {content.how_it_works.map(step => (
              <div className="step" key={step.num}>
                <div className="step-num">{step.num}</div>
                <h3>{step.title}</h3>
                <p>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section showcase" id="collection">
        <div className="container">
          <div className="showcase-text">
            <div className="section-label">{content.showcase.label}</div>
            <h2 className="section-title">{content.showcase.title}<br /><em style={{ color: 'var(--peach)', fontWeight: 400 }}>{content.showcase.title_em}</em></h2>
            <p className="section-sub">{content.showcase.subtitle}</p>
            <ul className="showcase-list">
              {content.showcase.checklist.map(checkItem)}
            </ul>
          </div>
          <div className="showcase-visual">
            {content.showcase_cards.map(c => (
              <div className="mock-card" key={c.title}>
                <div className="mock-card-art" style={{ background: `linear-gradient(135deg,${c.gradient})` }}>{c.emoji}</div>
                <div className="mock-card-info">
                  <h4>{c.title}</h4>
                  <p>{c.artist}</p>
                  <p className="price">{c.price}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section playlist-section" id="playlist">
        <div className="container">
          <div className="playlist-visual">
            <div className="playlist-demo">
              <div className="playlist-demo-header">
                <h4>{'\uD83C\uDFB5'} Playlist Studio</h4>
                <span className="mood-badge">{content.playlist_moods[0]}</span>
              </div>
              <div className="mood-chips">
                {content.playlist_moods.map((m, i) => (
                  <button className={`mood-chip${i === 0 ? ' active' : ''}`} key={m}>{m}</button>
                ))}
              </div>
              <div className="playlist-tracks">
                {content.playlist_tracks.map(tr => (
                  <div className="playlist-track" key={tr.num}>
                    <span className="num">{tr.num}</span>
                    <div className={`art ${tr.cls}`}>{tr.emoji}</div>
                    <div className="info">
                      <h5>{tr.title}</h5>
                      <p>{tr.artist}</p>
                    </div>
                    <span className="dur">{tr.duration}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="playlist-text">
            <div className="section-label">{content.playlist_header.label}</div>
            <h2 className="section-title">{content.playlist_header.title}<br /><em style={{ color: 'var(--peach)', fontWeight: 400 }}>{content.playlist_header.title_em}</em></h2>
            <p className="section-sub">{brandify(content.playlist_header.subtitle)}</p>
            <ul className="showcase-list" style={{ marginTop: 28 }}>
              {content.playlist_header.checklist.map(checkItem)}
            </ul>
          </div>
        </div>
      </section>

      <section className="section stakkd-section" id="stakkd">
        <div className="container">
          <div className="stakkd-visual">
            <div className="signal-chain">
              <div className="signal-node">
                <div className="signal-node-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <circle cx="12" cy="12" r="10" />
                    <circle cx="12" cy="12" r="3" />
                    <line x1="12" y1="2" x2="12" y2="5" />
                    <line x1="12" y1="19" x2="12" y2="22" />
                  </svg>
                </div>
                <div className="signal-node-info">
                  <h4>Technics SL-1200MK7</h4>
                  <span className="signal-node-label">Turntable</span>
                </div>
              </div>
              <div className="signal-connector" aria-hidden="true"><span /></div>
              <div className="signal-node">
                <div className="signal-node-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <rect x="3" y="5" width="18" height="14" rx="2" />
                    <circle cx="8" cy="12" r="2" />
                    <circle cx="16" cy="12" r="2" />
                  </svg>
                </div>
                <div className="signal-node-info">
                  <h4>Pro-Ject Phono Box S2</h4>
                  <span className="signal-node-label">Phono Preamp</span>
                </div>
              </div>
              <div className="signal-connector" aria-hidden="true"><span /></div>
              <div className="signal-node">
                <div className="signal-node-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <rect x="2" y="6" width="20" height="12" rx="2" />
                    <line x1="6" y1="10" x2="6" y2="14" />
                    <line x1="10" y1="9" x2="10" y2="15" />
                    <line x1="14" y1="10" x2="14" y2="14" />
                    <line x1="18" y1="8" x2="18" y2="16" />
                  </svg>
                </div>
                <div className="signal-node-info">
                  <h4>Yamaha A-S801</h4>
                  <span className="signal-node-label">Amplifier</span>
                </div>
              </div>
              <div className="signal-connector" aria-hidden="true"><span /></div>
              <div className="signal-node">
                <div className="signal-node-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <rect x="4" y="2" width="16" height="20" rx="2" />
                    <circle cx="12" cy="12" r="4" />
                    <circle cx="12" cy="12" r="1.5" />
                    <circle cx="12" cy="19" r="1" />
                  </svg>
                </div>
                <div className="signal-node-info">
                  <h4>KEF LS50 Meta</h4>
                  <span className="signal-node-label">Speakers</span>
                </div>
              </div>
            </div>
          </div>
          <div className="stakkd-text">
            <div className="section-label">{content.stakkd.label}</div>
            <h2 className="section-title">{content.stakkd.title}<br /><em style={{ color: 'var(--peach)', fontWeight: 400 }}>{content.stakkd.title_em}</em></h2>
            <p className="section-sub">{content.stakkd.subtitle}</p>
            <ul className="showcase-list" style={{ marginTop: 28 }}>
              {content.stakkd.checklist.map(checkItem)}
            </ul>
          </div>
        </div>
      </section>

      <section className="stats-band">
        <div className="container">
          {content.stats_band.map(s => (
            <div className="stat-item" key={s.heading}>
              <h3>{s.heading}</h3>
              <p>{s.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="testimonial-section">
        <div className="container">
          <span className="quote-mark">&ldquo;</span>
          <blockquote>{content.testimonial.quote}</blockquote>
          <cite>
            <strong>{content.testimonial.author}</strong>
            {content.testimonial.detail}
          </cite>
        </div>
      </section>

      <section className="section pricing" id="pricing">
        <div className="container">
          <div className="section-header">
            <div className="section-label">Pricing</div>
            <h2 className="section-title">Pick Your Groove</h2>
            <p className="section-sub">Start free. Upgrade when your collection demands it.</p>
          </div>
          <div className="pricing-toggle">
            <span className={!isAnnual ? 'active' : ''}>Monthly</span>
            <div
              className={`toggle-switch${isAnnual ? ' annual' : ''}`}
              role="switch"
              aria-checked={isAnnual}
              tabIndex={0}
              onClick={() => setIsAnnual(!isAnnual)}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setIsAnnual(!isAnnual);
                }
              }}
            />
            <span className={isAnnual ? 'active' : ''}>Annual <span className="save-badge">Save 18%</span></span>
          </div>

          <div className="pricing-grid">
            <div className="price-card">
              <div className="tier">Collector</div>
              <h3>Free</h3>
              <div className="price-amount">
                <span className="dollars">$0</span>
                <span className="period">/forever</span>
              </div>
              <ul className="price-features">
                <li><Check />Up to 100 albums</li>
                <li><Check />10 AI scans per month</li>
                <li><Check />Grid &amp; list views</li>
                <li><Check />Search, sort &amp; filter</li>
                <li><Check />Personal notes &amp; tags</li>
                <li><Check />Up to 3 gear items</li>
                <li className="disabled"><X />AI gear identification</li>
                <li className="disabled"><X />Manual finder &amp; setup guides</li>
                <li className="disabled"><X />AI playlists</li>
                <li className="disabled"><X />Lyrics lookup</li>
              </ul>
              <button className="price-btn outline" onClick={handleCTA}>Get Started</button>
            </div>

            <div className="price-card featured">
              <span className="popular-badge">Most Popular</span>
              <div className="tier">Curator</div>
              <h3>Premium</h3>
              <div className="price-amount">
                <span className="currency">$</span>
                <span className="dollars">{isAnnual
                  ? ((pricing?.tiers?.curator?.annual?.amount ?? 4900) / 100)
                  : ((pricing?.tiers?.curator?.monthly?.amount ?? 499) / 100)
                }</span>
                <span className="period">{isAnnual ? '/year' : '/month'}</span>
                {isAnnual && <span className="annual-note">Billed annually</span>}
              </div>
              <ul className="price-features">
                <li><Check />Unlimited albums</li>
                <li><Check />Unlimited AI scans</li>
                <li><Check />AI playlist generation</li>
                <li><Check />Lyrics for all tracks</li>
                <li><Check />Multi-source cover art</li>
                <li><Check />Pricing &amp; condition grading</li>
                <li><Check />Export collection data</li>
                <li><Check />Stakkd &mdash; unlimited gear</li>
                <li><Check />AI gear identification</li>
                <li><Check />Manual finder &amp; setup guides</li>
              </ul>
              <button className="price-btn primary" onClick={() => handleCheckout('curator')}>Start Free Trial</button>
            </div>

            <div className="price-card">
              <div className="tier">Enthusiast</div>
              <h3>Pro</h3>
              <div className="price-amount">
                <span className="currency">$</span>
                <span className="dollars">{isAnnual
                  ? ((pricing?.tiers?.enthusiast?.annual?.amount ?? 9900) / 100)
                  : ((pricing?.tiers?.enthusiast?.monthly?.amount ?? 999) / 100)
                }</span>
                <span className="period">{isAnnual ? '/year' : '/month'}</span>
                {isAnnual && <span className="annual-note">Billed annually</span>}
              </div>
              <ul className="price-features">
                <li><Check />Everything in Curator</li>
                <li><Check />Full Stakkd with signal chain</li>
                <li><Check />Bulk import &amp; export</li>
                <li><Check />API access</li>
                <li><Check />Advanced analytics</li>
                <li><Check />PDF collection catalogs</li>
                <li><Check />Early beta access</li>
                <li><Check />Priority support</li>
              </ul>
              <button className="price-btn outline" onClick={() => handleCheckout('enthusiast')}>Get Enthusiast</button>
            </div>
          </div>
        </div>
      </section>

      <section className="section faq-section" id="faq">
        <div className="container">
          <div className="section-header">
            <div className="section-label">{content.faq_header.label}</div>
            <h2 className="section-title">{content.faq_header.title}</h2>
          </div>
          <div className="faq-list">
            {content.faqs.map((f, i) => (
              <div className={`faq-item${openFaq === i ? ' open' : ''}`} key={i}>
                <button className="faq-q" onClick={() => setOpenFaq(openFaq === i ? null : i)} aria-expanded={openFaq === i}>
                  {f.q}
                  <PlusIcon open={openFaq === i} />
                </button>
                <div className="faq-a">
                  <div className="faq-a-inner">{brandify(f.a)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {!blogLoading && latestPost && (
        <section className="section latest-blog">
          <div className="container">
            <div className="section-header">
              <div className="section-label">From the Crate</div>
              <h2 className="section-title">Latest from the Blog</h2>
            </div>
            <a href={`/blog/${latestPost.slug}`} className="latest-blog-card">
              {latestPost.featured_image && (
                <img
                  className="latest-blog-img"
                  src={latestPost.featured_image.replace(/^=+/, '')}
                  alt={`Hero image for ${latestPost.title}`}
                  loading="lazy"
                />
              )}
              <div className="latest-blog-body">
                <h3>{latestPost.title}</h3>
                {latestPost.excerpt && <p className="latest-blog-excerpt">{latestPost.excerpt}</p>}
                <div className="latest-blog-meta">
                  <span>{latestPost.author}</span>
                  <span>{new Date(latestPost.published_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                </div>
                <span className="latest-blog-link">Read more →</span>
              </div>
            </a>
            <div className="latest-blog-all">
              <a href="/blog">View all posts →</a>
            </div>
          </div>
        </section>
      )}

      <section className="final-cta" id="cta">
        <div className="container">
          <h2 dangerouslySetInnerHTML={{ __html: content.final_cta.heading }} />
          <p>{content.final_cta.description}</p>
          <div className="final-cta-actions">
            <button className="btn-light" onClick={handleCTA}>{content.final_cta.cta_primary} <Arrow /></button>
            <a href="#pricing" className="btn-ghost">{content.final_cta.cta_secondary}</a>
          </div>
        </div>
      </section>

      <footer className="footer">
        <div className="container">
          <div className="footer-grid">
            <div className="footer-brand">
              <a href="#" className="nav-logo">
                <svg className="nav-logo-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <circle cx="12" cy="12" r="11" fill="#3a525d"/>
                  <circle cx="12" cy="12" r="9.5" fill="none" stroke="#4f6d7a" strokeWidth="0.4" opacity="0.5"/>
                  <circle cx="12" cy="12" r="8" fill="none" stroke="#4f6d7a" strokeWidth="0.3" opacity="0.4"/>
                  <circle cx="12" cy="12" r="6.5" fill="none" stroke="#4f6d7a" strokeWidth="0.3" opacity="0.3"/>
                  <circle cx="12" cy="12" r="5.2" fill="#2a3d46"/>
                  <text x="12" y="12.5" textAnchor="middle" dominantBaseline="central" fontFamily="Georgia,serif" fontWeight="bold" fontSize="7" fill="#dd6e42">R</text>
                </svg>
                <span>Rekk<span>r</span>d</span>
              </a>
              <p>{brandify(content.footer.brand_description)}</p>
            </div>
            <div className="footer-col">
              <h4>Product</h4>
              <ul>
                <li><a href="#features">Features</a></li>
                <li><a href="#pricing">Pricing</a></li>
                <li><a href="#playlist">Playlists</a></li>
              </ul>
            </div>
            <div className="footer-col">
              <h4>Resources</h4>
              <ul>
                <li><a href="#faq">FAQ</a></li>
                <li><a href="#">Status</a></li>
                <li><a href="/support">Support</a></li>
              </ul>
            </div>
            <div className="footer-col">
              <h4>Company</h4>
              <ul>
                <li><a href="#">About</a></li>
                <li><a href="/blog">Blog</a></li>
                <li><a href="/privacy">Privacy</a></li>
                <li><a href="/terms">Terms</a></li>
              </ul>
            </div>
          </div>
          <div className="footer-bottom">
            <span>&copy; {new Date().getFullYear()} <a href="https://www.sweetwater.technology" target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'none' }}>Sweetwater Technology</a></span>
            <span>{content.footer.tagline}</span>
          </div>
        </div>
      </footer>

      {/* Auth overlay */}
      {showAuth && !user && (
        <div className="auth-overlay" role="dialog" aria-modal="true" aria-label={authMode === 'signin' ? 'Sign in' : 'Create account'}>
          <div className="auth-card" ref={authRef}>
            <button className="auth-close" onClick={() => setShowAuth(false)} aria-label="Close">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>

            <div className="auth-tabs">
              <button
                className={`auth-tab${authMode === 'signin' ? ' active' : ''}`}
                onClick={() => { setAuthMode('signin'); setAuthError(null); setConfirmPassword(''); setTurnstileToken(null); }}
              >
                Sign In
              </button>
              <button
                className={`auth-tab${authMode === 'signup' ? ' active' : ''}`}
                onClick={() => { setAuthMode('signup'); setAuthError(null); setTurnstileToken(null); }}
              >
                Sign Up
              </button>
            </div>

            <div aria-live="polite" style={{ minHeight: 24 }}>
              {authError && <p className="auth-error" role="alert">{authError}</p>}
            </div>

            <form onSubmit={handleAuthSubmit} role="form" aria-label={authMode === 'signin' ? 'Sign in' : 'Create account'}>
              <div className="auth-field">
                <label htmlFor="landing-email">Email</label>
                <input
                  id="landing-email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                />
              </div>
              <div className="auth-field">
                <label htmlFor="landing-password">Password</label>
                <input
                  id="landing-password"
                  type="password"
                  autoComplete={authMode === 'signin' ? 'current-password' : 'new-password'}
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder={'\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022'}
                />
              </div>
              {authMode === 'signup' && (
                <div className="auth-field">
                  <label htmlFor="landing-confirm-password">Confirm Password</label>
                  <input
                    id="landing-confirm-password"
                    type="password"
                    autoComplete="new-password"
                    required
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder={'\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022'}
                  />
                </div>
              )}
              <Turnstile
                onVerify={handleTurnstileVerify}
                onExpire={handleTurnstileExpire}
                resetKey={`landing-${authMode}-${showAuth}`}
              />
              <button type="submit" className="auth-submit" disabled={authLoading || !turnstileToken}>
                {authLoading ? 'Loading\u2026' : authMode === 'signin' ? 'Sign In' : 'Create Account'}
              </button>
            </form>

            <p className="auth-switch">
              {authMode === 'signin' ? "Don\u2019t have an account? " : 'Already have an account? '}
              <button
                type="button"
                className="auth-switch-link"
                onClick={() => { setAuthMode(authMode === 'signin' ? 'signup' : 'signin'); setAuthError(null); setTurnstileToken(null); }}
              >
                {authMode === 'signin' ? 'Sign up' : 'Sign in'}
              </button>
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Landing;

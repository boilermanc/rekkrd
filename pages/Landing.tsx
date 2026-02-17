import React, { useState, useRef, useEffect, FormEvent } from 'react';
import './Landing.css';
import { useAuthContext } from '../contexts/AuthContext';
import { supabase } from '../services/supabaseService';

interface LandingProps {
  onEnterApp?: () => void;
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

const features = [
  { icon: '\uD83D\uDCF7', cls: 'fi-1', title: 'AI Camera Scan', desc: 'Point, snap, done. Our Gemini-powered AI identifies artist and album from cover art instantly. Upload a photo or use your camera.' },
  { icon: '\u26A1', cls: 'fi-2', title: 'Auto Enrichment', desc: 'Every album gets filled in automatically: tracklist, genre, year, cover art, market pricing, AI description, and streaming links.' },
  { icon: '\uD83D\uDCB0', cls: 'fi-3', title: 'Collection Valuation', desc: 'See low, median, and high market prices pulled from Discogs. Know what your crate is worth at a glance with portfolio stats.' },
  { icon: '\uD83C\uDFB5', cls: 'fi-4', title: 'Playlist Studio', desc: 'Type a mood. Get a curated playlist from your own collection. Choose albums, sides, or individual songs. Print to PDF.' },
  { icon: '\uD83D\uDD0D', cls: 'fi-5', title: 'Smart Search & Filter', desc: 'Real-time search across title, artist, and genre. Sort by year, value, or date added. Filter by decade, condition, or favorites.' },
  { icon: '\uD83C\uDFB6', cls: 'fi-6', title: 'Lyrics & Liner Notes', desc: 'Look up lyrics for any track in your collection. Add personal notes, tags, and condition grades to every album.' },
];

const faqs = [
  { q: 'How does the AI scan work?', a: 'Point your phone camera at any vinyl record cover and snap a photo. Our Google Gemini-powered AI analyzes the image, identifies the artist and album, then pulls in tracklist, genre, cover art, pricing data, and more automatically. It works with most commercially released records and typically takes under 3 seconds.' },
  { q: 'Where does pricing data come from?', a: "Market valuations (low, median, and high) are sourced from Discogs, the world's largest music database and marketplace. This gives you real-world pricing based on actual recent sales, not guesswork." },
  { q: 'How do AI playlists work?', a: 'Type a mood or vibe like "Late Night Jazz" or "Sunday Morning Chill." The AI analyzes your actual collection and picks albums, sides, or individual songs that match. No hallucinated recommendations \u2014 every pick is something you own.' },
  { q: 'Can I try it before paying?', a: "Absolutely. Every new account gets a free 14-day trial of the Curator plan with full access to AI playlists, lyrics, and unlimited scans. After the trial, you can continue on the free Collector tier or upgrade to keep premium features." },
  { q: 'Is my data private?', a: "Your collection data is stored securely in Supabase (Postgres). We don't sell your data, serve ads, or track your listening habits. Your notes, tags, and collection details belong to you." },
  { q: "What if a scan doesn't recognize my record?", a: 'If the AI can\'t identify a cover, you can always search and add the album manually. Rekkrd pulls from iTunes and MusicBrainz databases with millions of releases.' },
];

const Landing: React.FC<LandingProps> = ({ onEnterApp }) => {
  const { user, signOut } = useAuthContext();
  const [isAnnual, setIsAnnual] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

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

  // Auth overlay state
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const authRef = useRef<HTMLDivElement>(null);

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
    setShowAuth(true);
  };

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
    setAuthLoading(true);
    try {
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
      // Fallback: just enter the app if pricing not loaded yet
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
      <nav className="nav">
        <div className="container">
          <a href="#" className="nav-logo">
            <svg className="nav-logo-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="12" cy="12" r="11" fill="#f0a882"/>
              <circle cx="12" cy="12" r="9.5" fill="none" stroke="#d48a6a" strokeWidth="0.4" opacity="0.5"/>
              <circle cx="12" cy="12" r="8" fill="none" stroke="#d48a6a" strokeWidth="0.3" opacity="0.4"/>
              <circle cx="12" cy="12" r="6.5" fill="none" stroke="#d48a6a" strokeWidth="0.3" opacity="0.3"/>
              <circle cx="12" cy="12" r="5.2" fill="#c45a30"/>
              <text x="12" y="12.5" textAnchor="middle" dominantBaseline="central" fontFamily="Georgia,serif" fontWeight="bold" fontSize="7" fill="#f0a882">R</text>
            </svg>
            Rekk<span>r</span>d
          </a>
          <div className="nav-links">
            <a href="#features">Features</a>
            <a href="#how-it-works">How It Works</a>
            <a href="#playlist">Playlists</a>
            <a href="#pricing">Pricing</a>
            <a href="#faq">FAQ</a>
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
            <button className="nav-mobile-auth" onClick={() => openAuthPanel('signin')}>Sign In</button>
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
              <span className="dot"></span> AI-Powered Vinyl
            </div>
            <h1>Your Vinyl<br />Collection, <em>Reimagined.</em></h1>
            <p>Scan, catalog, and rediscover your record collection with AI. Get instant identification, valuations, tracklists, and curated playlists from what you already own.</p>
            <div className="hero-actions">
              <button className="btn-primary" onClick={handleCTA}>Start Free <Arrow /></button>
              <a href="#features" className="btn-secondary">See Features</a>
            </div>
          </div>
          <div className="hero-video">
            <div className="hero-video-inner">
              <div className="video-placeholder">
                <div className="play-btn">
                  <svg viewBox="0 0 24 24"><polygon points="6,3 20,12 6,21" /></svg>
                </div>
                <span>Watch Demo</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="proof-bar">
        <div className="container">
          {[['10K+', 'Records Cataloged'], ['98%', 'Scan Accuracy'], ['2.5K+', 'Playlists Created'], ['4.9\u2605', 'User Rating']].map(([n, l]) => (
            <div className="proof-stat" key={l}>
              <div className="num">{n}</div>
              <div className="label">{l}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="section features" id="features">
        <div className="container">
          <div className="section-header">
            <div className="section-label">Features</div>
            <h2 className="section-title">Everything Your Crate Deserves</h2>
            <p className="section-sub">From AI scanning to playlist curation, Rekkrd is the most complete vinyl companion ever built.</p>
          </div>
          <div className="features-grid">
            {features.map(f => (
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
            <div className="section-label">How It Works</div>
            <h2 className="section-title">Three Steps to a Smarter Crate</h2>
            <p className="section-sub">From physical vinyl to digital library in seconds.</p>
          </div>
          <div className="steps">
            {[
              ['1', 'Scan or Add', 'Point your camera at any record cover. AI identifies it instantly, or search and add manually.'],
              ['2', 'Enrich Automatically', 'Tracklist, genre, cover art, market price, and an AI description all populate in seconds.'],
              ['3', 'Explore & Play', 'Browse your collection, generate mood playlists, track value, and discover your vinyl from a new angle.'],
            ].map(([n, t, d]) => (
              <div className="step" key={n}>
                <div className="step-num">{n}</div>
                <h3>{t}</h3>
                <p>{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section showcase" id="collection">
        <div className="container">
          <div className="showcase-text">
            <div className="section-label">Your Collection</div>
            <h2 className="section-title">A Crate That<br /><em style={{ color: 'var(--peach)', fontWeight: 400 }}>Knows Itself</em></h2>
            <p className="section-sub">Every album in your collection is alive with data, art, and context.</p>
            <ul className="showcase-list">
              {[
                'High-res cover art from iTunes and MusicBrainz',
                'Live market valuations from Discogs',
                'Full tracklists with per-track lyrics',
                'AI-written poetic album descriptions',
                'Duplicate detection and smart categorization',
              ].map(checkItem)}
            </ul>
          </div>
          <div className="showcase-visual">
            {[
              { g: 'var(--beige),var(--peach)', e: '\uD83C\uDFB6', t: 'Kind of Blue', a: 'Miles Davis \u2022 1959', p: '$38.50' },
              { g: 'var(--sky),var(--slate)', e: '\uD83E\uDDE0', t: 'OK Computer', a: 'Radiohead \u2022 1997', p: '$29.00' },
              { g: 'var(--peach-light),var(--slate)', e: '\uD83C\uDF2C', t: 'Purple Rain', a: 'Prince \u2022 1984', p: '$22.75' },
              { g: 'var(--bg3),var(--slate-light)', e: '\uD83C\uDFB8', t: 'Rumours', a: 'Fleetwood Mac \u2022 1977', p: '$41.00' },
            ].map(c => (
              <div className="mock-card" key={c.t}>
                <div className="mock-card-art" style={{ background: `linear-gradient(135deg,${c.g})` }}>{c.e}</div>
                <div className="mock-card-info">
                  <h4>{c.t}</h4>
                  <p>{c.a}</p>
                  <p className="price">{c.p}</p>
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
                <span className="mood-badge">Late Night Jazz</span>
              </div>
              <div className="mood-chips">
                {['Late Night Jazz', 'Sunday Morning', 'Road Trip Energy', 'Rainy Day Vinyl'].map((m, i) => (
                  <button className={`mood-chip${i === 0 ? ' active' : ''}`} key={m}>{m}</button>
                ))}
              </div>
              <div className="playlist-tracks">
                {[
                  { n: '01', c: 'art-1', e: '\uD83C\uDFB7', t: 'So What', a: 'Miles Davis \u2022 Kind of Blue', d: '9:22' },
                  { n: '02', c: 'art-2', e: '\uD83E\uDDE0', t: 'Take Five', a: 'Dave Brubeck \u2022 Time Out', d: '5:24' },
                  { n: '03', c: 'art-3', e: '\uD83C\uDFBA', t: 'Round Midnight', a: 'Thelonious Monk \u2022 Genius of Modern Music', d: '5:47' },
                  { n: '04', c: 'art-4', e: '\uD83C\uDFB9', t: 'A Love Supreme Pt. I', a: 'John Coltrane \u2022 A Love Supreme', d: '7:43' },
                ].map(tr => (
                  <div className="playlist-track" key={tr.n}>
                    <span className="num">{tr.n}</span>
                    <div className={`art ${tr.c}`}>{tr.e}</div>
                    <div className="info">
                      <h5>{tr.t}</h5>
                      <p>{tr.a}</p>
                    </div>
                    <span className="dur">{tr.d}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="playlist-text">
            <div className="section-label">Playlist Studio</div>
            <h2 className="section-title">Spin a Mood,<br /><em style={{ color: 'var(--peach)', fontWeight: 400 }}>Not Just a Record</em></h2>
            <p className="section-sub">Tell Rekkrd a vibe and it builds a curated playlist from your actual collection. No streaming services, no algorithms from strangers.</p>
            <ul className="showcase-list" style={{ marginTop: 28 }}>
              {[
                'Albums, sides, or individual songs',
                'Player and manifest views',
                'Print-ready PDF playlist cards',
                'Only picks albums that match from your crate',
              ].map(checkItem)}
            </ul>
          </div>
        </div>
      </section>

      <section className="stats-band">
        <div className="container">
          {[
            ['6 Sources', 'Enrichment from iTunes, MusicBrainz, Discogs, Gemini AI, and more'],
            ['<3s', 'Average time from scan to fully enriched album entry'],
            ['100%', 'Your data. Your collection. No ads, no tracking, no lock-in.'],
          ].map(([h, p]) => (
            <div className="stat-item" key={h}>
              <h3>{h}</h3>
              <p>{p}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="testimonial-section">
        <div className="container">
          <span className="quote-mark">&ldquo;</span>
          <blockquote>I scanned my entire crate in an afternoon. The playlist feature alone is worth it &mdash; it actually knows my collection better than I do.</blockquote>
          <cite>
            <strong>Jordan M.</strong>
            Vinyl collector &bull; 340 records
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
            <div className="section-label">FAQ</div>
            <h2 className="section-title">Got Questions?</h2>
          </div>
          <div className="faq-list">
            {faqs.map((f, i) => (
              <div className={`faq-item${openFaq === i ? ' open' : ''}`} key={i}>
                <button className="faq-q" onClick={() => setOpenFaq(openFaq === i ? null : i)} aria-expanded={openFaq === i}>
                  {f.q}
                  <PlusIcon open={openFaq === i} />
                </button>
                <div className="faq-a">
                  <div className="faq-a-inner">{f.a}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="final-cta" id="cta">
        <div className="container">
          <h2>Ready to <em>Rekkrd</em><br />Your Collection?</h2>
          <p>Join thousands of collectors who've digitized, valued, and rediscovered their vinyl with AI.</p>
          <div className="final-cta-actions">
            <button className="btn-light" onClick={handleCTA}>Start Free &mdash; No Card Required <Arrow /></button>
            <a href="#pricing" className="btn-ghost">View Pricing</a>
          </div>
        </div>
      </section>

      <footer className="footer">
        <div className="container">
          <div className="footer-grid">
            <div className="footer-brand">
              <a href="#" className="nav-logo">
                <svg className="nav-logo-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <circle cx="12" cy="12" r="11" fill="#f0a882"/>
                  <circle cx="12" cy="12" r="9.5" fill="none" stroke="#d48a6a" strokeWidth="0.4" opacity="0.5"/>
                  <circle cx="12" cy="12" r="8" fill="none" stroke="#d48a6a" strokeWidth="0.3" opacity="0.4"/>
                  <circle cx="12" cy="12" r="6.5" fill="none" stroke="#d48a6a" strokeWidth="0.3" opacity="0.3"/>
                  <circle cx="12" cy="12" r="5.2" fill="#c45a30"/>
                  <text x="12" y="12.5" textAnchor="middle" dominantBaseline="central" fontFamily="Georgia,serif" fontWeight="bold" fontSize="7" fill="#f0a882">R</text>
                </svg>
                Rekk<span>r</span>d
              </a>
              <p>The AI-powered vinyl collection manager for serious crate diggers and casual collectors alike.</p>
            </div>
            <div className="footer-col">
              <h4>Product</h4>
              <ul>
                <li><a href="#features">Features</a></li>
                <li><a href="#pricing">Pricing</a></li>
                <li><a href="#playlist">Playlists</a></li>
                <li><a href="#">Changelog</a></li>
              </ul>
            </div>
            <div className="footer-col">
              <h4>Resources</h4>
              <ul>
                <li><a href="#">Documentation</a></li>
                <li><a href="#faq">FAQ</a></li>
                <li><a href="#">API Reference</a></li>
                <li><a href="#">Status</a></li>
              </ul>
            </div>
            <div className="footer-col">
              <h4>Company</h4>
              <ul>
                <li><a href="#">About</a></li>
                <li><a href="#">Blog</a></li>
                <li><a href="#">Privacy</a></li>
                <li><a href="#">Terms</a></li>
              </ul>
            </div>
          </div>
          <div className="footer-bottom">
            <span>&copy; 2025 Rekkrd. All rights reserved.</span>
            <span>Made with &hearts; for vinyl lovers</span>
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
                onClick={() => { setAuthMode('signin'); setAuthError(null); setConfirmPassword(''); }}
              >
                Sign In
              </button>
              <button
                className={`auth-tab${authMode === 'signup' ? ' active' : ''}`}
                onClick={() => { setAuthMode('signup'); setAuthError(null); }}
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
              <button type="submit" className="auth-submit" disabled={authLoading}>
                {authLoading ? 'Loading\u2026' : authMode === 'signin' ? 'Sign In' : 'Create Account'}
              </button>
            </form>

            <p className="auth-switch">
              {authMode === 'signin' ? "Don\u2019t have an account? " : 'Already have an account? '}
              <button
                type="button"
                className="auth-switch-link"
                onClick={() => { setAuthMode(authMode === 'signin' ? 'signup' : 'signin'); setAuthError(null); }}
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

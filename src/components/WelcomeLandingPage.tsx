import React, { useEffect, useRef, useCallback } from 'react';

/* ──────────────────────────────────────────────
   Design tokens (hardcoded light palette —
   this page is always light regardless of theme)
   ────────────────────────────────────────────── */
const C = {
  bg: '#f7f4ef',          // alabaster
  card: '#efe9dd',        // pearl-beige
  headDark: '#3a525d',    // blue-slate-dark
  body: '#4f6d7a',        // blue-slate
  bodyLight: '#7d9199',   // muted slate
  peach: '#dd6e42',       // burnt-peach
  peachDeep: '#D47A62',   // burnt-peach-deep (branded "r")
  peachDark: '#c45a30',   // CTA hover
  white: '#ffffff',
  divider: '#d5cfc3',
} as const;

/* ──────────────────────────────────────────────
   Branded wordmark: the second "r" in Rekkrd
   is always #D47A62
   ────────────────────────────────────────────── */
function BrandedRekkrd({ className }: { className?: string }) {
  return (
    <span className={className}>
      Rekk<span style={{ color: C.peachDeep }}>r</span>d
    </span>
  );
}

/* ──────────────────────────────────────────────
   Intersection Observer fade-in hook
   ────────────────────────────────────────────── */
function useFadeIn() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add('wlp-visible');
          observer.unobserve(el);
        }
      },
      { threshold: 0.15 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return ref;
}

function FadeIn({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const ref = useFadeIn();
  return (
    <div ref={ref} className={`wlp-fade ${className}`}>
      {children}
    </div>
  );
}

/* ──────────────────────────────────────────────
   Inline SVG icons
   ────────────────────────────────────────────── */
function VinylSvg() {
  return (
    <svg
      viewBox="0 0 200 200"
      className="w-48 h-48 sm:w-64 sm:h-64 mx-auto"
      aria-hidden="true"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* Outer ring */}
      <circle cx="100" cy="100" r="90" stroke={C.headDark} strokeWidth="2" fill="none" />
      {/* Grooves */}
      <circle cx="100" cy="100" r="75" stroke={C.bodyLight} strokeWidth="0.5" strokeDasharray="4 3" />
      <circle cx="100" cy="100" r="60" stroke={C.bodyLight} strokeWidth="0.5" strokeDasharray="4 3" />
      <circle cx="100" cy="100" r="45" stroke={C.bodyLight} strokeWidth="0.5" strokeDasharray="4 3" />
      {/* Label area */}
      <circle cx="100" cy="100" r="30" stroke={C.peach} strokeWidth="2" fill={C.peach} opacity="0.15" />
      {/* Spindle */}
      <circle cx="100" cy="100" r="5" fill={C.headDark} />
      {/* Tonearm hint */}
      <path d="M160 30 L140 70 L135 85" stroke={C.peach} strokeWidth="2" fill="none" />
      <circle cx="135" cy="88" r="3" fill={C.peach} />
    </svg>
  );
}

function CameraSvg() {
  return (
    <svg viewBox="0 0 48 48" className="w-10 h-10" aria-hidden="true" fill="none" stroke={C.peach} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="6" y="14" width="36" height="24" rx="4" />
      <path d="M16 14l2-4h12l2 4" />
      <circle cx="24" cy="26" r="7" />
      <circle cx="24" cy="26" r="3" />
    </svg>
  );
}

function HeadphonesSvg() {
  return (
    <svg viewBox="0 0 48 48" className="w-10 h-10" aria-hidden="true" fill="none" stroke={C.peach} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 32v-8a16 16 0 0 1 32 0v8" />
      <rect x="6" y="30" width="6" height="10" rx="2" />
      <rect x="36" y="30" width="6" height="10" rx="2" />
    </svg>
  );
}

function PlaylistSvg() {
  return (
    <svg viewBox="0 0 48 48" className="w-10 h-10" aria-hidden="true" fill="none" stroke={C.peach} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="10" y1="12" x2="30" y2="12" />
      <line x1="10" y1="20" x2="30" y2="20" />
      <line x1="10" y1="28" x2="24" y2="28" />
      <circle cx="36" cy="30" r="6" />
      <path d="M42 30v-14" />
    </svg>
  );
}

/* ──────────────────────────────────────────────
   Helper: auth URL builder
   ────────────────────────────────────────────── */
function authUrl(tier?: string) {
  const params = new URLSearchParams({ signup: 'true' });
  if (tier) params.set('tier', tier);
  return `/?${params.toString()}`;
}

/* ──────────────────────────────────────────────
   Feature card data
   ────────────────────────────────────────────── */
const features = [
  {
    Icon: CameraSvg,
    title: 'AI-Powered Scanning',
    desc: 'Point your phone at any record cover. Rekkrd identifies the album, pulls metadata, and adds it to your collection in seconds.',
  },
  {
    Icon: HeadphonesSvg,
    title: 'Stakkd Gear Catalog',
    desc: 'Photograph your turntable, amp, or speakers. Stakkd identifies your gear, pulls specs, and documents your entire audio setup.',
  },
  {
    Icon: PlaylistSvg,
    title: 'Smart Playlists',
    desc: 'Generate mood-based playlists from your own collection. Let AI suggest the perfect listening session.',
  },
];

/* ──────────────────────────────────────────────
   Pricing tier data
   ────────────────────────────────────────────── */
const tiers = [
  {
    name: 'Collector',
    price: 'Free',
    period: '',
    badge: '',
    perks: ['100 albums', '10 AI scans / month', '3 gear items'],
    cta: 'Get Started Free',
    tier: 'collector',
    highlighted: false,
  },
  {
    name: 'Curator',
    price: '$4.99',
    period: '/mo',
    badge: 'Most Popular',
    perks: ['Unlimited albums', 'Unlimited scans', 'Unlimited gear', 'Playlist generation'],
    cta: 'Start Curating',
    tier: 'curator',
    highlighted: true,
  },
  {
    name: 'Archivist',
    price: '$9.99',
    period: '/mo',
    badge: '',
    perks: ['Everything in Curator', 'Priority AI', 'CSV / JSON export', 'Advanced analytics'],
    cta: 'Go Archivist',
    tier: 'enthusiast',
    highlighted: false,
  },
];

/* ══════════════════════════════════════════════
   COMPONENT
   ══════════════════════════════════════════════ */
export default function WelcomeLandingPage() {
  /* ── UTM capture ── */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    (['utm_source', 'utm_medium', 'utm_campaign'] as const).forEach((key) => {
      const val = params.get(key);
      if (val) sessionStorage.setItem(key, val);
    });
  }, []);

  /* ── Smooth scroll helper ── */
  const scrollTo = useCallback((id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  return (
    <div
      className="min-h-screen"
      style={{
        backgroundColor: C.bg,
        color: C.body,
        fontFamily: "'DM Sans', 'Inter', system-ui, sans-serif",
        scrollBehavior: 'smooth',
      }}
    >
      {/* ─── Sticky mini nav ─── */}
      <nav
        className="sticky top-0 z-30 flex items-center justify-between px-4 sm:px-8 py-3 backdrop-blur-md"
        style={{ backgroundColor: `${C.bg}e6`, borderBottom: `1px solid ${C.divider}` }}
        aria-label="Welcome page navigation"
      >
        <button
          onClick={() => scrollTo('hero')}
          className="font-display text-xl font-bold tracking-tight"
          style={{ color: C.headDark, background: 'none', border: 'none', cursor: 'pointer' }}
          aria-label="Scroll to top"
        >
          <BrandedRekkrd />
        </button>

        <div className="flex items-center gap-3 sm:gap-5 text-sm">
          <button
            onClick={() => scrollTo('features')}
            className="hidden sm:inline hover:underline"
            style={{ color: C.body, background: 'none', border: 'none', cursor: 'pointer' }}
          >
            Features
          </button>
          <button
            onClick={() => scrollTo('pricing')}
            className="hidden sm:inline hover:underline"
            style={{ color: C.body, background: 'none', border: 'none', cursor: 'pointer' }}
          >
            Pricing
          </button>
          <a
            href={authUrl()}
            className="inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold transition-colors"
            style={{ backgroundColor: C.peach, color: C.white }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = C.peachDark)}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = C.peach)}
            aria-label="Sign up for free"
          >
            Sign Up Free
          </a>
        </div>
      </nav>

      {/* ═══════════════════════════════════════
         SECTION 1 — HERO
         ═══════════════════════════════════════ */}
      <section
        id="hero"
        className="flex flex-col items-center justify-center text-center px-6 pt-16 pb-20 sm:pt-24 sm:pb-28"
      >
        <FadeIn>
          <VinylSvg />
        </FadeIn>

        <FadeIn className="mt-8">
          <h1
            className="font-display text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight"
            style={{ color: C.headDark }}
          >
            <BrandedRekkrd />
          </h1>
        </FadeIn>

        <FadeIn className="mt-4">
          <p
            className="font-display text-xl sm:text-2xl italic"
            style={{ color: C.body }}
          >
            Your Collection, Elevated
          </p>
        </FadeIn>

        <FadeIn className="mt-3 max-w-xl">
          <p className="text-base sm:text-lg" style={{ color: C.bodyLight }}>
            AI-powered vinyl cataloging and gear tracking for serious collectors
          </p>
        </FadeIn>

        <FadeIn className="mt-8">
          <a
            href={authUrl()}
            className="inline-flex items-center gap-2 px-8 py-3 rounded-full text-lg font-semibold transition-colors"
            style={{ backgroundColor: C.peach, color: C.white }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = C.peachDark)}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = C.peach)}
            aria-label="Start your collection for free"
          >
            Start Your Collection — Free
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </a>
        </FadeIn>
      </section>

      {/* ═══════════════════════════════════════
         SECTION 2 — FEATURE HIGHLIGHTS
         ═══════════════════════════════════════ */}
      <section
        id="features"
        className="px-6 py-16 sm:py-24"
        aria-labelledby="features-heading"
      >
        <FadeIn className="text-center mb-12">
          <h2
            id="features-heading"
            className="font-display text-3xl sm:text-4xl font-bold"
            style={{ color: C.headDark }}
          >
            How It Works
          </h2>
          <div className="mx-auto mt-3 w-12 h-0.5" style={{ backgroundColor: C.peach }} />
        </FadeIn>

        <div className="mx-auto max-w-5xl grid grid-cols-1 sm:grid-cols-3 gap-6">
          {features.map(({ Icon, title, desc }) => {
            const card = (
              <div
                className="rounded-2xl p-6 sm:p-8 h-full flex flex-col items-center text-center"
                style={{ backgroundColor: C.card }}
              >
                <div
                  className="flex items-center justify-center w-16 h-16 rounded-full mb-5"
                  style={{ backgroundColor: `${C.peach}18` }}
                >
                  <Icon />
                </div>
                <h3
                  className="font-display text-lg font-bold mb-2"
                  style={{ color: C.headDark }}
                >
                  {title}
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: C.body }}>
                  {desc}
                </p>
              </div>
            );
            return <div key={title}><FadeIn>{card}</FadeIn></div>;
          })}
        </div>
      </section>

      {/* ═══════════════════════════════════════
         SECTION 3 — PRICING TIERS
         ═══════════════════════════════════════ */}
      <section
        id="pricing"
        className="px-6 py-16 sm:py-24"
        aria-labelledby="pricing-heading"
      >
        <FadeIn className="text-center mb-12">
          <h2
            id="pricing-heading"
            className="font-display text-3xl sm:text-4xl font-bold"
            style={{ color: C.headDark }}
          >
            Simple, Fair Pricing
          </h2>
          <div className="mx-auto mt-3 w-12 h-0.5" style={{ backgroundColor: C.peach }} />
        </FadeIn>

        <div className="mx-auto max-w-5xl grid grid-cols-1 sm:grid-cols-3 gap-6 items-stretch">
          {tiers.map(({ name, price, period, badge, perks, cta, tier, highlighted }) => (
            <div key={name}>
              <FadeIn>
                <div
                  className="relative rounded-2xl p-6 sm:p-8 h-full flex flex-col"
                  style={{
                    backgroundColor: highlighted ? C.white : C.card,
                    border: highlighted ? `2px solid ${C.peach}` : `1px solid ${C.divider}`,
                    boxShadow: highlighted ? '0 8px 30px rgba(221,110,66,0.12)' : 'none',
                  }}
                >
                  {badge && (
                    <span
                      className="absolute -top-3 left-1/2 -translate-x-1/2 font-label text-xs font-bold uppercase tracking-wider px-4 py-1 rounded-full"
                      style={{ backgroundColor: C.peach, color: C.white }}
                    >
                      {badge}
                    </span>
                  )}

                  <p
                    className="font-label text-xs uppercase tracking-widest mb-1"
                    style={{ color: C.bodyLight }}
                  >
                    {name}
                  </p>

                  <p className="font-display text-3xl font-bold" style={{ color: C.headDark }}>
                    {price}
                    {period && (
                      <span className="text-base font-normal" style={{ color: C.bodyLight }}>
                        {period}
                      </span>
                    )}
                  </p>

                  <ul className="mt-5 mb-8 space-y-3 flex-1" role="list">
                    {perks.map((perk) => (
                      <li key={perk} className="flex items-start gap-2 text-sm" style={{ color: C.body }}>
                        <svg viewBox="0 0 24 24" className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke={C.peach} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        {perk}
                      </li>
                    ))}
                  </ul>

                  <a
                    href={authUrl(tier)}
                    className="block w-full text-center px-6 py-3 rounded-full font-semibold text-sm transition-colors"
                    style={{
                      backgroundColor: highlighted ? C.peach : 'transparent',
                      color: highlighted ? C.white : C.peach,
                      border: highlighted ? 'none' : `2px solid ${C.peach}`,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = highlighted ? C.peachDark : C.peach;
                      e.currentTarget.style.color = C.white;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = highlighted ? C.peach : 'transparent';
                      e.currentTarget.style.color = highlighted ? C.white : C.peach;
                    }}
                    aria-label={`${cta} — ${name} plan`}
                  >
                    {cta}
                  </a>
                </div>
              </FadeIn>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════════════════════════════════
         SECTION 4 — FINAL CTA
         ═══════════════════════════════════════ */}
      <section className="px-6 py-20 sm:py-28 text-center">
        <FadeIn>
          <p
            className="font-display text-2xl sm:text-3xl md:text-4xl font-bold italic max-w-2xl mx-auto"
            style={{ color: C.headDark }}
          >
            Your vinyl deserves better than a spreadsheet.
          </p>
        </FadeIn>

        <FadeIn className="mt-8">
          <a
            href={authUrl()}
            className="inline-flex items-center gap-2 px-8 py-3 rounded-full text-lg font-semibold transition-colors"
            style={{ backgroundColor: C.peach, color: C.white }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = C.peachDark)}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = C.peach)}
            aria-label="Start your collection for free"
          >
            Start Your Collection — Free
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </a>
        </FadeIn>
      </section>

      {/* ─── Footer ─── */}
      <footer
        className="text-center text-xs px-6 py-6"
        style={{ color: C.bodyLight, borderTop: `1px solid ${C.divider}` }}
      >
        &copy; {new Date().getFullYear()} <a href="https://www.sweetwater.technology" target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'none' }}>Sweetwater Technology</a>
      </footer>

      {/* ─── Fade-in animation styles ─── */}
      <style>{`
        .wlp-fade {
          opacity: 0;
          transform: translateY(16px);
          transition: opacity 0.6s ease-out, transform 0.6s ease-out;
        }
        .wlp-visible {
          opacity: 1;
          transform: translateY(0);
        }
      `}</style>
    </div>
  );
}

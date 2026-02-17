import React, { useState } from 'react';
import { updateProfile } from '../services/profileService';
import '../pages/Landing.css';

interface OnboardingWizardProps {
  userId: string;
  onComplete: (action: 'add' | 'explore') => void;
}

const STEPS = ['Welcome', 'Your Habits', 'Feature Tour', 'Get Started'] as const;

const GENRE_OPTIONS = [
  'Rock', 'Jazz', 'Hip-Hop', 'Electronic', 'Classical', 'Blues',
  'R&B/Soul', 'Country', 'Folk', 'Punk', 'Metal', 'Pop',
  'Reggae', 'Latin', 'Funk', 'World',
] as const;

const SETUP_OPTIONS = [
  { id: 'dedicated', emoji: '\uD83C\uDF9B\uFE0F', label: 'Dedicated Setup', desc: 'Turntable, receiver, speakers' },
  { id: 'casual', emoji: '\uD83C\uDFA7', label: 'Casual Listener', desc: 'Portable / bluetooth' },
  { id: 'new', emoji: '\uD83C\uDD95', label: 'Just Getting Started', desc: 'No setup yet' },
] as const;

const GOAL_OPTIONS = [
  { id: 'listener', emoji: '\uD83C\uDFB5', label: 'Casual Listener', desc: 'I just play what I like' },
  { id: 'completionist', emoji: '\uD83D\uDCC0', label: 'Completionist', desc: 'Gotta have every pressing' },
  { id: 'investor', emoji: '\uD83D\uDCB0', label: 'Investor', desc: 'Tracking value and rare finds' },
  { id: 'curator', emoji: '\uD83C\uDFA8', label: 'Curator', desc: "It's about the art and experience" },
] as const;

type SetupId = typeof SETUP_OPTIONS[number]['id'];
type GoalId = typeof GOAL_OPTIONS[number]['id'];

/* ─── Landing design tokens ─── */
const t = {
  peach: '#dd6e42',
  peachDark: '#c45a30',
  beige: '#e8dab2',
  slate: '#4f6d7a',
  slateDark: '#3a525d',
  slateLight: '#6a8c9a',
  sky: '#c0d6df',
  alabaster: '#eaeaea',
  bg: '#f7f4ef',
  bg2: '#efe9dd',
  bg3: '#e8dab2',
  text: '#2d3a3e',
  text2: '#4f6d7a',
  text3: '#7d9199',
  white: '#ffffff',
  radius: 12,
  radiusSm: 8,
  radiusXs: 6,
} as const;

const labelStyle: React.CSSProperties = {
  fontFamily: "'Space Mono',monospace",
  fontSize: '.7rem',
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '.1em',
  color: t.peach,
  marginBottom: 12,
};

const OnboardingWizard: React.FC<OnboardingWizardProps> = ({ userId, onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState<'forward' | 'back'>('forward');
  const [animKey, setAnimKey] = useState(0);

  const [selectedGenres, setSelectedGenres] = useState<Set<string>>(new Set());
  const [selectedSetup, setSelectedSetup] = useState<SetupId | null>(null);
  const [selectedGoal, setSelectedGoal] = useState<GoalId | null>(null);

  const isFirst = currentStep === 0;
  const isLast = currentStep === STEPS.length - 1;

  const isStep2Valid = selectedGenres.size > 0 && selectedSetup !== null && selectedGoal !== null;
  const canAdvance = currentStep !== 1 || isStep2Valid;

  const goNext = () => {
    if (!canAdvance || isLast) return;
    setDirection('forward');
    setAnimKey(k => k + 1);
    setCurrentStep(s => s + 1);
  };

  const goBack = () => {
    if (isFirst) return;
    setDirection('back');
    setAnimKey(k => k + 1);
    setCurrentStep(s => s - 1);
  };

  const toggleGenre = (genre: string) => {
    setSelectedGenres(prev => {
      const next = new Set(prev);
      if (next.has(genre)) next.delete(genre);
      else next.add(genre);
      return next;
    });
  };

  return (
    <div className="landing-page" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 16px' }}>
      {/* Decorative vinyl */}
      <div style={{ position: 'fixed', top: '50%', right: -100, transform: 'translateY(-50%)', width: 500, height: 500, pointerEvents: 'none', opacity: 0.04, zIndex: 0 }} aria-hidden="true">
        <svg viewBox="0 0 400 400" fill="none" style={{ width: '100%', height: '100%' }}>
          <circle cx="200" cy="200" r="195" fill={t.slate} />
          {[175, 155, 135, 115, 95].map(r => (
            <circle key={r} cx="200" cy="200" r={r} stroke={t.slateDark} strokeWidth="0.8" />
          ))}
          <circle cx="200" cy="200" r="60" fill={t.peach} opacity="0.6" />
          <circle cx="200" cy="200" r="8" fill={t.bg} />
        </svg>
      </div>

      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 520, boxSizing: 'border-box' }}>
        {/* Progress */}
        <div
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 32 }}
          role="progressbar"
          aria-label={`Onboarding progress, step ${currentStep + 1} of ${STEPS.length}`}
          aria-valuenow={currentStep + 1}
          aria-valuemin={1}
          aria-valuemax={STEPS.length}
        >
          {STEPS.map((label, i) => (
            <div
              key={label}
              title={label}
              style={{
                height: 6, borderRadius: 3, transition: 'all 0.5s',
                width: i === currentStep ? 32 : 16,
                background: i <= currentStep ? t.peach : t.alabaster,
                opacity: i < currentStep ? 0.5 : 1,
              }}
            />
          ))}
        </div>

        {/* Card */}
        <div style={{
          background: t.white, borderRadius: t.radius, border: `2px solid ${t.beige}`,
          padding: 'clamp(24px, 4vw, 40px) clamp(16px, 3vw, 36px)', minHeight: 400, display: 'flex', flexDirection: 'column',
          boxShadow: '0 12px 36px rgba(79,109,122,.12)', animation: 'auth-slide-up .3s ease-out',
          overflow: 'hidden',
        }}>
          <div
            key={animKey}
            style={{
              flex: 1, display: 'flex', flexDirection: 'column',
              animation: direction === 'forward' ? 'auth-slide-up .35s ease-out' : 'auth-fade-in .3s ease-out',
            }}
          >
            {currentStep === 0 && <StepWelcome />}
            {currentStep === 1 && (
              <StepHabits
                selectedGenres={selectedGenres} selectedSetup={selectedSetup} selectedGoal={selectedGoal}
                onToggleGenre={toggleGenre} onSelectSetup={setSelectedSetup} onSelectGoal={setSelectedGoal}
              />
            )}
            {currentStep === 2 && <StepFeatureTour />}
            {currentStep === 3 && (
              <StepGetStarted userId={userId} selectedGenres={selectedGenres} selectedSetup={selectedSetup} selectedGoal={selectedGoal} onComplete={onComplete} />
            )}
          </div>

          {/* Nav — hidden on last step */}
          {!isLast && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 32, paddingTop: 24, borderTop: `2px solid ${t.alabaster}` }}>
              {!isFirst ? (
                <button type="button" onClick={goBack} className="nav-sign-in" style={{ padding: '10px 20px' }} aria-label={`Back to ${STEPS[currentStep - 1]}`}>
                  Back
                </button>
              ) : <div />}

              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {currentStep === 1 && !canAdvance && (
                  <span style={{ color: t.text3, fontSize: '.7rem', fontFamily: "'Space Mono',monospace", letterSpacing: '.03em' }}>
                    Complete all sections
                  </span>
                )}
                <button
                  type="button" onClick={goNext} disabled={!canAdvance}
                  className={canAdvance ? 'btn-primary' : ''}
                  style={{
                    ...(canAdvance ? {} : { background: t.alabaster, color: t.text3, cursor: 'not-allowed', boxShadow: 'none', border: 'none', padding: '12px 28px', borderRadius: t.radiusSm, fontSize: '.9rem', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '.03em' }),
                    padding: '12px 28px',
                  }}
                  aria-label={`Next: ${STEPS[currentStep + 1]}`}
                  aria-disabled={!canAdvance}
                >
                  Next
                </button>
              </div>
            </div>
          )}

          {isLast && (
            <div style={{ marginTop: 24, paddingTop: 16, borderTop: `2px solid ${t.alabaster}` }}>
              <button type="button" onClick={goBack} className="nav-sign-in" style={{ padding: '10px 20px' }} aria-label={`Back to ${STEPS[currentStep - 1]}`}>
                Back
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/* ─── Step 1: Welcome ─── */
const StepWelcome: React.FC = () => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', flex: 1 }}>
    <div style={{ marginBottom: 24 }} aria-hidden="true">
      <svg viewBox="0 0 400 400" fill="none" style={{ width: 80, height: 80, opacity: 0.12 }}>
        <circle cx="200" cy="200" r="195" fill={t.slate} />
        {[175, 155, 135, 115, 95].map(r => (
          <circle key={r} cx="200" cy="200" r={r} stroke={t.slateDark} strokeWidth="0.8" />
        ))}
        <circle cx="200" cy="200" r="60" fill={t.peach} opacity="0.6" />
        <circle cx="200" cy="200" r="8" fill={t.bg} />
      </svg>
    </div>

    <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: 'clamp(2rem,4vw,2.75rem)', fontWeight: 700, color: t.slateDark, marginBottom: 12, letterSpacing: '-.02em' }}>
      Rekk<span style={{ color: t.peach }}>r</span>d
    </h2>
    <p style={{ color: t.text2, fontSize: '1.05rem', marginBottom: 16 }}>
      Your vinyl collection, organized.
    </p>
    <p style={{ color: t.text3, fontSize: '.9rem', maxWidth: 340, lineHeight: 1.65 }}>
      Scan album covers with AI, build your digital crate, and generate playlists from what you actually own.
    </p>

    <div style={{ marginTop: 32, display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 16px', borderRadius: t.radiusSm, background: 'rgba(221,110,66,.08)', border: '1.5px solid rgba(221,110,66,.2)' }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: t.peach, animation: 'landing-pulse 2s ease-in-out infinite' }} />
      <span style={{ fontFamily: "'Space Mono',monospace", fontSize: '.7rem', fontWeight: 700, color: t.peach, letterSpacing: '.08em', textTransform: 'uppercase' }}>
        Let's get started
      </span>
    </div>
  </div>
);

/* ─── Step 2: Your Habits ─── */
interface StepHabitsProps {
  selectedGenres: Set<string>;
  selectedSetup: SetupId | null;
  selectedGoal: GoalId | null;
  onToggleGenre: (genre: string) => void;
  onSelectSetup: (id: SetupId) => void;
  onSelectGoal: (id: GoalId) => void;
}

const StepHabits: React.FC<StepHabitsProps> = ({
  selectedGenres, selectedSetup, selectedGoal, onToggleGenre, onSelectSetup, onSelectGoal,
}) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 24, flex: 1, overflowY: 'auto' }}>
    <div style={{ textAlign: 'center' }}>
      <div style={labelStyle}>// Your Habits</div>
      <h3 style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.5rem', fontWeight: 700, color: t.slateDark }}>
        Tell Us About You
      </h3>
    </div>

    {/* Genres */}
    <div>
      <p style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: 8 }}>
        Favorite Genres
        {selectedGenres.size > 0 && <span style={{ color: t.text3, fontWeight: 400 }}>({selectedGenres.size})</span>}
      </p>
      <div role="group" aria-label="Select your favorite genres" style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {GENRE_OPTIONS.map(genre => {
          const sel = selectedGenres.has(genre);
          return (
            <button key={genre} type="button" role="switch" aria-checked={sel} onClick={() => onToggleGenre(genre)}
              style={{
                padding: '6px 14px', borderRadius: t.radiusSm, fontSize: '.8rem', fontWeight: 600, cursor: 'pointer', transition: 'all .2s',
                border: sel ? `2px solid ${t.peach}` : `1.5px solid ${t.alabaster}`,
                background: sel ? 'rgba(221,110,66,.08)' : 'transparent',
                color: sel ? t.peach : t.text2,
                transform: sel ? 'scale(1.04)' : 'scale(1)',
              }}
            >
              {genre}
            </button>
          );
        })}
      </div>
    </div>

    {/* Setup */}
    <div>
      <p style={labelStyle}>Listening Setup</p>
      <div role="radiogroup" aria-label="Select your listening setup" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 8 }}>
        {SETUP_OPTIONS.map(opt => {
          const sel = selectedSetup === opt.id;
          return (
            <button key={opt.id} type="button" role="radio" aria-checked={sel} onClick={() => onSelectSetup(opt.id)}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: 12,
                borderRadius: t.radius, cursor: 'pointer', transition: 'all .2s',
                border: sel ? `2px solid ${t.peach}` : `2px solid ${t.alabaster}`,
                background: sel ? 'rgba(221,110,66,.06)' : t.white,
                transform: sel ? 'scale(1.03)' : 'scale(1)',
                boxShadow: sel ? '0 4px 16px rgba(221,110,66,.12)' : 'none',
              }}
            >
              <span style={{ fontSize: '1.3rem' }} aria-hidden="true">{opt.emoji}</span>
              <span style={{ fontSize: '.7rem', fontWeight: 700, color: sel ? t.peach : t.text2, letterSpacing: '.02em' }}>{opt.label}</span>
              <span style={{ fontSize: '.65rem', color: t.text3, lineHeight: 1.3, textAlign: 'center' }}>{opt.desc}</span>
            </button>
          );
        })}
      </div>
    </div>

    {/* Goals */}
    <div>
      <p style={labelStyle}>Collecting Goal</p>
      <div role="radiogroup" aria-label="Select your collecting goal" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 8 }}>
        {GOAL_OPTIONS.map(opt => {
          const sel = selectedGoal === opt.id;
          return (
            <button key={opt.id} type="button" role="radio" aria-checked={sel} onClick={() => onSelectGoal(opt.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: 12,
                borderRadius: t.radius, cursor: 'pointer', transition: 'all .2s', textAlign: 'left',
                border: sel ? `2px solid ${t.peach}` : `2px solid ${t.alabaster}`,
                background: sel ? 'rgba(221,110,66,.06)' : t.white,
                transform: sel ? 'scale(1.02)' : 'scale(1)',
                boxShadow: sel ? '0 4px 16px rgba(221,110,66,.12)' : 'none',
              }}
            >
              <span style={{ fontSize: '1.3rem', flexShrink: 0 }} aria-hidden="true">{opt.emoji}</span>
              <div>
                <span style={{ display: 'block', fontSize: '.75rem', fontWeight: 700, color: sel ? t.peach : t.text2 }}>{opt.label}</span>
                <span style={{ fontSize: '.65rem', color: t.text3, lineHeight: 1.3 }}>{opt.desc}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  </div>
);

/* ─── Step 3: Feature Tour ─── */
const FEATURES = [
  { title: 'Add Albums', desc: 'Scan, search, or manually add albums to your collection', preview: 'album-card' },
  { title: 'AI-Powered Details', desc: 'Get descriptions, tracklists, and price estimates powered by AI', preview: 'album-detail' },
  { title: 'Playlist Studio', desc: 'Create and organize playlists from your collection', preview: 'playlist' },
  { title: 'Track & Explore', desc: 'Filter by genre, condition, favorites \u2014 know your collection', preview: 'filters' },
] as const;

type FeaturePreview = typeof FEATURES[number]['preview'];

const FeaturePreviewCard: React.FC<{ type: FeaturePreview }> = ({ type }) => {
  if (type === 'album-card') {
    return (
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <div style={{ width: 72, height: 72, borderRadius: t.radiusSm, background: `linear-gradient(135deg,${t.beige},${t.peach})`, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>
          {'\uD83C\uDFB6'}
        </div>
        <div>
          <p style={{ fontSize: '.85rem', fontWeight: 700, color: t.slateDark }}>Kind of Blue</p>
          <p style={{ fontSize: '.8rem', color: t.text2 }}>Miles Davis</p>
          <p style={{ fontSize: '.7rem', color: t.text3, marginTop: 2 }}>1959 &middot; Jazz</p>
          <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
            <span style={{ padding: '3px 10px', borderRadius: t.radiusXs, background: 'rgba(221,110,66,.08)', border: '1px solid rgba(221,110,66,.15)', fontSize: '.65rem', fontWeight: 700, color: t.peach, fontFamily: "'Space Mono',monospace" }}>Near Mint</span>
            <span style={{ padding: '3px 10px', borderRadius: t.radiusXs, background: t.bg2, fontSize: '.65rem', fontWeight: 700, color: t.text3, fontFamily: "'Space Mono',monospace" }}>$38</span>
          </div>
        </div>
      </div>
    );
  }

  if (type === 'album-detail') {
    return (
      <div>
        <p style={{ fontSize: '.8rem', color: t.text2, lineHeight: 1.65, fontStyle: 'italic', fontFamily: "'Playfair Display',serif", marginBottom: 12 }}>
          "A landmark modal jazz recording that redefined improvisation. Davis assembled an iconic sextet to create music of extraordinary beauty."
        </p>
        <div style={{ borderTop: `1.5px solid ${t.alabaster}`, paddingTop: 10, marginBottom: 10 }}>
          <p style={{ ...labelStyle, marginBottom: 8 }}>Tracklist</p>
          {['So What', 'Freddie Freeloader', 'Blue in Green', 'All Blues'].map((tr, i) => (
            <div key={tr} style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
              <span style={{ fontSize: '.75rem', color: t.text2 }}><span style={{ color: t.text3, marginRight: 6 }}>{i + 1}.</span>{tr}</span>
              <span style={{ fontSize: '.7rem', color: t.text3, fontFamily: "'Space Mono',monospace" }}>{['9:22', '9:46', '5:27', '11:33'][i]}</span>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 16, paddingTop: 8, borderTop: `1.5px solid ${t.alabaster}` }}>
          <div><p style={{ fontSize: '.65rem', color: t.text3, fontFamily: "'Space Mono',monospace", textTransform: 'uppercase' }}>Low</p><p style={{ fontSize: '.8rem', color: t.text2 }}>$22</p></div>
          <div><p style={{ fontSize: '.65rem', color: t.peach, fontFamily: "'Space Mono',monospace", textTransform: 'uppercase' }}>Median</p><p style={{ fontSize: '.8rem', color: t.peach, fontWeight: 700 }}>$38</p></div>
          <div><p style={{ fontSize: '.65rem', color: t.text3, fontFamily: "'Space Mono',monospace", textTransform: 'uppercase' }}>High</p><p style={{ fontSize: '.8rem', color: t.text2 }}>$65</p></div>
        </div>
      </div>
    );
  }

  if (type === 'playlist') {
    return (
      <div>
        <div style={{ marginBottom: 12 }}>
          <span className="mood-badge">Late Night Jazz</span>
        </div>
        {[
          { n: '01', title: 'So What', artist: 'Miles Davis' },
          { n: '02', title: 'Take Five', artist: 'Dave Brubeck' },
          { n: '03', title: "'Round Midnight", artist: 'Thelonious Monk' },
          { n: '04', title: 'A Love Supreme Pt. I', artist: 'John Coltrane' },
        ].map(tr => (
          <div key={tr.n} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: t.radiusXs, background: t.bg, border: `1.5px solid ${t.alabaster}`, marginBottom: 6 }}>
            <span style={{ fontFamily: "'Space Mono',monospace", fontSize: '.7rem', color: t.text3, width: 20, fontWeight: 700 }}>{tr.n}</span>
            <div style={{ width: 32, height: 32, borderRadius: t.radiusXs, background: `linear-gradient(135deg,${t.bg2},${t.bg3})`, flexShrink: 0 }} />
            <div style={{ minWidth: 0, flex: 1 }}>
              <p style={{ fontSize: '.8rem', fontWeight: 600, color: t.slateDark, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tr.title}</p>
              <p style={{ fontSize: '.7rem', color: t.text3 }}>{tr.artist}</p>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // filters
  return (
    <div>
      <div style={{ marginBottom: 12 }}>
        <p style={{ ...labelStyle, marginBottom: 8 }}>Genre</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {['Jazz', 'Rock', 'Soul', 'Electronic'].map((g, i) => (
            <span key={g} style={{
              padding: '5px 12px', borderRadius: t.radiusSm, fontSize: '.75rem', fontWeight: 600,
              border: i < 2 ? `2px solid ${t.peach}` : `1.5px solid ${t.alabaster}`,
              background: i < 2 ? 'rgba(221,110,66,.08)' : 'transparent',
              color: i < 2 ? t.peach : t.text3,
            }}>{g}</span>
          ))}
        </div>
      </div>
      <div style={{ marginBottom: 12 }}>
        <p style={{ ...labelStyle, marginBottom: 8 }}>Condition</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {['Mint', 'Near Mint', 'Very Good+'].map((cond, i) => (
            <span key={cond} style={{
              padding: '5px 12px', borderRadius: t.radiusSm, fontSize: '.75rem', fontWeight: 600,
              border: i === 1 ? `2px solid ${t.peach}` : `1.5px solid ${t.alabaster}`,
              background: i === 1 ? 'rgba(221,110,66,.08)' : 'transparent',
              color: i === 1 ? t.peach : t.text3,
            }}>{cond}</span>
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 4 }}>
        <div style={{ width: 36, height: 20, borderRadius: t.radiusSm, background: t.peach, position: 'relative' }}>
          <div style={{ position: 'absolute', top: 3, left: 18, width: 14, height: 14, borderRadius: 6, background: t.white, boxShadow: '0 2px 4px rgba(0,0,0,.1)' }} />
        </div>
        <span style={{ fontSize: '.75rem', color: t.text2 }}>Favorites only</span>
      </div>
    </div>
  );
};

const StepFeatureTour: React.FC = () => {
  const [featureIdx, setFeatureIdx] = useState(0);
  const feature = FEATURES[featureIdx];

  const goPrev = () => setFeatureIdx(i => (i - 1 + FEATURES.length) % FEATURES.length);
  const goFeatureNext = () => setFeatureIdx(i => (i + 1) % FEATURES.length);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <div style={labelStyle}>// Feature Tour</div>
        <h3 style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.5rem', fontWeight: 700, color: t.slateDark }}>What You Can Do</h3>
      </div>

      {/* Dots */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 16 }} role="tablist" aria-label="Feature tour navigation">
        {FEATURES.map((f, i) => (
          <button key={f.title} type="button" role="tab" aria-selected={i === featureIdx} aria-label={f.title} onClick={() => setFeatureIdx(i)}
            style={{ height: 6, borderRadius: 3, transition: 'all 0.3s', width: i === featureIdx ? 24 : 12, background: i === featureIdx ? t.peach : t.alabaster, border: 'none', cursor: 'pointer', padding: 0 }}
          />
        ))}
      </div>

      <div role="tabpanel" aria-label={feature.title} aria-live="polite" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <p style={{ fontSize: '1rem', fontWeight: 700, color: t.slateDark, fontFamily: "'Playfair Display',serif" }}>{feature.title}</p>
          <p style={{ fontSize: '.85rem', color: t.text3, marginTop: 4 }}>{feature.desc}</p>
        </div>

        <div style={{ flex: 1, borderRadius: t.radius, border: `2px solid ${t.alabaster}`, background: t.bg, overflow: 'hidden', padding: 16 }}>
          <div style={{ transform: 'scale(0.88)', transformOrigin: 'top left' }}>
            <FeaturePreviewCard type={feature.preview} />
          </div>
        </div>
      </div>

      {/* Arrows */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 16 }}>
        <button type="button" onClick={goPrev} aria-label="Previous feature"
          style={{ background: 'none', border: `1.5px solid ${t.alabaster}`, borderRadius: t.radiusSm, padding: 8, cursor: 'pointer', color: t.text3, display: 'flex', transition: 'all .2s' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 19l-7-7 7-7" /></svg>
        </button>
        <span style={{ fontFamily: "'Space Mono',monospace", fontSize: '.7rem', color: t.text3, fontWeight: 700 }}>
          {featureIdx + 1} / {FEATURES.length}
        </span>
        <button type="button" onClick={goFeatureNext} aria-label="Next feature"
          style={{ background: 'none', border: `1.5px solid ${t.alabaster}`, borderRadius: t.radiusSm, padding: 8, cursor: 'pointer', color: t.text3, display: 'flex', transition: 'all .2s' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 5l7 7-7 7" /></svg>
        </button>
      </div>
    </div>
  );
};

/* ─── Step 4: Get Started ─── */
interface StepGetStartedProps {
  userId: string;
  selectedGenres: Set<string>;
  selectedSetup: SetupId | null;
  selectedGoal: GoalId | null;
  onComplete: (action: 'add' | 'explore') => void;
}

const StepGetStarted: React.FC<StepGetStartedProps> = ({ userId, selectedGenres, selectedSetup, selectedGoal, onComplete }) => {
  const [saving, setSaving] = useState<'add' | 'explore' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const setupLabel = SETUP_OPTIONS.find(o => o.id === selectedSetup)?.label ?? '';
  const goalOption = GOAL_OPTIONS.find(o => o.id === selectedGoal);

  const handleFinish = async (action: 'add' | 'explore') => {
    setSaving(action);
    setError(null);
    try {
      await updateProfile(userId, {
        favorite_genres: [...selectedGenres],
        listening_setup: selectedSetup,
        collecting_goal: selectedGoal,
        onboarding_completed: true,
      });
    } catch (err) {
      console.error('Failed to save onboarding profile:', err);
      setError('Could not save preferences \u2014 you can update them later.');
    }
    onComplete(action);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div style={labelStyle}>// All Set</div>
        <h3 style={{ fontFamily: "'Playfair Display',serif", fontSize: '1.75rem', fontWeight: 700, color: t.slateDark }}>
          You're Ready to <em style={{ color: t.peach, fontWeight: 400 }}>Rekkrd</em>
        </h3>
        <p style={{ color: t.text3, fontSize: '.9rem', marginTop: 8 }}>Here's what we know about you</p>
      </div>

      {/* Summary */}
      <div style={{ width: '100%', marginBottom: 24 }}>
        {selectedGenres.size > 0 && (
          <div style={{ marginBottom: 16 }}>
            <p style={{ ...labelStyle, marginBottom: 8 }}>Your Genres</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {[...selectedGenres].map(g => (
                <span key={g} style={{ padding: '4px 12px', borderRadius: t.radiusSm, fontSize: '.75rem', fontWeight: 600, background: 'rgba(221,110,66,.08)', border: '1.5px solid rgba(221,110,66,.2)', color: t.peach }}>{g}</span>
              ))}
            </div>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {selectedSetup && (
            <div style={{ borderRadius: t.radius, border: `2px solid ${t.alabaster}`, background: t.bg, padding: 14, textAlign: 'center' }}>
              <p style={{ fontFamily: "'Space Mono',monospace", fontSize: '.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em', color: t.text3, marginBottom: 4 }}>Setup</p>
              <p style={{ fontSize: '.85rem', fontWeight: 600, color: t.slateDark }}>{setupLabel}</p>
            </div>
          )}
          {goalOption && (
            <div style={{ borderRadius: t.radius, border: `2px solid ${t.alabaster}`, background: t.bg, padding: 14, textAlign: 'center' }}>
              <p style={{ fontFamily: "'Space Mono',monospace", fontSize: '.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em', color: t.text3, marginBottom: 4 }}>Goal</p>
              <p style={{ fontSize: '.85rem', fontWeight: 600, color: t.slateDark }}>{goalOption.label}</p>
            </div>
          )}
        </div>
      </div>

      {/* Error */}
      <div aria-live="assertive" style={{ width: '100%', minHeight: 20, marginBottom: 8 }}>
        {error && <p role="alert" style={{ color: t.peachDark, fontSize: '.8rem', textAlign: 'center' }}>{error}</p>}
      </div>

      {/* CTAs */}
      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <button type="button" onClick={() => handleFinish('add')} disabled={saving !== null} aria-label="Add your first album"
          className="btn-primary"
          style={{ width: '100%', justifyContent: 'center', opacity: saving !== null ? 0.6 : 1, cursor: saving ? 'wait' : 'pointer', display: 'inline-flex', gap: 8 }}>
          {saving === 'add' ? (
            <span style={{ display: 'inline-block', width: 16, height: 16, border: '2px solid rgba(255,255,255,.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'landing-pulse 0.6s linear infinite' }} />
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          )}
          Add Your First Album
        </button>

        <button type="button" onClick={() => handleFinish('explore')} disabled={saving !== null} aria-label="Explore the app"
          className="btn-secondary"
          style={{ width: '100%', justifyContent: 'center', opacity: saving !== null ? 0.6 : 1, cursor: saving ? 'wait' : 'pointer', display: 'inline-flex', gap: 8 }}>
          {saving === 'explore' ? (
            <span style={{ display: 'inline-block', width: 16, height: 16, border: `2px solid ${t.slateLight}`, borderTopColor: t.slate, borderRadius: '50%', animation: 'landing-pulse 0.6s linear infinite' }} />
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
          )}
          Explore the App
        </button>
      </div>

      <p style={{ color: t.text3, fontSize: '.75rem', marginTop: 20, textAlign: 'center' }}>
        You can update these anytime in your profile
      </p>
    </div>
  );
};

export default OnboardingWizard;

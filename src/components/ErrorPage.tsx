import { useEffect, useState } from 'react';
import SEO from './SEO';

type ErrorType = '404' | '500' | 'offline';

interface ErrorPageProps {
  type: ErrorType;
  onGoHome?: () => void;
}

/* ─── animation keyframes ─── */
const animationStyles = `
  @keyframes ep-blink {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.4; }
  }
  @keyframes ep-flicker {
    0%, 100% { opacity: 0.8; }
    20% { opacity: 0.2; }
    40% { opacity: 0.7; }
    60% { opacity: 0.1; }
    80% { opacity: 0.9; }
  }
  @keyframes ep-pulse {
    0%, 100% { opacity: 0.8; }
    50% { opacity: 0.3; }
  }
  @keyframes ep-smoke1 {
    0% { transform: translateY(0); opacity: 0.4; }
    100% { transform: translateY(-10px); opacity: 0; }
  }
  @keyframes ep-smoke2 {
    0% { transform: translateY(0); opacity: 0.35; }
    100% { transform: translateY(-10px); opacity: 0; }
  }
  @keyframes ep-smoke3 {
    0% { transform: translateY(0); opacity: 0.3; }
    100% { transform: translateY(-10px); opacity: 0; }
  }
  @keyframes ep-smoke4 {
    0% { transform: translateY(0); opacity: 0.45; }
    100% { transform: translateY(-10px); opacity: 0; }
  }
  @keyframes ep-glow-pulse {
    0%, 100% { opacity: 0.08; }
    50% { opacity: 0.15; }
  }

  @media (prefers-reduced-motion: reduce) {
    .ep-blink, .ep-flicker, .ep-pulse,
    .ep-smoke, .ep-glow-pulse { animation: none !important; }
    .ep-blink { opacity: 1 !important; }
    .ep-flicker { opacity: 0.8 !important; }
    .ep-pulse { opacity: 0.5 !important; }
    .ep-smoke { opacity: 0 !important; }
    .ep-glow-pulse { opacity: 0.1 !important; }
  }
`;

/* ─── 404 "Signal Lost" illustration ─── */
function Signal404() {
  return (
    <svg
      viewBox="0 0 350 250"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Illustration of a stereo receiver with an unplugged cable"
      className="w-full max-w-[350px] h-auto"
      style={{ strokeLinecap: 'round', strokeLinejoin: 'round' }}
    >
      {/* ── Surface / shelf line ── */}
      <line x1="20" y1="168" x2="330" y2="168" stroke="#c0d6df" strokeWidth="0.8" opacity="0.3" />

      {/* ── Receiver chassis ── */}
      <rect x="35" y="100" width="280" height="68" rx="4" stroke="#c0d6df" strokeWidth="1.5" />

      {/* Ventilation slits on top */}
      {[80, 110, 140, 170, 200, 230, 260].map((x) => (
        <line key={x} x1={x} y1="103" x2={x + 20} y2="103" stroke="#c0d6df" strokeWidth="0.7" opacity="0.25" />
      ))}

      {/* Display window */}
      <rect x="60" y="112" width="180" height="26" rx="3" stroke="#c0d6df" strokeWidth="1" opacity="0.5" />
      <rect x="62" y="114" width="176" height="22" rx="2" fill="#c0d6df" fillOpacity="0.04" />

      {/* "NO SIGNAL" text in display */}
      <text
        x="150"
        y="127"
        textAnchor="middle"
        dominantBaseline="central"
        fontFamily="'Space Mono', monospace"
        fontSize="11"
        letterSpacing="0.1em"
        fill="#dd6e42"
        className="ep-blink"
        style={{ animation: 'ep-blink 2s ease-in-out infinite' }}
      >
        NO SIGNAL
      </text>

      {/* Power LED */}
      <circle cx="52" cy="152" r="2.5" fill="#dd6e42" opacity="0.8" />

      {/* Front panel knobs */}
      {[90, 120, 150, 180, 210, 240].map((x) => (
        <g key={x}>
          <circle cx={x} cy="152" r="5" stroke="#c0d6df" strokeWidth="1" opacity="0.5" />
          <line x1={x} y1="147" x2={x} y2="150" stroke="#c0d6df" strokeWidth="0.8" opacity="0.4" />
        </g>
      ))}

      {/* ── Back panel peek (angled, right side) ── */}
      <path
        d="M315 100 L330 90 L330 130 L315 140"
        stroke="#c0d6df"
        strokeWidth="1"
        opacity="0.35"
        fill="rgba(255,255,255,0.02)"
      />
      {/* Empty jack/port on back */}
      <rect x="319" y="105" width="8" height="6" rx="1" stroke="#c0d6df" strokeWidth="1" opacity="0.5" />
      <circle cx="323" cy="108" r="1.5" stroke="#c0d6df" strokeWidth="0.6" opacity="0.4" />

      {/* ── Signal wave lines near empty port ── */}
      <path d="M332 104 Q336 102, 334 100" stroke="#c0d6df" strokeWidth="0.8" opacity="0.3" fill="none" />
      <path d="M334 107 Q339 105, 337 102" stroke="#c0d6df" strokeWidth="0.6" opacity="0.2" fill="none" />
      <path d="M336 110 Q342 108, 339 105" stroke="#c0d6df" strokeWidth="0.5" opacity="0.15" fill="none" />

      {/* ── Trailing unplugged cable ── */}
      {/* Cable starts near back panel, drapes down right side, trails along bottom */}
      <path
        d="M323 111 C323 130, 328 145, 320 168 C312 191, 280 200, 240 205 C200 210, 160 202, 130 208 C100 214, 85 210, 70 215"
        stroke="#c0d6df"
        strokeWidth="2"
        fill="none"
      />

      {/* Cable shadow on surface */}
      <ellipse cx="190" cy="212" rx="80" ry="3" fill="#c0d6df" fillOpacity="0.05" />

      {/* ── RCA connector at cable end ── */}
      <g transform="translate(60, 210) rotate(-15)">
        {/* Connector body (cylinder) */}
        <rect x="0" y="-4" width="16" height="8" rx="2" stroke="#c0d6df" strokeWidth="1.2" fill="rgba(255,255,255,0.02)" />
        {/* Red accent ring */}
        <rect x="14" y="-5" width="4" height="10" rx="1.5" stroke="#dd6e42" strokeWidth="1" fill="none" />
        {/* Center pin */}
        <line x1="19" y1="0" x2="24" y2="0" stroke="#c0d6df" strokeWidth="1.2" />
        <circle cx="24.5" cy="0" r="1" fill="#c0d6df" fillOpacity="0.5" />
      </g>

      {/* Small shadow under connector */}
      <ellipse cx="72" cy="222" rx="14" ry="2" fill="#c0d6df" fillOpacity="0.08" />
    </svg>
  );
}

/* ─── 500 "Something Overheated" illustration ─── */
function Overheated500() {
  return (
    <svg
      viewBox="0 0 350 250"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Illustration of a stereo receiver overheating with smoke rising"
      className="w-full max-w-[350px] h-auto"
      style={{ strokeLinecap: 'round', strokeLinejoin: 'round' }}
    >
      {/* ── Smoke/heat lines rising from ventilation ── */}
      <path
        d="M100 88 C98 78, 104 72, 102 62"
        stroke="#c0d6df"
        strokeWidth="1"
        className="ep-smoke"
        style={{ animation: 'ep-smoke1 3s ease-in-out infinite' }}
      />
      <path
        d="M150 86 C153 76, 147 70, 150 60"
        stroke="#c0d6df"
        strokeWidth="1"
        className="ep-smoke"
        style={{ animation: 'ep-smoke2 3s ease-in-out infinite 0.5s' }}
      />
      <path
        d="M200 87 C197 77, 203 71, 200 61"
        stroke="#c0d6df"
        strokeWidth="1"
        className="ep-smoke"
        style={{ animation: 'ep-smoke3 3s ease-in-out infinite 1s' }}
      />
      <path
        d="M250 88 C252 78, 248 72, 251 62"
        stroke="#c0d6df"
        strokeWidth="1"
        className="ep-smoke"
        style={{ animation: 'ep-smoke4 3s ease-in-out infinite 1.5s' }}
      />

      {/* ── Surface / shelf line ── */}
      <line x1="20" y1="168" x2="330" y2="168" stroke="#c0d6df" strokeWidth="0.8" opacity="0.3" />

      {/* ── Receiver chassis ── */}
      <rect x="35" y="100" width="280" height="68" rx="4" stroke="#c0d6df" strokeWidth="1.5" />

      {/* Ventilation slits on top */}
      {[80, 110, 140, 170, 200, 230, 260].map((x) => (
        <line key={x} x1={x} y1="103" x2={x + 20} y2="103" stroke="#c0d6df" strokeWidth="0.7" opacity="0.25" />
      ))}

      {/* Display window */}
      <rect x="60" y="112" width="180" height="26" rx="3" stroke="#c0d6df" strokeWidth="1" opacity="0.5" />
      <rect x="62" y="114" width="176" height="22" rx="2" fill="#c0d6df" fillOpacity="0.04" />

      {/* "ERR" text in display */}
      <text
        x="150"
        y="127"
        textAnchor="middle"
        dominantBaseline="central"
        fontFamily="'Space Mono', monospace"
        fontSize="11"
        letterSpacing="0.1em"
        fill="#dd6e42"
      >
        ERR
      </text>

      {/* Power LED — flickering */}
      <circle
        cx="52"
        cy="152"
        r="2.5"
        fill="#dd6e42"
        className="ep-flicker"
        style={{ animation: 'ep-flicker 0.3s steps(2) infinite' }}
      />

      {/* Front panel knobs */}
      {[90, 120, 150, 180, 210, 240].map((x) => (
        <g key={x}>
          <circle cx={x} cy="152" r="5" stroke="#c0d6df" strokeWidth="1" opacity="0.5" />
          <line x1={x} y1="147" x2={x} y2="150" stroke="#c0d6df" strokeWidth="0.8" opacity="0.4" />
        </g>
      ))}
    </svg>
  );
}

/* ─── Offline "Warming Up the Tubes" illustration ─── */
function OfflineStandby() {
  return (
    <svg
      viewBox="0 0 350 250"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Illustration of a stereo receiver in standby mode warming up"
      className="w-full max-w-[350px] h-auto"
      style={{ strokeLinecap: 'round', strokeLinejoin: 'round' }}
    >
      {/* ── Warm glow from ventilation slits ── */}
      <rect
        x="70"
        y="95"
        width="210"
        height="12"
        rx="4"
        fill="#dd6e42"
        className="ep-glow-pulse"
        style={{ animation: 'ep-glow-pulse 3s ease-in-out infinite' }}
      />

      {/* ── Surface / shelf line ── */}
      <line x1="20" y1="168" x2="330" y2="168" stroke="#c0d6df" strokeWidth="0.8" opacity="0.3" />

      {/* ── Receiver chassis ── */}
      <rect x="35" y="100" width="280" height="68" rx="4" stroke="#c0d6df" strokeWidth="1.5" />

      {/* Ventilation slits on top */}
      {[80, 110, 140, 170, 200, 230, 260].map((x) => (
        <line key={x} x1={x} y1="103" x2={x + 20} y2="103" stroke="#c0d6df" strokeWidth="0.7" opacity="0.25" />
      ))}

      {/* Display window */}
      <rect x="60" y="112" width="180" height="26" rx="3" stroke="#c0d6df" strokeWidth="1" opacity="0.5" />
      <rect x="62" y="114" width="176" height="22" rx="2" fill="#c0d6df" fillOpacity="0.04" />

      {/* "STANDBY" text in display */}
      <text
        x="150"
        y="127"
        textAnchor="middle"
        dominantBaseline="central"
        fontFamily="'Space Mono', monospace"
        fontSize="11"
        letterSpacing="0.1em"
        fill="#dd6e42"
      >
        STANDBY
      </text>

      {/* Power LED — slow pulse (warming up) */}
      <circle
        cx="52"
        cy="152"
        r="2.5"
        fill="#dd6e42"
        className="ep-pulse"
        style={{ animation: 'ep-pulse 2s ease-in-out infinite' }}
      />

      {/* Front panel knobs — all turned to zero/off (indicator at bottom) */}
      {[90, 120, 150, 180, 210, 240].map((x) => (
        <g key={x}>
          <circle cx={x} cy="152" r="5" stroke="#c0d6df" strokeWidth="1" opacity="0.5" />
          <line x1={x} y1="155" x2={x} y2="157" stroke="#c0d6df" strokeWidth="0.8" opacity="0.4" />
        </g>
      ))}
    </svg>
  );
}

/* ─── Error content config ─── */
const errorContent = {
  '404': {
    code: '404',
    heading: 'Signal Lost',
    description:
      "The page you're looking for isn't in the crate. It may have been moved or doesn't exist.",
    buttonText: 'Back to the Collection',
    buttonAction: 'goHome' as const,
    Illustration: Signal404,
  },
  '500': {
    code: '500',
    heading: 'Something Overheated',
    description:
      "Our system hit a snag. We're looking into it — try again in a moment.",
    buttonText: 'Try Again',
    buttonAction: 'reload' as const,
    Illustration: Overheated500,
  },
  offline: {
    code: 'Offline',
    heading: 'Warming Up the Tubes',
    description:
      "We're doing a bit of maintenance. Should be back spinning shortly.",
    buttonText: 'Refresh',
    buttonAction: 'reload' as const,
    Illustration: OfflineStandby,
  },
};

/* ─── Main component ─── */
export default function ErrorPage({ type, onGoHome }: ErrorPageProps) {
  const [stylesInjected, setStylesInjected] = useState(false);
  const { code, heading, description, buttonText, buttonAction, Illustration } =
    errorContent[type];

  /* inject animation keyframes once */
  useEffect(() => {
    if (stylesInjected) return;
    const id = 'ep-animation-styles';
    if (!document.getElementById(id)) {
      const style = document.createElement('style');
      style.id = id;
      style.textContent = animationStyles;
      document.head.appendChild(style);
    }
    setStylesInjected(true);
  }, [stylesInjected]);

  function handlePrimaryClick() {
    if (buttonAction === 'goHome' && onGoHome) {
      onGoHome();
    } else if (buttonAction === 'reload') {
      window.location.reload();
    } else if (onGoHome) {
      onGoHome();
    }
  }

  function handleGoHomeFallback() {
    if (onGoHome) {
      onGoHome();
    } else {
      window.location.href = '/';
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-th-bg px-4">
      <SEO title={heading} description={description} />
      <div className="flex flex-col items-center text-center max-w-[600px] py-10 sm:py-0">
        {/* Illustration */}
        <Illustration />

        {/* Error code */}
        <h1
          className="font-display text-[#dd6e42] font-bold mt-8 leading-none"
          style={{ fontSize: 'clamp(2.5rem, 5vw, 4rem)' }}
        >
          {code}
        </h1>

        {/* Heading */}
        <h2 className="font-display text-[#f7f4ef] text-xl sm:text-2xl mt-2">
          {heading}
        </h2>

        {/* Description */}
        <p className="text-[#7d9199] text-[0.95rem] max-w-[400px] mt-3 leading-relaxed">
          {description}
        </p>

        {/* Primary button */}
        <button
          onClick={handlePrimaryClick}
          className="mt-7 bg-gradient-to-r from-[#c45a30] to-[#4f6d7a] hover:from-[#dd6e42] hover:to-[#6a8c9a] text-[#e8e2d6] font-bold py-3 px-6 rounded-full shadow-lg transition-all hover:scale-105 flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-[#dd6e42]/50 focus:ring-offset-2 focus:ring-offset-th-bg"
        >
          {/* Left arrow icon (only for 404) */}
          {type === '404' && (
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M10 12L6 8L10 4" />
            </svg>
          )}
          {buttonText}
        </button>

        {/* Secondary link (404 only — "Go to Homepage") */}
        {type === '404' && (
          <button
            onClick={handleGoHomeFallback}
            className="mt-3 text-sm text-[#7d9199] hover:text-[#dd6e42] transition-colors bg-transparent border-none cursor-pointer focus:outline-none focus:underline"
          >
            Go to Homepage
          </button>
        )}
      </div>
    </div>
  );
}

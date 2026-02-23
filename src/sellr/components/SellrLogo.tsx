import React from 'react';

interface SellrLogoProps {
  className?: string;
  /** Color for the record body — defaults to sellr-blue hex */
  color?: string;
}

/**
 * Sellr brand mark: a vinyl record with "$" in the center label.
 * Accepts a className for sizing (w-6 h-6, w-48 h-48, etc.).
 */
const SellrLogo: React.FC<SellrLogoProps> = ({
  className = 'w-6 h-6',
  color = '#2C4A6E',
}) => (
  <svg
    viewBox="0 0 64 64"
    className={className}
    fill="none"
    aria-hidden="true"
    role="img"
  >
    {/* Outer disc */}
    <circle cx="32" cy="32" r="31" fill={color} />

    {/* Grooves */}
    <circle cx="32" cy="32" r="27" stroke="white" strokeWidth="0.4" opacity="0.2" />
    <circle cx="32" cy="32" r="24" stroke="white" strokeWidth="0.4" opacity="0.15" />
    <circle cx="32" cy="32" r="21" stroke="white" strokeWidth="0.4" opacity="0.2" />
    <circle cx="32" cy="32" r="18" stroke="white" strokeWidth="0.4" opacity="0.15" />
    <circle cx="32" cy="32" r="15" stroke="white" strokeWidth="0.4" opacity="0.2" />

    {/* Center label */}
    <circle cx="32" cy="32" r="11" fill="white" opacity="0.9" />

    {/* Dollar sign */}
    <text
      x="32"
      y="32"
      textAnchor="middle"
      dominantBaseline="central"
      fill={color}
      fontSize="14"
      fontWeight="700"
      fontFamily="system-ui, -apple-system, sans-serif"
    >
      $
    </text>

    {/* Spindle hole */}
    <circle cx="32" cy="32" r="2" fill={color} opacity="0.3" />
  </svg>
);

export default SellrLogo;

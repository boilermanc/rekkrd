import React, { useState, useCallback } from 'react';
import type {
  StakkdRoom,
  StakkdRoomFeature,
  GearPlacement,
  ListeningPosition,
  StereoTriangle,
} from '../../types/room';

// ── Props ────────────────────────────────────────────────────────────

interface RoomDiagramProps {
  room: StakkdRoom;
  features: StakkdRoomFeature[];
  placements?: GearPlacement[];
  listeningPosition?: ListeningPosition;
  stereoTriangle?: StereoTriangle | null;
  /** Map gear_id → gear category for icon selection */
  gearCategories?: Record<string, string>;
  width?: number;
  interactive?: boolean;
}

// ── Constants ────────────────────────────────────────────────────────

/** Scaling: 10 SVG units per foot */
const SCALE = 10;

/** Padding around the room for labels, dimension lines, compass */
const PAD_TOP = 50;
const PAD_BOTTOM = 55;
const PAD_LEFT = 50;
const PAD_RIGHT = 55;

/** Wall rendering */
const WALL_STROKE = 3;
const WALL_COLOR = '#c8c0b8';

/** Feature colors — matching RoomFeaturesEditor */
const FEATURE_COLORS: Record<StakkdRoomFeature['feature_type'], string> = {
  door: '#dd6e42',
  window: '#4a90d9',
  closet: '#8b7355',
  fireplace: '#e85d3a',
  stairs: '#7c6f9f',
  opening: '#5fa87f',
};

const FEATURE_LABELS: Record<StakkdRoomFeature['feature_type'], string> = {
  door: 'Door',
  window: 'Window',
  closet: 'Closet',
  fireplace: 'Fireplace',
  stairs: 'Stairs',
  opening: 'Opening',
};

type Wall = StakkdRoomFeature['wall'];

// ── Tooltip State ───────────────────────────────────────────────────

interface TooltipData {
  x: number;
  y: number;
  text: string;
}

// ── Helpers ──────────────────────────────────────────────────────────

function wallLength(room: StakkdRoom, wall: Wall): number {
  return wall === 'north' || wall === 'south' ? room.width_ft : room.length_ft;
}

// ── Floor Patterns ──────────────────────────────────────────────────

const FloorPatterns: React.FC<{ floorType: StakkdRoom['floor_type']; rW: number; rH: number }> = ({ floorType, rW, rH }) => {
  switch (floorType) {
    case 'hardwood':
      return (
        <defs>
          <pattern id="floor-pattern" x={PAD_LEFT} y={PAD_TOP} width={30} height={8} patternUnits="userSpaceOnUse">
            <rect width={30} height={8} fill="#3d3529" />
            <line x1={0} y1={8} x2={30} y2={8} stroke="#4a4035" strokeWidth={0.5} />
            <line x1={15} y1={0} x2={15} y2={8} stroke="#4a4035" strokeWidth={0.3} />
          </pattern>
        </defs>
      );
    case 'carpet':
      return (
        <defs>
          <pattern id="floor-pattern" x={PAD_LEFT} y={PAD_TOP} width={6} height={6} patternUnits="userSpaceOnUse">
            <rect width={6} height={6} fill="#35322e" />
            <circle cx={1} cy={1} r={0.3} fill="#3e3b36" />
            <circle cx={4} cy={4} r={0.3} fill="#3e3b36" />
          </pattern>
        </defs>
      );
    case 'tile':
      return (
        <defs>
          <pattern id="floor-pattern" x={PAD_LEFT} y={PAD_TOP} width={20} height={20} patternUnits="userSpaceOnUse">
            <rect width={20} height={20} fill="#33302c" />
            <rect x={0} y={0} width={20} height={20} fill="none" stroke="#3d3a35" strokeWidth={0.5} />
          </pattern>
        </defs>
      );
    case 'concrete':
      return (
        <defs>
          <pattern id="floor-pattern" width={1} height={1} patternUnits="userSpaceOnUse">
            <rect width={1} height={1} fill="#302e2a" />
          </pattern>
        </defs>
      );
    case 'mixed':
    default:
      return (
        <defs>
          <pattern id="floor-pattern" width={1} height={1} patternUnits="userSpaceOnUse">
            <rect width={1} height={1} fill="#33302c" />
          </pattern>
        </defs>
      );
  }
};

// ── Feature Renderers ───────────────────────────────────────────────

interface FeatureRenderProps {
  feature: StakkdRoomFeature;
  room: StakkdRoom;
  hoveredId: string | null;
  onHover: (id: string | null, x: number, y: number) => void;
}

function getFeatureGeometry(feature: StakkdRoomFeature, room: StakkdRoom) {
  const wl = wallLength(room, feature.wall);
  const featureWidthSvg = feature.width_ft * SCALE;
  const t = feature.position_pct / 100;
  const rW = room.width_ft * SCALE;
  const rH = room.length_ft * SCALE;

  switch (feature.wall) {
    case 'north': {
      const cx = PAD_LEFT + t * rW;
      return { cx, cy: PAD_TOP, wallDir: 'horizontal' as const, featureWidthSvg };
    }
    case 'south': {
      const cx = PAD_LEFT + t * rW;
      return { cx, cy: PAD_TOP + rH, wallDir: 'horizontal' as const, featureWidthSvg };
    }
    case 'west': {
      const cy = PAD_TOP + t * rH;
      return { cx: PAD_LEFT, cy, wallDir: 'vertical' as const, featureWidthSvg };
    }
    case 'east': {
      const cy = PAD_TOP + t * rH;
      return { cx: PAD_LEFT + rW, cy, wallDir: 'vertical' as const, featureWidthSvg };
    }
  }
}

const FeatureRenderer: React.FC<FeatureRenderProps> = ({ feature, room, hoveredId, onHover }) => {
  const geo = getFeatureGeometry(feature, room);
  const { cx, cy, wallDir, featureWidthSvg } = geo;
  const half = featureWidthSvg / 2;
  const color = FEATURE_COLORS[feature.feature_type];
  const isHovered = hoveredId === feature.id;
  const opacity = isHovered ? 1 : 0.85;
  const inward = feature.wall === 'south' || feature.wall === 'east' ? -1 : 1;

  const tooltipText = `${FEATURE_LABELS[feature.feature_type]} — ${feature.wall} wall at ${feature.position_pct}%, ${feature.width_ft}ft wide${feature.notes ? ` — ${feature.notes}` : ''}`;

  const handleMouseEnter = () => onHover(feature.id, cx, cy);
  const handleMouseLeave = () => onHover(null, 0, 0);

  switch (feature.feature_type) {
    case 'door': {
      // Gap in wall + arc showing swing direction
      const arcRadius = featureWidthSvg * 0.8;
      if (wallDir === 'horizontal') {
        const arcDir = feature.wall === 'north' ? 1 : -1;
        const startX = cx - half;
        const endX = cx + half;
        return (
          <g opacity={opacity} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave} style={{ cursor: 'default' }}>
            <title>{tooltipText}</title>
            {/* Clear wall segment */}
            <line x1={startX} y1={cy} x2={endX} y2={cy} stroke="#2a2722" strokeWidth={WALL_STROKE + 2} />
            {/* Door arc */}
            <path
              d={`M ${startX} ${cy} A ${arcRadius} ${arcRadius} 0 0 ${arcDir > 0 ? 1 : 0} ${endX} ${cy}`}
              fill="none"
              stroke={color}
              strokeWidth={1.5}
              strokeDasharray="3,2"
            />
            {/* Door line (closed position) */}
            <line x1={startX} y1={cy} x2={startX} y2={cy + arcDir * arcRadius} stroke={color} strokeWidth={1.5} />
          </g>
        );
      } else {
        const arcDir = feature.wall === 'west' ? 1 : -1;
        const startY = cy - half;
        const endY = cy + half;
        return (
          <g opacity={opacity} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave} style={{ cursor: 'default' }}>
            <title>{tooltipText}</title>
            <line x1={cx} y1={startY} x2={cx} y2={endY} stroke="#2a2722" strokeWidth={WALL_STROKE + 2} />
            <path
              d={`M ${cx} ${startY} A ${arcRadius} ${arcRadius} 0 0 ${arcDir > 0 ? 0 : 1} ${cx} ${endY}`}
              fill="none"
              stroke={color}
              strokeWidth={1.5}
              strokeDasharray="3,2"
            />
            <line x1={cx} y1={startY} x2={cx + arcDir * arcRadius} y2={startY} stroke={color} strokeWidth={1.5} />
          </g>
        );
      }
    }

    case 'window': {
      // Double line (parallel lines) on the wall
      const offset = 2;
      if (wallDir === 'horizontal') {
        return (
          <g opacity={opacity} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave} style={{ cursor: 'default' }}>
            <title>{tooltipText}</title>
            <line x1={cx - half} y1={cy} x2={cx + half} y2={cy} stroke="#2a2722" strokeWidth={WALL_STROKE + 2} />
            <line x1={cx - half} y1={cy - offset} x2={cx + half} y2={cy - offset} stroke={color} strokeWidth={1.5} />
            <line x1={cx - half} y1={cy + offset} x2={cx + half} y2={cy + offset} stroke={color} strokeWidth={1.5} />
            {/* End caps */}
            <line x1={cx - half} y1={cy - offset} x2={cx - half} y2={cy + offset} stroke={color} strokeWidth={1} />
            <line x1={cx + half} y1={cy - offset} x2={cx + half} y2={cy + offset} stroke={color} strokeWidth={1} />
          </g>
        );
      } else {
        return (
          <g opacity={opacity} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave} style={{ cursor: 'default' }}>
            <title>{tooltipText}</title>
            <line x1={cx} y1={cy - half} x2={cx} y2={cy + half} stroke="#2a2722" strokeWidth={WALL_STROKE + 2} />
            <line x1={cx - offset} y1={cy - half} x2={cx - offset} y2={cy + half} stroke={color} strokeWidth={1.5} />
            <line x1={cx + offset} y1={cy - half} x2={cx + offset} y2={cy + half} stroke={color} strokeWidth={1.5} />
            <line x1={cx - offset} y1={cy - half} x2={cx + offset} y2={cy - half} stroke={color} strokeWidth={1} />
            <line x1={cx - offset} y1={cy + half} x2={cx + offset} y2={cy + half} stroke={color} strokeWidth={1} />
          </g>
        );
      }
    }

    case 'closet': {
      // Filled rectangle indented from wall
      const depth = 8;
      if (wallDir === 'horizontal') {
        const y = feature.wall === 'north' ? cy : cy - depth;
        return (
          <g opacity={opacity} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave} style={{ cursor: 'default' }}>
            <title>{tooltipText}</title>
            <rect x={cx - half} y={y} width={featureWidthSvg} height={depth} fill={color} fillOpacity={0.3} stroke={color} strokeWidth={1} rx={1} />
            {/* Doors line */}
            <line x1={cx} y1={y} x2={cx} y2={y + depth} stroke={color} strokeWidth={0.5} strokeDasharray="2,1" />
          </g>
        );
      } else {
        const x = feature.wall === 'west' ? cx : cx - depth;
        return (
          <g opacity={opacity} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave} style={{ cursor: 'default' }}>
            <title>{tooltipText}</title>
            <rect x={x} y={cy - half} width={depth} height={featureWidthSvg} fill={color} fillOpacity={0.3} stroke={color} strokeWidth={1} rx={1} />
            <line x1={x} y1={cy} x2={x + depth} y2={cy} stroke={color} strokeWidth={0.5} strokeDasharray="2,1" />
          </g>
        );
      }
    }

    case 'fireplace': {
      // Decorative rectangle protruding inward
      const depth = 6;
      const protrude = 4;
      if (wallDir === 'horizontal') {
        const y = feature.wall === 'north' ? cy : cy - depth;
        return (
          <g opacity={opacity} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave} style={{ cursor: 'default' }}>
            <title>{tooltipText}</title>
            <rect x={cx - half} y={y} width={featureWidthSvg} height={depth} fill={color} fillOpacity={0.2} stroke={color} strokeWidth={1.5} rx={1} />
            {/* Inner hearth */}
            <rect x={cx - half + 3} y={y + 1} width={featureWidthSvg - 6} height={depth - 2} fill={color} fillOpacity={0.15} rx={0.5} />
          </g>
        );
      } else {
        const x = feature.wall === 'west' ? cx : cx - depth;
        return (
          <g opacity={opacity} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave} style={{ cursor: 'default' }}>
            <title>{tooltipText}</title>
            <rect x={x} y={cy - half} width={depth} height={featureWidthSvg} fill={color} fillOpacity={0.2} stroke={color} strokeWidth={1.5} rx={1} />
            <rect x={x + 1} y={cy - half + 3} width={depth - 2} height={featureWidthSvg - 6} fill={color} fillOpacity={0.15} rx={0.5} />
          </g>
        );
      }
    }

    case 'stairs': {
      // Hatched rectangle
      const depth = 12;
      const numSteps = 4;
      if (wallDir === 'horizontal') {
        const y = feature.wall === 'north' ? cy : cy - depth;
        const stepH = depth / numSteps;
        return (
          <g opacity={opacity} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave} style={{ cursor: 'default' }}>
            <title>{tooltipText}</title>
            <rect x={cx - half} y={y} width={featureWidthSvg} height={depth} fill={color} fillOpacity={0.15} stroke={color} strokeWidth={1} rx={1} />
            {Array.from({ length: numSteps - 1 }, (_, i) => (
              <line
                key={i}
                x1={cx - half}
                y1={y + stepH * (i + 1)}
                x2={cx + half}
                y2={y + stepH * (i + 1)}
                stroke={color}
                strokeWidth={0.5}
                strokeOpacity={0.6}
              />
            ))}
          </g>
        );
      } else {
        const x = feature.wall === 'west' ? cx : cx - depth;
        const stepW = depth / numSteps;
        return (
          <g opacity={opacity} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave} style={{ cursor: 'default' }}>
            <title>{tooltipText}</title>
            <rect x={x} y={cy - half} width={depth} height={featureWidthSvg} fill={color} fillOpacity={0.15} stroke={color} strokeWidth={1} rx={1} />
            {Array.from({ length: numSteps - 1 }, (_, i) => (
              <line
                key={i}
                x1={x + stepW * (i + 1)}
                y1={cy - half}
                x2={x + stepW * (i + 1)}
                y2={cy + half}
                stroke={color}
                strokeWidth={0.5}
                strokeOpacity={0.6}
              />
            ))}
          </g>
        );
      }
    }

    case 'opening': {
      // Gap in wall — no arc, just a clear break
      if (wallDir === 'horizontal') {
        return (
          <g opacity={opacity} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave} style={{ cursor: 'default' }}>
            <title>{tooltipText}</title>
            <line x1={cx - half} y1={cy} x2={cx + half} y2={cy} stroke="#2a2722" strokeWidth={WALL_STROKE + 2} />
            {/* Small end markers */}
            <line x1={cx - half} y1={cy - 3} x2={cx - half} y2={cy + 3} stroke={color} strokeWidth={1.5} />
            <line x1={cx + half} y1={cy - 3} x2={cx + half} y2={cy + 3} stroke={color} strokeWidth={1.5} />
          </g>
        );
      } else {
        return (
          <g opacity={opacity} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave} style={{ cursor: 'default' }}>
            <title>{tooltipText}</title>
            <line x1={cx} y1={cy - half} x2={cx} y2={cy + half} stroke="#2a2722" strokeWidth={WALL_STROKE + 2} />
            <line x1={cx - 3} y1={cy - half} x2={cx + 3} y2={cy - half} stroke={color} strokeWidth={1.5} />
            <line x1={cx - 3} y1={cy + half} x2={cx + 3} y2={cy + half} stroke={color} strokeWidth={1.5} />
          </g>
        );
      }
    }
  }
};

// ── Compass Rose ────────────────────────────────────────────────────

const CompassRose: React.FC<{ x: number; y: number }> = ({ x, y }) => {
  const r = 12;
  const labelOffset = r + 6;
  const textStyle: React.CSSProperties = { fontSize: 5, fontWeight: 600, letterSpacing: '0.05em' };

  return (
    <g aria-hidden="true">
      {/* Cross lines */}
      <line x1={x} y1={y - r} x2={x} y2={y + r} stroke="#6b6560" strokeWidth={0.8} />
      <line x1={x - r} y1={y} x2={x + r} y2={y} stroke="#6b6560" strokeWidth={0.8} />
      {/* North arrow (emphasized) */}
      <polygon points={`${x},${y - r} ${x - 2.5},${y - r + 5} ${x + 2.5},${y - r + 5}`} fill="#dd6e42" />
      {/* Labels */}
      <text x={x} y={y - labelOffset} textAnchor="middle" fill="#dd6e42" style={{ ...textStyle, fontWeight: 700, fontSize: 6 }}>N</text>
      <text x={x} y={y + labelOffset + 5} textAnchor="middle" fill="#6b6560" style={textStyle}>S</text>
      <text x={x + labelOffset + 1} y={y + 2} textAnchor="start" fill="#6b6560" style={textStyle}>E</text>
      <text x={x - labelOffset - 1} y={y + 2} textAnchor="end" fill="#6b6560" style={textStyle}>W</text>
      {/* Center dot */}
      <circle cx={x} cy={y} r={1.5} fill="#6b6560" />
    </g>
  );
};

// ── Scale Bar ───────────────────────────────────────────────────────

const ScaleBar: React.FC<{ x: number; y: number }> = ({ x, y }) => {
  const barLen = SCALE; // 1 foot = 10 SVG units
  return (
    <g aria-hidden="true">
      {/* Bar */}
      <line x1={x} y1={y} x2={x + barLen} y2={y} stroke="#6b6560" strokeWidth={1} />
      {/* End ticks */}
      <line x1={x} y1={y - 2} x2={x} y2={y + 2} stroke="#6b6560" strokeWidth={0.8} />
      <line x1={x + barLen} y1={y - 2} x2={x + barLen} y2={y + 2} stroke="#6b6560" strokeWidth={0.8} />
      {/* Label */}
      <text x={x + barLen / 2} y={y - 4} textAnchor="middle" fill="#6b6560" style={{ fontSize: 4.5, fontWeight: 500 }}>
        1 ft
      </text>
    </g>
  );
};

// ── Dimension Lines ─────────────────────────────────────────────────

const DimensionLines: React.FC<{ rW: number; rH: number; widthFt: number; lengthFt: number }> = ({ rW, rH, widthFt, lengthFt }) => {
  const arrowSize = 3;
  const dimColor = '#6b6560';
  const textStyle: React.CSSProperties = { fontSize: 5.5, fontWeight: 500, letterSpacing: '0.02em' };

  // Bottom dimension line (width)
  const bY = PAD_TOP + rH + 18;
  const bX1 = PAD_LEFT;
  const bX2 = PAD_LEFT + rW;
  const bMid = (bX1 + bX2) / 2;

  // Right dimension line (length)
  const rX = PAD_LEFT + rW + 18;
  const rY1 = PAD_TOP;
  const rY2 = PAD_TOP + rH;
  const rMid = (rY1 + rY2) / 2;

  return (
    <g aria-hidden="true">
      {/* Bottom: width */}
      <line x1={bX1} y1={bY} x2={bX2} y2={bY} stroke={dimColor} strokeWidth={0.6} />
      {/* Left arrow */}
      <polygon points={`${bX1},${bY} ${bX1 + arrowSize},${bY - 1.5} ${bX1 + arrowSize},${bY + 1.5}`} fill={dimColor} />
      {/* Right arrow */}
      <polygon points={`${bX2},${bY} ${bX2 - arrowSize},${bY - 1.5} ${bX2 - arrowSize},${bY + 1.5}`} fill={dimColor} />
      {/* Extension lines */}
      <line x1={bX1} y1={PAD_TOP + rH + 2} x2={bX1} y2={bY + 4} stroke={dimColor} strokeWidth={0.3} />
      <line x1={bX2} y1={PAD_TOP + rH + 2} x2={bX2} y2={bY + 4} stroke={dimColor} strokeWidth={0.3} />
      {/* Label */}
      <text x={bMid} y={bY - 3} textAnchor="middle" fill={dimColor} style={textStyle}>
        {widthFt} ft
      </text>

      {/* Right: length */}
      <line x1={rX} y1={rY1} x2={rX} y2={rY2} stroke={dimColor} strokeWidth={0.6} />
      {/* Top arrow */}
      <polygon points={`${rX},${rY1} ${rX - 1.5},${rY1 + arrowSize} ${rX + 1.5},${rY1 + arrowSize}`} fill={dimColor} />
      {/* Bottom arrow */}
      <polygon points={`${rX},${rY2} ${rX - 1.5},${rY2 - arrowSize} ${rX + 1.5},${rY2 - arrowSize}`} fill={dimColor} />
      {/* Extension lines */}
      <line x1={PAD_LEFT + rW + 2} y1={rY1} x2={rX + 4} y2={rY1} stroke={dimColor} strokeWidth={0.3} />
      <line x1={PAD_LEFT + rW + 2} y1={rY2} x2={rX + 4} y2={rY2} stroke={dimColor} strokeWidth={0.3} />
      {/* Label (rotated) */}
      <text
        x={rX + 8}
        y={rMid}
        textAnchor="middle"
        fill={dimColor}
        style={textStyle}
        transform={`rotate(90 ${rX + 8} ${rMid})`}
      >
        {lengthFt} ft
      </text>
    </g>
  );
};

// ── Grid Overlay ────────────────────────────────────────────────────

const GridOverlay: React.FC<{ rW: number; rH: number }> = ({ rW, rH }) => {
  const lines: React.ReactNode[] = [];
  // Vertical lines (every foot)
  for (let x = SCALE; x < rW; x += SCALE) {
    lines.push(
      <line
        key={`v${x}`}
        x1={PAD_LEFT + x}
        y1={PAD_TOP}
        x2={PAD_LEFT + x}
        y2={PAD_TOP + rH}
        stroke="#5a5550"
        strokeWidth={0.3}
        strokeOpacity={0.25}
      />
    );
  }
  // Horizontal lines (every foot)
  for (let y = SCALE; y < rH; y += SCALE) {
    lines.push(
      <line
        key={`h${y}`}
        x1={PAD_LEFT}
        y1={PAD_TOP + y}
        x2={PAD_LEFT + rW}
        y2={PAD_TOP + y}
        stroke="#5a5550"
        strokeWidth={0.3}
        strokeOpacity={0.25}
      />
    );
  }
  return <g aria-hidden="true">{lines}</g>;
};

// ── Wall Labels ─────────────────────────────────────────────────────

const WallLabels: React.FC<{ rW: number; rH: number }> = ({ rW, rH }) => {
  const labelStyle: React.CSSProperties = { fontSize: 6, fontWeight: 600, letterSpacing: '0.1em' };
  const labelColor = '#7a746e';
  const offset = 12;

  return (
    <g aria-hidden="true">
      <text x={PAD_LEFT + rW / 2} y={PAD_TOP - offset} textAnchor="middle" fill={labelColor} style={labelStyle}>N</text>
      <text x={PAD_LEFT + rW / 2} y={PAD_TOP + rH + offset + 5} textAnchor="middle" fill={labelColor} style={labelStyle}>S</text>
      <text x={PAD_LEFT - offset} y={PAD_TOP + rH / 2 + 2} textAnchor="middle" fill={labelColor} style={labelStyle}>W</text>
      <text x={PAD_LEFT + rW + offset} y={PAD_TOP + rH / 2 + 2} textAnchor="middle" fill={labelColor} style={labelStyle}>E</text>
    </g>
  );
};

// ── Gear Category Icon Paths (inline SVG) ───────────────────────────

function gearIconPath(category: string): string {
  switch (category) {
    case 'turntable':
      // Disc/record icon
      return 'M12 2a10 10 0 100 20 10 10 0 000-20zm0 14a4 4 0 110-8 4 4 0 010 8zm0-5a1 1 0 100 2 1 1 0 000-2z';
    case 'speakers':
      // Speaker icon
      return 'M6 3a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H6zm6 4a1.5 1.5 0 110 3 1.5 1.5 0 010-3zm0 5a3.5 3.5 0 110 7 3.5 3.5 0 010-7zm0 2a1.5 1.5 0 100 3 1.5 1.5 0 000-3z';
    case 'subwoofer':
      // Filled speaker box
      return 'M4 4h16v16H4V4zm8 3a5 5 0 100 10 5 5 0 000-10zm0 3a2 2 0 110 4 2 2 0 010-4z';
    case 'amplifier':
    case 'receiver':
      // Gauge/dial icon
      return 'M12 2a10 10 0 100 20 10 10 0 000-20zm0 4a6 6 0 110 12 6 6 0 010-12zm0 2v4l3 3';
    case 'headphones':
      // Headphones
      return 'M3 18v-6a9 9 0 0118 0v6M3 18a3 3 0 006 0v-3H3v3zm18 0a3 3 0 01-6 0v-3h6v3z';
    default:
      // Music note (generic)
      return 'M9 18V5l12-2v13M9 18a3 3 0 11-6 0 3 3 0 016 0zm12-2a3 3 0 11-6 0 3 3 0 016 0z';
  }
}

const FACING_ARROWS: Record<string, { dx: number; dy: number }> = {
  north: { dx: 0, dy: -1 },
  south: { dx: 0, dy: 1 },
  east:  { dx: 1, dy: 0 },
  west:  { dx: -1, dy: 0 },
};

// ── Gear Placement Renderer ─────────────────────────────────────────

interface GearIconProps {
  placement: GearPlacement;
  rW: number;
  rH: number;
  category: string;
  interactive: boolean;
  hoveredId: string | null;
  onHover: (id: string | null, x: number, y: number) => void;
}

const GearIcon: React.FC<GearIconProps> = ({ placement, rW, rH, category, interactive, hoveredId, onHover }) => {
  const cx = PAD_LEFT + (placement.x_pct / 100) * rW;
  const cy = PAD_TOP + (placement.y_pct / 100) * rH;
  const iconSize = SCALE * 2; // 2ft
  const halfIcon = iconSize / 2;
  const isHovered = hoveredId === `gear-${placement.gear_id}`;

  const arrow = FACING_ARROWS[placement.facing] || FACING_ARROWS.north;
  const arrowLen = halfIcon + 4;
  const arrowTipX = cx + arrow.dx * arrowLen;
  const arrowTipY = cy + arrow.dy * arrowLen;

  const label = placement.gear_name.length > 15
    ? placement.gear_name.slice(0, 14) + '\u2026'
    : placement.gear_name;

  const tooltipText = `${placement.gear_name} — facing ${placement.facing}\n${placement.notes}`;

  return (
    <g
      onMouseEnter={() => interactive && onHover(`gear-${placement.gear_id}`, cx, cy)}
      onMouseLeave={() => interactive && onHover(null, 0, 0)}
      style={{ cursor: interactive ? 'default' : undefined }}
    >
      <title>{tooltipText}</title>
      {/* Drop shadow */}
      <circle cx={cx + 0.5} cy={cy + 0.5} r={halfIcon + 1} fill="#000" fillOpacity={0.15} />
      {/* Background circle */}
      <circle
        cx={cx}
        cy={cy}
        r={halfIcon + 1}
        fill="#1a1816"
        fillOpacity={0.85}
        stroke="#dd6e42"
        strokeWidth={isHovered ? 1.2 : 0.8}
        strokeOpacity={isHovered ? 1 : 0.7}
      />
      {/* Icon */}
      <g transform={`translate(${cx - halfIcon * 0.5} ${cy - halfIcon * 0.5}) scale(${iconSize / 24 * 0.5})`}>
        <path d={gearIconPath(category)} fill="#dd6e42" fillOpacity={0.9} />
      </g>
      {/* Facing arrow */}
      <line
        x1={cx + arrow.dx * (halfIcon + 1)}
        y1={cy + arrow.dy * (halfIcon + 1)}
        x2={arrowTipX}
        y2={arrowTipY}
        stroke="#dd6e42"
        strokeWidth={0.8}
        strokeOpacity={0.6}
        markerEnd="url(#arrow-marker)"
      />
      {/* Label */}
      <text
        x={cx}
        y={cy + halfIcon + 6}
        textAnchor="middle"
        fill="#dd6e42"
        fillOpacity={0.85}
        style={{ fontSize: 3.5, fontWeight: 600, letterSpacing: '0.02em' }}
      >
        {label}
      </text>
    </g>
  );
};

// ── Listening Position Renderer ─────────────────────────────────────

interface ListeningMarkerProps {
  position: ListeningPosition;
  rW: number;
  rH: number;
  interactive: boolean;
  hoveredId: string | null;
  onHover: (id: string | null, x: number, y: number) => void;
}

const LISTENING_COLOR = '#5b8db8';

const ListeningMarker: React.FC<ListeningMarkerProps> = ({ position, rW, rH, interactive, hoveredId, onHover }) => {
  const cx = PAD_LEFT + (position.x_pct / 100) * rW;
  const cy = PAD_TOP + (position.y_pct / 100) * rH;
  const isHovered = hoveredId === 'listening-pos';

  return (
    <g
      onMouseEnter={() => interactive && onHover('listening-pos', cx, cy)}
      onMouseLeave={() => interactive && onHover(null, 0, 0)}
      style={{ cursor: interactive ? 'default' : undefined }}
    >
      <title>{`Listening Position — ${position.notes}`}</title>
      {/* Outer ring */}
      <circle cx={cx} cy={cy} r={8} fill="none" stroke={LISTENING_COLOR} strokeWidth={0.6} strokeOpacity={0.4} />
      {/* Middle ring */}
      <circle cx={cx} cy={cy} r={5} fill="none" stroke={LISTENING_COLOR} strokeWidth={0.8} strokeOpacity={0.6} />
      {/* Center dot */}
      <circle cx={cx} cy={cy} r={2.5} fill={LISTENING_COLOR} fillOpacity={isHovered ? 0.9 : 0.7} />
      {/* Crosshair */}
      <line x1={cx - 10} y1={cy} x2={cx - 5} y2={cy} stroke={LISTENING_COLOR} strokeWidth={0.5} strokeOpacity={0.3} />
      <line x1={cx + 5} y1={cy} x2={cx + 10} y2={cy} stroke={LISTENING_COLOR} strokeWidth={0.5} strokeOpacity={0.3} />
      <line x1={cx} y1={cy - 10} x2={cx} y2={cy - 5} stroke={LISTENING_COLOR} strokeWidth={0.5} strokeOpacity={0.3} />
      <line x1={cx} y1={cy + 5} x2={cx} y2={cy + 10} stroke={LISTENING_COLOR} strokeWidth={0.5} strokeOpacity={0.3} />
      {/* Label */}
      <text
        x={cx}
        y={cy + 13}
        textAnchor="middle"
        fill={LISTENING_COLOR}
        fillOpacity={0.8}
        style={{ fontSize: 3.5, fontWeight: 600, letterSpacing: '0.02em' }}
      >
        Sweet Spot
      </text>
    </g>
  );
};

// ── Stereo Triangle Renderer ────────────────────────────────────────

interface StereoTriangleOverlayProps {
  stereoTriangle: StereoTriangle;
  listeningPosition: ListeningPosition;
  placements: GearPlacement[];
  rW: number;
  rH: number;
  interactive: boolean;
  hoveredId: string | null;
  onHover: (id: string | null, x: number, y: number) => void;
}

const StereoTriangleOverlay: React.FC<StereoTriangleOverlayProps> = ({
  stereoTriangle,
  listeningPosition,
  placements,
  rW,
  rH,
  interactive,
  hoveredId,
  onHover,
}) => {
  const leftSpeaker = placements.find(p => p.gear_id === stereoTriangle.left_speaker_id);
  const rightSpeaker = placements.find(p => p.gear_id === stereoTriangle.right_speaker_id);
  if (!leftSpeaker || !rightSpeaker) return null;

  const lx = PAD_LEFT + (leftSpeaker.x_pct / 100) * rW;
  const ly = PAD_TOP + (leftSpeaker.y_pct / 100) * rH;
  const rx = PAD_LEFT + (rightSpeaker.x_pct / 100) * rW;
  const ry = PAD_TOP + (rightSpeaker.y_pct / 100) * rH;
  const px = PAD_LEFT + (listeningPosition.x_pct / 100) * rW;
  const py = PAD_TOP + (listeningPosition.y_pct / 100) * rH;

  const isHovered = hoveredId === 'stereo-triangle';
  const triColor = '#dd6e42';

  // Angle arc at listening position
  const arcR = 8;
  const angleRad = (stereoTriangle.angle_degrees * Math.PI) / 180;
  // Compute directions to speakers from listening pos
  const dxL = lx - px;
  const dyL = ly - py;
  const dxR = rx - px;
  const dyR = ry - py;
  const angL = Math.atan2(dyL, dxL);
  const angR = Math.atan2(dyR, dxR);
  const arcStartX = px + arcR * Math.cos(angL);
  const arcStartY = py + arcR * Math.sin(angL);
  const arcEndX = px + arcR * Math.cos(angR);
  const arcEndY = py + arcR * Math.sin(angR);
  const largeArc = angleRad > Math.PI ? 1 : 0;

  const tooltipText = `Stereo Triangle — ${stereoTriangle.angle_degrees}\u00B0\n${stereoTriangle.notes}`;

  return (
    <g
      onMouseEnter={() => interactive && onHover('stereo-triangle', px, py - 15)}
      onMouseLeave={() => interactive && onHover(null, 0, 0)}
      style={{ cursor: interactive ? 'default' : undefined }}
    >
      <title>{tooltipText}</title>
      {/* Triangle lines */}
      <line x1={lx} y1={ly} x2={px} y2={py} stroke={triColor} strokeWidth={0.8} strokeOpacity={isHovered ? 0.6 : 0.35} strokeDasharray="4,3" />
      <line x1={rx} y1={ry} x2={px} y2={py} stroke={triColor} strokeWidth={0.8} strokeOpacity={isHovered ? 0.6 : 0.35} strokeDasharray="4,3" />
      <line x1={lx} y1={ly} x2={rx} y2={ry} stroke={triColor} strokeWidth={0.8} strokeOpacity={isHovered ? 0.6 : 0.35} strokeDasharray="4,3" />
      {/* Angle arc */}
      <path
        d={`M ${arcStartX} ${arcStartY} A ${arcR} ${arcR} 0 ${largeArc} 1 ${arcEndX} ${arcEndY}`}
        fill="none"
        stroke={triColor}
        strokeWidth={0.6}
        strokeOpacity={0.5}
      />
      {/* Angle label */}
      <text
        x={px + (arcR + 4) * Math.cos((angL + angR) / 2)}
        y={py + (arcR + 4) * Math.sin((angL + angR) / 2)}
        textAnchor="middle"
        dominantBaseline="middle"
        fill={triColor}
        fillOpacity={0.6}
        style={{ fontSize: 3.5, fontWeight: 600 }}
      >
        {stereoTriangle.angle_degrees}&deg;
      </text>
    </g>
  );
};

// ── Main Component ──────────────────────────────────────────────────

const RoomDiagram: React.FC<RoomDiagramProps> = ({
  room,
  features,
  placements,
  listeningPosition,
  stereoTriangle,
  gearCategories,
  width,
  interactive = true,
}) => {
  const rW = room.width_ft * SCALE;
  const rH = room.length_ft * SCALE;
  const svgW = rW + PAD_LEFT + PAD_RIGHT;
  const svgH = rH + PAD_TOP + PAD_BOTTOM;

  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);

  const handleHover = useCallback((id: string | null, x: number, y: number) => {
    if (!interactive) return;
    setHoveredId(id);
    if (id) {
      // Feature tooltip
      const f = features.find(feat => feat.id === id);
      if (f) {
        setTooltip({
          x,
          y,
          text: `${FEATURE_LABELS[f.feature_type]} — ${f.wall} wall, ${f.position_pct}%, ${f.width_ft}ft${f.notes ? ` — ${f.notes}` : ''}`,
        });
        return;
      }
      // Gear tooltip
      if (id.startsWith('gear-')) {
        const gearId = id.replace('gear-', '');
        const p = placements?.find(pl => pl.gear_id === gearId);
        if (p) {
          setTooltip({ x, y, text: `${p.gear_name} — facing ${p.facing}. ${p.notes}` });
          return;
        }
      }
      // Listening position tooltip
      if (id === 'listening-pos' && listeningPosition) {
        setTooltip({ x, y, text: `Listening Position — ${listeningPosition.notes}` });
        return;
      }
      // Stereo triangle tooltip
      if (id === 'stereo-triangle' && stereoTriangle) {
        setTooltip({ x, y, text: `Stereo Triangle — ${stereoTriangle.angle_degrees}\u00B0. ${stereoTriangle.notes}` });
        return;
      }
    }
    setTooltip(null);
  }, [interactive, features, placements, listeningPosition, stereoTriangle]);

  return (
    <div className="relative" style={width ? { width } : undefined}>
      <svg
        viewBox={`0 0 ${svgW} ${svgH}`}
        className="w-full"
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label={`Top-down diagram of ${room.name}, ${room.width_ft} by ${room.length_ft} feet`}
      >
        {/* Floor pattern definitions */}
        <FloorPatterns floorType={room.floor_type} rW={rW} rH={rH} />

        {/* Room floor */}
        <rect
          x={PAD_LEFT}
          y={PAD_TOP}
          width={rW}
          height={rH}
          fill="url(#floor-pattern)"
          rx={1}
        />

        {/* Grid overlay */}
        <GridOverlay rW={rW} rH={rH} />

        {/* Room walls */}
        <rect
          x={PAD_LEFT}
          y={PAD_TOP}
          width={rW}
          height={rH}
          fill="none"
          stroke={WALL_COLOR}
          strokeWidth={WALL_STROKE}
          rx={1}
        />

        {/* Features (rendered on top of walls) */}
        {features.map(f => (
          <FeatureRenderer
            key={f.id}
            feature={f}
            room={room}
            hoveredId={hoveredId}
            onHover={handleHover}
          />
        ))}

        {/* Wall labels */}
        <WallLabels rW={rW} rH={rH} />

        {/* Dimension lines */}
        <DimensionLines rW={rW} rH={rH} widthFt={room.width_ft} lengthFt={room.length_ft} />

        {/* Scale bar — bottom-left */}
        <ScaleBar x={PAD_LEFT} y={PAD_TOP + rH + 35} />

        {/* Compass rose — top-right */}
        <CompassRose x={PAD_LEFT + rW + 32} y={PAD_TOP - 22} />

        {/* Arrow marker definition for gear facing arrows */}
        <defs>
          <marker id="arrow-marker" viewBox="0 0 6 6" refX={5} refY={3} markerWidth={4} markerHeight={4} orient="auto-start-reverse">
            <path d="M 0 0 L 6 3 L 0 6 z" fill="#dd6e42" fillOpacity={0.6} />
          </marker>
        </defs>

        {/* Stereo triangle (behind gear icons) */}
        {stereoTriangle && listeningPosition && placements && (
          <StereoTriangleOverlay
            stereoTriangle={stereoTriangle}
            listeningPosition={listeningPosition}
            placements={placements}
            rW={rW}
            rH={rH}
            interactive={interactive}
            hoveredId={hoveredId}
            onHover={handleHover}
          />
        )}

        {/* Listening position marker */}
        {listeningPosition && (
          <ListeningMarker
            position={listeningPosition}
            rW={rW}
            rH={rH}
            interactive={interactive}
            hoveredId={hoveredId}
            onHover={handleHover}
          />
        )}

        {/* Gear placement icons */}
        {placements?.map(p => (
          <GearIcon
            key={p.gear_id}
            placement={p}
            rW={rW}
            rH={rH}
            category={gearCategories?.[p.gear_id] || 'other'}
            interactive={interactive}
            hoveredId={hoveredId}
            onHover={handleHover}
          />
        ))}

        {/* Custom tooltip (positioned within SVG) */}
        {interactive && tooltip && (
          <g>
            <rect
              x={tooltip.x + 6}
              y={tooltip.y - 18}
              width={Math.min(tooltip.text.length * 3.2 + 10, rW * 0.7)}
              height={14}
              rx={3}
              fill="#1a1816"
              fillOpacity={0.92}
              stroke="#dd6e42"
              strokeWidth={0.5}
            />
            <text
              x={tooltip.x + 11}
              y={tooltip.y - 9}
              fill="#e8e0d8"
              style={{ fontSize: 5, fontWeight: 500 }}
            >
              {tooltip.text.length > 60 ? tooltip.text.slice(0, 57) + '...' : tooltip.text}
            </text>
          </g>
        )}
      </svg>
    </div>
  );
};

export default RoomDiagram;

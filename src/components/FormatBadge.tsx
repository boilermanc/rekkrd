import React from 'react';
import { FORMAT_COLORS, FORMAT_DEFAULT, type MediaFormat } from '../../constants/formatTypes';

interface FormatBadgeProps {
  format?: string;
  size?: 'sm' | 'md';
}

const FormatBadge: React.FC<FormatBadgeProps> = ({ format, size = 'sm' }) => {
  const label = (format || FORMAT_DEFAULT) as MediaFormat;
  const color = FORMAT_COLORS[label] || FORMAT_COLORS[FORMAT_DEFAULT];

  const sizeClasses = size === 'sm'
    ? 'text-[8px] px-1.5 py-0.5'
    : 'text-[10px] px-2 py-0.5';

  return (
    <span
      className={`inline-flex items-center font-bold uppercase tracking-wider rounded ${sizeClasses}`}
      style={{ backgroundColor: `${color}20`, color }}
    >
      {label}
    </span>
  );
};

export default React.memo(FormatBadge);

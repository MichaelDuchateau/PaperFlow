import React from 'react';

/**
 * Coloured tag pill rendered with inline styles so arbitrary brand colours work.
 * tag: { id, name, color }
 */
export default function TagPill({ tag, onClick, className = '' }) {
  if (!tag) return null;
  const bg     = `${tag.color}22`; // ~13% opacity fill
  const border = `${tag.color}55`; // ~33% opacity border

  return (
    <span
      onClick={onClick}
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${onClick ? 'cursor-pointer' : 'cursor-default'} ${className}`}
      style={{ backgroundColor: bg, color: tag.color, border: `1px solid ${border}` }}
    >
      {tag.name}
    </span>
  );
}

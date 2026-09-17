// src/theme/Icon/SystemColorMode/index.js
// Elegant monitor icon — Lucide-style, matches sun/moon stroke weight.

import React from 'react';

export default function IconSystemColorMode(props) {
  return (
    <svg viewBox="0 0 24 24" width={24} height={24} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
      <line x1="8" x2="16" y1="21" y2="21" />
      <line x1="12" x2="12" y1="17" y2="21" />
    </svg>
  );
}

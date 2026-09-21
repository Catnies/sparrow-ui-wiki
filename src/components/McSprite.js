import React from 'react';
import useBaseUrl from '@docusaurus/useBaseUrl';

export function mcPosition(x, y, width, height) {
  const scaled = value => `calc(${value}px * var(--mcw-scale))`;
  return {position: 'absolute', left: scaled(x), top: scaled(y), width: scaled(width), height: scaled(height)};
}

export default function McSprite({name, x, y, width, height, clip = 'none'}) {
  const base = useBaseUrl('/img/mc/sprites/');
  return <img className="no-zoom" src={`${base}${name}.png`} alt="" draggable={false}
    style={{...mcPosition(x, y, width, height), clipPath: clip, imageRendering: 'pixelated', pointerEvents: 'none', borderRadius: 0}} />;
}

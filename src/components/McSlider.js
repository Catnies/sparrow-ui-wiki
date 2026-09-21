import React from 'react';
import styles from './MinecraftWindowDemo.module.css';

export default function McSlider({label, value, onChange}) {
  return <label className={styles.slider}>
    <span>{label}<output>{value}%</output></span>
    <input type="range" aria-label={label} min="0" max="100" step="1" value={value} onChange={event => onChange(Number(event.target.value))} />
  </label>;
}

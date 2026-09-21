// src/components/McButton.js
// Minecraft 原版按钮：贴图取自 gui/sprites/widget/button*.png，按原版九宫格（边 3px）放大绘制。
//
// 用在需要"切换"的演示组件里，和旁边的容器图保持同一种画风：
//   普通      button.png
//   悬停      button_highlighted.png（白色外框）
//   已选中    button_disabled.png（压暗，表示当前正在显示的这一项）
//
//   <McButton selected={view === 'game'} onClick={() => setView('game')}>玩家视角</McButton>

import React from 'react';
import styles from './McButton.module.css';

export default function McButton({selected = false, className = '', children, ...rest}) {
  return (
    <button
      type="button"
      className={`${styles.button} ${selected ? styles.selected : ''} ${className}`}
      aria-pressed={selected}
      {...rest}
    >
      {children}
    </button>
  );
}

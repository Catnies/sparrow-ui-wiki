// src/components/ThreadBadge.js
// 行内徽章，标注某个 API 必须在哪条线程上调用。
//
// Sparrow UI 在 Folia 上把 Window 的生命周期与协议操作放进玩家实体线程，
// 共享组件和虚拟容器又允许跨线程访问，"这个方法能在哪调"是文档里反复要回答
// 的问题。与其每次写一句话，不如统一成一个徽章贴在方法签名后面。
//
//   <ThreadBadge type="viewer" />          → viewer 实体线程
//   <ThreadBadge type="any" />             → 任意线程
//   <ThreadBadge type="async">后台线程池</ThreadBadge>   → 自定义文案

import React from 'react';
import {translate} from '@docusaurus/Translate';
import styles from './ThreadBadge.module.css';

// hue 走 HSL 色相环，配色在 CSS 里用 color-mix 与当前 surface 调和，
// 因此浅色、深色和四种护眼底色下都不会糊成一团。
const HUES = {
  viewer: 38,
  any: 145,
  async: 212,
  main: 275,
};

export default function ThreadBadge({type = 'any', children}) {
  // translate() 要在组件体内调用：放到模块顶层虽然也能抽取文案，
  // 但求值时机早于 i18n 运行时就绪，语言切换会拿到过期结果。
  const labels = {
    viewer: translate({
      id: 'threadBadge.viewer',
      message: 'viewer entity thread',
      description: 'ThreadBadge label: the call must run on the viewing player entity thread',
    }),
    any: translate({
      id: 'threadBadge.any',
      message: 'any thread',
      description: 'ThreadBadge label: the call is safe from any thread',
    }),
    async: translate({
      id: 'threadBadge.async',
      message: 'async thread',
      description: 'ThreadBadge label: the call belongs on an async thread',
    }),
    main: translate({
      id: 'threadBadge.main',
      message: 'server main thread',
      description: 'ThreadBadge label: the call must run on the server main thread',
    }),
  };

  const kind = HUES[type] === undefined ? 'any' : type;

  return (
    // 徽章只是文字的视觉强化，不额外占无障碍焦点；文案本身就是完整语义。
    <span className={styles.badge} style={{'--thread-hue': HUES[kind]}}>
      {children ?? labels[kind]}
    </span>
  );
}

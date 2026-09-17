// src/components/Details.js
// previewHeight: 0 = 完全折叠 | -1 = 自动 | N = 固定高度
//
// 自动模式 (-1) 逻辑：
//   内容较短（≤ AUTO_SHORT_THRESHOLD）→ effectivePreviewHeight = 0，纯开关，不露内容
//   内容较长                          → clamp(ratio × 高度, MIN, 200)

import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import styles from './Details.module.css';
import { translate } from '@docusaurus/Translate';

// ─── 自动模式调节参数 ──────────────────────────────────────────────────────────
const AUTO_SHORT_THRESHOLD = 120;  // 原始内容高度 ≤ 此值 → 直接折叠，不露预览
const AUTO_RATIO           = 0.45; // 预览高度 = 内容高度 × 45%
const AUTO_MIN             =  80;  // 预览最小值（px）
const AUTO_MAX             = 200;  // 预览最大值（px）
const AUTO_FALLBACK        = 200;  // 首次测量前的占位高度（px）
// ─────────────────────────────────────────────────────────────────────────────

function Chevron() {
  return (
      <svg className={styles.chevron} viewBox="0 0 24 24" width="16" height="16"
           aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.5"
           strokeLinecap="round" strokeLinejoin="round">
        <polyline points="9 6 15 12 9 18" />
      </svg>
  );
}

export default function Details({
                                  summary,
                                  children,
                                  defaultOpen = false,
                                  previewHeight = -1,
                                  moreLabel,
                                  lessLabel,
                                }) {
  const resolvedMoreLabel = moreLabel || translate({ id: 'details.readMore', message: 'Read more' });
  const resolvedLessLabel = lessLabel || translate({ id: 'details.showLess', message: 'Show less' });
  const [open, setOpen] = useState(defaultOpen);
  const [contentHeight, setContentHeight] = useState(null);
  const contentRef = useRef(null);

  const PAD_TOP          = 16;
  const PAD_BOTTOM_LONG  = 48;
  const PAD_BOTTOM_SHORT = 18;

  const isAuto = previewHeight === -1;

  // ── 计算有效的预览高度 ────────────────────────────────────────────────────────
  // 显式值（≥ 0）：原样透传，行为与修改前完全一致。
  // 自动值（-1）：
  //   • 短内容 → 0，退化为普通折叠开关（无预览条）
  //   • 长内容 → clamp(ratio × 内容高度, MIN, MAX)
  const effectivePreviewHeight = (() => {
    if (!isAuto) return previewHeight;
    if (contentHeight == null) return AUTO_FALLBACK;
    if (contentHeight <= AUTO_SHORT_THRESHOLD) return 0;
    return Math.min(AUTO_MAX, Math.max(AUTO_MIN, Math.round(contentHeight * AUTO_RATIO)));
  })();
  // ─────────────────────────────────────────────────────────────────────────────

  const short = contentHeight != null && contentHeight + PAD_TOP + PAD_BOTTOM_LONG <= effectivePreviewHeight;
  const padBottom = short ? PAD_BOTTOM_SHORT : PAD_BOTTOM_LONG;

  const measure = () => {
    const el = contentRef.current;
    if (!el) return;
    setContentHeight(el.scrollHeight);
  };

  useLayoutEffect(() => { measure(); }, [children]);

  useLayoutEffect(() => {
    if (short && !open) setOpen(true);
  }, [short]);

  useEffect(() => {
    // Images and other embedded content can change size after the initial
    // layout. Keep the preview measurement current without forcing a layout
    // read for every ResizeObserver/window resize notification.
    let rafId = 0;
    const scheduleMeasure = () => {
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        rafId = 0;
        measure();
      });
    };

    const resizeObserver = typeof ResizeObserver === 'undefined'
        ? null
        : new ResizeObserver(scheduleMeasure);
    if (contentRef.current) resizeObserver?.observe(contentRef.current);

    window.addEventListener('resize', scheduleMeasure);
    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener('resize', scheduleMeasure);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []);

  const bodyStyle = {};
  if (open) {
    // An expanded Details must follow its content instead of a height snapshot:
    // images may finish loading after measure() and would otherwise be clipped.
    bodyStyle.maxHeight = 'none';
  } else if (contentHeight != null) {
    bodyStyle.maxHeight = short ? '0px' : `${effectivePreviewHeight}px`;
  } else if (!defaultOpen) {
    bodyStyle.maxHeight = isAuto ? `${AUTO_FALLBACK}px` : `${previewHeight}px`;
  }

  return (
      <div className={`${styles.details} ${open ? styles.open : ''} ${short ? styles.short : ''}`}>
        <button
            type="button"
            className={styles.trigger}
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
        >
          <span className={styles.summary}>{summary}</span>
          <span className={styles.toggleChip} aria-hidden="true">
          <span className={styles.toggleText}>{open ? resolvedLessLabel : resolvedMoreLabel}</span>
          <Chevron />
        </span>
        </button>

        <div className={styles.body} style={bodyStyle}>
          <div
              className={styles.bodyInner}
              style={{ padding: `${PAD_TOP}px 18px ${padBottom}px 18px` }}
          >
            <div ref={contentRef}>{children}</div>
          </div>

          {!open && !short && <div className={styles.fade} aria-hidden="true" />}

          {!short && (
              <div className={styles.moreWrap}>
                <button
                    type="button"
                    className={styles.more}
                    aria-expanded={open}
                    onClick={() => setOpen((o) => !o)}
                >
                  <span>{open ? resolvedLessLabel : resolvedMoreLabel}</span>
                  <svg
                      className={`${styles.moreChevron} ${open ? styles.moreChevronUp : ''}`}
                      viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"
                      fill="none" stroke="currentColor" strokeWidth="2.5"
                      strokeLinecap="round" strokeLinejoin="round"
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>
              </div>
          )}
        </div>
      </div>
  );
}

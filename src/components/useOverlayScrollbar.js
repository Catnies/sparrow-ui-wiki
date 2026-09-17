// src/components/useOverlayScrollbar.js
//
// Overlay scrollbar: native scrollbar is hidden; a custom thumb is rendered
// into document.body as a position:fixed element, positioned via
// getBoundingClientRect() so it tracks the scroller's on-screen viewport
// regardless of layout nesting. Fades in only while scrolling, fades out
// ~600ms after scrolling stops.

import { useRef, useState, useEffect, useCallback } from 'react';

const HIDE_DELAY = 600; // ms after scrolling stops before fading out

export default function useOverlayScrollbar() {
  const scrollRef = useRef(null);
  const thumbRef = useRef(null);
  const hideTimer = useRef(null);
  const [visible, setVisible] = useState(false);

  const updateThumb = useCallback(() => {
    const el = scrollRef.current;
    const thumb = thumbRef.current;
    if (!el || !thumb) return;

    const { clientHeight, scrollHeight, scrollTop } = el;

    if (scrollHeight <= clientHeight + 1) {
      thumb.style.display = 'none';
      return;
    }
    thumb.style.display = '';

    const rect = el.getBoundingClientRect();
    const trackTop = rect.top;
    const trackHeight = rect.height;
    const left = rect.right - 10;

    const thumbHeight = Math.max(
      28,
      Math.round((clientHeight / scrollHeight) * trackHeight)
    );
    const maxTop = trackHeight - thumbHeight;
    const ratio = scrollHeight - clientHeight > 0
      ? scrollTop / (scrollHeight - clientHeight)
      : 0;
    const top = trackTop + Math.round(ratio * maxTop);

    thumb.style.height = `${thumbHeight}px`;
    thumb.style.left = `${left}px`;
    thumb.style.transform = `translateY(${top}px)`;
  }, []);

  const flashVisible = useCallback(() => {
    setVisible(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setVisible(false), HIDE_DELAY);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    // Coalesce layout-triggering work to one pass per animation frame so
    // rapid scroll/resize never forces layout more than once per frame.
    let rafId = 0;
    const scheduleUpdate = () => {
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        rafId = 0;
        updateThumb();
      });
    };

    const onScroll = () => {
      flashVisible();
      scheduleUpdate();
    };

    el.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('scroll', scheduleUpdate, { passive: true });
    window.addEventListener('resize', scheduleUpdate);

    const ro = new ResizeObserver(scheduleUpdate);
    ro.observe(el);
    if (el.firstElementChild) ro.observe(el.firstElementChild);

    // childList only: skip attributes so hover-driven state changes don't
    // trigger a thumb reflow.
    const mo = new MutationObserver(scheduleUpdate);
    mo.observe(el, { childList: true, subtree: true });

    updateThumb();

    return () => {
      el.removeEventListener('scroll', onScroll);
      window.removeEventListener('scroll', scheduleUpdate);
      window.removeEventListener('resize', scheduleUpdate);
      ro.disconnect();
      mo.disconnect();
      if (rafId) cancelAnimationFrame(rafId);
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, [flashVisible, updateThumb]);

  return { scrollRef, thumbRef, visible };
}

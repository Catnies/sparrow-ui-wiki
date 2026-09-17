// src/utils/initSidebarOverlayScrollbar.js
//
// Overlay scrollbar for the doc sidebar.
//
// The thumb is a position:fixed element on <body>, positioned via
// getBoundingClientRect() so it tracks the scroller's on-screen viewport
// regardless of layout nesting. It fades in only while scrolling and fades out
// ~600ms after scrolling stops.
//
// Performance notes:
//   • No body-wide MutationObserver. We attach once on mount and re-scan only
//     when the sidebar container itself changes (route changes swap its DOM).
//   • scroll/resize handlers are coalesced via requestAnimationFrame so we
//     never force layout more than once per frame.
//   • The content observer watches childList only (not attributes) so menu
//     hover / aria-expanded changes don't trigger thumb reflow.
//   • findScroller never does a full `*` scan with getComputedStyle.

const HIDE_DELAY = 600;
const SIDEBAR = '.theme-doc-sidebar-container';
const MENU = '.menu';

function isScrollableY(el) {
  if (el.clientHeight <= 0) return false;
  return el.scrollHeight - el.clientHeight > 1;
}

function findScroller(root) {
  // The sidebar scroller is <nav class="menu">. Check it (and any nested
  // .menu) first; only fall back to a targeted overflow scan if none qualify.
  const menus = root.querySelectorAll(MENU);
  for (const el of menus) {
    if (isScrollableY(el)) return el;
  }
  // Cheap fallback: only elements that declare scrollable overflow. We avoid
  // getComputedStyle on every descendant — query the style property directly,
  // which is cached by the browser and far cheaper than a full `*` + computed
  // style pass.
  for (const el of menus) {
    const ov = el.style.overflowY || getComputedStyle(el).overflowY;
    if ((ov === 'auto' || ov === 'scroll') && isScrollableY(el)) return el;
  }
  return null;
}

function attachTo(scroller) {
  if (scroller.dataset.osbAttached) return;
  scroller.dataset.osbAttached = '1';

  const thumb = document.createElement('div');
  thumb.className = 'osb-thumb';
  document.body.appendChild(thumb);

  let hideTimer = null;
  let visible = false;
  let rafId = 0;

  const updateThumb = () => {
    const {clientHeight, scrollHeight, scrollTop} = scroller;

    if (scrollHeight <= clientHeight + 1) {
      thumb.style.display = 'none';
      return;
    }
    thumb.style.display = '';

    const rect = scroller.getBoundingClientRect();
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
    const top = rect.top + Math.round(ratio * maxTop);

    thumb.style.height = `${thumbHeight}px`;
    thumb.style.left = `${left}px`;
    thumb.style.transform = `translateY(${top}px)`;
  };

  // Coalesce layout-triggering work to one pass per animation frame.
  const scheduleUpdate = () => {
    if (rafId) return;
    rafId = requestAnimationFrame(() => {
      rafId = 0;
      updateThumb();
    });
  };

  const show = () => {
    if (!visible) {
      visible = true;
      thumb.classList.add('osb-thumb--visible');
    }
    if (hideTimer) clearTimeout(hideTimer);
    hideTimer = setTimeout(() => {
      visible = false;
      thumb.classList.remove('osb-thumb--visible');
    }, HIDE_DELAY);
  };

  const onScroll = () => {
    show();
    scheduleUpdate();
  };

  scroller.addEventListener('scroll', onScroll, {passive: true});
  window.addEventListener('scroll', scheduleUpdate, {passive: true});
  window.addEventListener('resize', scheduleUpdate);

  const ro = new ResizeObserver(scheduleUpdate);
  ro.observe(scroller);
  // childList only: expand/collapse reorders children, which changes
  // scrollHeight. We deliberately skip attributes to avoid firing on every
  // hover-driven aria-expanded toggle.
  const childObserver = new MutationObserver(scheduleUpdate);
  childObserver.observe(scroller, {childList: true, subtree: true});

  updateThumb();

  return () => {
    scroller.removeEventListener('scroll', onScroll);
    window.removeEventListener('scroll', scheduleUpdate);
    window.removeEventListener('resize', scheduleUpdate);
    ro.disconnect();
    childObserver.disconnect();
    if (rafId) cancelAnimationFrame(rafId);
    if (hideTimer) clearTimeout(hideTimer);
    if (thumb.parentNode) thumb.parentNode.removeChild(thumb);
    delete scroller.dataset.osbAttached;
  };
}

export default function initSidebarOverlayScrollbar() {
  const cleanups = new Set();
  const attached = new WeakSet();

  let scanRaf = 0;
  const scan = () => {
    if (scanRaf) return;
    scanRaf = requestAnimationFrame(() => {
      scanRaf = 0;
      document.querySelectorAll(SIDEBAR).forEach((root) => {
        const scroller = findScroller(root);
        if (scroller && !attached.has(scroller)) {
          const cleanup = attachTo(scroller);
          if (cleanup) {
            attached.add(scroller);
            cleanups.add(cleanup);
          }
        }
      });
    });
  };

  scan();

  // Watch only the sidebar containers — NOT document.body — so unrelated DOM
  // changes (code highlighting, search, tooltips) don't trigger a rescan.
  // New sidebar containers appear on first paint / route changes; observing
  // each one we find covers its own remounts.
  const roots = document.querySelectorAll(SIDEBAR);
  const rootObserver = new MutationObserver(scan);
  roots.forEach((root) =>
    rootObserver.observe(root, {childList: true, subtree: true})
  );

  // Also catch a brand-new sidebar container appearing after mount (e.g. on
  // the very first client render). A single, narrowly-scoped body observer for
  // childList only (no subtree) is cheap and only fires when top-level nodes
  // are added/removed.
  const bodyObserver = new MutationObserver(scan);
  bodyObserver.observe(document.body, {childList: true});

  return () => {
    rootObserver.disconnect();
    bodyObserver.disconnect();
    if (scanRaf) cancelAnimationFrame(scanRaf);
    cleanups.forEach((fn) => fn());
    cleanups.clear();
  };
}

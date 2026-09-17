// src/theme/Root.js
// Client-side root wrapper:
//   • tags sidebar folders with depth/active classes (avoids :has() cost)
//   • installs an overlay scrollbar on the doc sidebar
//   • plays a "breeze" slide-in on the doc content when the route changes

import React from 'react';
import initSidebarOverlayScrollbar from '../utils/initSidebarOverlayScrollbar';
import initSidebarActiveFolder from '../utils/initSidebarActiveFolder';
import initSidebarToolbar from '../utils/initSidebarToolbar';

// Route-change transition: new content drifts in from the right while fading
// in. opacity + transform are compositor-friendly, so it stays smooth.
const ROUTE_ANIM = {
  duration: 420,
  easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
  fill: 'both',
};
const ROUTE_KEYFRAMES = [
  {opacity: 0, transform: 'translateX(48px)'},
  {opacity: 1, transform: 'translateX(0)'},
];

function prefersReducedMotion() {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

// Animate a freshly-mounted content node. Called from the MutationObserver
// the instant the new .theme-doc-markdown is inserted into the DOM — which is
// the ONLY reliable signal, because Docusaurus lazy-loads doc content, so the
// pathname change fires BEFORE the new node exists (an effect on pathname would
// animate the outgoing node, which then gets replaced — invisible).
function animateNode(el) {
  if (prefersReducedMotion()) return;
  el.animate(ROUTE_KEYFRAMES, {
    ...ROUTE_ANIM,
    delay: el.classList.contains('theme-doc-toc-desktop') ? 60 : 0,
  });
}

export default function Root({children}) {
  React.useEffect(() => {
    const cleanupActive = initSidebarActiveFolder();
    const cleanupScroll = initSidebarOverlayScrollbar();
    const cleanupToolbar = initSidebarToolbar();

    // Watch the whole doc for new .theme-doc-markdown / .theme-doc-toc-desktop
    // nodes. On a route change Docusaurus unmounts the old node and mounts a
    // new one; we animate the new one the moment it appears.
    const observer = new MutationObserver((mutations) => {
      for (const mut of mutations) {
        for (const node of mut.addedNodes) {
          if (node.nodeType !== 1) continue;
          if (
            node.classList &&
            (node.classList.contains('theme-doc-markdown') ||
              node.classList.contains('theme-doc-toc-desktop'))
          ) {
            animateNode(node);
          }
          // The node might be an ancestor wrapping the content. Only scan its
          // descendants when it could plausibly contain one — i.e. it has
          // element children. Leaf nodes (token spans, text wrappers added
          // during highlighting/etc.) have none, so skip the querySelectorAll
          // entirely instead of running it on every added element.
          if (node.childElementCount > 0) {
            node
              .querySelectorAll('.theme-doc-markdown, .theme-doc-toc-desktop')
              .forEach(animateNode);
          }
        }
      }
    });
    observer.observe(document.body, {childList: true, subtree: true});

    return () => {
      cleanupActive();
      cleanupScroll();
      cleanupToolbar();
      observer.disconnect();
    };
  }, []);

  return <>{children}</>;
}

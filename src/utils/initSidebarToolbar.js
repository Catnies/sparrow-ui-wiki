// src/utils/initSidebarToolbar.js
//
// Injects a utility toolbar at the top of the doc sidebar (before the menu
// tree). Vanilla JS, no React coupling.
//
// Tools: Expand All | Collapse All | Theme Color (popover also picks a page
//   background tint).
//
// Injected once per sidebar container; survives route changes because the
// observer catches sidebar rebuilds and re-injects automatically.

import {translate} from '@docusaurus/Translate';

const TOOLBAR_ID = 'sb-toolbar';

function t(key, defaultMsg) {
  return translate({id: `theme.sidebarToolbar.${key}`, message: defaultMsg});
}

// ---------------------------------------------------------------------------
// SVG icons (18×18, currentColor)
// ---------------------------------------------------------------------------
const ICONS = {
  expand:
    '<svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 7 9 11 13 7"/><path d="M5 12h8"/></svg>',
  collapse:
    '<svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 11 9 7 13 11"/><path d="M5 6h8"/></svg>',
  color:
    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a10 10 0 1 0 0 20 2.5 2.5 0 0 0 2.5-2.5c0-.66-.26-1.26-.68-1.7-.4-.43-.65-.99-.65-1.6A2.3 2.3 0 0 1 15.5 13H17a5 5 0 0 0 5-5c0-3.3-3.6-6-10-6z"/><circle cx="7.5" cy="10.5" r="1.3" fill="currentColor" stroke="none"/><circle cx="12" cy="7.5" r="1.3" fill="currentColor" stroke="none"/><circle cx="16.5" cy="10.5" r="1.3" fill="currentColor" stroke="none"/></svg>',
};

// ---------------------------------------------------------------------------
// Theme-color + background picker (mounted inside the toolbar's last slot).
// One popover, two rows: theme colors (primary accent) on top, page
// background tints below. Background tints are light-mode only — the row is
// hidden in dark mode, and the CSS overrides carry a :not([data-theme='dark'])
// guard so a saved tint never bleeds into dark mode.
// ---------------------------------------------------------------------------
const COLOR_STORAGE_KEY = 'theme-color';
const EYECARE_STORAGE_KEY = 'eyecare';

const COLORS = [
  {id: 'blue', label: 'Blue'},
  {id: 'cyan', label: 'Cyan'},
  {id: 'orange', label: 'Orange'},
  {id: 'purple', label: 'Purple'},
  {id: 'green', label: 'Green'},
];

// Page background tints. id 'none' = default (no data-eyecare attribute), the
// cancel position. The rest set <html data-eyecare="<id>">.
const BACKGROUNDS = [
  {id: 'none', label: 'Default'},
  {id: 'warm', label: 'Warm yellow'},
  {id: 'green', label: 'Eye-care green'},
  {id: 'sepia', label: 'Sepia'},
  {id: 'mist', label: 'Mist blue'},
];

function currentColor() {
  return document.documentElement.getAttribute('data-theme-color') || 'blue';
}

function applyColor(id) {
  document.documentElement.setAttribute('data-theme-color', id);
  try {
    localStorage.setItem(COLOR_STORAGE_KEY, id);
  } catch (e) {
    /* localStorage may be unavailable (private mode) — attribute still applies */
  }
  updateActiveSwatch();
}

function currentBackground() {
  return document.documentElement.getAttribute('data-eyecare') || 'none';
}

function applyBackground(id) {
  if (id === 'none') {
    document.documentElement.removeAttribute('data-eyecare');
    try {
      localStorage.removeItem(EYECARE_STORAGE_KEY);
    } catch (e) {
      /* localStorage may be unavailable — attribute already gone */
    }
  } else {
    document.documentElement.setAttribute('data-eyecare', id);
    try {
      localStorage.setItem(EYECARE_STORAGE_KEY, id);
    } catch (e) {
      /* localStorage may be unavailable — attribute still applies */
    }
  }
  updateActiveSwatch();
}

function updateActiveSwatch(toolbar) {
  const color = currentColor();
  const bg = currentBackground();
  const scope = toolbar || document;
  scope.querySelectorAll('[data-color]').forEach((sw) => {
    const isActive = sw.dataset.color === color;
    sw.classList.toggle('theme-color-swatch--active', isActive);
    sw.setAttribute('aria-pressed', String(isActive));
  });
  scope.querySelectorAll('[data-bg]').forEach((sw) => {
    const isActive = sw.dataset.bg === bg;
    sw.classList.toggle('theme-color-swatch--active', isActive);
    sw.setAttribute('aria-pressed', String(isActive));
  });
  // Also update mobile color dropdown
  document.querySelectorAll('[data-mobile-color]').forEach((a) => {
    a.classList.toggle('menu__link--active', a.dataset.mobileColor === color);
  });
}

const SWATCH_CHECK =
  '<svg class="theme-color-check" width="14" height="14" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9l3 3 7-7"/></svg>';

// Build the picker slot: a toolbar button that opens a two-row popover.
function buildColorSlot() {
  const colorRow = COLORS.map((c, i) => {
    const label = t(`color.${c.id}`, c.label);
    return `<button type="button" class="theme-color-swatch theme-color-swatch--${c.id}" data-color="${c.id}" style="--n:${i}" title="${label}" aria-label="${label}" aria-pressed="false">${SWATCH_CHECK}</button>`;
  }).join('');

  const bgRow = BACKGROUNDS.map((b, i) => {
    const label = t(`eyecare.${b.id}`, b.label);
    return `<button type="button" class="theme-color-swatch bg-swatch bg-swatch--${b.id}" data-bg="${b.id}" style="--n:${i}" title="${label}" aria-label="${label}" aria-pressed="false">${SWATCH_CHECK}</button>`;
  }).join('');

  const colorLabel = t('color', 'Theme color');
  return `
    <div class="theme-color-slot" data-color-slot>
      <button class="sb-toolbar-btn" type="button" data-color-toggle data-popover-toggle title="${colorLabel}" aria-label="${colorLabel}" aria-haspopup="true" aria-expanded="false">
        ${ICONS.color}
      </button>
      <div class="theme-color-popover" role="menu" hidden>
        <div class="theme-color-row" role="group" aria-label="${colorLabel}">${colorRow}</div>
        <div class="theme-color-row theme-color-row--bg" role="group" aria-label="${t('eyecare', 'Background')}">${bgRow}</div>
      </div>
    </div>`;
}

// Toggle a slot's popover open/closed with an exit animation. Generic over any
// slot whose toggle carries data-popover-toggle. Same race-guarded logic the
// navbar picker used: toggle on the --open class (visual state), not on
// `hidden` (which only flips after the exit animation finishes).
function setPopoverOpen(slot, open) {
  const btn = slot.querySelector('[data-popover-toggle]');
  const pop = slot.querySelector('.theme-color-popover');
  if (!btn || !pop) return;

  if (pop._closeTimer) {
    clearTimeout(pop._closeTimer);
    pop._closeTimer = 0;
  }

  btn.setAttribute('aria-expanded', String(open));

  if (open) {
    pop.hidden = false;
    void pop.offsetWidth; // force reflow so the transition runs
    pop.classList.add('theme-color-popover--open');
  } else {
    pop.classList.remove('theme-color-popover--open');
    if (pop.hidden) return;
    const finish = () => {
      pop._closeTimer = 0;
      // Aborted: reopened before this close finished — don't hide.
      if (pop.classList.contains('theme-color-popover--open')) return;
      pop.hidden = true;
    };
    // Only trust the popover's OWN transform ending — swatch transitionends
    // bubble up here and would fire finish() far too early.
    const onEnd = (e) => {
      if (e.target === pop && e.propertyName === 'transform') finish();
    };
    pop.addEventListener('transitionend', onEnd, {once: true});
    pop._closeTimer = setTimeout(finish, 620);
  }
}

// ---------------------------------------------------------------------------
// Tool logic
// ---------------------------------------------------------------------------

// Expand all collapsed sidebar categories.
//
// Scoped to .menu so it can NEVER match the toolbar's own buttons — the
// theme-color toggle carries aria-expanded="false" too, and clicking it opens
// the color popover (the "second expand toggles theme color" bug). The toolbar
// is a sibling of .menu, so .menu [aria-expanded] reaches only the real
// category controls: the sublist link (no-href categories) and the caret
// button (categories with an href), both of which toggle on click.
function expandAll(sidebarRoot) {
  const collapsed = sidebarRoot.querySelectorAll(
    '.menu [aria-expanded="false"]'
  );
  collapsed.forEach((el) => el.click());
}

// Collapse all expanded sidebar categories. Same scoping as expandAll.
function collapseAll(sidebarRoot) {
  const expanded = sidebarRoot.querySelectorAll(
    '.menu [aria-expanded="true"]'
  );
  expanded.forEach((el) => el.click());
}

// ---------------------------------------------------------------------------
// Build & inject
// ---------------------------------------------------------------------------

function buildToolbarHTML() {
  return `
    <div id="${TOOLBAR_ID}" class="sb-toolbar">
      <button class="sb-toolbar-btn" data-action="expand" title="${t('expand', 'Expand all')}">
        ${ICONS.expand}
      </button>
      <button class="sb-toolbar-btn" data-action="collapse" title="${t('collapse', 'Collapse all')}">
        ${ICONS.collapse}
      </button>
      ${buildColorSlot()}
    </div>`;
}

// Single delegated click handler for the whole toolbar.
function handleToolbarClick(e, sidebarRoot) {
  // Background tint swatch selection (popover's second row).
  const bgSw = e.target.closest('[data-bg]');
  if (bgSw) {
    applyBackground(bgSw.dataset.bg);
    const slot = bgSw.closest('[data-color-slot]');
    if (slot) setPopoverOpen(slot, false);
    return;
  }

  // Theme color swatch selection (popover's first row).
  const sw = e.target.closest('[data-color]');
  if (sw) {
    applyColor(sw.dataset.color);
    const slot = sw.closest('[data-color-slot]');
    if (slot) setPopoverOpen(slot, false);
    return;
  }

  // Popover toggle button.
  const toggle = e.target.closest('[data-popover-toggle]');
  if (toggle) {
    e.stopPropagation();
    const slot = toggle.closest('.theme-color-slot');
    if (slot) {
      const pop = slot.querySelector('.theme-color-popover');
      const isOpen = pop && pop.classList.contains('theme-color-popover--open');
      setPopoverOpen(slot, !isOpen);
    }
    return;
  }

  const btn = e.target.closest('[data-action]');
  if (!btn) return;

  switch (btn.dataset.action) {
    case 'expand':
      expandAll(sidebarRoot);
      break;
    case 'collapse':
      collapseAll(sidebarRoot);
      break;
  }
}

// Insert toolbar at the top of the sidebar card, before <nav class="menu">.
function injectInto(sidebarRoot) {
  if (sidebarRoot.dataset.sbToolbarInjected) return;

  const card = sidebarRoot.querySelector(':scope > div > div');
  const menu = sidebarRoot.querySelector(':scope > div > div > .menu');

  if (!card || !menu) return;

  card.insertAdjacentHTML('afterbegin', buildToolbarHTML());

  const toolbar = card.querySelector(`#${TOOLBAR_ID}`);
  if (!toolbar) return;

  // Stop toolbar clicks (esp. the popover toggle) from closing the popover via
  // the document-level outside-click listener.
  toolbar.addEventListener('click', (e) => e.stopPropagation());
  toolbar.addEventListener('click', (e) => handleToolbarClick(e, sidebarRoot));

  // Close any open popover on outside click / Escape.
  document.addEventListener('click', (e) => {
    toolbar.querySelectorAll('.theme-color-slot').forEach((slot) => {
      if (!slot.contains(e.target)) setPopoverOpen(slot, false);
    });
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      toolbar.querySelectorAll('.theme-color-slot').forEach((slot) =>
        setPopoverOpen(slot, false)
      );
    }
  });

  updateActiveSwatch(toolbar);

  sidebarRoot.dataset.sbToolbarInjected = '1';
}

// ---------------------------------------------------------------------------
// Social links in sidebar brand on mobile
//
// Docusaurus renders navbar items in multiple places (top navbar, sidebar menu).
// Instead of moving DOM nodes around (fragile with React re-renders), we create
// independent clones in the sidebar brand area and hide all originals via CSS.
// ---------------------------------------------------------------------------

const MOBILE_SOCIAL_LINKS_ID = 'mobile-social-links';

function ensureMobileSocialLinks() {
  const brand = document.querySelector('.navbar-sidebar__brand');
  if (!brand) return;

  // Already injected
  if (brand.querySelector(`#${MOBILE_SOCIAL_LINKS_ID}`)) return;

  // Find the color mode toggle — insert before it (to its left)
  const colorToggle = brand.querySelector('[class*="toggle"], [class*="colorMode"], button[aria-label*="mode"], button[aria-label*="主题"], button[aria-label*="切换"]');
  const ref = colorToggle || brand.querySelector('button:last-of-type');

  // Clone only the social links that actually exist in the navbar config —
  // there is no hardcoded fallback URL, so a site without Discord/QQ navbar
  // items gets no mobile social links at all.
  const origDiscord = document.querySelector('.navbar-discord-link');
  const origQQ = document.querySelector('.navbar-qq-link');
  if (!origDiscord && !origQQ) return;

  const container = document.createElement('div');
  container.id = MOBILE_SOCIAL_LINKS_ID;
  container.style.cssText = 'display:inline-flex;align-items:center;gap:0.3rem;';

  if (origDiscord) {
    const discordA = document.createElement('a');
    discordA.href = origDiscord.getAttribute('href');
    discordA.className = 'navbar-discord-link';
    discordA.setAttribute('aria-label', 'Discord');
    discordA.setAttribute('target', '_blank');
    discordA.setAttribute('rel', 'noopener noreferrer');
    container.appendChild(discordA);
  }

  if (origQQ) {
    const qqA = document.createElement('a');
    qqA.href = origQQ.getAttribute('href');
    qqA.className = 'navbar-qq-link';
    qqA.setAttribute('aria-label', 'QQ');
    qqA.setAttribute('target', '_blank');
    qqA.setAttribute('rel', 'noopener noreferrer');
    container.appendChild(qqA);
  }

  brand.insertBefore(container, ref || null);
}

function removeMobileSocialLinks() {
  document.querySelectorAll(`#${MOBILE_SOCIAL_LINKS_ID}`).forEach((el) => el.remove());
}

// ---------------------------------------------------------------------------
// Theme color dropdown in mobile sidebar menu (next to locale dropdown)
// ---------------------------------------------------------------------------

const MOBILE_COLOR_DROPDOWN_ID = 'mobile-color-dropdown';

function buildMobileColorDropdown() {
  const active = currentColor();
  const colorLabel = t('color', 'Theme color');
  const items = COLORS.map((c) => {
    const isActive = c.id === active;
    const label = t(`color.${c.id}`, c.label);
    return `<li class="menu__list-item">
      <a class="menu__link${isActive ? ' menu__link--active' : ''}" data-mobile-color="${c.id}" role="button" href="#" style="cursor:pointer;display:flex;align-items:center;">
        <span class="mobile-color-dot mobile-color-dot--${c.id}"></span>
        ${label}
      </a>
    </li>`;
  }).join('');

  return `<li class="menu__list-item" id="${MOBILE_COLOR_DROPDOWN_ID}">
    <div class="menu__list-item-collapsible">
      <a class="menu__link menu__link--sublist" role="button" href="#">
        ${ICONS.color}
        <span style="margin-left:5px;">${colorLabel}</span>
      </a>
      <button class="clean-btn menu__caret" aria-expanded="false"></button>
    </div>
    <ul class="menu__list">
      ${items}
    </ul>
  </li>`;
}

function ensureMobileColorDropdown() {
  // Only on mobile
  if (window.innerWidth >= 997) return;

  // Already injected
  if (document.getElementById(MOBILE_COLOR_DROPDOWN_ID)) return;

  // Find the first menu list in the sidebar (where locale dropdown lives)
  const firstMenuList = document.querySelector('.navbar-sidebar .menu__list');
  if (!firstMenuList) return;

  // Insert after the first item (locale dropdown)
  const firstItem = firstMenuList.querySelector(':scope > .menu__list-item');
  if (!firstItem) return;

  firstItem.insertAdjacentHTML('afterend', buildMobileColorDropdown());

  // Wire up click handlers
  const dropdown = document.getElementById(MOBILE_COLOR_DROPDOWN_ID);
  if (!dropdown) return;

  // Toggle expand/collapse
  const toggleLink = dropdown.querySelector('.menu__link--sublist');
  const caretBtn = dropdown.querySelector('.menu__caret');
  const sublist = dropdown.querySelector('.menu__list');

  const toggleExpand = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const isCollapsed = dropdown.classList.contains('menu__list-item--collapsed');
    if (isCollapsed) {
      dropdown.classList.remove('menu__list-item--collapsed');
      if (sublist) sublist.style.maxHeight = sublist.scrollHeight + 'px';
      if (caretBtn) caretBtn.setAttribute('aria-expanded', 'true');
    } else {
      dropdown.classList.add('menu__list-item--collapsed');
      if (sublist) sublist.style.maxHeight = '0px';
      if (caretBtn) caretBtn.setAttribute('aria-expanded', 'false');
    }
  };

  if (toggleLink) toggleLink.addEventListener('click', toggleExpand);
  if (caretBtn) caretBtn.addEventListener('click', toggleExpand);

  // Color selection
  dropdown.addEventListener('click', (e) => {
    const colorBtn = e.target.closest('[data-mobile-color]');
    if (!colorBtn) return;
    e.preventDefault();
    applyColor(colorBtn.dataset.mobileColor);
    // Update active state
    dropdown.querySelectorAll('[data-mobile-color]').forEach((a) => {
      a.classList.toggle('menu__link--active', a.dataset.mobileColor === colorBtn.dataset.mobileColor);
    });
  });

  // Start collapsed
  dropdown.classList.add('menu__list-item--collapsed');
  if (sublist) {
    sublist.style.maxHeight = '0px';
    sublist.style.overflow = 'hidden';
  }
}

function removeMobileColorDropdown() {
  document.querySelectorAll(`#${MOBILE_COLOR_DROPDOWN_ID}`).forEach((el) => el.remove());
}

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

const SIDEBAR = '.theme-doc-sidebar-container';

export default function initSidebarToolbar() {
  const injected = new WeakSet();
  let lastWidth = window.innerWidth;

  const scan = () => {
    requestAnimationFrame(() => {
      if (window.innerWidth < 997) {
        ensureMobileSocialLinks();
        ensureMobileColorDropdown();
      } else {
        removeMobileSocialLinks();
        removeMobileColorDropdown();
      }
      document.querySelectorAll(SIDEBAR).forEach((root) => {
        if (!injected.has(root)) {
          injectInto(root);
          injected.add(root);
        }
      });
    });
  };

  // Re-inject when crossing the mobile/desktop breakpoint. When the viewport
  // transitions from mobile (<997px) back to desktop (>=997px), the sidebar
  // container is rebuilt by Docusaurus — the old toolbar is lost. A resize
  // listener detects this and triggers a fresh injection.
  let resizeRaf = 0;
  const onResize = () => {
    if (resizeRaf) return;
    resizeRaf = requestAnimationFrame(() => {
      resizeRaf = 0;
      const width = window.innerWidth;
      const crossedBreakpoint =
        (lastWidth < 997 && width >= 997) || (lastWidth >= 997 && width < 997);
      lastWidth = width;

      if (crossedBreakpoint) {
        // Clear injection state so scan() re-injects into the rebuilt sidebar.
        document.querySelectorAll(SIDEBAR).forEach((root) => {
          delete root.dataset.sbToolbarInjected;
          injected.delete(root);
        });
        // Also remove stale toolbar DOM nodes (they may be detached already
        // but clean up just in case).
        document.querySelectorAll(`#${TOOLBAR_ID}`).forEach((el) => el.remove());

        // Docusaurus re-renders asynchronously — schedule delayed scans
        // to catch the new DOM after React finishes.
        scan();
        setTimeout(scan, 100);
        setTimeout(scan, 300);
        return;
      }
      scan();
    });
  };

  // Initial scan.
  scan();

  // Watch sidebar containers for DOM changes (childList catches menu rebuilds
  // on route changes, where the old .menu is replaced — we need to re-inject).
  const structObserver = new MutationObserver(() => {
    document.querySelectorAll(SIDEBAR).forEach((root) => {
      // Check if toolbar was lost (element no longer in DOM).
      const toolbar = root.querySelector(`#${TOOLBAR_ID}`);
      if (!toolbar && root.dataset.sbToolbarInjected) {
        delete root.dataset.sbToolbarInjected;
        injected.delete(root);
      }
    });
    scan();
  });

  document.querySelectorAll(SIDEBAR).forEach((root) => {
    structObserver.observe(root, { childList: true, subtree: true });
  });

  // Catch brand-new sidebar containers.
  const bodyObserver = new MutationObserver(() => {
    document.querySelectorAll(SIDEBAR).forEach((root) => {
      structObserver.observe(root, { childList: true, subtree: true });
    });
    scan();
  });
  bodyObserver.observe(document.body, { childList: true });

  window.addEventListener('resize', onResize, { passive: true });

  return () => {
    structObserver.disconnect();
    bodyObserver.disconnect();
    window.removeEventListener('resize', onResize);
    if (scanRaf) cancelAnimationFrame(scanRaf);
    if (resizeRaf) cancelAnimationFrame(resizeRaf);
    // Remove all injected toolbars.
    document.querySelectorAll(`#${TOOLBAR_ID}`).forEach((el) => el.remove());
    document.querySelectorAll(SIDEBAR).forEach((root) => {
      delete root.dataset.sbToolbarInjected;
    });
  };
}

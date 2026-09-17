// src/utils/initSidebarActiveFolder.js
//
// Marks the sidebar folder that directly contains the active doc with plain
// classes — so CSS can style the active rail WITHOUT `:has()` selectors,
// which are expensive to re-evaluate on a large (~200-item) sidebar.
//
// Classes written (on <ul class="menu__list">):
//   osb-active-folder  — this list directly contains the active page's <li>
//   osb-depth-N         — nesting depth (1..4), so the rail can darken by level
//
// When it (re)runs:
//   • on mount
//   • whenever the sidebar's structure changes (route changes rebuild it) via
//     a childList MutationObserver
//   • whenever a `class` attribute changes inside the sidebar (the active
//     item's class flips on navigation) — scoped to `class` only so hover-driven
//     aria-expanded changes don't trigger a refresh.
//   • a one-shot deferred refresh to catch post-hydration class application.
// All refreshes are coalesced via requestAnimationFrame.

const SIDEBAR = '.theme-doc-sidebar-container';
const MENU_LIST = 'ul.menu__list';
const ACTIVE_LINK = '.menu__link--active';
const MAX_DEPTH = 4;

// Tag every nested menu__list with its depth (1 = first nested list, i.e. a
// top-level category's children; the root <ul> under <nav class="menu"> is not
// a "folder panel" and stays untagged).
function tagDepths(root) {
  const rootUl = root.querySelector(MENU_LIST);
  if (!rootUl) return;

  const walk = (list, depth) => {
    if (!list || depth > MAX_DEPTH) return;
    list.classList.add(`osb-depth-${depth}`);
    const childLists = list.querySelectorAll(
      ':scope > .menu__list-item > ' + MENU_LIST
    );
    childLists.forEach((child) => walk(child, depth + 1));
  };

  const childLists = rootUl.querySelectorAll(
    ':scope > .menu__list-item > ' + MENU_LIST
  );
  childLists.forEach((child) => walk(child, 1));
}

// The <ul> we currently have marked active. Cached so that when nothing has
// changed we skip ALL class writes — and therefore emit no `class` mutation,
// which would otherwise re-trigger classObserver → lightRefresh → markActive in
// a self-sustaining per-frame loop (remove osb-active-folder, re-add it, …).
// Reset to null whenever the sidebar DOM is rebuilt (old node is detached).
let lastActiveUl = null;

// Mark the folder that directly owns the active page. Only that level lights up;
// ancestors stay grey.
//
// Docusaurus marks EVERY ancestor category link as `.menu__link--active` when a
// descendant doc is open (e.g. Configuration > Item > Item Models > Model are
// all active). We want the DEEPEST active link — the one whose <li> does not
// contain another active link — because that's the level actually owning the
// current page. `querySelector` returns the FIRST (outermost) one, which would
// wrongly point at a root-level category whose <ul> has no depth class.
function markActive(root) {
  // If the sidebar was rebuilt, our cached <ul> is detached — drop it so we
  // don't waste a classList call on a dead node (and so we re-mark from clean).
  if (lastActiveUl && !root.contains(lastActiveUl)) {
    lastActiveUl = null;
  }

  const activeLinks = root.querySelectorAll(ACTIVE_LINK);
  let owningUl = null;
  if (activeLinks.length > 0) {
    // Pick the innermost active link. Docusaurus marks every ancestor category
    // link active too, so an ancestor <li> contains MULTIPLE active links (its
    // own + the descendant's). The owning <li> of the current page contains
    // exactly ONE active link — itself. So pick the active link whose <li> has
    // only one active link inside it.
    let chosen = null;
    for (const link of activeLinks) {
      const li = link.closest('.menu__list-item');
      if (!li) continue;
      if (li.querySelectorAll(ACTIVE_LINK).length > 1) continue; // ancestor
      chosen = li;
      break;
    }
    // Fallback: last active link in document order.
    if (!chosen) {
      const li = activeLinks[activeLinks.length - 1].closest('.menu__list-item');
      if (li) chosen = li;
    }
    if (chosen) {
      const parent = chosen.parentElement;
      if (parent && parent.classList.contains('menu__list')) {
        owningUl = parent;
      }
    }
  }

  // Short-circuit: the active folder hasn't moved. Write NOTHING so no `class`
  // mutation fires and classObserver stays quiet. This is what breaks the
  // feedback loop — without it, markActive re-writes osb-active-folder every
  // frame forever.
  if (owningUl === lastActiveUl) return;

  if (lastActiveUl) lastActiveUl.classList.remove('osb-active-folder');
  if (owningUl) owningUl.classList.add('osb-active-folder');
  lastActiveUl = owningUl;
}

let rafId = 0;
function refresh() {
  if (rafId) return;
  rafId = requestAnimationFrame(() => {
    rafId = 0;
    document.querySelectorAll(SIDEBAR).forEach((root) => {
      tagDepths(root);
      markActive(root);
    });
  });
}

export default function initSidebarActiveFolder() {
  refresh();

  // Structure changes (route-change rebuilds, lazy-mounted collapsible <ul>s
  // appearing) need a full re-tag. This observer is childList-only.
  const structObserver = new MutationObserver(refresh);
  const structRoots = new Set();

  // Class changes (active item flipping on navigation, collapsed toggling on
  // expand/collapse) only need to re-mark the active folder — a lightweight
  // operation that doesn't walk the whole tree. Keep this separate from the
  // structural observer so expand/collapse animations aren't competing with
  // expensive tagDepths DOM walks.
  const lightRefresh = () => {
    if (lightRaf) return;
    lightRaf = requestAnimationFrame(() => {
      lightRaf = 0;
      document.querySelectorAll(SIDEBAR).forEach((root) => markActive(root));
    });
  };
  const classObserver = new MutationObserver(lightRefresh);
  const classRoots = new Set();
  let lightRaf = 0;

  const observeRoot = (root) => {
    if (!structRoots.has(root)) {
      structRoots.add(root);
      structObserver.observe(root, {childList: true, subtree: true});
    }
    if (!classRoots.has(root)) {
      classRoots.add(root);
      classObserver.observe(root, {
        subtree: true,
        attributeFilter: ['class'],
      });
    }
  };

  document.querySelectorAll(SIDEBAR).forEach(observeRoot);

  // Catch sidebar containers that appear after first paint (first client
  // render / route changes that swap the whole sidebar).
  const bodyObserver = new MutationObserver(() => {
    document.querySelectorAll(SIDEBAR).forEach(observeRoot);
    refresh();
  });
  bodyObserver.observe(document.body, {childList: true, subtree: false});

  // Deferred safety net: React may apply the active class slightly after the
  // initial mount effect runs. Re-check once after hydration settles.
  const deferred = setTimeout(refresh, 300);

  return () => {
    structObserver.disconnect();
    classObserver.disconnect();
    bodyObserver.disconnect();
    if (rafId) cancelAnimationFrame(rafId);
    if (lightRaf) cancelAnimationFrame(lightRaf);
    clearTimeout(deferred);
    lastActiveUl = null;
  };
}

import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)
//
// Mirrors sidebars/zh-hans.ts. The Chinese version is written first; the pages
// under docs/ are English placeholders until translation starts.

const sidebars: SidebarsConfig = {
  tutorialSidebar: [
    'intro',
    {
      type: 'category',
      label: '🚀 Getting Started',
      collapsed: false,
      items: [
        'getting-started/installation',
        'getting-started/quick-start',
        'getting-started/concepts',
      ],
    },
    {
      type: 'category',
      label: '📦 Item',
      items: [
        'item/create',
        'item/render',
        'item/click',
      ],
    },
    {
      type: 'category',
      label: '🧩 Pane',
      items: [
        'pane/structure',
        'pane/ingredients',
        'pane/composition',
        'pane/programmatic',
      ],
    },
    {
      type: 'category',
      label: '🖼 Window',
      items: [
        'window/lifecycle',
        'window/layout',
        'window/types',
        'window/title-data',
      ],
    },
    {
      type: 'category',
      label: '📄 Page & Scroll',
      items: [
        'pagination/page',
        'pagination/scroll-tab',
      ],
    },
    {
      type: 'category',
      label: '🎒 Inventories',
      items: [
        'inventory/basics',
        'inventory/virtual',
        'inventory/referencing',
        'inventory/rules-events',
      ],
    },
    {
      type: 'category',
      label: '✨ Visuals & Animation',
      items: [
        'visual/layers',
        'visual/animation',
      ],
    },
    {
      type: 'category',
      label: '🧭 Sessions',
      items: [
        'session/navigation',
        'session/structures',
      ],
    },
    {
      type: 'category',
      label: '⚡ Signal',
      items: [
        'signal/why',
        'signal/basics',
        'signal/derive',
        'signal/async',
        'signal/collections',
        'signal/bind-ui',
        'signal/practices',
      ],
    },
    {
      type: 'category',
      label: '🔬 Advanced',
      items: [
        'advanced/threading',
        'advanced/sharing',
        'advanced/lifecycle',
        'advanced/transaction',
        'advanced/troubleshooting',
      ],
    },
    {
      type: 'category',
      label: '🌐 Network',
      items: [
        'network/listen',
        'network/send-receive',
      ],
    },
    {
      type: 'category',
      label: '🍳 Examples',
      items: [
        'examples/overview',
      ],
    },
    {
      type: 'category',
      label: '📎 Appendix',
      items: [
        'appendix/faq',
        'appendix/glossary',
      ],
    },
    // Temporary: the component self-check page. Remove it together with the
    // page once all the prose is finished.
    {
      type: 'doc',
      id: 'components-preview',
      label: '🧪 Component preview',
    },
  ],
};

export default sidebars;

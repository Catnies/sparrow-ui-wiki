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
        'window/title',
        'window/data',
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
      label: '📄 Page & Scroll',
      items: [
        'pagination/page',
        'pagination/scroll',
        'pagination/tab',
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
      label: '⚡ Signal (Optional)',
      items: [
        'signal/why',
        {
          type: 'category',
          label: 'Getting started',
          items: [
            'signal/basics/mutable',
            'signal/basics/subscribe',
          ],
        },
        {
          type: 'category',
          label: 'Derivation',
          items: [
            'signal/derive/map',
            'signal/derive/map-distinct',
            'signal/derive/combine',
            'signal/derive/lens',
            'signal/derive/switching',
            'signal/derive/merging',
          ],
        },
        {
          type: 'category',
          label: 'Timing',
          items: [
            'signal/time/debounce',
            'signal/time/throttle',
            'signal/time/clock',
          ],
        },
        {
          type: 'category',
          label: 'Data sources',
          items: [
            'signal/source/async',
            'signal/source/polling',
          ],
        },
        {
          type: 'category',
          label: 'Collections',
          items: [
            'signal/collection/list',
            'signal/collection/set',
            'signal/collection/map',
            'signal/collection/read-only',
          ],
        },
        {
          type: 'category',
          label: 'Partitions',
          items: [
            'signal/keyed/basics',
            'signal/keyed/async',
            'signal/keyed/player',
          ],
        },
        {
          type: 'category',
          label: 'Binding Signals to Menus',
          items: [
            'signal-ui/item',
            'signal-ui/player',
            'signal-ui/list',
            'signal-ui/page',
            'signal-ui/scroll',
            'signal-ui/tab',
            'signal-ui/title',
            'signal-ui/visual',
          ],
        },
      ],
    },
    {
      type: 'category',
      label: '🌐 Network (Optional)',
      items: [
        'network/listen',
        'network/send-receive',
      ],
    },
    {
      type: 'category',
      label: '📎 Additional Notes (Optional)',
      items: [        'advanced/lifecycle',
        'advanced/transaction',      ],
    },
    'faq',
  ],
};

export default sidebars;

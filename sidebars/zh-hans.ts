import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

const sidebars: SidebarsConfig = {
  tutorialSidebar: [
    'intro',
    {
      type: 'category',
      label: '🚀 入门',
      collapsed: false,
      items: [
        'getting-started/installation',
        'getting-started/quick-start',
        'getting-started/concepts',
      ],
    },
    {
      type: 'category',
      label: '📦 物品 Item',
      items: [
        'item/create',
        'item/render',
        'item/click',
      ],
    },
    {
      type: 'category',
      label: '🧩 面板 Pane',
      items: [
        'pane/structure',
        'pane/ingredients',
        'pane/composition',
        'pane/programmatic',
      ],
    },
    {
      type: 'category',
      label: '🖼 窗口 Window',
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
      label: '🧭 会话与导航',
      items: [
        'session/navigation',
        'session/structures',
      ],
    },
    {
      type: 'category',
      label: '📄 翻页与滚动',
      items: [
        'pagination/page',
        'pagination/scroll',
        'pagination/tab',
      ],
    },
    {
      type: 'category',
      label: '🎒 容器与物品流动',
      items: [
        'inventory/basics',
        'inventory/virtual',
        'inventory/referencing',
        'inventory/rules-events',
      ],
    },
    {
      type: 'category',
      label: '✨ 视觉与动画',
      items: [
        'visual/layers',
        'visual/animation',
      ],
    },
    {
      type: 'category',
      label: '⚡ 响应式 Signal（可选）',
      items: [
        'signal/why',
        'signal/basics',
        'signal/derive',
        'signal/async',
        'signal/polling',
        'signal/collections',
        'signal/partitions',
        {
          type: 'category',
          label: 'Signal 在 UI 中的使用',
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
      label: '🌐 网络 Network（可选）',
      items: [
        'network/listen',
        'network/send-receive',
      ],
    },
    {
      type: 'category',
      label: '📎 补充说明（可选）',
      items: [        'advanced/lifecycle',
        'advanced/transaction',      ],
    },
    'faq',
  ],
};

export default sidebars;

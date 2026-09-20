import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)
//
// 章节顺序与页面清单由项目根目录的 WIKI-PLAN.md 定义, 改动请同步那份文档。
// 阅读路径是一条直线: 先用静态写法讲完菜单的每个零件 (2~8 组),
// 再由 Signal (9 组) 统一把它们点亮, 最后是进阶、附属内容与实战示例。

const sidebars: SidebarsConfig = {
  tutorialSidebar: [
    {
      type: 'category',
      label: '🚀 入门',
      collapsed: false,
      items: [
        'intro',
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
        'window/title-data',
      ],
    },
    {
      type: 'category',
      label: '📄 翻页与滚动',
      items: [
        'pagination/page',
        'pagination/scroll-tab',
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
      label: '🧭 会话与导航',
      items: [
        'session/navigation',
        'session/structures',
      ],
    },
    {
      type: 'category',
      label: '⚡ 响应式 Signal',
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
      label: '🔬 进阶',
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
      label: '🌐 网络 Network',
      items: [
        'network/listen',
        'network/send-receive',
      ],
    },
    {
      type: 'category',
      label: '🍳 实战示例',
      items: [
        'examples/overview',
      ],
    },
    {
      type: 'category',
      label: '📎 附录',
      items: [
        'appendix/faq',
        'appendix/glossary',
      ],
    },
    // 临时项: 通用组件的自查页。正文全部收口后连同页面一起删掉。
    {
      type: 'doc',
      id: 'components-preview',
      label: '🧪 组件预览（临时）',
    },
  ],
};

export default sidebars;

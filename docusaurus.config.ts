import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

const config: Config = {
  title: 'Sparrow UI',

  favicon: 'img/sparrow-ui-logo.png',

  // Future flags, see https://docusaurus.io/docs/api/docusaurus-config#future
  future: {
    v4: true, // Improve compatibility with the upcoming Docusaurus v4
    // Use the faster toolchain (Rspack + SWC + Lightning CSS + MDX-rs)
    // provided by the installed @docusaurus/faster package.
    faster: true,
  },

  // Set the production url of your site here
  url: 'https://catnies.github.io',
  // Set the /<baseUrl>/ pathname under which your site is served
  // For GitHub pages deployment, it is often '/<projectName>/'
  baseUrl: '/sparrow-ui-wiki/',

  // GitHub pages deployment config.
  // If you aren't using GitHub pages, you don't need these.
  organizationName: 'Catnies', // Usually your GitHub org/user name.
  projectName: 'sparrow-ui-wiki', // Usually your repo name.

  onBrokenLinks: 'throw',

  markdown: {
    hooks: {
      onBrokenMarkdownLinks: 'warn',
    }
  },

  // Reapply saved theme preferences BEFORE first paint so the navbar/active
  // states don't flash defaults on reload. The pickers (initThemeColorPicker,
  // initSidebarToolbar) own these attributes thereafter; this only sets them
  // early. Runs in <head>, before React mounts.
  headTags: [
    {
      tagName: 'script',
      attributes: {},
      innerHTML: `
      try {
        const themeColor = localStorage.getItem('theme-color');
        if (themeColor) {
          document.documentElement.setAttribute('data-theme-color', themeColor);
        }
      } catch (_) {}
      try {
        const eyeCare = localStorage.getItem('eyecare');
        if (eyeCare) {
          document.documentElement.setAttribute('data-eyecare', eyeCare);
        }
      } catch (_) {}
      `,
    },
  ],

  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'zh-Hans'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: require.resolve('./sidebars.js'),
          routeBasePath: '/',
          editUrl: 'https://github.com/Catnies/sparrow-ui-wiki/edit/master/',
          editLocalizedFiles: true,
          showLastUpdateTime: true,
          showLastUpdateAuthor: true,
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    // Replace with your project's social card
    navbar: {
      title: 'Sparrow UI',
      logo: {
        src: 'img/sparrow-ui-logo.png',
        width: 32,
        height: 32,
      },
      items: [
        {
          type: 'localeDropdown',
          position: 'right',
        },
        {
          href: 'https://github.com/Catnies/sparrow-ui-wiki',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },

    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ['java', 'kotlin', 'groovy', 'yaml'],
    },
    colorMode: {
      disableSwitch: false,
      respectPrefersColorScheme: true,
    },
    zoom: {
      selector: '.markdown img:not(.no-zoom)',
      background: {
        light: 'rgba(255,255,255,0.8)',
        dark: 'rgba(36,36,36,0.8)',
      },
    },
  } satisfies Preset.ThemeConfig,

  plugins: [
    [
      require.resolve("@easyops-cn/docusaurus-search-local"),
      /** @type {import("@easyops-cn/docusaurus-search-local").PluginOptions} */
      ({
        hashed: true,
        language: ["en", "zh"],
        searchBarShortcutKeymap: "ctrl+shift+f",
        docsRouteBasePath: "/",
      }),
    ],
    'docusaurus-plugin-image-zoom',
  ],
};

export default config;

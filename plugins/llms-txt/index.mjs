// plugins/llms-txt/index.mjs
// 生成给 AI 大模型读的文档，遵循 https://llmstxt.org 的约定。
//
// Docusaurus 每种语言单独 build 一次，postBuild 也各跑一次，所以每种语言各得一套：
//
//   <页面地址>.md    每篇文档的 Markdown 副本，llms.txt 里的链接指向它们
//   llms.txt         索引：按侧边栏分组，列出每篇文档副本的地址和简介
//   llms-full.txt    全部文档按侧边栏顺序拼成的单个文件
//
// 内容从 MDX 源码转换而来，不用 build 出来的 HTML：本站组件把大量正文放在 props 里，
// HTML 里只剩交互界面。转换规则见 convert.mjs 与 components.mjs。
//
// 只在 build 时生成，npm start 的开发模式下这些文件不存在。
//
// 选项：
//   description   各语言的一句话简介，写在 llms.txt 和 llms-full.txt 开头的引用块里，
//                 形如 {en: '…', 'zh-Hans': '…'}

import fs from 'node:fs/promises';
import path from 'node:path';
import logger from '@docusaurus/logger';
import {convertDoc} from './convert.mjs';
import {createTranslator} from './messages.mjs';

export default function llmsTxtPlugin(context, options) {
  let version;

  return {
    name: 'llms-txt',

    allContentLoaded({allContent}) {
      // 本站没有文档版本，isLast 的那个就是站点正在显示的文档
      version = allContent['docusaurus-plugin-content-docs'].default.loadedVersions.find((loaded) => loaded.isLast);
    },

    async postBuild({siteDir, outDir, siteConfig, baseUrl, i18n, codeTranslations}) {
      const t = createTranslator(i18n.currentLocale, codeTranslations);
      const absolute = (pathname) => siteConfig.url + pathname;
      const docsByPath = new Map(version.docs.map((doc) => [trimSlash(doc.permalink), doc]));

      // ---- 每篇文档的 Markdown 副本 ----

      const markdownById = new Map();
      const descriptionById = new Map();
      for (const doc of version.docs) {
        const pageUrl = new URL(doc.permalink, siteConfig.url);
        const relativeFile = doc.source.slice('@site/'.length);
        const {markdown, lead} = await convertDoc({
          file: path.join(siteDir, relativeFile),
          relativeFile,
          title: plainLabel(doc.title),
          pageUrl: pageUrl.href,
          t,
          resolveUrl: (url) => resolveUrl(url, {pageUrl, baseUrl, siteUrl: siteConfig.url, docsByPath}),
          warn: (message) => logger.warn(`llms-txt: ${message}`),
        });
        markdownById.set(doc.id, markdown);
        descriptionById.set(doc.id, doc.frontMatter.description ?? lead);
        await writeFile(outDir, markdownUrl(doc.permalink).slice(baseUrl.length), markdown);
      }

      // ---- llms.txt 与 llms-full.txt ----

      const sidebarItems = Object.values(version.sidebars).flat();
      const header = [`# ${siteConfig.title}`, `> ${options.description[i18n.currentLocale]}`];

      const otherLocales = i18n.locales
        .filter((locale) => locale !== i18n.currentLocale)
        .map((locale) => {
          const config = i18n.localeConfigs[locale];
          return t('llms.index.otherLocale', {label: config.label, url: `${config.url}${config.baseUrl}llms.txt`});
        });
      const index = [
        ...header,
        t('llms.index.intro', {url: absolute(`${baseUrl}llms-full.txt`)}),
        ...(otherLocales.length > 0 ? [otherLocales.join('\n')] : []),
        ...renderIndex(sidebarItems, version.docs, descriptionById, absolute),
      ];
      await writeFile(outDir, 'llms.txt', `${index.join('\n\n')}\n`);

      const fullDocs = sidebarDocs(sidebarItems, version.docs).map((doc) => markdownById.get(doc.id).trimEnd());
      await writeFile(outDir, 'llms-full.txt', `${[...header, ...fullDocs].join('\n\n')}\n`);

      logger.info(`llms-txt: wrote ${markdownById.size} Markdown pages, llms.txt and llms-full.txt to ${path.relative(siteDir, outDir)}`);
    },
  };
}

/**
 * llms.txt 的正文部分。
 *
 * 顶层的散页（介绍、常见问题）不属于任何分类，列在所有分组之前；每个顶层分类是一个二级标题，嵌套分类依次降级。
 * 简介优先取 front matter 的 description，没有时取正文开头那段话。
 */
function renderIndex(items, docs, descriptionById, absolute) {
  const docsById = new Map(docs.map((doc) => [doc.id, doc]));
  const entry = (doc) => {
    const line = `- [${plainLabel(doc.title)}](${absolute(markdownUrl(doc.permalink))})`;
    const description = descriptionById.get(doc.id);
    return description ? `${line}: ${description}` : line;
  };

  const sections = [];
  const renderCategory = (category, depth) => {
    const entries = [];
    const nested = [];
    if (category.link?.type === 'doc') entries.push(entry(docsById.get(category.link.id)));
    for (const item of category.items) {
      if (item.type === 'category') nested.push(item);
      else if (isListedDoc(item, docsById)) entries.push(entry(docsById.get(item.id)));
    }
    sections.push(`${'#'.repeat(depth)} ${plainLabel(category.label)}`);
    if (entries.length > 0) sections.push(entries.join('\n'));
    for (const child of nested) renderCategory(child, depth + 1);
  };

  const topLevelDocs = items.filter((item) => isListedDoc(item, docsById)).map((item) => entry(docsById.get(item.id)));
  for (const item of items) {
    if (item.type === 'category') renderCategory(item, 2);
  }
  return [...(topLevelDocs.length > 0 ? [topLevelDocs.join('\n')] : []), ...sections];
}

/** 侧边栏里按阅读顺序出现的全部文档，llms-full.txt 按这个顺序拼接。 */
function sidebarDocs(items, docs) {
  const docsById = new Map(docs.map((doc) => [doc.id, doc]));
  return items.flatMap((item) => {
    if (item.type === 'category') {
      const linked = item.link?.type === 'doc' ? [docsById.get(item.link.id)] : [];
      return [...linked, ...sidebarDocs(item.items, docs)];
    }
    return isListedDoc(item, docsById) ? [docsById.get(item.id)] : [];
  });
}

function isListedDoc(item, docsById) {
  return (item.type === 'doc' || item.type === 'ref') && !docsById.get(item.id).unlisted;
}

/**
 * 按页面地址解析文档里的链接，规则与站点一致：/ 开头相对 baseUrl，其余相对当前页面。
 *
 * 指向文档页的链接改成它 Markdown 副本的地址，锚点照原样保留；其余链接只补全成绝对地址。
 */
function resolveUrl(url, {pageUrl, baseUrl, siteUrl, docsByPath}) {
  if (/^[a-z][a-z\d+.-]*:/i.test(url)) return url;

  const hashIndex = url.indexOf('#');
  const pathPart = hashIndex === -1 ? url : url.slice(0, hashIndex);
  const hash = hashIndex === -1 ? '' : url.slice(hashIndex);

  let target = pageUrl;
  if (pathPart.startsWith('/')) target = new URL(baseUrl + pathPart.slice(1), siteUrl);
  else if (pathPart !== '') target = new URL(pathPart, pageUrl);

  const doc = docsByPath.get(trimSlash(decodeURI(target.pathname)));
  return (doc ? siteUrl + markdownUrl(doc.permalink) : target.href) + hash;
}

/**
 * 文档页地址 → 这一页 Markdown 副本的地址。
 *
 *   /sparrow-ui-wiki/pane/structure   → /sparrow-ui-wiki/pane/structure.md
 *   /sparrow-ui-wiki/zh-Hans/         → /sparrow-ui-wiki/zh-Hans/index.md
 *
 * 文档地址只有 slug 为 / 的首页以斜杠结尾，它没有可以加后缀的末段，副本放进目录里的 index.md。
 */
function markdownUrl(permalink) {
  return permalink.endsWith('/') ? `${permalink}index.md` : `${permalink}.md`;
}

/** 去掉标题和分类名开头的装饰 emoji，例如「🚀 入门」→「入门」。 */
function plainLabel(label) {
  return label.replace(/^[\p{Extended_Pictographic}\u{FE0F}\u{200D}\s]+/u, '');
}

function trimSlash(pathname) {
  return pathname.replace(/\/+$/, '');
}

async function writeFile(outDir, relativePath, content) {
  const file = path.join(outDir, relativePath);
  await fs.mkdir(path.dirname(file), {recursive: true});
  await fs.writeFile(file, content);
}

// plugins/llms-txt/messages.mjs
// Markdown 副本里用到的文案。
//
// 分两类来源：
//   SHARED  组件在页面上显示的文案，id 与组件里 translate() 的 id 一致。
//           译文从 postBuild 拿到的 codeTranslations（即 i18n/<locale>/code.json）里取，
//           这里只放英文默认值，要与组件源码里的 message 保持一致。
//   OWN     只出现在 Markdown 副本里的文案，页面上没有对应的组件，各语言直接写在这里。
//
// 新增语言时在 OWN 里补一份；没补的语言退回英文。

const SHARED = {
  'nextStep.label': 'Next',

  'threadBadge.viewer': 'viewer entity thread',
  'threadBadge.any': 'any thread',
  'threadBadge.async': 'async thread',
  'threadBadge.main': 'server main thread',

  'versionBadge.since': 'since {version}',
  'versionBadge.beta': 'may change',

  'apiTable.head.api': 'API',
  'apiTable.head.summary': 'Description',
  'apiTable.head.thread': 'Thread',
  'apiTable.head.version': 'Version',

  'minecraftWindow.inventory': 'Inventory',

  'theme.admonition.note': 'Note',
  'theme.admonition.tip': 'Tip',
  'theme.admonition.info': 'Info',
  'theme.admonition.warning': 'Warning',
  'theme.admonition.danger': 'Danger',
  'theme.admonition.caution': 'Caution',
};

const OWN = {
  en: {
    'llms.colon': ': ',
    'llms.paren': ' ({text})',
    'llms.listSeparator': ', ',
    'llms.source': 'Source: {url}',
    'llms.index.intro': 'Every link below points to the Markdown version of that page. All pages combined into one file: [llms-full.txt]({url}).',
    'llms.index.otherLocale': '{label}: [llms.txt]({url})',
    'llms.codeSteps.lines': 'lines {lines}',
    'llms.item.lore': 'lore: {lore}',
    'llms.slotGrid.inventory': 'The last 4 rows, after the blank line, are the player inventory.',
  },
  'zh-Hans': {
    'llms.colon': '：',
    'llms.paren': '（{text}）',
    'llms.listSeparator': '，',
    'llms.source': '原文：{url}',
    'llms.index.intro': '下面每个链接都指向对应页面的 Markdown 版本。全部文档合并在一个文件里：[llms-full.txt]({url})。',
    'llms.index.otherLocale': '{label}：[llms.txt]({url})',
    'llms.codeSteps.lines': '第 {lines} 行',
    'llms.item.lore': '说明：{lore}',
    'llms.slotGrid.inventory': '空行下面的 4 行是玩家物品栏。',
  },
};

/**
 * 创建当前语言的取文案函数。
 *
 * t(id, values)        按 id 取文案，把 {name} 占位符替换成 values 里的同名值
 * t.around(id, name)   按 {name} 把文案切成前后两段，用来包住链接、行内代码这类不是纯文字的节点
 */
export function createTranslator(locale, codeTranslations) {
  const own = OWN[locale] ?? OWN.en;
  const lookup = (id) => {
    const message = own[id] ?? codeTranslations[id] ?? SHARED[id] ?? OWN.en[id];
    if (message === undefined) throw new Error(`llms-txt: missing message "${id}"`);
    return message;
  };

  const t = (id, values = {}) => lookup(id).replace(/\{(\w+)\}/g, (_, name) => String(values[name]));
  t.around = (id, name) => lookup(id).split(`{${name}}`);
  return t;
}

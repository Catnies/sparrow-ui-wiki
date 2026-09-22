// plugins/llms-txt/components.mjs
// MDX 组件 → Markdown 的转换表。
//
// 每个转换函数收到求值后的 props 和一个上下文，返回替换这个组件的 mdast 节点：
//
//   ctx.children()        组件的子节点，已经按同样规则转换过
//   ctx.t(id, values)     当前语言的文案，见 messages.mjs
//   ctx.url(to)           站内链接改成对应页面 Markdown 副本的绝对地址
//   ctx.string(value, n)  断言 prop 是字符串；写成 JSX 的 prop 在这里报错
//
// 组件分三类：
//   1. 正文在 children 里：保留 children，标题一类的 props 写成加粗段落。
//   2. 正文在 props 里：把 props 拼成列表、表格或代码块。
//   3. 纯交互演示：没有正文，登记在 DEMOS 里，直接删掉。
//
// 两处都没登记的组件只保留 children，并在 build 时给出警告。新增组件后要在这里登记。

import {code, inlineCode, link, list, listItem, paragraph, strong, table, text, toText} from './mdast.mjs';

/** 与 src/components/BuildTabs.js 里的 VARIANTS 一一对应，顺序即页面上的标签页顺序。 */
const BUILD_VARIANTS = [
  {prop: 'kotlin', label: 'Gradle Kotlin', language: 'kotlin'},
  {prop: 'groovy', label: 'Gradle Groovy', language: 'groovy'},
  {prop: 'maven', label: 'Maven', language: 'xml'},
];

/** ThreadBadge 认识的线程类型，其他值与组件一样按 any 处理。 */
const THREAD_TYPES = new Set(['viewer', 'any', 'async', 'main']);

/** 玩家物品栏固定 4 行：3 行背包 + 1 行快捷栏，写在布局模板的最后。 */
const INVENTORY_ROWS = 4;

export const COMPONENTS = {
  // ---- 1. 正文在 children 里 ----

  Details: (props, ctx) => [paragraph([strong([text(ctx.string(props.summary, 'summary'))])]), ...ctx.children()],
  Tabs: (props, ctx) => ctx.children(),
  TabItem: (props, ctx) => [paragraph([strong([text(props.label ?? props.value)])]), ...ctx.children()],
  div: (props, ctx) => ctx.children(),

  // ---- 2. 正文在 props 里 ----

  NextStep: (props, ctx) => [
    paragraph([
      strong([text(props.label ?? ctx.t('nextStep.label'))]),
      text(ctx.t('llms.colon')),
      link(ctx.url(props.to), [text(props.title)]),
      ...(props.description ? [text(` — ${props.description}`)] : []),
    ]),
  ],

  ThreadBadge: (props, ctx) => {
    const children = ctx.children();
    const type = THREAD_TYPES.has(props.type) ? props.type : 'any';
    const label = children.length > 0 ? toText(children) : ctx.t(`threadBadge.${type}`);
    return [text(ctx.t('llms.paren', {text: label}).trim())];
  },

  // 代码只出现一次，步骤写成编号列表；每步的 preview 是布局示意图，删掉。
  CodeSteps: (props, ctx) => [
    code(props.language ?? 'java', dedent(ctx.string(props.code, 'code')), titleMeta(props.title)),
    list(true, props.steps.map((step) => listItem([paragraph([
      strong([text(step.title)]),
      text(ctx.t('llms.paren', {text: ctx.t('llms.codeSteps.lines', {lines: step.lines})})),
      ...(step.note ? [text(ctx.t('llms.colon') + ctx.string(step.note, 'steps[].note'))] : []),
    ])]))),
  ],

  // 页面上三选一，Markdown 里三份都写出来。
  BuildTabs: (props) => BUILD_VARIANTS
    .filter((variant) => props[variant.prop] !== undefined)
    .flatMap((variant) => [
      paragraph([strong([text(variant.label)])]),
      code(variant.language, dedent(props[variant.prop])),
    ]),

  // 列与组件一致：没有任何一行填线程或版本时不出现那一列。
  ApiTable: (props, ctx) => {
    const hasThread = props.rows.some((row) => row.thread);
    const hasSince = props.rows.some((row) => row.since || row.beta);
    const head = [
      ctx.t('apiTable.head.api'),
      ctx.t('apiTable.head.summary'),
      ...(hasThread ? [ctx.t('apiTable.head.thread')] : []),
      ...(hasSince ? [ctx.t('apiTable.head.version')] : []),
    ];
    const rows = props.rows.map((row) => [
      [inlineCode(row.name)],
      [text(ctx.string(row.summary, 'rows[].summary'))],
      ...(hasThread ? [[text(row.thread ? ctx.t(`threadBadge.${row.thread}`) : '')]] : []),
      ...(hasSince ? [[text(versionText(row, ctx))]] : []),
    ]);
    return [table([head.map((label) => [text(label)]), ...rows])];
  },

  // 节点树写成嵌套列表，每个节点一行：名称链接到对应章节，后面接连接方式和说明。
  ConceptMap: (props, ctx) => {
    const nodeTree = (nodes) => list(false, nodes.map((node) => listItem([
      paragraph(conceptLine(node, ctx)),
      ...(node.children?.length > 0 ? [nodeTree(node.children)] : []),
    ])));
    return [
      ...(props.relation ? [paragraph([text(props.relation)])] : []),
      nodeTree([props.root]),
      ...(props.supplement ? [paragraph([text(props.supplement)])] : []),
      ...(props.aside?.length > 0 ? [nodeTree(props.aside)] : []),
    ];
  },

  // 布局图写成字符模板加图例：标志符对应什么，模板里一眼能对上。
  MinecraftSlotGrid: (props, ctx) => {
    const {rows = [], legend = {}, icons = {}, items = {}} = props;
    const identifiers = [...new Set([...Object.keys(legend), ...Object.keys(items)])];
    const entries = identifiers.map((identifier) => {
      const icon = items[identifier]?.icon ?? icons[identifier];
      const meaning = legend[identifier] ?? items[identifier]?.name;
      if (meaning === undefined) return [identifier, [inlineCode(icon)]];
      return [identifier, [text(meaning), ...(icon ? paren([inlineCode(icon)], ctx) : [])]];
    });
    return layoutBlock({title: props.title, rows, playerInventory: props.playerInventory, entries, caption: props.caption}, ctx);
  },

  // 成品图没有图例，用物品的名称、材质、数量和说明代替。
  MinecraftWindow: (props, ctx) => {
    const {layout = [], items = {}} = props;
    if (layout.length === 0) return [];
    const entries = Object.entries(items).map(([identifier, item]) => [identifier, itemDescription(item, ctx)]);
    return layoutBlock({title: props.title, rows: layout, playerInventory: props.playerInventory, entries}, ctx);
  },
};

// ---- 3. 纯交互演示 ----

/** 整个删掉的组件。它们的 props 里常有回调函数，不求值直接丢弃。 */
export const DEMOS = new Set([
  'AnimationPreview',
  'MinecraftLoadingDemo',
  'MinecraftWindowDemo',
  'SessionStructureDemo',
  'SharedPaneDemo',
  'SignalFlowDemo',
  'VisualLayerDemo',
]);

/**
 * 字符模板代码块 + 图例列表 + 说明文字。
 *
 * 带玩家物品栏时，用空行把物品栏的 4 行和容器隔开。
 */
function layoutBlock({title, rows, playerInventory, entries, caption}, ctx) {
  const lines = playerInventory
    ? [...rows.slice(0, -INVENTORY_ROWS), '', ...rows.slice(-INVENTORY_ROWS)]
    : rows;
  return [
    code('text', lines.join('\n'), titleMeta(title)),
    ...(playerInventory ? [paragraph([text(ctx.t('llms.slotGrid.inventory'))])] : []),
    ...(entries.length > 0
      ? [list(false, entries.map(([identifier, meaning]) => listItem([
        paragraph([inlineCode(identifier), text(ctx.t('llms.colon')), ...meaning]),
      ])))]
      : []),
    ...(caption ? [paragraph([text(caption)])] : []),
  ];
}

/**
 * 物品的一句话描述：名称（材质）×数量，说明：……。与 MinecraftWindow 的 items 写法对应。
 *
 * 材质 id 写成行内代码：它就是代码里 Material 的名字，也免得下划线被转义。
 */
function itemDescription(item, ctx) {
  const nodes = item.name ? [text(item.name), ...paren([inlineCode(item.icon)], ctx)] : [inlineCode(item.icon)];
  if (item.count !== undefined) nodes.push(text(` ×${[].concat(item.count).join('/')}`));
  if (item.lore?.length > 0) {
    const lore = item.lore.map((line) => (typeof line === 'string' ? line : line.text)).join(' / ');
    nodes.push(text(ctx.t('llms.listSeparator') + ctx.t('llms.item.lore', {lore})));
  }
  return nodes;
}

/** 按当前语言的括号样式包住一组行内节点，例如中文的「（…）」和英文的「 (…)」。 */
function paren(nodes, ctx) {
  const [before, after] = ctx.t.around('llms.paren', 'text');
  return [text(before), ...nodes, text(after)];
}

function conceptLine(node, ctx) {
  const name = [text(node.title ? `${node.label} · ${node.title}` : node.label)];
  return [
    node.to ? link(ctx.url(node.to), name) : strong(name),
    ...(node.via ? [text(ctx.t('llms.paren', {text: node.via}))] : []),
    ...(node.desc ? [text(ctx.t('llms.colon') + node.desc)] : []),
  ];
}

function versionText(row, ctx) {
  return [
    row.since && ctx.t('versionBadge.since', {version: row.since}),
    row.beta && ctx.t('versionBadge.beta'),
  ].filter(Boolean).join(ctx.t('llms.listSeparator'));
}

function titleMeta(title) {
  return title ? `title=${JSON.stringify(title)}` : undefined;
}

/**
 * 与 BuildTabs、CodeSteps 相同的去缩进：去掉首尾空行，所有非空行整体左移最小公共缩进。
 *
 * CodeSteps 的 lines 行号按去缩进后的代码计，这里必须和组件算法一致，行号才对得上。
 */
function dedent(source) {
  const lines = source.replace(/\t/g, '    ').split('\n');
  while (lines.length > 0 && lines[0].trim() === '') lines.shift();
  while (lines.length > 0 && lines[lines.length - 1].trim() === '') lines.pop();

  const indents = lines.filter((line) => line.trim() !== '').map((line) => line.match(/^ */)[0].length);
  const indent = Math.min(...indents);
  return lines.map((line) => line.slice(indent)).join('\n');
}

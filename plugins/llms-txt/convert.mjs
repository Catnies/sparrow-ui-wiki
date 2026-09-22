// plugins/llms-txt/convert.mjs
// 单篇文档：MDX 源码 → Markdown。
//
// remark 先把 MDX 解析成 mdast，再逐个节点改写成普通 Markdown 能表达的结构，最后用 remark-stringify 输出：
//
//   front matter、import / export     删除
//   {/* 注释 */}                      删除，标题上的 {/* #id */} 也是这种注释
//   :::warning[标题] 提示块           改成引用块，首行加粗写出类型和标题
//   链接                              站内页面改成它 Markdown 副本的绝对地址，其余改成绝对地址
//   JSX 组件                          交给 components.mjs 的转换表
//
// 输出端不带 MDX 扩展：改写漏掉的 JSX 节点会让 remark-stringify 直接报错，不会悄悄混进结果。

import fs from 'node:fs/promises';
import {unified} from 'unified';
import remarkParse from 'remark-parse';
import remarkMdx from 'remark-mdx';
import remarkFrontmatter from 'remark-frontmatter';
import remarkDirective from 'remark-directive';
import remarkGfm from 'remark-gfm';
import remarkStringify from 'remark-stringify';
import {COMPONENTS, DEMOS} from './components.mjs';
import {blockquote, heading, link, paragraph, strong, text, toText} from './mdast.mjs';

const parser = unified()
  .use(remarkParse)
  .use(remarkMdx)
  .use(remarkFrontmatter)
  .use(remarkDirective)
  .use(remarkGfm);

// 表格不按列宽补空格：中文字符宽度算不准，补出来反而参差不齐。
const stringifier = unified()
  .use(remarkGfm, {tablePipeAlign: false})
  .use(remarkStringify, {bullet: '-', listItemIndent: 'one', rule: '-'});

/** Docusaurus 默认支持的提示块类型，译文 id 为 theme.admonition.<类型>。 */
const ADMONITIONS = new Set(['note', 'tip', 'info', 'warning', 'danger', 'caution']);

/** JSX 写成的 prop 值。转换函数只能忽略它；需要当文字用时 ctx.string 会报错。 */
const JSX_VALUE = Object.freeze({jsx: true});

/**
 * 转换一篇文档，返回 {markdown, lead}。
 *
 * lead 是正文开头、第一个标题之前那段话的纯文本，没有就是 undefined，给 llms.txt 当简介。
 * 不用 Docusaurus 自动生成的 description：正文以标题开头时它取到的是标题，还会把 MDX 注释当成正文。
 *
 * page 描述这篇文档所在的页面：
 *   file / relativeFile   源文件的绝对路径和相对站点根目录的路径（用于报错）
 *   title / pageUrl       页面标题和 HTML 页面的绝对地址
 *   t(id, values)         当前语言的文案
 *   resolveUrl(url)       按页面地址解析链接
 *   warn(message)         输出 build 警告
 */
export async function convertDoc(page) {
  const source = (await fs.readFile(page.file, 'utf8')).replace(/\r\n?/g, '\n');
  const tree = parser.parse(source);
  const state = {...page, source};
  transformChildren(tree, state);

  // 本站文档的标题写在 front matter 里，正文里没有一级标题；正文自带一级标题时沿用它。
  const hasTitle = tree.children[0]?.type === 'heading' && tree.children[0].depth === 1;
  const leadNode = tree.children[hasTitle ? 1 : 0];
  const lead = leadNode?.type === 'paragraph' ? toText(leadNode.children).replace(/\s*\n\s*/g, ' ') : undefined;
  if (!hasTitle) tree.children.unshift(heading(1, [text(page.title)]));
  // 地址写成链接节点：写成纯文字的话，GFM 会把 https: 里的冒号转义掉
  const [before, after] = page.t.around('llms.source', 'url');
  tree.children.splice(1, 0, paragraph([text(before), link(page.pageUrl, [text(page.pageUrl)]), text(after)]));

  return {markdown: stringifier.stringify(tree), lead};
}

function transformChildren(parent, state) {
  parent.children = parent.children.flatMap((child) => transformNode(child, state));
}

function transformNode(node, state) {
  switch (node.type) {
    case 'yaml':
    case 'mdxjsEsm':
      return [];
    case 'mdxFlowExpression':
    case 'mdxTextExpression':
      if (!/^\s*\/\*[\s\S]*\*\/\s*$/.test(node.value)) {
        throw locatedError(state, node, `only comments are supported in {…} expressions, got {${node.value}}`);
      }
      return [];
    case 'mdxJsxFlowElement':
    case 'mdxJsxTextElement':
      return convertElement(node, state);
    case 'containerDirective':
      return [convertAdmonition(node, state)];
    case 'leafDirective':
    case 'textDirective':
      // 不是提示块的指令，Docusaurus 会原样显示成文字，这里也还原成源码里的写法。
      return [restoreDirective(node, state)];
    case 'link':
    case 'image':
    case 'definition':
      node.url = state.resolveUrl(node.url);
      break;
  }

  if (node.children) transformChildren(node, state);
  // 删掉标题末尾的 {/* #id */} 后会剩下一个空格
  if (node.type === 'heading') trimEnd(node);
  return [node];
}

function convertElement(node, state) {
  const children = () => {
    transformChildren(node, state);
    return node.children;
  };

  if (DEMOS.has(node.name)) return [];
  const convert = COMPONENTS[node.name];
  if (convert === undefined) {
    state.warn(`${location(state, node)} has no Markdown conversion for <${node.name}>, only its children are kept. Register it in plugins/llms-txt/components.mjs.`);
    return children();
  }

  return convert(readProps(node, state), {
    children,
    t: state.t,
    url: state.resolveUrl,
    string(value, name) {
      if (typeof value !== 'string') throw locatedError(state, node, `<${node.name}> prop "${name}" must be a string to be converted to Markdown`);
      return value;
    },
  });
}

function convertAdmonition(node, state) {
  if (!ADMONITIONS.has(node.name)) throw locatedError(state, node, `unknown directive ":::${node.name}"`);
  transformChildren(node, state);

  // :::warning[标题] 的标题被解析成第一个子段落，并带 directiveLabel 标记
  const [first, ...rest] = node.children;
  const labelled = first?.data?.directiveLabel === true;
  const title = [text(state.t(`theme.admonition.${node.name}`))];
  if (labelled) title.push(text(state.t('llms.colon')), ...first.children);

  return blockquote([paragraph([strong(title)]), ...(labelled ? rest : node.children)]);
}

function restoreDirective(node, state) {
  const raw = text(state.source.slice(node.position.start.offset, node.position.end.offset));
  return node.type === 'leafDirective' ? paragraph([raw]) : raw;
}

// ---- JSX props 求值 ----

function readProps(node, state) {
  const props = {};
  for (const attribute of node.attributes) {
    if (attribute.type !== 'mdxJsxAttribute') throw locatedError(state, node, `<${node.name}> uses spread props, which cannot be converted`);
    const {name, value} = attribute;
    if (value === null || value === undefined) props[name] = true;
    else if (typeof value === 'string') props[name] = value;
    else props[name] = evaluate(value.data.estree.body[0].expression, state, node);
  }
  return props;
}

/**
 * 求出 prop 表达式的值，只认字面量：字符串、数字、数组、对象、无插值的模板字符串。
 *
 * 不执行任何代码。写成 JSX 的值返回 JSX_VALUE，其他表达式直接报错。
 */
function evaluate(expression, state, node) {
  switch (expression.type) {
    case 'Literal':
      return expression.value;
    case 'TemplateLiteral':
      if (expression.expressions.length === 0) return expression.quasis[0].value.cooked;
      break;
    case 'ArrayExpression':
      return expression.elements.map((element) => evaluate(element, state, node));
    case 'ObjectExpression':
      return Object.fromEntries(expression.properties.map((property) => {
        if (property.type !== 'Property' || property.computed) throw locatedError(state, node, `<${node.name}> props contain an object spread or computed key`);
        const key = property.key.type === 'Identifier' ? property.key.name : property.key.value;
        return [key, evaluate(property.value, state, node)];
      }));
    case 'UnaryExpression':
      if (expression.operator === '-') return -evaluate(expression.argument, state, node);
      break;
    case 'JSXElement':
    case 'JSXFragment':
      return JSX_VALUE;
  }
  throw locatedError(state, node, `<${node.name}> props contain a ${expression.type}, only literals can be converted to Markdown`);
}

// ---- 工具 ----

function trimEnd(node) {
  const last = node.children.at(-1);
  if (last?.type === 'text') last.value = last.value.trimEnd();
}

function location(state, node) {
  return `${state.relativeFile}:${node.position.start.line}`;
}

function locatedError(state, node, message) {
  return new Error(`llms-txt: ${location(state, node)} ${message}`);
}

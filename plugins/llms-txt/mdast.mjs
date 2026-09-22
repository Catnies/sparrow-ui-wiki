// plugins/llms-txt/mdast.mjs
// 构造 mdast 节点的小工具，组件转换和提示块改写都用它拼 Markdown 结构。

export const text = (value) => ({type: 'text', value});
export const inlineCode = (value) => ({type: 'inlineCode', value});
export const strong = (children) => ({type: 'strong', children});
export const link = (url, children) => ({type: 'link', url, children});
export const paragraph = (children) => ({type: 'paragraph', children});
export const heading = (depth, children) => ({type: 'heading', depth, children});
export const blockquote = (children) => ({type: 'blockquote', children});
export const code = (lang, value, meta) => ({type: 'code', lang, meta, value});
export const list = (ordered, items) => ({type: 'list', ordered, spread: false, children: items});
export const listItem = (children) => ({type: 'listItem', spread: false, children});

/** 表格：rows[0] 是表头，每个单元格是一组行内节点。 */
export const table = (rows) => ({
  type: 'table',
  align: rows[0].map(() => null),
  children: rows.map((cells) => ({
    type: 'tableRow',
    children: cells.map((children) => ({type: 'tableCell', children})),
  })),
});

/** 取一组节点里的纯文本。 */
export function toText(nodes) {
  return nodes.map((node) => node.value ?? toText(node.children ?? [])).join('');
}

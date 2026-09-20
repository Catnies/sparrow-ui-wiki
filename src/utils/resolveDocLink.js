// src/utils/resolveDocLink.js
// 把文档里写的相对链接解析成「站点内绝对路径」（不含 baseUrl）。
//
// 两件事必须一起处理，漏掉任何一件都会在中文站上得到错误的地址：
//
//   1. 尾斜杠。页面地址有没有结尾斜杠取决于访问方式，直接把 '../item/create'
//      交给浏览器解析，/pane/structure 和 /pane/structure/ 会得到两个结果。
//   2. baseUrl。本站的 baseUrl 是 /sparrow-ui-wiki/，而且在非默认语言下还会带上
//      locale 段，变成 /sparrow-ui-wiki/zh-Hans/。location.pathname 里这一段是
//      存在的，但返回值要交给 <Link>，而 <Link> 会自己补 baseUrl——
//      所以解析前必须先把它剥掉，否则 locale 段会被当成"当前页名"弹掉。
//
// 规则：
//   http(s):// 开头        → 外部链接，原样返回
//   / 或 # 开头            → 已经是站内绝对路径或页内锚点，原样返回
//   其余                   → 相对当前页所在目录解析，返回以 / 开头的站内路径
//
// 调用方把 useDocusaurusContext().siteConfig.baseUrl 传进来即可，
// 它在本地化构建下已经带好了 locale 段。

export default function resolveDocLink(pathname, url, baseUrl = '/') {
  if (!url) return url;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('/') || url.startsWith('#')) return url;

  // 先剥掉 baseUrl，只在"站内路径"这一层做相对解析
  const withoutBase = pathname.startsWith(baseUrl)
    ? pathname.slice(baseUrl.length)
    : pathname.replace(/^\//, '');

  const segments = withoutBase.split('/').filter(Boolean);
  segments.pop(); // 去掉当前页名，剩下当前目录

  for (const segment of url.split('/')) {
    if (!segment || segment === '.') continue;
    if (segment === '..') {
      segments.pop();
    } else {
      segments.push(segment);
    }
  }
  return '/' + segments.join('/');
}

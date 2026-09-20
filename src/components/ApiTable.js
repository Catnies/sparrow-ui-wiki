// src/components/ApiTable.js
// 方法速查表：签名 + 说明 + 线程要求 + 版本，每行可以直接锚点链接。
//
// 文档里几乎每页都要列一组相关方法。用 Markdown 表格写，行与行的列数、
// 顺序、线程标注方式会慢慢跑偏；用这个组件写，格式由组件保证，
// 而且每行自动带锚点，可以从别的页面直链到某个具体方法。
//
//   <ApiTable rows={[
//     {name: 'Item.simple(ItemStack)', summary: '把一个固定物品包成 Item', thread: 'any'},
//     {name: 'Window#open()', summary: <>返回 <code>CompletableFuture</code></>, thread: 'viewer', since: 'beta.33'},
//   ]} />
//
// summary 可以是字符串，也可以是 JSX（mdx 里写 <>...</> 即可）。

import React from 'react';
import {translate} from '@docusaurus/Translate';
import ThreadBadge from './ThreadBadge';
import VersionBadge from './VersionBadge';
import styles from './ApiTable.module.css';

/**
 * 把方法签名压成锚点 id。
 * 括号、点号、泛型尖括号这些在签名里到处都是，全部折成连字符；
 * 中文说明用的字符按 Unicode 字母类保留，这样中文标题也能生成可读的锚点。
 */
function slugify(text) {
  return String(text)
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '');
}

export default function ApiTable({rows = [], idPrefix = 'api'}) {
  if (!Array.isArray(rows) || rows.length === 0) {
    return <div className={styles.error}>ApiTable: rows 不能为空</div>;
  }

  // 没有任何一行填线程或版本时就不渲染那一列，避免表格里挂一整列空白
  const hasThread = rows.some((row) => row.thread);
  const hasSince = rows.some((row) => row.since || row.beta);

  return (
    <div className={styles.scroll}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th className={styles.nameHead}>
              {translate({
                id: 'apiTable.head.api',
                message: 'API',
                description: 'ApiTable column header for the method signature',
              })}
            </th>
            <th>
              {translate({
                id: 'apiTable.head.summary',
                message: 'Description',
                description: 'ApiTable column header for the description',
              })}
            </th>
            {hasThread && (
              <th className={styles.metaHead}>
                {translate({
                  id: 'apiTable.head.thread',
                  message: 'Thread',
                  description: 'ApiTable column header for the required thread',
                })}
              </th>
            )}
            {hasSince && (
              <th className={styles.metaHead}>
                {translate({
                  id: 'apiTable.head.version',
                  message: 'Version',
                  description: 'ApiTable column header for version information',
                })}
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => {
            // 调用方可以用 row.id 固定锚点；不给就从签名推一个。
            // 推导结果为空（比如签名全是符号）时退回行号，保证 id 唯一。
            const slug = row.id ?? slugify(row.name) ?? '';
            const id = `${idPrefix}-${slug || index}`;
            return (
              <tr key={id} id={id}>
                <td className={styles.nameCell}>
                  <code className={styles.name}>{row.name}</code>
                  <a
                    className={styles.anchor}
                    href={`#${id}`}
                    aria-label={translate(
                      {
                        id: 'apiTable.anchorLabel',
                        message: 'Direct link to {name}',
                        description: 'Accessible label for the per-row anchor link',
                      },
                      {name: String(row.name)},
                    )}
                  >
                    #
                  </a>
                </td>
                <td>{row.summary}</td>
                {hasThread && (
                  <td className={styles.metaCell}>
                    {row.thread && <ThreadBadge type={row.thread} />}
                  </td>
                )}
                {hasSince && (
                  <td className={styles.metaCell}>
                    {(row.since || row.beta) && (
                      <VersionBadge since={row.since} beta={row.beta} />
                    )}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

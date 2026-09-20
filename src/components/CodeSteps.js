// src/components/CodeSteps.js
// 分步走读同一份代码：步骤条 + 说明 + 高亮对应行的代码块 + 可选的槽位预览。
//
// 快速开始那类页面的难点是"代码是一整份，但要一段一段讲"。拆成好几个代码块
// 读者就看不出它们拼起来长什么样；只给一整份又不知道该先看哪。
// 这个组件让代码从头到尾只出现一次，切步骤时移动高亮，读者始终对着同一份文件。
//
//   <CodeSteps
//     language="java"
//     code={`...完整代码...`}
//     steps={[
//       {title: '画出布局', lines: '20-24', note: '三行字符模板就是菜单的形状。',
//        preview: <MinecraftSlotGrid rows={[...]} legend={{...}} />},
//     ]}
//   />
//
// lines 用 Docusaurus 代码块的高亮语法，'3'、'3-8'、'3,7-9' 都可以。

import React, {useEffect, useRef, useState} from 'react';
import CodeBlock from '@theme/CodeBlock';
import {translate} from '@docusaurus/Translate';
import styles from './CodeSteps.module.css';

// 与 BuildTabs 共用的去缩进逻辑：mdx 里的模板字符串多半带着整体缩进。
function dedent(code) {
  const lines = String(code).replace(/\t/g, '    ').split('\n');
  while (lines.length > 0 && lines[0].trim() === '') lines.shift();
  while (lines.length > 0 && lines[lines.length - 1].trim() === '') lines.pop();

  let indent = Infinity;
  for (const line of lines) {
    if (line.trim() === '') continue;
    indent = Math.min(indent, line.match(/^ */)[0].length);
  }
  if (!Number.isFinite(indent) || indent === 0) return lines.join('\n');
  return lines.map((line) => line.slice(indent)).join('\n');
}

export default function CodeSteps({code, language = 'java', title, steps = [], maxHeight = '23rem'}) {
  const [active, setActive] = useState(0);
  // 展开后取消限高，整份文件一眼看完，不需要在页面里再贴一遍
  const [expanded, setExpanded] = useState(false);
  const codeRef = useRef(null);

  // 切步骤之后，把这一步的第一行高亮滚进视野。
  // 不做这件事的话，稍长一点的类在浏览器里只露出开头几十行，
  // 读者选了第 5 步却完全看不到高亮跑到哪去了。
  useEffect(() => {
    const container = codeRef.current;
    if (!container) return;
    // 展开状态下没有滚动条，也就没有"滚到哪"这回事
    if (expanded) return;
    const pre = container.querySelector('pre');
    const first = container.querySelector('.theme-code-block-highlighted-line');
    if (!pre || !first) return;

    // 只动代码块自己的滚动条，不碰页面滚动——用 scrollIntoView 会把整页也带着跑
    const target = first.offsetTop - pre.clientHeight / 2 + first.offsetHeight / 2;
    const top = Math.max(0, Math.min(target, pre.scrollHeight - pre.clientHeight));
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    pre.scrollTo({top, behavior: reduceMotion ? 'auto' : 'smooth'});
  }, [active, expanded]);

  if (!Array.isArray(steps) || steps.length === 0 || typeof code !== 'string') {
    return <div className={styles.error}>CodeSteps: 需要 code 和至少一个 step</div>;
  }

  const index = Math.min(active, steps.length - 1);
  const step = steps[index];
  const source = dedent(code);

  const expandLabel = expanded
    ? translate({
        id: 'codeSteps.collapse',
        message: 'Collapse',
        description: 'CodeSteps: label of the button that re-applies the height limit',
      })
    : translate({
        id: 'codeSteps.expand',
        message: 'Show whole file',
        description: 'CodeSteps: label of the button that removes the height limit',
      });

  // 左右方向键在步骤条上直接换步，不用每次都去点
  const onKeyDown = (event) => {
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      setActive(Math.min(index + 1, steps.length - 1));
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      setActive(Math.max(index - 1, 0));
    }
  };

  return (
    <div className={styles.container}>
      <ol className={styles.rail} onKeyDown={onKeyDown}>
        {steps.map((item, itemIndex) => (
          <li key={item.title}>
            <button
              type="button"
              className={`${styles.railItem} ${itemIndex === index ? styles.railItemActive : ''}`}
              aria-current={itemIndex === index ? 'step' : undefined}
              onClick={() => setActive(itemIndex)}
            >
              <span className={styles.railIndex}>{itemIndex + 1}</span>
              <span className={styles.railTitle}>{item.title}</span>
            </button>
          </li>
        ))}
      </ol>

      {/* key 换了就重新挂载，说明和预览的淡入动画因此每步重播一次 */}
      <div className={styles.body} key={index}>
        {step.note && <p className={styles.note}>{step.note}</p>}
        {step.preview && <div className={styles.preview}>{step.preview}</div>}
      </div>

      {/* 代码整份只出现一次，切步骤时只换高亮行，读者始终对着同一个文件。
          没被选中的行在 CSS 里压暗，这一步该看哪几行一眼就能分出来。 */}
      <div
        className={`${styles.codeArea} ${expanded ? styles.codeAreaExpanded : ''}`}
        style={{'--code-max-height': maxHeight}}
        ref={codeRef}
      >
        <CodeBlock language={language} title={title} metastring={`{${step.lines}}`}>
          {source}
        </CodeBlock>
      </div>

      <div className={styles.nav}>
        <button type="button" className={styles.navButton} onClick={() => setExpanded(!expanded)}>
          <svg
            className={`${styles.chevron} ${expanded ? styles.chevronOpen : ''}`}
            viewBox="0 0 24 24"
            width="14"
            height="14"
            aria-hidden="true"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
          {expandLabel}
        </button>
        <span className={styles.progress}>
          {index + 1} / {steps.length}
        </span>
      </div>
    </div>
  );
}

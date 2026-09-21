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

import React, {useLayoutEffect, useRef, useState} from 'react';
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

  const bodyRef = useRef(null);
  const noteRef = useRef(null);
  const previousHeight = useRef(null);
  const initialized = useRef(false);

  const selectStep = (next) => {
    if (next === active) return;
    // 连续切换时从当前动画高度接续，不回到上一步的起点。
    previousHeight.current = bodyRef.current.getBoundingClientRect().height;
    setActive(next);
  };

  useLayoutEffect(() => {
    const body = bodyRef.current;
    if (!body) return;
    const height = body.getBoundingClientRect().height;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const animations = [];
    if (!reduceMotion && previousHeight.current !== null) {
      if (Math.abs(previousHeight.current - height) > 1) {
        animations.push(body.animate(
          [{height: `${previousHeight.current}px`}, {height: `${height}px`}],
          {duration: 280, easing: 'cubic-bezier(0.22, 1, 0.36, 1)'},
        ));
      }
      if (noteRef.current) {
        animations.push(noteRef.current.animate([{opacity: 0.55}, {opacity: 1}], {duration: 180}));
      }
    }
    previousHeight.current = null;
    return () => animations.forEach((animation) => animation.cancel());
  }, [active]);

  useLayoutEffect(() => {
    const container = codeRef.current;
    if (!container || expanded) return;
    let frame;
    const alignSelection = () => {
      const pre = container.querySelector('pre');
      const highlighted = container.querySelectorAll('.theme-code-block-highlighted-line');
      if (!pre || highlighted.length === 0) return false;
      const first = highlighted[0];
      const last = highlighted[highlighted.length - 1];

      // 用滚动容器内的坐标判断可见性，避免 offsetTop 相对于外部祖先造成偏移。
      const preRect = pre.getBoundingClientRect();
      const firstRect = first.getBoundingClientRect();
      const lastRect = last.getBoundingClientRect();
      const lineTop = firstRect.top - preRect.top + pre.scrollTop;
      const lineBottom = lastRect.bottom - preRect.top + pre.scrollTop;
      const start = pre.scrollTop;
      const padding = firstRect.height * 2;
      // 为整段高亮预留上下文；超过默认限高时扩展显示区。
      pre.style.setProperty('--code-selection-height', `${Math.ceil(lineBottom - lineTop + padding * 2)}px`);
      const alreadyVisible = lineTop >= start + padding && lineBottom <= start + pre.clientHeight - padding;
      const firstRender = !initialized.current;
      initialized.current = true;
      if (alreadyVisible) return true;

      const top = Math.max(0, Math.min((lineTop + lineBottom - pre.clientHeight) / 2, pre.scrollHeight - pre.clientHeight));
      if (firstRender || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        pre.scrollTop = top;
        return true;
      }

      const started = performance.now();
      const scroll = (now) => {
        const progress = Math.min((now - started) / 280, 1);
        pre.scrollTop = start + (top - start) * (1 - (1 - progress) ** 3);
        if (progress < 1) frame = requestAnimationFrame(scroll);
      };
      frame = requestAnimationFrame(scroll);
      return true;
    };

    // CodeBlock 首次加载可能晚于父组件的布局 effect，等代码行挂载后再定位。
    const observer = new MutationObserver(() => {
      cancelAnimationFrame(frame);
      alignSelection();
    });
    observer.observe(container, {childList: true, subtree: true, attributes: true, attributeFilter: ['class']});
    frame = requestAnimationFrame(alignSelection);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
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
      selectStep(Math.min(index + 1, steps.length - 1));
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      selectStep(Math.max(index - 1, 0));
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
              onClick={() => selectStep(itemIndex)}
            >
              <span className={styles.railIndex}>{itemIndex + 1}</span>
              <span className={styles.railTitle}>{item.title}</span>
            </button>
          </li>
        ))}
      </ol>

      {/* 保留预览节点，只过渡高度和说明文字，避免整个容器反复闪入。 */}
      <div className={styles.body} ref={bodyRef}>
        {step.note && <p className={styles.note} ref={noteRef}>{step.note}</p>}
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

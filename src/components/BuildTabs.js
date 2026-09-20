// src/components/BuildTabs.js
// 构建工具三选一的代码块：Gradle Kotlin / Gradle Groovy / Maven。
//
// 同一个 groupId 下的所有 BuildTabs 共享选择，并由 Docusaurus 存进 localStorage。
// 用户在安装页选了 Maven，之后每一页的构建代码块都会停在 Maven 上，
// 不用一页一页重新点。
//
//   <BuildTabs
//     kotlin={`implementation("net.momirealms:sparrow-ui:beta.33")`}
//     groovy={`implementation 'net.momirealms:sparrow-ui:beta.33'`}
//     maven={`<dependency>...</dependency>`}
//   />
//
// 只传其中一两个也可以，没传的标签页不会出现。

import React, {useEffect, useRef} from 'react';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';
import CodeBlock from '@theme/CodeBlock';
import styles from './BuildTabs.module.css';

// 声明顺序即标签页顺序。value 会进 localStorage，改动它会让老用户的选择失效，
// 所以这三个字符串定下来之后不要再改。
const VARIANTS = [
  {prop: 'kotlin', value: 'gradle-kts', label: 'Gradle Kotlin', language: 'kotlin'},
  {prop: 'groovy', value: 'gradle-groovy', label: 'Gradle Groovy', language: 'groovy'},
  {prop: 'maven', value: 'maven', label: 'Maven', language: 'xml'},
];

// mdx 里的模板字符串多半是缩进着写的，直接塞进代码块会带上一整截空白。
// 按所有非空行的最小公共缩进整体左移，并去掉首尾空行。
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

// 高度过渡的兜底时长，略大于 CSS 里 transition: height 的 440ms。
// 高度差被舍入成 0 之类的情况下 transitionend 不会来，得有人把内联 height 清掉。
const HEIGHT_SETTLE_MS = 520;

/**
 * 标签切换时的三段编排：指示条滑动、面板按方向滑入、代码逐行落位。
 *
 * Docusaurus 的 Tabs 把未选中的面板留在 DOM 里并打上 hidden，切换是一次
 * display 的开关，没有任何过渡。这里盯住 hidden 属性，在同一批 DOM 变更里
 * 把三件事安排好：
 *
 *   1. 方向。比较新旧面板的序号，写进容器的 data-dir，CSS 据此挑左进还是右进。
 *      必须在读取 offsetHeight 之前写，否则强制重排时动画已经按默认方向起跑了。
 *   2. 高度。切换后读到的是新高度，先把旧高度写回去、强制重排、再写新高度，
 *      CSS 的 height 过渡才有起点和终点。
 *   3. 指示条。滑到新标签的位置和宽度，同样写进自定义属性交给 CSS 过渡。
 *
 * 代码逐行落位的延迟纯靠 CSS 的 nth-child，不在这里写内联样式：
 * .token-line 上本来就带着 prism 生成的 style，React 重渲染会把外部塞进去的
 * 自定义属性一并抹掉。
 *
 * 收尾很关键：内联的 height 要清掉，把高度交还给内容。
 * 留着的话窗口宽度变化时高度会失配。
 */
function useTabChoreography(ref) {
  useEffect(() => {
    const node = ref.current;
    if (!node) return undefined;

    // 尊重系统的"减弱动态效果"设置，和 CSS 里的 media query 保持一致。
    // 指示条的定位照常执行，只是 CSS 那边不会有滑动过程。
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

    const panels = () => [...node.querySelectorAll('[role="tabpanel"]')];

    let activeIndex = panels().findIndex((panel) => !panel.hasAttribute('hidden'));
    let previousHeight = node.offsetHeight;
    let animating = false;
    let heightTimer;

    // 指示条对齐到当前选中的标签。用 getBoundingClientRect 而不是 offsetLeft：
    // ul 是 static 定位，offsetLeft 参照的是更外层的祖先，算出来不对。
    const moveIndicator = () => {
      const tabList = node.querySelector('.tabs');
      const active = node.querySelector('.tabs__item--active');
      if (!tabList || !active) return;
      const listRect = tabList.getBoundingClientRect();
      const activeRect = active.getBoundingClientRect();
      // 标签栏在窄屏下可以横向滚动，补上 scrollLeft 才是它在内容里的位置
      tabList.style.setProperty('--bt-x', `${activeRect.left - listRect.left + tabList.scrollLeft}px`);
      tabList.style.setProperty('--bt-w', `${activeRect.width}px`);
      tabList.style.setProperty('--bt-o', '1');
    };

    const settleHeight = () => {
      animating = false;
      clearTimeout(heightTimer);
      node.style.height = '';
      previousHeight = node.offsetHeight;
    };

    const onSwitch = () => {
      const next = panels().findIndex((panel) => !panel.hasAttribute('hidden'));
      if (next < 0) return;

      if (!reduceMotion) {
        // 先定方向，后面任何一次强制重排都会让动画按这个方向起跑
        if (next !== activeIndex) {
          node.dataset.dir = next > activeIndex ? 'forward' : 'backward';
        }

        // 裁剪由 CSS 的 overflow: clip 常驻负责，这里不碰 overflow。
        // 碰了就会改变 BFC 状态，进而改变外边距折叠，量出来的前后高度也就不可比。
        const height = node.offsetHeight;
        if (height !== previousHeight && !animating) {
          animating = true;
          node.style.height = `${previousHeight}px`;
          void node.offsetHeight; // 强制重排，让起点生效，否则会被合并成一次赋值
          node.style.height = `${height}px`;
          previousHeight = height;
          heightTimer = setTimeout(settleHeight, HEIGHT_SETTLE_MS);
        }
      }

      activeIndex = next;
      moveIndicator();
    };

    const onTransitionEnd = (event) => {
      if (event.target !== node || event.propertyName !== 'height') return;
      settleHeight();
    };

    moveIndicator();

    // 字体加载、窗口缩放都会改变静止高度和标签位置，不跟就会用过期的值
    let resizeObserver;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => {
        if (!animating) previousHeight = node.offsetHeight;
        moveIndicator();
      });
      resizeObserver.observe(node);
    }

    const mutationObserver = new MutationObserver(onSwitch);
    mutationObserver.observe(node, {
      attributes: true,
      attributeFilter: ['hidden'],
      subtree: true,
    });

    node.addEventListener('transitionend', onTransitionEnd);

    return () => {
      resizeObserver?.disconnect();
      mutationObserver.disconnect();
      node.removeEventListener('transitionend', onTransitionEnd);
      clearTimeout(heightTimer);
    };
  }, [ref]);
}

export default function BuildTabs({groupId = 'build-tool', title, ...codes}) {
  const containerRef = useRef(null);
  useTabChoreography(containerRef);

  const available = VARIANTS.filter(
    (variant) => typeof codes[variant.prop] === 'string' && codes[variant.prop].trim() !== '',
  );

  // 一个都没传通常是调用方写错了 prop 名，静默返回 null 会让人找不到原因。
  if (available.length === 0) {
    return (
      <CodeBlock language="text">
        BuildTabs: 没有提供任何构建配置，请至少传入 kotlin / groovy / maven 之一。
      </CodeBlock>
    );
  }

  return (
    <div className={styles.container} ref={containerRef}>
      <Tabs groupId={groupId}>
        {available.map((variant) => (
          <TabItem key={variant.value} value={variant.value} label={variant.label}>
            <CodeBlock language={variant.language} title={title}>
              {dedent(codes[variant.prop])}
            </CodeBlock>
          </TabItem>
        ))}
      </Tabs>
    </div>
  );
}

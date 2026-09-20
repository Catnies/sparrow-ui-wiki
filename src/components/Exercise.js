// src/components/Exercise.js
// 思考题：需求 → 实现思路 → 参考实现，后两段默认收起，读者自己决定什么时候看。
//
// 文档正文负责把 API 讲清楚，但"知道这个 API 存在"和"想得到该用它"是两回事。
// 在讲完一个功能之后摆一个真实需求，让读者先自己过一遍，再对答案，
// 比直接给一段示例代码留下的印象深得多。
//
//   <Exercise title="让按钮在最后一页变灰">
//
//   需求正文，markdown 随便写。
//
//   <ExerciseApproach>
//   实现思路，说清楚该往哪个方向想，不给完整代码。
//   </ExerciseApproach>
//
//   <ExerciseAnswer>
//   参考实现，可以放完整代码块。
//   </ExerciseAnswer>
//
//   </Exercise>
//
// 两个子块都是可选的，只给需求、只给答案都行。

import React, {useState} from 'react';
import {translate} from '@docusaurus/Translate';
import styles from './Exercise.module.css';

// 纯标记组件：Exercise 靠引用相等把它们从 children 里挑出来。
// 直接渲染时原样输出内容，这样即便被单独使用也不会丢东西。
export function ExerciseApproach({children}) {
  return <>{children}</>;
}

export function ExerciseAnswer({children}) {
  return <>{children}</>;
}

function Chevron({open}) {
  return (
    <svg
      className={`${styles.chevron} ${open ? styles.chevronOpen : ''}`}
      viewBox="0 0 24 24"
      width="15"
      height="15"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="9 6 15 12 9 18" />
    </svg>
  );
}

function Stage({label, children}) {
  const [open, setOpen] = useState(false);
  return (
    <div className={styles.stage}>
      <button
        type="button"
        className={styles.stageHeader}
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <Chevron open={open} />
        <span>{label}</span>
      </button>
      {/* 折叠靠条件渲染而不是高度过渡：做高度过渡就得加 overflow 裁剪，
          而 overflow: hidden 会建立 BFC 打乱外边距折叠。展开时淡入就够了。 */}
      {open && <div className={styles.stageBody}>{children}</div>}
    </div>
  );
}

export default function Exercise({title, children}) {
  // 把两个标记子块挑出来，剩下的都算需求正文
  const nodes = React.Children.toArray(children);
  const approach = nodes.find((node) => node?.type === ExerciseApproach);
  const answer = nodes.find((node) => node?.type === ExerciseAnswer);
  const problem = nodes.filter((node) => node?.type !== ExerciseApproach && node?.type !== ExerciseAnswer);

  return (
    <section className={styles.card}>
      <header className={styles.head}>
        <span className={styles.tag}>
          {translate({
            id: 'exercise.tag',
            message: 'Exercise',
            description: 'Exercise: the badge marking the block as a practice question',
          })}
        </span>
        {title && <h4 className={styles.title}>{title}</h4>}
      </header>

      <div className={styles.problem}>{problem}</div>

      {approach && (
        <Stage
          label={translate({
            id: 'exercise.approach',
            message: 'Approach',
            description: 'Exercise: label of the collapsible section holding the solution outline',
          })}
        >
          {approach}
        </Stage>
      )}

      {answer && (
        <Stage
          label={translate({
            id: 'exercise.answer',
            message: 'Reference implementation',
            description: 'Exercise: label of the collapsible section holding the reference code',
          })}
        >
          {answer}
        </Stage>
      )}
    </section>
  );
}

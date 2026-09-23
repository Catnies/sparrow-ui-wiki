// src/components/SignalStepDemo.js
// Signal 分步演示：整份示例代码只出现一次，每一步高亮正在执行的行，
// 下方同步显示菜单此刻的样子、每个 Signal 的值与通知情况，以及控制台打印的内容。
//
// 与 CodeSteps 的思路一致：读者始终对着同一份代码，切换步骤只移动高亮。
// 页面里不需要再单独贴一份同样的代码块，复制用代码块自带的按钮。
//
//   <SignalStepDemo
//     code={`...完整示例...`}
//     title="状态" layout={['####C####']}
//     signals={[{id: 'health', label: 'health'}, {id: 'condition', label: 'condition'}]}
//     items={(s) => ({C: {icon: 'lime_dye', name: s.condition}})}
//     steps={[
//       {lines: '1-4', state: {health: 20, condition: '健康'}, note: '...'},
//       {lines: '10', state: {...}, notified: ['health'], quiet: ['condition'], output: '...', refresh: ['C']},
//     ]}
//   />
//
// lines：这一步高亮的行，写法同 Docusaurus 代码块，'3'、'3-8'、'3,7-9' 都可以。
// state：这一步结束时全部 Signal 的值；和上一步不同的值会被标出来。
// notified：这一步发出通知的 Signal；quiet：这一步明确没有通知的 Signal，用来展示判等跳过；
// stale：已过期、还没重新计算的派生值，显示上一次的结果并标注「待计算」。
// output：这一步打印的内容，字符串或数组，控制台累积显示到当前步为止的全部输出。
// refresh：这一步菜单里重新显示的标志符，会在窗口中描边。
// title / items 可以写成接收 state 的函数，窗口随步骤变化。

import React, {useState} from 'react';
import {translate} from '@docusaurus/Translate';
import CodeBlock from '@theme/CodeBlock';
import McButton from './McButton';
import MinecraftWindow from './MinecraftWindow';
import styles from './SignalStepDemo.module.css';

const asList = (value) => (value == null ? [] : Array.isArray(value) ? value : [value]);

// mdx 里的模板字符串多半带着整体缩进，去掉公共缩进和首尾空行
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

export default function SignalStepDemo({
  code = '',
  title,
  type = 'chest',
  rows = 1,
  layout = [],
  empty = [],
  signals = [],
  items,
  steps = [],
}) {
  const [active, setActive] = useState(0);
  const step = steps[active] ?? {};
  const previous = active > 0 ? steps[active - 1].state ?? {} : null;
  const state = step.state ?? {};

  const notified = new Set(asList(step.notified));
  const quiet = new Set(asList(step.quiet));
  const stale = new Set(asList(step.stale));

  const outputs = steps.slice(0, active + 1).flatMap((item) => asList(item.output));
  const newOutputs = asList(step.output).length;
  const hasConsole = steps.some((item) => asList(item.output).length > 0);

  const format = (signal, value) => {
    if (signal.format) return signal.format(value);
    if (value === null || value === undefined) return 'null';
    return String(value);
  };

  const badge = (id) => {
    if (notified.has(id)) {
      return <span className={`${styles.badge} ${styles.notified}`}>
        {translate({id: 'signalStepDemo.notified', message: 'notified', description: 'SignalStepDemo: the signal sent a notification in this step'})}
      </span>;
    }
    if (quiet.has(id)) {
      return <span className={`${styles.badge} ${styles.quiet}`}>
        {translate({id: 'signalStepDemo.quiet', message: 'no notification', description: 'SignalStepDemo: the signal did not notify in this step'})}
      </span>;
    }
    if (stale.has(id)) {
      return <span className={`${styles.badge} ${styles.stale}`}>
        {translate({id: 'signalStepDemo.stale', message: 'not computed yet', description: 'SignalStepDemo: a derived value that is stale and not recomputed'})}
      </span>;
    }
    return null;
  };

  const go = (next) => setActive(Math.max(0, Math.min(steps.length - 1, next)));
  const onKeyDown = (event) => {
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      go(active + 1);
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      go(active - 1);
    }
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.controls} onKeyDown={onKeyDown}>
        <McButton onClick={() => go(0)} disabled={active === 0}>
          {translate({id: 'signalStepDemo.restart', message: 'Restart', description: 'SignalStepDemo: go back to the first step'})}
        </McButton>
        <McButton onClick={() => go(active - 1)} disabled={active === 0}>
          {translate({id: 'signalStepDemo.previous', message: 'Previous', description: 'SignalStepDemo: previous step button'})}
        </McButton>
        <McButton onClick={() => go(active + 1)} disabled={active === steps.length - 1}>
          {translate({id: 'signalStepDemo.next', message: 'Next', description: 'SignalStepDemo: next step button'})}
        </McButton>
        <span className={styles.counter}>
          {translate(
            {id: 'signalStepDemo.counter', message: 'Step {current} / {total}', description: 'SignalStepDemo: step counter'},
            {current: active + 1, total: steps.length},
          )}
        </span>
      </div>

      {step.note && <p className={styles.note} aria-live="polite">{step.note}</p>}

      <div className={styles.code}>
        <CodeBlock language="java" metastring={step.lines ? `{${step.lines}}` : undefined}>
          {dedent(code)}
        </CodeBlock>
      </div>

      <div className={styles.result}>
        <div className={styles.window}>
          <MinecraftWindow
            type={type}
            rows={rows}
            title={typeof title === 'function' ? title(state) : title}
            layout={layout}
            empty={empty}
            items={typeof items === 'function' ? items(state) : items ?? {}}
            highlight={step.refresh ?? null}
          />
        </div>

        <div className={styles.side}>
          {signals.length > 0 && (
            <table className={styles.values}>
              <tbody>
                {signals.map((signal) => {
                  const changed = previous !== null && !Object.is(previous[signal.id], state[signal.id]);
                  return (
                    <tr key={signal.id} className={changed ? styles.changed : undefined}>
                      <th scope="row"><code>{signal.label}</code></th>
                      <td className={stale.has(signal.id) ? styles.staleValue : undefined}>{format(signal, state[signal.id])}</td>
                      <td className={styles.badgeCell}>{badge(signal.id)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {hasConsole && (
            <div
              className={styles.console}
              aria-label={translate({id: 'signalStepDemo.console', message: 'Console output', description: 'SignalStepDemo: aria label of the console'})}
            >
              {outputs.length === 0
                ? <span className={styles.consoleEmpty}>
                  {translate({id: 'signalStepDemo.consoleEmpty', message: '(nothing printed yet)', description: 'SignalStepDemo: console placeholder'})}
                </span>
                : outputs.map((line, index) => (
                  <div key={index} className={index >= outputs.length - newOutputs ? styles.consoleNew : undefined}>{line}</div>
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

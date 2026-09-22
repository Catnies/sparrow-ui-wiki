// src/components/SignalFlowDemo.js
// Signal 数据流演示：左边是数据源，中间是派生，右边是消费者（菜单里的物品），下面是菜单本身。
// 点按钮改数据源后，通知按依赖关系一层层传开：
//   写入 → 派生标记为过期（此时不计算） → 消费者标记为需要重新显示 → 下一 tick 重新显示时才读取、计算新值
// 值没有变化时不发送任何通知，对应库里「判等相同则跳过」的行为。
//
//   <SignalFlowDemo
//     title="商店"
//     sources={[{id: 'quantity', label: '数量', value: 1}]}
//     derived={[{id: 'total', label: '总价', deps: ['quantity'], compute: (v) => v.quantity * 30}]}
//     consumers={[{id: 'totalItem', label: '总价物品', deps: ['total'], slot: 2, item: (v) => ({icon: 'gold_ingot', name: `总价：${v.total}`})}]}
//     actions={[{label: '数量 +1', apply: (v) => ({quantity: v.quantity + 1})}]}
//   />
//
// actions[i].apply 收到当前所有数据源的值，返回要写入的那几个数据源的新值。

import React, {useCallback, useEffect, useLayoutEffect, useRef, useState} from 'react';
import {translate} from '@docusaurus/Translate';
import McButton from './McButton';
import MinecraftWindow from './MinecraftWindow';
import styles from './SignalFlowDemo.module.css';

const IDENTIFIERS = 'abcdefghijklmnopqrstuvwxyz';
// 各阶段开始的时刻（毫秒），留出足够时间看清每一层
const PHASE_AT = {dirty: 600, pending: 1200, rendered: 1900, idle: 3400};

function sourceValuesOf(sources) {
  return Object.fromEntries(sources.map((source) => [source.id, source.value]));
}

// 按声明顺序计算全部派生值，派生可以依赖排在它前面的派生
function computeDerived(derived, sourceValues) {
  const values = {...sourceValues};
  derived.forEach((node) => {
    values[node.id] = node.compute(values);
  });
  return values;
}

export default function SignalFlowDemo({
  title,
  sources = [],
  derived = [],
  consumers = [],
  actions = [],
}) {
  const [sourceValues, setSourceValues] = useState(() => sourceValuesOf(sources));
  // 消费者上一次重新显示时读到的值；派生节点在重新显示之前一直显示旧值
  const [renderedValues, setRenderedValues] = useState(() => computeDerived(derived, sourceValuesOf(sources)));
  const [flow, setFlow] = useState({phase: 'idle', written: [], dirty: [], pending: [], unchanged: false});
  const timers = useRef([]);

  const clearTimers = () => {
    timers.current.forEach((timer) => clearTimeout(timer));
    timers.current = [];
  };
  useEffect(() => clearTimers, []);

  const run = (nextSources) => {
    clearTimers();
    const written = sources.map((source) => source.id).filter((id) => !Object.is(nextSources[id], sourceValues[id]));
    setSourceValues(nextSources);
    if (written.length === 0) {
      setFlow({phase: 'idle', written: [], dirty: [], pending: [], unchanged: true});
      return;
    }
    // 沿依赖关系找出所有受影响的派生和消费者
    const stale = new Set(written);
    const dirty = [];
    derived.forEach((node) => {
      if (node.deps.some((dep) => stale.has(dep))) {
        stale.add(node.id);
        dirty.push(node.id);
      }
    });
    const pending = consumers.filter((consumer) => consumer.deps.some((dep) => stale.has(dep))).map((consumer) => consumer.id);

    setFlow({phase: 'written', written, dirty: [], pending: [], unchanged: false});
    // 没有受影响的派生时跳过「过期」这一步，直接到消费者
    if (dirty.length > 0) {
      timers.current.push(setTimeout(() => setFlow({phase: 'dirty', written, dirty, pending: [], unchanged: false}), PHASE_AT.dirty));
    }
    timers.current.push(setTimeout(() => setFlow({phase: 'pending', written, dirty, pending, unchanged: false}), PHASE_AT.pending));
    timers.current.push(setTimeout(() => {
      setRenderedValues(computeDerived(derived, nextSources));
      setFlow({phase: 'rendered', written, dirty, pending, unchanged: false});
    }, PHASE_AT.rendered));
    timers.current.push(setTimeout(() => setFlow((current) => ({...current, phase: 'idle'})), PHASE_AT.idle));
  };

  const reset = () => {
    clearTimers();
    const initial = sourceValuesOf(sources);
    setSourceValues(initial);
    setRenderedValues(computeDerived(derived, initial));
    setFlow({phase: 'idle', written: [], dirty: [], pending: [], unchanged: false});
  };

  // ---- 连线：量出每个节点的位置，画在节点下面 ----
  const graphRef = useRef(null);
  const nodeRefs = useRef({});
  const [edges, setEdges] = useState([]);
  const measure = useCallback(() => {
    const graph = graphRef.current;
    if (!graph) return;
    const origin = graph.getBoundingClientRect();
    const anchor = (id, side) => {
      const element = nodeRefs.current[id];
      if (!element) return null;
      const rect = element.getBoundingClientRect();
      return {x: (side === 'out' ? rect.right : rect.left) - origin.left, y: rect.top + rect.height / 2 - origin.top};
    };
    const next = [];
    [...derived, ...consumers].forEach((node) => {
      node.deps.forEach((dep) => {
        const from = anchor(dep, 'out');
        const to = anchor(node.id, 'in');
        if (from && to) next.push({from: dep, to: node.id, x1: from.x, y1: from.y, x2: to.x, y2: to.y});
      });
    });
    setEdges(next);
  }, [derived, consumers]);
  useLayoutEffect(() => {
    measure();
    const observer = new ResizeObserver(measure);
    if (graphRef.current) observer.observe(graphRef.current);
    return () => observer.disconnect();
  }, [measure]);

  const stateOf = (id) => {
    if (flow.phase === 'idle') return '';
    if (flow.written.includes(id)) return styles.written;
    if (flow.phase === 'rendered' && (flow.dirty.includes(id) || flow.pending.includes(id))) return styles.rendered;
    if (flow.dirty.includes(id)) return styles.dirty;
    if (flow.pending.includes(id)) return styles.pending;
    return '';
  };
  const edgeActive = (edge) => {
    if (flow.phase === 'idle') return false;
    const reached = flow.phase === 'dirty' ? flow.dirty : [...flow.dirty, ...flow.pending];
    const upstream = [...flow.written, ...flow.dirty];
    return reached.includes(edge.to) && upstream.includes(edge.from);
  };

  const list = (ids) => ids
    .map((id) => [...sources, ...derived, ...consumers].find((node) => node.id === id)?.label ?? id)
    .join(translate({id: 'signalFlowDemo.separator', message: ', ', description: 'SignalFlowDemo: separator between node names'}));

  let status;
  if (flow.unchanged) {
    status = translate({id: 'signalFlowDemo.unchanged', message: 'The value did not change, so nothing is notified.', description: 'SignalFlowDemo: writing an equal value'});
  } else if (flow.phase === 'written') {
    status = translate({id: 'signalFlowDemo.written', message: '{nodes} got a new value.', description: 'SignalFlowDemo: sources written'}, {nodes: list(flow.written)});
  } else if (flow.phase === 'dirty') {
    status = translate({id: 'signalFlowDemo.dirty', message: '{nodes} are notified and marked stale. Nothing is recomputed yet.', description: 'SignalFlowDemo: derived nodes invalidated'}, {nodes: list(flow.dirty)});
  } else if (flow.phase === 'pending') {
    status = translate({id: 'signalFlowDemo.pending', message: '{nodes} are marked for redisplay.', description: 'SignalFlowDemo: consumers marked dirty'}, {nodes: list(flow.pending)});
  } else if (flow.phase === 'rendered') {
    status = translate({id: 'signalFlowDemo.rendered', message: 'Next tick: {nodes} redisplay, reading and computing the latest values only now.', description: 'SignalFlowDemo: consumers rendered'}, {nodes: list(flow.pending)});
  } else {
    status = translate({id: 'signalFlowDemo.idle', message: 'Change a source to see how the notification spreads.', description: 'SignalFlowDemo: hint before any change'});
  }

  const format = (node, value) => (node.format ? node.format(value) : String(value));
  const stale = (id) => flow.phase !== 'idle' && flow.phase !== 'rendered' && flow.dirty.includes(id);

  const items = {};
  const layout = [''.padEnd(9, '#').split('')];
  consumers.forEach((consumer, index) => {
    const identifier = IDENTIFIERS[index];
    layout[0][consumer.slot] = identifier;
    items[identifier] = consumer.item(renderedValues);
  });
  const highlight = flow.phase === 'rendered'
    ? consumers.map((consumer, index) => (flow.pending.includes(consumer.id) ? IDENTIFIERS[index] : null)).filter(Boolean)
    : null;

  const headings = [
    translate({id: 'signalFlowDemo.sources', message: 'Sources', description: 'SignalFlowDemo: column heading'}),
    translate({id: 'signalFlowDemo.derived', message: 'Derived', description: 'SignalFlowDemo: column heading'}),
    translate({id: 'signalFlowDemo.consumers', message: 'Consumers', description: 'SignalFlowDemo: column heading'}),
  ];

  const column = (nodes, render) => (
    <div className={styles.column}>
      {nodes.map((node) => (
        <div
          key={node.id}
          ref={(element) => {
            nodeRefs.current[node.id] = element;
          }}
          className={`${styles.node} ${stateOf(node.id)}`}
        >
          <span className={styles.label}>{node.label}</span>
          {render && <span className={`${styles.value} ${stale(node.id) ? styles.staleValue : ''}`}>{render(node)}</span>}
        </div>
      ))}
    </div>
  );

  return (
    <div className={styles.wrapper}>
      <div
        className={styles.actions}
        role="group"
        aria-label={translate({id: 'signalFlowDemo.actions.aria', message: 'Change sources', description: 'SignalFlowDemo: aria label of the action buttons'})}
      >
        {actions.map((action) => (
          <McButton key={action.label} onClick={() => run({...sourceValues, ...action.apply(sourceValues)})}>
            {action.label}
          </McButton>
        ))}
        <McButton onClick={reset}>
          {translate({id: 'signalFlowDemo.reset', message: 'Reset', description: 'SignalFlowDemo: reset button'})}
        </McButton>
      </div>

      <div className={styles.graph} ref={graphRef}>
        <svg className={styles.edges} aria-hidden="true">
          {edges.map((edge) => {
            const middle = (edge.x1 + edge.x2) / 2;
            return (
              <path
                key={`${edge.from}-${edge.to}`}
                className={edgeActive(edge) ? styles.edgeActive : styles.edge}
                d={`M ${edge.x1} ${edge.y1} C ${middle} ${edge.y1}, ${middle} ${edge.y2}, ${edge.x2} ${edge.y2}`}
              />
            );
          })}
        </svg>
        {/* 标题单独占第一行，三列的节点在第二行各自垂直居中 */}
        {headings.map((heading) => <div key={heading} className={styles.heading}>{heading}</div>)}
        {column(
          sources,
          (node) => format(node, sourceValues[node.id]),
        )}
        {column(
          derived,
          (node) => (stale(node.id)
            ? translate({id: 'signalFlowDemo.stale', message: 'stale', description: 'SignalFlowDemo: a derived value waiting to be recomputed'})
            : format(node, renderedValues[node.id])),
        )}
        {column(
          consumers,
          null,
        )}
      </div>

      <p className={styles.status} aria-live="polite">{status}</p>

      <div className={styles.window}>
        <MinecraftWindow type="chest" rows={1} title={title} layout={[layout[0].join('')]} items={items} highlight={highlight} />
      </div>
    </div>
  );
}

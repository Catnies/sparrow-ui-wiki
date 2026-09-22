import React from 'react';
import useBaseUrl from '@docusaurus/useBaseUrl';
import styles from './SessionStructureDemo.module.css';

function treePositions(parents) {
  const positions = {};
  let leaf = 0;
  function visit(id, depth) {
    const children = Object.keys(parents).filter((child) => parents[child] === id);
    const columns = children.map((child) => visit(child, depth + 1));
    const column = columns.length ? (columns[0] + columns.at(-1)) / 2 : leaf++;
    positions[id] = {column, y: 42 + depth * 82};
    return column;
  }
  visit('R', 0);
  return Object.fromEntries(Object.entries(positions).map(([id, position]) => [id, {
    x: 125 + (position.column - (leaf - 1) / 2) * 116,
    y: position.y,
  }]));
}

export default function SessionStructureGraph({state, labels, name}) {
  const itemBase = useBaseUrl('/img/mc/item/');
  const icons = {R: 'book', A: 'diamond', B: 'emerald'};
  if (!state.active) {
    return <div className={styles.graphEmpty}>{labels.ended}</div>;
  }
  const tree = state.kind === 'TREE';
  const height = tree ? 270 : Math.max(270, state.path.length * 54 + 48);
  const positions = tree ? treePositions(state.parents) : {};
  const nodes = tree
    ? Object.keys(state.parents).map((id) => ({id, key: id, ...positions[id]}))
    : state.path.map((id, index) => ({id, key: `${index}-${id}`, x: 125, y: height - 48 - index * 54}));
  const currentKey = tree ? state.path.at(-1) : nodes.at(-1).key;
  const summary = tree
    ? Object.entries(state.parents).filter(([, parent]) => parent !== null).map(([child, parent]) => `${name(parent)} → ${name(child)}`).join(', ')
    : state.path.map(name).join(' → ');

  return (
    <div className={styles.graphViewport}>
      <svg className={styles.graph} height={height} viewBox={`0 0 250 ${height}`} role="img" aria-label={`${state.kind}: ${summary}. ${labels.current}: ${name(state.path.at(-1))}`}>
        {!tree && <path className={styles.stackOutline} d={`M 53 20 V ${height - 18} H 197 V 20`} />}
        {tree && Object.entries(state.parents).filter(([, parent]) => parent !== null).map(([child, parent]) => {
          const start = positions[parent];
          const end = positions[child];
          const middle = (start.y + end.y) / 2;
          return <path key={child} className={`${styles.edge} ${state.path.includes(child) ? styles.pathEdge : ''}`}
            d={`M ${start.x} ${start.y + 20} V ${middle} H ${end.x} V ${end.y - 23}`} />;
        })}
        {nodes.map(({id, key, x, y}) => {
          const current = key === currentKey;
          const retained = tree && !state.path.includes(id);
          return (
            <g key={key} className={styles.graphPosition} style={{transform: `translate(${x}px, ${y}px)`}}>
              <g className={`${styles.graphNode} ${current ? styles.currentNode : ''} ${retained ? styles.retainedNode : ''}`}>
                <rect x="-48" y="-20" width="96" height="40" />
                <path className={styles.nodeBevel} d="M -46 18 V -18 H 46 M -14 -18 V 18" />
                <image className={styles.nodeItem} href={`${itemBase}${icons[id]}.png`} x="-43" y="-13" width="26" height="26" />
                <text textAnchor="middle" x="16" y={current ? -2 : 5}>{name(id)}</text>
                {current && <text className={styles.nodeCaption} textAnchor="middle" x="16" y="13">{labels.current}</text>}
              </g>
              {!tree && current && <path className={styles.topArrow} d="M 70 -5 L 63 0 L 70 5 M 64 0 H 84" />}
            </g>
          );
        })}
        {!tree && <text className={styles.axisLabel} x="125" y={height - 2} textAnchor="middle">{labels.stackBase}</text>}
      </svg>
    </div>
  );
}

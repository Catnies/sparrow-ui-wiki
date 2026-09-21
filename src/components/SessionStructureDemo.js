import React, {useState} from 'react';
import {translate} from '@docusaurus/Translate';
import McButton from './McButton';
import styles from './SessionStructureDemo.module.css';

const kinds = ['STACK', 'RETAINED_STACK', 'TREE'];

export function initialSession(kind) {
  return {kind, path: ['R'], parents: {R: null}, retained: [], active: true};
}

export function stepSession(state, action) {
  if (!state.active) return state;
  if (action === 'end') {
    return {...state, path: [], parents: {}, retained: [], active: false};
  }
  const path = [...state.path];
  if (action === 'back') {
    if (path.length === 1) return state;
    const popped = path.pop();
    const retained = state.kind === 'RETAINED_STACK' && !path.includes(popped)
      ? [...new Set([...state.retained, popped])] : state.retained;
    return {...state, path, retained};
  }
  if (path.at(-1) === action) return state;
  if (state.kind !== 'TREE') return {...state, path: [...path, action]};
  const parents = {...state.parents};
  if (!Object.hasOwn(parents, action)) parents[action] = path.at(-1);
  const nextPath = [];
  for (let node = action; node !== null; node = parents[node]) nextPath.unshift(node);
  return {...state, parents, path: nextPath};
}

export default function SessionStructureDemo() {
  const [sessions, setSessions] = useState(() => kinds.map(initialSession));
  const active = sessions[0].active;
  const labels = {
    root: translate({id: 'sessionDemo.root', message: 'Overview'}),
    enterA: translate({id: 'sessionDemo.enterA', message: 'Enter A'}),
    enterB: translate({id: 'sessionDemo.enterB', message: 'Enter B'}),
    back: translate({id: 'sessionDemo.back', message: 'Back'}),
    end: translate({id: 'sessionDemo.end', message: 'End session'}),
    reset: translate({id: 'sessionDemo.reset', message: 'Reset'}),
    path: translate({id: 'sessionDemo.path', message: 'Current path'}),
    held: translate({id: 'sessionDemo.held', message: 'Held by the session'}),
    parent: translate({id: 'sessionDemo.parent', message: 'Parent relationships'}),
    none: translate({id: 'sessionDemo.none', message: 'None'}),
    ended: translate({id: 'sessionDemo.ended', message: 'Session ended'}),
    current: translate({id: 'sessionDemo.current', message: 'Current'}),
    retained: translate({id: 'sessionDemo.retained', message: 'Retained outside the path'}),
    hint: translate({id: 'sessionDemo.hint', message: 'The highlighted node is current. A and B always refer to the same Window instances.'}),
    stack: translate({id: 'sessionDemo.stack', message: 'Back removes the top entry; windows absent from the stack are no longer held by the session.'}),
    retainedStack: translate({id: 'sessionDemo.retainedStack', message: 'Back removes the top entry; popped windows remain retained.'}),
    tree: translate({id: 'sessionDemo.tree', message: 'Back follows the original parent; all visited nodes remain retained.'}),
  };
  const name = (id) => id === 'R' ? labels.root : id;
  const dispatch = (action) => setSessions((previous) => previous.map((state) => stepSession(state, action)));

  return (
    <div className={styles.demo}>
      <div className={styles.controls}>
        <McButton disabled={!active} onClick={() => dispatch('A')}>{labels.enterA}</McButton>
        <McButton disabled={!active} onClick={() => dispatch('B')}>{labels.enterB}</McButton>
        <McButton disabled={!active || sessions.every((state) => state.path.length === 1)} onClick={() => dispatch('back')}>{labels.back}</McButton>
        <McButton disabled={!active} onClick={() => dispatch('end')}>{labels.end}</McButton>
        <McButton onClick={() => setSessions(kinds.map(initialSession))}>{labels.reset}</McButton>
      </div>
      <p className={styles.hint}>{labels.hint}</p>
      <div className={styles.comparison} aria-live="polite" aria-atomic="true">
        {sessions.map((state, index) => {
          const held = state.kind === 'TREE' ? Object.keys(state.parents) : [...new Set([...state.path, ...state.retained])];
          const outside = held.filter((id) => !state.path.includes(id));
          return (
            <section className={styles.card} key={state.kind} aria-label={state.kind}>
              <h3>{state.kind}</h3>
              <p className={styles.description}>{[labels.stack, labels.retainedStack, labels.tree][index]}</p>
              <div className={styles.label}>{labels.path}</div>
              <div className={styles.path}>
                {state.path.map((id, position) => (
                  <React.Fragment key={`${position}-${id}`}>
                    {position > 0 && <span aria-hidden="true">→</span>}
                    <span className={`${styles.node} ${position === state.path.length - 1 ? styles.current : ''}`}>
                      {name(id)}
                      {position === state.path.length - 1 && <span className={styles.badge}>{labels.current}</span>}
                    </span>
                  </React.Fragment>
                ))}
                {!active && <span>{labels.ended}</span>}
              </div>
              <div className={styles.label}>{labels.held}</div>
              <div className={styles.members}>{held.length ? held.map(name).join(' · ') : labels.none}</div>
              <div className={styles.label}>{labels.retained}</div>
              <div className={styles.members}>{outside.length ? outside.map(name).join(' · ') : labels.none}</div>
              {state.kind === 'TREE' && (
                <>
                  <div className={styles.label}>{labels.parent}</div>
                  <div className={styles.edges}>
                    {Object.entries(state.parents).filter(([, parent]) => parent !== null).map(([child, parent]) => (
                      <span key={child}>{name(parent)} → {name(child)}</span>
                    ))}
                    {Object.keys(state.parents).length <= 1 && labels.none}
                  </div>
                </>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}

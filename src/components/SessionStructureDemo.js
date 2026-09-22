import React, {useEffect, useMemo, useState} from 'react';
import {translate} from '@docusaurus/Translate';
import useBaseUrl from '@docusaurus/useBaseUrl';
import McButton from './McButton';
import SessionStructureGraph from './SessionStructureGraph';
import styles from './SessionStructureDemo.module.css';

const kinds = ['STACK', 'RETAINED_STACK', 'TREE'];
const scenarios = [['A', 'B', 'A', 'back'], ['A', 'back'], ['A', 'back', 'B', 'A', 'back']];

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
  const itemBase = useBaseUrl('/img/mc/item/');
  const icons = {R: 'book', A: 'diamond', B: 'emerald'};
  const icon = (item) => <img className={styles.itemIcon} src={`${itemBase}${item}.png`} alt="" aria-hidden="true" />;
  const [timeline, setTimeline] = useState({scenario: 0, actions: []});
  const [playing, setPlaying] = useState(false);
  const sessions = useMemo(() => kinds.map((kind) => timeline.actions.reduce(stepSession, initialSession(kind))), [timeline.actions]);
  const sequence = scenarios[timeline.scenario];
  const step = timeline.actions.length;
  const complete = sequence && step === sequence.length;
  const active = sessions[0].active;
  const labels = {
    root: translate({id: 'sessionDemo.root', message: 'Overview'}),
    enterA: translate({id: 'sessionDemo.enterA', message: 'Enter A'}),
    enterB: translate({id: 'sessionDemo.enterB', message: 'Enter B'}),
    back: translate({id: 'sessionDemo.back', message: 'Back'}),
    end: translate({id: 'sessionDemo.end', message: 'End session'}),
    reset: translate({id: 'sessionDemo.reset', message: 'Reset'}),
    held: translate({id: 'sessionDemo.held', message: 'Held by the session'}),
    none: translate({id: 'sessionDemo.none', message: 'None'}),
    ended: translate({id: 'sessionDemo.ended', message: 'Session ended'}),
    current: translate({id: 'sessionDemo.current', message: 'Current'}),
    retained: translate({id: 'sessionDemo.retained', message: 'Retained outside the path'}),
    hint: translate({id: 'sessionDemo.hint', message: 'The highlighted node is current. A and B always refer to the same Window instances.'}),
    stack: translate({id: 'sessionDemo.stack', message: 'Back removes the top entry; windows absent from the stack are no longer held by the session.'}),
    retainedStack: translate({id: 'sessionDemo.retainedStack', message: 'Back removes the top entry; popped windows remain retained.'}),
    tree: translate({id: 'sessionDemo.tree', message: 'Back follows the original parent; all visited nodes remain retained.'}),
    title: translate({id: 'sessionGraph.title', message: 'One action, three structures'}),
    subtitle: translate({id: 'sessionGraph.subtitle', message: 'Watch where each session goes back.'}),
    repeat: translate({id: 'sessionGraph.repeat', message: 'Revisit a window'}),
    retention: translate({id: 'sessionGraph.retention', message: 'Return and retain'}),
    branches: translate({id: 'sessionGraph.branches', message: 'Switch branches'}),
    play: translate({id: 'sessionGraph.play', message: 'Auto play'}),
    pause: translate({id: 'sessionGraph.pause', message: 'Pause'}),
    replay: translate({id: 'sessionGraph.replay', message: 'Replay'}),
    next: translate({id: 'sessionGraph.next', message: 'Next step'}),
    start: translate({id: 'sessionGraph.start', message: 'Open overview'}),
    manual: translate({id: 'sessionGraph.manual', message: 'Try it yourself'}),
    free: translate({id: 'sessionGraph.free', message: 'Free navigation'}),
    stackBase: translate({id: 'sessionGraph.stackBase', message: 'Stack base'}),
    backTo: translate({id: 'sessionGraph.backTo', message: 'Next back'}),
    atRoot: translate({id: 'sessionGraph.atRoot', message: 'At the root'}),
    stackTitle: translate({id: 'sessionGraph.stackTitle', message: 'Stack'}),
    retainedTitle: translate({id: 'sessionGraph.retainedTitle', message: 'Retained stack'}),
    treeTitle: translate({id: 'sessionGraph.treeTitle', message: 'Tree'}),
    initialHint: translate({id: 'sessionGraph.initialHint', message: 'Start the walkthrough, or select any step to compare the structures.'}),
    repeatedHint: translate({id: 'sessionGraph.repeatedHint', message: 'The stacks push A again. The tree moves back to the existing A; its original parent stays the overview.'}),
    returnedHint: translate({id: 'sessionGraph.returnedHint', message: 'The same Back action lands on B in both stacks, but on the overview in the tree.'}),
    retainedHint: translate({id: 'sessionGraph.retainedHint', message: 'A has left the path. The plain stack releases its reference; the retained stack and tree still hold A.'}),
    branchHint: translate({id: 'sessionGraph.branchHint', message: 'A and B were first opened from the overview, so they remain siblings in the tree.'}),
  };
  const name = (id) => id === 'R' ? labels.root : id;
  const actionName = (action) => ({A: labels.enterA, B: labels.enterB, back: labels.back, end: labels.end})[action];
  const titles = [labels.stackTitle, labels.retainedTitle, labels.treeTitle];
  const descriptions = [labels.stack, labels.retainedStack, labels.tree];

  useEffect(() => {
    if (!playing) return undefined;
    if (!sequence || complete) {
      setPlaying(false);
      return undefined;
    }
    const timer = setTimeout(() => {
      setTimeline((previous) => ({...previous, actions: [...previous.actions, sequence[previous.actions.length]]}));
    }, 1500);
    return () => clearTimeout(timer);
  }, [playing, sequence, complete, step]);

  function seek(scenario, position = 0) {
    setPlaying(false);
    setTimeline({scenario, actions: scenarios[scenario].slice(0, position)});
  }

  function dispatch(action) {
    setPlaying(false);
    setTimeline((previous) => ({scenario: null, actions: [...previous.actions, action]}));
  }

  let explanation = labels.hint;
  if (!active) explanation = labels.ended;
  else if (step === 0) explanation = labels.initialHint;
  else if (timeline.scenario === 0 && step === 3) explanation = labels.repeatedHint;
  else if (timeline.scenario === 0 && step === 4) explanation = labels.returnedHint;
  else if (timeline.scenario === 1 && step === 2) explanation = labels.retainedHint;
  else if (timeline.scenario === 2 && step >= 3) explanation = labels.branchHint;

  return (
    <div className={styles.demo}>
      <div className={styles.heading}>
        <div className={styles.headingTitle}>{icon('book')}<div><strong>{labels.title}</strong><p>{labels.subtitle}</p></div></div>
        <span className={styles.counter}>{sequence ? `${step} / ${sequence.length}` : labels.free}</span>
      </div>
      <div className={styles.scenarios} aria-label={labels.title}>
        {[labels.repeat, labels.retention, labels.branches].map((label, index) => (
          <McButton className={styles.mcButton} key={label} selected={timeline.scenario === index} onClick={() => seek(index)}>{label}</McButton>
        ))}
      </div>
      {sequence && <div className={styles.walkthrough}>
        <div className={styles.steps}>
          <button type="button" className={step === 0 ? styles.selectedStep : ''} aria-current={step === 0 ? 'step' : undefined} onClick={() => seek(timeline.scenario)}>{labels.start}</button>
          {sequence.map((action, index) => <React.Fragment key={index}>
            <span className={styles.stepArrow} aria-hidden="true">→</span>
            <button type="button" className={`${index < step ? styles.visitedStep : ''} ${step === index + 1 ? styles.selectedStep : ''}`}
              aria-current={step === index + 1 ? 'step' : undefined} onClick={() => seek(timeline.scenario, index + 1)}>
              <span className={styles.stepNumber}>{index + 1}</span>{actionName(action)}
            </button>
          </React.Fragment>)}
        </div>
        <div className={styles.playback}>
          <McButton className={styles.mcButton} aria-pressed={playing} onClick={() => {
            if (complete) setTimeline({scenario: timeline.scenario, actions: []});
            setPlaying(!playing);
          }}>{icon(playing ? 'gray_dye' : 'lime_dye')}{playing ? labels.pause : complete ? labels.replay : labels.play}</McButton>
          <McButton className={styles.mcButton} aria-pressed={undefined} disabled={complete} onClick={() => seek(timeline.scenario, step + 1)}>{icon('arrow')}{labels.next}</McButton>
        </div>
      </div>}
      <div className={styles.legend}>
        <span><i className={styles.currentDot} />{labels.current}</span>
        <span><i className={styles.pathDot} />{translate({id: 'sessionDemo.path', message: 'Current path'})}</span>
        <span><i className={styles.retainedDot} />{labels.retained}</span>
      </div>
      <div className={styles.comparison}>
        {sessions.map((state, index) => {
          const held = state.kind === 'TREE' ? Object.keys(state.parents) : [...new Set([...state.path, ...state.retained])];
          const outside = held.filter((id) => !state.path.includes(id));
          return <section className={styles.card} key={state.kind} aria-label={state.kind}>
            <div className={styles.cardHeading}><h3>{titles[index]}</h3><code>{state.kind}</code></div>
            <p className={styles.description}>{descriptions[index]}</p>
            <SessionStructureGraph state={state} labels={labels} name={name} />
            <div className={styles.destination}><span>{labels.backTo}</span><strong>{!active ? '—' : state.path.length > 1 ? `→ ${name(state.path.at(-2))}` : labels.atRoot}</strong></div>
            <div className={styles.members}>
              <span className={styles.label}>{labels.held}</span>
              <div>{held.length ? held.map((id) => <span key={id} className={`${styles.member} ${outside.includes(id) ? styles.retainedMember : ''}`}>{icon(icons[id])}{name(id)}</span>) : <span className={styles.empty}>{labels.none}</span>}</div>
            </div>
          </section>;
        })}
      </div>
      <p className={styles.explanation} role="status">{explanation}</p>
      <div className={styles.manual}>
        <span className={styles.label}>{labels.manual}</span>
        <div className={styles.controls}>
          <McButton className={styles.mcButton} aria-pressed={undefined} disabled={!active} onClick={() => dispatch('A')}>{icon('diamond')}{labels.enterA}</McButton>
          <McButton className={styles.mcButton} aria-pressed={undefined} disabled={!active} onClick={() => dispatch('B')}>{icon('emerald')}{labels.enterB}</McButton>
          <McButton className={styles.mcButton} aria-pressed={undefined} disabled={!active || sessions.every((state) => state.path.length === 1)} onClick={() => dispatch('back')}>{icon('arrow')}{labels.back}</McButton>
          <McButton className={styles.mcButton} aria-pressed={undefined} disabled={!active} onClick={() => dispatch('end')}>{icon('barrier')}{labels.end}</McButton>
          <McButton className={`${styles.mcButton} ${styles.resetButton}`} aria-pressed={undefined} onClick={() => seek(timeline.scenario ?? 0)}>{labels.reset}</McButton>
        </div>
      </div>
    </div>
  );
}

// src/components/LayeredSteps.js
// Modern, copyable "layered" YAML snapshots as selectable step tabs. Each step
// shows the cumulative config; lines new relative to the previous step are
// highlighted (green diff style + `+` gutter). Copy button copies the active
// step's raw YAML. Colors reuse the shared `.language-yaml .token.*` palette.

import React, { useState, useMemo, useRef } from 'react';
import { translate } from '@docusaurus/Translate';
import styles from './LayeredSteps.module.css';
import { renderYamlLine, yamlLines, splitComment } from './yamlTokens';

function useCopy() {
  const [copied, setCopied] = useState(false);
  const timer = useRef(null);
  const copy = (text) => {
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        setCopied(true);
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => setCopied(false), 1500);
      }).catch(() => {});
    }
  };
  return { copied, copy };
}

// Normalize a line to its "structural identity": strip the trailing `#`
// comment and all whitespace. Two lines that differ only by an inline comment
// or indentation are then treated as the same line, so the diff only flags
// genuinely new content.
function lineIdentity(line) {
  const { code } = splitComment(line);
  return code.replace(/\s+/g, '');
}

function diffAdded(prevLines, currLines) {
  const prevCounts = new Map();
  for (const l of prevLines) {
    const id = lineIdentity(l);
    if (!id) continue;
    prevCounts.set(id, (prevCounts.get(id) || 0) + 1);
  }
  const added = new Set();
  for (const l of currLines) {
    const id = lineIdentity(l);
    if (!id) continue;
    const remaining = prevCounts.get(id) || 0;
    if (remaining > 0) {
      prevCounts.set(id, remaining - 1);
    } else {
      added.add(lineIdentity(l));
    }
  }
  return added;
}

export default function LayeredSteps({ steps = [] }) {
  const [active, setActive] = useState(0);
  const { copied, copy } = useCopy();

  const enriched = useMemo(
    () => steps.map((step, i) => ({ ...step, _prevFull: i > 0 ? steps[i - 1].full : null })),
    [steps]
  );
  const current = enriched[active];

  const lines = useMemo(() => (current ? yamlLines(current.full) : []), [current]);
  const addedSet = useMemo(() => {
    if (!current) return new Set();
    if (current.added) return new Set(current.added.map((s) => lineIdentity(s)));
    if (!current._prevFull) return new Set();
    return diffAdded(yamlLines(current._prevFull), lines);
  }, [current, lines]);

  return (
    <div className={styles.container}>
      <div className={styles.tabs} role="tablist">
        {enriched.map((step, i) => (
          <button
            key={i}
            type="button"
            className={`${styles.tab} ${i === active ? styles.tabActive : ''}`}
            onClick={() => setActive(i)}
            aria-selected={i === active}
            role="tab"
          >
            {step.title || translate({ id: 'layeredSteps.step', message: 'Step {step}', values: { step: i + 1 } })}
          </button>
        ))}
      </div>

      {current && (
        <div className={styles.card}>
          <div className={styles.header}>
            <span className={styles.caption}>{current.caption}</span>
            <button
              type="button"
              className={styles.copyBtn}
              onClick={() => copy(current.full)}
              aria-label={translate({ id: 'layeredSteps.copyCode', message: 'Copy code' })}
            >
              {copied ? translate({ id: 'layeredSteps.copied', message: '✓ Copied' }) : translate({ id: 'layeredSteps.copy', message: 'Copy' })}
            </button>
          </div>
          <div className={styles.body}>
            <pre className={`language-yaml ${styles.pre}`}>
              <code>
                {lines.map((line, i) => {
                  const isNew = addedSet.has(lineIdentity(line));
                  return (
                    <div key={i} className={`${styles.row} ${isNew ? styles.added : ''}`}>
                      <span className={styles.gutter}>{isNew ? '+' : ' '}</span>
                      <span className={`${styles.code} language-yaml`}>
                        {line.length ? renderYamlLine(line) : ' '}
                      </span>
                    </div>
                  );
                })}
              </code>
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

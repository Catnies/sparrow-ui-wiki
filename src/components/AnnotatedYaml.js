// src/components/AnnotatedYaml.js
// A modern, copyable YAML code block. Each line carries an optional trailing
// `note` (rendered as a `#` comment on the same line, aligned) and/or a `to`
// link (rendered as a trailing ↗ that opens the detail page). Text stays
// selectable; a header "copy" button copies the raw YAML. Colors reuse the
// shared `.language-yaml .token.*` palette from src/css/custom.css.

import React, { useState, useRef, useMemo } from 'react';
import Link from '@docusaurus/Link';
import { translate } from '@docusaurus/Translate';
import styles from './AnnotatedYaml.module.css';
import { renderYamlLine } from './yamlTokens';

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

// Build the display string for one line: code + optional aligned `#` note.
// Notes are padded so the `#` columns line up across the block.
function buildLine(code, note, maxCodeWidth) {
  if (!note) return { display: code };
  const padding = Math.max(1, maxCodeWidth - code.length + 2);
  return { display: `${code}${' '.repeat(padding)}# ${note}` };
}

// Detect diff lines: a `+` or `-` at column 0 (no leading whitespace).
// A `-` WITH leading whitespace is a YAML list marker, not a diff removal.
// The raw line is kept AS-IS for display; the clean version replaces the
// diff marker with a space and is used for the Copy button.
const DIFF_RE = /^[+-]/;

function parseDiffLine(raw) {
  if (!DIFF_RE.test(raw)) return { code: raw, diff: null };
  const marker = raw[0];
  // Replace the diff marker with a space to preserve indentation for copy.
  const clean = ' ' + raw.slice(1);
  return {
    code: raw,           // display: full line including +/-
    clean,               // copy:   marker replaced with space
    diff: marker === '+' ? 'add' : 'remove',
  };
}

// When `children` (a raw YAML string) is provided, split it into lines.
function childrenToLines(children) {
  if (typeof children !== 'string') return [];
  return children
    .replace(/^\n|\n\s*$/g, '')
    .split('\n')
    .map((raw) => parseDiffLine(raw));
}

export default function AnnotatedYaml({ lines, children }) {
  // Memoize so the downstream useMemo hooks (maxCodeWidth, built, rawYaml)
  // actually hold — otherwise a new array every render invalidates them and
  // the whole block re-tokenizes on every render (e.g. on Copy click).
  const resolvedLines = useMemo(
    () => lines || childrenToLines(children),
    [lines, children]
  );
  const { copied, copy } = useCopy();

  // Longest code length (without note) → alignment column for `#`.
  const maxCodeWidth = useMemo(
    () => resolvedLines.reduce((m, l) => Math.max(m, l.code.length), 0),
    [resolvedLines]
  );

  const built = useMemo(
    () => resolvedLines.map((l) => ({ ...l, ...buildLine(l.code, l.note, maxCodeWidth) })),
    [resolvedLines, maxCodeWidth]
  );

  // Copy uses the clean version (diff markers replaced with spaces) so the
  // clipboard gets valid YAML. Falls back to the display version.
  const rawYaml = useMemo(
    () => built.map((l) => (l.clean || l.display)).join('\n'),
    [built]
  );

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.lang}>YAML</span>
        <button
          type="button"
          className={styles.copyBtn}
          onClick={() => copy(rawYaml)}
          aria-label={translate({ id: 'annotatedYaml.copyCode', message: 'Copy code' })}
        >
          {copied ? translate({ id: 'annotatedYaml.copied', message: '✓ Copied' }) : translate({ id: 'annotatedYaml.copy', message: 'Copy' })}
        </button>
      </div>
      <div className={styles.body}>
        <pre className={`language-yaml ${styles.pre}`}>
          <code>
            {built.map((line, i) => (
              <span
                key={i}
                className={`${styles.row} ${line.diff ? styles['diff-' + line.diff] : ''}`}
              >
                <span className={`${styles.code} language-yaml`}>
                  {line.display.length ? renderYamlLine(line.display) : ' '}
                </span>
                {line.to && (
                  <Link to={line.to} className={styles.link} title={translate({ id: 'annotatedYaml.openDetailPage', message: 'Open detail page' })} aria-label={translate({ id: 'annotatedYaml.openDetailPage', message: 'Open detail page' })}>
                    ↗
                  </Link>
                )}
              </span>
            ))}
          </code>
        </pre>
      </div>
    </div>
  );
}

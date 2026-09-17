// src/components/yamlTokens.js
// A deliberately minimal YAML line tokenizer. It exists only so the
// AnnotatedYaml / LayeredSteps components can reuse the vibrant YAML palette
// already defined in src/css/custom.css (scoped to `.language-yaml .token.*`).
//
// Structural fidelity > prism parity. Every line is wrapped in a `language-yaml`
// ancestor by the consuming components, so the spans here just need the right
// `token <type>` class names and the existing CSS does the coloring.
//
// Token types emitted: key, string, number, boolean, null, comment,
// punctuation, operator. Anything unrecognized falls through as plain text.

import React from 'react';

// Words prism's yaml grammar treats as boolean/null/directive constants.
const CONSTANTS = new Set([
  'true', 'false', 'True', 'False', 'TRUE', 'FALSE',
  'null', 'Null', 'NULL', '~',
  'yes', 'no', 'on', 'off', 'Yes', 'No', 'On', 'Off',
]);

// Split a single physical line into { code, comment }.
// A `#` starts a comment only when it's at the start of the (trimmed) line or
// preceded by whitespace — so a `#` inside an unquoted value like a hex color
// `#ff8c42` is preserved, and quoted strings are scanned over entirely.
export function splitComment(line) {
  let inSingle = false;
  let inDouble = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    const prev = i > 0 ? line[i - 1] : '';
    if (ch === "'" && !inDouble) inSingle = !inSingle;
    else if (ch === '"' && !inSingle) inDouble = !inDouble;
    else if (ch === '#' && !inSingle && !inDouble && (i === 0 || /\s/.test(prev))) {
      return { code: line.slice(0, i), comment: line.slice(i) };
    }
  }
  return { code: line, comment: null };
}

// Tokenize the "code" portion (no comment) into React spans.
// Strategy:
//   - leading whitespace + leading `- ` / `- ` markers preserved as plain text
//   - the key is the text up to the first `:` (followed by space or EOL)
//   - the rest is value, scanned for quoted strings, numbers, constants, and
//     `namespace:path` resource locations (kept as plain text — readable enough)
function tokenizeCode(code) {
  const nodes = [];
  // Capture leading indentation and an optional list/block marker `- `.
  const leadMatch = code.match(/^(\s*)(-\s+)?/);
  let idx = 0;
  if (leadMatch) {
    const lead = leadMatch[0];
    idx = lead.length;
    if (lead.length) nodes.push(<React.Fragment key="lead">{lead}</React.Fragment>);
  }

  const rest = code.slice(idx);
  // A `key:` only when there is a colon followed by whitespace or end, and the
  // part before it has no spaces (i.e. it really is a mapping key).
  const keyMatch = rest.match(/^([^\s:]+)(:)(\s|$)/);
  let valueStart = 0;
  if (keyMatch) {
    nodes.push(<span key="key" className="token key">{keyMatch[1]}</span>);
    nodes.push(<span key="colon" className="token punctuation">{keyMatch[2]}</span>);
    valueStart = keyMatch[1].length + 1; // key + colon
  }
  const value = rest.slice(valueStart);
  if (value.length) nodes.push(tokenizeValue(value, nodes.length));
  return nodes;
}

function tokenizeValue(value, keyOffset) {
  const nodes = [];
  // Walk the value, picking out quoted strings and bare words.
  const re = /(^|\s)("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')|(\s+)|([^\s]+)/g;
  let m;
  let localKey = 0;
  while ((m = re.exec(value)) !== null) {
    if (m[2] !== undefined) {
      // leading separator (m[1]) then quoted string
      if (m[1]) nodes.push(<span key={`s${localKey++}`} className="token punctuation">{m[1]}</span>);
      nodes.push(<span key={`s${localKey++}`} className="token string">{m[2]}</span>);
    } else if (m[3] !== undefined) {
      // pure whitespace run
      nodes.push(<span key={`s${localKey++}`} className="token">{m[3]}</span>);
    } else if (m[4] !== undefined) {
      const word = m[4];
      if (CONSTANTS.has(word)) {
        nodes.push(<span key={`s${localKey++}`} className="token boolean">{word}</span>);
      } else if (/^-?\d+(\.\d+)?$/.test(word)) {
        nodes.push(<span key={`s${localKey++}`} className="token number">{word}</span>);
      } else {
        // bare scalar (resource location, path, etc.) — leave as plain text
        nodes.push(<span key={`s${localKey++}`} className="token">{word}</span>);
      }
    }
  }
  return <React.Fragment key={`v${keyOffset}`}>{nodes}</React.Fragment>;
}

// Render one physical YAML line as React nodes (code tokens + optional comment).
export function renderYamlLine(line) {
  const { code, comment } = splitComment(line);
  const nodes = [];
  nodes.push(...tokenizeCode(code));
  if (comment) {
    nodes.push(<span key="comment" className="token comment">{comment}</span>);
  }
  return nodes;
}

// Split a multi-line YAML string into trimmed lines for diffing. Empty lines
// are kept so cumulative structure is preserved when re-rendered.
export function yamlLines(yamlString) {
  return yamlString.replace(/\n$/, '').split('\n');
}

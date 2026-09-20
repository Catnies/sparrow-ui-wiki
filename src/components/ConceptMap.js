import React, {useId, useState} from 'react';
import Link from '@docusaurus/Link';
import {translate} from '@docusaurus/Translate';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import {useLocation} from '@docusaurus/router';
import resolveDocLink from '../utils/resolveDocLink';
import styles from './ConceptMap.module.css';

// 节点树描述组件的连接关系；同一种类型可以在树中出现多次。
export default function ConceptMap({root, aside = [], relation, componentsLabel, supplement, initial}) {
  const [selectedId, setSelectedId] = useState(initial ?? root.id);
  const detailId = useId();
  const location = useLocation();
  const {siteConfig} = useDocusaurusContext();
  const findNode = (node) => node.id === selectedId
    ? node
    : node.children?.map(findNode).find(Boolean);
  const selected = findNode(root) ?? aside.find((node) => node.id === selectedId) ?? root;

  const renderButton = (node) => (
    <button
      type="button"
      className={styles.node}
      data-kind={node.kind}
      aria-pressed={selected.id === node.id}
      aria-controls={detailId}
      onClick={() => setSelectedId(node.id)}
    >
      <span className={styles.nodeType}>{node.label}</span>
      {node.title && <span className={styles.nodeTitle}>{node.title}</span>}
      {node.via && <span className={styles.via}>{node.via}</span>}
      {node.note && <span className={styles.nodeNote}>{node.note}</span>}
    </button>
  );

  const renderBranch = (node) => (
    <div key={node.id} className={`${styles.branch} ${node.children ? styles.pane : styles.leaf}`}>
      {renderButton(node)}
      {node.children && <div className={styles.contents}>{node.children.map(renderBranch)}</div>}
    </div>
  );

  return (
    <div className={styles.container}>
      <div className={styles.diagram}>
        {renderButton(root)}
        <div className={styles.relation}>{relation}</div>
        <fieldset className={styles.components}>
          <legend>{componentsLabel}</legend>
          <div className={styles.branches}>{root.children.map(renderBranch)}</div>
        </fieldset>
      </div>
      <div className={styles.detail} id={detailId} aria-live="polite" aria-atomic="true">
        <div className={styles.detailHeading}>
          <strong>{selected.label}{selected.title && ` · ${selected.title}`}</strong>
          {selected.to && (
            <Link to={resolveDocLink(location.pathname, selected.to, siteConfig.baseUrl)}>
              {translate({id: 'conceptMap.readMore', message: 'Read the chapter'})}{' →'}
            </Link>
          )}
        </div>
        <p>{selected.desc}</p>
      </div>
      {aside.length > 0 && (
        <div className={styles.supplement}>
          <p className={styles.supplementLabel}>{supplement}</p>
          <div className={styles.aside}>{aside.map((node) => <div key={node.id}>{renderButton(node)}</div>)}</div>
        </div>
      )}
    </div>
  );
}

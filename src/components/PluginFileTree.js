// src/components/PluginFileTree.js
import React, {
  useState,
  useRef,
  useEffect,
  useLayoutEffect,
  useCallback,
  useMemo,
} from 'react';
import {
  FaFolder,
  FaFolderOpen,
  FaFile,
  FaQuestionCircle,
} from 'react-icons/fa';
import ReactDOM from 'react-dom';
import styles from './PluginFileTree.module.css';
import useOverlayScrollbar from './useOverlayScrollbar';

/* ==============================
   节点渲染组件
   ============================== */
function Chevron({ open }) {
  return (
      <svg
          className={`${styles.chevron} ${open ? styles.chevronOpen : ''}`}
          viewBox="0 0 24 24"
          width="14"
          height="14"
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

// Memoized so a selection change only re-renders the two affected rows (the
// previously-selected and the newly-selected one), not the whole tree. This
// relies on every prop being referentially stable across a selection change:
//   • node / depth / isSelected — come from the memoized visibleNodes list;
//     only `isSelected` flips for the two rows involved.
//   • onSelect / onToggle / scrollContainerRef — stable (useCallback / ref).
// Previously the parent passed `node={{ ...node, toggle: () => ... }}`, a fresh
// object every render, which defeated memoization and re-rendered every row on
// each click.
const TreeNode = React.memo(function TreeNode({
  node,
  depth,
  isSelected,
  onToggle,
  onSelect,
  scrollContainerRef,
}) {
  const [showCard, setShowCard] = useState(false);
  const [cardStyle, setCardStyle] = useState({});
  const cardRef = useRef(null);
  const questionIconRef = useRef(null);
  const measureTimeout = useRef(null);

  const isFolder = !!node.children;
  const isOpen = node.isOpen;

  const MAX_INDENT = 200;
  const indent = Math.min(depth * 20, MAX_INDENT);

  const handleClick = useCallback(
      (e) => {
        if (questionIconRef.current && questionIconRef.current.contains(e.target)) {
          return;
        }
        if (isFolder) onToggle(node.id);
        onSelect(node.id);
      },
      [isFolder, node, onToggle, onSelect]
  );

  const handleQuestionClick = useCallback((e) => {
    e.stopPropagation();
    setShowCard((prev) => !prev);
  }, []);

  // 卡片位置计算
  const updateCardPosition = useCallback(() => {
    if (!questionIconRef.current || !cardRef.current) return;
    const iconRect = questionIconRef.current.getBoundingClientRect();
    const cardEl = cardRef.current;

    cardEl.style.visibility = 'hidden';
    cardEl.style.display = 'block';
    const cardRect = cardEl.getBoundingClientRect();
    cardEl.style.display = '';
    cardEl.style.visibility = '';

    const cardWidth = cardRect.width;
    const cardHeight = cardRect.height;
    const margin = 8;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let left = iconRect.right + margin;
    if (left + cardWidth > vw) {
      left = iconRect.left - cardWidth - margin;
      if (left < margin) left = vw - cardWidth - margin;
    }

    let top = iconRect.top;
    if (top + cardHeight > vh) top = vh - cardHeight - margin;
    if (top < margin) top = margin;

    setCardStyle({
      position: 'fixed',
      top,
      left,
      visibility: 'visible',
    });
  }, []);

  useLayoutEffect(() => {
    if (showCard) {
      measureTimeout.current = setTimeout(updateCardPosition, 0);
    } else {
      setCardStyle({});
    }
    return () => clearTimeout(measureTimeout.current);
  }, [showCard, updateCardPosition]);

  // 监听窗口 resize 重新定位
  useEffect(() => {
    if (showCard) {
      window.addEventListener('resize', updateCardPosition);
      return () => window.removeEventListener('resize', updateCardPosition);
    }
  }, [showCard, updateCardPosition]);

  // 点击外部关闭
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
          cardRef.current &&
          !cardRef.current.contains(e.target) &&
          questionIconRef.current &&
          !questionIconRef.current.contains(e.target)
      ) {
        setShowCard(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 滚动时自动关闭提示卡片
  useEffect(() => {
    if (!showCard) return;

    const handleScroll = () => setShowCard(false);

    window.addEventListener('scroll', handleScroll, true);
    const container = scrollContainerRef?.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
    }

    return () => {
      window.removeEventListener('scroll', handleScroll, true);
      if (container) {
        container.removeEventListener('scroll', handleScroll);
      }
    };
  }, [showCard, scrollContainerRef]);

  const Icon = isFolder ? (isOpen ? FaFolderOpen : FaFolder) : FaFile;

  return (
      <div>
        <div
            className={`${styles.row} ${isSelected ? styles.rowSelected : ''}`}
            style={{ '--indent': `${indent}px` }}
            onClick={handleClick}
        >
          {isFolder ? (
              <span className={styles.chevronWrap}>
                <Chevron open={isOpen} />
              </span>
          ) : (
              <span className={styles.chevronSpacer} />
          )}

          <span className={styles.iconWrap}>
            <Icon className={isFolder ? styles.folderIcon : styles.fileIcon} />
          </span>

          <span className={styles.name}>{node.name}</span>

          {node.hoverText && (
              <span
                  ref={questionIconRef}
                  className={styles.question}
                  onClick={handleQuestionClick}
              >
                <FaQuestionCircle style={{ fontSize: '0.8em' }} />
              </span>
          )}
        </div>

        {showCard &&
            ReactDOM.createPortal(
                <div ref={cardRef} className={styles.card} style={cardStyle}>
                  {node.hoverText}
                </div>,
                document.body
            )}
      </div>
  );
});

/* ==============================
   主文件树组件
   ============================== */

// Pure helper lifted out of the component so it isn't redefined per render and
// can feed a useMemo. Recursively spreads every visible node — O(visible),
// so memoizing on treeData avoids re-allocating the whole list on unrelated
// state changes (selection, mount).
function flatten(nodes, depth = 0) {
  let result = [];
  for (const node of nodes) {
    result.push({ ...node, depth });
    if (node.children && node.isOpen) {
      result = result.concat(flatten(node.children, depth + 1));
    }
  }
  return result;
}

export default function PluginFileTree({ initialTreeData, title }) {
  const [treeData, setTreeData] = useState(() => {
    const addState = (nodes) =>
        nodes.map((node) => ({
          ...node,
          isOpen: node.isOpen || false,
          children: node.children ? addState(node.children) : undefined,
        }));
    return addState(initialTreeData);
  });

  const [selectedId, setSelectedId] = useState(null);
  const [mounted, setMounted] = useState(false);
  const containerRef = useRef(null);
  const { scrollRef, thumbRef, visible } = useOverlayScrollbar();

  // createPortal targets document.body, which doesn't exist during SSG.
  // Defer the portal render to the client only.
  useEffect(() => {
    setMounted(true);
  }, []);

  const toggleNode = useCallback((targetId) => {
    const update = (nodes) =>
        nodes.map((node) => {
          if (node.id === targetId) return { ...node, isOpen: !node.isOpen };
          if (node.children) return { ...node, children: update(node.children) };
          return node;
        });
    setTreeData((prev) => update(prev));
  }, []);

  const visibleNodes = useMemo(() => flatten(treeData), [treeData]);

  const TOOLBAR_HEIGHT = 38;
  const ROW_HEIGHT = 32;
  const PADDING_VERTICAL = 20; /* 10px top + 10px bottom */
  const MIN_HEIGHT = TOOLBAR_HEIGHT + 32;
  const MAX_HEIGHT = 500;
  const totalHeight = Math.min(
      MAX_HEIGHT,
      Math.max(
          MIN_HEIGHT,
          visibleNodes.length * ROW_HEIGHT + PADDING_VERTICAL + TOOLBAR_HEIGHT
      )
  );

  // 工具条标题：优先用 prop，否则取首个根节点名
  const toolbarTitle =
      title || (initialTreeData[0] && initialTreeData[0].name) || '';

  return (
      <div className={styles.tree} style={{ height: `${totalHeight}px` }}>
        <div className={styles.toolbar}>
          <div className={styles.trafficLights}>
            <span className={`${styles.light} ${styles.lightRed}`} />
            <span className={`${styles.light} ${styles.lightYellow}`} />
            <span className={`${styles.light} ${styles.lightGreen}`} />
          </div>
          <span className={styles.toolbarTitle}>{toolbarTitle}</span>
        </div>

        <div
            ref={(node) => {
              scrollRef.current = node;
              containerRef.current = node;
            }}
            className={styles.body}
        >
          {visibleNodes.map((node) => (
              <TreeNode
                  key={node.id}
                  node={node}
                  depth={node.depth}
                  isSelected={node.id === selectedId}
                  onToggle={toggleNode}
                  onSelect={setSelectedId}
                  scrollContainerRef={containerRef}
              />
          ))}
        </div>

        {mounted &&
            ReactDOM.createPortal(
                <div
                    ref={thumbRef}
                    className={`${styles.overlayThumb} ${visible ? styles.overlayThumbVisible : ''}`}
                    aria-hidden="true"
                />,
                document.body
            )}
      </div>
  );
}

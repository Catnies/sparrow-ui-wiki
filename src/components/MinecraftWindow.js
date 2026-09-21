// src/components/MinecraftWindow.js
// 用原版 GUI 贴图 + 原版物品图标模拟一扇打开的容器，鼠标悬停出原版样式的 tooltip，
// 仅展示菜单外观，不模拟游戏内点击行为。
//
// 和 <MinecraftSlotGrid> 分工明确：
//   MinecraftSlotGrid  讲**布局**——每格显示标志符字符，看的是"哪个字符占哪一格"
//   MinecraftWindow    讲**成品**——每格显示真实物品，看的是"玩家最终看到什么"
//
//   <MinecraftWindow
//     type="chest" rows={3} title="欢迎菜单"
//     layout={["#########", "###G#C###", "#########"]}
//     items={{
//       '#': {icon: 'gray_stained_glass_pane'},
//       G: {icon: 'lime_dye', name: '打个招呼', nameColor: '#ffff55',
//           lore: ['点一下向自己问好']},
//       C: {icon: 'barrier', name: '关闭', nameColor: '#ff5555'},
//     }}
//   />
//
// 物品数量用 count：写一个数字时这个标志符的每一格都显示它；写成数组时，
// 标志符第 n 次出现的格子（按槽位顺序）取第 n 个值。数量为 1 时不显示，与原版一致。
//
//   items={{D: {icon: 'paper', count: [1, 2, 3, 4, 5]}}}
//
// 窗口类型与槽位坐标在 mcWindows.js，加新类型不用动这个文件。
// 贴图来自原版客户端，存在 static/img/mc/，本站为非盈利的说明性使用。

import React, {useEffect, useId, useLayoutEffect, useRef, useState} from 'react';
import {createPortal} from 'react-dom';
import {translate} from '@docusaurus/Translate';
import useBaseUrl from '@docusaurus/useBaseUrl';
import {ATLAS, ICON, resolveWindow} from './mcWindows';
import {parseRow} from '../utils/parseStructure';
import styles from './MinecraftWindow.module.css';
import McSprite from './McSprite';

export default function MinecraftWindow({
  type = 'chest',
  rows,
  title,
  layout = [],
  items = {},
  // 倍数 2 时槽位步长正好是 36px，和 <MinecraftSlotGrid> 默认倍数下完全一致，
  // 同一个菜单的"布局图"和"成品图"叠在一起看宽度是对齐的。
  scale = 2,
  // 是否连玩家物品栏一起画。默认不画：讲 Pane 的时候那一大片空槽是干扰项，
  // 只有正文真的要讲下半区时才打开。关掉时底边仍然是封口的。
  playerInventory = false,
  // 留空标志符：这些格子不放任何物品
  empty = [],
  // 给这个标志符占的全部格子描白边，供图例联动使用
  highlight = null,
  // 鼠标指向的格子换了标志符时回调，离开时传 null
  onHoverIdentifier,
  children,
}) {
  const [hover, setHover] = useState(null); // {index, clientX, clientY}
  const tooltipId = useId();

  const guiBase = useBaseUrl('/img/mc/gui/');
  const itemBase = useBaseUrl('/img/mc/item/');
  const hovering = hover !== null;
  useEffect(() => {
    if (!hovering) return;
    const dismiss = () => setHover(null);
    const onKeyDown = (event) => {
      if (event.key === 'Escape') dismiss();
    };
    window.addEventListener('scroll', dismiss, true);
    window.addEventListener('resize', dismiss);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('scroll', dismiss, true);
      window.removeEventListener('resize', dismiss);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [hovering]);

  const layoutRows = Array.isArray(layout) ? layout : [];
  const rowCount = rows ?? (layoutRows.length || 3);
  const spec = resolveWindow(type, rowCount, playerInventory);

  // 把布局摊平成一维，和槽位坐标表按下标对齐
  const cells = [];
  for (const row of layoutRows) {
    try {
      cells.push(...parseRow(row));
    } catch {
      return <div className={styles.error}>MinecraftWindow: 布局模板解析失败</div>;
    }
  }

  const emptySet = new Set(Array.isArray(empty) ? empty : [empty]);

  // 每一格是该标志符的第几次出现（按槽位顺序），count 写成数组时按它取值
  const seen = new Map();
  const occurrenceOf = cells.map((identifier) => {
    const occurrence = seen.get(identifier) ?? 0;
    seen.set(identifier, occurrence + 1);
    return occurrence;
  });

  const hoveredItem = hover === null || emptySet.has(cells[hover.index]) ? null : items[cells[hover.index]];

  return (
    <div className={styles.wrapper}>
      <div className={styles.stage} style={{'--mcw-scale': scale}}>
        <div
          className={styles.frame}
          style={{
            width: `calc(${spec.width}px * var(--mcw-scale))`,
            height: `calc(${spec.height}px * var(--mcw-scale))`,
          }}
          onMouseLeave={() => {
            setHover(null);
            onHoverIdentifier?.(null);
          }}
        >
          {/* 窗口本体按原版 blit 的口径分段贴：箱子的下半段固定取自图集 y=126，
              少了它窗口就没有底边。每段自己定位，背景位置按段的源 y 偏移。 */}
          {spec.parts.map((part, partIndex) => {
            const offset = spec.parts.slice(0, partIndex).reduce((sum, p) => sum + p.height, 0);
            return (
              <div
                // eslint-disable-next-line react/no-array-index-key
                key={partIndex}
                className={styles.part}
                style={{
                  top: `calc(${offset}px * var(--mcw-scale))`,
                  height: `calc(${part.height}px * var(--mcw-scale))`,
                  width: `calc(${spec.width}px * var(--mcw-scale))`,
                  backgroundImage: `url(${guiBase}${spec.texture})`,
                  backgroundSize: `calc(${spec.atlasWidth}px * var(--mcw-scale)) calc(${ATLAS}px * var(--mcw-scale))`,
                  backgroundPosition: `0 calc(${-part.srcY}px * var(--mcw-scale))`,
                }}
              />
            );
          })}

          {title && (
            <span
              className={styles.title}
              style={{
                left: `calc(${spec.titleAt[0]}px * var(--mcw-scale))`,
                top: `calc(${spec.titleAt[1]}px * var(--mcw-scale))`,
              }}
            >
              {title}
            </span>
          )}

          {spec.slots.map(([x, y], index) => {
            const identifier = cells[index];
            const item = identifier == null || emptySet.has(identifier) ? null : items[identifier];
            const isEmpty = !item;
            // 与原版一致：数量为 1 时不显示
            const count = Array.isArray(item?.count) ? item.count[occurrenceOf[index]] : item?.count;
            return (
              <div
                key={`${x}-${y}`}
                className={`${styles.slot} ${highlight != null && identifier === highlight ? styles.slotMarked : ''}`}
                style={{
                  left: `calc(${x}px * var(--mcw-scale))`,
                  top: `calc(${y}px * var(--mcw-scale))`,
                  width: `calc(${ICON}px * var(--mcw-scale))`,
                  height: `calc(${ICON}px * var(--mcw-scale))`,
                }}
                onPointerMove={(event) => {
                  setHover({index, clientX: event.clientX, clientY: event.clientY});
                  onHoverIdentifier?.(identifier ?? null);
                }}
                // 鼠标点击不接管键盘焦点，避免 onFocus 把提示改锚到槽位边缘。
                onPointerDown={(event) => event.preventDefault()}
                onPointerLeave={() => {
                  setHover(null);
                  onHoverIdentifier?.(null);
                }}
                tabIndex={item?.name ? 0 : undefined}
                aria-label={item?.name}
                aria-describedby={hover?.index === index && item?.name ? tooltipId : undefined}
                onFocus={(event) => {
                  const rect = event.currentTarget.getBoundingClientRect();
                  setHover({index, clientX: rect.right, clientY: rect.top});
                }}
                onBlur={() => setHover(null)}
              >
                {!isEmpty && (
                  <img
                    // no-zoom 让 docusaurus-plugin-image-zoom 放过它：
                    // 物品图标属于容器展示，不弹出图片预览
                    className={`${styles.icon} no-zoom`}
                    src={`${itemBase}${item.icon}.png`}
                    alt={item.name ?? identifier}
                    draggable={false}
                  />
                )}
                {!isEmpty && count > 1 && <span className={styles.count}>{count}</span>}
                {/* 悬停盖白，和游戏一致 */}
                {hover?.index === index && <span className={styles.highlight} />}
              </div>
            );
          })}

          {children ?? <>
            {type === 'anvil' && <McSprite name="anvil/text_field" x={59} y={20} width={110} height={16} />}
            {type === 'crafter' && <McSprite name="crafter/unpowered_redstone" x={97} y={35} width={16} height={16} />}
            {type === 'cartography' && <McSprite name="cartography_table/map" x={67} y={13} width={66} height={66} />}
          </>}
          {playerInventory && (
            <span
              className={styles.title}
              style={{left: `calc(${spec.inventoryX}px * var(--mcw-scale))`, top: `calc(${spec.height - 94}px * var(--mcw-scale))`}}
            >
              {translate({id: 'minecraftWindow.inventory', message: 'Inventory'})}
            </span>
          )}
        </div>
      </div>
      {hoveredItem?.name && createPortal(
        <MinecraftTooltip id={tooltipId} item={hoveredItem} hover={hover} scale={scale} />,
        document.body,
      )}
    </div>
  );
}

function MinecraftTooltip({id, item, hover, scale}) {
  const ref = useRef(null);

  // 按浏览器视口避让，让长说明可以超出容器，同时不被滚动区域裁掉。
  useLayoutEffect(() => {
    const tooltip = ref.current;
    const {width, height} = tooltip.getBoundingClientRect();
    const gap = 12 * scale;
    let left = hover.clientX + gap;
    if (left + width > window.innerWidth - 8) left = hover.clientX - width - gap;
    const top = Math.max(8, Math.min(hover.clientY - 12 * scale, window.innerHeight - height - 8));
    tooltip.style.left = `${Math.round(Math.max(8, left))}px`;
    tooltip.style.top = `${Math.round(top)}px`;
  }, [hover, scale, item]);

  return (
    <div ref={ref} id={id} role="tooltip" className={styles.tooltip} style={{'--mcw-scale': scale}}>
      <span className={styles.tooltipName} style={{color: item.nameColor ?? '#ffffff'}}>{item.name}</span>
      {(item.lore ?? []).map((line, index) => (
        <span key={index} className={styles.tooltipLore}>{line || '\u00a0'}</span>
      ))}
    </div>
  );
}

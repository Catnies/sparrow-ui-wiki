// src/components/VisualLayerDemo.js
// 视觉层叠加演示：开关几层视觉映射，看每名玩家的窗口最终显示什么。
//
// 每一层按 slots 盖住若干格；layers 越靠后优先级越高，与库里「窗口层 > Pane 层 > 容器层」的顺序对应。
// 带 viewer 的层只作用于那一名玩家（窗口层、光标层），不带的对所有玩家生效（容器层、Pane 层）。
// 最上面固定画一扇「真实内容」，任何开关都不影响它，用来说明视觉层不改动容器；
// 下面每名玩家一行，所有窗口左对齐，同一格上下对齐，方便逐格比较。
//
//   <VisualLayerDemo
//     title="仓库"
//     real={[{icon: 'diamond', name: '钻石', count: 3}, null, ...]}
//     viewers={[{name: '玩家 A', cursor: {icon: 'emerald', name: '绿宝石', count: 8}}, {name: '玩家 B'}]}
//     realLabel="容器中的真实内容"
//     layers={[
//       {label: '容器层', note: '所有查看者', slots: [0, 1, 2], item: {icon: 'light_blue_stained_glass_pane', name: '容器层'}},
//       {label: '窗口层', note: '只有玩家 A', viewer: 0, slots: [2, 3], item: {...}},
//       {label: '光标层', note: '只有玩家 A 的光标', viewer: 0, cursor: true, item: {...}},
//     ]}
//   />

import React, {useEffect, useState} from 'react';
import {translate} from '@docusaurus/Translate';
import useBaseUrl from '@docusaurus/useBaseUrl';
import McButton from './McButton';
import MinecraftWindow from './MinecraftWindow';
import styles from './VisualLayerDemo.module.css';

// 每一格用一个独立的标志符，才能逐格给物品、逐格描白边
const IDENTIFIERS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

export default function VisualLayerDemo({
  title,
  // 容器的真实内容，长度按 9 格一行排，null 表示空格
  real = [],
  // [{name, cursor}]，cursor 是这名玩家的真实光标，写法同 <MinecraftWindow> 的物品
  viewers = [],
  // [{label, note, item, slots, viewer, cursor}]，越靠后优先级越高
  layers = [],
  realLabel,
  windowType = 'chest',
}) {
  const [enabled, setEnabled] = useState(() => layers.map(() => true));
  const [hoverSlot, setHoverSlot] = useState(null);
  const itemBase = useBaseUrl('/img/mc/item/');

  // 预取所有可能出现的贴图，开关切换时直接换图
  useEffect(() => {
    const icons = new Set();
    real.forEach((item) => item?.icon && icons.add(item.icon));
    layers.forEach((layer) => layer.item?.icon && icons.add(layer.item.icon));
    viewers.forEach((viewer) => viewer.cursor?.icon && icons.add(viewer.cursor.icon));
    icons.forEach((icon) => {
      new Image().src = `${itemBase}${icon}.png`;
    });
  }, [real, layers, viewers, itemBase]);

  const rowCount = Math.max(1, Math.ceil(real.length / 9));
  const layout = Array.from({length: rowCount}, (_, row) => IDENTIFIERS.slice(row * 9, row * 9 + 9));

  const appliesTo = (layer, viewerIndex) => layer.viewer == null || layer.viewer === viewerIndex;

  // 从优先级最高的层往下找，第一个盖住这一格的层就是显示结果；都放行时显示真实内容
  const resolveSlot = (slot, viewerIndex) => {
    for (let index = layers.length - 1; index >= 0; index--) {
      const layer = layers[index];
      if (enabled[index] && !layer.cursor && appliesTo(layer, viewerIndex) && layer.slots?.includes(slot)) {
        return {item: layer.item, source: layer.label};
      }
    }
    return {item: real[slot] ?? null, source: null};
  };

  const resolveCursor = (viewerIndex) => {
    const actual = viewers[viewerIndex]?.cursor ?? null;
    for (let index = layers.length - 1; index >= 0; index--) {
      const layer = layers[index];
      if (enabled[index] && layer.cursor && appliesTo(layer, viewerIndex) && actual) {
        return {item: layer.item, source: layer.label};
      }
    }
    return {item: actual, source: null};
  };

  const itemsOf = (resolve) => {
    const items = {};
    real.forEach((_, slot) => {
      const {item} = resolve(slot);
      if (item) items[IDENTIFIERS[slot]] = item;
    });
    return items;
  };

  const toggle = (index) => setEnabled((current) => current.map((value, i) => (i === index ? !value : value)));
  const onHoverIdentifier = (identifier) => {
    const slot = identifier == null ? -1 : IDENTIFIERS.indexOf(identifier);
    setHoverSlot(slot >= 0 && slot < real.length ? slot : null);
  };
  const highlight = hoverSlot == null ? null : IDENTIFIERS[hoverSlot];

  const describeItem = (item) => {
    if (!item) {
      return translate({id: 'visualLayerDemo.empty', message: 'empty', description: 'VisualLayerDemo: an empty slot or cursor'});
    }
    return item.count > 1 ? `${item.name} ×${item.count}` : item.name;
  };

  return (
    <div className={styles.wrapper}>
      <div
        className={styles.layers}
        role="group"
        aria-label={translate({
          id: 'visualLayerDemo.layers.aria',
          message: 'Visual layers',
          description: 'VisualLayerDemo: aria label of the layer switches',
        })}
      >
        {layers.map((layer, index) => (
          // eslint-disable-next-line react/no-array-index-key
          <McButton key={index} selected={enabled[index]} onClick={() => toggle(index)}>
            {layer.label}
          </McButton>
        ))}
      </div>

      <ul className={styles.legend}>
        {layers.map((layer, index) => (
          // eslint-disable-next-line react/no-array-index-key
          <li key={index} className={enabled[index] ? '' : styles.off}>
            <img className={`${styles.legendIcon} no-zoom`} src={`${itemBase}${layer.item.icon}.png`} alt="" draggable={false} />
            <span className={styles.legendLabel}>{layer.label}</span>
            {layer.note && <span className={styles.legendNote}>{layer.note}</span>}
          </li>
        ))}
      </ul>

      {/* 每扇窗口占一行、左侧是说明，同一格在几行里上下对齐，逐格比较时不用来回找。
          最上面是真实内容，下面依次是每名玩家看到的结果。 */}
      <div className={styles.rows}>
        <div className={styles.rowLabel}>
          {realLabel ?? translate({id: 'visualLayerDemo.realCaption', message: 'Actual contents', description: 'VisualLayerDemo: label of the actual contents window'})}
        </div>
        <div className={styles.rowWindow}>
          <MinecraftWindow
            type={windowType}
            rows={rowCount}
            title={title}
            layout={layout}
            items={itemsOf((slot) => ({item: real[slot] ?? null}))}
            highlight={highlight}
            onHoverIdentifier={onHoverIdentifier}
          />
        </div>
        <div className={styles.rowCursor} />

        <div className={styles.divider} aria-hidden="true" />

        {viewers.map((viewer, viewerIndex) => {
          const cursor = resolveCursor(viewerIndex);
          return (
            <React.Fragment key={viewer.name}>
              <div className={styles.rowLabel}>
                {translate(
                  {id: 'visualLayerDemo.viewerCaption', message: 'What {viewer} sees', description: 'VisualLayerDemo: label of each player window'},
                  {viewer: viewer.name},
                )}
              </div>
              <div className={styles.rowWindow}>
                <MinecraftWindow
                  type={windowType}
                  rows={rowCount}
                  title={title}
                  layout={layout}
                  items={itemsOf((slot) => resolveSlot(slot, viewerIndex))}
                  highlight={highlight}
                  onHoverIdentifier={onHoverIdentifier}
                />
              </div>
              <div className={styles.rowCursor}>
                <span className={styles.cursorLabel}>
                  {translate({id: 'visualLayerDemo.cursor', message: 'Cursor', description: 'VisualLayerDemo: label of the cursor slot'})}
                </span>
                <span className={styles.cursorSlot}>
                  {cursor.item && (
                    <img className={`${styles.cursorIcon} no-zoom`} src={`${itemBase}${cursor.item.icon}.png`} alt={cursor.item.name ?? ''} draggable={false} />
                  )}
                  {cursor.item?.count > 1 && <span className={styles.cursorCount}>{cursor.item.count}</span>}
                </span>
                <span className={styles.cursorName}>{describeItem(cursor.item)}</span>
              </div>
            </React.Fragment>
          );
        })}
      </div>

      <p className={styles.status} aria-live="polite">
        {hoverSlot == null ? (
          translate({
            id: 'visualLayerDemo.hint',
            message: 'Hover over a slot to see which layer decides what each player sees.',
            description: 'VisualLayerDemo: hint shown when no slot is hovered',
          })
        ) : (
          <>
            <span className={styles.statusSlot}>
              {translate({id: 'visualLayerDemo.slot', message: 'Slot {slot}', description: 'VisualLayerDemo: the hovered slot index'}, {slot: hoverSlot})}
            </span>
            {viewers.map((viewer, viewerIndex) => {
              const {item, source} = resolveSlot(hoverSlot, viewerIndex);
              const shown = source ?? translate({id: 'visualLayerDemo.actualItem', message: 'actual item', description: 'VisualLayerDemo: no layer covers the slot, the actual item shows'});
              return (
                <span key={viewer.name} className={styles.statusPart}>
                  {translate(
                    {id: 'visualLayerDemo.viewerSource', message: '{viewer}: {source}', description: 'VisualLayerDemo: which layer decides what a player sees'},
                    {viewer: viewer.name, source: item ? shown : describeItem(null)},
                  )}
                </span>
              );
            })}
            <span className={styles.statusPart}>
              {translate(
                {id: 'visualLayerDemo.actualContent', message: 'actual: {item}', description: 'VisualLayerDemo: the actual item in the hovered slot'},
                {item: describeItem(real[hoverSlot])},
              )}
            </span>
          </>
        )}
      </p>
    </div>
  );
}

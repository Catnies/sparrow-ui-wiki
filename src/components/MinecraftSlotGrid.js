// src/components/MinecraftSlotGrid.js
// 把 Pane 的结构模板画成一个真的 Minecraft 容器。
//
// 几何与配色逐条对齐 minecraft.wiki 的 mcui / invslot 体系（面板 #c6c6c6 +
// Inventory_background.png 做 border-image，槽位 32×32 #8b8b8b + 2px 斜边），
// 所以看起来就是游戏里那个容器，而不是"一张画成灰色的表格"。
//
// 默认以字符和色块标注布局；icons 可为指定标志符提供物品贴图。
//
//   <MinecraftSlotGrid
//     title="欢迎菜单"
//     rows={["#########", "###G#C###", "#########"]}
//     legend={{'#': '装饰背景', G: '打招呼', C: '关闭菜单'}}
//     scale={2}
//     showSlots
//   />

import React, {useMemo, useState} from 'react';
import {translate} from '@docusaurus/Translate';
import useBaseUrl from '@docusaurus/useBaseUrl';
import {analyzeStructure} from '../utils/parseStructure';
import styles from './MinecraftSlotGrid.module.css';

export default function MinecraftSlotGrid({
  rows = [],
  legend = {},
  // # 默认不着色；指定 icons 后显示物品贴图。传 empty={[]} 可让它参与配色。
  empty = ['#'],
  icons = {},
  showSlots = false,
  caption,
  // 面板顶部的 GUI 标题，不传则不渲染
  title,
  // 整体放大倍数。1 与游戏 GUI 等比（槽位 32px），2 适合正文里需要看清标志符的场合。
  scale = 1,
}) {
  const meta = useMemo(() => analyzeStructure(rows, empty, 'MinecraftSlotGrid'), [rows, empty]);
  // active：要联动点亮的标志符；hoverSlot：单独盖白的那一格（游戏行为）
  const [active, setActive] = useState(null);
  const [hoverSlot, setHoverSlot] = useState(null);
  const itemBase = useBaseUrl('/img/mc/item/');

  const ariaLabel = translate({
    id: 'minecraftSlotGrid.aria',
    message: 'Container-style pane structure preview',
    description: 'MinecraftSlotGrid: aria label of the grid',
  });

  if (meta.error) {
    return <div className={styles.error}>{meta.error}</div>;
  }

  return (
    <div
      className={styles.wrapper}
      style={{'--mc-scale': scale}}
      role="group"
      aria-label={caption ?? title ?? ariaLabel}
    >
      <div className={styles.viewport}>
        <div className={styles.panel}>
          {title && <div className={styles.header}>{title}</div>}

          <div className={styles.grid}>
            {meta.grid.map((row, rowIndex) => (
              // eslint-disable-next-line react/no-array-index-key
              <div className={styles.row} key={rowIndex}>
                {row.map((identifier, columnIndex) => {
                  const slot = rowIndex * meta.width + columnIndex;
                  const hue = meta.hueOf.get(identifier);
                  const isEmpty = hue === null;
                  return (
                    <div
                      key={slot}
                      className={`${styles.slot} ${hoverSlot === slot ? styles.slotLit : ''} ${active === identifier ? styles.slotActive : ''}`}
                      onMouseEnter={() => {
                        setActive(identifier);
                        setHoverSlot(slot);
                      }}
                      onMouseLeave={() => {
                        setActive(null);
                        setHoverSlot(null);
                      }}
                      title={legend[identifier] ? `${identifier} — ${legend[identifier]}` : identifier}
                    >
                      {/* 已指定贴图的标志符展示物品，其余格子保留布局代号。 */}
                      {icons[identifier] ? (
                        <img className={`${styles.icon} no-zoom`} src={`${itemBase}${icons[identifier]}.png`} alt={legend[identifier] ?? identifier} draggable={false} />
                      ) : isEmpty ? (
                        <span
                          className={`${styles.emptyLabel} ${
                            Array.from(identifier).length > 2 ? styles.itemLabelLong : ''
                          }`}
                        >
                          {identifier}
                        </span>
                      ) : (
                        <div
                          className={`${styles.item} ${active === identifier ? styles.itemActive : ''}`}
                          style={{'--slot-hue': hue}}
                        >
                          <span
                            className={`${styles.itemLabel} ${
                              // 按 code point 数，避免多字节字符被当成多个字符误判
                              Array.from(identifier).length > 2 ? styles.itemLabelLong : ''
                            }`}
                          >
                            {identifier}
                          </span>
                        </div>
                      )}
                      {showSlots && <span className={styles.stackSize}>{slot}</span>}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {meta.order.length > 0 && (
        <ul className={styles.legend}>
          {meta.order.map((identifier) => {
            const hue = meta.hueOf.get(identifier);
            return (
              <li
                key={identifier}
                className={`${styles.legendItem} ${active === identifier ? styles.legendItemActive : ''}`}
                onMouseEnter={() => setActive(identifier)}
                onMouseLeave={() => setActive(null)}
                tabIndex={0}
                onFocus={() => setActive(identifier)}
                onBlur={() => setActive(null)}
              >
                {icons[identifier] ? (
                  <img className={`${styles.legendIcon} no-zoom`} src={`${itemBase}${icons[identifier]}.png`} alt="" draggable={false} />
                ) : <span
                  className={`${styles.swatch} ${hue === null ? styles.swatchEmpty : ''}`}
                  style={hue === null ? undefined : {'--slot-hue': hue}}
                />}
                <code className={styles.legendIdentifier}>{identifier}</code>
                <span className={styles.legendText}>{legend[identifier] ?? ''}</span>
                <span className={styles.legendCount}>{meta.countOf.get(identifier)}</span>
              </li>
            );
          })}
        </ul>
      )}

      {caption && <p className={styles.caption}>{caption}</p>}
    </div>
  );
}

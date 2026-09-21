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
//
// 传入 items 后右侧出现「字符模板 / 玩家视角」切换，玩家视角用 <MinecraftWindow> 画成品，
// items 的写法与 MinecraftWindow 相同。讲同一个菜单时用这一个组件，不必把布局图和成品图各放一张：
//
//   <MinecraftSlotGrid
//     title="欢迎菜单"
//     rows={["#########", "###G#C###", "#########"]}
//     legend={{'#': '装饰背景', G: '打招呼', C: '关闭菜单'}}
//     items={{G: {icon: 'lime_dye', name: '打个招呼', nameColor: '#ffff55'}}}
//   />

import React, {useMemo, useState} from 'react';
import {translate} from '@docusaurus/Translate';
import useBaseUrl from '@docusaurus/useBaseUrl';
import McButton from './McButton';
import MinecraftWindow from './MinecraftWindow';
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
  // 玩家视角里每个标志符显示的物品，写法同 <MinecraftWindow> 的 items。不传就没有切换按钮。
  items,
  // 玩家视角使用的窗口类型，见 mcWindows.js
  windowType = 'chest',
  // 完整窗口的最后四行显示在玩家物品栏区域。
  playerInventory = false,
  // 初始视图：'layout' 字符模板，'game' 玩家视角
  defaultView = 'layout',
}) {
  const meta = useMemo(() => analyzeStructure(rows, empty, 'MinecraftSlotGrid'), [rows, empty]);
  // active：要联动点亮的标志符；hoverSlot：单独盖白的那一格（游戏行为）
  const [active, setActive] = useState(null);
  const [hoverSlot, setHoverSlot] = useState(null);
  const switchable = items != null;
  const [view, setView] = useState(switchable ? defaultView : 'layout');
  const itemBase = useBaseUrl('/img/mc/item/');

  const ariaLabel = translate({
    id: 'minecraftSlotGrid.aria',
    message: 'Container-style pane structure preview',
    description: 'MinecraftSlotGrid: aria label of the grid',
  });

  if (meta.error) {
    return <div className={styles.error}>{meta.error}</div>;
  }

  const gameView = view === 'game';
  const containerRows = meta.grid.length - (playerInventory ? 4 : 0);
  const switchView = (next) => {
    setActive(null);
    setHoverSlot(null);
    setView(next);
  };

  return (
    <div
      className={styles.wrapper}
      style={{'--mc-scale': scale}}
      role="group"
      aria-label={caption ?? title ?? ariaLabel}
    >
      {/* key 随视图变化，切换时重新挂载以播放淡入 */}
      <div className={`${styles.viewport} ${switchable ? styles.viewportSwitchable : ''}`} key={view}>
        {gameView ? (
          // MinecraftWindow 的倍数 2 对应这里的倍数 1，两者槽位步长一致，切换时外框不跳。
          <div className={styles.gameView}>
            <MinecraftWindow
              type={windowType}
              rows={containerRows}
              playerInventory={playerInventory}
              title={title}
              layout={rows}
              items={items}
              scale={scale * 2}
              highlight={active}
              onHoverIdentifier={setActive}
            />
          </div>
        ) : (
          <div className={styles.panel}>
            {/* 可切换时始终保留标题栏，高度与成品窗口的标题区对齐 */}
            {(title || switchable) && <div className={styles.header}>{title || ' '}</div>}

            <div className={styles.grid}>
              {meta.grid.map((row, rowIndex) => (
                // eslint-disable-next-line react/no-array-index-key
                <React.Fragment key={rowIndex}>
                  {playerInventory && rowIndex === containerRows && (
                    <div className={`${styles.header} ${styles.inventoryHeader}`}>
                      {translate({id: 'minecraftWindow.inventory', message: 'Inventory'})}
                    </div>
                  )}
                  <div className={`${styles.row} ${playerInventory && rowIndex === containerRows + 3 ? styles.hotbarRow : ''}`}>
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
                </React.Fragment>
              ))}
            </div>
          </div>
        )}
      </div>

      {meta.order.length > 0 && (
        <ul className={styles.legend}>
          {meta.order.map((identifier) => {
            const hue = meta.hueOf.get(identifier);
            // 玩家视角下图例改用成品物品的贴图，布局视角沿用 icons 或色块
            const legendIcon = gameView ? items[identifier]?.icon : icons[identifier];
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
                {legendIcon ? (
                  <img className={`${styles.legendIcon} no-zoom`} src={`${itemBase}${legendIcon}.png`} alt="" draggable={false} />
                ) : <span
                  className={`${styles.swatch} ${hue === null || gameView ? styles.swatchEmpty : ''}`}
                  style={hue === null || gameView ? undefined : {'--slot-hue': hue}}
                />}
                <code className={styles.legendIdentifier}>{identifier}</code>
                <span className={styles.legendText}>{legend[identifier] ?? ''}</span>
                <span className={styles.legendCount}>{meta.countOf.get(identifier)}</span>
              </li>
            );
          })}
        </ul>
      )}

      {switchable && (
        <div
          className={styles.views}
          role="group"
          aria-label={translate({
            id: 'minecraftSlotGrid.view.aria',
            message: 'Preview mode',
            description: 'MinecraftSlotGrid: aria label of the view switch',
          })}
        >
          <McButton selected={!gameView} onClick={() => switchView('layout')}>
            {translate({
              id: 'minecraftSlotGrid.view.layout',
              message: 'Template',
              description: 'MinecraftSlotGrid: button that shows the identifier layout',
            })}
          </McButton>
          <McButton selected={gameView} onClick={() => switchView('game')}>
            {translate({
              id: 'minecraftSlotGrid.view.game',
              message: 'In game',
              description: 'MinecraftSlotGrid: button that shows what the player sees',
            })}
          </McButton>
        </div>
      )}

      {caption && <p className={styles.caption}>{caption}</p>}
    </div>
  );
}

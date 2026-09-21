// src/components/mcWindows.js
// 各类原版容器 GUI 的贴图、切片与槽位坐标表。
//
// 贴图是原版客户端的 assets/minecraft/textures/gui/container/*.png，256×256 的图集，
// 容器本体画在左上角。下面所有数字都是贴图里的**原始像素坐标**，渲染时统一乘以缩放倍数。
//
// parts 是按原版 blit 的口径切的：一扇窗口可能要从图集的不同位置取两段拼起来。
// 箱子就是典型——上半段是容器本身，下半段（玩家物品栏 + 底边）固定在 src y=126 起的 96px，
// 行数变化时只有上半段的高度在变。**少了下半段就没有底边**，窗口会像被削掉一截。
//
// 槽位坐标给的是槽位左上角（16×16 的物品区），不含槽位自己那圈边框，和原版 blit 口径一致。
// 加新窗口类型时照着贴图量一遍填进来即可，不需要改组件本身。

export const ATLAS = 256; // 图集边长
export const ICON = 16; // 物品图标边长

/**
 * 均匀网格的槽位坐标，从 (x, y) 起按 18px 间距铺开。
 */
function grid(x, y, columns, rows) {
  const slots = [];
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      slots.push([x + column * 18, y + row * 18]);
    }
  }
  return slots;
}

function fixedWindow(texture, slots, titleAt = [8, 6], width = 176) {
  return {
    texture,
    width,
    atlasWidth: width > 256 ? 512 : 256,
    parts: () => [{srcY: 0, height: 166}],
    compactParts: () => [{srcY: 0, height: 83}, {srcY: 159, height: 7}],
    slots: () => slots.map(([x, y]) => [x, y]),
    titleAt,
    inventoryX: width === 276 ? 108 : 8,
  };
}

export const WINDOWS = {
  dispenser: fixedWindow('dispenser.png', grid(62, 17, 3, 3)),
  dropper: fixedWindow('dispenser.png', grid(62, 17, 3, 3)),
  grindstone: fixedWindow('grindstone.png', [[49, 19], [49, 40], [129, 34]]),
  smithing: fixedWindow('smithing.png', [[8, 48], [26, 48], [44, 48], [98, 48]], [44, 6]),
  furnace: fixedWindow('furnace.png', [[56, 17], [56, 53], [116, 35]]),
  blast_furnace: fixedWindow('blast_furnace.png', [[56, 17], [56, 53], [116, 35]]),
  smoker: fixedWindow('smoker.png', [[56, 17], [56, 53], [116, 35]]),
  brewing: fixedWindow('brewing_stand.png', [[56, 51], [79, 58], [102, 51], [79, 17], [17, 17]]),
  stonecutter: fixedWindow('stonecutter.png', [[20, 33], [143, 33]]),
  enchantment: fixedWindow('enchanting_table.png', [[15, 47], [35, 47]]),
  merchant: fixedWindow('villager.png', [[136, 37], [162, 37], [220, 37]], [136, 6], 276),
  crafter: fixedWindow('crafter.png', [...grid(26, 17, 3, 3), [134, 35]]),
  cartography: fixedWindow('cartography_table.png', [[15, 15], [15, 52], [145, 39]], [8, 4]),
  // 箱子。行数可变，容器段高度 = 标题区 17 + 每行 18；下半段是玩家物品栏与底边。
  // 槽位实测：容器 y=18 起步长 18，玩家物品栏 y=140/158/176，快捷栏 y=198。
  chest: {
    texture: 'generic_54.png',
    width: 176,
    defaultRows: 3,
    parts: (rows) => [
      {srcY: 0, height: 17 + 18 * rows},
      {srcY: 126, height: 96},
    ],
    // 不要玩家物品栏时只补最后 7px 的底边，窗口照样是封口的
    compactParts: (rows) => [
      {srcY: 0, height: 17 + 18 * rows},
      {srcY: 215, height: 7},
    ],
    slots: (rows) => grid(8, 18, 9, rows),
    titleAt: [8, 6],
  },
  // 工作台：3×3 输入 + 一个产物格。实测输入格 y=17/35/53，产物格 (124,35)。
  crafting: {
    texture: 'crafting_table.png',
    width: 176,
    parts: () => [{srcY: 0, height: 166}],
    compactParts: () => [
      {srcY: 0, height: 83},
      {srcY: 159, height: 7},
    ],
    slots: () => [...grid(30, 17, 3, 3), [124, 35]],
    titleAt: [28, 6],
  },
  // 铁砧：两个输入 + 一个产物，实测都在 y=47。
  anvil: {
    texture: 'anvil.png',
    width: 176,
    parts: () => [{srcY: 0, height: 166}],
    compactParts: () => [
      {srcY: 0, height: 83},
      {srcY: 159, height: 7},
    ],
    slots: () => [
      [27, 47],
      [76, 47],
      [134, 47],
    ],
    titleAt: [60, 6],
  },
  // 漏斗：一行五格，实测 y=20。
  hopper: {
    texture: 'hopper.png',
    width: 176,
    parts: () => [{srcY: 0, height: 133}],
    compactParts: () => [
      {srcY: 0, height: 44},
      {srcY: 126, height: 7},
    ],
    slots: () => grid(44, 20, 5, 1),
    titleAt: [8, 6],
  },
};

/**
 * 取出某个窗口类型在给定行数下的切片、尺寸与槽位。
 *
 * @param type 窗口类型
 * @param rows 行数，只对箱子有意义
 * @param playerInventory 是否连玩家物品栏一起画
 */
export function resolveWindow(type, rows, playerInventory = true) {
  const spec = WINDOWS[type] ?? WINDOWS.chest;
  const effectiveRows = rows ?? spec.defaultRows ?? 3;
  const parts = playerInventory ? spec.parts(effectiveRows) : spec.compactParts(effectiveRows);
  const height = parts.reduce((sum, part) => sum + part.height, 0);
  const slots = spec.slots(effectiveRows);
  if (playerInventory) {
    const lowerY = height - 96;
    const inventoryX = spec.inventoryX ?? 8;
    slots.push(...grid(inventoryX, lowerY + 14, 9, 3), ...grid(inventoryX, lowerY + 72, 9, 1));
  }
  return {
    texture: spec.texture,
    atlasWidth: spec.atlasWidth ?? ATLAS,
    inventoryX: spec.inventoryX ?? 8,
    width: spec.width,
    parts,
    height,
    slots,
    titleAt: spec.titleAt,
  };
}

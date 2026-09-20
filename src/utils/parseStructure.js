// src/utils/parseStructure.js
// 解析 Pane 的结构模板字符串，规则与库里的 Structure.of(String...) 完全一致：
// 一个 Unicode code point 占一格，反引号包起来的文本算一个多字符标志符，
// 反引号内用 \` 和 \\ 转义。
//
// MinecraftWindow 与 MinecraftSlotGrid 共用模板解析，规则与库保持一致。

// 标志符配色。按首次出现顺序取用，超过 8 种就从头循环。
// 色相值经过挑选，相邻两个之间差距足够大，连着出现也不会认错。
export const HUES = [212, 145, 38, 340, 265, 190, 95, 12];

/**
 * 按模板语法把一行拆成若干格。语法错误直接抛出，由调用方渲染成错误提示。
 */
export function parseRow(row) {
  const chars = Array.from(String(row)); // Array.from 按 code point 切，代理对不会被劈开
  const cells = [];
  let index = 0;

  while (index < chars.length) {
    const char = chars[index];

    // 普通字符：一个 code point 就是一格
    if (char !== '`') {
      cells.push(char);
      index += 1;
      continue;
    }

    // 反引号：一直读到下一个未转义的反引号为止，整段算一个标志符
    index += 1;
    let buffer = '';
    let closed = false;
    while (index < chars.length) {
      const current = chars[index];
      if (current === '`') {
        closed = true;
        index += 1;
        break;
      }
      if (current === '\\') {
        index += 1;
        if (index >= chars.length) throw new Error('未闭合的转义序列');
        const escaped = chars[index];
        if (escaped !== '`' && escaped !== '\\') {
          throw new Error(`不支持的转义序列 \\${escaped}，反引号内只能转义 \` 和 \\`);
        }
        buffer += escaped;
        index += 1;
        continue;
      }
      buffer += current;
      index += 1;
    }
    if (!closed) throw new Error('未闭合的反引号标志符');
    cells.push(buffer);
  }

  return cells;
}

/**
 * 解析整份模板，校验各行宽度一致，并按首次出现顺序登记标志符、分配色相、统计格数。
 *
 * @param rows 模板行
 * @param empty 视为"留空"的标志符，这些格子不分配色相
 * @param label 出错信息里用的组件名
 * @returns 出错时 {error}；成功时 {grid, order, width, hueOf, countOf, emptySet}
 */
export function analyzeStructure(rows, empty = ['#'], label = 'MinecraftSlotGrid') {
  if (!Array.isArray(rows) || rows.length === 0) {
    return {error: `${label}: rows 至少要有一行`};
  }

  const emptySet = new Set(Array.isArray(empty) ? empty : [empty]);
  const grid = [];
  const order = [];
  const seen = new Set();

  for (let rowIndex = 0; rowIndex < rows.length; rowIndex += 1) {
    let cells;
    try {
      cells = parseRow(rows[rowIndex]);
    } catch (error) {
      return {error: `${label}: 第 ${rowIndex + 1} 行 ${error.message}`};
    }

    // 宽度由第一行说了算，和 Structure.of 的行为保持一致
    if (rowIndex > 0 && cells.length !== grid[0].length) {
      return {
        error: `${label}: 第 ${rowIndex + 1} 行有 ${cells.length} 格，第 1 行是 ${grid[0].length} 格，各行宽度必须一致`,
      };
    }
    if (cells.length === 0) {
      return {error: `${label}: 模板行至少要有一格`};
    }

    for (const cell of cells) {
      if (!seen.has(cell)) {
        seen.add(cell);
        order.push(cell);
      }
    }
    grid.push(cells);
  }

  // 标志符 → 色相。留空标志符不分配色相，用 null 表示
  const hueOf = new Map();
  let cursor = 0;
  for (const identifier of order) {
    if (emptySet.has(identifier)) {
      hueOf.set(identifier, null);
      continue;
    }
    hueOf.set(identifier, HUES[cursor % HUES.length]);
    cursor += 1;
  }

  // 每个标志符占了几格，图例里直接显示，省得读者自己数
  const countOf = new Map();
  for (const row of grid) {
    for (const cell of row) {
      countOf.set(cell, (countOf.get(cell) ?? 0) + 1);
    }
  }

  return {grid, order, width: grid[0].length, hueOf, countOf, emptySet};
}

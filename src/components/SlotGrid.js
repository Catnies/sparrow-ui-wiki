// src/components/SlotGrid.js
// 把 Pane 的结构模板字符串画成可视网格。
//
// Sparrow UI 的菜单一律用 Pane.builder("MMMMMMMMM", "P###I###N") 这种符号结构
// 声明布局，文档里每出现一个结构串，读者都得在脑子里数第几格是什么。
// 这个组件把数格子的活接过来：每个标志符一种颜色，悬停一格会点亮同标志符的
// 所有格子，下面的图例说明每个标志符代表什么。
//
//   <SlotGrid
//     rows={["MMMMMMMMM", "MMMMMMMMM", "MMMMMMMMM", "P###I###N"]}
//     legend={{M: '搜索结果', P: '上一页', I: '筛选状态', N: '下一页', '#': '空位'}}
//     showSlots
//   />
//
// 解析规则与 Structure.of(String...) 完全一致：一个 Unicode code point 占一格，
// 反引号包起来的文本算一个多字符标志符，反引号内用 \` 和 \\ 转义。

import React, {useMemo, useState} from 'react';
import styles from './SlotGrid.module.css';

// 标志符配色。按首次出现顺序取用，超过 8 种就从头循环。
// 色相值经过挑选，相邻两个之间差距足够大，连着出现也不会认错。
const HUES = [212, 145, 38, 340, 265, 190, 95, 12];

/**
 * 按 Structure 的模板语法把一行拆成若干格。
 * 语法错误直接抛出，由调用方统一渲染成错误提示。
 */
function parseRow(row) {
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
 * 解析整份模板，顺带校验各行宽度一致，并按首次出现顺序登记标志符。
 * 失败时返回 {error}，成功时返回 {grid, order, slotCount}。
 */
function parseStructure(rows) {
  if (!Array.isArray(rows) || rows.length === 0) {
    return {error: 'SlotGrid: rows 至少要有一行'};
  }

  const grid = [];
  const order = [];
  const seen = new Set();

  for (let rowIndex = 0; rowIndex < rows.length; rowIndex += 1) {
    let cells;
    try {
      cells = parseRow(rows[rowIndex]);
    } catch (error) {
      return {error: `SlotGrid: 第 ${rowIndex + 1} 行 ${error.message}`};
    }

    // 宽度由第一行说了算，和 Structure.of 的行为保持一致
    if (rowIndex > 0 && cells.length !== grid[0].length) {
      return {
        error: `SlotGrid: 第 ${rowIndex + 1} 行有 ${cells.length} 格，第 1 行是 ${grid[0].length} 格，各行宽度必须一致`,
      };
    }
    if (cells.length === 0) {
      return {error: 'SlotGrid: 模板行至少要有一格'};
    }

    for (const cell of cells) {
      if (!seen.has(cell)) {
        seen.add(cell);
        order.push(cell);
      }
    }
    grid.push(cells);
  }

  return {grid, order, slotCount: grid.length * grid[0].length};
}

export default function SlotGrid({
  rows = [],
  legend = {},
  // 约定：# 表示留空的装饰位，不参与配色，画成中性灰。传 empty={[]} 可以取消这个特殊待遇。
  empty = ['#'],
  showSlots = false,
  caption,
}) {
  const parsed = useMemo(() => parseStructure(rows), [rows]);
  const [active, setActive] = useState(null);

  const emptySet = useMemo(
    () => new Set(Array.isArray(empty) ? empty : [empty]),
    [empty],
  );

  // 标志符 → 色相。留空标志符不分配色相，用 null 表示。
  const hueOf = useMemo(() => {
    if (parsed.error) return new Map();
    const map = new Map();
    let cursor = 0;
    for (const identifier of parsed.order) {
      if (emptySet.has(identifier)) {
        map.set(identifier, null);
        continue;
      }
      map.set(identifier, HUES[cursor % HUES.length]);
      cursor += 1;
    }
    return map;
  }, [parsed, emptySet]);

  // 每个标志符占了几格，图例里直接显示，省得读者自己数
  const countOf = useMemo(() => {
    if (parsed.error) return new Map();
    const map = new Map();
    for (const row of parsed.grid) {
      for (const cell of row) {
        map.set(cell, (map.get(cell) ?? 0) + 1);
      }
    }
    return map;
  }, [parsed]);

  if (parsed.error) {
    return <div className={styles.error}>{parsed.error}</div>;
  }

  const width = parsed.grid[0].length;

  return (
    <div className={styles.wrapper}>
      <div
        className={styles.grid}
        style={{'--slot-columns': width}}
        role="group"
        aria-label={caption ?? 'Pane 结构预览'}
      >
        {parsed.grid.map((row, rowIndex) =>
          row.map((identifier, columnIndex) => {
            const slot = rowIndex * width + columnIndex;
            const hue = hueOf.get(identifier);
            const isEmpty = hue === null;
            const isActive = active === identifier;
            return (
              <div
                key={slot}
                className={[
                  styles.cell,
                  isEmpty ? styles.cellEmpty : '',
                  isActive ? styles.cellActive : '',
                  // 有别的标志符被点亮时，把没被点亮的压暗，对比才出得来
                  active !== null && !isActive ? styles.cellDimmed : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                style={hue === null ? undefined : {'--slot-hue': hue}}
                onMouseEnter={() => setActive(identifier)}
                onMouseLeave={() => setActive(null)}
                title={legend[identifier] ? `${identifier} — ${legend[identifier]}` : identifier}
              >
                <span
                  className={`${styles.cellIdentifier} ${
                    // 按 code point 数，避免多字节字符被当成多个字符误判
                    Array.from(identifier).length > 2 ? styles.cellIdentifierLong : ''
                  }`}
                >
                  {identifier}
                </span>
                {showSlots && <span className={styles.cellSlot}>{slot}</span>}
              </div>
            );
          }),
        )}
      </div>

      {parsed.order.length > 0 && (
        <ul className={styles.legend}>
          {parsed.order.map((identifier) => {
            const hue = hueOf.get(identifier);
            const isActive = active === identifier;
            return (
              <li
                key={identifier}
                className={`${styles.legendItem} ${isActive ? styles.legendItemActive : ''}`}
                onMouseEnter={() => setActive(identifier)}
                onMouseLeave={() => setActive(null)}
              >
                <span
                  className={`${styles.swatch} ${hue === null ? styles.swatchEmpty : ''}`}
                  style={hue === null ? undefined : {'--slot-hue': hue}}
                />
                <code className={styles.legendIdentifier}>{identifier}</code>
                <span className={styles.legendText}>{legend[identifier] ?? ''}</span>
                <span className={styles.legendCount}>{countOf.get(identifier)}</span>
              </li>
            );
          })}
        </ul>
      )}

      {caption && <p className={styles.caption}>{caption}</p>}
    </div>
  );
}

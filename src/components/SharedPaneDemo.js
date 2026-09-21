// src/components/SharedPaneDemo.js
// 同一块 Pane 显示在多名玩家的窗口里：切换 Pane 的状态，所有窗口一起变化。
//
// 每名玩家各画一扇 <MinecraftWindow>，内容取自同一份 states[i].items，
// 切换状态时所有窗口同时换内容，用来说明"改的是共用的 Pane，不是某一扇窗口"。
//
//   <SharedPaneDemo
//     title="服务器公告"
//     rows={["#########", "###N#S###", "#########"]}
//     viewers={['Alice', 'Bob']}
//     states={[
//       {label: '正常', note: '签到按钮可以点击。', items: {'#': {icon: 'gray_stained_glass_pane'}}},
//       {label: '维护中', note: 'Pane 已冻结。', items: {'#': {icon: 'red_stained_glass_pane'}}},
//     ]}
//   />

import React, {useEffect, useState} from 'react';
import {translate} from '@docusaurus/Translate';
import useBaseUrl from '@docusaurus/useBaseUrl';
import McButton from './McButton';
import MinecraftWindow from './MinecraftWindow';
import styles from './SharedPaneDemo.module.css';

export default function SharedPaneDemo({
  title,
  rows = [],
  viewers = [],
  // [{label, note, items}]，items 写法同 <MinecraftWindow>
  states = [],
  windowType = 'chest',
}) {
  const [active, setActive] = useState(0);
  const state = states[active] ?? {items: {}};
  const itemBase = useBaseUrl('/img/mc/item/');

  // 预取所有状态用到的贴图，切换时直接换图，不会先闪出空格子
  useEffect(() => {
    const icons = new Set();
    states.forEach((item) => Object.values(item.items ?? {}).forEach((entry) => entry?.icon && icons.add(entry.icon)));
    icons.forEach((icon) => {
      new Image().src = `${itemBase}${icon}.png`;
    });
  }, [states, itemBase]);

  return (
    <div className={styles.wrapper}>
      <div
        className={styles.states}
        role="group"
        aria-label={translate({
          id: 'sharedPaneDemo.states.aria',
          message: 'Pane state',
          description: 'SharedPaneDemo: aria label of the state switch',
        })}
      >
        {states.map((item, index) => (
          // eslint-disable-next-line react/no-array-index-key
          <McButton key={index} selected={index === active} onClick={() => setActive(index)}>
            {item.label}
          </McButton>
        ))}
      </div>

      {/* 两个同样的淡入动画轮流使用：换动画名才会重播，窗口本身不重新挂载 */}
      <div className={`${styles.windows} ${active % 2 === 0 ? styles.fadeEven : styles.fadeOdd}`}>
        {viewers.map((viewer) => (
          <figure className={styles.viewer} key={viewer}>
            <MinecraftWindow type={windowType} rows={rows.length} title={title} layout={rows} items={state.items} />
            <figcaption className={styles.caption}>
              {translate(
                {
                  id: 'sharedPaneDemo.viewerCaption',
                  message: "{viewer}'s window",
                  description: 'SharedPaneDemo: caption under each player window',
                },
                {viewer},
              )}
            </figcaption>
          </figure>
        ))}
      </div>

      {state.note && <p className={styles.note}>{state.note}</p>}
    </div>
  );
}

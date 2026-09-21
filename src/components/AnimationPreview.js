// src/components/AnimationPreview.js
// 动画预览：按 AnimationDefinition 的规则逐 tick 推演，在一扇 <MinecraftWindow> 上播放。
//
// 帧的算法照抄库里的实现，改了库就要改这里：
//   frames / reveal / staggeredFrames  →  StaggeredFramesAnimation
//   loop                               →  LoopFramesAnimation
//   custom                             →  AnimationDefinition.of 的帧函数
// 帧只在周期边界上换（库里的时钟每个周期推进一次），总时长走完的动画摘掉，露出下面的内容。
// animations 可以写好几个：越靠后开始得越晚，盖在上面；某格放行时露出更早的那个。
//
//   <AnimationPreview
//     title="宝箱"
//     rows={3}
//     base={[null, ..., {icon: 'diamond', name: '钻石'}, ...]}
//     animations={[
//       {type: 'reveal', order: [10, 11, 12], stagger: 4, cover: {icon: 'gray_stained_glass_pane'}},
//     ]}
//   />
//
// 各类型用到的字段：
//   frames          slots, period, frames
//   loop            slots, period, frames
//   reveal          order, stagger, cover
//   staggeredFrames order, stagger, period, frames, cover
//   custom          slots, period, total, frame(orderIndex, slot, elapsedTicks) => 物品 | null

import React, {useEffect, useMemo, useState} from 'react';
import {translate} from '@docusaurus/Translate';
import useBaseUrl from '@docusaurus/useBaseUrl';
import McButton from './McButton';
import MinecraftWindow from './MinecraftWindow';
import styles from './AnimationPreview.module.css';

// 每一格用一个独立的标志符，才能逐格给物品
const IDENTIFIERS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const TICK_MS = 50; // 游戏里一 tick 是 50 毫秒
const SLOW_FACTOR = 4;

// 统一成 StaggeredFramesAnimation 那种形状：错峰、周期、帧序列、开始前的遮盖
function normalize(animation) {
  switch (animation.type) {
    case 'frames':
      return {kind: 'staggered', slots: animation.slots, period: animation.period, stagger: 0, frames: animation.frames, cover: null,
        total: animation.period * animation.frames.length};
    case 'reveal': {
      const count = animation.order.length;
      return {kind: 'staggered', slots: animation.order, period: animation.stagger, stagger: animation.stagger, frames: [],
        cover: animation.cover ?? null, total: count === 0 ? 0 : animation.stagger * (count - 1)};
    }
    case 'staggeredFrames': {
      const count = animation.order.length;
      return {kind: 'staggered', slots: animation.order, period: animation.period, stagger: animation.stagger, frames: animation.frames,
        cover: animation.cover ?? null,
        total: count === 0 ? 0 : animation.stagger * (count - 1) + animation.period * animation.frames.length};
    }
    case 'loop':
      return {kind: 'loop', slots: animation.slots, period: animation.period, frames: animation.frames, total: -1};
    case 'custom':
      return {kind: 'custom', slots: animation.slots, period: animation.period, frame: animation.frame, total: animation.total ?? -1};
    default:
      return null;
  }
}

// 与库里的 frame(orderIndex, slot, elapsedTicks) 一一对应，返回 null 表示这一格放行
function frameAt(animation, orderIndex, slot, elapsed) {
  if (animation.kind === 'loop') {
    return animation.frames[Math.floor(elapsed / animation.period) % animation.frames.length];
  }
  if (animation.kind === 'custom') {
    return animation.frame(orderIndex, slot, elapsed) ?? null;
  }
  const local = elapsed - animation.stagger * orderIndex;
  if (local < 0) return animation.cover;
  const index = Math.floor(local / animation.period);
  return index < animation.frames.length ? animation.frames[index] : null;
}

export default function AnimationPreview({
  title,
  rows = 3,
  // 动画下面原本的显示，长度为 rows × 9，null 表示空格
  base = [],
  animations = [],
  windowType = 'chest',
}) {
  const normalized = useMemo(() => animations.map(normalize).filter(Boolean), [animations]);
  const [tick, setTick] = useState(null);   // null 表示没有在播放
  const [finished, setFinished] = useState(false);
  const [slow, setSlow] = useState(false);
  const itemBase = useBaseUrl('/img/mc/item/');

  const size = rows * 9;
  const layout = Array.from({length: rows}, (_, row) => IDENTIFIERS.slice(row * 9, row * 9 + 9));
  const finite = normalized.every((animation) => animation.total >= 0);
  const longest = finite ? Math.max(0, ...normalized.map((animation) => animation.total)) : -1;

  // 预取所有帧的贴图，播放时直接换图
  useEffect(() => {
    const icons = new Set();
    base.forEach((item) => item?.icon && icons.add(item.icon));
    animations.forEach((animation) => {
      (animation.frames ?? []).forEach((item) => item?.icon && icons.add(item.icon));
      if (animation.cover?.icon) icons.add(animation.cover.icon);
      (animation.preload ?? []).forEach((icon) => icons.add(icon));
    });
    icons.forEach((icon) => {
      new Image().src = `${itemBase}${icon}.png`;
    });
  }, [base, animations, itemBase]);

  const running = tick !== null;
  useEffect(() => {
    if (!running) return undefined;
    const timer = setInterval(() => {
      setTick((current) => (current === null ? null : current + 1));
    }, slow ? TICK_MS * SLOW_FACTOR : TICK_MS);
    return () => clearInterval(timer);
  }, [running, slow]);

  // 全部动画都走完时停下来，窗口回到原本的显示
  useEffect(() => {
    if (tick !== null && longest >= 0 && tick >= longest) {
      setTick(null);
      setFinished(true);
    }
  }, [tick, longest]);

  const items = {};
  for (let slot = 0; slot < size; slot++) {
    let shown = base[slot] ?? null;
    if (tick !== null) {
      // 后开始的盖在上面，从最后一个往前找第一个给出帧的动画
      for (let index = normalized.length - 1; index >= 0; index--) {
        const animation = normalized[index];
        if (animation.total >= 0 && tick >= animation.total) continue;
        const orderIndex = animation.slots.indexOf(slot);
        if (orderIndex < 0) continue;
        // 帧只在周期边界上换
        const elapsed = Math.floor(tick / animation.period) * animation.period;
        const frame = frameAt(animation, orderIndex, slot, elapsed);
        if (frame) {
          shown = frame;
          break;
        }
      }
    }
    if (shown) items[IDENTIFIERS[slot]] = shown;
  }

  const play = () => {
    setFinished(false);
    setTick(0);
  };
  const stop = () => {
    setTick(null);
    setFinished(false);
  };

  let status;
  if (tick !== null) {
    const current = translate({id: 'animationPreview.tick', message: 'Tick {tick}', description: 'AnimationPreview: current tick'}, {tick});
    status = longest >= 0
      ? `${current} / ${translate({id: 'animationPreview.total', message: '{total} ticks in total', description: 'AnimationPreview: total length'}, {total: longest})}`
      : `${current} · ${translate({id: 'animationPreview.loop', message: 'loops until stopped', description: 'AnimationPreview: the animation never ends by itself'})}`;
  } else if (finished) {
    status = translate({id: 'animationPreview.done', message: 'Finished. The original display is back.', description: 'AnimationPreview: all animations finished'});
  } else {
    status = translate({id: 'animationPreview.idle', message: 'Press play to see the animation.', description: 'AnimationPreview: nothing is playing yet'});
  }

  return (
    <div className={styles.wrapper}>
      <div
        className={styles.controls}
        role="group"
        aria-label={translate({id: 'animationPreview.aria', message: 'Animation controls', description: 'AnimationPreview: aria label of the controls'})}
      >
        <McButton onClick={play}>
          {running || finished
            ? translate({id: 'animationPreview.replay', message: 'Replay', description: 'AnimationPreview: restart button'})
            : translate({id: 'animationPreview.play', message: 'Play', description: 'AnimationPreview: play button'})}
        </McButton>
        <McButton onClick={stop} disabled={!running}>
          {translate({id: 'animationPreview.stop', message: 'Stop', description: 'AnimationPreview: stop button, like AnimationHandle.cancel()'})}
        </McButton>
        <McButton selected={slow} onClick={() => setSlow((value) => !value)}>
          {translate({id: 'animationPreview.slow', message: 'Slow motion', description: 'AnimationPreview: toggle 4x slower playback'})}
        </McButton>
        <span className={styles.status} aria-live="polite">{status}</span>
      </div>
      <div className={styles.window}>
        <MinecraftWindow type={windowType} rows={rows} title={title} layout={layout} items={items} />
      </div>
    </div>
  );
}

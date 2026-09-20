// src/components/VersionBadge.js
// 标注某个 API 的最低可用版本，或者标注它还在 Beta 期、后续可能改。
//
// Sparrow UI 目前整体处于 Beta，公开 API 在正式版前仍可能调整，
// 文档里凡是"这个签名以后大概率要动"的地方都该挂一个 beta 徽章，
// 免得用户照着写完再发现被改掉。
//
//   <VersionBadge since="beta.33" />
//   <VersionBadge beta />
//   <VersionBadge since="beta.33" beta />

import React from 'react';
import {translate} from '@docusaurus/Translate';
import styles from './VersionBadge.module.css';

export default function VersionBadge({since, beta = false, children}) {
  // 两种徽章可以同时出现，顺序固定为「版本 → Beta」，保证全站观感一致。
  return (
    <>
      {since && (
        <span className={`${styles.badge} ${styles.since}`}>
          {children ?? translate(
            {
              id: 'versionBadge.since',
              message: 'since {version}',
              description: 'VersionBadge label showing the first version that ships an API',
            },
            {version: since},
          )}
        </span>
      )}
      {beta && (
        <span className={`${styles.badge} ${styles.beta}`}>
          {translate({
            id: 'versionBadge.beta',
            message: 'may change',
            description: 'VersionBadge label warning that the API can still change before release',
          })}
        </span>
      )}
    </>
  );
}

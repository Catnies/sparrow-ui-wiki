// src/components/SignalHint.js
// 静态章节末尾统一的「想让它动起来」提示卡。
//
// 文档采用两遍教学：第 2~8 组先用静态写法把菜单的每个零件讲完整，
// 第 9 组 Signal 再统一把它们点亮。这就要求静态章节的正文里不出现 dependsOn
// 和接受 Signal 的 addIngredient 重载，同时又得让读者知道「后面有办法」。
// 这张卡片就是那个出口，措辞和位置全站保持一致。
//
//   <SignalHint>页码变化时按钮要跟着变灰，需要读 page() 与 count() 两个 Signal。</SignalHint>
//   <SignalHint to="/signal/bind-ui" />

import React from 'react';
import Link from '@docusaurus/Link';
import {useLocation} from '@docusaurus/router';
import {translate} from '@docusaurus/Translate';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import resolveDocLink from '../utils/resolveDocLink';
import styles from './SignalHint.module.css';

export default function SignalHint({to = '/signal/why', linkText, children}) {
  const location = useLocation();
  const {siteConfig} = useDocusaurusContext();
  const href = resolveDocLink(location.pathname, to, siteConfig.baseUrl);

  return (
    <aside className={styles.card}>
      <span className={styles.title}>
        {translate({
          id: 'signalHint.title',
          message: 'Want this to update by itself?',
          description: 'Title of the callout that points readers at the Signal chapter',
        })}
      </span>
      <div className={styles.body}>
        {children ??
          translate({
            id: 'signalHint.default',
            message:
              'Everything on this page is written with static values. To make it react to state changes, see the Signal chapter.',
            description: 'Default body text of the Signal callout',
          })}
      </div>
      <Link to={href} className={styles.link}>
        {linkText ??
          translate({
            id: 'signalHint.link',
            message: 'Go to the Signal chapter',
            description: 'Link text of the Signal callout',
          })}
        {' →'}
      </Link>
    </aside>
  );
}

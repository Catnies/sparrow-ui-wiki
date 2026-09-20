// src/components/NextStep.js
// 每页结尾统一的「下一步」卡片。
//
// 文档是按一条固定路径读下来的，每页末尾都该明确告诉读者接着看哪一页。
// 写成手工 Markdown 链接的话，措辞和样式会一页一个样；统一成组件之后，
// 调用方只需要给目标和一句话说明。
//
//   <NextStep to="/pane/structure" title="结构与 identifier" description="用字符模板声明菜单布局" />
//
// to 支持三种写法：绝对路径 /pane/structure、相对路径 ../pane/structure、外链 https://…

import React from 'react';
import Link from '@docusaurus/Link';
import {useLocation} from '@docusaurus/router';
import {translate} from '@docusaurus/Translate';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import resolveDocLink from '../utils/resolveDocLink';
import styles from './NextStep.module.css';

export default function NextStep({to, title, description, label}) {
  const location = useLocation();
  const {siteConfig} = useDocusaurusContext();
  const href = resolveDocLink(location.pathname, to, siteConfig.baseUrl);

  const eyebrow =
    label ??
    translate({
      id: 'nextStep.label',
      message: 'Next',
      description: 'Eyebrow label on the end-of-page next step card',
    });

  return (
    <Link to={href} className={styles.card}>
      <div className={styles.body}>
        <span className={styles.eyebrow}>{eyebrow}</span>
        <span className={styles.title}>{title}</span>
        {description && <span className={styles.description}>{description}</span>}
      </div>
      {/* 箭头是纯装饰，语义已经由 eyebrow 文案给出 */}
      <svg
        className={styles.arrow}
        viewBox="0 0 24 24"
        width="20"
        height="20"
        aria-hidden="true"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <line x1="5" y1="12" x2="19" y2="12" />
        <polyline points="12 5 19 12 12 19" />
      </svg>
    </Link>
  );
}

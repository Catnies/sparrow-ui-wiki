// src/theme/DocBreadcrumbs/index.js
// 在面包屑这一行的右侧挂上 AI 菜单（llms.txt 链接）。

import React from 'react';
import DocBreadcrumbs from '@theme-original/DocBreadcrumbs';
import LlmsMenu from '@site/src/components/LlmsMenu';
import styles from './styles.module.css';

export default function DocBreadcrumbsWrapper(props) {
  return (
    <div className={styles.row}>
      <DocBreadcrumbs {...props} />
      <LlmsMenu />
    </div>
  );
}

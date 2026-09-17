// src/components/OverallYamlConfig.js
import React from 'react';
import styles from './OverallYamlConfig.module.css'; // 这是新的CSS文件

function OverallYamlConfig({ title, children }) {
  return (
    <div className={styles.overallContainer}>
      {title && <h3 className={styles.overallTitle}>{title}</h3>}
      <div className={styles.fragmentsWrapper}>
        {children} {/* 这里会渲染所有的 ClickableYamlFragment */}
      </div>
    </div>
  );
}

export default OverallYamlConfig;
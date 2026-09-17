import React from 'react';
import Link from '@docusaurus/Link'; // 1. 导入 Docusaurus 的 Link 组件
import { useLocation } from '@docusaurus/router';
import { translate } from '@docusaurus/Translate';
import styles from './UrlCard.module.css';

/**
 * 将页面相对链接解析为站点根绝对路径。
 * 无论当前页面地址是否以 / 结尾，解析结果保持一致，
 * 避免 /getting_start/installation 与 /getting_start/installation/ 行为不一致。
 */
function resolveToRoot(pathname, relativeUrl) {
  // 取当前页面所在目录：去掉结尾的 / 后，再去掉最后一段（当前页名）
  const trimmed = pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
  const segments = trimmed.split('/').filter(Boolean);
  segments.pop();
  for (const segment of relativeUrl.split('/')) {
    if (!segment || segment === '.') continue;
    if (segment === '..') {
      segments.pop();
    } else {
      segments.push(segment);
    }
  }
  return '/' + segments.join('/');
}

export default function UrlCard({ url = '', title = '', subtitle = '' }) {
  const location = useLocation();

  // 判断是否为完整的外部 URL
  const isExternalUrl = url.startsWith('http://') || url.startsWith('https://');

  // 实际用于链接的地址：外部链接原样，页面相对链接解析为根绝对路径
  let displayLink = url;
  let displayDomainOrPath = ''; // 用于显示域名或路径的部分

  if (isExternalUrl) {
    try {
      const urlObject = new URL(url);
      displayDomainOrPath = urlObject.hostname.replace('www.', '');
    } catch (error) {
      console.error("Invalid URL provided to UrlCard:", url, error);
      displayDomainOrPath = translate({ id: 'urlCard.invalidLink', message: 'Broken link' });
    }
  } else if (url && !url.startsWith('/') && !url.startsWith('#')) {
    displayLink = resolveToRoot(location.pathname, url);
    displayDomainOrPath = url;
  } else {
    displayDomainOrPath = url;
  }

  // 优先显示传入的 title，如果没有则显示域名或路径
  const displayTitle = title || displayDomainOrPath || translate({ id: 'urlCard.link', message: 'Link' });

  return (
      <div className={styles.cardWrapper}>
        {url ? (
            // 2. 将 <a> 标签替换为 <Link> 组件
            <Link
                to={displayLink} // 使用 `to` 属性代替 `href`
                className={styles.cardLink}
                // Docusaurus 的 Link 组件会自动处理 target 和 rel for 外部链接,
                // 你无需手动设置。它默认会对外部链接添加 target="_blank" rel="noopener noreferrer"
            >
              <div className={styles.cardContent}>
                <span className={styles.cardTitle}>{displayTitle}</span>
                {/* 3. 副标题逻辑优化：如果提供了 subtitle 就用它，否则显示 url */}
                <span className={styles.cardUrl}>{subtitle || url}</span>
              </div>
            </Link>
        ) : (
            // 对于没有 url 的情况，保持原样
            <div className={styles.cardLink + ' ' + styles.disabledCard}>
              <div className={styles.cardContent}>
                <span className={styles.cardTitle}>{displayTitle}</span>
                <span className={styles.cardUrl}>{subtitle || url || translate({ id: 'urlCard.invalidLink', message: 'Broken link' })}</span>
              </div>
            </div>
        )}
      </div>
  );
}

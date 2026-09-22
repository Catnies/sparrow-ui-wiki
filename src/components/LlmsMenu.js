// src/components/LlmsMenu.js
// 文档页右上角的 AI 菜单：给出可以分享给 AI 大模型的 llms.txt 与 llms-full.txt 链接。
//
// 这两个文件由 plugins/llms-txt 在 build 时生成。npm start 的开发模式下它们不存在，
// 链接会打开 404 页；要在本地试，先 npm run build，再 npm run serve。

import React, {useEffect, useRef, useState} from 'react';
import clsx from 'clsx';
import {translate} from '@docusaurus/Translate';
import useBaseUrl from '@docusaurus/useBaseUrl';
import {LuBookOpen, LuBot, LuChevronDown, LuExternalLink, LuLibrary} from 'react-icons/lu';
import styles from './LlmsMenu.module.css';

export default function LlmsMenu() {
  const llmsTxt = useBaseUrl('/llms.txt');
  const llmsFullTxt = useBaseUrl('/llms-full.txt');

  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const toggleRef = useRef(null);
  const menuRef = useRef(null);

  // 菜单打开期间：点菜单外面关闭；打开时焦点落到第一项，方便键盘继续操作
  useEffect(() => {
    if (!open) return undefined;
    menuRef.current.querySelector('[role="menuitem"]').focus();
    const onPointerDown = (event) => {
      if (!rootRef.current.contains(event.target)) setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  // 菜单内的键盘操作：上下方向键移动，Home / End 到首尾，Esc 关闭并把焦点还给按钮
  const onMenuKeyDown = (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      setOpen(false);
      toggleRef.current.focus();
      return;
    }
    const items = [...menuRef.current.querySelectorAll('[role="menuitem"]')];
    const current = items.indexOf(document.activeElement);
    const next = {
      ArrowDown: (current + 1) % items.length,
      ArrowUp: (current - 1 + items.length) % items.length,
      Home: 0,
      End: items.length - 1,
    }[event.key];
    if (next === undefined) return;
    event.preventDefault();
    items[next].focus();
  };

  return (
    <div className={styles.root} ref={rootRef}>
      <button
        type="button"
        ref={toggleRef}
        className={clsx(styles.toggle, open && styles.toggleOpen)}
        onClick={() => setOpen(!open)}
        aria-haspopup="menu"
        aria-expanded={open}>
        <LuBot aria-hidden="true" />
        {translate({id: 'llmsMenu.label', message: 'For LLMs', description: 'Button that opens the menu of llms.txt links'})}
        <LuChevronDown aria-hidden="true" className={styles.chevron} />
      </button>

      {open && (
        <div className={styles.menu} role="menu" ref={menuRef} onKeyDown={onMenuKeyDown}>
          <MenuLink href={llmsTxt} icon={LuBookOpen} onSelect={() => setOpen(false)}
            title="llms.txt"
            description={translate({
              id: 'llmsMenu.llmsTxt.description',
              message: 'Index of every page, for LLMs to read what they need',
              description: 'Description of the llms.txt menu item',
            })}
          />
          <MenuLink href={llmsFullTxt} icon={LuLibrary} onSelect={() => setOpen(false)}
            title="llms-full.txt"
            description={translate({
              id: 'llmsMenu.llmsFullTxt.description',
              message: 'Every page combined into one file',
              description: 'Description of the llms-full.txt menu item',
            })}
          />
        </div>
      )}
    </div>
  );
}

// 这些地址是 build 时生成的静态文件，不是站内路由，用普通 <a> 在新标签页打开，
// 不能交给 Docusaurus 的 <Link> 做客户端跳转。
function MenuLink({href, icon: Icon, title, description, onSelect}) {
  return (
    <a role="menuitem" className={styles.item} href={href} target="_blank" rel="noopener" onClick={onSelect}>
      <Icon aria-hidden="true" className={styles.itemIcon} />
      <span className={styles.itemTitle}>
        {title}
        <LuExternalLink aria-hidden="true" className={styles.external} />
      </span>
      <span className={styles.itemDescription}>{description}</span>
    </a>
  );
}

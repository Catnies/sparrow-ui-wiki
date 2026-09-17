// src/components/Comment.js
import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import styles from './Comment.module.css';

function Comment({ children, text }) {
    const [showComment, setShowComment] = useState(false);
    const [popupStyle, setPopupStyle] = useState({});
    const [arrowStyle, setArrowStyle] = useState({});
    const containerRef = useRef(null);
    const popupRef = useRef(null);

    useEffect(() => {
        if (showComment && containerRef.current) {
            const container = containerRef.current;
            const containerRect = container.getBoundingClientRect();
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;
            const margin = 10;
            const gap = 10; // 弹出框与容器的间距

            // 先用临时元素测量弹出框尺寸
            const tempDiv = document.createElement('div');
            tempDiv.style.position = 'fixed';
            tempDiv.style.visibility = 'hidden';
            tempDiv.style.maxWidth = `min(400px, ${viewportWidth - 20}px)`;
            tempDiv.style.padding = '8px 12px';
            tempDiv.style.fontSize = '14px';
            tempDiv.style.whiteSpace = 'pre-line';
            tempDiv.style.wordWrap = 'break-word';
            tempDiv.style.borderRadius = '4px';
            tempDiv.style.backgroundColor = '#333';
            tempDiv.style.color = 'white';
            tempDiv.innerText = text;
            document.body.appendChild(tempDiv);
            const popupRect = tempDiv.getBoundingClientRect();
            document.body.removeChild(tempDiv);

            const popupWidth = popupRect.width;
            const popupHeight = popupRect.height;
            const containerCenterX = containerRect.left + containerRect.width / 2;

            // 默认将弹出框放在容器正上方，水平居中
            let left = containerCenterX - popupWidth / 2;
            let top = containerRect.top - popupHeight - gap;

            // 水平边界检测
            if (left < margin) {
                left = margin;
            } else if (left + popupWidth > viewportWidth - margin) {
                left = viewportWidth - popupWidth - margin;
            }

            // 垂直边界检测：如果上方空间不足，改为放在下方
            if (top < margin) {
                top = containerRect.bottom + gap;
                // 如果下方也放不下，就紧贴边缘
                if (top + popupHeight > viewportHeight - margin) {
                    top = viewportHeight - popupHeight - margin;
                }
            }

            // 确保不超出上边界
            if (top < margin) top = margin;

            setPopupStyle({
                position: 'fixed',
                left: `${left}px`,
                top: `${top}px`,
                maxWidth: `min(400px, ${viewportWidth - 20}px)`,
            });

            // 计算箭头指向容器中心的位置（相对于弹出框左边）
            const arrowLeft = containerCenterX - left;
            setArrowStyle({
                position: 'absolute',
                top: top < containerRect.top ? '100%' : 'auto',
                bottom: top < containerRect.top ? 'auto' : '100%',
                left: `${arrowLeft}px`,
                transform: 'translateX(-50%)',
                borderLeft: '5px solid transparent',
                borderRight: '5px solid transparent',
                borderTop: top < containerRect.top ? '5px solid #333' : 'none',
                borderBottom: top >= containerRect.top ? '5px solid #333' : 'none',
                width: 0,
                height: 0,
            });
        }
    }, [showComment, text]);

    const handleMouseEnter = () => setShowComment(true);
    const handleMouseLeave = () => setShowComment(false);

    return (
        <>
      <span
          ref={containerRef}
          className={styles.commentContainer}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          onTouchStart={handleMouseEnter}
          onTouchEnd={handleMouseLeave}
      >
        {children}
      </span>
            {showComment &&
                ReactDOM.createPortal(
                    <span
                        ref={popupRef}
                        className={styles.commentText}
                        style={popupStyle}
                    >
            {text}
                        <span style={arrowStyle} />
          </span>,
                    document.body
                )}
        </>
    );
}

export default Comment;
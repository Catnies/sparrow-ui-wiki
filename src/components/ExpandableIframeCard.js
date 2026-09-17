import React, { useState } from 'react';
import BrowserOnly from '@docusaurus/BrowserOnly';
import './ExpandableIframeCard.css';

function IframeCard({
                        title,              // 固定标题文本，始终显示在头部左侧
                        url,
                        expandedLabel,      // 展开时尾部提示文字
                        collapsedLabel,     // 收起时尾部提示文字
                        defaultExpanded = false,
                    }) {
    const [expanded, setExpanded] = useState(defaultExpanded);
    // 记录是否曾经展开过 —— 首次展开才真正挂载 iframe，之后只做 CSS 显隐
    const [hasBeenExpanded, setHasBeenExpanded] = useState(defaultExpanded);

    const toggle = () => {
        if (!expanded && !hasBeenExpanded) {
            setHasBeenExpanded(true);
        }
        setExpanded(!expanded);
    };

    return (
        <div className={`iframe-card${expanded ? ' expanded' : ''}`}>
            <div className="card-header" onClick={toggle}>
                <span className="card-title">{title}</span>
                <span className="toggle-indicator">
                  {expanded ? expandedLabel : collapsedLabel}
                </span>
            </div>
            {/* card-body 始终在 DOM 中，通过 CSS 做抽屉动画；iframe 首次展开后才挂载 */}
            <div className="card-body">
                <div className="card-body-inner">
                    {hasBeenExpanded && (
                        <iframe src={url} allowFullScreen />
                    )}
                </div>
            </div>
        </div>
    );
}

export default function ExpandableIframeCard(props) {
    return (
        <BrowserOnly>
            {() => <IframeCard {...props} />}
        </BrowserOnly>
    );
}
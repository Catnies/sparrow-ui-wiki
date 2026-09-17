import React, { useState } from 'react';
import styles from './SkriptCard.module.css';

interface I18N {
  label: string;
  syntax: string;
  field: string;
  example: string;
}

interface SkriptCardProps {
  title: string;
  type: 'Event' | 'Expression' | 'Effect' | 'Condition' | 'Tag' | 'Command' | 'Mechanism';
  syntax?: string[];
  description?: string;
  examples?: string[];
  values?: string[];
  children?: React.ReactNode;
  defaultOpen?: boolean;
  i18n?: I18N;
}

const SkriptCard: React.FC<SkriptCardProps> = ({
  title,
  type,
  syntax = [],
  description,
  examples = [],
  values = [],
  children,
  defaultOpen = false,
  i18n = {
    label: type,
    syntax: 'Syntax:',
    field: 'Field:',
    example: 'Example:',
  }
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'Event':
        return '📅';
      case 'Expression':
        return '🔧';
      case 'Effect':
        return '⚡';
      case 'Condition':
        return '❓';
      case 'Tag':
        return '🏷️';
      case 'Command':
        return '💻';
      case 'Mechanism':
        return '⚙️';
      default:
        return '📋';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'Event':
        return '#8b5cf6'; // purple
      case 'Expression':
        return '#06b6d4'; // cyan
      case 'Effect':
        return '#f59e0b'; // amber
      case 'Condition':
        return '#10b981'; // emerald
      case 'Tag':
        return '#ec4899'; // pink
      case 'Command':
        return '#6366f1'; // indigo
      case 'Mechanism':
        return '#f97316'; // orange
      default:
        return '#6b7280'; // gray
    }
  };

  return (
    <div
      className={styles.card}
      style={{ '--card-accent-color': getTypeColor(type) } as React.CSSProperties}
    >
      <div
        className={styles.header}
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className={styles.headerLeft}>
          <span className={styles.typeIcon}>{getTypeIcon(type)}</span>
          <div className={styles.titleSection}>
            <h3 className={styles.title}>{title}</h3>
            <span
              className={styles.type}
              style={{ backgroundColor: getTypeColor(type) }}
            >
              {i18n.label}
            </span>
          </div>
        </div>
        <div className={`${styles.chevron} ${isOpen ? styles.chevronOpen : ''}`}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="M4 6L8 10L12 6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>

      <div className={`${styles.contentWrapper} ${isOpen ? styles.open : ''}`}>
        <div className={styles.contentInner}>
          {description && (
            <div className={styles.section}>
              <p className={styles.description}>{description}</p>
            </div>
          )}

          {syntax.length > 0 && (
            <div className={styles.section}>
              <h4 className={styles.sectionTitle}>{i18n.syntax}</h4>
              <div className={styles.syntaxContainer}>
                {syntax.map((syn, index) => (
                  <code key={index} className={styles.syntax}>
                    {syn}
                  </code>
                ))}
              </div>
            </div>
          )}

          {values.length > 0 && (
            <div className={styles.section}>
              <h4 className={styles.sectionTitle}>{i18n.field}</h4>
              <div className={styles.valuesList}>
                {values.map((value, index) => (
                  <code key={index} className={styles.value}>
                    {value}
                  </code>
                ))}
              </div>
            </div>
          )}

          {examples.length > 0 && (
            <div className={styles.section}>
              <h4 className={styles.sectionTitle}>{i18n.example}</h4>
              <div className={styles.examplesContainer}>
                {examples.map((example, index) => (
                  <pre key={index} className={styles.example}>
                    <code>{example}</code>
                  </pre>
                ))}
              </div>
            </div>
          )}

          {children && (
            <div className={styles.section}>
              {children}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SkriptCard;

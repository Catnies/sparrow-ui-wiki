import React from 'react';
import styles from './EmbedCard.module.css';

export default function EmbedCard({ url, title, description, image }) {
  return (
    <div className={styles.card}>
      <a href={url} className={styles.cardLink} target="_blank" rel="noopener noreferrer">
        {image && <img src={image} alt={title} className={styles.cardImage} />}
        <div className={styles.cardContent}>
          <h3 className={styles.cardTitle}>{title}</h3>
          {description && <p className={styles.cardDescription}>{description}</p>}
          <span className={styles.cardUrl}>{new URL(url).hostname}</span>
        </div>
      </a>
    </div>
  );
}
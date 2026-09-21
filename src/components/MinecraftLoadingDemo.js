import React, {useEffect, useRef, useState} from 'react';
import MinecraftWindow from './MinecraftWindow';
import styles from './MinecraftLoadingDemo.module.css';

export default function MinecraftLoadingDemo({title, loadingItem, loadedItem, playLabel, loadingLabel, readyLabel}) {
  const [loading, setLoading] = useState(false);
  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);

  const play = () => {
    clearTimeout(timer.current);
    setLoading(true);
    timer.current = setTimeout(() => setLoading(false), 1000);
  };

  return (
    <div className={styles.demo}>
      <MinecraftWindow
        type="chest"
        rows={1}
        title={title}
        layout={['####P####']}
        items={{P: loading ? loadingItem : loadedItem}}
      />
      <div className={styles.controls}>
        <button type="button" onClick={play} disabled={loading}>
          <span aria-hidden="true">▶ </span>{playLabel}
        </button>
        <span role="status">{loading ? loadingLabel : readyLabel}</span>
      </div>
    </div>
  );
}

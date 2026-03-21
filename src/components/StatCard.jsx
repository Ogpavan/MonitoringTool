import { useEffect, useState } from 'react';
import styles from './StatCard.module.scss';

function AnimatedValue({ value, isLoading }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    if (isLoading) {
      setDisplayValue(0);
      return undefined;
    }

    let frameId;
    const duration = 500;
    const start = performance.now();

    const tick = (timestamp) => {
      const progress = Math.min((timestamp - start) / duration, 1);
      setDisplayValue(Math.round(value * progress));

      if (progress < 1) {
        frameId = window.requestAnimationFrame(tick);
      }
    };

    frameId = window.requestAnimationFrame(tick);

    return () => window.cancelAnimationFrame(frameId);
  }, [isLoading, value]);

  return <span className={styles.value}>{isLoading ? '...' : displayValue}</span>;
}

function StatCard({ label, value, tone, isLoading }) {
  return (
    <div className={`${styles.card} ${styles[tone]}`}>
      <div className={styles.header}>
        <span className={styles.label}>{label}</span>
      </div>
      <AnimatedValue value={value} isLoading={isLoading} />
    </div>
  );
}

export default StatCard;

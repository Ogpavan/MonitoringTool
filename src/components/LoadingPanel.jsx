import { SkeletonPlaceholder, SkeletonText } from '@carbon/react';
import styles from './LoadingPanel.module.scss';

function LoadingPanel({ rows = 4 }) {
  return (
    <div className={styles.surface}>
      <SkeletonText heading width="40%" />
      <div className={styles.stack}>
        {Array.from({ length: rows }).map((_, index) => (
          <div key={index} className={styles.row}>
            <SkeletonText width="65%" />
            <SkeletonPlaceholder className={styles.block} />
          </div>
        ))}
      </div>
    </div>
  );
}

export default LoadingPanel;


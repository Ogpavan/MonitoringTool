import { Button } from '@carbon/react';
import styles from './Recommendations.module.scss';

function Recommendations({ recommendations }) {
  if (!recommendations.length) {
    return (
      <div className={styles.surface}>
        <h3 className={styles.title}>Recommendations</h3>
        <p className={styles.empty}>No balancing recommendations at the moment.</p>
      </div>
    );
  }

  return (
    <div className={styles.surface}>
      <h3 className={styles.title}>Recommendations</h3>

      <div className={styles.list}>
        {recommendations.map((item) => (
          <div key={item.id} className={styles.card}>
            <div className={styles.copy}>
              <p className={styles.recommendation}>{item.title}</p>
              <p className={styles.impact}>{item.impact}</p>
            </div>
            <Button kind="primary" size="sm" className={styles.applyButton}>
              Apply
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Recommendations;


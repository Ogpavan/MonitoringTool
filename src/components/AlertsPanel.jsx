import { Button, Tag } from '@carbon/react';
import styles from './AlertsPanel.module.scss';

const severityMap = {
  critical: 'red',
  warning: 'yellow'
};

function AlertsPanel({ alerts }) {
  if (!alerts.length) {
    return (
      <div className={styles.surface}>
        <h3 className={styles.title}>Alerts</h3>
        <p className={styles.empty}>No active alerts. All monitored systems are stable.</p>
      </div>
    );
  }

  return (
    <div className={styles.surface}>
      <div className={styles.header}>
        <h3 className={styles.title}>Alerts</h3>
        <span className={styles.count}>{alerts.length} active</span>
      </div>

      <div className={styles.list}>
        {alerts.map((alert) => (
          <div key={alert.id} className={styles.card}>
            <span className={`${styles.severityStrip} ${styles[alert.severity]}`} aria-hidden="true" />
            <div className={styles.content}>
              <Tag size="sm" type={severityMap[alert.severity]}>{alert.severity}</Tag>
              <p className={styles.message}>{alert.title}</p>
              <span className={styles.time}>{alert.timestamp}</span>
            </div>
            <Button kind="ghost" size="sm" className={styles.action}>
              Investigate
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default AlertsPanel;

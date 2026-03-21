import { Column, Grid, Tag } from '@carbon/react';
import AlertsPanel from '../components/AlertsPanel';
import { useServerData } from '../hooks/useServerData';
import styles from './IllustrationPage.module.scss';

function AlertsPage() {
  const { alerts } = useServerData();

  return (
    <main className={styles.page}>
      <div className={styles.hero}>
        <div>
          <p className={styles.eyebrow}>Observability</p>
          <h1 className={styles.title}>Alerts</h1>
          <p className={styles.subtitle}>
            Central triage view for incident intake, severity posture, and suggested first-response actions.
          </p>
        </div>
      </div>

      <Grid fullWidth condensed className={styles.grid}>
        <Column lg={11} md={8} sm={4}>
          <AlertsPanel alerts={alerts} />
        </Column>
        <Column lg={5} md={8} sm={4}>
          <div className={styles.surface}>
            <h2 className={styles.sectionTitle}>Triage lanes</h2>
            <div className={styles.stack}>
              <div className={styles.listItem}>
                <div className={styles.listHeader}>
                  <p className={styles.listTitle}>Critical</p>
                  <Tag type="red" size="sm">
                    Immediate
                  </Tag>
                </div>
                <span className={styles.muted}>Route to on-call engineer and incident bridge.</span>
              </div>
              <div className={styles.listItem}>
                <div className={styles.listHeader}>
                  <p className={styles.listTitle}>Warning</p>
                  <Tag type="yellow" size="sm">
                    15 min
                  </Tag>
                </div>
                <span className={styles.muted}>Validate signal quality before escalation.</span>
              </div>
              <div className={styles.listItem}>
                <div className={styles.listHeader}>
                  <p className={styles.listTitle}>Noise review</p>
                  <Tag type="blue" size="sm">
                    Weekly
                  </Tag>
                </div>
                <span className={styles.muted}>Tune thresholds and deduplicate repeat events.</span>
              </div>
            </div>
          </div>
        </Column>
      </Grid>
    </main>
  );
}

export default AlertsPage;

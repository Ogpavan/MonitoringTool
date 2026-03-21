import { Column, Grid, Tag } from '@carbon/react';
import { uptimeServices } from '../data/monitoring';
import styles from './IllustrationPage.module.scss';

function UptimePage() {
  return (
    <main className={styles.page}>
      <div className={styles.hero}>
        <div>
          <p className={styles.eyebrow}>Monitoring</p>
          <h1 className={styles.title}>Uptime</h1>
          <p className={styles.subtitle}>
            Future-facing service availability workspace illustrating SLO policy planning, not a live uptime backend yet.
          </p>
        </div>
      </div>

      <Grid fullWidth condensed className={styles.grid}>
        <Column lg={16} md={8} sm={4}>
          <div className={styles.surface}>
            <div className={styles.emptyState}>
              <Tag type="cool-gray" size="lg">
                UI illustration
              </Tag>
              <h2 className={styles.sectionTitle}>Uptime workflows can land here later</h2>
              <p className={styles.subtitle}>
                This page shows how the uptime area could be framed once synthetic checks, regional probes, and SLO rollups are added.
              </p>
            </div>
          </div>
        </Column>

        <Column lg={16} md={8} sm={4}>
          <div className={styles.surface}>
            <h2 className={styles.sectionTitle}>Planned monitored services</h2>
            <div className={styles.list}>
              {uptimeServices.map((service) => (
                <div key={service.id} className={styles.listItem}>
                  <div className={styles.listHeader}>
                    <p className={styles.listTitle}>{service.service}</p>
                    <Tag type="cool-gray" size="sm">
                      {service.status}
                    </Tag>
                  </div>
                  <span className={styles.listBody}>Target SLO: {service.slo}</span>
                  <span className={styles.listBody}>Region scope: {service.region}</span>
                  <span className={styles.muted}>{service.note}</span>
                </div>
              ))}
            </div>
          </div>
        </Column>
      </Grid>
    </main>
  );
}

export default UptimePage;

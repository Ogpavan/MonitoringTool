import { Column, Grid, Tag } from '@carbon/react';
import { trackedDomains } from '../data/monitoring';
import styles from './IllustrationPage.module.scss';

function DomainTrackerPage() {
  return (
    <main className={styles.page}>
      <div className={styles.hero}>
        <div>
          <p className={styles.eyebrow}>Monitoring</p>
          <h1 className={styles.title}>Domain tracker</h1>
          <p className={styles.subtitle}>
            Portfolio-style domain oversight page showing renewals, registrar posture, and DNS ownership at a glance.
          </p>
        </div>
      </div>

      <Grid fullWidth condensed className={styles.grid}>
        <Column lg={6} md={4} sm={4}>
          <div className={styles.surface}>
            <h2 className={styles.sectionTitle}>Portfolio summary</h2>
            <div className={styles.kpiGrid}>
              <div className={styles.kpiCard}>
                <span className={styles.kpiLabel}>Tracked domains</span>
                <span className={styles.kpiValue}>18</span>
                <span className={styles.kpiMeta}>Customer, status, and internal edge properties</span>
              </div>
              <div className={styles.kpiCard}>
                <span className={styles.kpiLabel}>Renewal attention</span>
                <span className={styles.kpiValue}>2</span>
                <span className={styles.kpiMeta}>Approaching expiration inside 60-day window</span>
              </div>
            </div>
          </div>
        </Column>

        <Column lg={10} md={4} sm={4}>
          <div className={styles.surface}>
            <h2 className={styles.sectionTitle}>Tracked domains</h2>
            <div className={styles.list}>
              {trackedDomains.map((domain) => (
                <div key={domain.id} className={styles.listItem}>
                  <div className={styles.listHeader}>
                    <p className={styles.listTitle}>{domain.name}</p>
                    <Tag type={domain.status.includes('Auto-renew') ? 'green' : 'yellow'} size="sm">
                      {domain.status}
                    </Tag>
                  </div>
                  <span className={styles.listBody}>Registrar: {domain.registrar}</span>
                  <span className={styles.listBody}>DNS provider: {domain.dnsProvider}</span>
                  <span className={styles.muted}>Expiry date: {domain.expiry}</span>
                </div>
              ))}
            </div>
          </div>
        </Column>
      </Grid>
    </main>
  );
}

export default DomainTrackerPage;

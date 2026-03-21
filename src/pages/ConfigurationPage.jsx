import { Column, Grid, Tag } from '@carbon/react';
import { configurationSections } from '../data/monitoring';
import styles from './IllustrationPage.module.scss';

function ConfigurationPage() {
  return (
    <main className={styles.page}>
      <div className={styles.hero}>
        <div>
          <p className={styles.eyebrow}>Settings</p>
          <h1 className={styles.title}>Configuration</h1>
          <p className={styles.subtitle}>
            Administrative control plane layout for policies, integrations, and monitoring ownership boundaries.
          </p>
        </div>
      </div>

      <Grid fullWidth condensed className={styles.grid}>
        <Column lg={6} md={8} sm={4}>
          <div className={styles.surface}>
            <h2 className={styles.sectionTitle}>Change control</h2>
            <div className={styles.kpiGrid}>
              <div className={styles.kpiCard}>
                <span className={styles.kpiLabel}>Protected integrations</span>
                <span className={styles.kpiValue}>9</span>
                <span className={styles.kpiMeta}>Secrets held in managed vaults</span>
              </div>
              <div className={styles.kpiCard}>
                <span className={styles.kpiLabel}>Pending approvals</span>
                <span className={styles.kpiValue}>2</span>
                <span className={styles.kpiMeta}>Changes waiting on security sign-off</span>
              </div>
            </div>
          </div>
        </Column>

        <Column lg={10} md={8} sm={4}>
          <div className={styles.surface}>
            <h2 className={styles.sectionTitle}>Managed sections</h2>
            <div className={styles.list}>
              {configurationSections.map((section) => (
                <div key={section.id} className={styles.listItem}>
                  <div className={styles.listHeader}>
                    <p className={styles.listTitle}>{section.name}</p>
                    <Tag type="cool-gray" size="sm">
                      {section.owner}
                    </Tag>
                  </div>
                  <span className={styles.listBody}>{section.summary}</span>
                </div>
              ))}
            </div>
          </div>
        </Column>
      </Grid>
    </main>
  );
}

export default ConfigurationPage;

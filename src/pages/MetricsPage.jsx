import { Column, Grid, SkeletonText } from '@carbon/react';
import Charts from '../components/Charts';
import { useServerData } from '../hooks/useServerData';
import styles from './IllustrationPage.module.scss';

function MetricsPage() {
  const { cpuTrendData, loadDistributionData, isLoading } = useServerData();

  return (
    <main className={styles.page}>
      <div className={styles.hero}>
        <div>
          <p className={styles.eyebrow}>Observability</p>
          <h1 className={styles.title}>Metrics</h1>
          <p className={styles.subtitle}>
            Time-series and distribution-focused page for capacity discussions and trend inspection.
          </p>
        </div>
      </div>

      <Grid fullWidth condensed className={styles.grid}>
        <Column lg={16} md={8} sm={4}>
          {isLoading ? (
            <div className={styles.surface}>
              <SkeletonText heading width="22%" />
              <SkeletonText paragraph lineCount={10} />
            </div>
          ) : (
            <Charts cpuTrendData={cpuTrendData} loadDistributionData={loadDistributionData} />
          )}
        </Column>
        <Column lg={16} md={8} sm={4}>
          <div className={styles.surface}>
            <h2 className={styles.sectionTitle}>Observation themes</h2>
            <div className={styles.pillRow}>
              <Tag type="blue">CPU saturation</Tag>
              <Tag type="cool-gray">Memory headroom</Tag>
              <Tag type="teal">Burst patterns</Tag>
              <Tag type="purple">Workload rebalance</Tag>
            </div>
          </div>
        </Column>
      </Grid>
    </main>
  );
}

export default MetricsPage;

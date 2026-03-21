import { Column, Grid, SkeletonText } from '@carbon/react';
import Recommendations from '../components/Recommendations';
import ServerTable from '../components/ServerTable';
import { useServerData } from '../hooks/useServerData';
import styles from './IllustrationPage.module.scss';

function ServersPage() {
  const { isLoading, servers, recommendations } = useServerData();

  return (
    <main className={styles.page}>
      <div className={styles.hero}>
        <div>
          <p className={styles.eyebrow}>Inventory</p>
          <h1 className={styles.title}>Server fleet</h1>
          <p className={styles.subtitle}>
            Illustrative server inventory view with health distribution, prioritised remediation, and live load posture.
          </p>
        </div>
      </div>

      <Grid fullWidth condensed className={styles.grid}>
        <Column lg={12} md={8} sm={4}>
          {isLoading ? (
            <div className={styles.surface}>
              <SkeletonText heading width="24%" />
              <SkeletonText paragraph lineCount={10} />
            </div>
          ) : (
            <ServerTable servers={servers} />
          )}
        </Column>
        <Column lg={4} md={8} sm={4}>
          {isLoading ? (
            <div className={styles.surface}>
              <SkeletonText heading width="40%" />
              <SkeletonText paragraph lineCount={6} />
            </div>
          ) : (
            <Recommendations recommendations={recommendations} />
          )}
        </Column>
      </Grid>
    </main>
  );
}

export default ServersPage;

import { useMemo } from 'react';
import { Column, Grid, SkeletonText } from '@carbon/react';
import { CheckmarkFilled, DataBase, ErrorFilled, WarningFilled } from '@carbon/icons-react';
import Charts from '../components/Charts';
import Header from '../components/Header';
import LoadingPanel from '../components/LoadingPanel';
import ServerTable from '../components/ServerTable';
import Sidebar from '../components/Sidebar';
import { useServerData } from '../hooks/useServerData';
import styles from './Dashboard.module.scss';

const summaryItems = [
  { key: 'totalServers', label: 'Servers', icon: DataBase, tone: 'neutral' },
  { key: 'healthy', label: 'Healthy', icon: CheckmarkFilled, tone: 'healthy' },
  { key: 'warning', label: 'Warning', icon: WarningFilled, tone: 'warning' },
  { key: 'critical', label: 'Critical', icon: ErrorFilled, tone: 'critical' }
];

function SummaryRow({ summary, isLoading }) {
  return (
    <div className={styles.summaryRow}>
      {summaryItems.map((item, index) => {
        const Icon = item.icon;

        return (
          <>
            <span key={item.key} className={styles.summaryItem}>
              <span className={`${styles.summaryIcon} ${styles[item.tone]}`}>
                <Icon size={14} aria-hidden="true" />
              </span>
              <span className={styles.summaryLabel}>{item.label}:</span>
              <strong>{isLoading ? '...' : summary[item.key]}</strong>
            </span>
            {index < summaryItems.length - 1 ? <span key={`${item.key}-sep`} className={styles.separator} /> : null}
          </>
        );
      })}
    </div>
  );
}

function Dashboard() {
  const { isLoading, servers, summary, cpuTrendData, loadDistributionData, rebalanceServer } = useServerData();

  const sortedServers = useMemo(() => [...servers].sort((left, right) => right.loadScore - left.loadScore), [servers]);

  return (
    <div className={styles.page}>
      <Sidebar />

      <div className={styles.workspace}>
        <Header />

        <main className={styles.content}>
          <Grid fullWidth condensed className={styles.grid}>
            <Column lg={16} md={8} sm={4}>
              <div className={styles.summarySurface}>
                <SummaryRow summary={summary} isLoading={isLoading} />
              </div>
            </Column>

            <Column lg={16} md={8} sm={4} className={styles.mainColumn}>
              {isLoading ? (
                <LoadingPanel rows={8} />
              ) : (
                <ServerTable servers={sortedServers} onRebalance={rebalanceServer} />
              )}
            </Column>

            <Column lg={16} md={8} sm={4} className={styles.bottomColumn}>
              {isLoading ? (
                <div className={styles.chartSkeleton}>
                  <SkeletonText heading width="22%" />
                  <SkeletonText paragraph lineCount={8} />
                </div>
              ) : (
                <Charts cpuTrendData={cpuTrendData} loadDistributionData={loadDistributionData} />
              )}
            </Column>
          </Grid>
        </main>
      </div>
    </div>
  );
}

export default Dashboard;

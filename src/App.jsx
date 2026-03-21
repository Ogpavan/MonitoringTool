import { useMemo, useState } from 'react';
import AppShell from './components/AppShell';
import AlertsPage from './pages/AlertsPage';
import ConfigurationPage from './pages/ConfigurationPage';
import Dashboard from './pages/Dashboard';
import DomainTrackerPage from './pages/DomainTrackerPage';
import MetricsPage from './pages/MetricsPage';
import ServersPage from './pages/ServersPage';
import SslTrackerPage from './pages/SslTrackerPage';
import UptimePage from './pages/UptimePage';

const pageRegistry = {
  dashboard: Dashboard,
  servers: ServersPage,
  'ssl-tracker': SslTrackerPage,
  'domain-tracker': DomainTrackerPage,
  uptime: UptimePage,
  alerts: AlertsPage,
  metrics: MetricsPage,
  configuration: ConfigurationPage
};

function App() {
  const [activePage, setActivePage] = useState('dashboard');

  const ActivePage = useMemo(() => pageRegistry[activePage] ?? Dashboard, [activePage]);

  return (
    <AppShell activePage={activePage} onNavigate={setActivePage}>
      <ActivePage />
    </AppShell>
  );
}

export default App;

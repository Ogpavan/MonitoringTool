import { useEffect, useMemo, useState } from 'react';
import AppShell from './components/AppShell';
import AlertsPage from './pages/AlertsPage';
import ConfigurationPage from './pages/ConfigurationPage';
import Dashboard from './pages/Dashboard';
import DomainTrackerPage from './pages/DomainTrackerPage';
import MetricsPage from './pages/MetricsPage';
import ServersPage from './pages/ServersPage';
import SignInPage from './pages/SignInPage';
import SignUpPage from './pages/SignUpPage';
import SslTrackerPage from './pages/SslTrackerPage';
import UptimePage from './pages/UptimePage';

const STORAGE_KEY = 'server-monitor-auth-user';
const authViews = new Set(['sign-in', 'sign-up']);
const appPageRegistry = {
  dashboard: Dashboard,
  servers: ServersPage,
  'ssl-tracker': SslTrackerPage,
  'domain-tracker': DomainTrackerPage,
  uptime: UptimePage,
  alerts: AlertsPage,
  metrics: MetricsPage,
  configuration: ConfigurationPage
};

function getStoredAuthUser() {
  if (typeof window === 'undefined') {
    return null;
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function getInitialView(hasAuthUser) {
  if (typeof window === 'undefined') {
    return hasAuthUser ? 'dashboard' : 'sign-in';
  }

  const hash = window.location.hash.replace('#', '');

  if (hash && authViews.has(hash)) {
    return hash;
  }

  if (hasAuthUser && hash && appPageRegistry[hash]) {
    return hash;
  }

  return hasAuthUser ? 'dashboard' : 'sign-in';
}

function App() {
  const [authUser, setAuthUser] = useState(getStoredAuthUser);
  const [activeView, setActiveView] = useState(() => getInitialView(Boolean(getStoredAuthUser())));

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.location.hash = activeView;
    }
  }, [activeView]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    if (authUser) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(authUser));
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, [authUser]);

  useEffect(() => {
    if (!authUser && !authViews.has(activeView)) {
      setActiveView('sign-in');
    }
  }, [activeView, authUser]);

  const ActivePage = useMemo(() => {
    if (activeView === 'sign-up') {
      return SignUpPage;
    }

    if (activeView === 'sign-in') {
      return SignInPage;
    }

    return appPageRegistry[activeView] ?? Dashboard;
  }, [activeView]);

  const handleAuthSuccess = (user) => {
    setAuthUser(user);
    setActiveView('dashboard');
  };

  const handleLogout = () => {
    setAuthUser(null);
    setActiveView('sign-in');
  };

  if (authViews.has(activeView)) {
    return activeView === 'sign-up' ? (
      <ActivePage onSwitchMode={() => setActiveView('sign-in')} onSuccess={handleAuthSuccess} />
    ) : (
      <ActivePage onSwitchMode={() => setActiveView('sign-up')} onSuccess={handleAuthSuccess} />
    );
  }

  return (
    <AppShell activePage={activeView} authUser={authUser} onNavigate={setActiveView} onLogout={handleLogout}>
      <ActivePage authUser={authUser} />
    </AppShell>
  );
}

export default App;

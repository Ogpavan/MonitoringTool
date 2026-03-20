import {
  ChartLine,
  Dashboard,
  Notification,
  ServerProxy,
  Settings
} from '@carbon/icons-react';
import styles from './Sidebar.module.scss';

const navGroups = [
  {
    title: 'Overview',
    items: [
      { label: 'Dashboard', icon: Dashboard },
      { label: 'Servers', icon: ServerProxy }
    ]
  },
  {
    title: 'Observability',
    items: [
      { label: 'Alerts', icon: Notification },
      { label: 'Metrics', icon: ChartLine }
    ]
  },
  {
    title: 'Settings',
    items: [{ label: 'Configuration', icon: Settings }]
  }
];

function Sidebar() {
  return (
    <aside className={styles.sidebar}>
      <div className={styles.brand}>
        <div className={styles.logo}>SM</div>
        <div className={styles.brandText}>
          <span className={styles.product}>Server Monitor</span>
          <span className={styles.caption}>Ops control plane</span>
        </div>
      </div>

      <nav className={styles.nav} aria-label="Primary navigation">
        {navGroups.map((group) => (
          <div key={group.title} className={styles.group}>
            <p className={styles.groupTitle}>{group.title}</p>
            <div className={styles.groupItems}>
              {group.items.map((item) => {
                const Icon = item.icon;

                return (
                  <button
                    key={item.label}
                    type="button"
                    className={`${styles.navItem} ${item.label === 'Dashboard' ? styles.active : ''}`}>
                    <Icon size={16} className={styles.navIcon} aria-hidden="true" />
                    <span className={styles.navLabel}>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
}

export default Sidebar;

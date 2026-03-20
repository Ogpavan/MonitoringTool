import { Search } from '@carbon/react';
import { Notification, UserAvatarFilledAlt } from '@carbon/icons-react';
import styles from './Header.module.scss';

function Header() {
  return (
    <header className={styles.header}>
      <div className={styles.leading}>
        <div className={styles.pageIndicator}>
          <span className={styles.pageLabel}>Page</span>
          <span className={styles.pageName}>Dashboard</span>
        </div>

        <div className={styles.searchWrap}>
          <Search
            id="dashboard-search"
            size="sm"
            labelText="Search servers"
            placeholder="Search servers"
            closeButtonLabelText="Clear search input"
            className={styles.search}
          />
        </div>
      </div>

      <div className={styles.actions}>
        <button type="button" className={styles.notificationButton} aria-label="Notifications">
          <Notification size={18} />
          <span className={styles.notificationDot} aria-hidden="true" />
        </button>

        <button type="button" className={styles.profileButton}>
          <span className={styles.profileAvatar}>
            <UserAvatarFilledAlt size={18} />
          </span>
          <span className={styles.profileCopy}>
            <span className={styles.profileName}>Admin User</span>
            <span className={styles.profileRole}>Operations</span>
          </span>
        </button>
      </div>
    </header>
  );
}

export default Header;

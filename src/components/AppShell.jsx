import { useEffect, useRef, useState } from 'react';
import {
  Content,
  Header,
  HeaderContainer,
  HeaderGlobalAction,
  HeaderGlobalBar,
  HeaderMenuButton,
  HeaderMenuItem,
  HeaderName,
  HeaderNavigation,
  Search,
  SideNav,
  SideNavItems,
  SideNavLink,
  SideNavMenu,
  SideNavMenuItem,
  SkipToContent,
  Theme
} from '@carbon/react';
import {
  Activity,
  CertificateCheck,
  ChartLine,
  ChevronDown,
  CloudMonitoring,
  Dashboard,
  DirectoryDomain,
  Notification,
  ServerProxy,
  Settings,
  UserAvatar
} from '@carbon/icons-react';
import styles from './AppShell.module.scss';

const headerLinks = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'servers', label: 'Servers' },
  { id: 'metrics', label: 'Metrics' }
];

function NavItemLabel({ icon: Icon, children, note }) {
  return (
    <span className={styles.navItemLabel}>
      <span className={styles.navItemIcon} aria-hidden="true">
        <Icon size={16} />
      </span>
      <span>{children}</span>
      {note ? <span className={styles.navItemNote}>{note}</span> : null}
    </span>
  );
}

function AppShell({ activePage, authUser, onNavigate, onLogout, children }) {
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef(null);
  const profileName = authUser?.fullName || authUser?.email || 'Operator';
  const profileMeta = authUser?.teamName || authUser?.email || 'Monitoring workspace';

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setIsProfileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, []);

  return (
    <HeaderContainer
      render={({ isSideNavExpanded, onClickSideNavExpand }) => {
        const navigateTo = (pageId, shouldCloseSideNav = false) => (event) => {
          event.preventDefault();
          onNavigate(pageId);

          if (shouldCloseSideNav && isSideNavExpanded) {
            onClickSideNavExpand();
          }
        };

        const handleProfileNavigate = (pageId) => {
          onNavigate(pageId);
          setIsProfileMenuOpen(false);
        };

        const handleLogoutClick = () => {
          setIsProfileMenuOpen(false);
          onLogout();
        };

        return (
          <>
            <SkipToContent />
            <Theme theme="g100">
              <Header aria-label="Server Monitor">
                <HeaderMenuButton
                  aria-label={isSideNavExpanded ? 'Close navigation menu' : 'Open navigation menu'}
                  onClick={onClickSideNavExpand}
                  isCollapsible
                  isActive={isSideNavExpanded}
                />
                <HeaderName href="#" prefix="IBM">
                  Server Monitor
                </HeaderName>
                <HeaderNavigation aria-label="Server Monitor">
                  {headerLinks.map((item) => (
                    <HeaderMenuItem key={item.id} href="#" onClick={navigateTo(item.id)} isCurrentPage={activePage === item.id}>
                      {item.label}
                    </HeaderMenuItem>
                  ))}
                </HeaderNavigation>
                <div className={styles.searchSlot}>
                  <Search
                    id="app-shell-search"
                    size="sm"
                    labelText="Search servers"
                    placeholder="Search servers"
                    closeButtonLabelText="Clear search input"
                  />
                </div>
                <HeaderGlobalBar>
                  <HeaderGlobalAction aria-label="Notifications" tooltipAlignment="end">
                    <Notification size={20} />
                  </HeaderGlobalAction>
                  <div className={styles.profileMenuWrap} ref={profileMenuRef}>
                    <button
                      type="button"
                      className={styles.profileTrigger}
                      aria-haspopup="menu"
                      aria-expanded={isProfileMenuOpen}
                      onClick={() => setIsProfileMenuOpen((current) => !current)}>
                      <span className={styles.profileIdentity}>
                        <span className={styles.profileAvatar} aria-hidden="true">
                          <UserAvatar size={20} />
                        </span>
                        <span className={styles.profileCopy}>
                          <span className={styles.profileName}>{profileName}</span>
                          <span className={styles.profileMeta}>{profileMeta}</span>
                        </span>
                      </span>
                      <span className={styles.profileChevron} aria-hidden="true">
                        <ChevronDown size={16} />
                      </span>
                    </button>

                    {isProfileMenuOpen ? (
                      <div className={styles.profileDropdown} role="menu" aria-label="Profile menu">
                        <button type="button" className={styles.profileMenuItem} onClick={() => handleProfileNavigate('configuration')}>
                          Profile
                        </button>
                        <button type="button" className={styles.profileMenuItem} onClick={() => handleProfileNavigate('configuration')}>
                          Account Security
                        </button>
                        <button type="button" className={styles.profileMenuItemDanger} onClick={handleLogoutClick}>
                          Logout
                        </button>
                      </div>
                    ) : null}
                  </div>
                </HeaderGlobalBar>
                <SideNav
                  aria-label="Side navigation"
                  expanded={isSideNavExpanded}
                  isPersistent={false}
                  className={styles.sideNav}>
                  <SideNavItems>
                    <SideNavLink href="#" renderIcon={Dashboard} isActive={activePage === 'dashboard'} onClick={navigateTo('dashboard', true)}>
                      Dashboard
                    </SideNavLink>
                    <SideNavLink href="#" renderIcon={ServerProxy} isActive={activePage === 'servers'} onClick={navigateTo('servers', true)}>
                      Servers
                    </SideNavLink>
                    <SideNavMenu renderIcon={CloudMonitoring} title="Monitoring" defaultExpanded>
                      <SideNavMenuItem href="#" isActive={activePage === 'ssl-tracker'} onClick={navigateTo('ssl-tracker', true)}>
                        <NavItemLabel icon={CertificateCheck}>SSL Tracker</NavItemLabel>
                      </SideNavMenuItem>
                      <SideNavMenuItem href="#" isActive={activePage === 'domain-tracker'} onClick={navigateTo('domain-tracker', true)}>
                        <NavItemLabel icon={DirectoryDomain}>Domain Tracker</NavItemLabel>
                      </SideNavMenuItem>
                      <SideNavMenuItem href="#" isActive={activePage === 'uptime'} onClick={navigateTo('uptime', true)}>
                        <NavItemLabel icon={Activity} note="Later">
                          Uptime
                        </NavItemLabel>
                      </SideNavMenuItem>
                    </SideNavMenu>
                    <SideNavMenu renderIcon={ChartLine} title="Observability" defaultExpanded>
                      <SideNavMenuItem href="#" isActive={activePage === 'alerts'} onClick={navigateTo('alerts', true)}>
                        Alerts
                      </SideNavMenuItem>
                      <SideNavMenuItem href="#" isActive={activePage === 'metrics'} onClick={navigateTo('metrics', true)}>
                        Metrics
                      </SideNavMenuItem>
                    </SideNavMenu>
                    <SideNavMenu renderIcon={Settings} title="Settings">
                      <SideNavMenuItem href="#" isActive={activePage === 'configuration'} onClick={navigateTo('configuration', true)}>
                        Configuration
                      </SideNavMenuItem>
                    </SideNavMenu>
                  </SideNavItems>
                </SideNav>
              </Header>
            </Theme>

            <Content id="main-content" className={styles.content}>
              {children}
            </Content>
          </>
        );
      }}
    />
  );
}

export default AppShell;

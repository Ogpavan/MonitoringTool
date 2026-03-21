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
  Dashboard,
  DirectoryDomain,
  CloudMonitoring,
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

function AppShell({ activePage, onNavigate, children }) {
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
                  <HeaderGlobalAction aria-label="User profile" tooltipAlignment="end">
                    <UserAvatar size={20} />
                  </HeaderGlobalAction>
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

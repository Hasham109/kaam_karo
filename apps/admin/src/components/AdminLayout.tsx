/**
 * Admin Portal Layout Component
 * Requirements: BP §8.4, BP §27, §34; D-026 (English only); A11Y-002..005.
 * Features:
 * - Environment banner (Development / Staging / Production)
 * - Navigation links dynamically filtered by sub-role access (screens with 'none' access are hidden)
 * - Staff profile card with sub-role badges
 * - Sign out button
 * - 403 Forbidden state renderer
 */

'use client';

import { useState, type ReactNode } from 'react';
import { translate } from '@kaamkaro/i18n';
import { useAdminAuth } from '../auth/admin-auth-context';
import { ADMIN_SCREENS_METADATA } from '../auth/access-matrix';
import { SUB_ROLE_ABBREVIATIONS, type AdminScreenId } from '../auth/types';

interface AdminLayoutProps {
  children: ReactNode;
  activeScreenId?: AdminScreenId;
  onNavigate?: (route: string) => void;
}

export function AdminLayout({ children, activeScreenId = 'A02', onNavigate }: AdminLayoutProps) {
  const { user, isAuthenticated, environment, logout, canAccess } = useAdminAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // If not authenticated, render content directly (e.g. login screen)
  if (!isAuthenticated || !user) {
    return <div className="admin-root-unauth">{children}</div>;
  }

  // Filter navigation links: Only include screens where staff has >= 'view' access
  const visibleNavScreens = ADMIN_SCREENS_METADATA.filter((screen) => canAccess(screen.id, 'view'));

  const handleNavClick = (route: string) => {
    if (onNavigate) {
      onNavigate(route);
    } else if (typeof window !== 'undefined') {
      window.location.href = route;
    }
  };

  const envKey =
    environment === 'staging'
      ? 'admin.env.staging'
      : environment === 'production'
        ? 'admin.env.production'
        : 'admin.env.development';

  return (
    <div className="admin-container" data-testid="admin-layout-root">
      {/* Top Header */}
      <header className="admin-header" data-testid="admin-header">
        <div className="admin-header-left">
          <button
            type="button"
            className="mobile-menu-toggle"
            aria-label={translate('en', 'admin.nav.toggle_menu')}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            ☰
          </button>
          <div className="admin-brand">
            <span className="brand-title">{translate('en', 'admin.brand.title')}</span>
            <span className="brand-subtitle">{translate('en', 'admin.brand.subtitle')}</span>
          </div>
          <div className={`env-badge env-${environment}`} data-testid="admin-env-badge">
            {translate('en', envKey)}
          </div>
        </div>

        <div className="admin-header-right">
          <div className="user-profile-badge" data-testid="admin-user-badge">
            <div className="user-info">
              <span className="user-name">{user.name}</span>
              <span className="user-phone">{user.maskedPhone}</span>
            </div>
            <div className="sub-role-chips" data-testid="admin-subroles-list">
              {user.subRoles.map((role) => (
                <span
                  key={role}
                  className={`role-chip role-${role.toLowerCase()}`}
                  title={role}
                  data-testid={`badge-role-${role}`}
                >
                  {SUB_ROLE_ABBREVIATIONS[role] || role}
                </span>
              ))}
            </div>
          </div>

          <button
            type="button"
            className="btn-signout"
            data-testid="admin-signout-btn"
            onClick={logout}
          >
            {translate('en', 'admin.btn.signout')}
          </button>
        </div>
      </header>

      {/* Main Container */}
      <div className="admin-body">
        {/* Navigation Sidebar */}
        <aside
          className={`admin-sidebar ${mobileMenuOpen ? 'open' : ''}`}
          data-testid="admin-nav-sidebar"
        >
          <div className="sidebar-section-title">{translate('en', 'admin.nav.title')}</div>
          <nav className="admin-nav-menu">
            {visibleNavScreens.map((screen) => {
              const isActive = activeScreenId === screen.id;
              return (
                <button
                  key={screen.id}
                  type="button"
                  className={`nav-item ${isActive ? 'active' : ''}`}
                  data-testid={`nav-link-${screen.id.toLowerCase()}`}
                  onClick={() => handleNavClick(screen.route)}
                >
                  <span className="nav-id">{screen.id}</span>
                  <span className="nav-title">{screen.title}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Content Area */}
        <main className="admin-main-content" data-testid="admin-main-viewport">
          {children}
        </main>
      </div>
    </div>
  );
}

/**
 * 403 Forbidden Screen State (UX-SCREEN-003, ADMIN-ROLE-003)
 */
export function Forbidden403View({
  screenTitle = 'Fees & Commissions',
  screenId = 'A13',
  onReturnToDashboard,
}: {
  screenTitle?: string | undefined;
  screenId?: AdminScreenId | undefined;
  onReturnToDashboard?: (() => void) | undefined;
}) {
  const { user } = useAdminAuth();
  const subRolesList = user?.subRoles.join(', ') || 'None';

  return (
    <div className="forbidden-container" data-testid={`${screenId.toLowerCase()}-forbidden-403`}>
      <div className="forbidden-card">
        <div className="forbidden-icon">🚫</div>
        <h1 className="forbidden-title">{translate('en', 'admin.forbidden.title')}</h1>
        <p className="forbidden-message">
          {translate('en', 'admin.forbidden.desc', { screen: screenTitle, id: screenId })}
        </p>
        <div className="forbidden-details">
          <div>{translate('en', 'admin.forbidden.current_role', { roles: subRolesList })}</div>
          <div>{translate('en', 'admin.forbidden.required_perm')}</div>
        </div>
        <p className="forbidden-guidance">{translate('en', 'admin.forbidden.guidance')}</p>
        {onReturnToDashboard && (
          <button
            type="button"
            className="btn-return"
            data-testid="forbidden-return-btn"
            onClick={onReturnToDashboard}
          >
            {translate('en', 'admin.forbidden.return_btn')}
          </button>
        )}
      </div>
    </div>
  );
}

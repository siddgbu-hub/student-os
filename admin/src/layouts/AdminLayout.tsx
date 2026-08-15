import React, { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  CreditCard,
  ShieldCheck,
  LogOut,
  Menu,
  X,
  Shield,
  Activity,
} from 'lucide-react';
import { useAdminAuth } from '../context/AdminAuthContext.js';
import { Badge } from '../components/ui/Badge.js';
import { Button } from '../components/ui/Button.js';

export const AdminLayout: React.FC = () => {
  const { logout, adminProfile } = useAdminAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  const navItems = [
    { to: '/overview', label: 'Overview', icon: LayoutDashboard },
    { to: '/students', label: 'Students', icon: Users },
    { to: '/payments', label: 'Payments', icon: CreditCard },
    { to: '/audit', label: 'Audit Log', icon: ShieldCheck },
  ];

  const getSectionTitle = () => {
    if (location.pathname.startsWith('/overview')) return 'Overview & Analytics';
    if (location.pathname.startsWith('/students')) return 'Student Directory';
    if (location.pathname.startsWith('/payments')) return 'Payments Ledger';
    if (location.pathname.startsWith('/audit')) return 'Audit Trail';
    return 'Command Center';
  };

  return (
    <div className="socc-layout-root">
      {/* 1. MOBILE TOPBAR (Visible only on < 1024px screens) */}
      <header className="socc-mobile-topbar">
        <div className="socc-brand">
          <div className="socc-brand-icon">
            <Shield className="w-4 h-4" />
          </div>
          <div>
            <span className="socc-brand-title">Student OS</span>
            <span className="socc-brand-badge">SOCC</span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="socc-mobile-menu-btn"
          aria-label="Toggle navigation menu"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </header>

      {/* 2. MOBILE DRAWER NAVIGATION (Overlay on < 1024px screens when opened) */}
      {mobileMenuOpen && (
        <div
          className="socc-mobile-drawer-backdrop"
          onClick={() => setMobileMenuOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <aside
            className="socc-mobile-drawer"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="socc-sidebar-top">
              <div className="socc-sidebar-brand">
                <div className="flex items-center gap-3">
                  <div className="socc-brand-icon-lg">
                    <Shield className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <h2 className="socc-brand-title-lg">Student OS</h2>
                    <p className="socc-brand-subtitle">Command Center</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="socc-mobile-menu-btn"
                  aria-label="Close navigation menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <nav className="socc-nav-list" aria-label="Mobile Navigation">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      onClick={() => setMobileMenuOpen(false)}
                      className={({ isActive }) =>
                        `socc-nav-item ${isActive ? 'active' : ''}`
                      }
                    >
                      <Icon className="socc-nav-icon" />
                      <span>{item.label}</span>
                    </NavLink>
                  );
                })}
              </nav>
            </div>

            <div className="socc-sidebar-footer">
              <div className="socc-session-status">
                <div className="socc-live-indicator">
                  <span className="socc-live-dot" />
                  <span className="socc-live-text">SOCC Engine Live</span>
                </div>
                <Badge variant="neutral" size="sm">
                  {adminProfile?.role || 'Admin'}
                </Badge>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={logout}
                className="w-full justify-center"
              >
                <LogOut className="w-3.5 h-3.5 mr-1.5" />
                Sign Out
              </Button>
            </div>
          </aside>
        </div>
      )}

      {/* 3. DESKTOP PERSISTENT VERTICAL SIDEBAR (Visible on >= 1024px screens, 260px wide, sticky 100vh) */}
      <aside className="socc-desktop-sidebar">
        <div className="socc-sidebar-top">
          {/* Desktop Branding Header */}
          <div className="socc-sidebar-brand">
            <div className="flex items-center gap-3">
              <div className="socc-brand-icon-lg">
                <Shield className="w-4.5 h-4.5" />
              </div>
              <div>
                <h2 className="socc-brand-title-lg">Student OS</h2>
                <p className="socc-brand-subtitle">Command Center</p>
              </div>
            </div>
            <Badge variant="pro" size="sm">v1.0</Badge>
          </div>

          {/* Desktop Vertical Navigation Menu */}
          <nav className="socc-nav-list" aria-label="Primary Navigation">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `socc-nav-item ${isActive ? 'active' : ''}`
                  }
                >
                  <Icon className="socc-nav-icon" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Desktop Session / Footer */}
        <div className="socc-sidebar-footer">
          <div className="socc-session-status">
            <div className="socc-live-indicator">
              <span className="socc-live-dot" />
              <span className="socc-live-text">SOCC Engine Live</span>
            </div>
            <Badge variant="neutral" size="sm">
              {adminProfile?.role || 'Admin'}
            </Badge>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={logout}
            className="w-full justify-center"
          >
            <LogOut className="w-3.5 h-3.5 mr-1.5" />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* 4. MAIN APPLICATION WORKSPACE (Beside the desktop sidebar, full available width) */}
      <div className="socc-main-wrapper">
        {/* Desktop Sticky Header */}
        <header className="socc-desktop-header">
          <h2 className="socc-header-title">{getSectionTitle()}</h2>
          <div className="socc-header-status">
            <Activity className="w-3.5 h-3.5 text-emerald-400" />
            <span>Production Control</span>
          </div>
        </header>

        {/* Page Content Outlet */}
        <main className="socc-main-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

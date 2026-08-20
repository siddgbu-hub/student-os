import React, { useState } from 'react';
import { NavLink, Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  CreditCard,
  ShieldCheck,
  Sliders,
  LogOut,
  Menu,
  X,
  Shield,
  Activity,
  ArrowLeft,
} from 'lucide-react';
import { useAdminAuth } from '../context/AdminAuthContext.js';
import { Badge } from '../components/ui/Badge.js';
import { Button } from '../components/ui/Button.js';

export const AdminLayout: React.FC = () => {
  const { logout, adminProfile } = useAdminAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = [
    { to: '/overview', label: 'Overview', icon: LayoutDashboard },
    { to: '/students', label: 'Students', icon: Users },
    { to: '/payments', label: 'Payments', icon: CreditCard },
    { to: '/config', label: 'App Config', icon: Sliders },
    { to: '/audit', label: 'Audit Log', icon: ShieldCheck },
  ];

  const getSectionTitle = () => {
    if (location.pathname.startsWith('/overview')) return 'Overview & Analytics';
    if (location.pathname.startsWith('/students')) return 'Student Directory';
    if (location.pathname.startsWith('/payments')) return 'Payments Ledger';
    if (location.pathname.startsWith('/config')) return 'App Configuration & Governance';
    if (location.pathname.startsWith('/audit')) return 'Audit Trail';
    return 'Command Center';
  };

  const handleBack = () => {
    if (window.history.length > 1 && location.key !== 'default') {
      navigate(-1);
    } else {
      navigate('/overview');
    }
  };

  // Show the Back button only when we have a meaningful previous page inside SOCC
  const showBackButton = location.key !== 'default' && location.pathname !== '/overview';

  return (
    <div className="socc-layout-root">
      {/* 1. MOBILE TOPBAR (Visible only on < 1024px screens) */}
      <header className="socc-mobile-topbar">
        <div className="flex items-center gap-2">
          {showBackButton && (
            <button
              type="button"
              onClick={handleBack}
              className="socc-back-btn"
              aria-label="Go back"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Back</span>
            </button>
          )}

          <Link
            to="/overview"
            className="socc-brand"
            aria-label="Go to Overview"
          >
            <div className="socc-brand-icon">
              <Shield className="w-4 h-4 text-indigo-400" />
            </div>
            <div>
              <span className="socc-brand-title font-bold text-slate-100">Kryvlance</span>
              <span className="socc-brand-badge text-indigo-400 font-medium ml-1.5">Admin</span>
            </div>
          </Link>
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
                <Link
                  to="/overview"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 cursor-pointer"
                  aria-label="Go to Overview"
                >
                  <div className="socc-brand-icon-lg">
                    <Shield className="w-4.5 h-4.5 text-indigo-400" />
                  </div>
                  <div>
                    <h2 className="socc-brand-title-lg font-bold text-slate-100">Kryvlance</h2>
                    <p className="socc-brand-subtitle text-xs text-indigo-400 font-medium">Student OS Admin</p>
                  </div>
                </Link>
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
                  <span className="socc-live-text">Admin Engine Live</span>
                </div>
                <Badge variant="neutral" size="sm">
                  {adminProfile?.role
                    ? adminProfile.role.charAt(0).toUpperCase() + adminProfile.role.slice(1)
                    : 'Admin'}
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
              <div className="text-[10px] text-slate-500 text-center pt-2 mt-2 border-t border-slate-800/80">
                © 2026 Kryvlance · Student OS Admin
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* 3. DESKTOP PERSISTENT VERTICAL SIDEBAR (Visible on >= 1024px screens, 260px wide, sticky 100vh) */}
      <aside className="socc-desktop-sidebar">
        <div className="socc-sidebar-top">
          {/* Desktop Branding Header — Clickable to /overview */}
          <Link
            to="/overview"
            className="socc-sidebar-brand"
            aria-label="Go to Overview"
          >
            <div className="flex items-center gap-3">
              <div className="socc-brand-icon-lg">
                <Shield className="w-4.5 h-4.5 text-indigo-400" />
              </div>
              <div>
                <h2 className="socc-brand-title-lg font-bold text-slate-100 text-base">Kryvlance</h2>
                <p className="socc-brand-subtitle text-xs text-indigo-400 font-medium">Student OS Admin</p>
              </div>
            </div>
            <Badge variant="pro" size="sm">Admin</Badge>
          </Link>

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
              <span className="socc-live-text">Admin Engine Live</span>
            </div>
            <Badge variant="neutral" size="sm">
              {adminProfile?.role
                ? adminProfile.role.charAt(0).toUpperCase() + adminProfile.role.slice(1)
                : 'Admin'}
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
          <div className="text-[10px] text-slate-500 text-center pt-2 mt-2 border-t border-slate-800/80">
            © 2026 Kryvlance · Student OS Admin
          </div>
        </div>
      </aside>

      {/* 4. MAIN APPLICATION WORKSPACE (Beside the desktop sidebar, full available width) */}
      <div className="socc-main-wrapper">
        {/* Desktop Sticky Header with Back Button */}
        <header className="socc-desktop-header">
          <div className="flex items-center gap-3">
            {showBackButton && (
              <button
                type="button"
                onClick={handleBack}
                className="socc-back-btn"
                aria-label="Go back"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
            )}
            <h2 className="socc-header-title">{getSectionTitle()}</h2>
          </div>
          <div className="socc-header-status">
            <Activity className="w-3.5 h-3.5 text-emerald-400" />
            <span>Production Control</span>
          </div>
        </header>

        {/* Page Content Outlet */}
        <main className="socc-main-content">
          <Outlet />
        </main>

        <footer className="px-6 py-4 text-center text-xs text-slate-500 border-t border-slate-800/50 mt-auto">
          © 2026 Kryvlance · Student OS Admin
        </footer>
      </div>
    </div>
  );
};

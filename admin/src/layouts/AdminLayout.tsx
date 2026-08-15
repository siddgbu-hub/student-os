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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between px-4 py-3 bg-slate-900 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold shadow-sm">
            <Shield className="w-4 h-4" />
          </div>
          <div>
            <span className="font-bold text-sm text-white">Student OS</span>
            <span className="text-xs text-blue-400 font-medium ml-1.5">SOCC</span>
          </div>
        </div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 text-slate-400 hover:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="Toggle navigation menu"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Sidebar Navigation */}
      <aside
        className={`
          ${mobileMenuOpen ? 'block' : 'hidden'}
          md:block md:w-64 md:flex-shrink-0 bg-slate-900 border-r border-slate-800 flex flex-col justify-between
          z-30
        `}
      >
        <div>
          {/* Desktop Branding Header */}
          <div className="hidden md:flex items-center justify-between p-5 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold shadow-md shadow-blue-900/30">
                <Shield className="w-4.5 h-4.5" />
              </div>
              <div>
                <h2 className="font-bold text-sm tracking-tight text-white leading-tight">Student OS</h2>
                <p className="text-[11px] font-medium text-slate-400">Command Center</p>
              </div>
            </div>
            <Badge variant="pro" size="sm">v1.0</Badge>
          </div>

          {/* Nav Items */}
          <nav className="p-3 space-y-1" aria-label="Primary Navigation">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) => `
                    flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all
                    ${
                      isActive
                        ? 'bg-blue-600/15 text-blue-400 border border-blue-500/30 font-semibold'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent'
                    }
                  `}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* User / Session Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/80">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs text-slate-300 font-medium">SOCC Engine Live</span>
            </div>
            <Badge variant="neutral" size="sm">
              {adminProfile?.role || 'Admin'}
            </Badge>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={logout}
            className="w-full justify-center text-slate-400 hover:text-rose-400 hover:border-rose-800/60"
          >
            <LogOut className="w-3.5 h-3.5 mr-1.5" />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Main Content Workspace */}
      <div className="flex-1 flex flex-col min-w-0 bg-slate-950">
        {/* Top Header */}
        <header className="hidden md:flex items-center justify-between px-8 py-4 border-b border-slate-800/80 bg-slate-950/60 backdrop-blur-sm sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-white tracking-tight">{getSectionTitle()}</h2>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-xs text-slate-300">
              <Activity className="w-3.5 h-3.5 text-emerald-400" />
              <span>Production Control</span>
            </div>
          </div>
        </header>

        {/* Main Routed Page Outlet */}
        <main className="flex-1 p-4 sm:p-6 md:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

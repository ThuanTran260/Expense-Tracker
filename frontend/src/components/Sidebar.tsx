import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  ArrowLeftRight,
  PiggyBank,
  Coins,
  Settings,
  LogOut,
  Wallet,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from '../contexts/LanguageContext';

export default function Sidebar() {
  const { user, logout } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const navItems = [
    { to: '/dashboard', icon: LayoutDashboard, label: t('nav.dashboard') },
    { to: '/transactions', icon: ArrowLeftRight, label: t('nav.transactions') },
    { to: '/budgets', icon: PiggyBank, label: t('nav.budgets') },
    { to: '/exchange-rates', icon: Coins, label: t('nav.exchangeRates') },
    { to: '/settings', icon: Settings, label: t('nav.settings') },
  ];

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <h1>
          <Wallet size={20} />
          {t('nav.appName')}
        </h1>
        <p className="sidebar-subtitle">{t('nav.appSubtitle')}</p>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* User info + Logout */}
      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="sidebar-avatar">
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <div style={{ overflow: 'hidden' }}>
            <p className="sidebar-user-name">{user?.name}</p>
            <p className="sidebar-user-email">{user?.email}</p>
          </div>
        </div>
        <button className="nav-item" onClick={handleLogout}>
          <LogOut size={16} />
          {t('nav.logout')}
        </button>
      </div>
    </aside>
  );
}

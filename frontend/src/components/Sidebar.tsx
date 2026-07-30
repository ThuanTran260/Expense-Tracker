import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  ArrowLeftRight,
  PiggyBank,
  Settings,
  LogOut,
  Wallet,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/transactions', icon: ArrowLeftRight, label: 'Giao dịch' },
  { to: '/budgets', icon: PiggyBank, label: 'Ngân sách' },
  { to: '/settings', icon: Settings, label: 'Cài đặt' },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <h1>
          <Wallet size={20} color="#6366f1" />
          Chi Tiêu
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', margin: '0.25rem 0 0' }}>
          Quản lý tài chính
        </p>
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
          <div style={{
            width: 36, height: 36, borderRadius: '50%',
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', fontWeight: 700, fontSize: '0.9rem', flexShrink: 0,
          }}>
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <div style={{ overflow: 'hidden' }}>
            <p style={{ margin: 0, color: 'white', fontSize: '0.85rem', fontWeight: 600,
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user?.name}
            </p>
            <p style={{ margin: 0, color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user?.email}
            </p>
          </div>
        </div>
        <button className="nav-item" onClick={handleLogout} style={{ color: 'rgba(255,255,255,0.6)' }}>
          <LogOut size={16} />
          Đăng xuất
        </button>
      </div>
    </aside>
  );
}

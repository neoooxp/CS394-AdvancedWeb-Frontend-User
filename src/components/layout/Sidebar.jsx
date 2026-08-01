import { useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Navigation,
  Wrench,
  Calendar,
  User,
  AlertTriangle,
  LogOut,
} from 'lucide-react';

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
  { id: 'route', label: 'My Route', icon: Navigation, path: '/my-route' },
  { id: 'maintenance', label: 'Maintenance Requests', icon: Wrench, path: '/maintenance' },
  { id: 'schedule', label: 'Schedule', icon: Calendar, path: '/schedule' },
  { id: 'profile', label: 'Profile', icon: User, path: '/profile' },
];

export function Sidebar({ onLogout, onReportIncident }) {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <aside className="sidebar">
      {/* Brand Logo */}
      <div className="sidebar-brand" onClick={() => navigate('/dashboard')} style={{ cursor: 'pointer' }}>
        <h1 className="sidebar-logo-text">SBMS</h1>
      </div>

      {/* Nav List */}
      <nav className="sidebar-nav">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive =
            location.pathname === item.path ||
            (item.path === '/dashboard' && (location.pathname === '/' || location.pathname === '/dashboard'));
          return (
            <button
              key={item.id}
              onClick={() => navigate(item.path)}
              className={`nav-item ${isActive ? 'active' : ''}`}
            >
              <Icon size={20} className="nav-icon" />
              <span className="nav-label">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Bottom Footer Actions */}
      <div className="sidebar-footer">
        <button
          type="button"
          onClick={onReportIncident}
          className="report-incident-btn"
        >
          <AlertTriangle size={18} />
          <span>Report Incident</span>
        </button>

        <button
          type="button"
          onClick={onLogout}
          className="logout-btn"
        >
          <LogOut size={18} />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}


import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { HeartPulse, MessageSquare, FileText, User, LogOut } from 'lucide-react';
import { useAuth } from '../AuthContext';

function getInitials(name) {
  if (!name || !String(name).trim()) return '?';
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function AppShell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function onLogout() {
    logout();
    navigate('/');
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <span className="brand-mark"><HeartPulse size={20} /></span>
          <div>
            <strong>MediConsult</strong>
            <small>Clinical guidance</small>
          </div>
        </div>
        <nav className="sidebar-nav">
          <NavLink to="/app" end><MessageSquare size={18} /> Consult</NavLink>
          <NavLink to="/app/reports"><FileText size={18} /> Reports</NavLink>
          <NavLink to="/app/profile"><User size={18} /> Profile</NavLink>
        </nav>
        <div className="sidebar-footer">
          <div className="user-chip">
            <span className="avatar" aria-hidden="true">
              {getInitials(user?.full_name)}
            </span>
            <div className="user-meta">
              <strong className="user-name" title={user?.full_name || ''}>
                {user?.full_name || 'User'}
              </strong>
              <small className="user-email" title={user?.email || ''}>
                {user?.email || ''}
              </small>
            </div>
          </div>
          <button type="button" className="btn btn-ghost btn-sm signout-btn" onClick={onLogout}>
            <LogOut size={16} /> Sign out
          </button>
        </div>
      </aside>
      <div className="app-main">
        <Outlet />
      </div>
    </div>
  );
}

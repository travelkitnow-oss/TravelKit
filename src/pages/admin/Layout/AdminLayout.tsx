import { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Menu } from 'lucide-react';
import Sidebar from '../../../components/Sidebar/Sidebar';
import './AdminLayout.css';

export default function AdminLayout() {
  const [userEmail, setUserEmail] = useState<string>('Lucía');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => { setSidebarOpen(false); }, [location.pathname]);

  useEffect(() => {
    const adminUser = localStorage.getItem('travelkit_admin');
    if (adminUser === 'travelkitnow@gmail.com') {
      setUserEmail('Lucía');
    } else {
      navigate('/login');
    }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('travelkit_admin');
    navigate('/');
  };

  return (
    <div className="admin-layout">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <div className={`sidebar-wrapper ${sidebarOpen ? 'open' : ''}`}>
        <Sidebar userEmail={userEmail} handleLogout={handleLogout} />
      </div>

      {/* Right side: topbar + content */}
      <div className="admin-right">
        <div className="mobile-topbar">
          <button className="hamburger-btn" onClick={() => setSidebarOpen(true)}>
            <Menu size={22} />
          </button>
          <span className="mobile-app-title">Travel Kit</span>
          <div style={{ width: 40 }} />
        </div>

        <main className="admin-main">
          <div className="admin-content">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

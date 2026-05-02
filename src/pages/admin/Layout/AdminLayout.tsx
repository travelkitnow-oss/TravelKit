import { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import Sidebar from '../../../components/Sidebar/Sidebar';
import './AdminLayout.css';

export default function AdminLayout() {
  const [userEmail, setUserEmail] = useState<string>('Lucía');
  const navigate = useNavigate();

  useEffect(() => {
    const checkSession = () => {
      // Check for exclusive admin
      const adminUser = localStorage.getItem('travelkit_admin');
      if (adminUser === 'travelkitnow@gmail.com') {
        setUserEmail('Lucía');
      } else {
        // Not logged in
        navigate('/login');
      }
    };
    checkSession();
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('travelkit_admin');
    navigate('/');
  };

  return (
    <div className="admin-layout">
      <Sidebar userEmail={userEmail} handleLogout={handleLogout} />
      <main className="admin-main">
        <div className="admin-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

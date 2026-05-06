import { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import ClientSidebar from '../../../components/Sidebar/ClientSidebar';
import './ClientLayout.css';

export default function ClientLayout() {
  const [clientData, setClientData] = useState<{name: string, id: string} | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const checkSession = () => {
      const storedClient = localStorage.getItem('travelkit_client');
      if (storedClient) {
        setClientData(JSON.parse(storedClient));
      } else {
        navigate('/login');
      }
    };
    checkSession();
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('travelkit_client');
    navigate('/');
  };

  if (!clientData) return null;

  return (
    <div className="client-layout">
      <ClientSidebar clientName={clientData.name} handleLogout={handleLogout} />
      <main className="client-main">
        <div className="client-content">
          <Outlet context={{ clientId: clientData.id }} />
        </div>
      </main>
    </div>
  );
}

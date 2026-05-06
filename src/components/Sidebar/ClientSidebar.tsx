import { NavLink } from 'react-router-dom';
import { 
  Calendar, 
  CreditCard, 
  LogOut, 
  User,
  Compass,
  Settings,
  MapPin,
  Star,
  Receipt
} from 'lucide-react';
import './Sidebar.css'; // Reusing base sidebar styles

interface ClientSidebarProps {
  clientName: string;
  handleLogout: () => void;
}

export default function ClientSidebar({ clientName, handleLogout }: ClientSidebarProps) {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <Compass className="text-accent" size={32} />
        <h1 className="sidebar-title">Travel Kit</h1>
      </div>

      <nav className="sidebar-nav">
        <NavLink to="/portal/agenda" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <Calendar size={20} />
          <span>Agenda de Viaje</span>
        </NavLink>
        
        <NavLink to="/portal/liquidacion" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <CreditCard size={20} />
          <span>Mi Liquidación</span>
        </NavLink>
        
        <NavLink to="/portal/servicios" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <Receipt size={20} />
          <span>Servicios Contratados</span>
        </NavLink>

        <NavLink to="/portal/encuesta" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <MapPin size={20} />
          <span>Encuesta de Viaje</span>
        </NavLink>

        <NavLink to="/portal/resena" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <Star size={20} />
          <span>Dejar Reseña</span>
        </NavLink>

        <NavLink to="/portal/historial" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <History size={20} />
          <span>Mi Historial</span>
        </NavLink>

        <NavLink to="/portal/configuracion" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
          <Settings size={20} />
          <span>Configuración</span>
        </NavLink>
      </nav>

      <div className="sidebar-footer">
        <div className="user-profile">
          <div className="avatar">
            <User size={20} />
          </div>
          <div className="user-info">
            <span className="user-name" style={{ color: '#FFFFFF' }}>{clientName}</span>
            <span className="user-role">Viajero</span>
          </div>
          <button className="logout-icon-btn" onClick={handleLogout} title="Cerrar Sesión">
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </aside>
  );
}

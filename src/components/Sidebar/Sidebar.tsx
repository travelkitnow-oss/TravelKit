import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  Calendar as CalendarIcon,
  Link as LinkIcon,
  User,
  LogOut,
  DollarSign,
  MessageSquare,
  Users,
  ClipboardList,
  Receipt,
  Plane,
  Map,
  Bus,
  Hotel,
  ChevronDown,
  Briefcase,
  Calculator
} from 'lucide-react';
import './Sidebar.css';

interface SidebarProps {
  userEmail: string;
  handleLogout: () => void;
}

export default function Sidebar({ userEmail, handleLogout }: SidebarProps) {
  const location = useLocation();
  const [isViajeOpen, setIsViajeOpen] = useState(true);

  // Check if any sub-item is active to keep dropdown open if needed
  const viajeRoutes = ['/excursiones', '/transportes', '/hoteles', '/agenda-clientes', '/pasajes'];
  const isAnyViajeActive = viajeRoutes.some(route => location.pathname === route);

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <img src="/travel-kit-logo.jpg" alt="Travel Kit Logo" className="sidebar-logo" />
        <h2 className="sidebar-title">Travel Kit</h2>
      </div>

      <nav className="sidebar-nav">
        <NavLink
          to="/consultas"
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
        >
          <MessageSquare size={20} />
          Consultas
        </NavLink>
        <NavLink
          to="/mi-agenda"
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
        >
          <CalendarIcon size={20} />
          Mi Agenda
        </NavLink>
        <NavLink
          to="/costos"
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
        >
          <Receipt size={20} />
          Costos
        </NavLink>
        <NavLink
          to="/tareas"
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
        >
          <ClipboardList size={20} />
          Tareas
        </NavLink>

        {/* --- DROPDOWN VIAJE --- */}
        <div className={`nav-dropdown ${isAnyViajeActive ? 'child-active' : ''}`}>
          <button 
            className={`nav-item dropdown-toggle ${isViajeOpen ? 'open' : ''}`}
            onClick={() => setIsViajeOpen(!isViajeOpen)}
          >
            <Briefcase size={20} />
            <span>Viaje</span>
            <ChevronDown size={16} className="chevron" />
          </button>
          
          <div className={`dropdown-content ${isViajeOpen ? 'show' : ''}`}>
            <NavLink
              to="/hoteles"
              className={({ isActive }) => `nav-item sub-item ${isActive ? 'active' : ''}`}
            >
              <Hotel size={18} />
              Hoteles
            </NavLink>
            <NavLink
              to="/excursiones"
              className={({ isActive }) => `nav-item sub-item ${isActive ? 'active' : ''}`}
            >
              <Map size={18} />
              Excursiones
            </NavLink>
            <NavLink
              to="/transportes"
              className={({ isActive }) => `nav-item sub-item ${isActive ? 'active' : ''}`}
            >
              <Bus size={18} />
              Transportes
            </NavLink>
            <NavLink
              to="/pasajes"
              className={({ isActive }) => `nav-item sub-item ${isActive ? 'active' : ''}`}
            >
              <Plane size={18} />
              Pasajes
            </NavLink>
            <NavLink
              to="/agenda-clientes"
              className={({ isActive }) => `nav-item sub-item ${isActive ? 'active' : ''}`}
            >
              <CalendarIcon size={18} />
              Agenda del cliente
            </NavLink>
          </div>
        </div>

        <NavLink
          to="/clientes"
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
        >
          <Users size={20} />
          Clientes
        </NavLink>
        <NavLink
          to="/ganancias"
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
        >
          <DollarSign size={20} />
          Mis Ganancias
        </NavLink>
        <NavLink
          to="/liquidacion"
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
        >
          <Calculator size={20} />
          Liquidación
        </NavLink>
        <NavLink
          to="/formulario"
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
        >
          <LinkIcon size={20} />
          Formulario
        </NavLink>
      </nav>

      <div className="sidebar-footer">
        <div className="user-profile">
          <div className="avatar">
            <User size={20} />
          </div>
          <div className="user-info">
            <span className="user-name">{userEmail}</span>
            <span className="user-role">Travel Planner</span>
          </div>
          <button
            className="logout-icon-btn"
            onClick={handleLogout}
            title="Cerrar Sesión"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </aside>
  );
}

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
  Landmark,
  Map,
  Bus,
  Hotel,
  ChevronDown,
  Briefcase,
  Calculator,
  Compass,
  ShieldCheck,
  Star,
  History
} from 'lucide-react';
import './Sidebar.css';

interface SidebarProps {
  userEmail: string;
  handleLogout: () => void;
}

export default function Sidebar({ userEmail, handleLogout }: SidebarProps) {
  const location = useLocation();
  const [isViajeOpen, setIsViajeOpen] = useState(false);
  const [isFormulariosOpen, setIsFormulariosOpen] = useState(false);
  const [isMonetizacionOpen, setIsMonetizacionOpen] = useState(false);
  const [isPrincipalOpen, setIsPrincipalOpen] = useState(false);

  // Check if any sub-item is active to keep dropdown open if needed
  const viajeRoutes = ['/excursiones', '/transportes', '/hoteles', '/agenda-clientes', '/pasajes'];
  const isAnyViajeActive = viajeRoutes.some(route => location.pathname === route);

  const formulariosRoutes = ['/formulario', '/viaje-ideal', '/respuestas-viaje-ideal'];
  const isAnyFormularioActive = formulariosRoutes.some(route => location.pathname === route);

  const monetizacionRoutes = ['/ganancias', '/datos-bancarios', '/liquidacion'];
  const isAnyMonetizacionActive = monetizacionRoutes.some(route => location.pathname === route);

  const principalRoutes = ['/destinos', '/editar-principal'];
  const isAnyPrincipalActive = principalRoutes.some(route => location.pathname === route);

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <img src="/travel-kit-logo.jpg" alt="Travel Kit Logo" className="sidebar-logo" />
        <h2 className="sidebar-title">Travel Kit</h2>
      </div>

      <nav className="sidebar-nav">
        {/* 1. Consultas */}
        <NavLink
          to="/consultas"
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
        >
          <MessageSquare size={20} />
          Consultas
        </NavLink>

        {/* 2. Mi Agenda */}
        <NavLink
          to="/mi-agenda"
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
        >
          <CalendarIcon size={20} />
          Mi Agenda
        </NavLink>

        {/* 3. Costos */}
        <NavLink
          to="/costos"
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
        >
          <Receipt size={20} />
          Costos
        </NavLink>

        {/* 4. Clientes */}
        <NavLink
          to="/clientes"
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
        >
          <Users size={20} />
          Clientes
        </NavLink>

        {/* 5. Tareas */}
        <NavLink
          to="/tareas"
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
        >
          <ClipboardList size={20} />
          Tareas
        </NavLink>

        {/* 6. Viaje (Dropdown) */}
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

        {/* 7. Monetizacion (Dropdown) */}
        <div className={`nav-dropdown ${isAnyMonetizacionActive ? 'child-active' : ''}`}>
          <button 
            className={`nav-item dropdown-toggle ${isMonetizacionOpen ? 'open' : ''}`}
            onClick={() => setIsMonetizacionOpen(!isMonetizacionOpen)}
          >
            <DollarSign size={20} />
            <span>Monetización</span>
            <ChevronDown size={16} className="chevron" />
          </button>
          
          <div className={`dropdown-content ${isMonetizacionOpen ? 'show' : ''}`}>
            <NavLink
              to="/ganancias"
              className={({ isActive }) => `nav-item sub-item ${isActive ? 'active' : ''}`}
            >
              <DollarSign size={18} />
              Mis Ganancias
            </NavLink>
            <NavLink
              to="/datos-bancarios"
              className={({ isActive }) => `nav-item sub-item ${isActive ? 'active' : ''}`}
            >
              <Landmark size={18} />
              Datos Bancarios
            </NavLink>
            <NavLink
              to="/liquidacion"
              className={({ isActive }) => `nav-item sub-item ${isActive ? 'active' : ''}`}
            >
              <Calculator size={18} />
              Liquidación
            </NavLink>
          </div>
        </div>

        {/* 8. Formularios (Dropdown) */}
        <div className={`nav-dropdown ${isAnyFormularioActive ? 'child-active' : ''}`}>
          <button 
            className={`nav-item dropdown-toggle ${isFormulariosOpen ? 'open' : ''}`}
            onClick={() => setIsFormulariosOpen(!isFormulariosOpen)}
          >
            <ClipboardList size={20} />
            <span>Formularios</span>
            <ChevronDown size={16} className="chevron" />
          </button>
          
          <div className={`dropdown-content ${isFormulariosOpen ? 'show' : ''}`}>
            <NavLink
              to="/formulario"
              className={({ isActive }) => `nav-item sub-item ${isActive ? 'active' : ''}`}
            >
              <LinkIcon size={18} />
              Formulario Base
            </NavLink>
            <NavLink
              to="/viaje-ideal"
              className={({ isActive }) => `nav-item sub-item ${isActive ? 'active' : ''}`}
            >
              <Compass size={18} />
              Viaje Ideal
            </NavLink>
            <NavLink
              to="/respuestas-viaje-ideal"
              className={({ isActive }) => `nav-item sub-item ${isActive ? 'active' : ''}`}
            >
              <MessageSquare size={18} />
              Respuestas Ideal
            </NavLink>
          </div>
        </div>

        {/* 9. Pagina Principal (Dropdown) */}
        <div className={`nav-dropdown ${isAnyPrincipalActive ? 'child-active' : ''}`}>
          <button 
            className={`nav-item dropdown-toggle ${isPrincipalOpen ? 'open' : ''}`}
            onClick={() => setIsPrincipalOpen(!isPrincipalOpen)}
          >
            <Compass size={20} />
            <span>Pagina Principal</span>
            <ChevronDown size={16} className="chevron" />
          </button>
          
          <div className={`dropdown-content ${isPrincipalOpen ? 'show' : ''}`}>
            <NavLink
              to="/destinos"
              className={({ isActive }) => `nav-item sub-item ${isActive ? 'active' : ''}`}
            >
              <Map size={18} />
              Recomendaciones
            </NavLink>
            <NavLink
              to="/editar-principal"
              className={({ isActive }) => `nav-item sub-item ${isActive ? 'active' : ''}`}
            >
              <LinkIcon size={18} />
              Editar Principal
            </NavLink>
          </div>
        </div>

        {/* 10. Reseñas */}
        <NavLink
          to="/resenas"
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
        >
          <Star size={20} />
          Reseñas
        </NavLink>

        {/* 11. Historial de Viajes */}
        <NavLink
          to="/historial"
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
        >
          <History size={20} />
          Historial de Viajes
        </NavLink>

        {/* 12. Gestion de Usuarios */}
        <NavLink
          to="/gestion-usuarios"
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
        >
          <ShieldCheck size={20} />
          Gestión de Usuarios
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

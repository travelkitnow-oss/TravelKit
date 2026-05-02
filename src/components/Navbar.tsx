import { Menu } from 'lucide-react';
import { Link } from 'react-router-dom';
import './Navbar.css';

export default function Navbar() {
  return (
    <nav className="navbar glass">
      <div className="container navbar-content">
        <div className="logo">
          <img src="/travel-kit-logo.jpg" alt="Travel Kit Logo" className="navbar-logo" />
          <span className="logo-text">Travel Kit</span>
        </div>
        
        <div className="nav-links">
          <a href="#inicio" className="nav-link">Inicio</a>
          <a href="#servicios" className="nav-link">Servicios</a>
          <a href="#sesion" className="nav-link">Agendar Sesión</a>
        </div>
        
        <div className="nav-actions">
          <Link to="/login" className="btn btn-outline" style={{ border: 'none' }}>
            Portal Admin
          </Link>
          <a href="#sesion" className="btn btn-primary">Reserva Ahora</a>
          <button className="mobile-menu-btn">
            <Menu size={24} />
          </button>
        </div>
      </div>
    </nav>
  );
}

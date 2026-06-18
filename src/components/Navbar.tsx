import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import './Navbar.css';

export default function Navbar() {
  const [open, setOpen] = useState(false);

  const close = () => setOpen(false);

  return (
    <>
      <nav className={`navbar glass ${open ? 'menu-open' : ''}`}>
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
            <Link to="/login" className="btn btn-outline desktop-only" style={{ border: 'none' }}>
              Portal Admin
            </Link>
            <a href="#sesion" className="btn btn-primary desktop-only">Reserva Ahora</a>
            <button
              className="mobile-menu-btn"
              onClick={() => setOpen(o => !o)}
              aria-label={open ? 'Cerrar menú' : 'Abrir menú'}
            >
              {open ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </nav>

      {open && (
        <div className="mobile-menu-overlay" onClick={close}>
          <div className="mobile-menu-panel" onClick={e => e.stopPropagation()}>
            <a href="#inicio" className="mobile-menu-link" onClick={close}>Inicio</a>
            <a href="#servicios" className="mobile-menu-link" onClick={close}>Servicios</a>
            <a href="#sesion" className="mobile-menu-link" onClick={close}>Agendar Sesión</a>
            <div className="mobile-menu-divider" />
            <Link to="/login" className="mobile-menu-link" onClick={close}>Portal Admin</Link>
            <a href="#sesion" className="btn btn-primary mobile-menu-cta" onClick={close}>
              Reserva Ahora
            </a>
          </div>
        </div>
      )}
    </>
  );
}

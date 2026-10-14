import { useEffect, useState } from 'react';
import { Menu, X, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import './Navbar.css';

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const close = () => setOpen(false);

  return (
    <>
      <nav className={`navbar ${scrolled || open ? 'navbar-solid' : ''} ${open ? 'menu-open' : ''}`} aria-label="Principal">
        <div className="container navbar-content">
          <a href="#inicio" className="logo" aria-label="Travel Kit — inicio">
            <img src="/travel-kit-logo.jpg" alt="" className="navbar-logo" />
            <span className="logo-text">Travel Kit</span>
          </a>

          <div className="nav-links">
            <a href="#servicios" className="nav-link">Servicios</a>
            <a href="#proceso" className="nav-link">Cómo trabajamos</a>
            <a href="#destinos" className="nav-link">Destinos</a>
            <a href="#sesion" className="nav-link">Agendar sesión</a>
          </div>

          <div className="nav-actions">
            <Link to="/login" className="nav-login desktop-only">
              Ingresar
            </Link>
            <a href="#sesion" className="btn btn-accent btn-sm desktop-only">
              Reservar sesión <ArrowRight size={16} />
            </a>
            <button
              className="mobile-menu-btn"
              onClick={() => setOpen(o => !o)}
              aria-label={open ? 'Cerrar menú' : 'Abrir menú'}
              aria-expanded={open}
            >
              {open ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
      </nav>

      {open && (
        <div className="mobile-menu-overlay" onClick={close}>
          <div className="mobile-menu-panel" onClick={e => e.stopPropagation()}>
            <a href="#servicios" className="mobile-menu-link" onClick={close}>Servicios</a>
            <a href="#proceso" className="mobile-menu-link" onClick={close}>Cómo trabajamos</a>
            <a href="#destinos" className="mobile-menu-link" onClick={close}>Destinos</a>
            <a href="#sesion" className="mobile-menu-link" onClick={close}>Agendar sesión</a>
            <div className="mobile-menu-divider" />
            <Link to="/login" className="mobile-menu-link" onClick={close}>Ingresar al portal</Link>
            <a href="#sesion" className="btn btn-accent mobile-menu-cta" onClick={close}>
              Reservar sesión
            </a>
          </div>
        </div>
      )}
    </>
  );
}

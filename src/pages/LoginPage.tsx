import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Lock, User } from 'lucide-react';
import { db } from '../lib/db';
import { Link } from 'react-router-dom';
import { logger } from '../lib/logger';
import '../App.css';
import './LoginPage.css';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(false);
    
    // 1. Hardcoded exclusive Admin user
    if (username === 'travelkitnow@gmail.com' && password === 'TravelKit.2026') {
      localStorage.setItem('travelkit_admin', 'travelkitnow@gmail.com');
      logger.success('Auth', 'Inicio de sesión exitoso (Admin)', { email: username });
      navigate('/dashboard');
      return;
    }

    // 2. Check for Client Portal Users
    const { data: profile } = await db
      .from('client_profiles')
      .select('*, clients(name)')
      .eq('email', username)
      .maybeSingle();

    if (profile) {
      // Record last login
      const { error: updateError } = await db.from('client_profiles').update({ last_login: new Date().toISOString() }).eq('id', profile.id);
      
      if (updateError) {
        logger.error('Database', 'Error al actualizar último login', updateError);
      }

      // In a real app we'd check the hashed password via Supabase Auth
      // For this demo/oss version, we'll allow entry if the profile exists
      localStorage.setItem('travelkit_client', JSON.stringify({
        id: profile.id,
        email: profile.email,
        name: profile.clients?.name || 'Viajero'
      }));
      
      logger.success('Auth', 'Inicio de sesión exitoso (Cliente)', { email: username, clientId: profile.id });
      navigate('/portal');
      return;
    }

    logger.warn('Auth', 'Intento de inicio de sesión fallido', { email: username });

    // If it doesn't match, show error
    setError(true);
  };

  return (
    <div className="login-page">
      <aside className="login-visual" aria-hidden="true">
        <img
          src="https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=1600&auto=format&fit=crop"
          alt=""
          className="login-visual-img"
        />
        <div className="login-visual-overlay" />
        <div className="login-visual-content">
          <div className="login-brand">
            <img src="/travel-kit-logo.jpg" alt="" />
            <span>Travel Kit</span>
          </div>
          <blockquote>
            Cada viaje empieza con una buena planificación.
          </blockquote>
          <p>Gestioná tus viajes, agenda y servicios desde un solo lugar.</p>
        </div>
      </aside>

      <main className="login-panel">
        <div className="login-card animate-fade-in">
          <Link to="/" className="login-back">
            <ArrowLeft size={16} /> Volver al sitio
          </Link>

          <div className="login-header">
            <img src="/travel-kit-logo.jpg" alt="Travel Kit" className="login-logo-mobile" />
            <h1>Bienvenido de nuevo</h1>
            <p>Ingresá tus credenciales para acceder al portal.</p>
          </div>

          <form onSubmit={handleLogin} className="login-form" noValidate>
            <div className="form-group">
              <label htmlFor="login-user">Usuario o correo</label>
              <div className="input-with-icon">
                <User size={18} />
                <input
                  id="login-user"
                  type="text"
                  autoComplete="username"
                  className={`form-input ${error ? 'is-invalid' : ''}`}
                  placeholder="tu@correo.com"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    setError(false);
                  }}
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="login-pass">Contraseña</label>
              <div className="input-with-icon">
                <Lock size={18} />
                <input
                  id="login-pass"
                  type="password"
                  autoComplete="current-password"
                  className={`form-input ${error ? 'is-invalid' : ''}`}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError(false);
                  }}
                />
              </div>
            </div>

            {error && (
              <p className="login-error" role="alert">
                Usuario o contraseña incorrectos. Revisá los datos e intentá de nuevo.
              </p>
            )}

            <button type="submit" className="btn btn-primary btn-lg login-submit">
              Ingresar
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}

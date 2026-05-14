import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Lock, User } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Link } from 'react-router-dom';
import { logger } from '../lib/logger';
import '../App.css';

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
    const { data: profile } = await supabase
      .from('client_profiles')
      .select('*, clients(name)')
      .eq('email', username)
      .maybeSingle();

    if (profile) {
      // Record last login
      const { error: updateError } = await supabase.from('client_profiles').update({ last_login: new Date().toISOString() }).eq('id', profile.id);
      
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
    <div className="login-page" style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      backgroundColor: 'var(--color-bg)',
      padding: '2rem'
    }}>
      <div className="login-card glass" style={{
        maxWidth: '400px',
        width: '100%',
        padding: '3rem 2rem',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-xl)',
        textAlign: 'center'
      }}>
        <div style={{ marginBottom: '2rem' }}>
          <img 
            src="/travel-kit-logo.jpg" 
            alt="Travel Kit Logo" 
            style={{ 
              width: '80px', 
              height: '80px', 
              borderRadius: '50%', 
              objectFit: 'cover',
              border: '3px solid var(--color-accent)',
              marginBottom: '1rem'
            }} 
          />
          <h2 style={{ fontFamily: 'var(--font-serif)', color: 'var(--color-primary)' }}>Acceso Portal</h2>
          <p style={{ color: 'var(--color-secondary)', fontSize: '0.9rem' }}>Ingresa tus credenciales para continuar</p>
        </div>

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ position: 'relative' }}>
            <div style={{ position: 'absolute', top: '50%', left: '1rem', transform: 'translateY(-50%)', color: 'var(--color-tertiary)' }}>
              <User size={18} />
            </div>
            <input 
              type="text" 
              placeholder="Usuario o Correo" 
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                setError(false);
              }}
              style={{
                width: '100%',
                padding: '1rem 1rem 1rem 2.5rem',
                borderRadius: 'var(--radius-md)',
                border: `1px solid ${error && !username ? 'red' : 'var(--color-tertiary)'}`,
                outline: 'none',
                fontFamily: 'var(--font-main)'
              }}
            />
          </div>

          <div style={{ position: 'relative' }}>
            <div style={{ position: 'absolute', top: '50%', left: '1rem', transform: 'translateY(-50%)', color: 'var(--color-tertiary)' }}>
              <Lock size={18} />
            </div>
            <input 
              type="password" 
              placeholder="Contraseña" 
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError(false);
              }}
              style={{
                width: '100%',
                padding: '1rem 1rem 1rem 2.5rem',
                borderRadius: 'var(--radius-md)',
                border: `1px solid ${error && !password ? 'red' : 'var(--color-tertiary)'}`,
                outline: 'none',
                fontFamily: 'var(--font-main)'
              }}
            />
          </div>
          
          <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
            Ingresar
          </button>
        </form>

        <div style={{ marginTop: '2rem' }}>
          <Link to="/" style={{ 
            display: 'inline-flex', 
            alignItems: 'center', 
            gap: '0.5rem', 
            color: 'var(--color-secondary)',
            fontSize: '0.875rem',
            textDecoration: 'none'
          }}>
            <ArrowLeft size={16} /> Volver a la página principal
          </Link>
        </div>
      </div>
    </div>
  );
}

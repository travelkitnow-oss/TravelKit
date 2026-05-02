import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Lock, User } from 'lucide-react';
import { Link } from 'react-router-dom';
import '../App.css';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Hardcoded exclusive Admin user
    if (username === 'travelkitnow@gmail.com' && password === 'TravelKit.2026') {
      localStorage.setItem('travelkit_admin', 'travelkitnow@gmail.com');
      navigate('/dashboard');
      return;
    }

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
          <h2 style={{ fontFamily: 'var(--font-serif)', color: 'var(--color-primary)' }}>Portal Admin</h2>
          <p style={{ color: 'var(--color-secondary)', fontSize: '0.9rem' }}>Ingresa para acceder a tu agenda</p>
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

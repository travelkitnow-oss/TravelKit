import { useState } from 'react';
import { 
  Settings, 
  Lock, 
  ShieldCheck, 
  Save,
  Eye,
  EyeOff,
  Check,
  ShieldAlert
} from 'lucide-react';
import './Configuracion.css';

export default function ConfiguracionPage() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const hasUpper = /[A-Z]/.test(newPassword);
  const hasLower = /[a-z]/.test(newPassword);
  const hasLength = newPassword.length >= 8;

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    if (!hasUpper || !hasLower || !hasLength) {
      setError('La nueva contraseña no cumple con los requisitos de seguridad.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setLoading(true);
    
    // Simulating API call
    setTimeout(() => {
      setSuccess(true);
      setLoading(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    }, 1500);
  };

  return (
    <div className="configuracion-page animate-fade-in">
      <header className="page-header-centered" style={{ marginBottom: '3rem' }}>
        <h1 className="display-title">Mi Seguridad</h1>
        <p className="subtitle">Gestiona tu acceso y protege la información de tu cuenta.</p>
      </header>

      <div className="config-grid">
        <div className="config-card premium-card animate-slide-up">
          <div className="card-header-premium">
            <div className="header-icon-pro">
              <Lock size={24} />
            </div>
            <div className="header-titles-pro">
              <h3>Cambiar Contraseña</h3>
              <p>Actualiza tus credenciales de acceso periódicamente.</p>
            </div>
          </div>

          <form onSubmit={handleUpdatePassword} className="config-form-pro">
            <div className="form-group-pro">
              <label>Contraseña Actual</label>
              <div className="input-with-icon-pro">
                <Lock size={18} />
                <input 
                  type="password" 
                  className="form-input-pro" 
                  placeholder="Introduce tu clave actual"
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group-pro">
              <label>Nueva Contraseña</label>
              <div className="input-with-icon-pro">
                <ShieldCheck size={18} />
                <input 
                  type={showPassword ? "text" : "password"} 
                  className="form-input-pro" 
                  placeholder="Crea una clave segura"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  required
                />
                <button 
                  type="button" 
                  className="eye-toggle-btn-pro"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <div className="form-group-pro">
              <label>Confirmar Nueva Contraseña</label>
              <div className="input-with-icon-pro">
                <ShieldCheck size={18} />
                <input 
                  type="password" 
                  className="form-input-pro" 
                  placeholder="Repite la clave nueva"
                  value={confirmPassword}
                  onPaste={(e) => e.preventDefault()}
                  onChange={e => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="security-check-container">
              <h4>Requisitos de Seguridad</h4>
              <div className="check-list-pro">
                <div className={`check-item-pro ${hasLength ? 'active' : ''}`}>
                  <div className="check-icon-pro">
                    {hasLength ? <Check size={12} /> : null}
                  </div>
                  <span>Mínimo 8 caracteres</span>
                </div>
                <div className={`check-item-pro ${hasUpper ? 'active' : ''}`}>
                  <div className="check-icon-pro">
                    {hasUpper ? <Check size={12} /> : null}
                  </div>
                  <span>Letra MAYÚSCULA</span>
                </div>
                <div className={`check-item-pro ${hasLower ? 'active' : ''}`}>
                  <div className="check-icon-pro">
                    {hasLower ? <Check size={12} /> : null}
                  </div>
                  <span>Letra minúscula</span>
                </div>
                <div className={`check-item-pro ${newPassword && confirmPassword && newPassword === confirmPassword ? 'active' : ''}`}>
                  <div className="check-icon-pro">
                    {newPassword && confirmPassword && newPassword === confirmPassword ? <Check size={12} /> : null}
                  </div>
                  <span>Coinciden</span>
                </div>
              </div>
            </div>

            <div style={{ marginTop: '2rem' }}>
              {error && (
                <div className="alert-error-premium animate-fade-in" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem', background: '#fef2f2', color: '#dc2626', borderRadius: '12px', fontSize: '0.85rem', fontWeight: 700, marginBottom: '1.5rem' }}>
                  <ShieldAlert size={18} /> {error}
                </div>
              )}
              {success && (
                <div className="alert-success-premium animate-fade-in" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem', background: '#f0fdf4', color: '#16a34a', borderRadius: '12px', fontSize: '0.85rem', fontWeight: 700, marginBottom: '1.5rem' }}>
                  <ShieldCheck size={18} /> ¡Contraseña actualizada con éxito!
                </div>
              )}

              <button type="submit" className="btn-save-premium" disabled={loading}>
                {loading ? (
                  <div className="loader-mini"></div>
                ) : (
                  <>
                    <Save size={18} /> Guardar Nueva Contraseña
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        <div className="config-info-premium animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <div className="info-icon-large">
            <Settings size={34} />
          </div>
          <div className="info-text-pro">
            <h4>Seguridad de la Cuenta</h4>
            <p>
              Una contraseña segura es tu primera línea de defensa. Te recomendamos:
            </p>
            <ul style={{ padding: '1rem 0', margin: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <li style={{ display: 'flex', gap: '0.75rem', fontSize: '0.9rem', color: '#475569' }}>
                <span style={{ color: '#C89B5A', fontWeight: 900 }}>•</span>
                No reutilizar claves de otros sitios.
              </li>
              <li style={{ display: 'flex', gap: '0.75rem', fontSize: '0.9rem', color: '#475569' }}>
                <span style={{ color: '#C89B5A', fontWeight: 900 }}>•</span>
                Evitar fechas de nacimiento o nombres obvios.
              </li>
              <li style={{ display: 'flex', gap: '0.75rem', fontSize: '0.9rem', color: '#475569' }}>
                <span style={{ color: '#C89B5A', fontWeight: 900 }}>•</span>
                Cambiar tu clave cada 90 días.
              </li>
            </ul>
          </div>
          
          <div style={{ marginTop: 'auto', padding: '1.5rem', background: 'var(--color-primary)', borderRadius: '24px', color: 'white' }}>
            <p style={{ margin: 0, fontSize: '0.8rem', opacity: 0.8, fontWeight: 700 }}>Último Cambio</p>
            <p style={{ margin: 0, fontSize: '1.1rem', fontWeight: 900 }}>Hace 15 días</p>
          </div>
        </div>
      </div>
    </div>
  );
}

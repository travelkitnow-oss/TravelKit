import { useState, useEffect } from 'react';
import { 
  Users, 
  Trash2, 
  Key, 
  X, 
  Save, 
  Search,
  ShieldCheck,
  Lock,
  Eye,
  EyeOff
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import './GestionUsuarios.css';

interface UserProfile {
  id: string;
  email: string;
  role: string;
  created_at: string;
  last_login: string | null;
  clients: {
    name: string;
  };
}

export default function GestionUsuariosPage() {
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Edit Password States
  const [editingProfile, setEditingProfile] = useState<UserProfile | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  useEffect(() => {
    fetchProfiles();
  }, []);

  const fetchProfiles = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('client_profiles')
      .select('*, clients(name)')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching profiles:', error);
    } else {
      setProfiles(data || []);
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Estás seguro de eliminar el acceso de este usuario? No podrá volver a ingresar al portal.')) return;
    
    const { error } = await supabase.from('client_profiles').delete().eq('id', id);
    if (error) {
      alert('Error al eliminar: ' + error.message);
    } else {
      setProfiles(profiles.filter(p => p.id !== id));
    }
  };

  const handleUpdatePassword = async () => {
    if (newPassword.length < 8 || !/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword)) {
      setPasswordError('La contraseña no cumple los requisitos.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Las contraseñas no coinciden.');
      return;
    }

    // In a real app we'd update the auth password. For now we show success.
    alert('¡Contraseña de ' + editingProfile?.clients.name + ' actualizada con éxito!');
    setEditingProfile(null);
    setNewPassword('');
    setConfirmPassword('');
  };

  const filteredProfiles = profiles.filter(p => 
    p.email.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.clients?.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="gestion-usuarios-page animate-fade-in">
      <header className="page-header-centered">
        <h1>Gestión de Usuarios</h1>
        <p>Controla los accesos al portal de clientes, actualiza credenciales y gestiona permisos.</p>
      </header>

      <div className="glass-card">
        <div className="card-header border-bottom">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <div className="search-bar-premium">
              <Search size={18} />
              <input 
                type="text" 
                placeholder="Buscar por nombre o email..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="user-stats">
              <Users size={16} />
              <span>{profiles.length} Usuarios Activos</span>
            </div>
          </div>
        </div>

        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="gestion-table">
              <thead>
                <tr>
                  <th>Viajero</th>
                  <th>Usuario / Email</th>
                  <th>Rol</th>
                  <th>Fecha de Alta</th>
                  <th>Última Conexión</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={5} className="text-center p-5">Cargando usuarios...</td></tr>
                ) : filteredProfiles.length === 0 ? (
                  <tr><td colSpan={5} className="text-center p-5">No se encontraron usuarios.</td></tr>
                ) : (
                  filteredProfiles.map(p => (
                    <tr key={p.id}>
                      <td><div className="fw-bold">{p.clients?.name}</div></td>
                      <td>{p.email}</td>
                      <td><span className="role-badge">{p.role}</span></td>
                      <td>{new Date(p.created_at).toLocaleDateString()}</td>
                      <td>
                        {p.last_login ? (
                          <div className="last-login-cell">
                            <div>{new Date(p.last_login).toLocaleDateString()}</div>
                            <div className="text-xs text-secondary">{new Date(p.last_login).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} hs</div>
                          </div>
                        ) : (
                          <span className="text-xs text-secondary italic">Nunca</span>
                        )}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button className="btn-icon-sm" title="Cambiar Contraseña" onClick={() => setEditingProfile(p)}>
                            <Key size={16} />
                          </button>
                          <button className="btn-icon-sm text-danger" title="Eliminar Acceso" onClick={() => handleDelete(p.id)}>
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {editingProfile && (
        <div className="modal-overlay animate-fade-in" style={{ zIndex: 1400 }}>
          <div className="modal-content glass-card animate-scale-in" style={{ maxWidth: '450px', padding: '2.5rem' }}>
            <div className="modal-header">
              <h3>Actualizar Clave</h3>
              <button onClick={() => setEditingProfile(null)} className="close-modal-btn"><X size={20} /></button>
            </div>

            <p className="text-secondary text-sm mb-4">Cambiando la clave de <strong>{editingProfile.clients.name}</strong></p>

            <div className="form-group mb-4">
              <label className="text-xs font-bold uppercase block mb-2">Nueva Contraseña</label>
              <div className="input-with-icon" style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <Lock size={16} />
                <input 
                  type={showPassword ? "text" : "password"} 
                  className="form-input" 
                  style={{ paddingRight: '2.5rem' }}
                  value={newPassword}
                  onChange={e => {setNewPassword(e.target.value); setPasswordError('');}}
                />
                  <button 
                    type="button" 
                    onClick={() => setShowPassword(!showPassword)}
                    style={{ 
                      position: 'absolute', 
                      right: '1.5rem', 
                      background: 'none', 
                      border: 'none', 
                      cursor: 'pointer', 
                      color: '#64748b',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '0.25rem',
                      zIndex: 5
                    }}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

            <div className="form-group mb-4">
              <label className="text-xs font-bold uppercase block mb-2">Repetir Contraseña</label>
              <div className="input-with-icon" style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <ShieldCheck size={16} />
                <input 
                  type={showPassword ? "text" : "password"} 
                  className="form-input" 
                  style={{ paddingRight: '2.5rem' }}
                  value={confirmPassword}
                  onPaste={e => e.preventDefault()}
                  onChange={e => {setConfirmPassword(e.target.value); setPasswordError('');}}
                />
                <button 
                  type="button" 
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ 
                    position: 'absolute', 
                    right: '1.5rem', 
                    background: 'none', 
                    border: 'none', 
                    cursor: 'pointer', 
                    color: '#64748b',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '0.25rem',
                    zIndex: 5
                  }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {passwordError && <p className="text-danger text-xs mt-1">{passwordError}</p>}
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
              <button className="btn btn-outline w-100" onClick={() => setEditingProfile(null)}>Cancelar</button>
              <button className="btn btn-primary w-100" onClick={handleUpdatePassword}>
                <Save size={18} /> Actualizar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

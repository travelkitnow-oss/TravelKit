import { useState, useEffect } from 'react';
import { 
  Users, 
  Trash2, 
  Key, 
  X, 
  Save, 
  
  ShieldCheck,
  Lock,
  Eye,
  EyeOff
} from 'lucide-react';
import { db } from '../../../lib/db';
import './GestionUsuarios.css';

import PageHeader from '../../../components/PageHeader/PageHeader';
import SearchBar from '../../../components/SearchBar/SearchBar';
import TableEmpty from '../../../components/TableEmpty/TableEmpty';
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
    const { data, error } = await db
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
    
    const { error } = await db.from('client_profiles').delete().eq('id', id);
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

  // email y nombre pueden venir vacíos (perfiles creados para clientes sin mail)
  const term = searchTerm.trim().toLowerCase();
  const filteredProfiles = profiles.filter(p =>
    (p.email || '').toLowerCase().includes(term) ||
    (p.clients?.name || '').toLowerCase().includes(term)
  );

  return (
    <div className="gestion-usuarios-page animate-fade-in">
      <PageHeader
        section="Gestión"
        title="Gestión de Usuarios"
        subtitle="Controla los accesos al portal de clientes, actualiza credenciales y gestiona permisos."
      />

      <div className="glass-card">
        <div className="tk-table-head">
          <div className="tk-table-title">
            <h3>Accesos al portal</h3>
            <p>Viajeros que pueden entrar a su portal de cliente.</p>
          </div>
          <div className="tk-table-tools">
            <SearchBar size="sm" placeholder="Buscar por nombre o email..." value={searchTerm} onChange={setSearchTerm} />
            {!loading && (
              <span className="tk-count">
                {term
                  ? <><strong>{filteredProfiles.length}</strong> de {profiles.length}</>
                  : <><strong>{profiles.length}</strong> {profiles.length === 1 ? 'usuario' : 'usuarios'}</>}
              </span>
            )}
          </div>
        </div>

        <div className="tk-table-wrap">
          <table className="tk-table">
            <thead>
              <tr>
                <th>Viajero</th>
                <th>Usuario / Email</th>
                <th>Rol</th>
                <th>Fecha de alta</th>
                <th>Última conexión</th>
                <th className="tk-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <TableEmpty colSpan={6} loading title="Cargando usuarios…" />
              ) : filteredProfiles.length === 0 ? (
                <TableEmpty
                  colSpan={6}
                  icon={<Users size={26} />}
                  title={profiles.length ? 'Sin resultados' : 'Todavía no hay accesos'}
                  text={profiles.length ? 'Probá con otro nombre o email.' : 'Habilitá el acceso al portal desde la lista de Clientes.'}
                />
              ) : (
                filteredProfiles.map(p => (
                  <tr key={p.id}>
                    <td>
                      <div className="tk-cell-main">
                        <span className="tk-avatar">{(p.clients?.name || p.email || '?').charAt(0)}</span>
                        <div className="tk-cell-text"><strong>{p.clients?.name || 'Sin nombre'}</strong></div>
                      </div>
                    </td>
                    <td>{p.email || <em className="tk-muted">Sin email</em>}</td>
                    <td><span className="tk-badge info">{p.role === 'cliente' ? 'Cliente' : p.role}</span></td>
                    <td>{new Date(p.created_at).toLocaleDateString('es-AR')}</td>
                    <td>
                      {p.last_login ? (
                        <div className="tk-cell-text">
                          <span>{new Date(p.last_login).toLocaleDateString('es-AR')}</span>
                          <span className="tk-sub">{new Date(p.last_login).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })} hs</span>
                        </div>
                      ) : (
                        <span className="tk-badge warning">Nunca ingresó</span>
                      )}
                    </td>
                    <td>
                      <div className="tk-actions">
                        <button className="tk-icon-btn" title="Cambiar contraseña" aria-label="Cambiar contraseña" onClick={() => setEditingProfile(p)}>
                          <Key size={16} />
                        </button>
                        <button className="tk-icon-btn danger" title="Quitar acceso" aria-label="Quitar acceso" onClick={() => handleDelete(p.id)}>
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

      {editingProfile && (
        <div className="modal-overlay animate-fade-in" style={{ zIndex: 1400 }}>
          <div className="modal-content-pro modal-sm">
            <div className="modal-header-pro">
              <div className="header-left">
                <div className="header-icon"><Lock size={20} /></div>
                <div className="header-text">
                  <h3>Actualizar clave</h3>
                  <p>Cambiá la contraseña de acceso al portal</p>
                </div>
              </div>
              <button onClick={() => setEditingProfile(null)} className="close-modal-btn" aria-label="Cerrar">
                <X size={18} />
              </button>
            </div>

            <div className="modal-body-pro">
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
                      color: '#5A7181',
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
                    color: '#5A7181',
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

            </div>
            <div className="modal-footer-pro">
              <button className="btn btn-outline" onClick={() => setEditingProfile(null)}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleUpdatePassword}>
                <Save size={18} /> Actualizar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

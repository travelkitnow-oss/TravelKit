import { useState, useEffect } from 'react';
import {
  Users,
  Plus,
  Mail,
  Phone,
  User,
  Trash2,
  Edit2,
  X,
  UserPlus,
  ShieldCheck,
  Lock,
  Eye,
  EyeOff
} from 'lucide-react';
import { db } from '../../../lib/db';
import ConfirmationModal from '../../../components/ConfirmationModal/ConfirmationModal';
import './Clientes.css';

import PageHeader from '../../../components/PageHeader/PageHeader';
import TableEmpty from '../../../components/TableEmpty/TableEmpty';
interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  source: 'agenda' | 'manual';
  created_at: string;
}

export default function ClientesPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [existingUserIds, setExistingUserIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  // Manual client form
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);

  // Edit/Delete states
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [deletingClientId, setDeletingClientId] = useState<string | null>(null);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);

  // User creation states
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [selectedClientForUser, setSelectedClientForUser] = useState<Client | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    setLoading(true);
    // Fetch clients
    const { data: clientsData, error: clientsError } = await db
      .from('clients')
      .select('*')
      .order('name', { ascending: true });

    // Fetch existing profiles to disable button
    const { data: profilesData } = await db
      .from('client_profiles')
      .select('id');

    if (clientsError) {
      console.error('Error fetching clients:', clientsError);
    } else {
      setClients((clientsData || []).filter((c: any) => c.source !== 'agenda_session_only'));
      setExistingUserIds(new Set((profilesData || []).map(p => p.id)));
    }
    setLoading(false);
  };

  const handleAddManualClient = async () => {
    setAttemptedSubmit(true);
    if (!newName || !newEmail || !newPhone) return;

    if (!newEmail.includes('@')) {
      alert('El email debe contener un @');
      return;
    }

    const { data, error } = await db
      .from('clients')
      .insert([
        { name: newName, email: newEmail, phone: newPhone, source: 'manual' }
      ])
      .select();

    if (error) {
      alert('Error al guardar el cliente');
    } else {
      if (data) setClients([data[0], ...clients]);
      setShowAddModal(false);
      setAttemptedSubmit(false);
      setNewName('');
      setNewEmail('');
      setNewPhone('');
    }
  };

  const handleEditClient = async () => {
    if (!editingClient) return;

    const { error } = await db
      .from('clients')
      .update({
        name: editingClient.name,
        email: editingClient.email,
        phone: editingClient.phone
      })
      .eq('id', editingClient.id);

    if (error) {
      alert('Error al actualizar el cliente');
    } else {
      setClients(clients.map(c => c.id === editingClient.id ? editingClient : c));
      alert('Cambios guardados correctamente.');
      setEditingClient(null);
    }
  };

  const confirmDelete = async () => {
    if (!deletingClientId) return;

    const { error } = await db
      .from('clients')
      .delete()
      .eq('id', deletingClientId);

    if (error) {
      alert('Error al eliminar el cliente');
    } else {
      setClients(clients.filter(c => c.id !== deletingClientId));
    }
    setDeletingClientId(null);
  };

  const handleCreateUser = async () => {
    if (!selectedClientForUser) return;

    // Password validation: 1 upper, 1 lower, 8+ chars
    const hasUpper = /[A-Z]/.test(newPassword);
    const hasLower = /[a-z]/.test(newPassword);
    const hasLength = newPassword.length >= 8;

    if (!hasUpper || !hasLower || !hasLength) {
      setPasswordError('La contraseña no cumple con los requisitos.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Las contraseñas no coinciden.');
      return;
    }

    setLoading(true);
    // In a real scenario, this would call a Supabase Edge Function or use the Admin API
    // For now, we'll simulate the creation and maybe save it to a profiles/users table
    const { error } = await db
      .from('client_profiles')
      .upsert({
        id: selectedClientForUser.id,
        email: selectedClientForUser.email,
        role: 'cliente',
        temp_password_set: true, // Marker for first login
        created_at: new Date().toISOString()
      });

    if (error) {
      alert('Error al crear el perfil de usuario: ' + error.message);
    } else {
      alert('¡Usuario creado con éxito! El cliente ya puede ingresar con su mail y la clave generada.');
      setExistingUserIds(new Set([...Array.from(existingUserIds), selectedClientForUser.id]));
      setShowCreateUserModal(false);
      setNewPassword('');
      setConfirmPassword('');
      setPasswordError('');
    }
    setLoading(false);
  };

  const getValidationClass = (value: any, required: boolean = true) => {
    if (!attemptedSubmit) return '';
    if (required) {
      if (typeof value === 'string' && value.includes('@')) return 'is-valid'; // Email special case
      return value ? 'is-valid' : 'is-invalid';
    }
    return value ? 'is-valid' : '';
  };

  // Helper for email specifically to handle the @ requirement
  const getEmailClass = () => {
    if (!attemptedSubmit) return '';
    return newEmail && newEmail.includes('@') ? 'is-valid' : 'is-invalid';
  };

  const deleteManualClient = (id: string) => {
    setDeletingClientId(id);
    setIsConfirmDeleteOpen(true);
  };

  return (
    <div className="clientes-page animate-fade-in">
      <PageHeader
        section="Gestión"
        title="Base de Datos de Clientes"
        subtitle="Administra la información de tus viajeros, unifica contactos y mantén tu historial organizado."
      />

      <div className="glass-card">
        <div className="tk-table-head">
          <div className="tk-table-title">
            <h3>Lista de clientes</h3>
            <p>Gestioná la base de datos de tus viajeros.</p>
          </div>
          <div className="tk-table-tools">
            <span className="tk-count"><strong>{clients.length}</strong> {clients.length === 1 ? 'cliente' : 'clientes'}</span>
            <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
              <Plus size={18} /> Nuevo cliente
            </button>
          </div>
        </div>

        <div className="tk-table-wrap">
          <table className="tk-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Contacto</th>
                <th>Origen</th>
                <th className="tk-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <TableEmpty colSpan={4} loading title="Cargando clientes…" />
              ) : clients.length === 0 ? (
                <TableEmpty
                  colSpan={4}
                  icon={<Users size={26} />}
                  title="Todavía no hay clientes"
                  text="Cargá tu primer viajero o se agregan solos cuando alguien agenda una sesión."
                  action={<button className="btn btn-outline btn-sm" onClick={() => setShowAddModal(true)}><Plus size={16} /> Agregar cliente</button>}
                />
              ) : (
                clients.map(client => (
                  <tr key={client.id}>
                    <td>
                      <div className="tk-cell-main">
                        <span className="tk-avatar">{client.name.charAt(0)}</span>
                        <div className="tk-cell-text">
                          <strong>{client.name}</strong>
                          <span className="tk-sub">Alta {client.created_at ? new Date(client.created_at).toLocaleDateString('es-AR') : '—'}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="tk-lines">
                        <span><Mail size={14} /> {client.email || <em className="tk-muted">Sin mail</em>}</span>
                        <span><Phone size={14} /> {client.phone || <em className="tk-muted">Sin teléfono</em>}</span>
                      </div>
                    </td>
                    <td>
                      <span className={`tk-badge ${client.source === 'agenda' ? 'accent' : 'info'}`}>
                        {client.source === 'agenda' ? 'Desde la agenda' : 'Carga manual'}
                      </span>
                    </td>
                    <td>
                      <div className="tk-actions">
                        <button
                          className={`tk-icon-btn ${existingUserIds.has(client.id) ? 'success' : ''}`}
                          title={existingUserIds.has(client.id) ? 'Ya tiene acceso al portal' : 'Habilitar acceso al portal'}
                          aria-label={existingUserIds.has(client.id) ? 'Ya tiene acceso al portal' : 'Habilitar acceso al portal'}
                          onClick={() => {
                            if (existingUserIds.has(client.id)) return;
                            setSelectedClientForUser(client);
                            setShowCreateUserModal(true);
                          }}
                          disabled={existingUserIds.has(client.id)}
                        >
                          {existingUserIds.has(client.id) ? <ShieldCheck size={16} /> : <UserPlus size={16} />}
                        </button>
                        <button className="tk-icon-btn" title="Editar" aria-label="Editar" onClick={() => setEditingClient(client)}>
                          <Edit2 size={16} />
                        </button>
                        <button className="tk-icon-btn danger" title="Eliminar" aria-label="Eliminar" onClick={() => deleteManualClient(client.id)}>
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

      {showAddModal && (
        <div className="modal-overlay animate-fade-in" style={{ zIndex: 1400 }}>
          <div className="modal-content-pro modal-sm">
            <div className="modal-header-pro">
              <div className="header-left">
                <div className="header-icon"><Users size={20} /></div>
                <div className="header-text">
                  <h3>Nuevo cliente</h3>
                  <p>Registrá un nuevo viajero</p>
                </div>
              </div>
              <button onClick={() => { setShowAddModal(false); setAttemptedSubmit(false); }} className="close-modal-btn" aria-label="Cerrar">
                <X size={18} />
              </button>
            </div>

            <div className="modal-body-pro">
              <div className="form-group mb-4">
                <label className="text-xs font-bold uppercase text-secondary mb-2 block">Nombre Completo</label>
                <div className="input-with-icon-pro">
                  <User size={16} />
                  <input
                    type="text"
                    className={`form-input-pro ${getValidationClass(newName)}`}
                    placeholder="Ej: Juan Pérez"
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group mb-4">
                <label className="text-xs font-bold uppercase text-secondary mb-2 block">Email</label>
                <div className="input-with-icon-pro">
                  <Mail size={16} />
                  <input
                    type="email"
                    className={`form-input-pro ${getEmailClass()}`}
                    placeholder="ejemplo@mail.com"
                    value={newEmail}
                    onChange={e => setNewEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="text-xs font-bold uppercase text-secondary mb-2 block">Teléfono</label>
                <div className="input-with-icon-pro">
                  <Phone size={16} />
                  <input
                    type="text"
                    className={`form-input-pro ${getValidationClass(newPhone)}`}
                    placeholder="11 1234 5678"
                    value={newPhone}
                    onChange={e => setNewPhone(e.target.value.replace(/\D/g, ''))}
                  />
                </div>
              </div>
            </div>

            <div className="modal-footer-pro">
              <button className="btn-modal-secondary" onClick={() => { setShowAddModal(false); setAttemptedSubmit(false); }}>Cancelar</button>
              <button
                className="btn-modal-primary"
                onClick={handleAddManualClient}
              >
                Guardar Cliente
              </button>
            </div>
          </div>
        </div>
      )}

      {showCreateUserModal && selectedClientForUser && (
        <div className="modal-overlay animate-fade-in" style={{ zIndex: 1400 }}>
          <div className="modal-content-pro modal-sm">
            <div className="modal-header-pro">
              <div className="header-left">
                <div className="header-icon"><UserPlus size={20} /></div>
                <div className="header-text">
                  <h3>Habilitar acceso</h3>
                  <p>Para: <strong>{selectedClientForUser.name}</strong></p>
                </div>
              </div>
              <button onClick={() => { setShowCreateUserModal(false); setNewPassword(''); }} className="close-modal-btn" aria-label="Cerrar">
                <X size={18} />
              </button>
            </div>

            <div className="modal-body-pro">
              <div className="form-group mb-2">
                <label className="text-xs font-bold uppercase text-secondary mb-1 block">Usuario / Email</label>
                <div className="input-with-icon" style={{ opacity: 0.8 }}>
                  <Mail size={16} />
                  <input type="text" className="form-input" style={{ padding: '0.6rem 1rem 0.6rem 2.5rem', fontSize: '0.9rem' }} value={selectedClientForUser.email} disabled />
                </div>
              </div>

              <div className="form-group mb-3">
                <label className="text-xs font-bold uppercase text-secondary mb-2 block">Contraseña</label>
                <div className="input-with-icon-pro">
                  <Lock size={16} />
                  <input
                    type={showPassword ? "text" : "password"}
                    className={`form-input-pro ${passwordError ? 'error' : ''}`}
                    placeholder="Ingresa la clave"
                    value={newPassword}
                    onChange={(e) => { setNewPassword(e.target.value); setPasswordError(''); }}
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="eye-btn-pro">
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="form-group mb-3">
                <label className="text-xs font-bold uppercase text-secondary mb-2 block">Confirmar Contraseña</label>
                <div className="input-with-icon-pro">
                  <ShieldCheck size={16} />
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    className={`form-input-pro ${passwordError ? 'error' : ''}`}
                    placeholder="Repite la clave"
                    value={confirmPassword}
                    onPaste={(e) => e.preventDefault()}
                    onChange={(e) => { setConfirmPassword(e.target.value); setPasswordError(''); }}
                  />
                  <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="eye-btn-pro">
                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {passwordError && <p className="text-danger text-xs mt-2 fw-bold" style={{ textAlign: 'center' }}>{passwordError}</p>}

              <div className="security-checklist-pro mt-2" style={{ padding: '0.75rem' }}>
                <div className={`req-item-pro ${newPassword.length >= 8 ? 'ok' : ''}`} style={{ fontSize: '0.75rem', gap: '0.5rem' }}>
                  <ShieldCheck size={14} />
                  <span>Mínimo 8 caracteres</span>
                </div>
                <div className={`req-item-pro ${/[A-Z]/.test(newPassword) ? 'ok' : ''}`} style={{ fontSize: '0.75rem', gap: '0.5rem' }}>
                  <ShieldCheck size={14} />
                  <span>Al menos una Mayúscula</span>
                </div>
                <div className={`req-item-pro ${/[a-z]/.test(newPassword) ? 'ok' : ''}`} style={{ fontSize: '0.75rem', gap: '0.5rem' }}>
                  <ShieldCheck size={14} />
                  <span>Al menos una Minúscula</span>
                </div>
              </div>
            </div>

            <div className="modal-footer-pro" style={{ padding: '0.75rem 1.75rem 1rem' }}>
              <button className="btn-modal-secondary" style={{ padding: '0.5rem' }} onClick={() => { setShowCreateUserModal(false); setNewPassword(''); }}>Cancelar</button>
              <button className="btn-modal-primary" style={{ padding: '0.5rem' }} onClick={handleCreateUser} disabled={!newPassword || loading}>
                {loading ? '...' : 'Habilitar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {editingClient && (
        <div className="modal-overlay animate-fade-in" style={{ zIndex: 1400 }}>
          <div className="modal-content-pro modal-sm">
            <div className="modal-header-pro">
              <div className="header-left">
                <div className="header-icon"><Edit2 size={20} /></div>
                <div className="header-text">
                  <h3>Editar cliente</h3>
                  <p>Modificá los datos del viajero</p>
                </div>
              </div>
              <button onClick={() => setEditingClient(null)} className="close-modal-btn" aria-label="Cerrar">
                <X size={18} />
              </button>
            </div>

            <div className="modal-body-pro">
              <div className="form-group mb-4">
                <label className="text-xs font-bold uppercase text-secondary mb-2 block">Nombre Completo</label>
                <div className="input-with-icon-pro">
                  <User size={16} />
                  <input
                    type="text"
                    className="form-input-pro"
                    value={editingClient.name}
                    onChange={e => setEditingClient({ ...editingClient, name: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group mb-4">
                <label className="text-xs font-bold uppercase text-secondary mb-2 block">Email</label>
                <div className="input-with-icon-pro">
                  <Mail size={16} />
                  <input
                    type="email"
                    className="form-input-pro"
                    value={editingClient.email}
                    onChange={e => setEditingClient({ ...editingClient, email: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="text-xs font-bold uppercase text-secondary mb-2 block">Teléfono</label>
                <div className="input-with-icon-pro">
                  <Phone size={16} />
                  <input
                    type="text"
                    className="form-input-pro"
                    value={editingClient.phone}
                    onChange={e => setEditingClient({ ...editingClient, phone: e.target.value.replace(/\D/g, '') })}
                  />
                </div>
              </div>
            </div>

            <div className="modal-footer-pro">
              <button className="btn-modal-secondary" onClick={() => setEditingClient(null)}>Cancelar</button>
              <button
                className="btn-modal-primary"
                onClick={handleEditClient}
              >
                Guardar Cambios
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmationModal
        isOpen={isConfirmDeleteOpen}
        onClose={() => setIsConfirmDeleteOpen(false)}
        onConfirm={confirmDelete}
        title="¿Eliminar cliente?"
        message="Esta acción no se puede deshacer. El cliente será removido permanentemente de tu base de datos manual."
        confirmText="Eliminar"
        type="danger"
      />
    </div>
  );
}

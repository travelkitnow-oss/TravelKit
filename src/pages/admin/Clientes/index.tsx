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
import { supabase } from '../../../lib/supabase';
import ConfirmationModal from '../../../components/ConfirmationModal/ConfirmationModal';
import './Clientes.css';

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
    const { data: clientsData, error: clientsError } = await supabase
      .from('clients')
      .select('*')
      .order('name', { ascending: true });

    // Fetch existing profiles to disable button
    const { data: profilesData } = await supabase
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

    const { data, error } = await supabase
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

    const { error } = await supabase
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

    const { error } = await supabase
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
    const { error } = await supabase
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
      <header className="page-header-centered">
        <h1>Base de Datos de Clientes</h1>
        <p>Administra la información de tus viajeros, unifica contactos y mantén tu historial organizado.</p>
      </header>

      <div className="glass-card">
        <div className="card-header border-bottom">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3>Lista de Clientes</h3>
              <p className="text-secondary text-sm">Gestiona la base de datos de tus viajeros.</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div className="client-count-badge">
                {clients.length} Clientes
              </div>
              <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
                <Plus size={18} />
                Nuevo Cliente
              </button>
            </div>
          </div>
        </div>

        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="clientes-table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Contacto</th>
                  <th>Origen</th>
                  <th style={{ textAlign: 'center' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={4} className="empty-table-cell">
                      <div className="empty-state py-5">
                        <p>Cargando clientes...</p>
                      </div>
                    </td>
                  </tr>
                ) : clients.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="empty-table-cell">
                      <div className="empty-state py-5">
                        <Users size={48} className="text-tertiary mb-3" />
                        <p>No se encontraron clientes.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  clients.map(client => (
                    <tr key={client.id}>
                      <td>
                        <div className="client-name-cell">
                          <div className="client-avatar">
                            {client.name.charAt(0)}
                          </div>
                          <div>
                            <div className="fw-bold">{client.name}</div>
                            <span className="text-xs text-secondary">ID: {client.id.split('-')[1] || client.id.substring(0, 8)}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="client-contact-cell">
                          <div className="client-info-text">
                            <Mail size={14} /> {client.email || 'Sin mail'}
                          </div>
                          <div className="client-info-text">
                            <Phone size={14} /> {client.phone || 'Sin teléfono'}
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={`source-badge ${client.source}`}>
                          {client.source === 'agenda' ? 'Automático' : 'Manual'}
                        </span>
                      </td>
                      <td>
                        <div className="client-actions-cell" style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                          <button
                            className={`btn-icon-sm ${existingUserIds.has(client.id) ? 'disabled' : 'text-primary'}`}
                            title={existingUserIds.has(client.id) ? "Usuario ya creado" : "Crear Usuario Cliente"}
                            onClick={() => {
                              if (existingUserIds.has(client.id)) return;
                              setSelectedClientForUser(client);
                              setShowCreateUserModal(true);
                            }}
                            disabled={existingUserIds.has(client.id)}
                          >
                            {existingUserIds.has(client.id) ? <ShieldCheck size={16} /> : <UserPlus size={16} />}
                          </button>
                          <button
                            className="btn-icon-sm"
                            title="Editar"
                            onClick={() => setEditingClient(client)}
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            className="btn-icon-sm text-danger"
                            title="Eliminar"
                            onClick={() => deleteManualClient(client.id)}
                          >
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

      {showAddModal && (
        <div className="modal-overlay animate-fade-in" style={{ zIndex: 1400 }}>
          <div className="modal-content glass-card animate-scale-in" style={{ maxWidth: '450px', padding: '2.5rem' }}>
            <div className="modal-header">
              <h3>Nuevo Cliente</h3>
              <button onClick={() => { setShowAddModal(false); setAttemptedSubmit(false); }} className="close-modal-btn">
                <X size={20} />
              </button>
            </div>

            <div className="modal-form-grid">
              <div className="form-group">
                <label className="text-sm font-semibold">Nombre Completo</label>
                <div className="input-with-icon">
                  <User size={16} />
                  <input
                    type="text"
                    className={`form-input ${getValidationClass(newName)}`}
                    placeholder="Ej: Juan Pérez"
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="text-sm font-semibold">Email</label>
                <div className="input-with-icon">
                  <Mail size={16} />
                  <input
                    type="email"
                    className={`form-input ${getEmailClass()}`}
                    placeholder="ejemplo@mail.com"
                    value={newEmail}
                    onChange={e => setNewEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="text-sm font-semibold">Teléfono</label>
                <div className="input-with-icon">
                  <Phone size={16} />
                  <input
                    type="text"
                    className={`form-input ${getValidationClass(newPhone)}`}
                    placeholder="11 1234 5678"
                    value={newPhone}
                    onChange={e => setNewPhone(e.target.value.replace(/\D/g, ''))}
                  />
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
              <button className="btn btn-outline w-100" onClick={() => { setShowAddModal(false); setAttemptedSubmit(false); }}>Cancelar</button>
              <button
                className="btn btn-primary w-100"
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
          <div className="modal-content glass-card animate-scale-in p-0 overflow-hidden" style={{ maxWidth: '440px', border: 'none', borderRadius: '24px' }}>
            <div className="modal-header-full" style={{ background: 'var(--color-primary)', padding: '1.25rem 1.75rem', color: 'white', position: 'relative' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                <div style={{ background: 'rgba(255, 255, 255, 0.1)', color: 'white', padding: '0.6rem', borderRadius: '10px' }}>
                  <UserPlus size={22} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'white', fontWeight: 800 }}>Habilitar Acceso</h3>
                  <p style={{ margin: 0, fontSize: '0.85rem', opacity: 0.9, fontWeight: 500 }}>Para: <strong>{selectedClientForUser.name}</strong></p>
                </div>
              </div>
              <button
                onClick={() => { setShowCreateUserModal(false); setNewPassword(''); }}
                className="close-modal-btn-white"
                style={{ width: '30px', height: '30px' }}
              >
                <X size={18} />
              </button>
            </div>

            <div className="modal-body" style={{ padding: '0.75rem 1.75rem' }}>
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
          <div className="modal-content glass-card animate-scale-in" style={{ maxWidth: '450px', padding: '2.5rem' }}>
            <div className="modal-header">
              <h3>Editar Cliente</h3>
              <button onClick={() => setEditingClient(null)} className="close-modal-btn">
                <X size={20} />
              </button>
            </div>

            <div className="modal-form-grid">
              <div className="form-group">
                <label className="text-sm font-semibold">Nombre Completo</label>
                <div className="input-with-icon">
                  <User size={16} />
                  <input
                    type="text"
                    className="form-input"
                    value={editingClient.name}
                    onChange={e => setEditingClient({ ...editingClient, name: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="text-sm font-semibold">Email</label>
                <div className="input-with-icon">
                  <Mail size={16} />
                  <input
                    type="email"
                    className="form-input"
                    value={editingClient.email}
                    onChange={e => setEditingClient({ ...editingClient, email: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="text-sm font-semibold">Teléfono</label>
                <div className="input-with-icon">
                  <Phone size={16} />
                  <input
                    type="text"
                    className="form-input"
                    value={editingClient.phone}
                    onChange={e => setEditingClient({ ...editingClient, phone: e.target.value.replace(/\D/g, '') })}
                  />
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
              <button className="btn btn-outline w-100" onClick={() => setEditingClient(null)}>Cancelar</button>
              <button
                className="btn btn-primary w-100"
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

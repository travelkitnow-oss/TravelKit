import { useState, useEffect } from 'react';
import { 
  Users, 
  Plus, 
  Mail, 
  Phone, 
  User, 
  Trash2, 
  Edit2,
  X
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

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .order('name', { ascending: true });
    
    if (error) {
      console.error('Error fetching clients:', error);
    } else {
      setClients((data || []).filter((c: any) => c.source !== 'agenda_session_only'));
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
                  <th>Acciones</th>
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
                            <span className="text-xs text-secondary">ID: {client.id.split('-')[1] || client.id.substring(0,8)}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="client-contact-cell">
                          <div className="contact-item">
                            <Mail size={14} /> {client.email || 'Sin mail'}
                          </div>
                          <div className="contact-item">
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
                        <div className="actions-cell">
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

      {/* Edit Modal */}
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

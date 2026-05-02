import { useState, useEffect, useMemo } from 'react';
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
import { mockReservations } from '../../../lib/data';
import ConfirmationModal from '../../../components/ConfirmationModal/ConfirmationModal';
import './Clientes.css';

interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  source: 'agenda' | 'manual';
  createdAt: string;
}

export default function ClientesPage() {
  const [manualClients, setManualClients] = useState<Client[]>(() => {
    const saved = localStorage.getItem('travelkit_manual_clients');
    return saved ? JSON.parse(saved) : [];
  });

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

  // Track deleted or "absorbed" automatic clients
  const [deletedAgendaIds, setDeletedAgendaIds] = useState<string[]>(() => {
    const saved = localStorage.getItem('travelkit_deleted_agenda_ids');
    return saved ? JSON.parse(saved) : [];
  });

  const [processedAgendaIds, setProcessedAgendaIds] = useState<string[]>(() => {
    const saved = localStorage.getItem('travelkit_processed_agenda_ids');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('travelkit_deleted_agenda_ids', JSON.stringify(deletedAgendaIds));
    localStorage.setItem('travelkit_processed_agenda_ids', JSON.stringify(processedAgendaIds));
  }, [deletedAgendaIds, processedAgendaIds]);

  // Auto clients from agenda
  const agendaClients = useMemo(() => {
    const clients: Record<string, Client> = {};
    Object.values(mockReservations).flat().forEach(res => {
      if (res.status === 'confirmed') {
        const key = `${res.client}-${res.email || ''}`.toLowerCase();
        if (!clients[key]) {
          clients[key] = {
            id: `agenda-${res.id}`,
            name: res.client,
            email: res.email || '',
            phone: res.phone || '',
            source: 'agenda',
            createdAt: new Date().toISOString() // Fallback
          };
        }
      }
    });
    return Object.values(clients);
  }, []);

  // Merge all clients with deduplication logic
  const allClients = useMemo(() => {
    const finalMerged: Client[] = [];

    // 1. Gather all manual clients first (they are our master records)
    const rawManual = [...manualClients];
    rawManual.forEach(current => {
      const existingIndex = finalMerged.findIndex(f => 
        f.name.toLowerCase() === current.name.toLowerCase() && 
        (
          current.email.toLowerCase().split(' y ').some(e => e.trim() && f.email.toLowerCase().includes(e.trim())) || 
          current.phone.split(' y ').some(p => p.trim() && f.phone.includes(p.trim()))
        )
      );

      if (existingIndex > -1) {
        const existing = finalMerged[existingIndex];
        // Merge manual data (user might have created two manual ones)
        const emails = new Set([
          ...existing.email.split(' y ').map(e => e.trim()),
          ...current.email.split(' y ').map(e => e.trim())
        ].filter(Boolean));
        existing.email = Array.from(emails).join(' y ');

        const phones = new Set([
          ...existing.phone.split(' y ').map(p => p.trim()),
          ...current.phone.split(' y ').map(p => p.trim())
        ].filter(Boolean));
        existing.phone = Array.from(phones).join(' y ');
      } else {
        finalMerged.push({ ...current });
      }
    });

    // 2. Process agenda clients
    agendaClients.forEach(ac => {
      if (deletedAgendaIds.includes(ac.id) || processedAgendaIds.includes(ac.id)) return;

      const existingIndex = finalMerged.findIndex(f => 
        f.name.toLowerCase() === ac.name.toLowerCase() && 
        (
          f.email.toLowerCase().split(' y ').some(e => e.trim() === ac.email.toLowerCase()) || 
          f.phone.split(' y ').some(p => p.trim() === ac.phone)
        )
      );

      if (existingIndex > -1) {
        const existing = finalMerged[existingIndex];
        
        // IF EXISTING IS MANUAL, STOP POLLUTION.
        // We don't merge agenda data into manual records.
        if (existing.source === 'manual') return;

        // If existing is also agenda, we can merge discovery data
        const emails = new Set([...existing.email.split(' y '), ac.email].map(e => e.trim()).filter(Boolean));
        existing.email = Array.from(emails).join(' y ');

        const phones = new Set([...existing.phone.split(' y '), ac.phone].map(p => p.trim()).filter(Boolean));
        existing.phone = Array.from(phones).join(' y ');
      } else {
        finalMerged.push({ ...ac });
      }
    });

    return finalMerged.sort((a, b) => a.name.localeCompare(b.name));
  }, [manualClients, agendaClients, deletedAgendaIds, processedAgendaIds]);

  useEffect(() => {
    localStorage.setItem('travelkit_manual_clients', JSON.stringify(manualClients));
  }, [manualClients]);

  const handleAddManualClient = () => {
    setAttemptedSubmit(true);
    if (!newName || !newEmail || !newPhone) return;

    // Validation
    if (!newEmail.includes('@')) {
      alert('El email debe contener un @');
      return;
    }

    const newClient: Client = {
      id: `manual-${Date.now()}`,
      name: newName,
      email: newEmail,
      phone: newPhone,
      source: 'manual',
      createdAt: new Date().toISOString()
    };

    // Find if this new manual client matches any existing agenda clients by name
    const absorbed = agendaClients.filter(ac => 
      ac.name.toLowerCase() === newName.toLowerCase()
    ).map(ac => ac.id);

    if (absorbed.length > 0) {
      setProcessedAgendaIds(prev => Array.from(new Set([...prev, ...absorbed])));
    }

    // Deduplicate manualClients array to prevent pollution from multiple manual entries
    const otherManuals = manualClients.filter(c => 
      !(c.name.toLowerCase() === newName.toLowerCase() && (c.email === newEmail || c.phone === newPhone))
    );

    setManualClients([newClient, ...otherManuals]);
    setShowAddModal(false);
    setAttemptedSubmit(false);
    setNewName('');
    setNewEmail('');
    setNewPhone('');
  };

  const handleEditClient = () => {
    if (!editingClient) return;
    
    let nextManualClients = [...manualClients];

    // 1. Convert agenda to manual if needed
    if (editingClient.id.startsWith('agenda-')) {
      const agendaId = editingClient.id;
      const newManual = { 
        ...editingClient, 
        id: `manual-${Date.now()}`,
        source: 'manual' as const 
      };
      nextManualClients = [newManual, ...nextManualClients];
      setProcessedAgendaIds(prev => Array.from(new Set([...prev, agendaId])));
    } else {
      // Update existing
      nextManualClients = nextManualClients.map(c => c.id === editingClient.id ? editingClient : c);
    }

    // 2. Deep clean manualClients: Remove any OTHER manual records that match this person
    // to prevent them from re-polluting the merged view later.
    const finalName = editingClient.name.toLowerCase();

    // Actually, a simpler way:
    const uniqueManuals: Client[] = [];
    const seen = new Set();
    
    // Process the edited one first to ensure it stays
    const editedOne = editingClient.id.startsWith('agenda-') ? nextManualClients[0] : editingClient;
    uniqueManuals.push(editedOne);
    seen.add(editedOne.name.toLowerCase() + editedOne.phone);

    nextManualClients.forEach(c => {
      if (c.id === editedOne.id) return;
      const key = c.name.toLowerCase() + c.phone;
      if (!seen.has(key)) {
        uniqueManuals.push(c);
        seen.add(key);
      }
    });

    setManualClients(uniqueManuals);
    
    // Also mark ALL agenda clients with this name as processed
    const newlyAbsorbed = agendaClients.filter(ac => 
      ac.name.toLowerCase() === finalName
    ).map(ac => ac.id);

    if (newlyAbsorbed.length > 0) {
      setProcessedAgendaIds(prev => Array.from(new Set([...prev, ...newlyAbsorbed])));
    }
    
    alert('Cambios guardados correctamente.');
    setEditingClient(null);
  };

  const confirmDelete = () => {
    if (!deletingClientId) return;
    
    if (deletingClientId.startsWith('agenda-')) {
      setDeletedAgendaIds([...deletedAgendaIds, deletingClientId]);
    } else {
      setManualClients(manualClients.filter(c => c.id !== deletingClientId));
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
                {allClients.length} Clientes
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
                {allClients.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="empty-table-cell">
                      <div className="empty-state py-5">
                        <Users size={48} className="text-tertiary mb-3" />
                        <p>No se encontraron clientes.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  allClients.map(client => (
                    <tr key={client.id}>
                      <td>
                        <div className="client-name-cell">
                          <div className="client-avatar">
                            {client.name.charAt(0)}
                          </div>
                          <div>
                            <div className="fw-bold">{client.name}</div>
                            <span className="text-xs text-secondary">ID: {client.id.split('-')[1] || client.id}</span>
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

import { useState, useEffect } from 'react';
import { 
  Plane, 
  Search, 
  Plus, 
  Trash2, 
  DollarSign, 
  Building2, 
  Users, 
  FileText,
  ChevronRight,
  User,
  Save,
  Edit2,
  X
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import './Pasajes.css';

interface Client {
  id: string;
  name: string;
  email?: string;
  phone?: string;
}

interface PassengerDetail {
  name: string;
  amount: number;
}

interface Ticket {
  id: string;
  client_id: string;
  passenger_count: number;
  amount: number;
  source: string;
  file_url: string;
  notes: string;
  is_same_price: boolean;
  passengers_detail: PassengerDetail[];
  created_at: string;
}

export default function PasajesPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loadingClients, setLoadingClients] = useState(true);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(false);
  
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const [formData, setFormData] = useState<Partial<Ticket>>({
    passenger_count: 1,
    amount: 0,
    source: '',
    file_url: '',
    notes: '',
    is_same_price: true,
    passengers_detail: []
  });

  useEffect(() => {
    fetchClients();
  }, []);

  useEffect(() => {
    if (selectedClientId) {
      fetchTickets(selectedClientId);
    } else {
      setTickets([]);
    }
  }, [selectedClientId]);

  const fetchClients = async () => {
    setLoadingClients(true);
    const { data, error } = await supabase
      .from('clients')
      .select('id, name, email, phone')
      .order('name');
    
    if (error) console.error('Error fetching clients:', error);
    else setClients(data || []);
    setLoadingClients(false);
  };

  const fetchTickets = async (clientId: string) => {
    setLoadingTickets(true);
    const { data, error } = await supabase
      .from('tickets')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false });
    
    if (error) console.error('Error fetching tickets:', error);
    else setTickets(data || []);
    setLoadingTickets(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedClientId) return;

    setIsUploading(true);
    const fileExt = file.name.split('.').pop();
    const fileName = `${selectedClientId}/${Date.now()}.${fileExt}`;
    const filePath = `tickets/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(filePath, file);

    if (uploadError) {
      alert('Error al subir el archivo');
    } else {
      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath);
      
      setFormData({ ...formData, file_url: publicUrl });
    }
    setIsUploading(false);
  };

  const handleSave = async () => {
    if (!selectedClientId) return;

    let totalAmount = formData.amount || 0;
    if (!formData.is_same_price && formData.passengers_detail) {
      totalAmount = formData.passengers_detail.reduce((sum, p) => sum + (p.amount || 0), 0);
    }

    const payload = {
      client_id: selectedClientId,
      passenger_count: formData.passenger_count,
      amount: totalAmount,
      source: formData.source || '',
      file_url: formData.file_url || '',
      notes: formData.notes || '',
      is_same_price: formData.is_same_price,
      passengers_detail: formData.passengers_detail || []
    };

    let result;
    if (editingId) {
      result = await supabase.from('tickets').update(payload).eq('id', editingId).select();
    } else {
      result = await supabase.from('tickets').insert([payload]).select();
    }

    if (result.error) {
      alert('Error al guardar el pasaje');
    } else {
      if (editingId) {
        setTickets(tickets.map(t => t.id === editingId ? result.data[0] : t));
      } else {
        setTickets([result.data[0], ...tickets]);
      }
      closeModal();
    }
  };

  const openModal = (ticket?: Ticket) => {
    if (ticket) {
      setFormData(ticket);
      setEditingId(ticket.id);
    } else {
      setFormData({
        passenger_count: 1,
        amount: 0,
        source: '',
        file_url: '',
        notes: '',
        is_same_price: true,
        passengers_detail: [{ name: '', amount: 0 }]
      });
      setEditingId(null);
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingId(null);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Estás seguro de eliminar este pasaje?')) return;
    const { error } = await supabase.from('tickets').delete().eq('id', id);
    if (!error) setTickets(tickets.filter(t => t.id !== id));
  };

  const updatePassengerDetail = (index: number, field: keyof PassengerDetail, value: string | number) => {
    const details = [...(formData.passengers_detail || [])];
    if (!details[index]) details[index] = { name: '', amount: 0 };
    (details[index] as any)[field] = value;
    setFormData({ ...formData, passengers_detail: details });
  };

  const adjustPassengerCount = (count: number) => {
    const details = [...(formData.passengers_detail || [])];
    if (count > details.length) {
      for (let i = details.length; i < count; i++) {
        details.push({ name: '', amount: 0 });
      }
    } else {
      details.splice(count);
    }
    setFormData({ ...formData, passenger_count: count, passengers_detail: details });
  };

  const filteredClients = clients.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()));
  const selectedClient = clients.find(c => c.id === selectedClientId);

  return (
    <div className="pasajes-page animate-fade-in">
      <header className="page-header-premium centered">
        <div className="header-content">
          <h1>Gestión de Pasajes ✈️</h1>
          <p>Control total de vuelos, pasajeros y documentación.</p>
        </div>
      </header>

      <div className="admin-grid">
        <div className="client-sidebar glass-card">
          <div className="search-box">
            <Search size={18} />
            <input type="text" placeholder="Buscar cliente..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          </div>
          <div className="client-list">
            {loadingClients ? (
              <div className="loader-container"><div className="loader-premium"></div></div>
            ) : filteredClients.map(client => (
              <button key={client.id} className={`client-item ${selectedClientId === client.id ? 'active' : ''}`} onClick={() => setSelectedClientId(client.id)}>
                <div className="client-avatar">{client.name.charAt(0)}</div>
                <div className="client-info">
                  <span className="client-name">{client.name}</span>
                  <span className="client-email">{client.email || 'Sin contacto'}</span>
                </div>
                <ChevronRight size={16} className="chevron" />
              </button>
            ))}
          </div>
        </div>

        <div className="main-content">
          {selectedClientId ? (
            <div className="animate-fade-in">
              <div className="client-header-card glass-card mb-4">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                    <div className="client-large-avatar"><User size={32} /></div>
                    <div>
                      <h2 className="m-0">{selectedClient?.name}</h2>
                      <p className="text-secondary m-0">{selectedClient?.email} • {selectedClient?.phone}</p>
                    </div>
                  </div>
                  <button className="btn btn-primary" onClick={() => openModal()}>
                    <Plus size={18} /> Cargar Pasaje
                  </button>
                </div>
              </div>

              {loadingTickets ? (
                <div className="p-8 text-center"><div className="loader-premium"></div></div>
              ) : tickets.length > 0 ? (
                <div className="tickets-grid">
                  {tickets.map(ticket => (
                    <div key={ticket.id} className="ticket-card glass-card animate-scale-in">
                      <div className="ticket-actions-top">
                        <button className="icon-btn edit" onClick={() => openModal(ticket)}><Edit2 size={16} /></button>
                        <button className="icon-btn delete" onClick={() => handleDelete(ticket.id)}><Trash2 size={16} /></button>
                      </div>
                      <div className="ticket-header">
                        <div className="ticket-icon"><Plane size={24} /></div>
                        <div className="ticket-main-info">
                          <span className="ticket-source">{ticket.source || 'Sin lugar de compra'}</span>
                          <span className="ticket-date">{new Date(ticket.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <div className="ticket-body">
                        <div className="ticket-stat mb-3">
                          <Users size={16} />
                          <span>{ticket.passenger_count} Pasajeros</span>
                        </div>
                        <div className="price-info-card">
                          <div className="price-row">
                            <span className="price-label">Monto Total</span>
                            <span className="price-value">USD {ticket.amount.toLocaleString()}</span>
                          </div>
                          {ticket.is_same_price && (
                            <div className="price-row individual">
                              <span className="price-label">Por persona</span>
                              <span className="price-value">USD {(ticket.amount / (ticket.passenger_count || 1)).toLocaleString()}</span>
                            </div>
                          )}
                        </div>
                        {ticket.file_url && (
                          <a href={ticket.file_url} target="_blank" rel="noreferrer" className="ticket-file-link mt-4">
                            <FileText size={16} />
                            <span>Ver archivo del pasaje</span>
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state-centered">
                  <div className="empty-state-content-pro">
                    <div className="icon-badge"><Plane size={32} /></div>
                    <h3>No hay pasajes</h3>
                    <p>Cargá el primer pasaje para este cliente y mantené todo organizado.</p>
                    <button className="btn btn-primary" onClick={() => openModal()}>
                      Cargar Pasaje
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="empty-state-centered simple">
              <Plane size={80} style={{ opacity: 0.1, marginBottom: '1.5rem' }} />
              <h2>Selecciona un cliente</h2>
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content glass-card p-6" style={{ maxWidth: '600px', width: '95%' }}>
            <div className="modal-header-premium mb-6">
              <h3 className="m-0">{editingId ? 'Editar Pasaje' : 'Cargar Nuevo Pasaje'}</h3>
              <button className="close-modal-btn" onClick={closeModal}><X size={24} /></button>
            </div>
            <div className="modal-form custom-scroll" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
              <div className="form-row mb-6">
                <div className="form-group flex-1">
                  <label className="text-xs font-semibold uppercase text-secondary mb-2 display-block">Pasajeros</label>
                  <div className="input-with-icon">
                    <Users size={16} /><input type="number" min="1" className="form-input" value={formData.passenger_count} onChange={e => adjustPassengerCount(parseInt(e.target.value) || 1)} />
                  </div>
                </div>
                <div className="form-group flex-1">
                  <label className="text-xs font-semibold uppercase text-secondary mb-2 display-block">Lugar de Compra</label>
                  <div className="input-with-icon">
                    <Building2 size={16} /><input type="text" className="form-input" value={formData.source} onChange={e => setFormData({ ...formData, source: e.target.value })} placeholder="Ej: Despegar..." />
                  </div>
                </div>
              </div>
              <div className="checkbox-group mb-6">
                <label className="checkbox-label"><input type="checkbox" checked={formData.is_same_price} onChange={e => setFormData({ ...formData, is_same_price: e.target.checked })} /><span>Todos los pasajes cuestan lo mismo</span></label>
              </div>
              {formData.is_same_price ? (
                <div className="form-group mb-6">
                  <label className="text-xs font-semibold uppercase text-secondary mb-2 display-block">Monto Total (USD)</label>
                  <div className="input-with-icon">
                    <DollarSign size={16} /><input type="number" className="form-input" value={formData.amount} onChange={e => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })} />
                  </div>
                </div>
              ) : (
                <div className="passengers-detail-section mb-6">
                  {formData.passengers_detail?.map((p, i) => (
                    <div key={i} className="passenger-input-row mb-3">
                      <div className="input-with-icon flex-2"><User size={14} /><input type="text" className="form-input" placeholder="Nombre" value={p.name} onChange={e => updatePassengerDetail(i, 'name', e.target.value)} /></div>
                      <div className="input-with-icon flex-1"><DollarSign size={14} /><input type="number" className="form-input" placeholder="Monto" value={p.amount} onChange={e => updatePassengerDetail(i, 'amount', parseFloat(e.target.value) || 0)} /></div>
                    </div>
                  ))}
                </div>
              )}
              <div className="form-group mb-6">
                <label className="text-xs font-semibold uppercase text-secondary mb-2 display-block">Archivo del Pasaje</label>
                <div className="file-upload-area">
                  <input type="file" id="ticket-file" onChange={handleFileUpload} style={{ display: 'none' }} />
                  <label htmlFor="ticket-file" className="file-upload-label-simple">
                    {isUploading ? 'Subiendo...' : formData.file_url ? 'Archivo listo ✓' : 'Seleccionar Archivo'}
                  </label>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button className="btn btn-outline w-100" onClick={closeModal}>Cancelar</button>
                <button className="btn btn-primary w-100" onClick={handleSave}><Save size={18} /> Guardar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

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
  X,
  PlaneLanding
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

interface FlightLeg {
  origin: string;
  destination: string;
  date: string;
  departure_time: string;
  arrival_time: string;
  notes: string;
}

interface FlightInfo {
  is_round_trip: boolean;
  outbound: FlightLeg;
  return: FlightLeg;
  currency?: 'USD' | 'ARS';
}

interface FormData {
  passenger_count: number;
  amount: number;
  source: string;
  file_url: string;
  is_same_price: boolean;
  show_names: boolean;
  passengers_detail: PassengerDetail[];
  is_round_trip: boolean;
  outbound: FlightLeg;
  return: FlightLeg;
  currency: 'USD' | 'ARS';
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
  origin?: string;
  destination?: string;
  departure_date?: string;
  departure_time?: string;
  arrival_time?: string;
  created_at: string;
  flight_info?: FlightInfo;
}

const defaultLeg = { origin: '', destination: '', date: '', departure_time: '', arrival_time: '', notes: '' };

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

  const [activeTab, setActiveTab] = useState<'costs' | 'outbound' | 'return'>('costs');
  const [formData, setFormData] = useState<FormData>({
    passenger_count: 1,
    amount: 0,
    source: '',
    file_url: '',
    is_same_price: true,
    show_names: false,
    passengers_detail: [{ name: '', amount: 0 }],
    is_round_trip: false,
    outbound: {
      origin: '',
      destination: '',
      date: '',
      departure_time: '',
      arrival_time: '',
      notes: ''
    },
    return: {
      origin: '',
      destination: '',
      date: '',
      departure_time: '',
      arrival_time: '',
      notes: ''
    },
    currency: 'USD'
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
      .neq('source', 'agenda_session_only')
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
    else {
      const processed = (data || []).map(t => {
        try {
          if (t.notes && t.notes.startsWith('{')) {
            const flightData = JSON.parse(t.notes);
            return { ...t, flight_info: flightData };
          }
        } catch (e) { /* ignore */ }
        return t;
      });
      setTickets(processed);
    }
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

    const flightData = {
      is_round_trip: formData.is_round_trip,
      outbound: formData.outbound,
      return: formData.is_round_trip ? formData.return : null,
      currency: formData.currency || 'USD'
    };

    const payload: any = {
      client_id: selectedClientId,
      passenger_count: formData.passenger_count,
      amount: totalAmount,
      source: formData.source || '',
      file_url: formData.file_url || '',
      notes: JSON.stringify({ ...flightData, currency: formData.currency || 'USD' }),
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
      console.error('Save error:', result.error);
      alert('Error al guardar el pasaje: ' + result.error.message);
    } else {
      const savedTicket = { ...result.data[0], flight_info: flightData };
      if (editingId) {
        setTickets(tickets.map(t => t.id === editingId ? savedTicket : t));
      } else {
        setTickets([savedTicket, ...tickets]);
      }
      closeModal();
    }
  };

  const openModal = (ticket?: any) => {
    if (ticket) {
      if (ticket.flight_info) {
        setFormData({
          ...ticket,
          ...ticket.flight_info,
          outbound: ticket.flight_info.outbound || { ...defaultLeg },
          return: ticket.flight_info.return || { ...defaultLeg },
          show_names: ticket.show_names || false,
          currency: ticket.flight_info.currency || 'USD'
        });
      } else {
        // Fallback for old tickets
        setFormData({
          ...ticket,
          show_names: false,
          is_round_trip: false,
          outbound: {
            origin: ticket.origin || '',
            destination: ticket.destination || '',
            date: ticket.departure_date || '',
            departure_time: ticket.departure_time || '',
            arrival_time: ticket.arrival_time || '',
            notes: ''
          },
          return: { ...defaultLeg }
        });
      }
      setEditingId(ticket.id);
    } else {
      setFormData({
        passenger_count: 1,
        amount: 0,
        source: '',
        file_url: '',
        is_same_price: true,
        show_names: false,
        passengers_detail: [{ name: '', amount: 0 }],
        is_round_trip: false,
        outbound: { ...defaultLeg },
        return: { ...defaultLeg },
        currency: 'USD'
      });
      setEditingId(null);
    }
    setActiveTab('costs');
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingId(null);
    setActiveTab('costs');
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
                          <span className="ticket-date">
                            {ticket.flight_info ? (
                              <>
                                {ticket.flight_info.outbound?.origin || '---'} → {ticket.flight_info.outbound?.destination || '---'}
                                {ticket.flight_info.is_round_trip && ` (I/V)`}
                              </>
                            ) : new Date(ticket.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <div className="ticket-body">
                        {ticket.flight_info && (
                          <div className="ticket-itinerary-preview mb-4">
                            <div className="itinerary-row">
                              <span className="leg-label">IDA</span>
                              <span className="leg-date">{ticket.flight_info.outbound?.date ? new Date(ticket.flight_info.outbound.date + 'T00:00:00').toLocaleDateString() : '---'}</span>
                              <span className="leg-time">{ticket.flight_info.outbound?.departure_time || '--:--'} hs</span>
                            </div>
                            {ticket.flight_info.is_round_trip && (
                              <div className="itinerary-row mt-1">
                                <span className="leg-label">VTA</span>
                                <span className="leg-date">{ticket.flight_info.return?.date ? new Date(ticket.flight_info.return.date + 'T00:00:00').toLocaleDateString() : '---'}</span>
                                <span className="leg-time">{ticket.flight_info.return?.departure_time || '--:--'} hs</span>
                              </div>
                            )}
                          </div>
                        )}
                        <div className="ticket-stat mb-3">
                          <Users size={16} />
                          <span>{ticket.passenger_count} Pasajeros</span>
                        </div>
                        <div className="price-info-card">
                          <div className="price-row">
                            <span className="price-label">Monto Total</span>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                              <span className="price-value" style={{ fontSize: '1.2rem' }}>
                                {ticket.flight_info?.currency === 'ARS' ? '$' : 'USD'} {ticket.amount.toLocaleString()}
                              </span>
                              <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '600' }}>
                                {ticket.flight_info?.currency === 'ARS' ? 
                                  `USD ${(ticket.amount / 1250).toLocaleString(undefined, {maximumFractionDigits: 0})}` : 
                                  `$ ${(ticket.amount * 1250).toLocaleString()} ARS`
                                }
                              </span>
                            </div>
                          </div>
                          {ticket.is_same_price && (
                            <div className="price-row individual">
                              <span className="price-label">Por persona</span>
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                                <span className="price-value" style={{ fontSize: '0.95rem' }}>
                                  {ticket.flight_info?.currency === 'ARS' ? '$' : 'USD'} {(ticket.amount / (ticket.passenger_count || 1)).toLocaleString()}
                                </span>
                                <span style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: '600' }}>
                                  {ticket.flight_info?.currency === 'ARS' ? 
                                    `USD ${((ticket.amount / (ticket.passenger_count || 1)) / 1250).toLocaleString(undefined, {maximumFractionDigits: 0})}` : 
                                    `$ ${((ticket.amount / (ticket.passenger_count || 1)) * 1250).toLocaleString()} ARS`
                                  }
                                </span>
                              </div>
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
          <div className="modal-content-pro" style={{ maxWidth: '600px', width: '95%' }}>
            <div className="modal-header-pro">
              <div className="header-left">
                <div className="header-icon">
                  <Plane size={24} />
                </div>
                <div className="header-text">
                  <h3>{editingId ? 'Editar Pasaje' : 'Cargar Nuevo Pasaje'}</h3>
                  <p>{editingId ? 'Modifica los detalles del vuelo' : 'Ingresa la información del nuevo pasaje'}</p>
                </div>
              </div>
              <button className="close-modal-btn" onClick={closeModal}><X size={20} /></button>
            </div>
            
            <div className="modal-tabs">
              <button className={`tab-btn ${activeTab === 'costs' ? 'active' : ''}`} onClick={() => setActiveTab('costs')}>
                <DollarSign size={16} /> Costos
              </button>
              <button className={`tab-btn ${activeTab === 'outbound' ? 'active' : ''}`} onClick={() => setActiveTab('outbound')}>
                <Plane size={16} /> Vuelo Ida
              </button>
              <button 
                className={`tab-btn ${activeTab === 'return' ? 'active' : ''}`} 
                onClick={() => setActiveTab('return')}
                disabled={!formData.is_round_trip}
              >
                <PlaneLanding size={16} /> Vuelo Vuelta
              </button>
            </div>
            
            <div className="modal-body-pro custom-scroll" style={{ maxHeight: '70vh', overflowY: 'auto', padding: '0 1.5rem 1.5rem' }}>
              {activeTab === 'costs' && (
                <div className="tab-content-pane">
                  <div className="form-block">
                    <div className="form-row">
                      <div className="form-group flex-1">
                        <label className="text-xs font-semibold uppercase text-secondary display-block">Pasajeros</label>
                        <div className="input-with-icon">
                          <Users size={16} /><input type="number" min="1" className="form-input" value={formData.passenger_count} onChange={e => adjustPassengerCount(parseInt(e.target.value) || 1)} />
                        </div>
                      </div>
                      <div className="form-group flex-1">
                        <label className="text-xs font-semibold uppercase text-secondary display-block">Lugar de Compra</label>
                        <div className="input-with-icon">
                          <Building2 size={16} /><input type="text" className="form-input" value={formData.source} onChange={e => setFormData({ ...formData, source: e.target.value })} placeholder="Ej: Despegar..." />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="form-block">
                    <div className="form-row">
                      <div className="checkbox-pro-group">
                        <input id="same-price" type="checkbox" checked={formData.is_same_price} onChange={e => setFormData({ ...formData, is_same_price: e.target.checked })} />
                        <label htmlFor="same-price">Todos los pasajes cuestan lo mismo</label>
                      </div>
                      <div className="checkbox-pro-group">
                        <input id="show-names" type="checkbox" checked={formData.show_names} onChange={e => setFormData({ ...formData, show_names: e.target.checked })} />
                        <label htmlFor="show-names">Cargar nombres de pasajeros</label>
                      </div>
                    </div>
                  </div>

                  {formData.is_same_price && (
                     <div className="form-block">
                      <div className="form-row">
                        <div className="form-group flex-1">
                          <label className="text-xs font-semibold uppercase text-secondary display-block">Monto Total</label>
                          <div className="input-with-icon">
                            {formData.currency === 'ARS' ? <span style={{fontSize: '14px', fontWeight: 'bold', color: '#64748b', marginLeft: '8px'}}>$</span> : <DollarSign size={16} />}
                            <input type="number" className="form-input" value={formData.amount} onChange={e => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })} />
                          </div>
                        </div>
                        <div className="form-group flex-1">
                          <label className="text-xs font-semibold uppercase text-secondary display-block">Moneda</label>
                          <select 
                            className="form-input" 
                            value={formData.currency || 'USD'} 
                            onChange={e => setFormData({ ...formData, currency: e.target.value as 'USD' | 'ARS' })}
                          >
                            <option value="USD">Dólares (USD)</option>
                            <option value="ARS">Pesos (ARS)</option>
                          </select>
                        </div>
                      </div>
                      <div className="mt-2 text-xs font-medium text-blue-600 bg-blue-50 p-2 rounded-lg border border-blue-100">
                        {formData.currency === 'USD' ? (
                          <>Equivalente en Pesos: <strong>${(formData.amount * 1250).toLocaleString()} ARS</strong> (aprox.)</>
                        ) : (
                          <>Equivalente en Dólares: <strong>USD {(formData.amount / 1250).toLocaleString(undefined, {maximumFractionDigits: 2})}</strong> (aprox.)</>
                        )}
                      </div>
                    </div>
                  )}

                  {(!formData.is_same_price || formData.show_names) && (
                    <div className="form-block">
                      <label className="text-xs font-semibold uppercase text-secondary display-block mb-3">Detalle de Pasajeros</label>
                      <div className="passengers-detail-section custom-scroll" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                        {formData.passengers_detail?.map((p, i) => (
                          <div key={i} className="passenger-input-row" style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.75rem' }}>
                            <div className="input-with-icon" style={{ flex: 2 }}>
                              <User size={14} /><input type="text" className="form-input" placeholder={`Nombre completo del pasajero ${i+1}`} value={p.name} onChange={e => updatePassengerDetail(i, 'name', e.target.value)} />
                            </div>
                            {!formData.is_same_price && (
                              <div className="input-with-icon" style={{ flex: 1 }}>
                                <DollarSign size={14} /><input type="number" className="form-input" placeholder="Monto" value={p.amount} onChange={e => updatePassengerDetail(i, 'amount', parseFloat(e.target.value) || 0)} />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="form-block mt-4">
                    <label className="text-xs font-semibold uppercase text-secondary display-block mb-2">Archivo del Pasaje (PDF/Imagen)</label>
                    <div className="file-upload-pro">
                      <input 
                        type="file" 
                        id="ticket-file" 
                        style={{ display: 'none' }} 
                        onChange={handleFileUpload} 
                        accept=".pdf,image/*" 
                      />
                      <label htmlFor="ticket-file" className={`file-label-pro ${isUploading ? 'uploading' : ''} ${formData.file_url ? 'has-file' : ''}`}>
                        {isUploading ? (
                          <div className="upload-spinner"></div>
                        ) : formData.file_url ? (
                          <Save size={20} />
                        ) : (
                          <FileText size={20} />
                        )}
                        <span>{isUploading ? 'Subiendo archivo...' : formData.file_url ? 'Pasaje cargado con éxito' : 'Seleccionar PDF o Imagen'}</span>
                      </label>
                      {formData.file_url && !isUploading && (
                        <button className="remove-file-btn" onClick={() => setFormData({...formData, file_url: ''})}>
                          <Trash2 size={14} /> Eliminar
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'outbound' && (
                <div className="tab-content-pane">
                  <div className="form-block">
                    <div className="checkbox-pro-group" style={{ background: '#eff6ff', borderColor: '#bfdbfe' }}>
                      <input id="round-trip" type="checkbox" checked={formData.is_round_trip} onChange={e => setFormData({ ...formData, is_round_trip: e.target.checked })} />
                      <label htmlFor="round-trip">Es un viaje de IDA Y VUELTA?</label>
                    </div>
                  </div>

                  <div className="form-block">
                    <div className="form-row">
                      <div className="form-group flex-1">
                        <label className="text-xs font-semibold uppercase text-secondary display-block">Origen (De dónde)</label>
                        <div className="input-with-icon">
                          <Plane size={16} /><input type="text" className="form-input" value={formData.outbound?.origin || ''} onChange={e => setFormData({ ...formData, outbound: { ...formData.outbound, origin: e.target.value } })} placeholder="Ej: Buenos Aires" />
                        </div>
                      </div>
                      <div className="form-group flex-1">
                        <label className="text-xs font-semibold uppercase text-secondary display-block">Destino (A dónde)</label>
                        <div className="input-with-icon">
                          <PlaneLanding size={16} /><input type="text" className="form-input" value={formData.outbound?.destination || ''} onChange={e => setFormData({ ...formData, outbound: { ...formData.outbound, destination: e.target.value } })} placeholder="Ej: Madrid" />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="form-block">
                    <div className="form-row triple">
                      <div className="form-group flex-1">
                        <label className="text-xs font-semibold uppercase text-secondary display-block">Fecha Salida</label>
                        <input type="date" className="form-input" style={{ paddingLeft: '0.75rem' }} value={formData.outbound?.date || ''} onChange={e => setFormData({ ...formData, outbound: { ...formData.outbound, date: e.target.value } })} />
                      </div>
                      <div className="form-group flex-1">
                        <label className="text-xs font-semibold uppercase text-secondary display-block">Hora Salida</label>
                        <input type="time" className="form-input" style={{ paddingLeft: '0.75rem' }} value={formData.outbound?.departure_time || ''} onChange={e => setFormData({ ...formData, outbound: { ...formData.outbound, departure_time: e.target.value } })} />
                      </div>
                      <div className="form-group flex-1">
                        <label className="text-xs font-semibold uppercase text-secondary display-block">Hora Llegada</label>
                        <input type="time" className="form-input" style={{ paddingLeft: '0.75rem' }} value={formData.outbound?.arrival_time || ''} onChange={e => setFormData({ ...formData, outbound: { ...formData.outbound, arrival_time: e.target.value } })} />
                      </div>
                    </div>
                  </div>

                  <div className="form-block">
                    <div className="form-group">
                      <label className="text-xs font-semibold uppercase text-secondary display-block">Notas del vuelo</label>
                      <textarea 
                        className="form-input" 
                        style={{ height: '80px', paddingTop: '0.75rem' }} 
                        placeholder="Ej: Localizador, aerolinea, escala..."
                        value={formData.outbound?.notes || ''}
                        onChange={e => setFormData({ ...formData, outbound: { ...formData.outbound, notes: e.target.value } })}
                      />
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'return' && formData.is_round_trip && (
                <div className="tab-content-pane">
                  <div className="form-block">
                    <div className="form-row">
                      <div className="form-group flex-1">
                        <label className="text-xs font-semibold uppercase text-secondary display-block">Origen (De dónde)</label>
                        <div className="input-with-icon">
                          <Plane size={16} /><input type="text" className="form-input" value={formData.return?.origin || ''} onChange={e => setFormData({ ...formData, return: { ...formData.return || defaultLeg, origin: e.target.value } })} placeholder="Ej: Madrid" />
                        </div>
                      </div>
                      <div className="form-group flex-1">
                        <label className="text-xs font-semibold uppercase text-secondary display-block">Destino (A dónde)</label>
                        <div className="input-with-icon">
                          <PlaneLanding size={16} /><input type="text" className="form-input" value={formData.return?.destination || ''} onChange={e => setFormData({ ...formData, return: { ...formData.return || defaultLeg, destination: e.target.value } })} placeholder="Ej: Buenos Aires" />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="form-block">
                    <div className="form-row triple">
                      <div className="form-group flex-1">
                        <label className="text-xs font-semibold uppercase text-secondary display-block">Fecha Regreso</label>
                        <input type="date" className="form-input" style={{ paddingLeft: '0.75rem' }} value={formData.return?.date || ''} onChange={e => setFormData({ ...formData, return: { ...formData.return || defaultLeg, date: e.target.value } })} />
                      </div>
                      <div className="form-group flex-1">
                        <label className="text-xs font-semibold uppercase text-secondary display-block">Hora Salida</label>
                        <input type="time" className="form-input" style={{ paddingLeft: '0.75rem' }} value={formData.return?.departure_time || ''} onChange={e => setFormData({ ...formData, return: { ...formData.return || defaultLeg, departure_time: e.target.value } })} />
                      </div>
                      <div className="form-group flex-1">
                        <label className="text-xs font-semibold uppercase text-secondary display-block">Hora Llegada</label>
                        <input type="time" className="form-input" style={{ paddingLeft: '0.75rem' }} value={formData.return?.arrival_time || ''} onChange={e => setFormData({ ...formData, return: { ...formData.return || defaultLeg, arrival_time: e.target.value } })} />
                      </div>
                    </div>
                  </div>

                  <div className="form-block">
                    <div className="form-group">
                      <label className="text-xs font-semibold uppercase text-secondary display-block">Notas del vuelo</label>
                      <textarea 
                        className="form-input" 
                        style={{ height: '80px', paddingTop: '0.75rem' }} 
                        placeholder="Notas del regreso..."
                        value={formData.return?.notes || ''}
                        onChange={e => setFormData({ ...formData, return: { ...formData.return || defaultLeg, notes: e.target.value } })}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <div className="modal-footer-pro" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', padding: '1.5rem 2.5rem' }}>
              <button className="btn btn-outline" onClick={closeModal} style={{ borderRadius: '14px', padding: '1rem' }}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleSave} style={{ borderRadius: '14px', padding: '1rem', gap: '0.75rem' }}>
                <Save size={18} /> {editingId ? 'Actualizar Pasaje' : 'Guardar Pasaje'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

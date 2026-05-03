/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  FileText, 
  Plus, 
  Trash2, 
  ChevronRight, 
  ChevronDown,
  User as UserIcon,
  CreditCard,
  Notebook,
  X,
  Check,
  Calendar,
  MapPin,
  Clock,
  Receipt
} from 'lucide-react';
import MDEditor from '@uiw/react-md-editor';
import { supabase } from '../../../lib/supabase';
import './Tareas.css';

interface ServiceItem {
  id: string;
  name: string;
  price: number;
  type?: 'hotel' | 'transport' | 'excursion' | 'generic';
  capacity?: number;
  pricing_type?: 'per_person' | 'per_group';
}

interface ClientTask {
  serviceId: string;
  name: string;
  price: number;
  date: string;
  completed: boolean;
}

interface ClientNote {
  id: string;
  content: string;
  date: string;
}

interface ClientBilling {
  clientId: string;
  tasks: ClientTask[];
  notes: ClientNote[];
  departureDate?: string;
  returnDate?: string;
  destination?: string;
  origin?: string;
  departureTime?: string;
  arrivalTime?: string;
  returnDepartureTime?: string;
  returnArrivalTime?: string;
  arrivalDate?: string;
  returnArrivalDate?: string;
  returnOrigin?: string;
  returnDestination?: string;
  passengers: number;
}

interface Client {
  id: string;
  name: string;
  email?: string;
  phone?: string;
}

export default function TareasPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loadingClients, setLoadingClients] = useState(true);
  const [loadingBilling, setLoadingBilling] = useState(false);
  const [billingData, setBillingData] = useState<ClientBilling | null>(null);
  
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | null>(null);
  const [services, setServices] = useState<ServiceItem[]>([]);

  // Notes state
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [currentNoteContent, setCurrentNoteContent] = useState('');

  // Accordion state
  const [expandedSection, setExpandedSection] = useState<'fechas' | 'tareas' | 'notas' | null>('fechas');

  const toggleSection = (section: 'fechas' | 'tareas' | 'notas') => {
    setExpandedSection(prev => prev === section ? null : section);
  };

  useEffect(() => {
    fetchClients();
    fetchServices();
  }, []);

  useEffect(() => {
    if (selectedClientId) {
      fetchBilling(selectedClientId);
    } else {
      setBillingData(null);
    }
  }, [selectedClientId]);

  const fetchClients = async () => {
    setLoadingClients(true);
    const { data, error } = await supabase
      .from('clients')
      .select('id, name, email, phone')
      .order('name', { ascending: true });
    
    if (error) console.error('Error fetching clients:', error);
    else setClients(data || []);
    setLoadingClients(false);
  };

  const fetchServices = async () => {
    // Fetch generic services
    const { data: genericServices } = await supabase.from('services').select('*').order('name');
    
    // Fetch catalog items (Hotels, Transports, Excursions)
    const { data: catalogItems } = await supabase.from('catalog_items').select('*, catalog_folders(type)');

    const mappedCatalog: ServiceItem[] = (catalogItems || []).map(i => ({
      id: i.id,
      name: `[${(i.catalog_folders as any)?.type?.toUpperCase() || 'CAT'}] ${i.name}`,
      price: i.cost_usd || i.price || 0,
      type: (i.catalog_folders as any)?.type,
      capacity: i.capacity || (i.catalog_folders as any)?.type === 'hotel' ? 2 : 1,
      pricing_type: i.pricing_type || ((i.catalog_folders as any)?.type === 'excursion' ? 'per_person' : 'per_group')
    }));

    const mappedGeneric: ServiceItem[] = (genericServices || []).map(s => ({
      ...s,
      type: 'generic',
      capacity: 1,
      pricing_type: 'per_group'
    }));

    setServices([...mappedGeneric, ...mappedCatalog]);
  };

  const fetchBilling = async (clientId: string) => {
    setLoadingBilling(true);
    const { data, error } = await supabase
      .from('client_billing')
      .select('*')
      .eq('client_id', clientId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching billing:', error);
    } else if (data) {
      let parsedNotes: ClientNote[] = [];
      if (data.notes) {
        try {
          const parsed = JSON.parse(data.notes);
          if (Array.isArray(parsed)) {
            parsedNotes = parsed;
          } else {
            parsedNotes = [{ id: 'legacy', content: data.notes, date: new Date().toISOString() }];
          }
        } catch {
          parsedNotes = [{ id: 'legacy', content: data.notes, date: new Date().toISOString() }];
        }
      }

      setBillingData({
        clientId: data.client_id,
        tasks: (data.tasks as ClientTask[]) || [],
        notes: parsedNotes,
        departureDate: data.departure_date || '',
        returnDate: data.return_date || '',
        destination: data.destination || '',
        origin: data.origin || '',
        departureTime: data.departure_time || '',
        arrivalTime: data.arrival_time || '',
        returnDepartureTime: data.return_departure_time || '',
        returnArrivalTime: data.return_arrival_time || '',
        arrivalDate: data.arrival_date || '',
        returnArrivalDate: data.return_arrival_date || '',
        returnOrigin: data.return_origin || '',
        returnDestination: data.return_destination || '',
        passengers: data.passengers || 1
      });
    } else {
      setBillingData({
        clientId: clientId,
        tasks: [],
        notes: [],
        destination: '',
        origin: '',
        passengers: 1
      });
    }
    setLoadingBilling(false);
  };

  const saveBilling = async (updatedData: ClientBilling) => {
    setSaveStatus('saving');
    const dbData = {
      client_id: updatedData.clientId,
      tasks: updatedData.tasks,
      notes: JSON.stringify(updatedData.notes),
      departure_date: updatedData.departureDate || null,
      return_date: updatedData.returnDate || null,
      destination: updatedData.destination || null,
      origin: updatedData.origin || null,
      departure_time: updatedData.departureTime || null,
      arrival_time: updatedData.arrivalTime || null,
      return_departure_time: updatedData.returnDepartureTime || null,
      return_arrival_time: updatedData.returnArrivalTime || null,
      arrival_date: updatedData.arrivalDate || null,
      return_arrival_date: updatedData.returnArrivalDate || null,
      return_origin: updatedData.returnOrigin || null,
      return_destination: updatedData.returnDestination || null,
      passengers: updatedData.passengers
    };

    const { error } = await supabase
      .from('client_billing')
      .upsert(dbData, { onConflict: 'client_id' });

    if (error) {
      console.error('Error saving billing:', error);
      setSaveStatus(null);
      alert('Error al guardar los datos: ' + error.message);
    } else {
      setSaveStatus('saved');
      // Hacer que el estado "Guardado" sea visible por 3 segundos
      setTimeout(() => setSaveStatus(null), 3000);
    }
  };

  const filteredClients = clients.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedClient = clients.find(c => c.id === selectedClientId);

  const handleAddTask = (service: ServiceItem) => {
    if (!selectedClientId || !billingData) return;
    
    let finalPrice = service.price;
    const passengers = billingData.passengers || 1;

    if (service.pricing_type === 'per_person') {
      finalPrice = service.price * passengers;
    } else if (service.type === 'hotel' || service.type === 'transport' || service.pricing_type === 'per_group') {
      const cap = service.capacity || 1;
      const unitsNeeded = Math.ceil(passengers / cap);
      finalPrice = service.price * unitsNeeded;
    }

    const newTask: ClientTask = {
      serviceId: service.id,
      name: service.name,
      price: finalPrice,
      date: new Date().toISOString(),
      completed: false
    };

    const updated: ClientBilling = {
      ...billingData,
      tasks: [...billingData.tasks, newTask]
    };
    setBillingData(updated);
    saveBilling(updated);
    setIsAddingTask(false);
  };

  const handleToggleComplete = (index: number) => {
    if (!billingData) return;
    const newTasks = [...billingData.tasks];
    newTasks[index] = { ...newTasks[index], completed: !newTasks[index].completed };
    const updated: ClientBilling = { ...billingData, tasks: newTasks };
    setBillingData(updated);
    saveBilling(updated);
  };

  const handleRemoveTask = (index: number) => {
    if (!billingData) return;
    const newTasks = [...billingData.tasks];
    newTasks.splice(index, 1);
    const updated: ClientBilling = { ...billingData, tasks: newTasks };
    setBillingData(updated);
    saveBilling(updated);
  };

  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleUpdateBillingField = (field: keyof ClientBilling, value: any) => {
    if (!selectedClientId || !billingData) return;
    
    setSaveStatus('saving');
    const updated: ClientBilling = { 
      ...billingData, 
      [field]: value 
    };
    
    setBillingData(updated);

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      saveBilling(updated);
    }, 1000);
  };

  const handleAddNote = () => {
    const newNote: ClientNote = { id: Date.now().toString(), content: '', date: new Date().toISOString() };
    setEditingNoteId(newNote.id);
    setCurrentNoteContent('');
  };

  const handleSaveNote = () => {
    if (!editingNoteId || !billingData) return;
    
    let newNotes = [...(billingData.notes || [])];
    const existingIndex = newNotes.findIndex(n => n.id === editingNoteId);
    
    if (existingIndex >= 0) {
      newNotes[existingIndex].content = currentNoteContent;
    } else {
      newNotes.push({ id: editingNoteId, content: currentNoteContent, date: new Date().toISOString() });
    }
    
    handleUpdateBillingField('notes', newNotes);
    setEditingNoteId(null);
    setCurrentNoteContent('');
  };

  const handleEditNote = (note: ClientNote) => {
    setEditingNoteId(note.id);
    setCurrentNoteContent(note.content);
  };

  const handleDeleteNote = (id: string) => {
    if (!billingData) return;
    const newNotes = (billingData.notes || []).filter(n => n.id !== id);
    handleUpdateBillingField('notes', newNotes);
    if (editingNoteId === id) {
      setEditingNoteId(null);
      setCurrentNoteContent('');
    }
  };

  const getCalculatedArrivalDateStr = (depDateStr?: string, depTimeStr?: string, arrTimeStr?: string) => {
    if (!depDateStr || !depTimeStr || !arrTimeStr) return null;
    const depTime = parseInt(depTimeStr.replace(':', ''));
    const arrTime = parseInt(arrTimeStr.replace(':', ''));
    
    if (isNaN(depTime) || isNaN(arrTime)) return null;

    const depDate = new Date(depDateStr + 'T12:00:00');
    const isNextDay = arrTime < depTime;
    
    if (isNextDay) {
      depDate.setDate(depDate.getDate() + 1);
    }
    
    return {
      dateStr: depDate.toISOString().split('T')[0],
      isNextDay
    };
  };

  const calculateTotal = (tasks: ClientTask[]) => {
    return tasks
      .filter(t => t.completed)
      .reduce((sum, t) => sum + t.price, 0);
  };

  const arrivalInfo = getCalculatedArrivalDateStr(billingData?.departureDate, billingData?.departureTime, billingData?.arrivalTime);
  const returnArrivalInfo = getCalculatedArrivalDateStr(billingData?.returnDate, billingData?.returnDepartureTime, billingData?.returnArrivalTime);

  return (
    <div className="tareas-page animate-fade-in">
      <header className="page-header-centered">
        <h1>Gestión de Tareas y Boletas</h1>
        <p>Registra cada acción realizada para tus clientes y genera sus estados de cuenta actualizados.</p>
      </header>

      <div className="tareas-container">
        {/* Left Panel: Client List */}
        <div className="clients-sidebar glass-card">
          <div className="sidebar-search">
            <Search size={18} className="search-icon" />
            <input 
              type="text" 
              placeholder="Buscar cliente..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="client-list custom-scrollbar" style={{ maxHeight: 'calc(100vh - 350px)', overflowY: 'auto' }}>
            {loadingClients ? (
              <div className="p-4 text-center"><div className="loader-premium"></div></div>
            ) : filteredClients.length === 0 ? (
              <div className="p-4 text-center text-secondary">No se encontraron clientes</div>
            ) : (
              filteredClients.map(client => (
                <button 
                  key={client.id}
                  className={`client-item ${selectedClientId === client.id ? 'active' : ''}`}
                  onClick={() => setSelectedClientId(client.id)}
                >
                  <div className="client-avatar">{client.name.charAt(0)}</div>
                  <div className="client-info">
                    <span className="client-name">{client.name}</span>
                    <span className="client-sub">{client.email || client.phone || 'Sin contacto'}</span>
                  </div>
                  <ChevronRight size={16} className="chevron" />
                </button>
              ))
            )}
          </div>
        </div>

        {/* Right Panel: Billing Details */}
        <div className="billing-main">
          {loadingBilling ? (
            <div className="billing-empty-state glass-card">
              <div className="loader-premium"></div>
              <p>Cargando información del cliente...</p>
            </div>
          ) : selectedClient && billingData ? (
            <div className="billing-content animate-slide-up">
              <div className="billing-header glass-card">
                <div className="client-summary">
                  <UserIcon size={32} className="icon-bg" />
                  <div>
                    <h2>{selectedClient.name}</h2>
                    <p>{selectedClient.email} • {selectedClient.phone}</p>
                  </div>
                </div>
                <div className="billing-total-badge">
                  <span className="label">Total a Cobrar</span>
                  <span className="amount">${calculateTotal(billingData.tasks).toLocaleString('es-AR')}</span>
                </div>
              </div>

              <div className="billing-sections-stack">
                {/* 1. Fechas del Viaje */}
                <div className="billing-section glass-card">
                  <div className="section-header" style={{ cursor: 'pointer', marginBottom: expandedSection === 'fechas' ? '1.5rem' : '0' }} onClick={() => toggleSection('fechas')}>
                    <div className="title-with-icon">
                      <Calendar size={20} />
                      <h3>Fechas del Viaje</h3>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      {saveStatus && (
                        <div className={`save-badge ${saveStatus}`}>
                          {saveStatus === 'saving' ? 'Guardando...' : 'Guardado'}
                        </div>
                      )}
                      {expandedSection === 'fechas' ? <ChevronDown size={20} className="text-secondary" /> : <ChevronRight size={20} className="text-secondary" />}
                    </div>
                  </div>
                  
                  {expandedSection === 'fechas' && (
                    <div className="travel-info-inputs animate-fade-in">
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                      <div className="form-group">
                        <label className="text-xs font-semibold uppercase text-secondary" style={{ letterSpacing: '0.5px', marginBottom: '0.5rem', display: 'block' }}>Origen</label>
                        <div className="input-with-icon">
                          <MapPin size={16} />
                          <input 
                            type="text" 
                            className="form-input"
                            placeholder="Ej: Buenos Aires"
                            value={billingData.origin || ''}
                            onChange={e => handleUpdateBillingField('origin', e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="form-group">
                        <label className="text-xs font-semibold uppercase text-secondary" style={{ letterSpacing: '0.5px', marginBottom: '0.5rem', display: 'block' }}>Destino</label>
                        <div className="input-with-icon">
                          <MapPin size={16} />
                          <input 
                            type="text" 
                            className="form-input"
                            placeholder="Ej: Madrid"
                            value={billingData.destination || ''}
                            onChange={e => handleUpdateBillingField('destination', e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="form-group">
                        <label className="text-xs font-semibold uppercase text-secondary" style={{ letterSpacing: '0.5px', marginBottom: '0.5rem', display: 'block' }}>Pasajeros</label>
                        <div className="input-with-icon">
                          <UserIcon size={16} />
                          <input 
                            type="number" 
                            min="1"
                            className="form-input"
                            placeholder="Ej: 2"
                            value={billingData.passengers || 1}
                            onChange={e => handleUpdateBillingField('passengers', parseInt(e.target.value) || 1)}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="border-top pt-4 mt-2">
                      <div className="mb-3" style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', fontFamily: 'var(--font-family, system-ui, sans-serif)' }}>
                        Vuelo de Ida
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                        <div className="form-group">
                          <label className="text-xs font-semibold uppercase text-secondary" style={{ letterSpacing: '0.5px', marginBottom: '0.5rem', display: 'block' }}>Fecha de Salida</label>
                          <div className="input-with-icon">
                            <Calendar size={16} />
                            <input 
                              type="date" 
                              className="form-input"
                              value={billingData.departureDate || ''}
                              onChange={e => handleUpdateBillingField('departureDate', e.target.value)}
                            />
                          </div>
                        </div>
                        <div className="form-group">
                          <label className="text-xs font-semibold uppercase text-secondary" style={{ letterSpacing: '0.5px', marginBottom: '0.5rem', display: 'block' }}>Hora de Salida</label>
                          <div className="input-with-icon">
                            <Clock size={16} />
                            <input 
                              type="time" 
                              className="form-input"
                              value={billingData.departureTime || ''}
                              onChange={e => handleUpdateBillingField('departureTime', e.target.value)}
                            />
                          </div>
                        </div>
                        <div className="form-group">
                          <label className="text-xs font-semibold uppercase text-secondary" style={{ letterSpacing: '0.5px', marginBottom: '0.5rem', display: 'block' }}>Hora de Llegada</label>
                          <div className="input-with-icon">
                            <Clock size={16} />
                            <input 
                              type="time" 
                              className="form-input"
                              value={billingData.arrivalTime || ''}
                              onChange={e => handleUpdateBillingField('arrivalTime', e.target.value)}
                            />
                          </div>
                          {arrivalInfo && arrivalInfo.isNextDay && (
                            <div className="animate-fade-in" style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--color-accent)', fontWeight: 700 }}>
                              +1 Día ({new Date(arrivalInfo.dateStr + 'T12:00:00').toLocaleDateString('es-AR')})
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="border-top pt-4 mt-2">
                      <div className="mb-3" style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', fontFamily: 'var(--font-family, system-ui, sans-serif)' }}>
                        Vuelo de Vuelta
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                        <div className="form-group">
                          <label className="text-xs font-semibold uppercase text-secondary" style={{ letterSpacing: '0.5px', marginBottom: '0.5rem', display: 'block' }}>Fecha de Regreso</label>
                          <div className="input-with-icon">
                            <Calendar size={16} />
                            <input 
                              type="date" 
                              className="form-input"
                              value={billingData.returnDate || ''}
                              onChange={e => handleUpdateBillingField('returnDate', e.target.value)}
                            />
                          </div>
                        </div>
                        <div className="form-group">
                          <label className="text-xs font-semibold uppercase text-secondary" style={{ letterSpacing: '0.5px', marginBottom: '0.5rem', display: 'block' }}>Hora de Salida</label>
                          <div className="input-with-icon">
                            <Clock size={16} />
                            <input 
                              type="time" 
                              className="form-input"
                              value={billingData.returnDepartureTime || ''}
                              onChange={e => handleUpdateBillingField('returnDepartureTime', e.target.value)}
                            />
                          </div>
                        </div>
                        <div className="form-group">
                          <label className="text-xs font-semibold uppercase text-secondary" style={{ letterSpacing: '0.5px', marginBottom: '0.5rem', display: 'block' }}>Hora de Llegada</label>
                          <div className="input-with-icon">
                            <Clock size={16} />
                            <input 
                              type="time" 
                              className="form-input"
                              value={billingData.returnArrivalTime || ''}
                              onChange={e => handleUpdateBillingField('returnArrivalTime', e.target.value)}
                            />
                          </div>
                          {returnArrivalInfo && returnArrivalInfo.isNextDay && (
                            <div className="animate-fade-in" style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--color-accent)', fontWeight: 700 }}>
                              +1 Día ({new Date(returnArrivalInfo.dateStr + 'T12:00:00').toLocaleDateString('es-AR')})
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'center', marginTop: '2.5rem', paddingBottom: '0.5rem' }}>
                      <button 
                        className={`btn ${saveStatus === 'saved' ? 'btn-success' : 'btn-primary'}`} 
                        style={{ 
                          minWidth: '280px', 
                          borderRadius: '50px', 
                          padding: '0.875rem 2.5rem', 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '0.75rem', 
                          justifyContent: 'center', 
                          boxShadow: saveStatus === 'saved' ? '0 10px 25px -5px rgba(16, 185, 129, 0.4)' : '0 10px 25px -5px rgba(59, 130, 246, 0.4)',
                          transition: 'all 0.3s ease'
                        }}
                        onClick={() => saveBilling(billingData!)}
                        disabled={saveStatus === 'saving'}
                      >
                        {saveStatus === 'saving' ? (
                          <>
                            <div className="loader-premium-xs"></div>
                            Guardando...
                          </>
                        ) : saveStatus === 'saved' ? (
                          <>
                            <Check size={18} />
                            ¡Datos Guardados!
                          </>
                        ) : (
                          <>
                            <Receipt size={18} />
                            Guardar Datos del Viaje
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                  )}
                </div>

                {/* 2. Tareas */}
                <div className="billing-section glass-card">
                  <div className="section-header" style={{ cursor: 'pointer', marginBottom: expandedSection === 'tareas' ? '1.5rem' : '0' }} onClick={() => toggleSection('tareas')}>
                    <div className="title-with-icon">
                      <CreditCard size={20} />
                      <h3>Servicios y Pagos</h3>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <button 
                        className="btn btn-primary btn-sm" 
                        onClick={(e) => { e.stopPropagation(); setIsAddingTask(true); }}
                      >
                        <Plus size={16} />
                        Agregar Servicio
                      </button>
                      {expandedSection === 'tareas' ? <ChevronDown size={20} className="text-secondary" /> : <ChevronRight size={20} className="text-secondary" />}
                    </div>
                  </div>
                  
                  {expandedSection === 'tareas' && (
                    <div className="tasks-list animate-fade-in">
                    {billingData.tasks.length > 0 ? (
                      billingData.tasks.map((task, idx) => (
                        <div key={idx} className={`task-item ${task.completed ? 'completed' : ''}`}>
                          <div className="task-main-row">
                            <button 
                              className={`task-check ${task.completed ? 'active' : ''}`}
                              onClick={() => handleToggleComplete(idx)}
                            >
                              <Check size={14} />
                            </button>
                            <div className="task-details">
                              <span className="task-name">{task.name}</span>
                              <span className="task-date">{new Date(task.date).toLocaleDateString()}</span>
                            </div>
                            <div className="task-price-row">
                              <span className="task-price">${task.price.toLocaleString('es-AR')}</span>
                              <button className="btn-delete-task" onClick={() => handleRemoveTask(idx)}>
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="empty-state">
                        <FileText size={40} />
                        <p>No hay tareas cargadas</p>
                      </div>
                    )}
                  </div>
                  )}
                </div>

                {/* 3. Notas y Datos */}
                <div className="billing-section glass-card">
                  <div className="section-header" style={{ cursor: 'pointer', marginBottom: expandedSection === 'notas' ? '1.5rem' : '0' }} onClick={() => toggleSection('notas')}>
                    <div className="title-with-icon">
                      <Notebook size={20} />
                      <h3>Notas y Datos</h3>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      {!editingNoteId && (
                        <button 
                          className="btn btn-primary btn-sm" 
                          onClick={(e) => { e.stopPropagation(); handleAddNote(); }}
                        >
                          <Plus size={16} />
                          Nueva Nota
                        </button>
                      )}
                      {expandedSection === 'notas' ? <ChevronDown size={20} className="text-secondary" /> : <ChevronRight size={20} className="text-secondary" />}
                    </div>
                  </div>
                  
                  {expandedSection === 'notas' && (
                    <div className="animate-fade-in">
                  
                  {editingNoteId ? (
                    <div className="note-editor-container animate-fade-in">
                      <div className="quill-wrapper" style={{ border: '1px solid rgba(0,0,0,0.05)', borderRadius: '12px', overflow: 'hidden' }} data-color-mode="light">
                        <MDEditor
                          value={currentNoteContent}
                          onChange={(val) => setCurrentNoteContent(val || '')}
                          preview="edit"
                          height={250}
                          textareaProps={{
                            placeholder: "Escribe tu nota, usa negritas, listas o enumera..."
                          }}
                          visibleDragbar={false}
                        />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                        <button className="btn btn-secondary btn-sm" onClick={() => setEditingNoteId(null)}>Cancelar</button>
                        <button className="btn btn-primary btn-sm" onClick={handleSaveNote}>Guardar Nota</button>
                      </div>
                    </div>
                  ) : (
                    <div className="notes-list" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      {(billingData.notes || []).length > 0 ? (
                        (billingData.notes || []).map(note => (
                          <div key={note.id} className="note-card animate-fade-in" style={{ padding: '1.25rem', background: 'rgba(0,0,0,0.02)', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.05)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                                {new Date(note.date).toLocaleString('es-AR')}
                              </span>
                              <div style={{ display: 'flex', gap: '0.75rem' }}>
                                <button 
                                  onClick={() => handleEditNote(note)} 
                                  style={{ background: 'none', border: 'none', color: 'var(--color-primary)', cursor: 'pointer', opacity: 0.7, fontWeight: 600, fontSize: '0.85rem' }}
                                >
                                  Editar
                                </button>
                                <button 
                                  onClick={() => handleDeleteNote(note.id)} 
                                  style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', opacity: 0.7 }}
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </div>
                            <div data-color-mode="light" style={{ fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                              <MDEditor.Markdown source={note.content} style={{ background: 'transparent', color: 'inherit' }} />
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="empty-state" style={{ padding: '2rem 0' }}>
                          <Notebook size={32} style={{ opacity: 0.5, marginBottom: '1rem' }} />
                          <p style={{ margin: 0 }}>No hay notas guardadas</p>
                        </div>
                      )}
                    </div>
                  )}
                  </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="billing-empty-state">
              <div className="empty-state-content">
                <div className="icon-circle">
                  <FileText size={48} strokeWidth={1.5} />
                </div>
                <h3>Panel de Gestión</h3>
                <p>Selecciona un cliente de la lista de la izquierda para comenzar a gestionar sus tareas, vuelos y boletas de servicio.</p>
                <div className="empty-state-stats">
                  <div className="mini-stat">
                    <strong>{clients.length}</strong>
                    <span>Clientes</span>
                  </div>
                  <div className="mini-stat">
                    <strong>{services.length}</strong>
                    <span>Servicios</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal Agregar Tarea */}
      {isAddingTask && (
        <div className="modal-overlay animate-fade-in" style={{ zIndex: 1400 }}>
          <div className="modal-content glass-card animate-scale-in" style={{ maxWidth: '500px', padding: '2.5rem', borderRadius: '24px' }}>
            <div className="modal-header" style={{ marginBottom: '1.5rem', borderBottom: 'none', paddingBottom: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div className="icon-bg" style={{ width: '40px', height: '40px', padding: '8px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Plus size={20} />
                </div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, fontFamily: 'var(--font-family, system-ui, sans-serif)', color: 'var(--text-primary)' }}>Agregar Servicio</h3>
              </div>
              <button onClick={() => setIsAddingTask(false)} className="close-modal-btn">
                <X size={20} />
              </button>
            </div>
            
            <p className="text-secondary mb-4" style={{ fontSize: '0.95rem' }}>Selecciona el servicio que deseas agregar a la cuenta del cliente:</p>

            <div className="services-grid" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '50vh', overflowY: 'auto', paddingRight: '0.5rem' }}>
              {services.length > 0 ? (
                services.map(service => (
                  <button 
                    key={service.id} 
                    className="service-pick-card"
                    onClick={() => handleAddTask(service)}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ 
                        width: '8px', 
                        height: '8px', 
                        borderRadius: '50%', 
                        background: 'var(--color-primary)' 
                      }} />
                      <span className="name" style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--text-primary)' }}>{service.name}</span>
                    </div>
                    <span className="price" style={{ fontWeight: 800, color: 'var(--color-primary)', fontSize: '1.1rem' }}>${service.price.toLocaleString('es-AR')}</span>
                  </button>
                ))
              ) : (
                <div className="p-5 text-center" style={{ background: 'rgba(0,0,0,0.02)', borderRadius: '16px' }}>
                  <p className="text-secondary m-0">No hay servicios configurados en 'Costos'.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

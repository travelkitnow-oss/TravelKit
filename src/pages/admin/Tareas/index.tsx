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
  Receipt,
  DollarSign
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
  paid?: boolean;
  paidAt?: string;
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
  source?: string;
}

export default function TareasPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loadingClients, setLoadingClients] = useState(true);
  const [loadingBilling, setLoadingBilling] = useState(false);
  const [billingData, setBillingData] = useState<ClientBilling | null>(null);
  
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedTaskIndices, setSelectedTaskIndices] = useState<number[]>([]);
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [paymentConcept, setPaymentConcept] = useState<string>('');
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
    // Reset selection when changing client
    setSelectedTaskIndices([]);
  }, [selectedClientId]);

  // Sync payment modal fields when selection changes
  useEffect(() => {
    if (showPaymentModal && billingData) {
      const selectedTasks = selectedTaskIndices.map(i => billingData.tasks[i]);
      const totalSelected = selectedTasks.reduce((sum, t) => sum + t.price, 0);
      
      // Only auto-update if the user hasn't manually edited (or just always update for better DX)
      setPaymentAmount(totalSelected > 0 ? totalSelected.toString() : '');
      setPaymentConcept(selectedTasks.length > 0 
        ? `Cobro: ${selectedTasks.map(t => t.name).join(', ')}` 
        : 'Pago a cuenta'
      );
    }
  }, [selectedTaskIndices, showPaymentModal, billingData]);

  const fetchClients = async () => {
    setLoadingClients(true);
    const { data, error } = await supabase
      .from('clients')
      .select('id, name, email, phone, source')
      .neq('source', 'agenda_session_only')
      .order('name', { ascending: true });
    
    if (error) console.error('Error fetching clients:', error);
    else setClients(data || []);
    setLoadingClients(false);
  };

  const fetchServices = async () => {
    // Solo traemos servicios de la tabla 'services' (Costos)
    const { data: genericServices } = await supabase.from('services').select('*').order('name');
    
    const mappedGeneric: ServiceItem[] = (genericServices || []).map(s => ({
      ...s,
      type: 'generic',
      capacity: 1,
      pricing_type: 'fixed'
    }));

    setServices(mappedGeneric);
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
    c.source !== 'agenda_session_only' && 
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedClient = clients.find(c => c.id === selectedClientId);

  const handleAddTask = (service: ServiceItem) => {
    if (!selectedClientId || !billingData) return;
    
    let finalPrice = service.price;
    const passengers = billingData.passengers || 1;

    if (service.pricing_type === 'per_person') {
      finalPrice = service.price * passengers;
    } else if (service.pricing_type === 'fixed') {
      finalPrice = service.price;
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

  const handleToggleSelectTask = (index: number) => {
    setSelectedTaskIndices(prev => 
      prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
    );
  };

  const openPaymentModal = () => {
    if (!billingData) return;
    
    const selectedTasks = selectedTaskIndices.map(i => billingData.tasks[i]);
    const totalSelected = selectedTasks.reduce((sum, t) => sum + t.price, 0);
    
    setPaymentAmount(totalSelected.toString());
    setPaymentConcept(selectedTasks.length > 0 
      ? `Cobro de: ${selectedTasks.map(t => t.name).join(', ')}` 
      : 'Pago a cuenta'
    );
    setShowPaymentModal(true);
  };

  const handleConfirmPayment = () => {
    if (!billingData || !paymentAmount) return;
    
    const amount = parseFloat(paymentAmount);
    const newTasks = [...billingData.tasks];
    
    const selectedTasks = selectedTaskIndices.map(i => billingData.tasks[i]);
    const totalSelected = selectedTasks.reduce((sum, t) => sum + t.price, 0);

    // Case 1: Full payment of selected tasks
    if (selectedTaskIndices.length > 0 && Math.abs(amount - totalSelected) < 0.01) {
      selectedTaskIndices.forEach(idx => {
        newTasks[idx] = { 
          ...newTasks[idx], 
          completed: true, 
          paid: true, 
          paidAt: new Date().toISOString() 
        };
      });
    } else {
      // Case 2: Partial payment or custom amount
      // We don't mark specific tasks as paid unless they exactly match (too complex for now)
      // Instead we add a "Credit" task that reduces the total balance
      newTasks.push({
        serviceId: 'payment-record',
        name: paymentConcept || 'Pago a cuenta',
        price: amount, // Positive price
        date: new Date().toISOString(),
        completed: true,
        paid: true,
        paidAt: new Date().toISOString()
      });

      // If they selected tasks but paid a different amount, maybe they still want to mark them as completed?
      // For now, let's just keep them as unpaid so they still count towards the balance.
    }

    const updated: ClientBilling = { ...billingData, tasks: newTasks };
    setBillingData(updated);
    saveBilling(updated);
    
    setShowPaymentModal(false);
    setSelectedTaskIndices([]);
    setPaymentAmount('');
    setPaymentConcept('');
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
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  <div className="billing-total-badge collected">
                    <span className="label">Cobrado</span>
                    <span className="amount">${((billingData?.tasks?.filter(t => t.serviceId !== 'payment-record' && t.paid).reduce((sum, t) => sum + Math.abs(t.price), 0) || 0) + (billingData?.tasks?.filter(t => t.serviceId === 'payment-record').reduce((sum, t) => sum + Math.abs(t.price), 0) || 0)).toLocaleString('es-AR')}</span>
                  </div>
                  <div className="billing-total-badge pending">
                    <span className="label">Falta cobrar</span>
                    <span className="amount">${Math.max(0, (billingData?.tasks?.filter(t => t.serviceId !== 'payment-record').reduce((sum, t) => sum + Math.abs(t.price), 0) || 0) - ((billingData?.tasks?.filter(t => t.serviceId !== 'payment-record' && t.paid).reduce((sum, t) => sum + Math.abs(t.price), 0) || 0) + (billingData?.tasks?.filter(t => t.serviceId === 'payment-record').reduce((sum, t) => sum + Math.abs(t.price), 0) || 0))).toLocaleString('es-AR')}</span>
                  </div>
                  <button className="btn-cobrar-main" onClick={openPaymentModal}>
                    <DollarSign size={20} />
                    Cobrar
                  </button>
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
                      billingData.tasks.map((task, idx) => {
                        if (task.serviceId === 'payment-record') return null;
                        return (
                          <div key={idx} className={`task-item ${task.completed ? 'completed' : ''}`}>
                            <div className="task-main-row">
                              <button 
                                className={`task-check ${task.completed ? 'active' : ''}`}
                                onClick={() => handleToggleComplete(idx)}
                              >
                                <Check size={14} />
                              </button>
                              <div className="task-details">
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                  <span className="task-name">{task.name}</span>
                                  {task.completed && !task.paid && <span className="done-badge-mini">REALIZADA</span>}
                                </div>
                                <span className="task-date">{new Date(task.date).toLocaleDateString()}</span>
                              </div>
                              <div className="task-price-row">
                                <span className="task-price">
                                  ${Math.abs(task.price).toLocaleString('es-AR')}
                                </span>
                                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                                    {task.paid ? (
                                      <div className="paid-badge-mini"><Check size={10} /> PAGADO</div>
                                    ) : task.payment_status === 'requested' ? (
                                      <div className="pending-badge-mini" style={{ background: '#fffbeb', color: '#92400e', border: '1px solid #fde68a', fontSize: '0.65rem', fontWeight: 800 }}>SOLICITUD PENDIENTE</div>
                                    ) : (
                                      <div className="pending-badge-mini" style={{ fontSize: '0.65rem', fontWeight: 800, color: '#94a3b8' }}>PENDIENTE</div>
                                    )}
                                  <button className="btn-delete-task" onClick={() => handleRemoveTask(idx)}>
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                        <div className="empty-state">
                          <FileText size={40} />
                          <p>No hay tareas cargadas</p>
                        </div>
                      )}

                      {/* Pagos a cuenta separados */}
                      {billingData.tasks.some(t => t.serviceId === 'payment-record') && (
                        <div className="payments-list" style={{ marginTop: '1.5rem', borderTop: '1px solid rgba(0,0,0,0.05)', paddingTop: '1.5rem' }}>
                          <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '1rem', letterSpacing: '0.5px' }}>
                            Pagos Parciales Registrados
                          </h4>
                          {billingData.tasks.map((task, idx) => {
                            if (task.serviceId !== 'payment-record') return null;
                            return (
                              <div key={idx} className="payment-item animate-fade-in" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.25rem', background: 'rgba(16, 185, 129, 0.08)', borderRadius: '14px', marginBottom: '0.5rem', border: '1px solid rgba(16, 185, 129, 0.15)' }}>
                                <div>
                                  <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#064e3b' }}>{task.name}</span>
                                  <span style={{ fontSize: '0.75rem', color: '#047857', display: 'block', opacity: 0.8 }}>{new Date(task.date).toLocaleDateString()}</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                  <span style={{ fontWeight: 900, color: '#059669', fontSize: '1.1rem' }}>+${Math.abs(task.price).toLocaleString('es-AR')}</span>
                                  <button className="btn-delete-task" style={{ background: 'white' }} onClick={() => handleRemoveTask(idx)}>
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
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
              </div>
            </div>
          )}
        </div>
      </div>

      {isAddingTask && (
        <div className="modal-overlay animate-fade-in" style={{ zIndex: 1400 }}>
          <div className="modal-content glass-card animate-scale-in" style={{ maxWidth: '420px', padding: 0, borderRadius: '20px', overflow: 'hidden' }}>
            <div style={{ padding: '1.5rem', background: 'var(--color-primary)', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ background: 'rgba(255,255,255,0.15)', padding: '6px', borderRadius: '8px' }}>
                  <Plus size={18} color="white" />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: 'white' }}>Agregar Servicio</h3>
                  <p style={{ margin: 0, fontSize: '0.75rem', opacity: 0.8 }}>Selecciona para añadir a la cuenta</p>
                </div>
              </div>
              <button onClick={() => setIsAddingTask(false)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', padding: '6px', cursor: 'pointer', color: 'white' }}>
                <X size={18} />
              </button>
            </div>
            
            <div className="custom-scrollbar" style={{ padding: '1.25rem', maxHeight: '50vh', overflowY: 'auto' }}>
              {services.filter(s => !s.name.startsWith('[')).length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {services.filter(s => !s.name.startsWith('[')).map(service => (
                    <button 
                      key={service.id} 
                      onClick={() => handleAddTask(service)}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '1rem',
                        background: 'rgba(0,0,0,0.02)',
                        border: '1px solid rgba(0,0,0,0.05)',
                        borderRadius: '12px',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        width: '100%',
                        textAlign: 'left'
                      }}
                      onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(16, 185, 129, 0.05)'; e.currentTarget.style.borderColor = 'rgba(16, 185, 129, 0.2)'; }}
                      onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(0,0,0,0.02)'; e.currentTarget.style.borderColor = 'rgba(0,0,0,0.05)'; }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--color-primary)' }}></div>
                        <span style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-primary)' }}>{service.name}</span>
                      </div>
                      <span style={{ fontWeight: 800, color: 'var(--color-primary)', fontSize: '1rem' }}>${service.price.toLocaleString('es-AR')}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <div style={{ padding: '2rem', textAlign: 'center', background: 'rgba(0,0,0,0.02)', borderRadius: '12px' }}>
                  <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.85rem' }}>No hay servicios definidos en Costos.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showPaymentModal && (
        <div className="modal-overlay animate-fade-in" style={{ zIndex: 1500 }}>
          <div className="modal-content glass-card animate-scale-in" style={{ maxWidth: '480px', padding: 0, borderRadius: '20px', overflow: 'hidden' }}>
            <div style={{ padding: '1.25rem 1.5rem', background: 'var(--color-primary)', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#10b981', padding: '8px', borderRadius: '10px', display: 'flex' }}>
                  <DollarSign size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, color: 'white', fontSize: '1.1rem', fontWeight: 700 }}>Registrar Cobro</h3>
                  <p style={{ margin: '0 0 0 0', color: 'rgba(255,255,255,0.7)', fontSize: '0.8rem', fontWeight: 500 }}>Cliente: {selectedClient?.name}</p>
                </div>
              </div>
              <button onClick={() => setShowPaymentModal(false)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', padding: '6px', cursor: 'pointer', color: 'white' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '1.25rem 1.5rem' }}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-secondary)', letterSpacing: '0.5px', marginBottom: '0.5rem', display: 'block' }}>Servicios Pendientes a Cobrar</label>
                
                <div className="custom-scrollbar" style={{ maxHeight: '180px', display: 'flex', flexDirection: 'column', gap: '0.5rem', overflowY: 'auto' }}>
                  {billingData?.tasks.filter(t => !t.paid && t.price > 0 && t.serviceId !== 'payment-record').length ?? 0 > 0 ? (
                    billingData?.tasks.map((task, idx) => {
                      if (task.paid || task.price <= 0 || task.serviceId === 'payment-record') return null;
                      const isSelected = selectedTaskIndices.includes(idx);
                      return (
                        <div 
                          key={idx} 
                          onClick={() => handleToggleSelectTask(idx)}
                          style={{ 
                            padding: '0.75rem 1rem', 
                            borderRadius: '12px', 
                            border: isSelected ? '2px solid #10b981' : '1px solid rgba(0,0,0,0.08)',
                            background: isSelected ? 'rgba(16, 185, 129, 0.04)' : 'white',
                            cursor: 'pointer',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                          }}
                        >
                          <div>
                            <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)', display: 'block' }}>{task.name}</span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500 }}>{new Date(task.date).toLocaleDateString('es-AR')}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <span style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)' }}>${task.price.toLocaleString('es-AR')}</span>
                            <div style={{ 
                              width: '20px', 
                              height: '20px', 
                              borderRadius: '5px', 
                              border: isSelected ? 'none' : '2px solid #cbd5e1',
                              background: isSelected ? '#10b981' : 'transparent',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: 'white'
                            }}>
                              {isSelected && <Check size={14} strokeWidth={3} />}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div style={{ padding: '1.25rem', textAlign: 'center', background: 'rgba(0,0,0,0.02)', borderRadius: '12px' }}>
                      <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.85rem' }}>No hay servicios pendientes.</p>
                    </div>
                  )}
                </div>
              </div>

              <div style={{ background: 'rgba(0,0,0,0.02)', borderRadius: '16px', padding: '1rem', marginBottom: '1.25rem', border: '1px solid rgba(0,0,0,0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', paddingBottom: '0.75rem', borderBottom: '1px dashed rgba(0,0,0,0.1)' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Total Seleccionado</span>
                  <span style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--color-primary)' }}>${selectedTaskIndices.reduce((sum, i) => sum + (billingData?.tasks[i]?.price || 0), 0).toLocaleString('es-AR')}</span>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '1rem' }}>
                  <div style={{ margin: 0 }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '0.4rem', display: 'block' }}>Monto a Cobrar</label>
                    <div style={{ display: 'flex', alignItems: 'center', background: 'white', borderRadius: '10px', border: '1px solid rgba(0,0,0,0.1)', padding: '0 10px' }}>
                      <DollarSign size={16} color="var(--color-primary)" />
                      <input 
                        type="number" 
                        style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--color-primary)', height: '42px', border: 'none', background: 'transparent', width: '100%', outline: 'none', paddingLeft: '5px' }}
                        value={paymentAmount}
                        onChange={e => setPaymentAmount(e.target.value)}
                      />
                    </div>
                  </div>

                  <div style={{ margin: 0 }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '0.4rem', display: 'block' }}>Concepto</label>
                    <input 
                      type="text" 
                      style={{ height: '44px', fontSize: '0.9rem', borderRadius: '10px', border: '1px solid rgba(0,0,0,0.1)', background: 'white', padding: '0 10px', width: '100%', boxSizing: 'border-box', outline: 'none' }}
                      placeholder="Ej: Seña"
                      value={paymentConcept}
                      onChange={e => setPaymentConcept(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <button 
                onClick={handleConfirmPayment} 
                style={{ 
                  width: '100%', 
                  borderRadius: '12px', 
                  fontSize: '1rem', 
                  fontWeight: 700, 
                  padding: '1rem', 
                  background: 'var(--color-primary)',
                  color: 'white',
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(31, 58, 77, 0.2)', 
                  display: 'flex', 
                  justifyContent: 'center', 
                  alignItems: 'center', 
                  gap: '0.5rem'
                }}
              >
                <Check size={18} /> Confirmar y Registrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

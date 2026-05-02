/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from 'react';
import { 
  Search, 
  FileText, 
  Plus, 
  Trash2, 
  ChevronRight, 
  User as UserIcon,
  CreditCard,
  Notebook,
  X,
  Check,
  Calendar,
  MapPin,
  Clock
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import './Tareas.css';

interface ServiceItem {
  id: string;
  name: string;
  price: number;
}

interface ClientTask {
  serviceId: string;
  name: string;
  price: number;
  date: string;
  completed: boolean;
}

interface ClientBilling {
  clientId: string;
  tasks: ClientTask[];
  notes: string;
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
    const { data, error } = await supabase.from('services').select('*').order('name');
    if (!error) setServices(data || []);
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
      setBillingData({
        clientId: data.client_id,
        tasks: (data.tasks as ClientTask[]) || [],
        notes: data.notes || '',
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
        returnDestination: data.return_destination || ''
      });
    } else {
      setBillingData({
        clientId: clientId,
        tasks: [],
        notes: '',
        destination: '',
        origin: ''
      });
    }
    setLoadingBilling(false);
  };

  const saveBilling = async (updatedData: ClientBilling) => {
    setSaveStatus('saving');
    const dbData = {
      client_id: updatedData.clientId,
      tasks: updatedData.tasks,
      notes: updatedData.notes,
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
      return_destination: updatedData.returnDestination || null
    };

    const { error } = await supabase
      .from('client_billing')
      .upsert(dbData, { onConflict: 'client_id' });

    if (error) console.error('Error saving billing:', error);
    else setSaveStatus('saved');
    
    setTimeout(() => setSaveStatus(null), 2000);
  };

  const filteredClients = clients.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedClient = clients.find(c => c.id === selectedClientId);

  const handleAddTask = (service: ServiceItem) => {
    if (!selectedClientId || !billingData) return;
    
    const newTask: ClientTask = {
      serviceId: service.id,
      name: service.name,
      price: service.price,
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

  const handleUpdateBillingField = (field: keyof ClientBilling, value: any) => {
    if (!selectedClientId || !billingData) return;
    
    setSaveStatus('saving');
    const updated: ClientBilling = { 
      ...billingData, 
      [field]: value 
    };
    
    setBillingData(updated);
    saveBilling(updated);
  };

  const calculateTotal = (tasks: ClientTask[]) => {
    return tasks
      .filter(t => t.completed)
      .reduce((sum, t) => sum + t.price, 0);
  };

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
                  <div className="section-header">
                    <div className="title-with-icon">
                      <Calendar size={20} />
                      <h3>Fechas del Viaje</h3>
                    </div>
                    {saveStatus && (
                      <div className={`save-badge ${saveStatus}`}>
                        {saveStatus === 'saving' ? 'Guardando...' : 'Guardado'}
                      </div>
                    )}
                  </div>
                  <div className="travel-info-inputs">
                    <div className="grid-2 mb-3">
                      <div className="form-group">
                        <label>Origen</label>
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
                        <label>Destino</label>
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
                    </div>
                    <div className="grid-2 gap-3 mb-4">
                      <div className="form-group">
                        <label>Fecha de Salida</label>
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
                        <label>Fecha de Regreso</label>
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
                    </div>

                    <div className="border-top pt-4 mt-2">
                      <h4 className="mb-3" style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Logística de Vuelos / Trayectos</h4>
                      <div className="grid-2 gap-3">
                        <div className="form-group">
                          <label>Salida (Hora)</label>
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
                          <label>Llegada (Hora)</label>
                          <div className="input-with-icon">
                            <Clock size={16} />
                            <input 
                              type="time" 
                              className="form-input"
                              value={billingData.arrivalTime || ''}
                              onChange={e => handleUpdateBillingField('arrivalTime', e.target.value)}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. Tareas */}
                <div className="billing-section glass-card">
                  <div className="section-header">
                    <div className="title-with-icon">
                      <CreditCard size={20} />
                      <h3>Tarea</h3>
                    </div>
                    <button className="btn btn-primary btn-sm" onClick={() => setIsAddingTask(true)}>
                      <Plus size={16} />
                      Agregar Tarea
                    </button>
                  </div>
                  
                  <div className="tasks-list">
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
                </div>

                {/* 3. Notas y Datos */}
                <div className="billing-section glass-card">
                  <div className="section-header">
                    <div className="title-with-icon">
                      <Notebook size={20} />
                      <h3>Notas y Datos</h3>
                    </div>
                  </div>
                  <textarea 
                    className="form-input notes-textarea"
                    placeholder="Escribe notas internas sobre el cliente o el viaje..."
                    value={billingData.notes}
                    onChange={e => handleUpdateBillingField('notes', e.target.value)}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="billing-empty-state glass-card">
              <FileText size={64} strokeWidth={1} />
              <h3>Selecciona un cliente</h3>
              <p>Elige un cliente de la lista para ver su logística y tareas pendientes.</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal Agregar Tarea */}
      {isAddingTask && (
        <div className="modal-overlay">
          <div className="modal-content glass-card p-4" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3>Agregar Tarea de Servicio</h3>
              <button onClick={() => setIsAddingTask(false)} className="close-btn"><X size={20} /></button>
            </div>
            <div className="services-grid">
              {services.length > 0 ? (
                services.map(service => (
                  <button 
                    key={service.id} 
                    className="service-pick-card"
                    onClick={() => handleAddTask(service)}
                  >
                    <span className="name">{service.name}</span>
                    <span className="price">${service.price.toLocaleString('es-AR')}</span>
                  </button>
                ))
              ) : (
                <div className="p-4 text-center">
                  <p className="text-secondary">No hay servicios configurados en 'Costos'.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

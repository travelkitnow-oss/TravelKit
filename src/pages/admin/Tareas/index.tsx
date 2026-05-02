import { useState, useEffect, useMemo } from 'react';
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
  MapPin
} from 'lucide-react';
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
  // 1. Load Clients (to pick from)
  const [clients] = useState<Client[]>(() => {
    // We should ideally fetch from the same source as ClientesPage
    // but for now let's assume manual + agenda logic is duplicated or shared via LS
    const manual = JSON.parse(localStorage.getItem('travelkit_manual_clients') || '[]');
    // For simplicity, we'll just use manual clients or any "discovered" clients here
    return manual;
  });

  // 2. Load Services (the "price list")
  const services: ServiceItem[] = useMemo(() => {
    const saved = localStorage.getItem('travelkit_services');
    return saved ? JSON.parse(saved) : [];
  }, []);

  // 3. Billing State (The boletas)
  const [billingData, setBillingData] = useState<Record<string, ClientBilling>>(() => {
    const saved = localStorage.getItem('travelkit_client_billing');
    return saved ? JSON.parse(saved) : {};
  });

  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | null>(null);

  useEffect(() => {
    localStorage.setItem('travelkit_client_billing', JSON.stringify(billingData));
  }, [billingData]);

  const filteredClients = clients.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedClient = clients.find(c => c.id === selectedClientId);
  const currentBilling = selectedClientId ? billingData[selectedClientId] || { clientId: selectedClientId, tasks: [], notes: '' } : null;

  const handleAddTask = (service: ServiceItem) => {
    if (!selectedClientId) return;
    
    const newTask: ClientTask = {
      serviceId: service.id,
      name: service.name,
      price: service.price,
      date: new Date().toISOString(),
      completed: false
    };

    setBillingData(prev => {
      const current = prev[selectedClientId] || { clientId: selectedClientId, tasks: [], notes: '' };
      return {
        ...prev,
        [selectedClientId]: {
          ...current,
          tasks: [...current.tasks, newTask]
        }
      };
    });
    setIsAddingTask(false);
  };

  const handleToggleComplete = (index: number) => {
    if (!selectedClientId) return;
    setBillingData(prev => {
      const current = prev[selectedClientId];
      const newTasks = [...current.tasks];
      newTasks[index] = { ...newTasks[index], completed: !newTasks[index].completed };
      return {
        ...prev,
        [selectedClientId]: { ...current, tasks: newTasks }
      };
    });
  };

  const handleRemoveTask = (index: number) => {
    if (!selectedClientId) return;
    setBillingData(prev => {
      const current = prev[selectedClientId];
      const newTasks = [...current.tasks];
      newTasks.splice(index, 1);
      return {
        ...prev,
        [selectedClientId]: { ...current, tasks: newTasks }
      };
    });
  };

  const handleUpdateNotes = (notes: string) => {
    handleUpdateBillingField('notes', notes);
  };

  const handleUpdateBillingField = (field: keyof ClientBilling, value: any) => {
    if (!selectedClientId) return;
    setSaveStatus('saving');
    setBillingData(prev => ({
      ...prev,
      [selectedClientId]: { 
        ...(prev[selectedClientId] || { clientId: selectedClientId, tasks: [], notes: '', departureDate: '', returnDate: '', destination: '' }), 
        [field]: value 
      }
    }));
    
    // Debounced status update
    setTimeout(() => {
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus(null), 2000);
    }, 500);
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
          <div className="client-list">
            {filteredClients.map(client => (
              <button 
                key={client.id}
                className={`client-item ${selectedClientId === client.id ? 'active' : ''}`}
                onClick={() => setSelectedClientId(client.id)}
              >
                <div className="client-avatar">
                  {client.name.charAt(0)}
                </div>
                <div className="client-info">
                  <span className="client-name">{client.name}</span>
                  <span className="client-sub">{client.email || client.phone}</span>
                </div>
                <ChevronRight size={16} className="chevron" />
              </button>
            ))}
          </div>
        </div>

        {/* Right Panel: Billing Details */}
        <div className="billing-main">
          {selectedClient && currentBilling ? (
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
                  <span className="amount">${calculateTotal(currentBilling.tasks).toLocaleString('es-AR')}</span>
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
                            value={currentBilling.origin || ''}
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
                            placeholder="Ej: Madrid, España"
                            value={currentBilling.destination || ''}
                            onChange={e => handleUpdateBillingField('destination', e.target.value)}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="mb-4">
                      <h4 className="mb-3" style={{ fontSize: '0.9rem', color: 'var(--color-primary)', fontWeight: 800, fontFamily: 'var(--font-main)', letterSpacing: '-0.01em' }}>Vuelo de Salida</h4>
                      <div className="grid-2 gap-3">
                        <div className="form-group">
                          <label>Salida (Fecha y Hora)</label>
                          <div className="d-flex gap-2">
                            <input 
                              type="date" 
                              className="form-input"
                              style={{ flex: 1 }}
                              value={currentBilling.departureDate || ''}
                              onChange={e => handleUpdateBillingField('departureDate', e.target.value)}
                            />
                            <input 
                              type="time" 
                              className="form-input"
                              style={{ width: '135px' }}
                              value={currentBilling.departureTime || ''}
                              onChange={e => handleUpdateBillingField('departureTime', e.target.value)}
                            />
                          </div>
                        </div>
                        <div className="form-group">
                          <label>Llegada (Fecha y Hora)</label>
                          <div className="d-flex gap-2">
                            <input 
                              type="date" 
                              className="form-input"
                              style={{ flex: 1 }}
                              value={currentBilling.arrivalDate || ''}
                              onChange={e => handleUpdateBillingField('arrivalDate', e.target.value)}
                            />
                            <input 
                              type="time" 
                              className="form-input"
                              style={{ width: '135px' }}
                              value={currentBilling.arrivalTime || ''}
                              onChange={e => handleUpdateBillingField('arrivalTime', e.target.value)}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="mb-3" style={{ fontSize: '0.9rem', color: 'var(--color-primary)', fontWeight: 800, fontFamily: 'var(--font-main)', letterSpacing: '-0.01em' }}>Vuelo de Regreso</h4>
                      <div className="grid-2 gap-3 mb-3">
                        <div className="form-group">
                          <label>Origen</label>
                          <div className="input-with-icon">
                            <MapPin size={16} />
                            <input 
                              type="text" 
                              className="form-input"
                              placeholder="Ciudad / Aeropuerto"
                              value={currentBilling.returnOrigin || ''}
                              onChange={e => handleUpdateBillingField('returnOrigin', e.target.value)}
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
                              placeholder="Ciudad / Aeropuerto"
                              value={currentBilling.returnDestination || ''}
                              onChange={e => handleUpdateBillingField('returnDestination', e.target.value)}
                            />
                          </div>
                        </div>
                      </div>
                      <div className="grid-2 gap-3">
                        <div className="form-group">
                          <label>Salida (Fecha y Hora)</label>
                          <div className="d-flex gap-2">
                            <input 
                              type="date" 
                              className="form-input"
                              style={{ flex: 1 }}
                              value={currentBilling.returnDate || ''}
                              onChange={e => handleUpdateBillingField('returnDate', e.target.value)}
                            />
                            <input 
                              type="time" 
                              className="form-input"
                              style={{ width: '135px' }}
                              value={currentBilling.returnDepartureTime || ''}
                              onChange={e => handleUpdateBillingField('returnDepartureTime', e.target.value)}
                            />
                          </div>
                        </div>
                        <div className="form-group">
                          <label>Llegada (Fecha y Hora)</label>
                          <div className="d-flex gap-2">
                            <input 
                              type="date" 
                              className="form-input"
                              style={{ flex: 1 }}
                              value={currentBilling.returnArrivalDate || ''}
                              onChange={e => handleUpdateBillingField('returnArrivalDate', e.target.value)}
                            />
                            <input 
                              type="time" 
                              className="form-input"
                              style={{ width: '135px' }}
                              value={currentBilling.returnArrivalTime || ''}
                              onChange={e => handleUpdateBillingField('returnArrivalTime', e.target.value)}
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
                    {currentBilling.tasks.length > 0 ? (
                      currentBilling.tasks.map((task, idx) => (
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
                    {saveStatus && (
                      <div className={`save-badge ${saveStatus}`}>
                        {saveStatus === 'saving' ? 'Guardando...' : 'Cambios guardados'}
                      </div>
                    )}
                  </div>
                  <textarea 
                    className="notes-textarea auto-expand"
                    placeholder="Escribe aquí notas sobre el viaje, preferencias del cliente o detalles del cobro..."
                    value={currentBilling.notes}
                    onChange={e => {
                      handleUpdateNotes(e.target.value);
                      // Simple auto-expand logic
                      e.target.style.height = 'inherit';
                      e.target.style.height = `${e.target.scrollHeight}px`;
                    }}
                    onFocus={e => {
                      e.target.style.height = 'inherit';
                      e.target.style.height = `${e.target.scrollHeight}px`;
                    }}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="select-prompt glass-card">
              <UserIcon size={64} className="mb-4 text-muted" />
              <h3>Selecciona un cliente</h3>
              <p>Elige un cliente de la lista para ver su boleta y gestionar sus tareas.</p>
            </div>
          )}
        </div>
      </div>

      {/* Services Picker Modal */}
      {isAddingTask && (
        <div className="modal-overlay animate-fade-in" style={{ zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="modal-content animate-scale-in" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3>Seleccionar Tarea / Costo</h3>
              <button onClick={() => setIsAddingTask(false)} className="close-modal-btn">
                <X size={20} />
              </button>
            </div>
            <div className="services-picker-list">
              {services.length > 0 ? (
                services.map(service => (
                    <button 
                    key={service.id} 
                    className="service-picker-item"
                    onClick={() => handleAddTask(service)}
                  >
                    <span className="name">{service.name}</span>
                    <span className="price">${service.price.toLocaleString('es-AR')}</span>
                    <Plus size={18} />
                  </button>
                ))
              ) : (
                <div className="p-4 text-center">
                  <p>No hay costos definidos. Ve a la página de "Costos" primero.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}



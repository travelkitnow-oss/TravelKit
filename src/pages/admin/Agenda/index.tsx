import { useState, useEffect } from 'react';
import { 
  Plus, 
  CalendarClock, 
  X, 
  User, 
  XCircle,
  Clock,
  Calendar as CalendarIcon
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { mockReservations, notifyReservationsChanged, subscribeToReservations, saveReservations, type Reservation } from '../../../lib/data';
import Calendar from '../../../components/Calendar';
import ConfirmationModal from '../../../components/ConfirmationModal/ConfirmationModal';
import './Agenda.css';

export default function AgendaPage() {
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [, setForceRender] = useState(0);
  
  const [postponeData, setPostponeData] = useState<{ res: Reservation, oldDate: string } | null>(null);
  const [newPostponeDate, setNewPostponeDate] = useState<string>('');
  const [newPostponeTime, setNewPostponeTime] = useState<string>('');

  useEffect(() => {
    const unsub = subscribeToReservations(() => setForceRender(prev => prev + 1));
    return unsub;
  }, []);

  const selectedDateStr = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : '';
  const dayReservations = mockReservations[selectedDateStr] || [];

  const [deleteConfirmData, setDeleteConfirmData] = useState<{ dateStr: string, resId: string, client: string } | null>(null);

  const handleCancelReservation = (dateStr: string, resId: string) => {
    const resList = mockReservations[dateStr];
    if (resList) {
      const res = resList.find(r => r.id === resId);
      if (res) {
        setDeleteConfirmData({ dateStr, resId, client: res.client });
      }
    }
  };

  const confirmCancel = () => {
    if (!deleteConfirmData) return;
    const { dateStr, resId } = deleteConfirmData;
    const resList = mockReservations[dateStr];
    if (resList) {
      const res = resList.find(r => r.id === resId);
      if (res) {
        res.status = 'cancelled';
        saveReservations();
      }
    }
    setDeleteConfirmData(null);
  };

  const openPostponeModal = (dateStr: string, res: Reservation) => {
    setPostponeData({ res, oldDate: dateStr });
    setNewPostponeDate('');
    setNewPostponeTime('');
  };

  const handleConfirmPostpone = () => {
    setAttemptedSubmit(true);
    if (!postponeData || !newPostponeDate || !newPostponeTime) return;

    // Remove from old date
    const oldList = mockReservations[postponeData.oldDate];
    if (oldList) {
      mockReservations[postponeData.oldDate] = oldList.filter(r => r.id !== postponeData.res.id);
    }

    // Add to new date
    if (!mockReservations[newPostponeDate]) {
      mockReservations[newPostponeDate] = [];
    }
    mockReservations[newPostponeDate].push({
      ...postponeData.res,
      time: newPostponeTime,
      status: 'confirmed'
    });

    notifyReservationsChanged();
    saveReservations();
    setPostponeData(null);
    setAttemptedSubmit(false);
  };

  const [showAddModal, setShowAddModal] = useState(false);
  const [newResName, setNewResName] = useState('');
  const [newResDest, setNewResDest] = useState('');
  const [newResEmail, setNewResEmail] = useState('');
  const [newResPhone, setNewResPhone] = useState('');
  const [newResTime, setNewResTime] = useState('');
  const [newResDate, setNewResDate] = useState<string>('');
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);

  useEffect(() => {
    if (showAddModal && selectedDate) {
      setNewResDate(format(selectedDate, 'yyyy-MM-dd'));
    }
  }, [showAddModal, selectedDate]);

  const handleAddSession = () => {
    setAttemptedSubmit(true);
    if (!newResDate || !newResName || !newResTime) return;
    
    // Validation
    if (newResEmail && !newResEmail.includes('@')) {
      alert('El email debe contener un @');
      return;
    }
    
    if (!mockReservations[newResDate]) {
      mockReservations[newResDate] = [];
    }

    mockReservations[newResDate].push({
      id: Date.now().toString(),
      client: newResName,
      dest: newResDest || 'Por definir',
      email: newResEmail,
      phone: newResPhone,
      time: newResTime,
      status: 'confirmed',
      googleMeet: 'https://meet.google.com/' + Math.random().toString(36).substring(7)
    });

    saveReservations();
    setShowAddModal(false);
    setAttemptedSubmit(false);
    setNewResName('');
    setNewResDest('');
    setNewResEmail('');
    setNewResPhone('');
    setNewResTime('');
  };

  const getValidationClass = (value: any, required: boolean = true) => {
    if (!attemptedSubmit) return '';
    const hasValue = typeof value === 'string' ? value.trim() !== '' : !!value;
    if (required) {
      return hasValue ? 'is-valid' : 'is-invalid';
    }
    return hasValue ? 'is-valid' : '';
  };

  const getEmailClass = () => {
    if (!attemptedSubmit) return '';
    return newResEmail && newResEmail.includes('@') ? 'is-valid' : 'is-invalid';
  };

  return (
    <div className="agenda-page animate-fade-in">
      <header className="page-header-centered">
        <h1>Hola, Lucía 👋</h1>
        <p>Aquí tienes el resumen de tu agenda para organizar viajes y reuniones.</p>
      </header>

      <div className="agenda-grid-2-col">
        {/* Column 1: Calendar */}
        <div className="calendar-card glass-card">
          <div className="card-header">
            <h3>Calendario</h3>
          </div>
          <div className="card-body calendar-wrapper">
            <Calendar 
              isDashboard={true} 
              onDateSelect={(date) => setSelectedDate(date)} 
              selectedDateExternal={selectedDate}
            />
          </div>
        </div>

        {/* Column 2: Reservations */}
        <div className="glass-card reservations-panel">
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3>Reservas</h3>
              <p className="text-sm text-secondary">
                {selectedDate 
                  ? format(selectedDate, "EEEE d 'de' MMMM", { locale: es }) 
                  : "Selecciona una fecha"}
              </p>
            </div>
            <button className="btn btn-primary btn-sm" onClick={() => setShowAddModal(true)}>
              <Plus size={18} /> Agendar Sesión
            </button>
          </div>
          <div className="card-body">
            {dayReservations.length > 0 ? (
              <div className="reservations-list">
                {dayReservations.map(res => (
                  <div key={res.id} className={`reservation-item ${res.status === 'cancelled' ? 'cancelled-item' : ''}`}>
                    <div className="res-header">
                      <span className="res-time">{res.time}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span className={`res-status ${res.status}`}>
                          {res.status === 'confirmed' ? 'Confirmado' : res.status === 'cancelled' ? 'Cancelado' : 'Pendiente'}
                        </span>
                        
                        {res.status !== 'cancelled' && (
                          <div className="res-actions" style={{ display: 'flex', gap: '0.25rem', marginLeft: '0.5rem' }}>
                            <button 
                              className="btn btn-sm btn-outline" 
                              style={{ padding: '0.25rem' }}
                              title="Posponer"
                              onClick={() => openPostponeModal(selectedDateStr, res)}
                            >
                              <CalendarClock size={16} />
                            </button>
                            <button 
                              className="btn btn-sm btn-outline text-danger" 
                              style={{ padding: '0.25rem' }}
                              title="Cancelar"
                              onClick={() => handleCancelReservation(selectedDateStr, res.id)}
                            >
                              <XCircle size={16} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="res-body">
                      <h4>{res.client}</h4>
                      <p className="text-sm text-secondary">Destino: {res.dest}</p>
                      {res.email && <p className="text-xs text-secondary" style={{ marginTop: '0.25rem' }}>📧 {res.email}</p>}
                      {res.phone && <p className="text-xs text-secondary">📞 {res.phone}</p>}
                      {res.status === 'confirmed' && (
                        <a href={res.googleMeet} target="_blank" rel="noreferrer" className="btn btn-sm btn-outline mt-2" style={{ width: '100%', justifyContent: 'center' }}>
                          Unirse a la reunión
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <User size={48} color="var(--color-tertiary)" />
                <p>No tienes reservas para este día.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals ... (Add & Postpone) */}
      {showAddModal && (
        <div className="modal-overlay animate-fade-in" style={{ zIndex: 1300 }}>
          <div className="modal-content glass-card animate-scale-in" style={{ maxWidth: '450px', padding: '2.5rem', borderRadius: '24px' }}>
            <div className="modal-header">
              <h3>Nueva Sesión</h3>
              <button onClick={() => { setShowAddModal(false); setAttemptedSubmit(false); }} className="close-modal-btn">
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginBottom: '2rem' }}>
              <div className="form-group">
                <label className="text-xs font-semibold uppercase">Nombre del Cliente</label>
                <input 
                  type="text" 
                  className={`form-input ${getValidationClass(newResName)}`}
                  placeholder="Ej: Martín Pérez"
                  value={newResName}
                  onChange={e => setNewResName(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="text-xs font-semibold uppercase">Destino (Opcional)</label>
                <input 
                  type="text" 
                  className={`form-input ${getValidationClass(newResDest, false)}`}
                  placeholder="Ej: Europa Central"
                  value={newResDest}
                  onChange={e => setNewResDest(e.target.value)}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="text-xs font-semibold uppercase">Email</label>
                  <input 
                    type="email" 
                    className={`form-input ${getEmailClass()}`}
                    placeholder="ejemplo@mail.com"
                    value={newResEmail}
                    onChange={e => setNewResEmail(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="text-xs font-semibold uppercase">Teléfono</label>
                  <input 
                    type="text" 
                    className={`form-input ${getValidationClass(newResPhone, false)}`}
                    placeholder="11 1234 5678"
                    value={newResPhone}
                    onChange={e => setNewResPhone(e.target.value.replace(/\D/g, ''))}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="text-xs font-semibold uppercase">Fecha</label>
                  <input 
                    type="date" 
                    className={`form-input ${getValidationClass(newResDate)}`}
                    value={newResDate}
                    onChange={e => setNewResDate(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="text-xs font-semibold uppercase">Horario</label>
                  <select 
                    className={`form-input ${getValidationClass(newResTime)}`}
                    value={newResTime}
                    onChange={e => setNewResTime(e.target.value)}
                  >
                    <option value="">Seleccionar</option>
                    {Array.from({ length: 12 }, (_, i) => i + 8).map(h => {
                      const hourStr = h.toString().padStart(2, '0') + ':00';
                      return <option key={hourStr} value={hourStr}>{hourStr}</option>;
                    })}
                  </select>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button className="btn btn-outline w-100" onClick={() => { setShowAddModal(false); setAttemptedSubmit(false); }}>Cancelar</button>
              <button 
                className="btn btn-primary w-100" 
                onClick={handleAddSession}
              >
                Agendar Sesión
              </button>
            </div>
          </div>
        </div>
      )}

      {postponeData && (
        <div className="modal-overlay animate-fade-in" style={{ zIndex: 1100 }}>
          <div className="modal-content glass-card animate-scale-in" style={{ maxWidth: '450px', padding: '2.5rem' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div className="modal-icon-wrapper">
                  <CalendarClock size={20} />
                </div>
                <h3>Posponer Reserva</h3>
              </div>
              <button onClick={() => { setPostponeData(null); setAttemptedSubmit(false); }} className="close-modal-btn">
                <X size={20} />
              </button>
            </div>
            
            <div className="res-info-box">
              <p className="text-sm text-secondary m-0">Estás reprogramando la reunión de:</p>
              <h4>{postponeData.res.client}</h4>
            </div>

            <div className="modal-form-grid">
              <div className="form-group">
                <label className="text-sm font-semibold">
                  <CalendarIcon size={16} /> Nueva Fecha
                </label>
                <input 
                  type="date" 
                  className={`form-input ${getValidationClass(newPostponeDate)}`}
                  value={newPostponeDate} 
                  onChange={e => setNewPostponeDate(e.target.value)}
                  min={format(new Date(), 'yyyy-MM-dd')}
                />
              </div>

              <div className="form-group">
                <label className="text-sm font-semibold">
                  <Clock size={16} /> Nuevo Horario
                </label>
                <select 
                  className={`form-input ${getValidationClass(newPostponeTime)}`}
                  value={newPostponeTime} 
                  onChange={e => setNewPostponeTime(e.target.value)}
                >
                  <option value="">Selecciona un horario</option>
                  {Array.from({ length: 12 }, (_, i) => i + 8).map(h => {
                    const t = h.toString().padStart(2, '0') + ':00';
                    const isBooked = newPostponeDate ? mockReservations[newPostponeDate]?.some(r => r.time === t && r.status !== 'cancelled') : false;
                    return (
                      <option key={t} value={t} disabled={!!isBooked}>
                        {t} {isBooked ? '(Ocupado)' : ''}
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>

            <div className="modal-actions-grid mt-4">
              <button className="btn btn-outline" onClick={() => { setPostponeData(null); setAttemptedSubmit(false); }}>Cancelar</button>
              <button 
                className="btn btn-primary" 
                onClick={handleConfirmPostpone}
              >
                Confirmar Cambio
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmationModal 
        isOpen={!!deleteConfirmData}
        onClose={() => setDeleteConfirmData(null)}
        onConfirm={confirmCancel}
        title="¿Cancelar reserva?"
        message={`La sesión de ${deleteConfirmData?.client} se marcará como cancelada en tu agenda.`}
        confirmText="Confirmar"
        type="danger"
      />
    </div>
  );
}

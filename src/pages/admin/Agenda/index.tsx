import { useState, useEffect } from 'react';
import { 
  Plus, 
  Check,
  CalendarClock, 
  X, 
  User, 
  XCircle,
  Clock,
  Trash2,
  Calendar as CalendarIcon,
  Users
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { supabase } from '../../../lib/supabase';
import Calendar from '../../../components/Calendar';
import ConfirmationModal from '../../../components/ConfirmationModal/ConfirmationModal';
import './Agenda.css';

interface Reservation {
  id: string;
  client: string;
  dest: string;
  time: string;
  status: 'confirmed' | 'pending' | 'cancelled' | 'completed' | 'client_saved' | 'client_rejected';
  googleMeet?: string;
  email?: string;
  phone?: string;
  date: string;
}

export default function AgendaPage() {
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [allReservations, setAllReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [postponeData, setPostponeData] = useState<{ res: Reservation, oldDate: string } | null>(null);
  const [newPostponeDate, setNewPostponeDate] = useState<string>('');
  const [newPostponeTime, setNewPostponeTime] = useState<string>('');

  const [showAddModal, setShowAddModal] = useState(false);
  const [newResName, setNewResName] = useState('');
  const [newResDest, setNewResDest] = useState('');
  const [newResEmail, setNewResEmail] = useState('');
  const [newResPhone, setNewResPhone] = useState('');
  const [newResTime, setNewResTime] = useState('');
  const [newResDate, setNewResDate] = useState<string>('');
  const [newClientPax, setNewClientPax] = useState(2);
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);
  const [deleteConfirmData, setDeleteConfirmData] = useState<{ dateStr: string, resId: string, client: string } | null>(null);
  const [completedRes, setCompletedRes] = useState<Reservation | null>(null);
  const [expandedResId, setExpandedResId] = useState<string | null>(null);

  useEffect(() => {
    fetchReservations();
  }, []);

  const fetchReservations = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('admin_meetings').select('*');
    if (error) console.error('Error fetching meetings:', error);
    else {
      const mapped: Reservation[] = (data || []).map(r => ({
        id: r.id,
        client: r.client_name,
        dest: r.destination,
        time: r.meeting_time,
        status: r.status,
        googleMeet: r.google_meet_url,
        email: r.email,
        phone: r.phone,
        date: r.meeting_date
      }));
      setAllReservations(mapped);
    }
    setLoading(false);
  };

  const selectedDateStr = selectedDate ? format(selectedDate, "yyyy-MM-dd") : '';
  const dayReservations = allReservations.filter(r => r.date === selectedDateStr);
  console.log('Selected date:', selectedDateStr, 'Reservations count:', dayReservations.length);

  const handleMarkCompleted = async (res: Reservation) => {
    const { error } = await supabase.from('admin_meetings').update({ status: 'completed' }).eq('id', res.id);
    if (!error) {
      fetchReservations();
      setCompletedRes(res);
    } else {
      console.error('Error marking completed:', error);
    }
  };

  const handleSaveNewClient = async (res: Reservation) => {
    const { data: newClients, error } = await supabase.from('clients').insert([{ 
      name: res.client,
      email: res.email || '',
      phone: res.phone || '',
      source: 'agenda'
    }]).select();
    
    if (error) {
      alert('Error al guardar cliente');
    } else {
      const clientId = newClients && newClients[0] ? newClients[0].id : null;
      if (clientId && res.dest && res.dest !== 'Por definir') {
        await supabase.from('client_billing').insert([{
          client_id: clientId,
          destination: res.dest,
          tasks: [],
          notes: '',
          passengers: newClientPax
        }]);
      }

      await supabase.from('admin_meetings').update({ status: 'client_saved' }).eq('id', res.id);
      alert('Cliente guardado correctamente');
      fetchReservations();
    }
    setCompletedRes(null);
  };

  const handleDeleteClient = async (res: Reservation) => {
    if (!window.confirm('¿Estás seguro de descartar este cliente?')) return;
    await supabase.from('admin_meetings').update({ status: 'client_rejected' }).eq('id', res.id);
    fetchReservations();
    setCompletedRes(null);
  };

  const handlePermanentlyDelete = async (resId: string) => {
    if (!window.confirm('¿Estás seguro de eliminar esta reunión de la vista?')) return;
    const { error } = await supabase.from('admin_meetings').delete().eq('id', resId);
    if (!error) fetchReservations();
  };

  const handleCancelReservation = async (dateStr: string, resId: string) => {
    setDeleteConfirmData({ dateStr, resId, client: '' });
  };

  const confirmCancel = async () => {
    if (!deleteConfirmData) return;
    const { resId } = deleteConfirmData;
    const { error } = await supabase.from('admin_meetings').update({ status: 'cancelled' }).eq('id', resId);
    if (!error) fetchReservations();
    setDeleteConfirmData(null);
  };

  const handleConfirmPostpone = async () => {
    setAttemptedSubmit(true);
    if (!postponeData || !newPostponeDate || !newPostponeTime) return;

    const { error } = await supabase.from('admin_meetings').update({
      meeting_date: newPostponeDate,
      meeting_time: newPostponeTime,
      status: 'confirmed'
    }).eq('id', postponeData.res.id);

    if (!error) {
      fetchReservations();
      if (newPostponeDate !== selectedDateStr) {
        setSelectedDate(new Date(newPostponeDate));
      }
    }
    setPostponeData(null);
    setAttemptedSubmit(false);
  };

  const handleAddSession = async () => {
    setAttemptedSubmit(true);
    if (!newResDate || !newResName || !newResTime) return;
    
    if (newResEmail && !newResEmail.includes('@')) {
      alert('El email debe contener un @');
      return;
    }

    const { error } = await supabase.from('admin_meetings').insert([{
      client_name: newResName,
      destination: newResDest || 'Por definir',
      email: newResEmail,
      phone: newResPhone,
      meeting_date: newResDate,
      meeting_time: newResTime,
      status: 'confirmed',
      google_meet_url: 'https://meet.google.com/' + Math.random().toString(36).substring(7)
    }]);

    if (error) {
      console.error('Error adding session:', error);
      alert('Error al agendar sesión: ' + error.message);
    } else {
      fetchReservations();
      setShowAddModal(false);
      setAttemptedSubmit(false);
      setNewResName('');
      setNewResDest('');
      setNewResEmail('');
      setNewResPhone('');
      setNewResTime('');
    }
  };

  const getValidationClass = (value: any, required: boolean = true) => {
    if (!attemptedSubmit) return '';
    const hasValue = typeof value === 'string' ? value.trim() !== '' : !!value;
    return required ? (hasValue ? 'is-valid' : 'is-invalid') : (hasValue ? 'is-valid' : '');
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
        <div className="calendar-card glass-card">
          <div className="card-header">
            <h3>Calendario</h3>
          </div>
          <div className="card-body calendar-wrapper">
            <Calendar 
              isDashboard={true} 
              onDateSelect={(date) => setSelectedDate(date)} 
              selectedDateExternal={selectedDate}
              reservations={allReservations}
            />
          </div>
        </div>

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
            {loading ? (
              <div className="p-4 text-center"><div className="loader-premium"></div></div>
            ) : dayReservations.length > 0 ? (
              <div key={selectedDateStr} className="reservations-list">
                {dayReservations.map(res => {
                  const isExpanded = expandedResId === res.id;
                  return (
                  <div
                    key={res.id}
                    className={`reservation-item ${res.status === 'cancelled' ? 'cancelled-item' : ''}`}
                    style={{ cursor: 'pointer' }}
                    onClick={() => setExpandedResId(isExpanded ? null : res.id)}
                  >
                    <div className="res-header">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <span className="res-time">{res.time}</span>
                        <span className="text-sm" style={{ color: 'var(--color-secondary)' }}>
                          <strong>{res.client}</strong>
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {['completed', 'client_saved', 'client_rejected'].includes(res.status) ? (
                          <>
                            <span className="res-status" style={{ 
                              backgroundColor: res.status === 'client_saved' ? 'rgba(16, 185, 129, 0.1)' : res.status === 'client_rejected' ? 'rgba(107, 114, 128, 0.1)' : 'rgba(59, 130, 246, 0.1)', 
                              color: res.status === 'client_saved' ? '#10b981' : res.status === 'client_rejected' ? '#6b7280' : '#3b82f6' 
                            }}>
                              {res.status === 'client_saved' ? 'Cliente Guardado' : res.status === 'client_rejected' ? 'Cliente Descartado' : 'Completada'}
                            </span>
                            <div className="res-actions" style={{ marginLeft: '0.25rem' }} onClick={e => e.stopPropagation()}>
                              <button 
                                className="btn btn-sm btn-outline text-danger" 
                                style={{ padding: '0.25rem', border: 'none' }}
                                title="Eliminar de la vista"
                                onClick={() => handlePermanentlyDelete(res.id)}
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </>
                        ) : (
                          <span className={`res-status ${res.status}`}>
                            {res.status === 'confirmed' ? 'Confirmado' : res.status === 'cancelled' ? 'Cancelado' : 'Pendiente'}
                          </span>
                        )}

                        {!['cancelled', 'completed', 'client_saved', 'client_rejected'].includes(res.status) && (
                          <div
                            className="res-actions"
                            style={{ display: 'flex', gap: '0.25rem', marginLeft: '0.5rem' }}
                            onClick={e => e.stopPropagation()}
                          >
                            <button
                              className="btn btn-sm btn-outline"
                              style={{ padding: '0.25rem' }}
                              title="Marcar como completada"
                              onClick={() => handleMarkCompleted(res)}
                            >
                              <Check size={16} />
                            </button>
                            <button
                              className="btn btn-sm btn-outline"
                              style={{ padding: '0.25rem' }}
                              title="Posponer"
                              onClick={() => setPostponeData({ res, oldDate: selectedDateStr })}
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
                        {res.status === 'cancelled' && (
                           <div className="res-actions" style={{ marginLeft: '0.25rem' }} onClick={e => e.stopPropagation()}>
                              <button 
                                className="btn btn-sm btn-outline text-danger" 
                                style={{ padding: '0.25rem', border: 'none' }}
                                title="Eliminar de la vista"
                                onClick={() => handlePermanentlyDelete(res.id)}
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                        )}
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="res-body" onClick={e => e.stopPropagation()}>
                        <p className="text-sm text-secondary">Destino: {res.dest}</p>
                        {res.email && <p className="text-xs text-secondary" style={{ marginTop: '0.25rem' }}>📧 {res.email}</p>}
                        {res.phone && <p className="text-xs text-secondary">📞 {res.phone}</p>}
                        {res.status === 'confirmed' && (
                          <a href={res.googleMeet} target="_blank" rel="noreferrer" className="btn btn-sm btn-outline mt-2" style={{ width: '100%', justifyContent: 'center' }}>
                            Unirse a la reunión
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                  );
                })}
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


      {/* Modal: completedRes actions */}
      {completedRes && (
        <div className="modal-overlay animate-fade-in" style={{ zIndex: 1500 }}>
          <div className="modal-content glass-card animate-scale-in" style={{ maxWidth: '400px', padding: '2rem', borderRadius: '24px' }}>
            <div className="modal-header">
              <h3>Reunión completada</h3>
              <button className="close-modal-btn" onClick={() => setCompletedRes(null)}>
                <X size={20} />
              </button>
            </div>
            <p style={{ marginBottom: '1.25rem' }}>Cliente: <strong>{completedRes.client}</strong></p>
            
            <div className="form-group mb-4">
              <label className="text-xs font-semibold uppercase text-secondary">¿Cuántas personas viajan?</label>
              <div className="input-with-icon" style={{ marginTop: '0.5rem' }}>
                <Users size={16} />
                <input 
                  type="number" 
                  min="1"
                  className="form-input"
                  value={newClientPax}
                  onChange={e => setNewClientPax(parseInt(e.target.value) || 1)}
                />
              </div>
            </div>

            <p className="text-sm text-secondary">¿Querés agregar a este cliente a tu lista de clientes o eliminarlo?</p>
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem' }}>
              <button className="btn btn-primary w-100" onClick={() => handleSaveNewClient(completedRes)}>
                Guardar cliente
              </button>
              <button className="btn btn-danger w-100" onClick={() => handleDeleteClient(completedRes)}>
                Descartar cliente
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Nueva Sesión */}
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
                    return <option key={t} value={t}>{t}</option>;
                  })}
                </select>
              </div>
            </div>

            <div className="modal-actions-grid mt-4">
              <button className="btn btn-outline" onClick={() => { setPostponeData(null); setAttemptedSubmit(false); }}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleConfirmPostpone}>Confirmar Cambio</button>
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

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
  Users,
  Link2
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
  clientId?: string;
  date: string;
  advancePaid?: boolean;
  finalPaid?: boolean;
  paidAmount?: number;
}

export default function AgendaPage() {
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [allReservations, setAllReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  
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
  const [newResLink, setNewResLink] = useState('');
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
      const mapped: Reservation[] = (data || []).map(r => {
        return {
          id: r.id,
          client: r.client_name,
          dest: r.destination,
          time: r.meeting_time,
          status: r.status,
          googleMeet: r.google_meet_url,
          email: r.email,
          phone: r.phone,
          date: r.meeting_date,
          clientId: r.client_id,
          advancePaid: r.advance_paid || false,
          finalPaid: r.final_paid || false,
          paidAmount: r.paid_amount || 0
        };
      });
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
      google_meet_url: newResLink || ('https://meet.google.com/' + Math.random().toString(36).substring(7))
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
      setNewResLink('');
    }
  };

  const handleUpdateLink = async (resId: string, link: string) => {
    const { error } = await supabase.from('admin_meetings').update({ google_meet_url: link }).eq('id', resId);
    if (!error) {
      setAllReservations(prev => prev.map(r => r.id === resId ? { ...r, googleMeet: link } : r));
      setToast({ message: 'Link actualizado con éxito', type: 'success' });
      setTimeout(() => setToast(null), 3000);
    }
  };

  const handleChargeMeeting = async (res: Reservation, type: 'advance' | 'final') => {
    if (type === 'advance' && res.advancePaid) return;
    if (type === 'final' && res.finalPaid) return;

    try {
      // 1. Fetch service price
      const { data: services } = await supabase.from('services').select('*').ilike('name', '%sesi%n%');
      const meetingService = services?.[0];
      const totalPrice = meetingService ? meetingService.price : 50000; 
      const chargeAmount = totalPrice / 2;

      // 2. Update directly in admin_meetings table
      const updates: any = {};
      if (type === 'advance') {
        updates.advance_paid = true;
      } else {
        updates.final_paid = true;
      }
      updates.paid_amount = (res.paidAmount || 0) + chargeAmount;

      const { error } = await supabase.from('admin_meetings').update(updates).eq('id', res.id);
      if (error) throw error;

      setToast({ 
        message: `¡Cobro de ${type === 'advance' ? 'adelanto' : 'pago final'} registrado con éxito!`, 
        type: 'success' 
      });
      
      // 3. Update local state ATOMICALLY to block buttons immediately
      setAllReservations(prev => prev.map(r => 
        r.id === res.id 
          ? { 
              ...r, 
              advancePaid: type === 'advance' ? true : r.advancePaid,
              finalPaid: type === 'final' ? true : r.finalPaid,
              paidAmount: updates.paid_amount
            } 
          : r
      ));

      setTimeout(() => setToast(null), 4000);
    } catch (error: any) {
      console.error('Error in handleChargeMeeting:', error);
      setToast({ message: 'Error al registrar cobro: ' + error.message, type: 'error' });
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
      {toast && (
          <div className={`premium-toast ${toast.type} animate-slide-up`}>
            {toast.type === 'success' ? <Check size={20} /> : <X size={20} />}
            <span>{toast.message}</span>
            <button className="toast-close" onClick={() => setToast(null)}><X size={14} /></button>
          </div>
        )}
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
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1rem' }}>
                            {!res.googleMeet || res.googleMeet.includes('Math.random') ? (
                              <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <input 
                                  type="text" 
                                  className="form-input-sm" 
                                  placeholder="Pegar link de la reunión (Meet, Zoom, etc)"
                                  style={{ flex: 1, fontSize: '0.8rem' }}
                                  onKeyDown={(e: any) => {
                                    if (e.key === 'Enter') handleUpdateLink(res.id, e.target.value);
                                  }}
                                  onBlur={(e) => {
                                    if (e.target.value) handleUpdateLink(res.id, e.target.value);
                                  }}
                                />
                                <button className="btn btn-sm btn-primary" onClick={(e) => {
                                  const input = (e.currentTarget.previousSibling as HTMLInputElement);
                                  handleUpdateLink(res.id, input.value);
                                }}>Guardar</button>
                              </div>
                            ) : (
                              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                <a 
                                  href={res.googleMeet} 
                                  target="_blank" 
                                  rel="noreferrer" 
                                  className="btn btn-sm btn-primary" 
                                  style={{ flex: 1, justifyContent: 'center', height: '42px', display: 'flex', alignItems: 'center', borderRadius: '12px' }}
                                >
                                  Unirse a la reunión
                                </a>
                                <button 
                                  className="btn btn-sm btn-outline" 
                                  style={{ width: '42px', height: '42px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, borderRadius: '12px' }}
                                  onClick={() => handleUpdateLink(res.id, '')}
                                  title="Cambiar link"
                                >
                                  <Link2 size={18} />
                                </button>
                              </div>
                            )}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                              <button 
                                className="btn btn-xs" 
                                style={{ 
                                  backgroundColor: res.advancePaid ? '#e2e8f0' : 'transparent',
                                  color: res.advancePaid ? '#475569' : 'var(--color-primary)',
                                  border: '1px solid ' + (res.advancePaid ? '#cbd5e1' : 'var(--color-tertiary)'),
                                  cursor: res.advancePaid ? 'default' : 'pointer',
                                  fontWeight: res.advancePaid ? '800' : '500',
                                  opacity: res.advancePaid ? 0.8 : 1
                                }}
                                onClick={() => !res.advancePaid && handleChargeMeeting(res, 'advance')}
                                disabled={res.advancePaid}
                              >
                                {res.advancePaid ? '✓ ADELANTO PAGADO' : '$ Cobrar 50% Adelanto'}
                              </button>
                              <button 
                                className="btn btn-xs" 
                                style={{ 
                                  backgroundColor: res.finalPaid ? '#e2e8f0' : 'transparent',
                                  color: res.finalPaid ? '#475569' : 'var(--color-primary)',
                                  border: '1px solid ' + (res.finalPaid ? '#cbd5e1' : 'var(--color-tertiary)'),
                                  cursor: res.finalPaid ? 'default' : 'pointer',
                                  fontWeight: res.finalPaid ? '800' : '500',
                                  opacity: res.finalPaid ? 0.8 : 1
                                }}
                                onClick={() => !res.finalPaid && handleChargeMeeting(res, 'final')}
                                disabled={res.finalPaid}
                              >
                                {res.finalPaid ? '✓ TOTAL PAGADO' : '$ Cobrar 50% Final'}
                              </button>
                            </div>
                          </div>
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
          <div className="modal-content-pro animate-modal-in" style={{ maxWidth: '450px' }}>
            <div className="modal-header-pro">
              <div className="header-left">
                <div className="header-icon">
                  <Check size={22} />
                </div>
                <div className="header-text">
                  <h3>Sesión Completada</h3>
                  <p>Gestión de Cliente Post-Reunión</p>
                </div>
              </div>
              <button className="close-modal-btn" onClick={() => setCompletedRes(null)}>
                <X size={20} />
              </button>
            </div>
            
            <div className="modal-body-pro">
              <div className="res-info-box-premium">
                <p className="text-sm text-secondary">Estás gestionando la sesión de:</p>
                <h4>{completedRes.client}</h4>
              </div>
              
              <div className="form-group mb-4">
                <label>¿Cuántas personas viajan?</label>
                <div className="input-with-icon">
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

              <p className="text-sm text-secondary" style={{ marginTop: '1rem' }}>
                ¿Deseas guardar a este viajero en tu base de datos de clientes o descartarlo?
              </p>
            </div>

            <div className="modal-footer-pro">
              <button className="btn-modal btn-cancel" style={{ flex: 1 }} onClick={() => handleDeleteClient(completedRes)}>
                Descartar
              </button>
              <button className="btn-modal btn-confirm info" style={{ flex: 2 }} onClick={() => handleSaveNewClient(completedRes)}>
                Guardar Cliente
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Nueva Sesión */}
      {showAddModal && (
        <div className="modal-overlay animate-fade-in" style={{ zIndex: 1300 }}>
          <div className="modal-content-pro animate-modal-in" style={{ maxWidth: '580px' }}>
            <div className="modal-header-pro">
              <div className="header-left">
                <div className="header-icon">
                  <Plus size={22} />
                </div>
                <div className="header-text">
                  <h3>Nueva Sesión</h3>
                  <p>Agenda una nueva reunión de asesoría</p>
                </div>
              </div>
              <button onClick={() => { setShowAddModal(false); setAttemptedSubmit(false); }} className="close-modal-btn">
                <X size={22} />
              </button>
            </div>

            <div className="modal-body-pro custom-scrollbar" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
              <div className="modal-form-grid-2-col">
                <div className="form-group">
                  <label>Nombre del Cliente *</label>
                  <input 
                    type="text" 
                    className={`form-input ${getValidationClass(newResName)}`}
                    placeholder="Ej: Martín Pérez"
                    value={newResName}
                    onChange={e => setNewResName(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label>Destino (Opcional)</label>
                  <input 
                    type="text" 
                    className={`form-input ${getValidationClass(newResDest, false)}`}
                    placeholder="Ej: Europa Central"
                    value={newResDest}
                    onChange={e => setNewResDest(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label>Email *</label>
                  <input 
                    type="email" 
                    className={`form-input ${getEmailClass()}`}
                    placeholder="ejemplo@mail.com"
                    value={newResEmail}
                    onChange={e => setNewResEmail(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label>Teléfono</label>
                  <input 
                    type="text" 
                    className={`form-input ${getValidationClass(newResPhone, false)}`}
                    placeholder="11 1234 5678"
                    value={newResPhone}
                    onChange={e => setNewResPhone(e.target.value.replace(/\D/g, ''))}
                  />
                </div>

                <div className="form-group">
                  <label>Fecha de Sesión *</label>
                  <input 
                    type="date" 
                    className={`form-input ${getValidationClass(newResDate)}`}
                    value={newResDate}
                    onChange={e => setNewResDate(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label>Horario *</label>
                  <select 
                    className={`form-input ${getValidationClass(newResTime)}`}
                    value={newResTime}
                    onChange={e => setNewResTime(e.target.value)}
                  >
                    <option value="">Seleccionar horario</option>
                    {Array.from({ length: 14 }, (_, i) => i + 8).map(h => {
                      const hourStr = h.toString().padStart(2, '0') + ':00';
                      return <option key={hourStr} value={hourStr}>{hourStr}</option>;
                    })}
                  </select>
                </div>
              </div>

              <div className="form-group" style={{ marginTop: '1.5rem' }}>
                <label>Link de la reunión (Opcional)</label>
                <div className="input-with-icon">
                  <Link2 size={16} />
                  <input 
                    type="text" 
                    className="form-input"
                    placeholder="https://meet.google.com/..."
                    value={newResLink}
                    onChange={e => setNewResLink(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="modal-footer-pro">
              <button className="btn-modal btn-cancel" onClick={() => { setShowAddModal(false); setAttemptedSubmit(false); }}>Cancelar</button>
              <button 
                className="btn-modal btn-confirm info" 
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
          <div className="modal-content-pro animate-modal-in" style={{ maxWidth: '480px' }}>
            <div className="modal-header-pro">
              <div className="header-left">
                <div className="header-icon">
                  <CalendarClock size={22} />
                </div>
                <div className="header-text">
                  <h3>Reprogramar</h3>
                  <p>Cambio de fecha u horario</p>
                </div>
              </div>
              <button onClick={() => { setPostponeData(null); setAttemptedSubmit(false); }} className="close-modal-btn">
                <X size={22} />
              </button>
            </div>
            
            <div className="modal-body-pro">
              <div className="res-info-box-premium">
                <p className="text-sm text-secondary">Estás reprogramando la reunión de:</p>
                <h4>{postponeData.res.client}</h4>
              </div>

              <div className="modal-form-grid">
                <div className="form-group">
                  <label>
                    Nueva Fecha
                  </label>
                  <div className="input-with-icon">
                    <CalendarIcon size={16} />
                    <input 
                      type="date" 
                      className={`form-input ${getValidationClass(newPostponeDate)}`}
                      value={newPostponeDate} 
                      onChange={e => setNewPostponeDate(e.target.value)}
                      min={format(new Date(), 'yyyy-MM-dd')}
                    />
                  </div>
                </div>

                <div className="form-group" style={{ marginTop: '1.25rem' }}>
                  <label>
                    Nuevo Horario
                  </label>
                  <div className="input-with-icon">
                    <Clock size={16} />
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
              </div>
            </div>

            <div className="modal-footer-pro">
              <button className="btn-modal btn-cancel" onClick={() => { setPostponeData(null); setAttemptedSubmit(false); }}>Cancelar</button>
              <button className="btn-modal btn-confirm info" onClick={handleConfirmPostpone}>Confirmar Cambio</button>
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

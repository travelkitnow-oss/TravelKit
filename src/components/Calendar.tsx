import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  isSameMonth, 
  isSameDay, 
  addDays,
  isBefore,
  startOfDay,
  isWeekend,
  addHours,
  isAfter
} from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, X, User, Mail, Phone, Check, CheckCircle } from 'lucide-react';
import { mockReservations } from '../lib/data';
import './Calendar.css';

const TIME_SLOTS = [
  '08:00', '18:00', '19:00'
];

interface CalendarProps {
  isDashboard?: boolean;
  onDateSelect?: (date: Date) => void;
  selectedDateExternal?: Date | null;
}

export default function Calendar({ isDashboard = false, onDateSelect, selectedDateExternal }: CalendarProps = {}) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [internalSelectedDate, setInternalSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formQuestions, setFormQuestions] = useState<any[]>([]);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [emailPrefix, setEmailPrefix] = useState('');
  const [emailDomain, setEmailDomain] = useState('@gmail.com');
  const [customDomain, setCustomDomain] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const [triedToSubmit, setTriedToSubmit] = useState(false);

  const selectedDate = isDashboard ? selectedDateExternal : internalSelectedDate;

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  
  const onDateClick = (day: Date) => {
    // Only allow selecting future dates or today, and exclude weekends
    if (!isBefore(day, startOfDay(new Date())) && !isWeekend(day)) {
      if (isDashboard && onDateSelect) {
        onDateSelect(day);
      } else {
        setInternalSelectedDate(day);
        setSelectedTime(null);
      }
    }
  };

  useEffect(() => {
    if (showForm) {
      const saved = localStorage.getItem('travelkit_form_questions');
      if (saved) {
        setFormQuestions(JSON.parse(saved));
      } else {
        setFormQuestions([
          { id: 'base-1', text: '¿Cómo te llamas?', type: 'text', required: true, isBase: true },
          { id: 'base-2', text: '¿Cuál es tu mail?', type: 'email', required: true, isBase: true },
          { id: 'base-3', text: '¿Cuál es tu número?', type: 'phone', required: true, isBase: true },
        ]);
      }
    }
  }, [showForm]);

  const handleOpenForm = () => {
    setShowForm(true);
    setTriedToSubmit(false);
  };

  const handleSubmitForm = () => {
    setTriedToSubmit(true);
    
    // Validation
    const missingFields = formQuestions.filter(q => {
      if (!q.required) return false;
      if (q.type === 'email') return !emailPrefix;
      return !formValues[q.id];
    });

    if (missingFields.length > 0) {
      return;
    }

    setIsSubmitting(true);
    
    setTimeout(() => {
      const fullEmail = `${emailPrefix}${emailDomain === 'personalizado' ? '@' + customDomain : emailDomain}`;
      const submissions = JSON.parse(localStorage.getItem('travelkit_submissions') || '[]');
      const newSubmission = {
        id: Date.now().toString(),
        name: formValues['base-1'] || 'Cliente Web',
        email: fullEmail,
        phone: formValues['base-3'] || '',
        date: new Date().toISOString(),
        requestedDate: selectedDate ? format(selectedDate, 'yyyy-MM-dd') : null,
        requestedTime: selectedTime,
        status: 'nuevo',
        answers: formQuestions.map(q => ({
          questionText: q.text,
          answer: q.id === 'base-1' ? (formValues['base-1'] || '') :
                  q.id === 'base-2' ? fullEmail :
                  q.id === 'base-3' ? (formValues['base-3'] || '') :
                  (formValues[q.id] || '')
        }))
      };

      localStorage.setItem('travelkit_submissions', JSON.stringify([newSubmission, ...submissions]));
      window.dispatchEvent(new CustomEvent('travelkit_new_submission'));
      
      // Simulation of email sending
      console.log(`Enviando notificación a travelkitnow@gmail.com con los datos de ${newSubmission.name}`);
      
      setIsSubmitting(false);
      setIsSuccess(true);
    }, 1500);
  };

  const formatPhoneNumber = (value: string) => {
    // Remove all non-digits
    const numbers = value.replace(/\D/g, '');
    
    // Limit to 10 digits (Argentina standard without +54)
    const limited = numbers.substring(0, 10);
    
    // Apply mask: 11 1234-5678
    if (limited.length <= 2) return limited;
    if (limited.length <= 6) return `${limited.slice(0, 2)} ${limited.slice(2)}`;
    return `${limited.slice(0, 2)} ${limited.slice(2, 6)}-${limited.slice(6)}`;
  };

  const getValidationStyle = (q: any) => {
    if (!triedToSubmit) return {};
    
    const isFilled = q.type === 'email' ? !!emailPrefix : !!formValues[q.id];
    
    if (q.required) {
      return {
        borderColor: isFilled ? '#10b981' : '#ef4444',
        boxShadow: isFilled ? '0 0 0 1px rgba(16, 185, 129, 0.2)' : '0 0 0 1px rgba(239, 68, 68, 0.2)',
        backgroundColor: isFilled ? 'rgba(16, 185, 129, 0.02)' : 'rgba(239, 68, 68, 0.02)'
      };
    } else if (isFilled) {
      return {
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.02)'
      };
    }
    return {};
  };

  const renderHeader = () => {
    return (
      <div className="calendar-header">
        <button onClick={prevMonth} className="month-nav-btn">
          <ChevronLeft size={20} />
        </button>
        <h3>{format(currentDate, 'MMMM yyyy', { locale: es })}</h3>
        <button onClick={nextMonth} className="month-nav-btn">
          <ChevronRight size={20} />
        </button>
      </div>
    );
  };

  const renderDays = () => {
    const days = ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa'];
    return (
      <div className="calendar-grid">
        {days.map((day, i) => (
          <div className="weekday" key={i}>
            {day}
          </div>
        ))}
      </div>
    );
  };

  const renderCells = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const dateFormat = "d";
    const rows = [];
    let days = [];
    let day = startDate;
    let formattedDate = "";

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        formattedDate = format(day, dateFormat);
        const cloneDay = day;
        const isPast = isBefore(day, startOfDay(new Date()));
        const isCurrentMonth = isSameMonth(day, monthStart);

        days.push(
          <button
            key={day.toString()}
            className={`day-btn ${
              !isCurrentMonth ? "empty" : 
              isSameDay(day, selectedDate!) ? "selected" : 
              isSameDay(day, new Date()) ? "today" : ""
            } ${(isPast || isWeekend(day)) && isCurrentMonth ? "disabled" : ""}`}
            onClick={() => onDateClick(cloneDay)}
            disabled={(isPast || isWeekend(day)) || !isCurrentMonth}
          >
            {isCurrentMonth ? formattedDate : ""}
          </button>
        );
        day = addDays(day, 1);
      }
      rows.push(
        <div className="calendar-grid" key={day.toString()}>
          {days}
        </div>
      );
      days = [];
    }
    return <div className="calendar-body">{rows}</div>;
  };

  return (
    <div className={`calendar-container animate-fade-in ${isDashboard ? 'dashboard-mode' : ''}`} style={isDashboard ? { maxWidth: '100%', boxShadow: 'none', padding: 0 } : {}}>
      {!isDashboard && (
        <div className="calendar-top" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
          <CalendarIcon color="var(--color-accent)" size={24} />
          <h2 style={{ fontSize: '1.5rem', margin: 0 }}>Agendar Sesión</h2>
        </div>
      )}
      
      {renderHeader()}
      {renderDays()}
      {renderCells()}

      {!isDashboard && selectedDate && (
        <div className="session-form-container animate-fade-in">
          <h4>Selecciona un horario para el {format(selectedDate, "dd/MM/yyyy")}</h4>
          <div className="time-slots">
            {TIME_SLOTS.map((time) => {
              const dateStr = format(selectedDate, 'yyyy-MM-dd');
              const isBooked = mockReservations[dateStr]?.some(r => r.time === time && r.status !== 'cancelled');
              
              // Logic for 24 hours in advance
              const slotDateTime = new Date(`${dateStr}T${time}:00`);
              const now = new Date();
              const isTooSoon = !isAfter(slotDateTime, addHours(now, 24));
              
              return (
                <button
                  key={time}
                  className={`time-slot-btn ${selectedTime === time ? 'selected' : ''}`}
                  onClick={() => setSelectedTime(time)}
                  disabled={!!isBooked || isTooSoon}
                >
                  {time}
                </button>
              );
            })}
          </div>
          
          <button 
            className="btn btn-primary animate-fade-in"
            onClick={handleOpenForm}
            disabled={!selectedTime}
            style={{ opacity: !selectedTime ? 0.6 : 1, cursor: !selectedTime ? 'not-allowed' : 'pointer', width: '100%', marginTop: '1rem' }}
          >
            <Check size={18} />
            Completa tu formulario
          </button>
        </div>
      )}

      {showForm && createPortal(
        <div className="modal-overlay">
          <div className="modal-content animate-fade-in" style={{ maxWidth: '650px', padding: '3rem' }}>
            <button 
              className="close-modal-btn" 
              onClick={() => { setShowForm(false); setIsSuccess(false); }}
              style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-secondary)', padding: '0.5rem' }}
            >
              <X size={28} />
            </button>

            {isSuccess ? (
              <div className="success-state text-center py-4">
                <div style={{ width: '60px', height: '60px', borderRadius: '50%', backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
                  <CheckCircle size={32} />
                </div>
                <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.75rem', marginBottom: '1rem', color: 'var(--color-primary)' }}>Formulario Recibido</h2>
                <p className="text-secondary" style={{ fontSize: '0.95rem', lineHeight: '1.6', maxWidth: '400px', margin: '0 auto' }}>
                  Gracias por completar los datos. Nos pondremos en contacto contigo a la brevedad para confirmar tu sesión del día <strong>{selectedDate ? format(selectedDate, 'dd/MM/yyyy') : ''}</strong> a las <strong>{selectedTime}</strong>.
                </p>
                <button className="btn btn-primary mt-4 w-100" style={{ height: '48px', maxWidth: '200px', margin: '2rem auto 0' }} onClick={() => setShowForm(false)}>Entendido</button>
              </div>
            ) : (
              <div className="public-form">
                <div className="text-center mb-5">
                  <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '2.8rem', marginBottom: '0.75rem', color: 'var(--color-primary)' }}>Planifiquemos tu viaje</h2>
                  <p className="text-secondary" style={{ fontSize: '1.1rem' }}>Estás reservando para el <strong>{selectedDate ? format(selectedDate, 'dd/MM/yyyy') : ''}</strong> a las <strong>{selectedTime}</strong></p>
                </div>

                <div className="form-scroll-area custom-scrollbar" style={{ maxHeight: '55vh', overflowY: 'auto', paddingRight: '1rem', paddingLeft: '0.5rem' }}>
                  {formQuestions.map(q => (
                    <div key={q.id} style={{ marginBottom: '2rem' }}>
                      <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.8rem', fontSize: '1rem', color: 'var(--color-primary)' }}>
                        {q.text} {q.required && <span style={{ color: '#ef4444' }}>*</span>}
                      </label>

                      {q.type === 'text' && (
                        <div style={{ position: 'relative' }}>
                          <User size={20} style={{ position: 'absolute', left: '1.25rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-secondary)' }} />
                          <input 
                            type="text" 
                            className="form-input" 
                            style={{ paddingLeft: '3.25rem', width: '100%', height: '56px', fontSize: '1rem', ...getValidationStyle(q) }}
                            placeholder="Tu nombre completo"
                            value={formValues[q.id] || ''}
                            onChange={e => setFormValues({...formValues, [q.id]: e.target.value})}
                          />
                        </div>
                      )}

                      {q.type === 'phone' && (
                        <div style={{ position: 'relative' }}>
                          <Phone size={20} style={{ position: 'absolute', left: '1.25rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-secondary)' }} />
                          <input 
                            type="tel" 
                            className="form-input" 
                            style={{ paddingLeft: '3.25rem', width: '100%', height: '56px', fontSize: '1rem', ...getValidationStyle(q) }}
                            placeholder="11 1234-5678"
                            value={formValues[q.id] || ''}
                            onChange={e => setFormValues({...formValues, [q.id]: formatPhoneNumber(e.target.value)})}
                          />
                        </div>
                      )}

                      {q.type === 'email' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                          <div style={{ position: 'relative' }}>
                            <Mail size={20} style={{ position: 'absolute', left: '1.25rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-secondary)' }} />
                            <input 
                              type="text" 
                              className="form-input" 
                              style={{ paddingLeft: '3.25rem', width: '100%', height: '56px', fontSize: '1rem', ...getValidationStyle(q) }}
                              placeholder="tu.nombre"
                              value={emailPrefix}
                              onChange={e => setEmailPrefix(e.target.value.replace(/@/g, ''))}
                            />
                          </div>
                          <div style={{ display: 'flex', gap: '1rem' }}>
                            <select 
                              className="form-input"
                              style={{ flex: 1, height: '56px', fontSize: '1rem', cursor: 'pointer' }}
                              value={emailDomain}
                              onChange={e => setEmailDomain(e.target.value)}
                            >
                              <option value="@gmail.com">@gmail.com</option>
                              <option value="@outlook.com">@outlook.com</option>
                              <option value="@hotmail.com">@hotmail.com</option>
                              <option value="@yahoo.com">@yahoo.com</option>
                              <option value="personalizado">Personalizado...</option>
                            </select>
                            {emailDomain === 'personalizado' && (
                              <div style={{ position: 'relative', flex: 1.5 }} className="animate-fade-in">
                                <span style={{ position: 'absolute', left: '1.25rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-secondary)', fontWeight: 600, fontSize: '1.1rem' }}>@</span>
                                <input 
                                  type="text" 
                                  className="form-input" 
                                  style={{ paddingLeft: '2.75rem', width: '100%', height: '56px', fontSize: '1rem' }}
                                  placeholder="dominio.com"
                                  value={customDomain}
                                  onChange={e => setCustomDomain(e.target.value)}
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {q.type === 'textarea' && (
                        <textarea 
                          className="form-input" 
                          style={{ width: '100%', minHeight: '140px', padding: '1.25rem', lineHeight: '1.6', fontSize: '1rem', ...getValidationStyle(q) }}
                          placeholder="Escribe aquí tus detalles o inquietudes..."
                          value={formValues[q.id] || ''}
                          onChange={e => setFormValues({...formValues, [q.id]: e.target.value})}
                        />
                      )}
                    </div>
                  ))}
                </div>

                <button 
                  className={`btn btn-primary w-100 mt-5 ${isSubmitting ? 'loading' : ''}`}
                  style={{ height: '60px', fontSize: '1.2rem', fontWeight: 600, letterSpacing: '0.02em' }}
                  onClick={handleSubmitForm}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Enviando consulta...' : 'Enviar formulario'}
                </button>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

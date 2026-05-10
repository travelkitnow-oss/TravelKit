/* eslint-disable @typescript-eslint/no-explicit-any */
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
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, X, Check, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import './Calendar.css';

const TIME_SLOTS = [
  '08:00', '18:00', '19:00'
];

interface CalendarProps {
  isDashboard?: boolean;
  onDateSelect?: (date: Date) => void;
  selectedDateExternal?: Date | null;
  reservations?: any[];
}

export default function Calendar({ isDashboard = false, onDateSelect, selectedDateExternal, reservations = [] }: CalendarProps = {}) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [internalSelectedDate, setInternalSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formQuestions, setFormQuestions] = useState<any[]>([]);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [emailPrefix, setEmailPrefix] = useState('');
  const [emailDomain, setEmailDomain] = useState('@gmail.com');
  const [customDomain] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const selectedDate = isDashboard ? selectedDateExternal : internalSelectedDate;

  useEffect(() => {
    if (showForm) {
      fetchFormQuestions();
    }
  }, [showForm]);

  const fetchFormQuestions = async () => {
    const { data, error } = await supabase.from('form_questions').select('*').order('id');
    if (error) {
      console.error('Error fetching questions:', error);
      // Fallback
      setFormQuestions([
        { id: 'base-1', text: '¿Cómo te llamas?', type: 'text', required: true, is_base: true },
        { id: 'base-2', text: '¿Cuál es tu mail?', type: 'email', required: true, is_base: true },
        { id: 'base-3', text: '¿Cuál es tu número?', type: 'phone', required: true, is_base: true },
      ]);
    } else if (data && data.length > 0) {
      setFormQuestions(data);
    } else {
      setFormQuestions([
        { id: 'base-1', text: '¿Cómo te llamas?', type: 'text', required: true, is_base: true },
        { id: 'base-2', text: '¿Cuál es tu mail?', type: 'email', required: true, is_base: true },
        { id: 'base-3', text: '¿Cuál es tu número?', type: 'phone', required: true, is_base: true },
      ]);
    }
  };

  const onDateClick = (day: Date) => {
    const isPast = isBefore(day, startOfDay(new Date()));
    const isBlockedPublic = (isPast || isWeekend(day));

    // In dashboard mode, we allow selecting any day
    if (isDashboard) {
      if (onDateSelect) onDateSelect(day);
    } else {
      // In public mode, we keep the restrictions
      if (!isBlockedPublic) {
        setInternalSelectedDate(day);
        setSelectedTime(null);
      }
    }
  };

  const handleSubmitForm = async () => {
    const missingFields = formQuestions.filter(q => {
      if (!q.required) return false;
      if (q.type === 'email') return !emailPrefix;
      return !formValues[q.id];
    });

    if (missingFields.length > 0) return;

    setIsSubmitting(true);
    const fullEmail = `${emailPrefix}${emailDomain === 'personalizado' ? '@' + customDomain : emailDomain}`;

    const newSubmission = {
      name: formValues['base-1'] || 'Cliente Web',
      email: fullEmail,
      phone: formValues['base-3'] || '',
      requested_date: selectedDate ? format(selectedDate, 'yyyy-MM-dd') : null,
      requested_time: selectedTime,
      status: 'nuevo',
      answers: formQuestions.map(q => ({
        questionText: q.text,
        answer: q.id === 'base-1' ? (formValues['base-1'] || '') :
          q.id === 'base-2' ? fullEmail :
            q.id === 'base-3' ? (formValues['base-3'] || '') :
              (formValues[q.id] || '')
      }))
    };

    const { error } = await supabase.from('form_submissions').insert([newSubmission]);

    if (error) {
      alert('Error al enviar formulario');
    } else {
      setIsSuccess(true);
    }
    setIsSubmitting(false);
  };

  // Fixing the bug in formatPhoneNumber
  const formatPhoneFixed = (val: string) => {
    const num = val.replace(/\D/g, '').substring(0, 10);
    if (num.length <= 2) return num;
    if (num.length <= 6) return `${num.slice(0, 2)} ${num.slice(2)}`;
    return `${num.slice(0, 2)} ${num.slice(2, 6)}-${num.slice(6)}`;
  };

  const renderCells = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);
    const dateFormat = "d";
    const cells = [];
    let day = startDate;

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        const formattedDate = format(day, dateFormat);
        const cloneDay = day;
        const isPast = isBefore(day, startOfDay(new Date()));
        const isCurrentMonth = isSameMonth(day, monthStart);

        // Find if this day has reservations
        const hasRes = reservations.some(r => r.date === format(cloneDay, 'yyyy-MM-dd') && r.status !== 'cancelled');

        cells.push(
          <button
            key={day.toString()}
            className={`day-btn ${!isCurrentMonth ? "empty" :
                isSameDay(day, selectedDate!) ? "selected" :
                  isSameDay(day, new Date()) ? "today" : ""
              } ${(isPast || isWeekend(day)) && isCurrentMonth ? "disabled" : ""} ${hasRes ? 'has-reservation' : ''}`}
            onClick={() => onDateClick(cloneDay)}
            disabled={(!isDashboard && (isPast || isWeekend(day))) || !isCurrentMonth}
          >
            {isCurrentMonth ? formattedDate : ""}
            {isDashboard && hasRes && <div className="res-dot"></div>}
          </button>
        );
        day = addDays(day, 1);
      }
    }
    return cells;
  };

  return (
    <div className={`calendar-container animate-fade-in ${isDashboard ? 'dashboard-mode' : ''}`}>
      {!isDashboard && (
        <div className="calendar-top" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
          <CalendarIcon color="var(--color-accent)" size={24} />
          <h2 style={{ fontSize: '1.5rem', margin: 0 }}>Agendar Sesión</h2>
        </div>
      )}

      <div className="calendar-header">
        <button onClick={() => setCurrentDate(subMonths(currentDate, 1))} className="month-nav-btn"><ChevronLeft size={20} /></button>
        <h3>{format(currentDate, 'MMMM yyyy', { locale: es })}</h3>
        <button onClick={() => setCurrentDate(addMonths(currentDate, 1))} className="month-nav-btn"><ChevronRight size={20} /></button>
      </div>

      <div className="calendar-body">
        <div className="calendar-grid">
          {['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa'].map((day, i) => (
            <div className="weekday" key={i}>{day}</div>
          ))}
          {renderCells()}
        </div>
      </div>

      {!isDashboard && selectedDate && (
        <div className="session-form-container animate-fade-in">
          <h4>Selecciona un horario para el {format(selectedDate, "dd/MM/yyyy")}</h4>
          <div className="time-slots">
            {TIME_SLOTS.map((time) => {
              const dateStr = format(selectedDate, 'yyyy-MM-dd');
              const isBooked = reservations.some(r => r.date === dateStr && r.time === time && r.status !== 'cancelled');
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
            className="btn btn-primary w-100 mt-4"
            onClick={() => setShowForm(true)}
            disabled={!selectedTime}
            style={{ opacity: !selectedTime ? 0.6 : 1 }}
          >
            <Check size={18} /> Completa tu formulario
          </button>
        </div>
      )}

      {showForm && createPortal(
        <div className="modal-overlay">
          <div className="modal-content animate-fade-in" style={{ maxWidth: '650px', padding: '3rem' }}>
            <button className="close-modal-btn" onClick={() => setShowForm(false)}><X size={28} /></button>

            {isSuccess ? (
              <div className="success-state text-center py-4">
                <div className="success-icon"><CheckCircle size={32} /></div>
                <h2>Formulario Recibido</h2>
                <p>Gracias por completar los datos. Nos pondremos en contacto pronto.</p>
                <button className="btn btn-primary mt-4" onClick={() => setShowForm(false)}>Entendido</button>
              </div>
            ) : (
              <div className="public-form">
                <div className="text-center mb-5">
                  <h2>Planifiquemos tu viaje</h2>
                  <p>Reservando para el {selectedDate ? format(selectedDate, 'dd/MM/yyyy') : ''} a las {selectedTime}</p>
                </div>

                <div className="form-scroll-area custom-scrollbar" style={{ maxHeight: '55vh', overflowY: 'auto' }}>
                  {formQuestions.map(q => (
                    <div key={q.id} className="form-group mb-4">
                      <label>{q.text} {q.required && '*'}</label>
                      {q.type === 'text' && <input type="text" className="form-input" value={formValues[q.id] || ''} onChange={e => setFormValues({ ...formValues, [q.id]: e.target.value })} />}
                      {q.type === 'phone' && <input type="tel" className="form-input" value={formValues[q.id] || ''} onChange={e => setFormValues({ ...formValues, [q.id]: formatPhoneFixed(e.target.value) })} />}
                      {q.type === 'email' && (
                        <div className="email-input-group">
                          <input type="text" className="form-input" value={emailPrefix} onChange={e => setEmailPrefix(e.target.value)} />
                          <select className="form-input" value={emailDomain} onChange={e => setEmailDomain(e.target.value)}>
                            <option value="@gmail.com">@gmail.com</option>
                            <option value="personalizado">Personalizado...</option>
                          </select>
                        </div>
                      )}
                      {q.type === 'textarea' && <textarea className="form-input" value={formValues[q.id] || ''} onChange={e => setFormValues({ ...formValues, [q.id]: e.target.value })} />}
                    </div>
                  ))}
                </div>

                <button className="btn btn-primary w-100 mt-5" onClick={handleSubmitForm} disabled={isSubmitting}>
                  {isSubmitting ? 'Enviando...' : 'Enviar formulario'}
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

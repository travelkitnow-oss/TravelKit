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
  isAfter,
  parseISO
} from 'date-fns';
import { es } from 'date-fns/locale';
import emailjs from '@emailjs/browser';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, X, Check, CheckCircle, User, Phone, Mail } from 'lucide-react';
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
  const [currentFormIndex, setCurrentFormIndex] = useState(0);

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
      try {
        const answersText = newSubmission.answers
          .filter(a => !a.questionText.includes('Cómo te llamas') && !a.questionText.includes('Cuál es tu mail') && !a.questionText.includes('Cuál es tu número'))
          .map(a => `${a.questionText}: ${a.answer}`).join('\n');
        
        await emailjs.send(
          'service_yy59l1c',
          'template_wibcykr',
          {
            name: newSubmission.name,
            email: newSubmission.email,
            phone: newSubmission.phone,
            date: newSubmission.requested_date ? format(parseISO(newSubmission.requested_date), 'dd/MM/yyyy') : 'No especificada',
            time: newSubmission.requested_time || 'No especificada',
            message: answersText
          },
          'C9hOpK5F-cE45ip5t'
        );
      } catch (emailError) {
        console.error('Error al enviar notificación por email:', emailError);
      }

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
            onClick={() => { setShowForm(true); setCurrentFormIndex(0); }}
            disabled={!selectedTime}
            style={{ opacity: !selectedTime ? 0.6 : 1 }}
          >
            <Check size={18} /> Completa tu formulario
          </button>
        </div>
      )}

      {showForm && createPortal(
        <div className="modal-overlay">
          <div className="modal-content animate-fade-in" style={{ maxWidth: '650px', padding: '2rem 3rem 3rem 3rem' }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.5rem' }}>
              <button 
                onClick={() => setShowForm(false)} 
                style={{ background: 'rgba(0,0,0,0.05)', border: 'none', borderRadius: '50%', width: '36px', height: '36px', cursor: 'pointer', color: '#1F3A4D', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)' }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.15) rotate(90deg)'; e.currentTarget.style.background = 'rgba(0,0,0,0.1)'; e.currentTarget.style.color = 'var(--color-danger)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1) rotate(0deg)'; e.currentTarget.style.background = 'rgba(0,0,0,0.05)'; e.currentTarget.style.color = '#1F3A4D'; }}
              >
                <X size={20} />
              </button>
            </div>

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
                  <h2 style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: '1.8rem', color: '#1F3A4D', marginBottom: '0.5rem' }}>Planifiquemos tu viaje</h2>
                  <p className="text-secondary" style={{ fontFamily: "'Outfit', sans-serif" }}>Solicitando reserva para el {selectedDate ? format(selectedDate, 'dd/MM/yyyy') : ''} a las {selectedTime}</p>
                </div>

                {formQuestions.length > 0 && currentFormIndex < formQuestions.length ? (
                  <div className="quiz-wizard animate-fade-in">
                    <div className="wizard-progress" style={{ textAlign: 'center', marginBottom: '1.5rem', color: '#64748b', fontSize: '0.9rem', fontWeight: 600 }}>
                      Paso {currentFormIndex + 1} de {formQuestions.length}
                      <div style={{ background: '#f1f5f9', height: '6px', borderRadius: '3px', marginTop: '0.5rem', overflow: 'hidden' }}>
                        <div style={{ background: 'var(--color-primary)', height: '100%', width: `${((currentFormIndex + 1) / formQuestions.length) * 100}%`, transition: 'width 0.3s' }}></div>
                      </div>
                    </div>

                    {(() => {
                      const q = formQuestions[currentFormIndex];
                      // Simple inline style generator matching the preview
                      const isFilled = q.type === 'email' ? !!emailPrefix : !!formValues[q.id];
                      const valStyle = {
                        borderColor: isFilled ? '#10b981' : 'var(--color-tertiary)',
                        backgroundColor: isFilled ? 'rgba(16, 185, 129, 0.02)' : 'var(--color-white)'
                      };

                      return (
                        <div key={q.id} className="preview-field text-center">
                          <label style={{ fontSize: '1.3rem', marginBottom: '1.5rem', display: 'block', fontWeight: 600, color: '#1F3A4D', fontFamily: "'Outfit', sans-serif" }}>
                            {q.text} {q.required && <span className="text-danger">*</span>}
                          </label>

                          {q.type === 'text' && (
                            <div className="input-with-icon" style={{ maxWidth: '400px', margin: '0 auto', position: 'relative' }}>
                              <User size={18} style={{ position: 'absolute', left: '1.25rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-secondary)' }} />
                              <input 
                                type="text" 
                                placeholder="Tu respuesta..." 
                                className="form-input" 
                                style={{ ...valStyle, textAlign: 'center', padding: '14px 1rem 14px 3rem', minHeight: '52px', height: 'auto', borderRadius: '10px', fontFamily: "'Outfit', sans-serif", fontSize: '1.05rem', width: '100%' }}
                                value={formValues[q.id] || ''}
                                onChange={e => setFormValues({...formValues, [q.id]: e.target.value})}
                              />
                            </div>
                          )}

                          {q.type === 'phone' && (
                            <div className="input-with-icon" style={{ maxWidth: '400px', margin: '0 auto', position: 'relative' }}>
                              <Phone size={18} style={{ position: 'absolute', left: '1.25rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-secondary)' }} />
                              <input 
                                type="tel" 
                                placeholder="11 1234-5678" 
                                className="form-input" 
                                style={{ ...valStyle, textAlign: 'center', padding: '14px 1rem 14px 3rem', minHeight: '52px', height: 'auto', borderRadius: '10px', fontFamily: "'Outfit', sans-serif", fontSize: '1.05rem', width: '100%' }}
                                value={formValues[q.id] || ''}
                                onChange={e => setFormValues({...formValues, [q.id]: formatPhoneFixed(e.target.value)})}
                              />
                            </div>
                          )}

                          {q.type === 'email' && (
                            <div className="email-input-group" style={{ maxWidth: '400px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                              <div className="input-with-icon" style={{ position: 'relative' }}>
                                <Mail size={18} style={{ position: 'absolute', left: '1.25rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-secondary)' }} />
                                <input 
                                  type="text" 
                                  placeholder="mail" 
                                  className="form-input"
                                  style={{ ...valStyle, textAlign: 'center', padding: '14px 1rem 14px 3rem', minHeight: '52px', height: 'auto', borderRadius: '10px', fontFamily: "'Outfit', sans-serif", fontSize: '1.05rem', width: '100%' }}
                                  value={emailPrefix}
                                  onChange={e => setEmailPrefix(e.target.value.replace(/@/g, ''))}
                                />
                              </div>
                              <select 
                                className="form-input"
                                value={emailDomain}
                                onChange={e => setEmailDomain(e.target.value)}
                                style={{ textAlign: 'center', minHeight: '52px', height: 'auto', padding: '14px', borderRadius: '10px', backgroundColor: '#f8f9fa', fontFamily: "'Outfit', sans-serif", fontSize: '1.05rem', width: '100%' }}
                              >
                                <option value="@gmail.com">@gmail.com</option>
                                <option value="@outlook.com">@outlook.com</option>
                                <option value="@hotmail.com">@hotmail.com</option>
                                <option value="@yahoo.com">@yahoo.com</option>
                              </select>
                            </div>
                          )}

                          {q.type === 'textarea' && (
                            <textarea 
                              placeholder="Escribe aquí tus detalles..." 
                              className="form-input" 
                              style={{ ...valStyle, maxWidth: '400px', margin: '0 auto', display: 'block', padding: '1.25rem', borderRadius: '10px', resize: 'vertical', fontFamily: "'Outfit', sans-serif", fontSize: '1.05rem', width: '100%' }}
                              rows={4}
                              value={formValues[q.id] || ''}
                              onChange={e => setFormValues({...formValues, [q.id]: e.target.value})}
                            ></textarea>
                          )}

                          {currentFormIndex < formQuestions.length - 1 ? (
                            <button 
                              className="btn btn-primary w-100 mt-5" 
                              onClick={() => setCurrentFormIndex(prev => prev + 1)}
                              disabled={q.required && !isFilled}
                              style={{ padding: '1rem', fontSize: '1.1rem', borderRadius: '12px', boxShadow: '0 4px 15px rgba(31, 58, 77, 0.25)', fontFamily: "'Outfit', sans-serif", fontWeight: 600, letterSpacing: '0.5px', opacity: (q.required && !isFilled) ? 0.6 : 1 }}
                            >
                              Siguiente
                            </button>
                          ) : (
                            <button 
                              className={`btn btn-primary w-100 mt-5 ${isSubmitting ? 'loading' : ''}`} 
                              type="button"
                              onClick={handleSubmitForm}
                              disabled={isSubmitting || (q.required && !isFilled)}
                              style={{ padding: '1rem', fontSize: '1.1rem', borderRadius: '12px', boxShadow: '0 4px 15px rgba(31, 58, 77, 0.25)', fontFamily: "'Outfit', sans-serif", fontWeight: 600, letterSpacing: '0.5px', opacity: (isSubmitting || (q.required && !isFilled)) ? 0.6 : 1 }}
                            >
                              {isSubmitting ? 'Enviando...' : 'Enviar formulario'}
                            </button>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

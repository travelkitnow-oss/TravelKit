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
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, X, Check } from 'lucide-react';
import { db } from '../lib/db';
import TripFormWizard, { type WizardAnswers } from './TripFormWizard/TripFormWizard';
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

  const selectedDate = isDashboard ? selectedDateExternal : internalSelectedDate;

  useEffect(() => {
    if (showForm) {
      fetchFormQuestions();
    }
  }, [showForm]);

  const fetchFormQuestions = async () => {
    const { data, error } = await db.from('form_questions').select('*').order('id');
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

  const handleSubmitForm = async ({ values, email }: WizardAnswers): Promise<boolean> => {
    const newSubmission = {
      name: values['base-1'] || 'Cliente Web',
      email,
      phone: values['base-3'] || '',
      requested_date: selectedDate ? format(selectedDate, 'yyyy-MM-dd') : null,
      requested_time: selectedTime,
      status: 'nuevo',
      answers: formQuestions.map(q => ({
        questionText: q.text,
        answer: values[q.id] || ''
      }))
    };

    const { error } = await db.from('form_submissions').insert([newSubmission]);
    if (error) return false;

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
    return true;
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
          <div className="modal-content-pro" role="dialog" aria-modal="true" aria-labelledby="booking-title">
            <div className="modal-header-pro">
              <div className="header-left">
                <div className="header-icon"><CalendarIcon size={20} /></div>
                <div className="header-text">
                  <h3 id="booking-title">Planifiquemos tu viaje</h3>
                  <p>
                    Sesión inicial · {selectedDate ? format(selectedDate, "EEEE d 'de' MMMM", { locale: es }) : ''}
                    {selectedTime ? ` · ${selectedTime} hs` : ''}
                  </p>
                </div>
              </div>
              <button type="button" onClick={() => setShowForm(false)} className="close-modal-btn" aria-label="Cerrar">
                <X size={18} />
              </button>
            </div>
            <div className="modal-body-pro">
              <TripFormWizard
                key={formQuestions.map(q => q.id).join('|')}
                questions={formQuestions}
                onSubmit={handleSubmitForm}
                onDone={() => setShowForm(false)}
                successText={<>Recibimos tu pedido para el <strong>{selectedDate ? format(selectedDate, 'dd/MM/yyyy') : ''}</strong>{selectedTime ? <> a las <strong>{selectedTime} hs</strong></> : null}. Te vamos a escribir para confirmar la sesión.</>}
              />
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

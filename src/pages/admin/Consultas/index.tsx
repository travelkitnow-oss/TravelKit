/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from 'react';
import { 
  Inbox as InboxIcon, 
  User, 
  Mail, 
  Phone, 
  Calendar, 
  Trash2, 
  MessageSquare, 
  ChevronRight, 
  Check, 
  X,
  Clock,
  Search
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { supabase } from '../../../lib/supabase';
import ConfirmationModal from '../../../components/ConfirmationModal/ConfirmationModal';
import './Consultas.css';

interface Submission {
  id: string;
  name: string;
  email: string;
  phone: string;
  created_at: string;
  requested_date?: string;
  requested_time?: string;
  status: 'nuevo' | 'leido' | 'contactado' | 'aceptado' | 'rechazado';
  answers: { questionText: string; answer: string }[];
}

export default function ConsultasPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [filter, setFilter] = useState<'todos' | 'nuevo' | 'aceptado' | 'rechazado'>('todos');
  const [searchTerm, setSearchTerm] = useState('');

  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    type: 'danger' | 'warning' | 'info';
  }>({
    isOpen: false, title: '', message: '', onConfirm: () => {}, type: 'danger'
  });

  async function fetchSubmissions() {
    setLoading(true);
    const { data, error } = await supabase.from('form_submissions').select('*').order('created_at', { ascending: false });
    if (!error) setSubmissions(data || []);
    setLoading(false);
  }

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const updateStatus = async (id: string, newStatus: Submission['status']) => {
    const { error } = await supabase.from('form_submissions').update({ status: newStatus }).eq('id', id);
    if (!error) {
      setSubmissions(prev => prev.map(s => s.id === id ? { ...s, status: newStatus } : s));
      setSelectedSubmission(prev => prev?.id === id ? { ...prev, status: newStatus } : prev);
    } else {
      console.error('Error updating status:', error);
    }
  };

  const handleAccept = async (sub: Submission) => {
    if (!sub.requested_date || !sub.requested_time) {
      alert('Esta consulta no tiene una fecha u hora de reunión solicitada.');
      return;
    }

    try {
      // 1. Mark as accepted in submissions
      await updateStatus(sub.id, 'aceptado');

      // 2. Create reservation in admin_meetings WITHOUT client_id
      const { error: meetingError } = await supabase.from('admin_meetings').insert([{
        client_name: sub.name,
        client_id: null, // NO CLIENT YET
        destination: sub.answers.find(a => a.questionText.toLowerCase().includes('destino'))?.answer || 'Por definir',
        email: sub.email,
        phone: sub.phone,
        meeting_date: sub.requested_date,
        meeting_time: sub.requested_time,
        status: 'confirmed',
        google_meet_url: 'https://meet.google.com/' + Math.random().toString(36).substring(7)
      }]);

      if (meetingError) throw meetingError;

      alert('¡Reunión aceptada y agendada correctamente!');
    } catch (error: any) {
      console.error('Error accepting consultation:', error);
      alert('Error: ' + error.message);
    }
  };

  const deleteSubmission = (id: string) => {
    setConfirmConfig({
      isOpen: true,
      title: '¿Eliminar consulta?',
      message: 'Esta acción eliminará la consulta permanentemente del sistema.',
      type: 'danger',
      onConfirm: async () => {
        const { error } = await supabase.from('form_submissions').delete().eq('id', id);
        if (!error) {
          setSubmissions(submissions.filter(s => s.id !== id));
          if (selectedSubmission?.id === id) setSelectedSubmission(null);
          setConfirmConfig(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  const filteredSubmissions = submissions.filter(s => {
    const matchesFilter = filter === 'todos' || 
                          (filter === 'nuevo' && (s.status === 'nuevo' || s.status === 'leido')) || 
                          s.status === filter;
    const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         s.email.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="consultas-page animate-fade-in">
      <header className="page-header-centered">
        <h1>Centro de Consultas</h1>
        <p>Gestiona las solicitudes entrantes, agenda sesiones y contacta a tus potenciales viajeros.</p>
      </header>
      
      <div className="filter-pills-container">
        <div className="filter-pills">
          <button className={`pill ${filter === 'todos' ? 'active' : ''}`} onClick={() => setFilter('todos')}>
            Todos <span className="pill-count">{submissions.length}</span>
          </button>
          <button className={`pill ${filter === 'nuevo' ? 'active' : ''}`} onClick={() => setFilter('nuevo')}>
            Nuevos <span className="pill-count">{submissions.filter(s => s.status === 'nuevo' || s.status === 'leido').length}</span>
          </button>
          <button className={`pill ${filter === 'aceptado' ? 'active' : ''}`} onClick={() => setFilter('aceptado')}>
            Aceptados <span className="pill-count">{submissions.filter(s => s.status === 'aceptado').length}</span>
          </button>
          <button className={`pill ${filter === 'rechazado' ? 'active' : ''}`} onClick={() => setFilter('rechazado')}>
            Rechazados <span className="pill-count">{submissions.filter(s => s.status === 'rechazado').length}</span>
          </button>
        </div>
      </div>

      <div className="inbox-grid">
        <div className="submissions-list">
          <div className="card-header border-bottom">
            <div className="search-bar-modern">
              <Search size={18} />
              <input 
                type="text" 
                placeholder="Buscar por nombre o email..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div className="list-items custom-scrollbar">
            {loading ? (
              <div className="p-5 text-center"><div className="loader-premium"></div></div>
            ) : filteredSubmissions.length === 0 ? (
              <div className="empty-state py-5">
                <InboxIcon size={48} strokeWidth={1} className="text-tertiary mb-3" />
                <p>No se encontraron consultas.</p>
              </div>
            ) : (
              filteredSubmissions.map(s => (
                <div 
                  key={s.id} 
                  className={`submission-item ${s.status} ${selectedSubmission?.id === s.id ? 'selected' : ''}`}
                  onClick={() => {
                    setSelectedSubmission(s);
                    if (s.status === 'nuevo') updateStatus(s.id, 'leido');
                  }}
                >
                  <div className="item-avatar">{s.name.charAt(0)}</div>
                  <div className="item-main">
                    <div className="item-header">
                      <h4>{s.name}</h4>
                      <span className="item-date">{format(new Date(s.created_at), 'dd MMM', { locale: es })}</span>
                    </div>
                    <p className="item-email">{s.email}</p>
                    <div className="item-tags">
                      {s.status === 'aceptado' && <span className="aceptado-mini-tag">Agendado</span>}
                      {s.status === 'rechazado' && <span className="rechazado-mini-tag">Rechazado</span>}
                      {s.status === 'nuevo' && <span className="aceptado-mini-tag" style={{ background: 'var(--color-accent)', color: 'white' }}>Nuevo</span>}
                    </div>
                  </div>
                  <ChevronRight size={18} className="item-arrow" />
                </div>
              ))
            )}
          </div>
        </div>

        <div className="details-panel">
          {selectedSubmission ? (
            <div className="details-card animate-fade-in" key={selectedSubmission.id}>
              <div className="details-header border-bottom">
                <div className="details-user">
                  <div className="details-avatar-large">
                    <User size={32} />
                  </div>
                  <div>
                    <h2>{selectedSubmission.name}</h2>
                    <div className={`status-badge ${selectedSubmission.status}`}>
                      {selectedSubmission.status === 'nuevo' && <Clock size={14} />}
                      {selectedSubmission.status === 'aceptado' && <Check size={14} />}
                      {selectedSubmission.status === 'rechazado' && <X size={14} />}
                      {selectedSubmission.status}
                    </div>
                  </div>
                </div>
                <div className="details-actions">
                  {selectedSubmission.status !== 'aceptado' && selectedSubmission.status !== 'rechazado' && (
                    <button className="btn-action btn-accept" onClick={() => handleAccept(selectedSubmission)} title="Aceptar y Agendar">
                      <Check size={22} />
                    </button>
                  )}
                  {selectedSubmission.status !== 'rechazado' && selectedSubmission.status !== 'aceptado' && (
                    <button className="btn-action btn-reject" onClick={() => updateStatus(selectedSubmission.id, 'rechazado')} title="Rechazar Consulta">
                      <X size={22} />
                    </button>
                  )}
                  <button className="btn-action btn-delete" onClick={() => deleteSubmission(selectedSubmission.id)} title="Eliminar Permanentemente">
                    <Trash2 size={22} />
                  </button>
                </div>
              </div>

              <div className="details-scrollable custom-scrollbar">
                {selectedSubmission.requested_date && (
                  <div className="appointment-highlight">
                    <div className="appointment-info">
                      <h4>Reunión Solicitada</h4>
                      <p>El cliente ha solicitado una sesión inicial a través del calendario.</p>
                    </div>
                    <div className="appointment-date">
                      <div className="date-pill">
                        <span className="day">{format(new Date(selectedSubmission.requested_date + 'T12:00:00'), 'dd')}</span>
                        <span className="month">{format(new Date(selectedSubmission.requested_date + 'T12:00:00'), 'MMM', { locale: es })}</span>
                      </div>
                      <div className="time-pill">
                        {selectedSubmission.requested_time}
                      </div>
                    </div>
                  </div>
                )}

                <div className="section-title">
                  <InboxIcon size={18} /> Información de Contacto
                </div>
                <div className="contact-card">
                  <div className="contact-item">
                    <div className="contact-icon"><Mail size={18} /></div>
                    <span className="contact-label">Email</span>
                    <span className="contact-value">{selectedSubmission.email}</span>
                  </div>
                  <div className="contact-item">
                    <div className="contact-icon"><Phone size={18} /></div>
                    <span className="contact-label">Teléfono</span>
                    <span className="contact-value">{selectedSubmission.phone}</span>
                  </div>
                  <div className="contact-item">
                    <div className="contact-icon"><Calendar size={18} /></div>
                    <span className="contact-label">Fecha de Recibo</span>
                    <span className="contact-value">{format(new Date(selectedSubmission.created_at), "PPP", { locale: es })}</span>
                  </div>
                </div>

                <div className="section-title">
                  <MessageSquare size={18} /> Respuestas del Formulario
                </div>
                <div className="answers-grid">
                  {selectedSubmission.answers.map((ans, i) => (
                    <div key={i} className="answer-card">
                      <label>{ans.questionText}</label>
                      <p>{ans.answer || 'Sin respuesta'}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="details-card">
              <div className="empty-hero">
                <div className="hero-box">
                  <div className="icon-box">
                    <MessageSquare size={56} strokeWidth={1.5} />
                  </div>
                  <h3>Centro de Gestión</h3>
                  <p>Selecciona una consulta del listado para ver el perfil completo del viajero y gestionar su solicitud.</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <ConfirmationModal 
        isOpen={confirmConfig.isOpen}
        onClose={() => setConfirmConfig({ ...confirmConfig, isOpen: false })}
        onConfirm={confirmConfig.onConfirm}
        title={confirmConfig.title}
        message={confirmConfig.message}
        type={confirmConfig.type}
        confirmText="Confirmar"
      />
    </div>
  );
}

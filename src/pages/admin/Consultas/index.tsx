import { useState, useEffect } from 'react';
import { Inbox as InboxIcon, User, Mail, Phone, Calendar, Trash2, CheckCircle, MessageSquare, ChevronRight, Check, X } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { mockReservations, saveReservations } from '../../../lib/data';
import ConfirmationModal from '../../../components/ConfirmationModal/ConfirmationModal';
import './Consultas.css';

interface Submission {
  id: string;
  name: string;
  email: string;
  phone: string;
  date: string;
  requestedDate?: string;
  requestedTime?: string;
  status: 'nuevo' | 'leido' | 'contactado' | 'aceptado' | 'rechazado';
  answers: { questionText: string; answer: string }[];
}

export default function ConsultasPage() {
  const [submissions, setSubmissions] = useState<Submission[]>(() => {
    const saved = localStorage.getItem('travelkit_submissions');
    return saved ? JSON.parse(saved) : [];
  });

  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [filter, setFilter] = useState<'todos' | 'nuevo' | 'aceptado' | 'rechazado'>('todos');

  // Confirmation modal states
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    type: 'danger' | 'warning' | 'info';
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    type: 'danger'
  });

  useEffect(() => {
    localStorage.setItem('travelkit_submissions', JSON.stringify(submissions));
    
    // Listen for new submissions from the form preview
    const handleStorageChange = () => {
      const saved = localStorage.getItem('travelkit_submissions');
      if (saved) setSubmissions(JSON.parse(saved));
    };

    window.addEventListener('storage', handleStorageChange);
    // Custom event for same-tab updates
    window.addEventListener('travelkit_new_submission', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('travelkit_new_submission', handleStorageChange);
    };
  }, [submissions]);

  const updateStatus = (id: string, newStatus: Submission['status']) => {
    const updated = submissions.map(s => s.id === id ? { ...s, status: newStatus } : s);
    setSubmissions(updated);
    if (selectedSubmission?.id === id) {
      setSelectedSubmission({ ...selectedSubmission, status: newStatus });
    }
  };

  const handleAccept = (sub: Submission) => {
    if (!sub.requestedDate || !sub.requestedTime) {
      alert('Esta consulta no tiene una fecha u hora de reunión solicitada.');
      return;
    }

    // Mark as accepted
    updateStatus(sub.id, 'aceptado');

    // Create reservation in agenda
    if (!mockReservations[sub.requestedDate]) {
      mockReservations[sub.requestedDate] = [];
    }

    // Check if already exists
    const exists = mockReservations[sub.requestedDate].some(r => r.submissionId === sub.id);
    if (!exists) {
      mockReservations[sub.requestedDate].push({
        id: Date.now().toString(),
        client: sub.name,
        dest: sub.answers.find(a => a.questionText.toLowerCase().includes('destino'))?.answer || 'Destino por definir',
        time: sub.requestedTime,
        status: 'confirmed',
        googleMeet: 'https://meet.google.com/' + Math.random().toString(36).substring(7),
        submissionId: sub.id
      });
      saveReservations();
      alert('¡Reunión aceptada y agendada correctamente!');
    }
  };

  const deleteSubmission = (id: string) => {
    setConfirmConfig({
      isOpen: true,
      title: '¿Eliminar consulta?',
      message: 'Esta acción eliminará la consulta permanentemente.',
      type: 'danger',
      onConfirm: () => {
        const updated = submissions.filter(s => s.id !== id);
        setSubmissions(updated);
        if (selectedSubmission?.id === id) setSelectedSubmission(null);
      }
    });
  };

  const handleReject = (id: string) => {
    setConfirmConfig({
      isOpen: true,
      title: '¿Rechazar consulta?',
      message: 'La consulta se moverá a la pestaña de Rechazados.',
      type: 'warning',
      onConfirm: () => updateStatus(id, 'rechazado')
    });
  };

  const filteredSubmissions = submissions.filter(s => {
    if (filter === 'todos') return true;
    return s.status === filter;
  });

  const newCount = submissions.filter(s => s.status === 'nuevo').length;
  const acceptedCount = submissions.filter(s => s.status === 'aceptado').length;
  const rejectedCount = submissions.filter(s => s.status === 'rechazado').length;

  return (
    <div className="consultas-page animate-fade-in">
      <header className="page-header-centered">
        <h1>Consultas Recibidas</h1>
        <p>Gestiona y responde las solicitudes de tus viajeros desde un solo lugar.</p>
      </header>
      
      <div className="filter-tabs-container">
        <div className="filter-tabs">
          <button className={`tab ${filter === 'todos' ? 'active' : ''}`} onClick={() => setFilter('todos')}>
            Todos <span className="tab-count">{submissions.length}</span>
          </button>
          <button className={`tab ${filter === 'nuevo' ? 'active' : ''}`} onClick={() => setFilter('nuevo')}>
            Nuevos <span className="tab-count nuevo">{newCount}</span>
          </button>
          <button className={`tab ${filter === 'aceptado' ? 'active' : ''}`} onClick={() => setFilter('aceptado')}>
            Aceptados <span className="tab-count aceptado">{acceptedCount}</span>
          </button>
          <button className={`tab ${filter === 'rechazado' ? 'active' : ''}`} onClick={() => setFilter('rechazado')}>
            Rechazados <span className="tab-count rechazado">{rejectedCount}</span>
          </button>
        </div>
      </div>

      <div className="inbox-grid">
        {/* Submissions List */}
        <div className="submissions-list glass-card">
          <div className="card-header border-bottom">
            <h3><InboxIcon size={20} className="text-primary" /> Consultas Recibidas</h3>
          </div>
          <div className="list-items">
            {filteredSubmissions.length === 0 ? (
              <div className="empty-state py-5">
                <InboxIcon size={48} className="text-tertiary mb-3" />
                <p>No hay consultas {filter !== 'todos' ? `en esta categoría` : `recibidas aún`}.</p>
              </div>
            ) : (
              [...filteredSubmissions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(s => (
                <div 
                  key={s.id} 
                  className={`submission-item ${s.status} ${selectedSubmission?.id === s.id ? 'selected' : ''}`}
                  onClick={() => {
                    setSelectedSubmission(s);
                    if (s.status === 'nuevo') updateStatus(s.id, 'leido');
                  }}
                >
                  <div className="item-main">
                    <div className="item-header">
                      <h4>{s.name}</h4>
                      <span className="item-date">{format(new Date(s.date), 'dd/MM HH:mm')}</span>
                    </div>
                    <p className="item-email">{s.email}</p>
                    <div className="item-tags">
                      {s.status === 'aceptado' && <span className="aceptado-mini-tag">Agendado</span>}
                      {s.status === 'rechazado' && <span className="rechazado-mini-tag">Rechazado</span>}
                    </div>
                  </div>
                  <ChevronRight size={18} className="item-arrow" />
                </div>
              ))
            )}
          </div>
        </div>

        {/* Details Panel */}
        <div className="details-panel">
          {selectedSubmission ? (
            <div className="glass-card full-height animate-fade-in" key={selectedSubmission.id}>
              <div className="details-header border-bottom">
                <div className="details-user">
                  <div className="details-avatar">
                    <User size={24} />
                  </div>
                  <div>
                    <h2>{selectedSubmission.name}</h2>
                    <span className={`status-tag ${selectedSubmission.status}`}>
                      {selectedSubmission.status === 'nuevo' && 'Sin leer'}
                      {selectedSubmission.status === 'leido' && 'Leído'}
                      {selectedSubmission.status === 'contactado' && 'Contactado'}
                      {selectedSubmission.status === 'aceptado' && 'Aceptado y Agendado'}
                      {selectedSubmission.status === 'rechazado' && 'Rechazado'}
                    </span>
                  </div>
                </div>
                <div className="details-actions">
                  {selectedSubmission.status !== 'aceptado' && selectedSubmission.status !== 'rechazado' && (
                    <button 
                      className="btn-icon btn-accept"
                      onClick={() => handleAccept(selectedSubmission)}
                      title="Aceptar y Agendar"
                    >
                      <Check size={20} />
                    </button>
                  )}
                  {selectedSubmission.status !== 'rechazado' && selectedSubmission.status !== 'aceptado' && (
                    <button 
                      className="btn-icon btn-reject"
                      onClick={() => handleReject(selectedSubmission.id)}
                      title="Rechazar"
                    >
                      <X size={20} />
                    </button>
                  )}
                  <button 
                    className={`btn-icon ${selectedSubmission.status === 'contactado' ? 'active' : ''}`}
                    onClick={() => updateStatus(selectedSubmission.id, 'contactado')}
                    title="Marcar como contactado"
                  >
                    <CheckCircle size={20} />
                  </button>
                  <button className="btn-icon text-danger" onClick={() => deleteSubmission(selectedSubmission.id)}>
                    <Trash2 size={20} />
                  </button>
                </div>
              </div>

              <div className="details-content">
                <div className="info-section">
                  <h4>Información de Contacto</h4>
                  <div className="info-grid">
                    <div className="info-item">
                      <Mail size={16} />
                      <span>{selectedSubmission.email}</span>
                    </div>
                    <div className="info-item">
                      <Phone size={16} />
                      <span>{selectedSubmission.phone}</span>
                    </div>
                    <div className="info-item">
                      <Calendar size={16} />
                      <span>Recibido el {format(new Date(selectedSubmission.date), "PPP 'a las' p", { locale: es })}</span>
                    </div>
                  </div>
                </div>

                <div className="info-section">
                  <h4>Respuestas del Formulario</h4>
                  <div className="answers-list">
                    {selectedSubmission.answers.map((ans, i) => (
                      <div key={i} className="answer-item">
                        <label>{ans.questionText}</label>
                        <p>{ans.answer || <span className="no-answer">Sin respuesta</span>}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="details-footer border-top">
                <a href={`mailto:${selectedSubmission.email}`} className="btn btn-primary w-100">
                  <Mail size={18} /> Responder por Mail
                </a>
              </div>
            </div>
          ) : (
            <div className="empty-details glass-card">
              <MessageSquare size={48} className="text-tertiary mb-3" />
              <h3>Selecciona una consulta</h3>
              <p>Haz clic en una consulta de la lista para ver todos los detalles del cliente.</p>
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

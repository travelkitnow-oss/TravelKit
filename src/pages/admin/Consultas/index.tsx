/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from 'react';
import { Inbox as InboxIcon, User, Mail, Phone, Calendar, Trash2, MessageSquare, ChevronRight, Check, X } from 'lucide-react';
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

  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    type: 'danger' | 'warning' | 'info';
  }>({
    isOpen: false, title: '', message: '', onConfirm: () => {}, type: 'danger'
  });

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const fetchSubmissions = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('form_submissions').select('*').order('created_at', { ascending: false });
    if (!error) setSubmissions(data || []);
    setLoading(false);
  };

  const updateStatus = async (id: string, newStatus: Submission['status']) => {
    const { error } = await supabase.from('form_submissions').update({ status: newStatus }).eq('id', id);
    if (!error) {
      setSubmissions(submissions.map(s => s.id === id ? { ...s, status: newStatus } : s));
      if (selectedSubmission?.id === id) {
        setSelectedSubmission({ ...selectedSubmission, status: newStatus });
      }
    }
  };

  const handleAccept = async (sub: Submission) => {
    if (!sub.requested_date || !sub.requested_time) {
      alert('Esta consulta no tiene una fecha u hora de reunión solicitada.');
      return;
    }

    // 1. Mark as accepted in submissions
    await updateStatus(sub.id, 'aceptado');

    // 2. Create reservation in admin_meetings
    const { error } = await supabase.from('admin_meetings').insert([{
      client_name: sub.name,
      destination: sub.answers.find(a => a.questionText.toLowerCase().includes('destino'))?.answer || 'Por definir',
      email: sub.email,
      phone: sub.phone,
      meeting_date: sub.requested_date,
      meeting_time: sub.requested_time,
      status: 'confirmed',
      google_meet_url: 'https://meet.google.com/' + Math.random().toString(36).substring(7)
    }]);

    if (!error) {
      alert('¡Reunión aceptada y agendada correctamente!');
    } else {
      alert('Error al agendar reunión');
    }
  };

  const deleteSubmission = (id: string) => {
    setConfirmConfig({
      isOpen: true,
      title: '¿Eliminar consulta?',
      message: 'Esta acción eliminará la consulta permanentemente.',
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
    if (filter === 'todos') return true;
    return s.status === filter;
  });

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
            Nuevos <span className="tab-count nuevo">{submissions.filter(s => s.status === 'nuevo').length}</span>
          </button>
          <button className={`tab ${filter === 'aceptado' ? 'active' : ''}`} onClick={() => setFilter('aceptado')}>
            Aceptados <span className="tab-count aceptado">{submissions.filter(s => s.status === 'aceptado').length}</span>
          </button>
          <button className={`tab ${filter === 'rechazado' ? 'active' : ''}`} onClick={() => setFilter('rechazado')}>
            Rechazados <span className="tab-count rechazado">{submissions.filter(s => s.status === 'rechazado').length}</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="p-5 text-center"><div className="loader-premium"></div></div>
      ) : (
        <div className="inbox-grid">
          <div className="submissions-list glass-card">
            <div className="card-header border-bottom">
              <h3><InboxIcon size={20} className="text-primary" /> Consultas Recibidas</h3>
            </div>
            <div className="list-items">
              {filteredSubmissions.length === 0 ? (
                <div className="empty-state py-5">
                  <InboxIcon size={48} className="text-tertiary mb-3" />
                  <p>No hay consultas.</p>
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
                    <div className="item-main">
                      <div className="item-header">
                        <h4>{s.name}</h4>
                        <span className="item-date">{format(new Date(s.created_at), 'dd/MM HH:mm')}</span>
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

          <div className="details-panel">
            {selectedSubmission ? (
              <div className="glass-card full-height animate-fade-in" key={selectedSubmission.id}>
                <div className="details-header border-bottom">
                  <div className="details-user">
                    <div className="details-avatar"><User size={24} /></div>
                    <div>
                      <h2>{selectedSubmission.name}</h2>
                      <span className={`status-tag ${selectedSubmission.status}`}>{selectedSubmission.status}</span>
                    </div>
                  </div>
                  <div className="details-actions">
                    {selectedSubmission.status !== 'aceptado' && selectedSubmission.status !== 'rechazado' && (
                      <button className="btn-icon btn-accept" onClick={() => handleAccept(selectedSubmission)}><Check size={20} /></button>
                    )}
                    {selectedSubmission.status !== 'rechazado' && selectedSubmission.status !== 'aceptado' && (
                      <button className="btn-icon btn-reject" onClick={() => updateStatus(selectedSubmission.id, 'rechazado')}><X size={20} /></button>
                    )}
                    <button className="btn-icon text-danger" onClick={() => deleteSubmission(selectedSubmission.id)}><Trash2 size={20} /></button>
                  </div>
                </div>

                <div className="details-content">
                  <div className="info-section">
                    <h4>Información de Contacto</h4>
                    <div className="info-grid">
                      <div className="info-item"><Mail size={16} /><span>{selectedSubmission.email}</span></div>
                      <div className="info-item"><Phone size={16} /><span>{selectedSubmission.phone}</span></div>
                      <div className="info-item"><Calendar size={16} /><span>Recibido el {format(new Date(selectedSubmission.created_at), "PPP", { locale: es })}</span></div>
                    </div>
                  </div>

                  <div className="info-section">
                    <h4>Respuestas del Formulario</h4>
                    <div className="answers-list">
                      {selectedSubmission.answers.map((ans, i) => (
                        <div key={i} className="answer-item">
                          <label>{ans.questionText}</label>
                          <p>{ans.answer || 'Sin respuesta'}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="empty-details glass-card">
                <MessageSquare size={48} className="text-tertiary mb-3" />
                <h3>Selecciona una consulta</h3>
              </div>
            )}
          </div>
        </div>
      )}

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

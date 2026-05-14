import { useState, useEffect } from 'react';
import { Plus, Trash2, GripVertical, Eye, Settings, HelpCircle, Mail, Phone, User, Check, X } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import './Formulario.css';

export interface FormQuestion {
  id: string;
  text: string;
  type: 'text' | 'email' | 'phone' | 'textarea' | 'select';
  required: boolean;
  is_base?: boolean;
}

const BASE_QUESTIONS: FormQuestion[] = [
  { id: 'base-1', text: '¿Cómo te llamas?', type: 'text', required: true, is_base: true },
  { id: 'base-2', text: '¿Cuál es tu mail?', type: 'email', required: true, is_base: true },
  { id: 'base-3', text: '¿Cuál es tu número?', type: 'phone', required: true, is_base: true },
];

export default function FormularioPage() {
  const [questions, setQuestions] = useState<FormQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [newQuestionText, setNewQuestionText] = useState('');
  const [newQuestionRequired, setNewQuestionRequired] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [currentPreviewIndex, setCurrentPreviewIndex] = useState(0);

  const [emailPrefix, setEmailPrefix] = useState('');
  const [emailDomain, setEmailDomain] = useState('@gmail.com');
  const [customDomain] = useState('');

  useEffect(() => {
    fetchQuestions();
  }, []);

  const fetchQuestions = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('form_questions').select('*').order('id');
    
    if (error) {
      console.error('Error fetching questions:', error);
      setQuestions(BASE_QUESTIONS);
    } else if (data && data.length > 0) {
      setQuestions(data);
    } else {
      // If table is empty, initialize with base questions
      setQuestions(BASE_QUESTIONS);
      await supabase.from('form_questions').insert(BASE_QUESTIONS);
    }
    setLoading(false);
  };

  const handleAddQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuestionText.trim()) return;

    const newQ: Partial<FormQuestion> = {
      text: newQuestionText.trim(),
      type: 'textarea',
      required: newQuestionRequired,
      is_base: false
    };

    const { data, error } = await supabase.from('form_questions').insert([newQ]).select();

    if (error) {
      alert('Error al añadir pregunta');
    } else if (data) {
      setQuestions([...questions, data[0] as FormQuestion]);
      setNewQuestionText('');
      setNewQuestionRequired(false);
    }
  };

  const handleDeleteQuestion = async (id: string) => {
    const q = questions.find(q => q.id === id);
    if (q?.is_base) return;

    const { error } = await supabase.from('form_questions').delete().eq('id', id);
    if (!error) {
      setQuestions(questions.filter(q => q.id !== id));
    }
  };

  const toggleRequired = async (id: string) => {
    const q = questions.find(q => q.id === id);
    if (!q || q.is_base) return;

    const newRequired = !q.required;
    const { error } = await supabase.from('form_questions').update({ required: newRequired }).eq('id', id);
    
    if (!error) {
      setQuestions(questions.map(item => item.id === id ? { ...item, required: newRequired } : item));
    }
  };

  const [previewValues, setPreviewValues] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [triedToSubmit, setTriedToSubmit] = useState(false);

  const formatPhoneNumber = (value: string) => {
    const numbers = value.replace(/\D/g, '').substring(0, 10);
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 6) return `${numbers.slice(0, 2)} ${numbers.slice(2)}`;
    return `${numbers.slice(0, 2)} ${numbers.slice(2, 6)}-${numbers.slice(6)}`;
  };

  const getValidationStyle = (q: FormQuestion) => {
    if (!triedToSubmit) return {};
    const isFilled = q.type === 'email' ? !!emailPrefix : !!previewValues[q.id];
    if (q.required) {
      return {
        borderColor: isFilled ? '#10b981' : '#ef4444',
        boxShadow: isFilled ? '0 0 0 1px rgba(16, 185, 129, 0.1)' : '0 0 0 1px rgba(239, 68, 68, 0.1)',
        backgroundColor: isFilled ? 'rgba(16, 185, 129, 0.02)' : 'rgba(239, 68, 68, 0.02)'
      };
    } else if (isFilled) {
      return { borderColor: '#10b981', backgroundColor: 'rgba(16, 185, 129, 0.02)' };
    }
    return {};
  };

  const handlePreviewSubmit = async () => {
    setTriedToSubmit(true);
    const missingFields = questions.filter(q => {
      if (!q.required) return false;
      if (q.type === 'email') return !emailPrefix;
      return !previewValues[q.id];
    });

    if (missingFields.length > 0) return;

    setIsSubmitting(true);
    const fullEmail = `${emailPrefix}${emailDomain === 'personalizado' ? '@' + customDomain : emailDomain}`;
    
    const newSubmission = {
      name: previewValues[questions.find(q => q.is_base && q.type === 'text')?.id || 'base-1'] || 'Cliente Anónimo',
      email: fullEmail,
      phone: previewValues[questions.find(q => q.is_base && q.type === 'phone')?.id || 'base-3'] || 'Sin teléfono',
      status: 'nuevo',
      answers: questions.map(q => ({
        questionText: q.text,
        answer: q.type === 'email' ? fullEmail : (previewValues[q.id] || '')
      }))
    };

    const { error } = await supabase.from('form_submissions').insert([newSubmission]);

    if (!error) {
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    }
    setIsSubmitting(false);
  };

  return (
    <div className="formulario-page animate-fade-in">
      <header className="page-header-centered">
        <h1>Herramientas de Captación</h1>
        <p>Comparte tu formulario personalizado y gestiona tus links estratégicos para atraer nuevos viajeros.</p>
      </header>

      {loading ? (
        <div className="p-5 text-center">
          <div className="loader-premium"></div>
          <p className="mt-3">Cargando configuración...</p>
        </div>
      ) : (
        <div className="form-builder-container">
          <div className="builder-panel glass-card">
            <div className="card-header border-bottom">
              <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                <div>
                  <h3><Settings size={20} className="text-primary" /> Constructor de Formulario</h3>
                  <p className="text-secondary text-sm">Define qué le preguntarás a tus clientes antes de contratarte.</p>
                </div>
                <button className="btn btn-outline btn-sm" onClick={() => { setShowPreview(true); setCurrentPreviewIndex(0); setPreviewValues({}); setEmailPrefix(''); setTriedToSubmit(false); setShowSuccess(false); }} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Eye size={16} /> Probar Formulario
                </button>
              </div>
            </div>
            
            <div className="card-body">
              <div className="questions-list">
                {questions.map((q, index) => (
                  <div key={q.id} className={`question-item ${q.is_base ? 'base-question' : ''}`}>
                    <div className="drag-handle">
                      <GripVertical size={16} color="var(--color-tertiary)" />
                    </div>
                    <div className="question-content">
                      <div className="question-header">
                        <span className="question-number">{index + 1}</span>
                        <span className="question-text">{q.text}</span>
                        {q.required && <span className="required-badge">Obligatorio</span>}
                      </div>
                      {q.is_base && <span className="base-badge">Pregunta Fija</span>}
                    </div>
                    <div className="question-actions">
                      {!q.is_base && (
                        <>
                          <button 
                            className={`action-btn toggle-required ${q.required ? 'active' : ''}`}
                            onClick={() => toggleRequired(q.id)}
                            title="Alternar obligatoriedad"
                          >
                            <HelpCircle size={16} />
                          </button>
                          <button 
                            className="action-btn text-danger" 
                            onClick={() => handleDeleteQuestion(q.id)}
                          >
                            <Trash2 size={16} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="add-question-form">
                <h4>Agregar nueva pregunta</h4>
                <form onSubmit={handleAddQuestion}>
                  <input 
                    type="text" 
                    value={newQuestionText}
                    onChange={e => setNewQuestionText(e.target.value)}
                    placeholder="Ej: ¿Qué países te gustaría visitar?"
                    className="form-input mb-2"
                  />
                  <div className="add-form-footer">
                    <label className="checkbox-label">
                      <input 
                        type="checkbox" 
                        checked={newQuestionRequired}
                        onChange={e => setNewQuestionRequired(e.target.checked)}
                      />
                      <span>Hacer que sea obligatoria</span>
                    </label>
                    <button type="submit" className="btn btn-sm btn-primary" disabled={!newQuestionText.trim()}>
                      <Plus size={16} /> Añadir
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {showPreview && (
        <div className="modal-overlay animate-fade-in" style={{ zIndex: 3000 }}>
          <div className="modal-content glass-card animate-scale-in" style={{ maxWidth: '600px', width: '100%', padding: 0, borderRadius: '24px', overflow: 'hidden' }}>
            <div style={{ padding: '1.25rem 1.5rem', background: 'var(--color-primary)', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Eye size={18} /> Vista Previa del Cliente
                </h3>
              </div>
              <button onClick={() => { setShowPreview(false); setShowSuccess(false); setTriedToSubmit(false); setPreviewValues({}); }} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', padding: '6px', cursor: 'pointer', color: 'white' }}>
                <X size={18} />
              </button>
            </div>
            
            <div className="card-body preview-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
              <div className="preview-form">
                <div className="preview-header text-center mb-4">
                  <h3 style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: '1.8rem', color: '#1F3A4D', marginBottom: '0.5rem' }}>Planifiquemos tu viaje</h3>
                  <p style={{ color: '#64748b', fontSize: '1rem', fontFamily: "'Outfit', sans-serif" }}>Completa estos datos para comenzar a planificar tu aventura.</p>
                </div>

                {questions.length > 0 && currentPreviewIndex < questions.length ? (
                  <div className="quiz-wizard animate-fade-in">
                    <div className="wizard-progress" style={{ textAlign: 'center', marginBottom: '1.5rem', color: '#64748b', fontSize: '0.9rem', fontWeight: 600 }}>
                      Paso {currentPreviewIndex + 1} de {questions.length}
                      <div style={{ background: '#f1f5f9', height: '6px', borderRadius: '3px', marginTop: '0.5rem', overflow: 'hidden' }}>
                        <div style={{ background: 'var(--color-primary)', height: '100%', width: `${((currentPreviewIndex + 1) / questions.length) * 100}%`, transition: 'width 0.3s' }}></div>
                      </div>
                    </div>

                    {(() => {
                      const q = questions[currentPreviewIndex];
                      return (
                        <div key={q.id} className="preview-field text-center">
                          <label style={{ fontSize: '1.2rem', marginBottom: '1rem', display: 'block', fontWeight: 700, color: '#1F3A4D' }}>
                            {q.text} {q.required && <span className="text-danger">*</span>}
                          </label>

                          {q.type === 'text' && (
                            <div className="input-with-icon" style={{ maxWidth: '400px', margin: '0 auto' }}>
                              <User size={16} />
                              <input 
                                type="text" 
                                placeholder="Tu respuesta..." 
                                className="preview-input" 
                                style={{ ...getValidationStyle(q), textAlign: 'center', paddingLeft: '1rem' }}
                                value={previewValues[q.id] || ''}
                                onChange={e => setPreviewValues({...previewValues, [q.id]: e.target.value})}
                              />
                            </div>
                          )}

                          {q.type === 'phone' && (
                            <div className="input-with-icon" style={{ maxWidth: '400px', margin: '0 auto' }}>
                              <Phone size={16} />
                              <input 
                                type="tel" 
                                placeholder="11 1234-5678" 
                                className="preview-input" 
                                style={{ ...getValidationStyle(q), textAlign: 'center', paddingLeft: '1rem' }}
                                value={previewValues[q.id] || ''}
                                onChange={e => setPreviewValues({...previewValues, [q.id]: formatPhoneNumber(e.target.value)})}
                              />
                            </div>
                          )}

                          {q.type === 'email' && (
                            <div className="email-input-group" style={{ maxWidth: '400px', margin: '0 auto' }}>
                              <div className="input-with-icon email-prefix">
                                <Mail size={16} />
                                <input 
                                  type="text" 
                                  placeholder="mail" 
                                  className="preview-input"
                                  style={{ ...getValidationStyle(q), textAlign: 'center', paddingLeft: '1rem' }}
                                  value={emailPrefix}
                                  onChange={e => setEmailPrefix(e.target.value.replace(/@/g, ''))}
                                />
                              </div>
                              <select 
                                className="preview-select domain-select"
                                value={emailDomain}
                                onChange={e => setEmailDomain(e.target.value)}
                                style={{ textAlign: 'center' }}
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
                              className="preview-input textarea" 
                              style={{ ...getValidationStyle(q), maxWidth: '400px', margin: '0 auto', display: 'block' }}
                              rows={3}
                              value={previewValues[q.id] || ''}
                              onChange={e => setPreviewValues({...previewValues, [q.id]: e.target.value})}
                            ></textarea>
                          )}

                          {currentPreviewIndex < questions.length - 1 ? (
                            <button 
                              className="btn btn-primary w-100 mt-4" 
                              onClick={() => setCurrentPreviewIndex(prev => prev + 1)}
                              disabled={q.required && (!previewValues[q.id] && (q.type !== 'email' || !emailPrefix))}
                              style={{ padding: '1rem', fontSize: '1.1rem', borderRadius: '12px', boxShadow: '0 4px 15px rgba(31, 58, 77, 0.25)', opacity: (q.required && (!previewValues[q.id] && (q.type !== 'email' || !emailPrefix))) ? 0.6 : 1 }}
                            >
                              Siguiente
                            </button>
                          ) : (
                            <button 
                              className={`btn btn-primary w-100 mt-4 preview-submit ${isSubmitting ? 'loading' : ''} ${showSuccess ? 'success' : ''}`} 
                              type="button"
                              onClick={handlePreviewSubmit}
                              disabled={isSubmitting || showSuccess || (q.required && (!previewValues[q.id] && (q.type !== 'email' || !emailPrefix)))}
                              style={{ padding: '1rem', fontSize: '1.1rem', borderRadius: '12px', boxShadow: '0 4px 15px rgba(31, 58, 77, 0.25)', opacity: (isSubmitting || showSuccess || (q.required && (!previewValues[q.id] && (q.type !== 'email' || !emailPrefix)))) ? 0.6 : 1 }}
                            >
                              {isSubmitting ? 'Enviando...' : showSuccess ? <><Check size={18} /> ¡Formulario Enviado!</> : 'Enviar formulario'}
                            </button>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                ) : (
                  <div className="text-center text-secondary">No hay preguntas configuradas.</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

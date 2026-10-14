import { useState, useEffect } from 'react';
import { Plus, Trash2, GripVertical, Eye, Settings, HelpCircle, X } from 'lucide-react';
import { db } from '../../../lib/db';
import './Formulario.css';

import PageHeader from '../../../components/PageHeader/PageHeader';
import TripFormWizard, { type WizardAnswers } from '../../../components/TripFormWizard/TripFormWizard';
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
  const [previewKey, setPreviewKey] = useState(0);


  useEffect(() => {
    fetchQuestions();
  }, []);

  const fetchQuestions = async () => {
    setLoading(true);
    const { data, error } = await db.from('form_questions').select('*').order('id');
    
    if (error) {
      console.error('Error fetching questions:', error);
      setQuestions(BASE_QUESTIONS);
    } else if (data && data.length > 0) {
      setQuestions(data);
    } else {
      // If table is empty, initialize with base questions
      setQuestions(BASE_QUESTIONS);
      await db.from('form_questions').insert(BASE_QUESTIONS);
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

    const { data, error } = await db.from('form_questions').insert([newQ]).select();

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

    const { error } = await db.from('form_questions').delete().eq('id', id);
    if (!error) {
      setQuestions(questions.filter(q => q.id !== id));
    }
  };

  const toggleRequired = async (id: string) => {
    const q = questions.find(q => q.id === id);
    if (!q || q.is_base) return;

    const newRequired = !q.required;
    const { error } = await db.from('form_questions').update({ required: newRequired }).eq('id', id);
    
    if (!error) {
      setQuestions(questions.map(item => item.id === id ? { ...item, required: newRequired } : item));
    }
  };


  const handlePreviewSubmit = async ({ values, email }: WizardAnswers): Promise<boolean> => {
    const nameQ = questions.find(q => q.is_base && q.type === 'text');
    const phoneQ = questions.find(q => q.is_base && q.type === 'phone');
    const newSubmission = {
      name: values[nameQ?.id || 'base-1'] || 'Cliente Anónimo',
      email,
      phone: values[phoneQ?.id || 'base-3'] || 'Sin teléfono',
      status: 'nuevo',
      answers: questions.map(q => ({ questionText: q.text, answer: values[q.id] || '' }))
    };
    const { error } = await db.from('form_submissions').insert([newSubmission]);
    return !error;
  };

  return (
    <div className="formulario-page animate-fade-in">
      <PageHeader
        section="Formularios"
        title="Herramientas de Captación"
        subtitle="Comparte tu formulario personalizado y gestiona tus links estratégicos para atraer nuevos viajeros."
      />

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
                <button className="btn btn-outline btn-sm" onClick={() => { setPreviewKey(k => k + 1); setShowPreview(true); }} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
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
          <div className="modal-content-pro">
            <div className="modal-header-pro">
              <div className="header-left">
                <div className="header-icon"><Eye size={20} /></div>
                <div className="header-text">
                  <h3>Vista previa del cliente</h3>
                  <p>Así ve el formulario tu viajero</p>
                </div>
              </div>
              <button onClick={() => setShowPreview(false)} className="close-modal-btn" aria-label="Cerrar">
                <X size={18} />
              </button>
            </div>
            
            <div className="modal-body-pro preview-body">
              <p className="preview-note">
                <Eye size={15} /> Así lo ve tu viajero al reservar. Lo que envíes acá se guarda como una consulta real.
              </p>
              <TripFormWizard
                key={previewKey}
                questions={questions}
                onSubmit={handlePreviewSubmit}
                onDone={() => setShowPreview(false)}
                intro={{ title: 'Planifiquemos tu viaje', subtitle: 'Completá estos datos para comenzar a planificar tu aventura.' }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

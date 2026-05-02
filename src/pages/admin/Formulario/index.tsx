import { useState, useEffect } from 'react';
import { Plus, Trash2, GripVertical, Eye, Settings, HelpCircle, Mail, Phone, User, Check } from 'lucide-react';
import './Formulario.css';

export interface FormQuestion {
  id: string;
  text: string;
  type: 'text' | 'email' | 'phone' | 'textarea' | 'select';
  required: boolean;
  isBase?: boolean;
}

const BASE_QUESTIONS: FormQuestion[] = [
  { id: 'base-1', text: '¿Cómo te llamas?', type: 'text', required: true, isBase: true },
  { id: 'base-2', text: '¿Cuál es tu mail?', type: 'email', required: true, isBase: true },
  { id: 'base-3', text: '¿Cuál es tu número?', type: 'phone', required: true, isBase: true },
];

export default function FormularioPage() {
  const [questions, setQuestions] = useState<FormQuestion[]>(() => {
    const saved = localStorage.getItem('travelkit_form_questions');
    return saved ? JSON.parse(saved) : BASE_QUESTIONS;
  });

  const [newQuestionText, setNewQuestionText] = useState('');
  const [newQuestionRequired, setNewQuestionRequired] = useState(false);

  const [emailPrefix, setEmailPrefix] = useState('');
  const [emailDomain, setEmailDomain] = useState('@gmail.com');
  const [customDomain] = useState('');

  useEffect(() => {
    let current = [...questions];
    BASE_QUESTIONS.forEach(bq => {
      if (!current.find(q => q.id === bq.id)) {
        current.unshift(bq);
      }
    });
    setQuestions(current);
  }, []);

  useEffect(() => {
    localStorage.setItem('travelkit_form_questions', JSON.stringify(questions));
  }, [questions]);

  const handleAddQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuestionText.trim()) return;

    const newQ: FormQuestion = {
      id: Date.now().toString(),
      text: newQuestionText,
      type: 'textarea',
      required: newQuestionRequired,
    };

    setQuestions([...questions, newQ]);
    setNewQuestionText('');
    setNewQuestionRequired(false);
  };

  const handleDeleteQuestion = (id: string) => {
    setQuestions(questions.filter(q => q.id !== id || q.isBase));
  };

  const toggleRequired = (id: string) => {
    setQuestions(questions.map(q => {
      if (q.id === id && !q.isBase) {
        return { ...q, required: !q.required };
      }
      return q;
    }));
  };

  const [previewValues, setPreviewValues] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [triedToSubmit, setTriedToSubmit] = useState(false);

  const formatPhoneNumber = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    const limited = numbers.substring(0, 10);
    if (limited.length <= 2) return limited;
    if (limited.length <= 6) return `${limited.slice(0, 2)} ${limited.slice(2)}`;
    return `${limited.slice(0, 2)} ${limited.slice(2, 6)}-${limited.slice(6)}`;
  };

  const getValidationStyle = (q: FormQuestion) => {
    if (!triedToSubmit) return {};
    const isFilled = q.id === 'base-2' ? !!emailPrefix : !!previewValues[q.id];
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

  const handlePreviewSubmit = () => {
    setTriedToSubmit(true);
    const missingFields = questions.filter(q => {
      if (!q.required) return false;
      if (q.type === 'email') return !emailPrefix;
      return !previewValues[q.id];
    });

    if (missingFields.length > 0) return;

    setIsSubmitting(true);
    setTimeout(() => {
      const fullEmail = `${emailPrefix}${emailDomain === 'personalizado' ? '@' + customDomain : emailDomain}`;
      const currentSubmissions = JSON.parse(localStorage.getItem('travelkit_submissions') || '[]');
      const newSubmission = {
        id: Date.now().toString(),
        name: previewValues['base-1'] || 'Cliente Anónimo',
        email: fullEmail,
        phone: previewValues['base-3'] || 'Sin teléfono',
        date: new Date().toISOString(),
        status: 'nuevo',
        answers: questions.map(q => ({
          questionText: q.text,
          answer: q.id === 'base-1' ? (previewValues['base-1'] || '') :
                  q.id === 'base-2' ? fullEmail :
                  q.id === 'base-3' ? (previewValues['base-3'] || '') :
                  (previewValues[q.id] || '')
        }))
      };

      localStorage.setItem('travelkit_submissions', JSON.stringify([newSubmission, ...currentSubmissions]));
      window.dispatchEvent(new CustomEvent('travelkit_new_submission'));
      
      setIsSubmitting(false);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    }, 1500);
  };

  return (
    <div className="formulario-page animate-fade-in">
      <header className="page-header-centered">
        <h1>Herramientas de Captación</h1>
        <p>Comparte tu formulario personalizado y gestiona tus links estratégicos para atraer nuevos viajeros.</p>
      </header>

      <div className="builder-grid">
        <div className="builder-panel glass-card">
          <div className="card-header border-bottom">
            <h3><Settings size={20} className="text-primary" /> Constructor de Formulario</h3>
            <p className="text-secondary text-sm">Define qué le preguntarás a tus clientes antes de contratarte.</p>
          </div>
          
          <div className="card-body">
            <div className="questions-list">
              {questions.map((q, index) => (
                <div key={q.id} className={`question-item ${q.isBase ? 'base-question' : ''}`}>
                  <div className="drag-handle">
                    <GripVertical size={16} color="var(--color-tertiary)" />
                  </div>
                  <div className="question-content">
                    <div className="question-header">
                      <span className="question-number">{index + 1}</span>
                      <span className="question-text">{q.text}</span>
                      {q.required && <span className="required-badge">Obligatorio</span>}
                    </div>
                    {q.isBase && <span className="base-badge">Pregunta Fija</span>}
                  </div>
                  <div className="question-actions">
                    {!q.isBase && (
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

        <div className="preview-panel glass-card">
          <div className="card-header border-bottom">
            <h3><Eye size={20} className="text-primary" /> Vista Previa del Cliente</h3>
            <p className="text-secondary text-sm">Así verá el formulario tu cliente en la web.</p>
          </div>
          
          <div className="card-body preview-body">
            <div className="preview-form">
              <div className="preview-header text-center">
                <h3>Planifiquemos tu viaje</h3>
                <p>Completa estos datos para comenzar a planificar tu aventura.</p>
              </div>

              {questions.map((q) => (
                <div key={q.id} className="preview-field">
                  <label>
                    {q.text} {q.required && <span className="text-danger">*</span>}
                  </label>

                  {q.type === 'text' && (
                    <div className="input-with-icon">
                      <User size={16} />
                      <input 
                        type="text" 
                        placeholder="Tu respuesta..." 
                        className="preview-input" 
                        style={getValidationStyle(q)}
                        value={previewValues[q.id] || ''}
                        onChange={e => setPreviewValues({...previewValues, [q.id]: e.target.value})}
                      />
                    </div>
                  )}

                  {q.type === 'phone' && (
                    <div className="input-with-icon">
                      <Phone size={16} />
                      <input 
                        type="tel" 
                        placeholder="11 1234-5678" 
                        className="preview-input" 
                        style={getValidationStyle(q)}
                        value={previewValues[q.id] || ''}
                        onChange={e => setPreviewValues({...previewValues, [q.id]: formatPhoneNumber(e.target.value)})}
                      />
                    </div>
                  )}

                  {q.type === 'email' && (
                    <div className="email-input-group">
                      <div className="input-with-icon email-prefix">
                        <Mail size={16} />
                        <input 
                          type="text" 
                          placeholder="tu.nombre" 
                          className="preview-input"
                          style={getValidationStyle(q)}
                          value={emailPrefix}
                          onChange={e => setEmailPrefix(e.target.value.replace(/@/g, ''))}
                        />
                      </div>
                      <select 
                        className="preview-select domain-select"
                        value={emailDomain}
                        onChange={e => setEmailDomain(e.target.value)}
                      >
                        <option value="@gmail.com">@gmail.com</option>
                        <option value="@outlook.com">@outlook.com</option>
                        <option value="@hotmail.com">@hotmail.com</option>
                        <option value="@yahoo.com">@yahoo.com</option>
                        <option value="personalizado">Personalizado...</option>
                      </select>
                    </div>
                  )}

                  {q.type === 'textarea' && (
                    <textarea 
                      placeholder="Escribe aquí tus detalles..." 
                      className="preview-input textarea" 
                      style={getValidationStyle(q)}
                      rows={3}
                      value={previewValues[q.id] || ''}
                      onChange={e => setPreviewValues({...previewValues, [q.id]: e.target.value})}
                    ></textarea>
                  )}
                </div>
              ))}

              <button 
                className={`btn btn-primary w-100 mt-4 preview-submit ${isSubmitting ? 'loading' : ''} ${showSuccess ? 'success' : ''}`} 
                type="button"
                onClick={handlePreviewSubmit}
                disabled={isSubmitting || showSuccess}
              >
                {isSubmitting ? 'Enviando...' : showSuccess ? <><Check size={18} /> ¡Formulario Enviado!</> : 'Enviar formulario'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

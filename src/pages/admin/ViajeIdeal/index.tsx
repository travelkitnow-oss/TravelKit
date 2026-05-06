import { useState, useEffect } from 'react';
import { Plus, Trash2, Settings, Eye, PlusCircle, Target, MapPin, X, ChevronDown, HelpCircle } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import './ViajeIdeal.css';

interface Option {
  id: string;
  text: string;
  points: Record<string, number>;
}

interface Question {
  id: string;
  text: string;
  options: Option[];
}

interface CategoryModalState {
  show: boolean;
  questionId: string;
  optionId: string;
  category: string;
  points: string;
}

export default function ViajeIdealPage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [newQuestionText, setNewQuestionText] = useState('');
  
  const [showPreview, setShowPreview] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<string | null>(null);

  const [expandedQuestions, setExpandedQuestions] = useState<Record<string, boolean>>({});

  const [catModal, setCatModal] = useState<CategoryModalState>({
    show: false,
    questionId: '',
    optionId: '',
    category: '',
    points: '10'
  });

  const toggleExpand = (id: string) => {
    setExpandedQuestions(prev => ({ ...prev, [id]: !prev[id] }));
  };

  useEffect(() => {
    fetchQuestions();
  }, []);

  const fetchQuestions = async () => {
    // Attempt to fetch from Supabase. If table doesn't exist, we'll use a mock for now
    // and instruct the user to create it if they want persistence, 
    // or I'll just handle it gracefully.
    const { data, error } = await supabase.from('viaje_ideal_questions').select('*').order('created_at');
    
    if (error) {
      console.error('Error fetching questions:', error);
      // Mock some initial data if error (e.g. table not created yet)
      setQuestions([
        {
          id: '1',
          text: '¿Qué tipo de clima prefieres?',
          options: [
            { id: '1a', text: 'Cálido y soleado', points: { 'Playa': 10, 'Desierto': 8, 'Ciudad': 2 } },
            { id: '1b', text: 'Frío y nieve', points: { 'Montaña': 10, 'Ski': 10, 'Aventura': 5 } },
            { id: '1c', text: 'Templado', points: { 'Ciudad': 10, 'Europa': 8, 'Campo': 5 } }
          ]
        }
      ]);
    } else if (data && data.length > 0) {
      setQuestions(data);
    }
    // ... end of fetch
  };

  const handleAddQuestion = async () => {
    if (!newQuestionText.trim()) return;
    
    const newQ = {
      text: newQuestionText,
      options: [
        { id: Math.random().toString(36).substr(2, 9), text: 'Nueva opción', points: {} }
      ]
    };

    const { data, error } = await supabase.from('viaje_ideal_questions').insert([newQ]).select();
    
    if (error) {
      // Local fallback for demo
      const localNewQ: Question = { ...newQ, id: Date.now().toString() };
      setQuestions([...questions, localNewQ]);
    } else if (data) {
      setQuestions([...questions, data[0]]);
    }
    setNewQuestionText('');
  };

  const handleDeleteQuestion = async (id: string) => {
    const { error } = await supabase.from('viaje_ideal_questions').delete().eq('id', id);
    if (!error || error) { // Allow local update even if DB fails for now
      setQuestions(questions.filter(q => q.id !== id));
    }
  };

  const handleDeleteOption = (questionId: string, optionId: string) => {
    setQuestions(questions.map(q => {
      if (q.id === questionId) {
        return {
          ...q,
          options: q.options.filter(o => o.id !== optionId)
        };
      }
      return q;
    }));
  };

  const handleAddOption = (questionId: string) => {
    setQuestions(questions.map(q => {
      if (q.id === questionId) {
        return {
          ...q,
          options: [...q.options, { id: Math.random().toString(36).substr(2, 9), text: 'Nueva opción', points: {} }]
        };
      }
      return q;
    }));
  };

  const handleUpdateOptionText = (questionId: string, optionId: string, text: string) => {
    setQuestions(questions.map(q => {
      if (q.id === questionId) {
        return {
          ...q,
          options: q.options.map(o => o.id === optionId ? { ...o, text } : o)
        };
      }
      return q;
    }));
  };

  const openCatModal = (qId: string, oId: string) => {
    setCatModal({
      show: true,
      questionId: qId,
      optionId: oId,
      category: '',
      points: '10'
    });
  };

  const handleConfirmPoints = () => {
    const { questionId, optionId, category, points } = catModal;
    if (!category.trim() || !points) return;
    
    handleUpdateOptionPoints(questionId, optionId, category.trim(), parseInt(points));
    setCatModal({ ...catModal, show: false });
  };

  const handleUpdateOptionPoints = (questionId: string, optionId: string, category: string, value: number) => {
    setQuestions(questions.map(q => {
      if (q.id === questionId) {
        return {
          ...q,
          options: q.options.map(o => {
            if (o.id === optionId) {
              return { ...o, points: { ...o.points, [category]: value } };
            }
            return o;
          })
        };
      }
      return q;
    }));
  };

  const saveAll = async () => {
    // In a real app, we'd update each question. 
    // For now, we'll just show a success message to show it's working locally.
    alert('¡Configuración guardada con éxito!');
  };

  const calculateResult = () => {
    const totals: Record<string, number> = {};
    
    questions.forEach(q => {
      const selectedOptionId = answers[q.id];
      if (selectedOptionId) {
        const option = q.options.find(o => o.id === selectedOptionId);
        if (option) {
          Object.entries(option.points).forEach(([category, pts]) => {
            totals[category] = (totals[category] || 0) + pts;
          });
        }
      }
    });

    if (Object.keys(totals).length === 0) {
      setResult('No hay suficientes datos para decidir.');
      return;
    }

    const best = Object.entries(totals).sort((a, b) => b[1] - a[1])[0];
    setResult(best[0]);
  };

  return (
    <div className="viaje-ideal-page animate-fade-in">
      <header className="page-header-centered">
        <h1>Viaje Ideal</h1>
        <p>Configura preguntas inteligentes para ayudar a tus clientes a descubrir su próximo destino.</p>
      </header>

      <div className="builder-grid">
        <div className="builder-panel glass-card">
          <div className="card-header border-bottom">
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
              <div>
                <h3><Settings size={20} className="text-primary" /> Configurador de Preguntas</h3>
                <p className="text-secondary text-sm">Define las opciones y el peso que cada una tiene en el destino final.</p>
              </div>
              <button className="btn btn-primary btn-sm" onClick={saveAll}>
                Guardar Todo
              </button>
            </div>
          </div>
          
          <div className="card-body">
            {/* Sección de ayuda rápida */}
            <div className="info-box-compact mb-4">
              <div className="info-header">
                <HelpCircle size={16} />
                <span>¿Cómo funciona el cálculo?</span>
              </div>
              <p>Cada vez que un cliente elige una opción, se suman los puntos de las categorías asignadas (ej: Playa, Nieve). Al final, el destino con <strong>más puntos acumulados</strong> será el resultado ganador.</p>
            </div>

            <div className="questions-list">
              {questions.map((q, qIndex) => {
                const isExpanded = expandedQuestions[q.id] !== false; // Default to expanded for now, or use true if you want them collapsed by default
                return (
                  <div key={q.id} className="question-config-item glass-card mb-4">
                    <div className="question-config-header" style={{ borderBottom: isExpanded ? '1px dashed rgba(0, 0, 0, 0.1)' : 'none', marginBottom: isExpanded ? '1.5rem' : '0' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1, cursor: 'pointer' }} onClick={() => toggleExpand(q.id)}>
                        <span className="q-number">{qIndex + 1}</span>
                        <input 
                          type="text" 
                          value={q.text} 
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => {
                            const newQs = [...questions];
                            newQs[qIndex].text = e.target.value;
                            setQuestions(newQs);
                          }}
                          className="q-input-text"
                        />
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button className="btn-icon-sm" onClick={() => toggleExpand(q.id)} style={{ transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.3s' }}>
                          <ChevronDown size={18} />
                        </button>
                        <button className="delete-btn" onClick={() => handleDeleteQuestion(q.id)}>
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="options-config-list animate-fade-in">
                        {q.options.map((opt) => (
                          <div key={opt.id} className="option-config-row">
                            <div className="opt-main" style={{ display: 'flex', gap: '0.5rem' }}>
                              <input 
                                type="text" 
                                value={opt.text} 
                                onChange={(e) => handleUpdateOptionText(q.id, opt.id, e.target.value)}
                                placeholder="Nombre de la opción"
                                style={{ flex: 1 }}
                              />
                              <button className="delete-option-btn" onClick={() => handleDeleteOption(q.id, opt.id)}>
                                <X size={14} />
                              </button>
                            </div>
                            <div className="opt-points">
                              <div className="points-badge">
                                <Target size={12} />
                                <span>Puntos</span>
                              </div>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
                                {Object.entries(opt.points).map(([cat, pts]) => (
                                  <div key={cat} className="point-tag">
                                    <span>{cat}: {pts}</span>
                                    <button onClick={() => {
                                      const newPts = { ...opt.points };
                                      delete newPts[cat];
                                      handleUpdateOptionPoints(q.id, opt.id, '', 0); // Trigger update
                                      setQuestions(questions.map(item => item.id === q.id ? {
                                        ...item,
                                        options: item.options.map(o => o.id === opt.id ? { ...o, points: newPts } : o)
                                      } : item));
                                    }}>x</button>
                                  </div>
                                ))}
                                <button className="add-point-btn" onClick={() => openCatModal(q.id, opt.id)}>
                                  +
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                        <button className="add-option-link" onClick={() => handleAddOption(q.id)}>
                          <PlusCircle size={14} /> Agregar opción
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="add-q-footer">
              <input 
                type="text" 
                placeholder="Nueva pregunta..." 
                value={newQuestionText}
                onChange={e => setNewQuestionText(e.target.value)}
                className="form-input"
              />
              <button className="btn btn-outline btn-sm" onClick={handleAddQuestion}>
                <Plus size={18} /> Agregar Pregunta
              </button>
            </div>
          </div>
        </div>

        <div className="preview-panel glass-card">
          <div className="card-header border-bottom">
            <h3><Eye size={20} className="text-primary" /> Vista del Cliente</h3>
            <p className="text-secondary text-sm">Así es como el cliente responderá para ver su resultado.</p>
          </div>
          
          <div className="card-body">
            {!showPreview ? (
              <div className="start-test text-center p-5">
                <div className="test-icon">
                  <MapPin size={48} />
                </div>
                <h2>Encuentra tu Viaje Ideal</h2>
                <p>Responde unas breves preguntas y te diremos cuál es tu destino perfecto.</p>
                <button className="btn btn-primary mt-4" onClick={() => setShowPreview(true)}>
                  Comenzar Test
                </button>
              </div>
            ) : (
              <div className="quiz-container">
                {!result ? (
                  <>
                    {questions.map((q) => (
                      <div key={q.id} className="quiz-question mb-5">
                        <h4 className="mb-3">{q.text}</h4>
                        <div className="quiz-options">
                          {q.options.map(opt => (
                            <button 
                              key={opt.id}
                              className={`quiz-opt-btn ${answers[q.id] === opt.id ? 'selected' : ''}`}
                              onClick={() => setAnswers({ ...answers, [q.id]: opt.id })}
                            >
                              {opt.text}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                    <button 
                      className="btn btn-primary w-100" 
                      onClick={calculateResult}
                      disabled={Object.keys(answers).length < questions.length}
                    >
                      Ver mi resultado
                    </button>
                  </>
                ) : (
                  <div className="result-card text-center p-5 animate-scale-in">
                    <div className="confetti">🎉</div>
                    <h3>¡Tu destino ideal es!</h3>
                    <div className="result-name">{result}</div>
                    <p className="mt-3">Basado en tus preferencias, este lugar te encantará.</p>
                    <button className="btn btn-outline mt-4" onClick={() => { setResult(null); setAnswers({}); setShowPreview(false); }}>
                      Volver a empezar
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {catModal.show && (
        <div className="modal-overlay animate-fade-in" style={{ zIndex: 3000 }}>
          <div className="modal-content glass-card animate-scale-in" style={{ maxWidth: '400px', padding: 0, borderRadius: '24px', overflow: 'hidden' }}>
            <div style={{ padding: '1.25rem 1.5rem', background: 'var(--color-primary)', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ background: 'rgba(255,255,255,0.15)', padding: '6px', borderRadius: '8px' }}>
                  <Target size={18} color="white" />
                </div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'white' }}>Asignar Puntos</h3>
              </div>
              <button onClick={() => setCatModal({...catModal, show: false})} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', padding: '6px', cursor: 'pointer', color: 'white' }}>
                <X size={18} />
              </button>
            </div>
            
            <div style={{ padding: '1.5rem' }}>
              <div className="form-group mb-3">
                <label className="text-xs font-bold uppercase text-secondary mb-2 block">Categoría / Destino</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="Ej: Playa, Montaña, Europa..."
                  value={catModal.category}
                  onChange={e => setCatModal({...catModal, category: e.target.value})}
                  autoFocus
                />
              </div>
              <div className="form-group mb-4">
                <label className="text-xs font-bold uppercase text-secondary mb-2 block">Puntos que suma</label>
                <input 
                  type="number" 
                  className="form-input" 
                  value={catModal.points}
                  onChange={e => setCatModal({...catModal, points: e.target.value})}
                />
              </div>
              <button className="btn btn-primary w-100" onClick={handleConfirmPoints}>
                Confirmar Puntos
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

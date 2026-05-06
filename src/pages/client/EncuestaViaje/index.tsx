import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { MapPin, CheckCircle2 } from 'lucide-react';
import './EncuestaViaje.css';

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

export default function EncuestaViajePage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<string | null>(null);

  useEffect(() => {
    fetchQuestions();
  }, []);

  const fetchQuestions = async () => {
    const { data, error } = await supabase.from('viaje_ideal_questions').select('*').order('created_at');
    
    if (error || !data || data.length === 0) {
      // Fallback si no hay tabla o está vacía (como en el admin)
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
    } else {
      setQuestions(data);
    }
  };

  const calculateResult = () => {
    const totals: Record<string, number> = {};
    
    questions.forEach(q => {
      const selectedOptionId = answers[q.id];
      if (selectedOptionId) {
        const option = q.options.find(o => o.id === selectedOptionId);
        if (option && option.points) {
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
    <div className="encuesta-cliente-page animate-fade-in">
      <header className="page-header-centered" style={{ marginBottom: '3rem' }}>
        <h1 className="display-title">Encuesta de Viaje</h1>
        <p className="subtitle">Descubre tu destino ideal respondiendo estas breves preguntas.</p>
      </header>

      <div className="encuesta-card">
        {!showPreview ? (
          <div className="start-test text-center p-5">
            <div style={{ display: 'inline-flex', background: '#f0f7ff', padding: '1.5rem', borderRadius: '50%', marginBottom: '1.5rem', color: 'var(--color-primary)' }}>
              <MapPin size={48} />
            </div>
            <h2 style={{ fontSize: '2rem', color: 'var(--color-primary)', fontWeight: 900, marginBottom: '1rem' }}>Encuentra tu Viaje Ideal</h2>
            <p style={{ color: '#64748b', fontSize: '1.1rem', maxWidth: '400px', margin: '0 auto 2rem' }}>
              Nuestro algoritmo analizará tus preferencias para sugerirte el lugar perfecto para tus próximas vacaciones.
            </p>
            <button className="btn btn-primary" style={{ padding: '1rem 3rem', fontSize: '1.1rem', borderRadius: '100px' }} onClick={() => setShowPreview(true)}>
              Comenzar Encuesta
            </button>
          </div>
        ) : (
          <div className="quiz-container animate-fade-in">
            {!result ? (
              <>
                {questions.map((q) => (
                  <div key={q.id} className="quiz-question">
                    <h4>{q.text}</h4>
                    <div className="quiz-options">
                      {q.options.map(opt => (
                        <button 
                          key={opt.id}
                          className={`quiz-opt-btn ${answers[q.id] === opt.id ? 'selected' : ''}`}
                          onClick={() => setAnswers({ ...answers, [q.id]: opt.id })}
                        >
                          <span>{opt.text}</span>
                          {answers[q.id] === opt.id && <CheckCircle2 size={20} />}
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
                  Ver mi resultado ideal
                </button>
              </>
            ) : (
              <div className="result-card animate-scale-in">
                <div className="confetti">🎉</div>
                <h3 style={{ fontSize: '1.5rem', color: '#64748b' }}>¡Tu destino perfecto es!</h3>
                <div className="result-name">{result}</div>
                <p style={{ color: '#64748b', fontSize: '1.1rem', marginBottom: '2.5rem' }}>
                  Basado en tus preferencias exclusivas, este lugar tiene todo lo que buscas. ¡Comunícate con tu asesor para empezar a planearlo!
                </p>
                <button 
                  className="btn btn-outline" 
                  style={{ borderRadius: '100px', padding: '0.75rem 2rem' }}
                  onClick={() => { setResult(null); setAnswers({}); setShowPreview(false); }}
                >
                  Volver a empezar
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

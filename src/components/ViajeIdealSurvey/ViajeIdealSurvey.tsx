import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ArrowLeft, ArrowRight, Check, Compass, RotateCcw, Sparkles } from 'lucide-react';
import {
  computeResult,
  isAnswered,
  questionType,
  summaryChips,
  toStoredAnswers,
  type VIAnswers,
  type VIQuestion,
  type VIResult,
} from '../../lib/viajeIdeal';
import './ViajeIdealSurvey.css';

interface ViajeIdealSurveyProps {
  questions: VIQuestion[];
  /** Guarda el resultado; devuelve true si salió bien. En la vista previa del admin no guarda. */
  onComplete?: (answers: VIAnswers, result: VIResult) => Promise<boolean>;
  /** Acción principal de la pantalla final (por ejemplo, ir a agendar la sesión) */
  cta?: ReactNode;
}

/** Encuesta de Viaje Ideal paso a paso, con tarjetas. La usan el portal del cliente y la vista previa del admin. */
export default function ViajeIdealSurvey({ questions, onComplete, cta }: ViajeIdealSurveyProps) {
  const [started, setStarted] = useState(false);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<VIAnswers>({});
  const [result, setResult] = useState<VIResult | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const advanceTimer = useRef<number | null>(null);

  useEffect(() => () => { if (advanceTimer.current) window.clearTimeout(advanceTimer.current); }, []);

  const total = questions.length;
  const q = questions[step];

  if (!total) {
    return <p className="vis-empty">Todavía no hay preguntas cargadas para esta encuesta.</p>;
  }

  // ─── Portada ───
  if (!started) {
    return (
      <div className="vis-intro">
        <div className="vis-intro-icon"><Compass size={30} /></div>
        <h2>Descubrí tu viaje ideal</h2>
        <p>
          Respondé {total} preguntas rápidas sobre cómo te gusta viajar. Con tus respuestas armamos tu perfil
          viajero y llegamos a la primera sesión con propuestas pensadas para vos.
        </p>
        <span className="vis-intro-time">Lleva unos 3 minutos</span>
        <button type="button" className="btn btn-accent btn-lg" onClick={() => setStarted(true)}>
          Empezar <ArrowRight size={18} />
        </button>
      </div>
    );
  }

  // ─── Resultado ───
  if (result) {
    const chips = summaryChips(toStoredAnswers(questions, answers));
    return (
      <div className="vis-result animate-scale-in">
        <span className="vis-result-eyebrow"><Sparkles size={14} /> Tu perfil viajero</span>
        <h2>{result.profile?.name || 'Viajero curioso'}</h2>
        <p className="vis-result-desc">
          {result.profile?.description || 'Tenés un estilo abierto a todo tipo de experiencias.'}
        </p>
        {result.secondary && (
          <p className="vis-result-secondary">
            Con un toque de <strong>{result.secondary.name.toLowerCase()}</strong>.
          </p>
        )}

        {chips.length > 0 && (
          <dl className="vis-chips">
            {chips.slice(0, 6).map((c) => (
              <div key={c.label} className="vis-chip">
                <dt>{c.label}</dt>
                <dd>{c.value}</dd>
              </div>
            ))}
          </dl>
        )}

        {saveError && <p className="vis-error" role="alert">{saveError}</p>}
        <p className="vis-result-next">
          Ya tenemos tus respuestas. En la sesión inicial te vamos a proponer destinos que encajan con tu perfil.
        </p>
        <div className="vis-result-actions">
          {cta}
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => { setResult(null); setAnswers({}); setStep(0); setStarted(false); }}
          >
            <RotateCcw size={16} /> Volver a empezar
          </button>
        </div>
      </div>
    );
  }

  // ─── Pregunta ───
  const type = questionType(q);
  const chosen = Array.isArray(answers[q.id]) ? (answers[q.id] as string[]) : [];
  const max = type === 'multi' ? q.max_select || q.options.length : 1;
  const required = q.required !== false;
  const canContinue = !required || isAnswered(q, answers);
  const isLast = step === total - 1;

  const finish = async () => {
    const res = computeResult(questions, answers);
    if (onComplete) {
      setSaving(true);
      setSaveError('');
      const ok = await onComplete(answers, res);
      setSaving(false);
      if (!ok) {
        setSaveError('No pudimos guardar tus respuestas. Intentá de nuevo en unos minutos.');
        return;
      }
    }
    setResult(res);
  };

  const next = () => {
    if (!canContinue) return;
    if (isLast) finish();
    else setStep((s) => s + 1);
  };

  const toggle = (optionId: string) => {
    if (type === 'single') {
      setAnswers((a) => ({ ...a, [q.id]: [optionId] }));
      // En opción única, avanza solo después de marcar
      if (advanceTimer.current) window.clearTimeout(advanceTimer.current);
      if (!isLast) advanceTimer.current = window.setTimeout(() => setStep((s) => s + 1), 280);
      return;
    }
    setAnswers((a) => {
      const current = Array.isArray(a[q.id]) ? (a[q.id] as string[]) : [];
      if (current.includes(optionId)) return { ...a, [q.id]: current.filter((x) => x !== optionId) };
      if (current.length >= max) return { ...a, [q.id]: [...current.slice(1), optionId] }; // reemplaza la más vieja
      return { ...a, [q.id]: [...current, optionId] };
    });
  };

  return (
    <div className="vis">
      <div className="vis-progress" aria-label={`Pregunta ${step + 1} de ${total}`}>
        <div className="vis-progress-head">
          <span>Pregunta {step + 1} de {total}</span>
          <span>{Math.round((step / total) * 100)}%</span>
        </div>
        <div className="vis-progress-bar"><span style={{ width: `${((step + 1) / total) * 100}%` }} /></div>
      </div>

      <div className="vis-question" key={q.id}>
        <h3>{q.text}</h3>
        {(q.helper || type === 'multi') && (
          <p className="vis-helper">{q.helper || (max < q.options.length ? `Elegí hasta ${max}.` : 'Podés elegir varias.')}</p>
        )}

        {type === 'text' ? (
          <textarea
            className="vis-textarea"
            rows={5}
            autoFocus
            placeholder="Escribí lo que quieras contarnos..."
            value={typeof answers[q.id] === 'string' ? (answers[q.id] as string) : ''}
            onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
          />
        ) : (
          <div className={`vis-options ${q.options.length > 4 ? 'two-cols' : ''}`} role={type === 'multi' ? 'group' : 'radiogroup'}>
            {q.options.map((opt) => {
              const selected = chosen.includes(opt.id);
              return (
                <button
                  key={opt.id}
                  type="button"
                  role={type === 'multi' ? 'checkbox' : 'radio'}
                  aria-checked={selected}
                  className={`vis-option ${selected ? 'selected' : ''}`}
                  onClick={() => toggle(opt.id)}
                >
                  <span className={`vis-check ${type === 'multi' ? 'square' : ''}`}>{selected && <Check size={13} strokeWidth={3} />}</span>
                  <span className="vis-option-text">{opt.text}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {saveError && <p className="vis-error" role="alert">{saveError}</p>}

      <div className="vis-actions">
        <button
          type="button"
          className="btn btn-outline"
          onClick={() => (step === 0 ? setStarted(false) : setStep((s) => s - 1))}
          disabled={saving}
        >
          <ArrowLeft size={16} /> {step === 0 ? 'Inicio' : 'Anterior'}
        </button>
        <button type="button" className="btn btn-primary vis-next" onClick={next} disabled={!canContinue || saving}>
          {saving ? 'Guardando…' : isLast ? <>Ver mi perfil <Sparkles size={16} /></> : !required && !isAnswered(q, answers) ? <>Saltar <ArrowRight size={16} /></> : <>Siguiente <ArrowRight size={16} /></>}
        </button>
      </div>
    </div>
  );
}

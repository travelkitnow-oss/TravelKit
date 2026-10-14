import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { ArrowLeft, ArrowRight, Check, Mail, MessageSquareText, Phone, User } from 'lucide-react';
import './TripFormWizard.css';

export interface WizardQuestion {
  id: string;
  text: string;
  type: 'text' | 'email' | 'phone' | 'textarea' | 'select' | string;
  required: boolean;
  is_base?: boolean;
}

export interface WizardAnswers {
  /** Respuestas por id de pregunta; la de tipo email ya viene armada con el dominio */
  values: Record<string, string>;
  email: string;
}

interface TripFormWizardProps {
  questions: WizardQuestion[];
  /** Guarda las respuestas; devuelve true si salió bien */
  onSubmit: (answers: WizardAnswers) => Promise<boolean>;
  /** Se llama desde la pantalla de éxito */
  onDone: () => void;
  /** Encabezado opcional dentro del formulario (la vista previa del admin lo usa para imitar al cliente) */
  intro?: { title: string; subtitle?: ReactNode };
  /** Texto de la pantalla final */
  successText?: ReactNode;
}

const EMAIL_DOMAINS = ['@gmail.com', '@hotmail.com', '@outlook.com', '@yahoo.com'];

const formatPhone = (value: string) => {
  const n = value.replace(/\D/g, '').substring(0, 10);
  if (n.length <= 2) return n;
  if (n.length <= 6) return `${n.slice(0, 2)} ${n.slice(2)}`;
  return `${n.slice(0, 2)} ${n.slice(2, 6)}-${n.slice(6)}`;
};

/**
 * Formulario paso a paso para pedir la sesión inicial.
 * Lo usan la reserva pública (Calendar) y la vista previa del admin (Formulario),
 * así los dos se ven y se comportan igual.
 */
export default function TripFormWizard({ questions, onSubmit, onDone, intro, successText }: TripFormWizardProps) {
  const [step, setStep] = useState(0);
  const [values, setValues] = useState<Record<string, string>>({});
  const [emailUser, setEmailUser] = useState('');
  const [emailDomain, setEmailDomain] = useState(EMAIL_DOMAINS[0]);
  const [showError, setShowError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [done, setDone] = useState(false);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);

  const total = questions.length;
  const q = questions[step];
  const isLast = step === total - 1;

  // Llevar el foco al campo de cada paso
  useEffect(() => {
    setShowError(false);
    const t = window.setTimeout(() => inputRef.current?.focus(), 60);
    return () => window.clearTimeout(t);
  }, [step]);

  if (!total) {
    return <p className="tkw-empty">Todavía no hay preguntas configuradas.</p>;
  }

  if (done) {
    return (
      <div className="tkw-success animate-scale-in">
        <div className="tkw-success-icon"><Check size={28} strokeWidth={2.5} /></div>
        <h3>¡Solicitud enviada!</h3>
        <p>{successText || 'Gracias por completar tus datos. Te vamos a contactar a la brevedad para confirmar la sesión.'}</p>
        <button type="button" className="btn btn-primary btn-lg" onClick={onDone}>Entendido</button>
      </div>
    );
  }

  const isFilled = (question: WizardQuestion) =>
    question.type === 'email' ? emailUser.trim().length > 0 : (values[question.id] || '').trim().length > 0;
  const invalid = q.required && !isFilled(q);

  const goNext = async () => {
    if (invalid) {
      setShowError(true);
      inputRef.current?.focus();
      return;
    }
    if (!isLast) {
      setStep((s) => s + 1);
      return;
    }
    setSubmitting(true);
    setSubmitError('');
    const email = emailUser ? `${emailUser}${emailDomain}` : '';
    const finalValues = { ...values };
    questions.filter((x) => x.type === 'email').forEach((x) => { finalValues[x.id] = email; });
    const ok = await onSubmit({ values: finalValues, email });
    setSubmitting(false);
    if (ok) setDone(true);
    else setSubmitError('No pudimos enviar el formulario. Revisá tu conexión e intentá de nuevo.');
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !(e.target instanceof HTMLTextAreaElement)) {
      e.preventDefault();
      goNext();
    }
  };

  const setValue = (value: string) => {
    setValues((v) => ({ ...v, [q.id]: value }));
    if (showError) setShowError(false);
  };

  const fieldState = showError && invalid ? 'is-error' : isFilled(q) ? 'is-filled' : '';
  const Icon = q.type === 'phone' ? Phone : q.type === 'email' ? Mail : q.type === 'textarea' ? MessageSquareText : User;

  return (
    <div className="tkw" onKeyDown={onKeyDown}>
      {intro && (
        <div className="tkw-intro">
          <h3>{intro.title}</h3>
          {intro.subtitle && <p>{intro.subtitle}</p>}
        </div>
      )}

      {/* Progreso: un segmento por pregunta */}
      <div className="tkw-progress" aria-label={`Paso ${step + 1} de ${total}`}>
        <div className="tkw-progress-head">
          <span>Paso {step + 1} de {total}</span>
          <span>{Math.round(((step + 1) / total) * 100)}%</span>
        </div>
        <div className="tkw-segments">
          {questions.map((x, i) => (
            <span key={x.id} className={i < step ? 'done' : i === step ? 'current' : ''} />
          ))}
        </div>
      </div>

      <div className="tkw-question" key={q.id}>
        <label className="tkw-label" htmlFor={`tkw-${q.id}`}>
          {q.text}
          <span className={`tkw-tag ${q.required ? 'required' : ''}`}>{q.required ? 'Obligatorio' : 'Opcional'}</span>
        </label>

        {q.type === 'email' ? (
          <div className={`tkw-email ${fieldState}`}>
            <div className="tkw-field">
              <Mail size={18} className="tkw-icon" />
              <input
                id={`tkw-${q.id}`}
                ref={(el) => { inputRef.current = el; }}
                type="text"
                inputMode="email"
                autoComplete="username"
                placeholder="tu.nombre"
                value={emailUser}
                onChange={(e) => { setEmailUser(e.target.value.replace(/@/g, '').trim()); if (showError) setShowError(false); }}
              />
            </div>
            <select value={emailDomain} onChange={(e) => setEmailDomain(e.target.value)} aria-label="Dominio del correo">
              {EMAIL_DOMAINS.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
        ) : q.type === 'textarea' ? (
          <div className={`tkw-field tkw-field-area ${fieldState}`}>
            <textarea
              id={`tkw-${q.id}`}
              ref={(el) => { inputRef.current = el; }}
              rows={4}
              placeholder="Contanos con tus palabras..."
              value={values[q.id] || ''}
              onChange={(e) => setValue(e.target.value)}
            />
          </div>
        ) : (
          <div className={`tkw-field ${fieldState}`}>
            <Icon size={18} className="tkw-icon" />
            <input
              id={`tkw-${q.id}`}
              ref={(el) => { inputRef.current = el; }}
              type={q.type === 'phone' ? 'tel' : 'text'}
              inputMode={q.type === 'phone' ? 'tel' : undefined}
              autoComplete={q.type === 'phone' ? 'tel' : q.is_base ? 'name' : 'off'}
              placeholder={q.type === 'phone' ? '11 1234-5678' : 'Tu respuesta'}
              value={values[q.id] || ''}
              onChange={(e) => setValue(q.type === 'phone' ? formatPhone(e.target.value) : e.target.value)}
            />
            {isFilled(q) && <Check size={18} className="tkw-ok" />}
          </div>
        )}

        <p className={`tkw-hint ${showError && invalid ? 'error' : ''}`} role={showError && invalid ? 'alert' : undefined}>
          {showError && invalid
            ? 'Completá este dato para continuar.'
            : q.type === 'textarea' ? 'Podés escribir todo lo que quieras.' : 'Presioná Enter para continuar.'}
        </p>
      </div>

      {submitError && <p className="tkw-submit-error" role="alert">{submitError}</p>}

      <div className="tkw-actions">
        {step > 0 ? (
          <button type="button" className="btn btn-outline" onClick={() => setStep((s) => s - 1)} disabled={submitting}>
            <ArrowLeft size={16} /> Anterior
          </button>
        ) : <span />}
        <button type="button" className="btn btn-primary tkw-next" onClick={goNext} disabled={submitting}>
          {submitting ? 'Enviando…' : isLast ? <>Enviar solicitud <Check size={16} /></> : <>Siguiente <ArrowRight size={16} /></>}
        </button>
      </div>
    </div>
  );
}

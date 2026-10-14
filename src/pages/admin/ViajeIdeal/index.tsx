import { useEffect, useState } from 'react';
import {
  ArrowDown, ArrowUp, Check, ChevronDown, Eye, ListChecks, Plus, Save, Sparkles, Trash2, Type, X, CircleDot, CheckSquare,
} from 'lucide-react';
import { db } from '../../../lib/db';
import { DEFAULT_QUESTIONS, PROFILES, questionType, type QuestionType, type VIOption, type VIQuestion } from '../../../lib/viajeIdeal';
import PageHeader from '../../../components/PageHeader/PageHeader';
import ConfirmationModal from '../../../components/ConfirmationModal/ConfirmationModal';
import ViajeIdealSurvey from '../../../components/ViajeIdealSurvey/ViajeIdealSurvey';
import './ViajeIdeal.css';

const TYPE_LABELS: Record<QuestionType, { label: string; icon: typeof CircleDot }> = {
  single: { label: 'Opción única', icon: CircleDot },
  multi: { label: 'Opción múltiple', icon: CheckSquare },
  text: { label: 'Texto libre', icon: Type },
};

const newOptionId = () => Math.random().toString(36).slice(2, 10);

export default function ViajeIdealPage() {
  const [questions, setQuestions] = useState<VIQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [dirty, setDirty] = useState<Set<string>>(new Set());
  const [savingId, setSavingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [previewKey, setPreviewKey] = useState(0);
  const [seeding, setSeeding] = useState(false);
  const [newPoints, setNewPoints] = useState<Record<string, { profile: string; points: string }>>({});

  useEffect(() => {
    fetchQuestions();
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 3000);
    return () => window.clearTimeout(t);
  }, [toast]);

  const fetchQuestions = async () => {
    setLoading(true);
    const { data, error } = await db
      .from('viaje_ideal_questions')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });
    if (error) setToast({ type: 'error', text: 'No se pudieron cargar las preguntas.' });
    setQuestions((data || []) as VIQuestion[]);
    setDirty(new Set());
    setLoading(false);
  };

  // ─── Edición local (se guarda con "Guardar cambios") ───
  const patchQuestion = (qid: string, patch: Partial<VIQuestion>) => {
    setQuestions((qs) => qs.map((q) => (q.id === qid ? { ...q, ...patch } : q)));
    setDirty((d) => new Set(d).add(qid));
  };

  const patchOption = (qid: string, oid: string, patch: Partial<VIOption>) => {
    const q = questions.find((x) => x.id === qid);
    if (!q) return;
    patchQuestion(qid, { options: q.options.map((o) => (o.id === oid ? { ...o, ...patch } : o)) });
  };

  const addOption = (qid: string) => {
    const q = questions.find((x) => x.id === qid);
    if (!q) return;
    patchQuestion(qid, { options: [...q.options, { id: newOptionId(), text: '', points: {} }] });
  };

  const removeOption = (qid: string, oid: string) => {
    const q = questions.find((x) => x.id === qid);
    if (!q) return;
    patchQuestion(qid, { options: q.options.filter((o) => o.id !== oid) });
  };

  const addPoints = (qid: string, opt: VIOption) => {
    const draft = newPoints[opt.id];
    const pts = Number(draft?.points);
    if (!draft?.profile || !pts) return;
    patchOption(qid, opt.id, { points: { ...opt.points, [draft.profile]: pts } });
    setNewPoints((n) => ({ ...n, [opt.id]: { profile: '', points: '' } }));
  };

  const removePoints = (qid: string, opt: VIOption, profile: string) => {
    const next = { ...opt.points };
    delete next[profile];
    patchOption(qid, opt.id, { points: next });
  };

  // ─── Persistencia ───
  const saveQuestion = async (q: VIQuestion) => {
    if (!q.text.trim()) {
      setToast({ type: 'error', text: 'La pregunta necesita un texto.' });
      return;
    }
    setSavingId(q.id);
    const type = questionType(q);
    const { error } = await db.from('viaje_ideal_questions').update({
      text: q.text.trim(),
      helper: q.helper?.trim() || null,
      type,
      max_select: type === 'multi' ? q.max_select || null : null,
      required: q.required !== false,
      options: type === 'text' ? [] : q.options.filter((o) => o.text.trim()),
    }).eq('id', q.id);
    setSavingId(null);
    if (error) {
      setToast({ type: 'error', text: 'No se pudo guardar la pregunta.' });
      return;
    }
    setDirty((d) => { const n = new Set(d); n.delete(q.id); return n; });
    setToast({ type: 'success', text: 'Pregunta guardada.' });
  };

  const addQuestion = async () => {
    const { data, error } = await db.from('viaje_ideal_questions').insert([{
      text: 'Nueva pregunta',
      type: 'single',
      required: true,
      sort_order: questions.length,
      options: [{ id: newOptionId(), text: 'Opción 1', points: {} }, { id: newOptionId(), text: 'Opción 2', points: {} }],
    }]).select();
    if (error || !data?.[0]) {
      setToast({ type: 'error', text: 'No se pudo crear la pregunta.' });
      return;
    }
    setQuestions((qs) => [...qs, data[0] as VIQuestion]);
    setExpandedId(data[0].id);
  };

  const deleteQuestion = async (qid: string) => {
    const { error } = await db.from('viaje_ideal_questions').delete().eq('id', qid);
    if (error) {
      setToast({ type: 'error', text: 'No se pudo eliminar la pregunta.' });
      return;
    }
    setQuestions((qs) => qs.filter((q) => q.id !== qid));
    setToast({ type: 'success', text: 'Pregunta eliminada.' });
  };

  const move = async (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= questions.length) return;
    const reordered = [...questions];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    setQuestions(reordered);
    // Guardar el nuevo orden de las dos preguntas que cambiaron
    await Promise.all([index, target].map((i) =>
      db.from('viaje_ideal_questions').update({ sort_order: i }).eq('id', reordered[i].id)
    ));
  };

  const seedDefaults = async () => {
    if (seeding) return;
    setSeeding(true);
    // Idempotente: solo agrega las sugeridas que todavía no están (por clave)
    const { data: existing } = await db.from('viaje_ideal_questions').select('key');
    const existingKeys = new Set<string>((existing || []).map((r: { key: string | null }) => r.key || '').filter(Boolean));
    const missing = DEFAULT_QUESTIONS.filter((q) => !existingKeys.has(q.key || ''));
    if (!missing.length) {
      setSeeding(false);
      fetchQuestions();
      return;
    }
    const { error } = await db.from('viaje_ideal_questions').insert(
      missing.map((q, i) => ({ ...q, sort_order: (existing?.length || 0) + i }))
    );
    setSeeding(false);
    if (error) {
      setToast({ type: 'error', text: 'No se pudieron cargar las preguntas sugeridas.' });
      return;
    }
    setToast({ type: 'success', text: 'Preguntas sugeridas cargadas.' });
    fetchQuestions();
  };

  const profileOptions = Object.values(PROFILES);

  return (
    <div className="viaje-ideal-page animate-fade-in">
      {toast && (
        <div className={`vi-toast ${toast.type}`} role="status">
          {toast.type === 'success' ? <Check size={16} /> : <X size={16} />} {toast.text}
        </div>
      )}

      <PageHeader
        section="Formularios"
        title="Viaje Ideal"
        subtitle="Las preguntas que responde el viajero para armar su perfil. Cada opción suma puntos a uno o más perfiles."
        actions={
          <>
            <button
              className="btn btn-outline"
              onClick={() => { setPreviewKey((k) => k + 1); setShowPreview(true); }}
              disabled={!questions.length}
            >
              <Eye size={16} /> Vista previa
            </button>
            <button className="btn btn-primary" onClick={addQuestion}>
              <Plus size={16} /> Nueva pregunta
            </button>
          </>
        }
      />

      {loading ? (
        <div className="loading-state-premium">
          <div className="loader-premium"></div>
          <p>Cargando preguntas...</p>
        </div>
      ) : questions.length === 0 ? (
        <div className="vi-empty glass-card">
          <div className="vi-empty-icon"><Sparkles size={26} /></div>
          <h3>Todavía no hay preguntas</h3>
          <p>
            Cargá el cuestionario sugerido: 12 preguntas pensadas desde la experiencia de un agente de viajes
            (motivación, compañía, fechas, escenario, presupuesto, distancia y más). Después podés editarlas.
          </p>
          <button className="btn btn-accent btn-lg" onClick={seedDefaults} disabled={seeding}>
            <ListChecks size={18} /> {seeding ? 'Cargando…' : 'Cargar preguntas sugeridas'}
          </button>
        </div>
      ) : (
        <ol className="vi-list">
          {questions.map((q, index) => {
            const type = questionType(q);
            const TypeIcon = TYPE_LABELS[type].icon;
            const open = expandedId === q.id;
            const isDirty = dirty.has(q.id);
            return (
              <li key={q.id} className={`vi-item glass-card ${open ? 'open' : ''}`}>
                <div className="vi-item-head">
                  <span className="vi-number">{String(index + 1).padStart(2, '0')}</span>
                  <button type="button" className="vi-item-title" onClick={() => setExpandedId(open ? null : q.id)} aria-expanded={open}>
                    <span className="vi-item-text">{q.text}</span>
                    <span className="vi-item-meta">
                      <span className="vi-badge"><TypeIcon size={12} /> {TYPE_LABELS[type].label}</span>
                      {type !== 'text' && <span>{q.options.length} opciones</span>}
                      {q.required === false && <span>Opcional</span>}
                      {isDirty && <span className="vi-unsaved">Sin guardar</span>}
                    </span>
                  </button>
                  <div className="vi-item-actions">
                    <button className="icon-btn" title="Subir" aria-label="Subir" onClick={() => move(index, -1)} disabled={index === 0}><ArrowUp size={16} /></button>
                    <button className="icon-btn" title="Bajar" aria-label="Bajar" onClick={() => move(index, 1)} disabled={index === questions.length - 1}><ArrowDown size={16} /></button>
                    <button className="icon-btn danger" title="Eliminar" aria-label="Eliminar" onClick={() => setDeleteId(q.id)}><Trash2 size={16} /></button>
                    <button className="icon-btn" aria-label={open ? 'Cerrar' : 'Editar'} onClick={() => setExpandedId(open ? null : q.id)}>
                      <ChevronDown size={18} className={open ? 'rotated' : ''} />
                    </button>
                  </div>
                </div>

                {open && (
                  <div className="vi-editor">
                    <div className="vi-grid">
                      <div className="form-group vi-span-2">
                        <label>Pregunta</label>
                        <input className="form-input" value={q.text} onChange={(e) => patchQuestion(q.id, { text: e.target.value })} />
                      </div>
                      <div className="form-group vi-span-2">
                        <label>Texto de ayuda <span className="vi-optional">(opcional)</span></label>
                        <input
                          className="form-input"
                          placeholder="Ej: Elegí hasta 2 opciones."
                          value={q.helper || ''}
                          onChange={(e) => patchQuestion(q.id, { helper: e.target.value })}
                        />
                      </div>
                      <div className="form-group">
                        <label>Tipo de respuesta</label>
                        <select className="form-input" value={type} onChange={(e) => patchQuestion(q.id, { type: e.target.value as QuestionType })}>
                          <option value="single">Opción única</option>
                          <option value="multi">Opción múltiple</option>
                          <option value="text">Texto libre</option>
                        </select>
                      </div>
                      {type === 'multi' ? (
                        <div className="form-group">
                          <label>Máximo de opciones a elegir</label>
                          <input
                            type="number"
                            min={1}
                            className="form-input"
                            placeholder="Sin límite"
                            value={q.max_select ?? ''}
                            onChange={(e) => patchQuestion(q.id, { max_select: e.target.value ? Number(e.target.value) : null })}
                          />
                        </div>
                      ) : <div />}
                      <label className="vi-toggle vi-span-2">
                        <input type="checkbox" checked={q.required !== false} onChange={(e) => patchQuestion(q.id, { required: e.target.checked })} />
                        <span>Respuesta obligatoria</span>
                      </label>
                    </div>

                    {type !== 'text' && (
                      <div className="vi-options">
                        <div className="vi-options-head">
                          <h4>Opciones</h4>
                          <p>Asigná puntos a los perfiles viajeros que representa cada opción.</p>
                        </div>
                        {q.options.map((opt, oi) => (
                          <div key={opt.id} className="vi-option">
                            <div className="vi-option-row">
                              <span className="vi-option-index">{oi + 1}</span>
                              <input
                                className="form-input"
                                placeholder="Texto de la opción"
                                value={opt.text}
                                onChange={(e) => patchOption(q.id, opt.id, { text: e.target.value })}
                              />
                              <button className="icon-btn danger" aria-label="Quitar opción" title="Quitar opción" onClick={() => removeOption(q.id, opt.id)}>
                                <X size={16} />
                              </button>
                            </div>
                            <div className="vi-points">
                              {Object.entries(opt.points || {}).map(([profile, pts]) => (
                                <span key={profile} className="vi-point-chip">
                                  {PROFILES[profile]?.name || profile} <strong>+{pts}</strong>
                                  <button aria-label={`Quitar ${profile}`} onClick={() => removePoints(q.id, opt, profile)}><X size={12} /></button>
                                </span>
                              ))}
                              <span className="vi-point-add">
                                <select
                                  value={newPoints[opt.id]?.profile || ''}
                                  onChange={(e) => setNewPoints((n) => ({ ...n, [opt.id]: { profile: e.target.value, points: n[opt.id]?.points || '5' } }))}
                                  aria-label="Perfil"
                                >
                                  <option value="">+ Perfil…</option>
                                  {profileOptions.filter((p) => !(p.key in (opt.points || {}))).map((p) => (
                                    <option key={p.key} value={p.key}>{p.name}</option>
                                  ))}
                                </select>
                                {newPoints[opt.id]?.profile && (
                                  <>
                                    <input
                                      type="number"
                                      min={1}
                                      max={20}
                                      aria-label="Puntos"
                                      value={newPoints[opt.id]?.points || ''}
                                      onChange={(e) => setNewPoints((n) => ({ ...n, [opt.id]: { ...n[opt.id], points: e.target.value } }))}
                                    />
                                    <button className="btn btn-xs btn-primary" onClick={() => addPoints(q.id, opt)}>Agregar</button>
                                  </>
                                )}
                              </span>
                            </div>
                          </div>
                        ))}
                        <button className="btn btn-outline btn-sm" onClick={() => addOption(q.id)}>
                          <Plus size={14} /> Agregar opción
                        </button>
                      </div>
                    )}

                    <div className="vi-editor-footer">
                      <span className={isDirty ? 'vi-unsaved' : 'vi-saved'}>
                        {isDirty ? 'Tenés cambios sin guardar' : 'Todo guardado'}
                      </span>
                      <button className="btn btn-primary" onClick={() => saveQuestion(q)} disabled={!isDirty || savingId === q.id}>
                        <Save size={16} /> {savingId === q.id ? 'Guardando…' : 'Guardar cambios'}
                      </button>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      )}

      {showPreview && (
        <div className="modal-overlay">
          <div className="modal-content-pro modal-lg">
            <div className="modal-header-pro">
              <div className="header-left">
                <div className="header-icon"><Eye size={20} /></div>
                <div className="header-text">
                  <h3>Vista previa del cliente</h3>
                  <p>Así ve la encuesta tu viajero. En la vista previa no se guardan respuestas.</p>
                </div>
              </div>
              <button type="button" onClick={() => setShowPreview(false)} className="close-modal-btn" aria-label="Cerrar">
                <X size={18} />
              </button>
            </div>
            <div className="modal-body-pro">
              <ViajeIdealSurvey key={previewKey} questions={questions} />
            </div>
          </div>
        </div>
      )}

      <ConfirmationModal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && deleteQuestion(deleteId)}
        title="Eliminar pregunta"
        message="La pregunta deja de mostrarse en la encuesta. Las respuestas que ya enviaron los viajeros se conservan."
        confirmText="Eliminar"
      />
    </div>
  );
}

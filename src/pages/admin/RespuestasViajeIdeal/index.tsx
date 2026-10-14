import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { AlertTriangle, CalendarPlus, Compass, Info, Mail, MessageSquareQuote, Phone, Save, Sparkles, UserRound, Users } from 'lucide-react';
import { db } from '../../../lib/db';
import { PROFILES, STATUS_LABELS, agentAlerts, summaryChips, valuesByKey, type StoredAnswer } from '../../../lib/viajeIdeal';
import PageHeader from '../../../components/PageHeader/PageHeader';
import SearchBar from '../../../components/SearchBar/SearchBar';
import './RespuestasViajeIdeal.css';

interface Submission {
  id: string;
  client_id: string | null;
  client_name: string | null;
  email: string | null;
  phone: string | null;
  answers: StoredAnswer[] | Record<string, unknown> | null;
  result: { profile?: string; profile_name?: string; secondary?: string; secondary_name?: string } | string | null;
  status: string | null;
  agent_notes: string | null;
  created_at: string;
}

const asAnswers = (s: Submission): StoredAnswer[] => (Array.isArray(s.answers) ? s.answers : []);

/** Las respuestas viejas guardaban el resultado como texto; las nuevas como objeto */
const profileOf = (s: Submission) => {
  if (!s.result) return null;
  if (typeof s.result === 'string') return { name: s.result, description: '', secondary: null as string | null };
  const p = s.result.profile ? PROFILES[s.result.profile] : null;
  return {
    name: p?.name || s.result.profile_name || 'Sin perfil',
    description: p?.description || '',
    secondary: s.result.secondary ? PROFILES[s.result.secondary]?.name || s.result.secondary_name || null : null,
  };
};

const FILTERS = [
  { key: 'todos', label: 'Todos' },
  { key: 'nuevo', label: 'Nuevos' },
  { key: 'contactado', label: 'Contactados' },
  { key: 'sesion_agendada', label: 'Con sesión' },
];

export default function RespuestasViajeIdealPage() {
  const navigate = useNavigate();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('todos');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [notesDraft, setNotesDraft] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data } = await db.from('viaje_ideal_submissions').select('*').order('created_at', { ascending: false });
      const rows = (data || []) as Submission[];
      setSubmissions(rows);
      if (rows[0]) setSelectedId(rows[0].id);
      setLoading(false);
    };
    load();
  }, []);

  const selected = submissions.find((s) => s.id === selectedId) || null;

  useEffect(() => {
    setNotesDraft(selected?.agent_notes || '');
  }, [selectedId]); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return submissions.filter((s) => {
      if (filter !== 'todos' && (s.status || 'nuevo') !== filter) return false;
      if (!term) return true;
      const haystack = [s.client_name, s.email, profileOf(s)?.name, ...asAnswers(s).flatMap((a) => a.values)]
        .filter(Boolean).join(' ').toLowerCase();
      return haystack.includes(term);
    });
  }, [submissions, searchTerm, filter]);

  // Perfil más frecuente para el resumen superior
  const topProfile = useMemo(() => {
    const count: Record<string, number> = {};
    submissions.forEach((s) => { const n = profileOf(s)?.name; if (n) count[n] = (count[n] || 0) + 1; });
    return Object.entries(count).sort((a, b) => b[1] - a[1])[0]?.[0] || '—';
  }, [submissions]);

  const updateSubmission = async (id: string, patch: Partial<Submission>) => {
    const { error } = await db.from('viaje_ideal_submissions').update(patch).eq('id', id);
    if (!error) setSubmissions((list) => list.map((s) => (s.id === id ? { ...s, ...patch } : s)));
    return !error;
  };

  const saveNotes = async () => {
    if (!selected) return;
    setSavingNotes(true);
    await updateSubmission(selected.id, { agent_notes: notesDraft.trim() || null });
    setSavingNotes(false);
  };

  const fmtDate = (iso: string) => {
    try { return format(parseISO(iso), "d 'de' MMMM yyyy, HH:mm", { locale: es }); } catch { return iso; }
  };

  const newCount = submissions.filter((s) => (s.status || 'nuevo') === 'nuevo').length;

  return (
    <div className="respuestas-viaje-page animate-fade-in">
      <PageHeader
        section="Formularios"
        title="Fichas de Viaje Ideal"
        subtitle="Lo que respondió cada viajero, resumido para preparar la primera sesión."
      />

      <div className="rvi-stats">
        <div className="rvi-stat"><span>Encuestas recibidas</span><strong>{submissions.length}</strong></div>
        <div className="rvi-stat"><span>Sin contactar</span><strong>{newCount}</strong></div>
        <div className="rvi-stat"><span>Perfil más común</span><strong className="rvi-stat-text">{topProfile}</strong></div>
      </div>

      {loading ? (
        <div className="loading-state-premium"><div className="loader-premium"></div><p>Cargando fichas...</p></div>
      ) : submissions.length === 0 ? (
        <div className="rvi-empty glass-card">
          <Compass size={32} />
          <h3>Todavía no hay encuestas respondidas</h3>
          <p>Cuando un viajero complete la encuesta desde su portal, su ficha va a aparecer acá.</p>
        </div>
      ) : (
        <div className="rvi-layout">
          {/* ─── Lista ─── */}
          <aside className="rvi-list glass-card">
            <div className="rvi-list-tools">
              <SearchBar size="sm" placeholder="Buscar viajero, perfil o respuesta..." value={searchTerm} onChange={setSearchTerm} />
              <div className="rvi-filters" role="tablist">
                {FILTERS.map((f) => (
                  <button key={f.key} role="tab" aria-selected={filter === f.key} className={filter === f.key ? 'active' : ''} onClick={() => setFilter(f.key)}>
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
            <ul>
              {filtered.length === 0 && <li className="rvi-list-empty">No hay fichas con ese filtro.</li>}
              {filtered.map((s) => {
                const status = s.status || 'nuevo';
                return (
                  <li key={s.id}>
                    <button className={`rvi-row ${s.id === selectedId ? 'active' : ''}`} onClick={() => setSelectedId(s.id)}>
                      <span className="rvi-avatar">{(s.client_name || '?').charAt(0).toUpperCase()}</span>
                      <span className="rvi-row-text">
                        <strong>{s.client_name || 'Viajero sin nombre'}</strong>
                        <span>{profileOf(s)?.name || 'Sin perfil'}</span>
                      </span>
                      <span className={`rvi-status ${status}`}>{STATUS_LABELS[status] || status}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </aside>

          {/* ─── Ficha ─── */}
          {selected ? (
            <section className="rvi-detail glass-card" key={selected.id}>
              <header className="rvi-detail-head">
                <div>
                  <h2>{selected.client_name || 'Viajero sin nombre'}</h2>
                  <p className="rvi-date">Respondió el {fmtDate(selected.created_at)}</p>
                  <div className="rvi-contact">
                    {selected.email && <a href={`mailto:${selected.email}`}><Mail size={14} /> {selected.email}</a>}
                    {selected.phone && <a href={`tel:${selected.phone.replace(/\s|-/g, '')}`}><Phone size={14} /> {selected.phone}</a>}
                  </div>
                </div>
                <div className="rvi-head-actions">
                  <select
                    className="form-input rvi-status-select"
                    value={selected.status || 'nuevo'}
                    onChange={(e) => updateSubmission(selected.id, { status: e.target.value })}
                    aria-label="Estado de seguimiento"
                  >
                    {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                  <button className="btn btn-primary" onClick={() => navigate('/mi-agenda')}>
                    <CalendarPlus size={16} /> Agendar sesión
                  </button>
                  {selected.client_id && (
                    <button className="btn btn-outline" onClick={() => navigate('/clientes')}>
                      <UserRound size={16} /> Ver cliente
                    </button>
                  )}
                </div>
              </header>

              {(() => {
                const answers = asAnswers(selected);
                const profile = profileOf(selected);
                const chips = summaryChips(answers);
                const alerts = agentAlerts(answers);
                const notes = valuesByKey(answers, 'notes')[0];
                return (
                  <>
                    <div className="rvi-profile">
                      <span className="rvi-profile-eyebrow"><Sparkles size={13} /> Perfil viajero</span>
                      <h3>{profile?.name || 'Sin perfil calculado'}</h3>
                      {profile?.secondary && <p className="rvi-profile-secondary">con un toque de {profile.secondary.toLowerCase()}</p>}
                      {profile?.description && <p>{profile.description}</p>}
                    </div>

                    {chips.length > 0 && (
                      <div className="rvi-section">
                        <h4>Resumen del viaje</h4>
                        <dl className="rvi-chips">
                          {chips.map((c) => (
                            <div key={c.label}><dt>{c.label}</dt><dd>{c.value}</dd></div>
                          ))}
                        </dl>
                      </div>
                    )}

                    {alerts.length > 0 && (
                      <div className="rvi-section">
                        <h4>Para tener en cuenta</h4>
                        <ul className="rvi-alerts">
                          {alerts.map((a) => (
                            <li key={a.text} className={a.level}>
                              {a.level === 'warning' ? <AlertTriangle size={16} /> : <Info size={16} />}
                              <span>{a.text}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {notes && (
                      <div className="rvi-section">
                        <h4>En sus palabras</h4>
                        <blockquote className="rvi-quote"><MessageSquareQuote size={18} /> {notes}</blockquote>
                      </div>
                    )}

                    {answers.length > 0 ? (
                      <details className="rvi-section rvi-all">
                        <summary><h4>Todas las respuestas ({answers.length})</h4></summary>
                        <ol>
                          {answers.map((a) => (
                            <li key={a.questionId}>
                              <span>{a.question}</span>
                              <strong>{a.values.length ? a.values.join(' · ') : '—'}</strong>
                            </li>
                          ))}
                        </ol>
                      </details>
                    ) : (
                      <p className="rvi-legacy">Esta encuesta es de la versión anterior y no tiene el detalle de las respuestas.</p>
                    )}

                    <div className="rvi-section">
                      <h4>Notas del agente</h4>
                      <textarea
                        className="form-input rvi-notes"
                        rows={3}
                        placeholder="Ideas de destinos, dudas para la sesión, próximos pasos…"
                        value={notesDraft}
                        onChange={(e) => setNotesDraft(e.target.value)}
                      />
                      <div className="rvi-notes-actions">
                        <button
                          className="btn btn-outline btn-sm"
                          onClick={saveNotes}
                          disabled={savingNotes || notesDraft.trim() === (selected.agent_notes || '')}
                        >
                          <Save size={14} /> {savingNotes ? 'Guardando…' : 'Guardar notas'}
                        </button>
                      </div>
                    </div>
                  </>
                );
              })()}
            </section>
          ) : (
            <section className="rvi-detail glass-card rvi-detail-empty">
              <Users size={28} />
              <p>Elegí una ficha de la lista para verla.</p>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

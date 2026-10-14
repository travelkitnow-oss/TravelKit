/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from 'react';
import { differenceInCalendarDays, format, isValid, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Archive, ArrowRight, Bus, CalendarDays, CircleCheck, Clock, Hotel, Map, MapPin, NotebookPen, Plane, Receipt, Trash2, Users, Wallet,
} from 'lucide-react';
import { db } from '../../../lib/db';
import PageHeader from '../../../components/PageHeader/PageHeader';
import SearchBar from '../../../components/SearchBar/SearchBar';
import ConfirmationModal from '../../../components/ConfirmationModal/ConfirmationModal';
import './HistorialViajes.css';
import './HistorialViajesV2.css';

interface Trip {
  id: string;
  client_id: string | null;
  trip_name: string | null;
  destination: string | null;
  start_date: string | null;
  end_date: string | null;
  itinerary_data: any[] | null;
  billing_data: any | null;
  created_at: string;
  clients?: { name: string } | null;
}

// ─── Utilidades de fechas (las fechas vienen como 'yyyy-MM-dd') ───
const toDate = (value?: string | null) => {
  if (!value) return null;
  const d = parseISO(value);
  return isValid(d) ? d : null;
};

const fmt = (value: string | null | undefined, pattern: string) => {
  const d = toDate(value);
  return d ? format(d, pattern, { locale: es }) : null;
};

const dateRange = (start?: string | null, end?: string | null) => {
  const s = toDate(start);
  const e = toDate(end);
  if (s && e) {
    const sameYear = s.getFullYear() === e.getFullYear();
    return `${format(s, sameYear ? "d 'de' MMM" : "d MMM yyyy", { locale: es })} – ${format(e, "d 'de' MMM yyyy", { locale: es })}`;
  }
  if (s) return `Desde el ${format(s, "d 'de' MMM yyyy", { locale: es })}`;
  return 'Fechas sin cargar';
};

const nightsOf = (start?: string | null, end?: string | null) => {
  const s = toDate(start);
  const e = toDate(end);
  return s && e ? Math.max(0, differenceInCalendarDays(e, s)) : null;
};

const money = (n: number) => `$${Math.round(n).toLocaleString('es-AR')}`;

const parseNotes = (raw: unknown): { id: string; content: string; date?: string }[] => {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  try {
    const parsed = JSON.parse(String(raw));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return String(raw).trim() ? [{ id: 'legacy', content: String(raw) }] : [];
  }
};

const ITEM_TYPES: Record<string, { label: string; icon: typeof Hotel }> = {
  hotel: { label: 'Hotel', icon: Hotel },
  transport: { label: 'Traslado', icon: Bus },
  excursion: { label: 'Excursión', icon: Map },
};

export default function HistorialViajesAdminPage() {
  const [history, setHistory] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const { data, error } = await db
        .from('travel_history')
        .select('*, clients(name)')
        .order('created_at', { ascending: false });
      if (error) console.error('Error cargando historial:', error);
      const rows = (data || []) as Trip[];
      setHistory(rows);
      if (rows[0]) setSelectedId(rows[0].id);
      setLoading(false);
    };
    load();
  }, []);

  const deleteTrip = async (id: string) => {
    const { error } = await db.from('travel_history').delete().eq('id', id);
    if (error) return;
    setHistory((h) => h.filter((t) => t.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  const filtered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return history;
    return history.filter((t) =>
      [t.clients?.name, t.destination, t.trip_name].filter(Boolean).join(' ').toLowerCase().includes(term)
    );
  }, [history, searchTerm]);

  // Agrupar por año de inicio del viaje (o de archivo si no tiene fechas)
  const groups = useMemo(() => {
    const map = new globalThis.Map<string, Trip[]>();
    filtered.forEach((t) => {
      const year = (toDate(t.start_date) || toDate(t.created_at))?.getFullYear().toString() || 'Sin fecha';
      if (!map.has(year)) map.set(year, []);
      map.get(year)!.push(t);
    });
    return [...map.entries()];
  }, [filtered]);

  const stats = useMemo(() => {
    const travelers = new Set(history.map((t) => t.client_id).filter(Boolean)).size;
    const destCount: Record<string, number> = {};
    let billed = 0;
    history.forEach((t) => {
      if (t.destination && t.destination !== 'N/A') destCount[t.destination] = (destCount[t.destination] || 0) + 1;
      (t.billing_data?.tasks || []).forEach((task: any) => { if (Number(task.price) > 0) billed += Number(task.price); });
    });
    const topDest = Object.entries(destCount).sort((a, b) => b[1] - a[1])[0]?.[0] || '—';
    return { trips: history.length, travelers, topDest, billed };
  }, [history]);

  const selected = history.find((t) => t.id === selectedId) || null;

  return (
    <div className="historial-admin-page animate-fade-in">
      <PageHeader
        section="Gestión"
        title="Historial de Viajes"
        subtitle="Los viajes finalizados de tus clientes, con su itinerario, servicios y pagos."
        actions={<SearchBar className="search-header" placeholder="Buscar cliente o destino..." value={searchTerm} onChange={setSearchTerm} />}
      />

      <div className="hv-stats">
        <div className="hv-stat"><Archive size={18} /><div><span>Viajes finalizados</span><strong>{stats.trips}</strong></div></div>
        <div className="hv-stat"><Users size={18} /><div><span>Viajeros</span><strong>{stats.travelers}</strong></div></div>
        <div className="hv-stat"><MapPin size={18} /><div><span>Destino más elegido</span><strong className="hv-stat-text">{stats.topDest}</strong></div></div>
        <div className="hv-stat"><Wallet size={18} /><div><span>Servicios facturados</span><strong>{money(stats.billed)}</strong></div></div>
      </div>

      {loading ? (
        <div className="loading-state-premium"><div className="loader-premium"></div><p>Cargando historial...</p></div>
      ) : history.length === 0 ? (
        <div className="hv-empty glass-card">
          <Archive size={32} />
          <h3>Todavía no hay viajes finalizados</h3>
          <p>Cuando finalices un viaje desde la Agenda del cliente, queda archivado acá con todo su detalle.</p>
        </div>
      ) : (
        <div className="hv-layout">
          {/* ─── Listado ─── */}
          <aside className="hv-list glass-card">
            {filtered.length === 0 && <p className="hv-list-empty">No hay viajes que coincidan con la búsqueda.</p>}
            {groups.map(([year, trips]) => (
              <div key={year} className="hv-group">
                <h4 className="hv-group-title">{year}</h4>
                {trips.map((t) => {
                  const nights = nightsOf(t.start_date, t.end_date);
                  return (
                    <button key={t.id} className={`hv-trip ${t.id === selectedId ? 'active' : ''}`} onClick={() => setSelectedId(t.id)}>
                      <span className="hv-trip-icon"><Plane size={16} /></span>
                      <span className="hv-trip-text">
                        <strong>{t.destination && t.destination !== 'N/A' ? t.destination : t.trip_name || 'Viaje sin destino'}</strong>
                        <span>{t.clients?.name || 'Cliente eliminado'}</span>
                        <span className="hv-trip-dates">
                          {dateRange(t.start_date, t.end_date)}{nights ? ` · ${nights} noches` : ''}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            ))}
          </aside>

          {/* ─── Detalle ─── */}
          {selected ? <TripDetail trip={selected} onDelete={() => setDeleteId(selected.id)} /> : (
            <section className="hv-detail-empty glass-card">
              <Plane size={28} />
              <p>Elegí un viaje del listado para ver su detalle.</p>
            </section>
          )}
        </div>
      )}

      <ConfirmationModal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && deleteTrip(deleteId)}
        title="Eliminar del historial"
        message="Se borra el registro de este viaje, con su itinerario y pagos archivados. El cliente no se elimina."
        confirmText="Eliminar"
      />
    </div>
  );
}

function TripDetail({ trip, onDelete }: { trip: Trip; onDelete: () => void }) {
  const b = trip.billing_data || {};
  const nights = nightsOf(trip.start_date, trip.end_date);
  const passengers = Number(b.passengers) || 1;
  const destination = trip.destination && trip.destination !== 'N/A' ? trip.destination : null;

  const tasks: any[] = Array.isArray(b.tasks) ? b.tasks : [];
  const services = tasks.filter((t) => Number(t.price) > 0);
  const payments = tasks.filter((t) => Number(t.price) < 0);
  const totalServices = services.reduce((s, t) => s + Number(t.price), 0);
  const paidByTask = services.filter((t) => t.paid || t.payment_status === 'paid').reduce((s, t) => s + Number(t.price), 0);
  const totalPayments = payments.reduce((s, t) => s + Math.abs(Number(t.price)), 0);
  const collected = paidByTask + totalPayments;
  const balance = Math.max(0, totalServices - collected);

  // Itinerario agrupado por día
  const itinerary = [...(Array.isArray(trip.itinerary_data) ? trip.itinerary_data : [])]
    .sort((a, b2) => `${a.date || ''}${a.time || ''}`.localeCompare(`${b2.date || ''}${b2.time || ''}`));
  const days: [string, any[]][] = [];
  itinerary.forEach((item) => {
    const key = item.date || 'Sin fecha';
    const last = days[days.length - 1];
    if (last && last[0] === key) last[1].push(item);
    else days.push([key, [item]]);
  });

  const notes = parseNotes(b.notes);
  const outbound = b.origin || destination ? { from: b.origin, to: b.destination || destination, date: b.departure_date, dep: b.departure_time, arr: b.arrival_time } : null;
  const inbound = b.return_date ? { from: b.return_origin || destination, to: b.return_destination || b.origin, date: b.return_date, dep: b.return_departure_time, arr: b.return_arrival_time } : null;

  return (
    <section className="hv-detail glass-card" key={trip.id}>
      <header className="hv-hero">
        <div className="hv-hero-top">
          <span className="hv-archived"><CircleCheck size={13} /> Viaje finalizado</span>
          <button className="hv-delete" onClick={onDelete} title="Eliminar del historial" aria-label="Eliminar del historial">
            <Trash2 size={16} />
          </button>
        </div>
        <h2>{destination || trip.trip_name || 'Viaje'}</h2>
        <p className="hv-hero-client">{trip.clients?.name || 'Cliente eliminado'}</p>
        <div className="hv-hero-facts">
          <span><CalendarDays size={15} /> {dateRange(trip.start_date, trip.end_date)}</span>
          {nights !== null && <span><Clock size={15} /> {nights} {nights === 1 ? 'noche' : 'noches'}</span>}
          <span><Users size={15} /> {passengers} {passengers === 1 ? 'pasajero' : 'pasajeros'}</span>
        </div>
      </header>

      <div className="hv-body">
        {(outbound || inbound) && (
          <section className="hv-section">
            <h4><Plane size={15} /> Vuelos</h4>
            <div className="hv-flights">
              {[{ label: 'Ida', f: outbound }, { label: 'Vuelta', f: inbound }].filter((x) => x.f).map(({ label, f }) => (
                <div key={label} className="hv-flight">
                  <span className="hv-flight-label">{label}{f!.date ? ` · ${fmt(f!.date, "d 'de' MMM") || f!.date}` : ''}</span>
                  <div className="hv-flight-route">
                    <div><strong>{f!.from || '—'}</strong>{f!.dep && <span>{f!.dep} hs</span>}</div>
                    <ArrowRight size={18} />
                    <div><strong>{f!.to || '—'}</strong>{f!.arr && <span>{f!.arr} hs</span>}</div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="hv-section">
          <h4><CalendarDays size={15} /> Itinerario</h4>
          {days.length === 0 ? (
            <p className="hv-empty-hint">No hay actividades registradas para este viaje.</p>
          ) : (
            <ol className="hv-timeline">
              {days.map(([day, items]) => (
                <li key={day} className="hv-day">
                  <div className="hv-day-label">
                    <strong>{fmt(day, 'd') || '—'}</strong>
                    <span>{fmt(day, 'MMM') || ''}</span>
                  </div>
                  <ul>
                    {items.map((item, i) => {
                      const type = ITEM_TYPES[item.type] || { label: item.type || 'Actividad', icon: MapPin };
                      const Icon = type.icon;
                      return (
                        <li key={item.id || i} className={`hv-event ${item.type || ''}`}>
                          <span className="hv-event-icon"><Icon size={15} /></span>
                          <div className="hv-event-text">
                            <strong>{item.name || type.label}</strong>
                            <span>
                              {type.label}
                              {item.time ? ` · ${item.time} hs` : ''}
                              {item.end_date ? ` · hasta ${fmt(item.end_date, "d 'de' MMM") || item.end_date}` : ''}
                              {item.origin && item.destination ? ` · ${item.origin} → ${item.destination}` : ''}
                            </span>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section className="hv-section">
          <h4><Receipt size={15} /> Servicios y pagos</h4>
          {tasks.length === 0 ? (
            <p className="hv-empty-hint">No se registraron servicios para este viaje.</p>
          ) : (
            <>
              <div className="hv-money">
                <div><span>Total servicios</span><strong>{money(totalServices)}</strong></div>
                <div><span>Cobrado</span><strong className="ok">{money(collected)}</strong></div>
                <div><span>Saldo pendiente</span><strong className={balance > 0 ? 'due' : 'ok'}>{money(balance)}</strong></div>
              </div>
              <table className="hv-table">
                <thead>
                  <tr><th>Concepto</th><th>Fecha</th><th>Estado</th><th className="num">Importe</th></tr>
                </thead>
                <tbody>
                  {tasks.map((t, i) => {
                    const isPayment = Number(t.price) < 0;
                    const paid = isPayment || t.paid || t.payment_status === 'paid';
                    return (
                      <tr key={i}>
                        <td>{t.name || (isPayment ? 'Pago recibido' : 'Servicio')}</td>
                        <td>{fmt(t.date, 'dd/MM/yyyy') || '—'}</td>
                        <td>
                          <span className={`hv-pill ${isPayment ? 'payment' : paid ? 'paid' : 'pending'}`}>
                            {isPayment ? 'Pago' : paid ? 'Pagado' : 'Pendiente'}
                          </span>
                        </td>
                        <td className={`num ${isPayment ? 'neg' : ''}`}>{isPayment ? '−' : ''}{money(Math.abs(Number(t.price) || 0))}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </>
          )}
        </section>

        {notes.length > 0 && (
          <section className="hv-section">
            <h4><NotebookPen size={15} /> Notas del viaje</h4>
            <ul className="hv-notes">
              {notes.map((n) => (
                <li key={n.id}>
                  <p>{n.content}</p>
                  {n.date && <span>{fmt(n.date.slice(0, 10), "d 'de' MMM yyyy")}</span>}
                </li>
              ))}
            </ul>
          </section>
        )}

        <p className="hv-archived-at">Archivado el {fmt(trip.created_at.slice(0, 10), "d 'de' MMMM 'de' yyyy") || trip.created_at}</p>
      </div>
    </section>
  );
}

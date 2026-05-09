/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from 'react';
import { 
  Archive, 
  Search, 
  Calendar, 
  MapPin, 
  ChevronRight, 
  ExternalLink,
  Trash2
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import './HistorialViajes.css';

export default function HistorialViajesAdminPage() {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTrip, setSelectedTrip] = useState<any | null>(null);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('travel_history')
        .select('*, clients(name)')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setHistory(data || []);
    } catch (e) {
      console.error('Error fetching history:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEntry = async (id: string) => {
    if (!window.confirm('¿Eliminar este registro del historial?')) return;
    try {
      await supabase.from('travel_history').delete().eq('id', id);
      setHistory(history.filter(h => h.id !== id));
      if (selectedTrip?.id === id) setSelectedTrip(null);
    } catch (e) {
      alert('Error al eliminar');
    }
  };

  const filteredHistory = history.filter(h => 
    h.clients?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    h.destination?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="historial-admin-page animate-fade-in">
      <header className="historial-top-header glass-card">
        <div className="header-flex">
          <div className="header-title">
            <div className="icon-badge">
              <Archive size={20} />
            </div>
            <div>
              <h1>Historial de Viajes</h1>
              <p>Registro de itinerarios finalizados</p>
            </div>
          </div>
          
          <div className="search-box-premium">
            <Search size={18} />
            <input 
              type="text" 
              placeholder="Buscar cliente o destino..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </header>

      <div className="historial-main-layout">
        <aside className="history-sidebar">
          {loading ? (
            <div className="history-loading">Cargando...</div>
          ) : (
            <div className="history-list">
              {filteredHistory.map(trip => (
                <div 
                  key={trip.id} 
                  className={`history-item-card glass-card ${selectedTrip?.id === trip.id ? 'active' : ''}`}
                  onClick={() => setSelectedTrip(trip)}
                >
                  <div className="item-header">
                    <span className="status-badge">FINALIZADO</span>
                    <span className="item-date">{new Date(trip.created_at).toLocaleDateString()}</span>
                  </div>
                  <h3>{trip.clients?.name}</h3>
                  <div className="item-meta">
                    <MapPin size={12} /> {trip.destination}
                  </div>
                  <div className="item-dates-mini">
                    <Calendar size={12} /> 
                    <span>{trip.start_date ? new Date(trip.start_date).toLocaleDateString() : '--'} - {trip.end_date ? new Date(trip.end_date).toLocaleDateString() : '--'}</span>
                  </div>
                  <div className="item-footer">
                    <button className="btn-details">
                      Detalles <ChevronRight size={14} />
                    </button>
                    <button className="btn-delete" onClick={(e) => { e.stopPropagation(); handleDeleteEntry(trip.id); }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </aside>

        <main className="history-detail-pane">
          {selectedTrip ? (
            <div className="trip-full-detail glass-card animate-slide-up">
              <div className="detail-hero">
                <div className="trip-detail-hero-content">
                  <div className="avatar-circle">
                    {selectedTrip.clients?.name?.charAt(0)}
                  </div>
                  <div className="trip-detail-hero-text">
                    <h2>{selectedTrip.clients?.name}</h2>
                    <p>{selectedTrip.trip_name}</p>
                  </div>
                </div>
                <div className="trip-detail-hero-badge">REGISTRO ARCHIVADO</div>
              </div>

              <div className="detail-scroll-area">
                <section className="detail-block">
                  <div className="block-header">
                    <MapPin size={16} /> <span>RESUMEN DEL VIAJE</span>
                  </div>
                  <div className="summary-info-grid">
                    <div className="info-box">
                      <label>DESTINO</label>
                      <p>{selectedTrip.destination}</p>
                    </div>
                    <div className="info-box">
                      <label>PASAJEROS</label>
                      <p>{selectedTrip.billing_data?.passengers || 1}</p>
                    </div>
                    <div className="info-box">
                      <label>FECHAS</label>
                      <p>{selectedTrip.start_date ? new Date(selectedTrip.start_date).toLocaleDateString() : '--'} al {selectedTrip.end_date ? new Date(selectedTrip.end_date).toLocaleDateString() : '--'}</p>
                    </div>
                  </div>
                </section>

                <section className="detail-block">
                  <div className="block-header">
                    <Calendar size={16} /> <span>ITINERARIO REALIZADO</span>
                  </div>
                  <div className="itinerary-mini-list">
                    {selectedTrip.itinerary_data?.length > 0 ? (
                      selectedTrip.itinerary_data.sort((a: any, b: any) => a.date.localeCompare(b.date)).map((item: any, idx: number) => (
                        <div key={idx} className={`mini-item ${item.type}`}>
                          <span className="mini-time">{item.time}</span>
                          <span className="mini-name">{item.name}</span>
                          <span className="mini-type">{item.type.toUpperCase()}</span>
                        </div>
                      ))
                    ) : (
                      <p className="empty-hint">Sin actividades registradas.</p>
                    )}
                  </div>
                </section>

                <section className="detail-block">
                  <div className="block-header">
                    <ExternalLink size={16} /> <span>COSTOS Y SERVICIOS</span>
                  </div>
                  <div className="billing-mini-list">
                    {selectedTrip.billing_data?.tasks?.length > 0 ? (
                      selectedTrip.billing_data.tasks.map((task: any, idx: number) => (
                        <div key={idx} className="billing-mini-row">
                          <span>{task.name}</span>
                          <span className="price-text">${Math.abs(task.price).toLocaleString('es-AR')}</span>
                        </div>
                      ))
                    ) : (
                      <p className="empty-hint">Sin servicios cobrados.</p>
                    )}
                  </div>
                </section>
              </div>
            </div>
          ) : (
            <div className="no-selection-placeholder glass-card">
              <ChevronRight size={48} />
              <p>Selecciona un viaje para ver el historial completo</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

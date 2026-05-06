/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { 
  MapPin, 
  Calendar, 
  ChevronRight, 
  ExternalLink,
  History,
  Info
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import './HistorialViajesCliente.css';

export default function HistorialViajesClientePage() {
  const { clientId } = useOutletContext<{ clientId: string }>();
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTrip, setSelectedTrip] = useState<any | null>(null);

  useEffect(() => {
    if (clientId) {
      fetchHistory();
    }
  }, [clientId]);

  const fetchHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('travel_history')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setHistory(data || []);
    } catch (e) {
      console.error('Error fetching history:', e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="historial-cliente-page animate-fade-in">
      <header className="client-history-header">
        <h1>Mi Historial de Viajes</h1>
        <p>Revive tus aventuras pasadas y consulta los detalles de tus itinerarios anteriores.</p>
      </header>

      {loading ? (
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Cargando tus viajes anteriores...</p>
        </div>
      ) : history.length === 0 ? (
        <div className="empty-history glass-card">
          <History size={64} className="text-muted" />
          <h3>Aún no tienes viajes finalizados</h3>
          <p>Tus viajes aparecerán aquí una vez que hayan concluido y sean archivados.</p>
        </div>
      ) : (
        <div className="client-history-layout">
          <div className="trips-grid">
            {history.map(trip => (
              <div 
                key={trip.id} 
                className={`trip-history-card glass-card ${selectedTrip?.id === trip.id ? 'active' : ''}`}
                onClick={() => setSelectedTrip(trip)}
              >
                <div className="trip-card-image">
                  <div className="destination-overlay">
                    <MapPin size={16} />
                    <span>{trip.destination}</span>
                  </div>
                </div>
                <div className="trip-card-content">
                  <span className="archive-date">{new Date(trip.created_at).toLocaleDateString()}</span>
                  <h3>{trip.trip_name}</h3>
                  <div className="trip-meta-row">
                    <Calendar size={14} />
                    <span>{trip.start_date ? new Date(trip.start_date).toLocaleDateString() : '---'} - {trip.end_date ? new Date(trip.end_date).toLocaleDateString() : '---'}</span>
                  </div>
                  <button className="btn-view-trip">
                    Ver Detalles <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {selectedTrip && (
            <div className="trip-details-overlay" onClick={() => setSelectedTrip(null)}>
              <div className="trip-details-modal glass-card animate-slide-up" onClick={e => e.stopPropagation()}>
                <div className="modal-header-premium">
                  <div>
                    <span className="modal-tag">VIAJE FINALIZADO</span>
                    <h2>{selectedTrip.trip_name}</h2>
                  </div>
                  <button className="btn-close-modal" onClick={() => setSelectedTrip(null)}>×</button>
                </div>

                <div className="modal-body-scroll">
                  <div className="info-banner">
                    <Info size={18} />
                    <p>Esta es una vista informativa de un viaje archivado. No es posible realizar cambios.</p>
                  </div>

                  <section className="modal-section">
                    <h3><Calendar size={18} /> Itinerario Realizado</h3>
                    <div className="itinerary-list-view">
                      {selectedTrip.itinerary_data && selectedTrip.itinerary_data.length > 0 ? (
                        selectedTrip.itinerary_data.sort((a: any, b: any) => a.date.localeCompare(b.date)).map((item: any, idx: number) => (
                          <div key={idx} className={`itinerary-row ${item.type}`}>
                            <div className="row-time">{item.time}</div>
                            <div className="row-info">
                              <span className="row-name">{item.name}</span>
                              <span className="row-date">{new Date(item.date).toLocaleDateString()}</span>
                            </div>
                            <span className="row-type">{item.type.toUpperCase()}</span>
                          </div>
                        ))
                      ) : (
                        <p className="no-data">No hay itinerario disponible.</p>
                      )}
                    </div>
                  </section>

                  <section className="modal-section">
                    <h3><ExternalLink size={18} /> Servicios Contratados</h3>
                    <div className="billing-summary-view">
                      {selectedTrip.billing_data?.tasks && selectedTrip.billing_data.tasks.length > 0 ? (
                        selectedTrip.billing_data.tasks.map((task: any, idx: number) => (
                          <div key={idx} className="billing-row">
                            <span>{task.name}</span>
                            <span className="billing-price">${Math.abs(task.price).toLocaleString('es-AR')}</span>
                          </div>
                        ))
                      ) : (
                        <p className="no-data">No hay servicios registrados.</p>
                      )}
                    </div>
                  </section>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

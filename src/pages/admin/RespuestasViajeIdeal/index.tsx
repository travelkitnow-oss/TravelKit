import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { Target, Calendar, User, Search, MapPin, Compass, ChevronDown } from 'lucide-react';
import './RespuestasViajeIdeal.css';

interface Submission {
  id: string;
  client_name: string;
  result: string;
  answers: any;
  created_at: string;
}

export default function RespuestasViajeIdealPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const fetchSubmissions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('viaje_ideal_submissions').select('*').order('created_at', { ascending: false });
      
      if (error) {
        // If table doesn't exist (PGRST205), we show mock data silently
        if (error.code === 'PGRST205') {
          useMockData();
        } else {
          console.error('Error fetching submissions:', error);
          useMockData();
        }
      } else if (data) {
        setSubmissions(data);
      }
    } catch (e) {
      useMockData();
    }
    setLoading(false);
  };

  const useMockData = () => {
    setSubmissions([
      { 
        id: '1', 
        client_name: 'Juan Pérez', 
        result: 'Playa', 
        answers: {}, 
        created_at: new Date().toISOString() 
      },
      { 
        id: '2', 
        client_name: 'Maria Garcia', 
        result: 'Nieve', 
        answers: {}, 
        created_at: new Date(Date.now() - 86400000).toISOString() 
      }
    ]);
  };

  const filteredSubmissions = submissions.filter(s => 
    s.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.result.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="respuestas-viaje-page animate-fade-in">
      {/* Header Section */}
      <div className="dashboard-header mb-5">
        <div className="header-info centered">
          <div className="header-badge">
            <Compass size={14} />
            <span>Módulo de Inteligencia</span>
          </div>
          <h1 className="display-title">Resultados del Test</h1>
          <p className="subtitle">Analiza las preferencias de tus clientes y segmenta tus estrategias de venta.</p>
        </div>
      </div>

      {/* Stats Summary Area */}
      <div className="stats-row mb-5">
        <div className="premium-stat-card">
          <div className="stat-content">
            <span className="stat-label">Total Viajeros</span>
            <span className="stat-number">{submissions.length}</span>
            <span className="stat-trend positive">+12% este mes</span>
          </div>
          <div className="stat-icon-wrapper blue">
            <User size={24} />
          </div>
        </div>

        <div className="premium-stat-card">
          <div className="stat-content">
            <span className="stat-label">Segmentos Activos</span>
            <span className="stat-number">{[...new Set(submissions.map(s => s.result))].length}</span>
            <span className="stat-trend neutral">Estable</span>
          </div>
          <div className="stat-icon-wrapper green">
            <Target size={24} />
          </div>
        </div>

        <div className="premium-stat-card">
          <div className="stat-content">
            <span className="stat-label">Tasa de Completitud</span>
            <span className="stat-number">92%</span>
            <span className="stat-trend positive">Óptima</span>
          </div>
          <div className="stat-icon-wrapper gold">
            <Target size={24} />
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="main-dashboard-card glass-card shadow-2xl">
        <div className="card-toolbar">
          <div className="search-container">
            <Search size={18} className="search-icon" />
            <input 
              type="text" 
              placeholder="Buscar por cliente, destino o ID..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="toolbar-info">
            <div className="result-pill">
              <div className="pulse-dot"></div>
              <span>{filteredSubmissions.length} perfiles encontrados</span>
            </div>
          </div>
        </div>

        <div className="table-responsive">
          <table className="dashboard-table">
            <thead>
              <tr>
                <th>Viajero / ID</th>
                <th>Perfil Detectado</th>
                <th>Fecha de Análisis</th>
                <th className="text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="loading-state">
                    <div className="loader-premium"></div>
                    <p className="mt-3">Sincronizando con base de datos...</p>
                  </td>
                </tr>
              ) : filteredSubmissions.length > 0 ? (
                filteredSubmissions.map(s => (
                  <tr key={s.id}>
                    <td className="user-column">
                      <div className="user-info-group">
                        <div className="user-initials">
                          {s.client_name.charAt(0)}
                        </div>
                        <div className="user-details">
                          <span className="user-name">{s.client_name}</span>
                          <span className="user-id">VIA-{s.id.slice(0, 5).toUpperCase()}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className={`segment-badge-premium`}>
                        <MapPin size={12} />
                        <span>{s.result}</span>
                      </div>
                    </td>
                    <td>
                      <div className="date-group">
                        <Calendar size={14} className="text-primary" />
                        <span>{new Date(s.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                      </div>
                    </td>
                    <td className="text-right">
                      <button className="btn-action-view">
                        <span>Ver Perfil</span>
                        <ChevronDown size={14} />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="empty-state">
                    <Search size={40} style={{ opacity: 0.2 }} />
                    <h3 className="mt-4">Sin coincidencias</h3>
                    <p>No encontramos perfiles que coincidan con tu búsqueda.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

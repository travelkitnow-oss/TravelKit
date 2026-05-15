import { useState, useEffect } from 'react';
import { logger } from '../../../lib/logger';
import { Trash2, Terminal, Search, Filter, AlertCircle, CheckCircle, Info, AlertTriangle } from 'lucide-react';
import './Logs.css';

interface LogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'success';
  category: string;
  message: string;
  details?: any;
}

export default function Logs() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [search, setSearch] = useState<string>('');

  useEffect(() => {
    // Initial local load
    setLogs(logger.getLogs());
    
    // Fetch from Supabase for global logs
    logger.fetchLogsFromSupabase();

    const unsubscribe = logger.subscribe((newLogs) => {
      setLogs(newLogs);
    });
    return unsubscribe;
  }, []);

  const filteredLogs = logs.filter(log => {
    if (!log) return false;
    const matchesFilter = filter === 'all' || log.level === filter;
    const message = log.message || '';
    const category = log.category || '';
    const matchesSearch = message.toLowerCase().includes(search.toLowerCase()) || 
                         category.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const clearLogs = () => {
    if (window.confirm('¿Estás seguro de que quieres borrar todos los logs de Supabase? Esta acción afectará a todos los administradores.')) {
      logger.clearSupabaseLogs();
      logger.clearLogs();
    }
  };

  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'error': return <AlertCircle size={16} className="log-icon error" />;
      case 'warn': return <AlertTriangle size={16} className="log-icon warn" />;
      case 'success': return <CheckCircle size={16} className="log-icon success" />;
      default: return <Info size={16} className="log-icon info" />;
    }
  };

  const formatTimestamp = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  };

  return (
    <div className="logs-container">
      <div className="logs-header">
        <div className="header-title">
          <Terminal size={24} />
          <h1>Consola del Sistema</h1>
        </div>
        <div className="header-actions">
          <button onClick={clearLogs} className="btn-secondary danger">
            <Trash2 size={18} />
            Borrar Todo
          </button>
        </div>
      </div>

      <div className="logs-toolbar">
        <div className="search-box">
          <Search size={18} />
          <input 
            type="text" 
            placeholder="Buscar en logs..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="filter-group">
          <Filter size={18} />
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="all">Todos los niveles</option>
            <option value="info">Información</option>
            <option value="success">Éxitos</option>
            <option value="warn">Advertencias</option>
            <option value="error">Errores</option>
          </select>
        </div>
      </div>

      <div className="logs-list-wrapper">
        <div className="logs-list">
          {filteredLogs.length === 0 ? (
            <div className="no-logs">
              <Terminal size={48} />
              <p>No se encontraron eventos en el sistema</p>
            </div>
          ) : (
            filteredLogs.map((log) => (
              <div key={log.id} className={`log-entry ${log.level || 'info'}`}>
                <div className="log-time">{formatTimestamp(log.timestamp)}</div>
                <div className="log-badge">{getLevelIcon(log.level || 'info')} {(log.level || 'info').toUpperCase()}</div>
                <div className="log-category">[{log.category || 'System'}]</div>
                <div className="log-message">{log.message || 'Sin mensaje'}</div>
                {log.details && (
                  <details className="log-details">
                    <summary>Ver detalles</summary>
                    <pre>{JSON.stringify(log.details, null, 2)}</pre>
                  </details>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

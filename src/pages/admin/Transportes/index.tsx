import { useState, useEffect } from 'react';
import { 
  Folder, 
  FolderPlus, 
  Plus, 
  Truck, 
  Notebook, 
  Trash2, 
  ChevronLeft,
  Edit2,
  Link as LinkIcon,
  DollarSign,
  Map
} from 'lucide-react';
import './Transportes.css';

interface TransportLink {
  label: string;
  url: string;
}

interface Transport {
  id: string;
  name: string;
  costUsd: number;
  origin: string;
  destination: string;
  description: string;
  notes: string;
  links: TransportLink[];
}

interface TransportFolder {
  id: string;
  name: string;
  transports: Transport[];
}

export default function TransportesPage() {
  const [folders, setFolders] = useState<TransportFolder[]>(() => {
    const saved = localStorage.getItem('travelkit_transport_folders');
    return saved ? JSON.parse(saved) : [];
  });

  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [dollarRate, setDollarRate] = useState<number>(0);

  // Modals
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [showTransportModal, setShowTransportModal] = useState(false);
  const [editingTransportId, setEditingTransportId] = useState<string | null>(null);

  // Form States
  const [newFolderName, setNewFolderName] = useState('');
  const [newTransport, setNewTransport] = useState<Partial<Transport>>({
    name: '', costUsd: 0, origin: '', destination: '', description: '', notes: '', links: []
  });

  useEffect(() => {
    localStorage.setItem('travelkit_transport_folders', JSON.stringify(folders));
  }, [folders]);

  useEffect(() => {
    fetch('https://dolarapi.com/v1/dolares/blue')
      .then(res => res.json())
      .then(data => setDollarRate(data.venta || 0))
      .catch(() => setDollarRate(0));
  }, []);

  const selectedFolder = folders.find(f => f.id === selectedFolderId);

  const handleAddFolder = () => {
    if (!newFolderName.trim()) return;
    const folder: TransportFolder = {
      id: `folder-${Date.now()}`,
      name: newFolderName.trim(),
      transports: []
    };
    setFolders([...folders, folder]);
    setNewFolderName('');
    setShowFolderModal(false);
  };

  const handleDeleteFolder = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('¿Eliminar esta carpeta y todos sus transportes?')) {
      setFolders(folders.filter(f => f.id !== id));
      if (selectedFolderId === id) setSelectedFolderId(null);
    }
  };

  const handleAddTransport = () => {
    if (!selectedFolderId || !newTransport.name) return;

    if (editingTransportId) {
      setFolders(folders.map(f => {
        if (f.id === selectedFolderId) {
          return {
            ...f,
            transports: f.transports.map(t =>
              t.id === editingTransportId ? { ...t, ...newTransport as Transport } : t
            )
          };
        }
        return f;
      }));
    } else {
      const transport: Transport = {
        id: `tr-${Date.now()}`,
        name: newTransport.name || '',
        costUsd: Number(newTransport.costUsd) || 0,
        origin: newTransport.origin || '',
        destination: newTransport.destination || '',
        description: newTransport.description || '',
        notes: newTransport.notes || '',
        links: newTransport.links || []
      };
      setFolders(folders.map(f => {
        if (f.id === selectedFolderId) {
          return { ...f, transports: [...f.transports, transport] };
        }
        return f;
      }));
    }

    setNewTransport({ name: '', costUsd: 0, origin: '', destination: '', description: '', notes: '', links: [] });
    setEditingTransportId(null);
    setShowTransportModal(false);
  };

  const handleDeleteTransport = (id: string) => {
    if (!selectedFolderId) return;
    setFolders(folders.map(f => {
      if (f.id === selectedFolderId) {
        return { ...f, transports: f.transports.filter(t => t.id !== id) };
      }
      return f;
    }));
  };

  const openEditModal = (t: Transport) => {
    setNewTransport(t);
    setEditingTransportId(t.id);
    setShowTransportModal(true);
  };

  const openCreateModal = () => {
    setNewTransport({ name: '', costUsd: 0, origin: '', destination: '', description: '', notes: '', links: [] });
    setEditingTransportId(null);
    setShowTransportModal(true);
  };

  return (
    <div className="transportes-page animate-fade-in">
      <header className="page-header-centered">
        <h1>Catálogo de Transportes</h1>
        <p>Organiza las opciones de traslado por destino y consultá los precios actualizados.</p>
      </header>

      {/* Dollar rate banner */}
      <div className="dollar-banner glass-card mb-4">
        <div>
          <div className="dollar-label">Dólar Blue (Venta)</div>
          <div className="dollar-value">${dollarRate.toLocaleString('es-AR')}</div>
        </div>
        <span className="dollar-note">Cotización en tiempo real para conversiones ARS</span>
      </div>

      {!selectedFolderId ? (
        // Folders Grid
        <div>
          <div className="folders-header">
            <h2 className="section-title">Destinos</h2>
            <button className="btn btn-primary" onClick={() => setShowFolderModal(true)}>
              <FolderPlus size={18} />
              Nueva Carpeta
            </button>
          </div>

          {folders.length === 0 ? (
            <div className="empty-state-card glass-card">
              <Truck size={80} strokeWidth={1} />
              <h3>Sin destinos aún</h3>
              <p>Crea tu primera carpeta para organizar los transportes.</p>
              <button className="btn btn-primary mt-4" onClick={() => setShowFolderModal(true)}>
                <FolderPlus size={18} /> Crear Carpeta
              </button>
            </div>
          ) : (
            <div className="folders-grid">
              {folders.map(folder => (
                <div
                  key={folder.id}
                  className="folder-card glass-card"
                  onClick={() => setSelectedFolderId(folder.id)}
                >
                  <div className="folder-icon-wrapper">
                    <Folder size={64} fill="currentColor" />
                  </div>
                  <span className="folder-name">{folder.name}</span>
                  <span className="text-xs text-secondary">{folder.transports.length} transportes</span>
                  <button
                    className="btn-delete-folder mt-2"
                    onClick={(e) => handleDeleteFolder(folder.id, e)}
                    title="Eliminar carpeta"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        // Folder Detail
        <div>
          <div className="folder-detail-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
              <button className="btn-icon-sm" onClick={() => setSelectedFolderId(null)} style={{ background: 'white', boxShadow: 'var(--shadow-sm)' }}>
                <ChevronLeft size={20} />
              </button>
              <h2 className="m-0" style={{ fontWeight: 700, fontSize: '2.2rem', letterSpacing: '-0.02em' }}>{selectedFolder?.name}</h2>
            </div>
            <button className="btn btn-primary" onClick={openCreateModal}>
              <Plus size={18} />
              Nuevo Transporte
            </button>
          </div>

          <div className="folder-detail-container">
            <div className="excursions-list">
              {selectedFolder?.transports.length === 0 ? (
                <div className="empty-state-card">
                  <Truck size={80} strokeWidth={1} />
                  <h3>No hay transportes</h3>
                  <p>Agrega opciones de traslado para {selectedFolder?.name}.</p>
                </div>
              ) : (
                selectedFolder?.transports.map(tr => (
                  <div key={tr.id} className="glass-card excursion-item">
                    <div className="excursion-header">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <h3 className="excursion-title">{tr.name}</h3>
                        <div className="excursion-costs">
                          <span className="cost-usd">u$s {tr.costUsd}</span>
                          <span className="cost-ars">≈ ${(tr.costUsd * dollarRate).toLocaleString('es-AR')}</span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button className="btn-edit-excursion" onClick={() => openEditModal(tr)} title="Editar">
                          <Edit2 size={16} />
                        </button>
                        <button className="btn-delete-excursion" onClick={() => handleDeleteTransport(tr.id)} title="Eliminar">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>

                    <div className="excursion-links">
                      {tr.links.map((link, i) => (
                        <a key={i} href={link.url} target="_blank" rel="noopener noreferrer" className="excursion-link">
                          <LinkIcon size={12} />
                          {link.label}
                        </a>
                      ))}
                    </div>

                    <div className="excursion-content-compact">
                      {(tr.origin || tr.destination) && (
                        <div className="itinerary-box" style={{ marginBottom: '0.5rem' }}>
                          <span style={{ fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--color-secondary)', marginRight: '0.5rem' }}>Recorrido:</span>
                          {[tr.origin, tr.destination].filter(Boolean).join(' → ')}
                        </div>
                      )}
                      <div className="itinerary-box">
                        <span style={{ fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--color-secondary)', marginRight: '1rem' }}>
                          Descripción:
                        </span>
                        {tr.description || 'Sin descripción.'}
                      </div>

                      {tr.notes && (
                        <div className="mt-2 text-sm" style={{ color: 'var(--color-secondary)', paddingLeft: '1rem' }}>
                          <strong className="text-primary" style={{ fontSize: '0.7rem', textTransform: 'uppercase' }}>Notas:</strong> {tr.notes}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="folder-info-card glass-card">
              <h4>Resumen de Destino</h4>
              <div className="folder-stats">
                <div className="stat-row">
                  <span className="stat-label">Total Transportes</span>
                  <span className="stat-label">{selectedFolder?.transports.length}</span>
                </div>
                <div className="stat-row">
                  <span className="stat-label">Costo Promedio</span>
                  <span className="stat-value highlight">
                    u$s {selectedFolder?.transports.length
                      ? Math.round(selectedFolder.transports.reduce((a, t) => a + t.costUsd, 0) / selectedFolder.transports.length)
                      : 0}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New Folder Modal */}
      {showFolderModal && (
        <div className="modal-overlay">
          <div className="modal-content glass-card p-5" style={{ maxWidth: '450px' }}>
            <h3 className="m-0 mb-4" style={{ fontFamily: 'var(--font-main)', fontWeight: 800 }}>Nueva Carpeta de Destino</h3>
            <div className="form-group">
              <label>Nombre del Destino</label>
              <input
                type="text"
                className="form-input"
                value={newFolderName}
                onChange={e => setNewFolderName(e.target.value)}
                placeholder="Ej: Buenos Aires"
                onKeyDown={e => e.key === 'Enter' && handleAddFolder()}
                autoFocus
              />
            </div>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
              <button className="btn btn-outline w-100" onClick={() => setShowFolderModal(false)}>Cancelar</button>
              <button className="btn btn-primary w-100" onClick={handleAddFolder}>Crear Carpeta</button>
            </div>
          </div>
        </div>
      )}

      {/* New/Edit Transport Modal */}
      {showTransportModal && (
        <div className="modal-overlay">
          <div className="modal-content glass-card p-5" style={{ maxWidth: '600px' }}>
            <div className="modal-header-premium mb-4">
              <h3 className="m-0" style={{ fontFamily: 'var(--font-main)', fontWeight: 800, fontSize: '1.75rem' }}>
                {editingTransportId ? 'Editar Transporte' : 'Nuevo Transporte'}
              </h3>
              <span className="destination-badge">{selectedFolder?.name}</span>
            </div>
            <div className="modal-form">
              <div className="form-group">
                <label>Nombre del Transporte</label>
                <div className="input-with-icon">
                  <Truck size={16} />
                  <input
                    type="text"
                    className="form-input"
                    value={newTransport.name || ''}
                    onChange={e => setNewTransport({ ...newTransport, name: e.target.value })}
                    placeholder="Ej: Transfer aeropuerto - hotel"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Costo en Dólares (U$S)</label>
                <div className="input-with-icon">
                  <DollarSign size={16} />
                  <input
                    type="number"
                    className="form-input"
                    value={newTransport.costUsd || 0}
                    onChange={e => setNewTransport({ ...newTransport, costUsd: parseFloat(e.target.value) })}
                  />
                </div>
              </div>

              <div className="grid-2 gap-3">
                <div className="form-group">
                  <label>Origen</label>
                  <div className="input-with-icon">
                    <Map size={16} />
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Ej: Aeropuerto Ezeiza"
                      value={newTransport.origin || ''}
                      onChange={e => setNewTransport({ ...newTransport, origin: e.target.value })}
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label>Destino</label>
                  <div className="input-with-icon">
                    <Map size={16} />
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Ej: Hotel Sheraton"
                      value={newTransport.destination || ''}
                      onChange={e => setNewTransport({ ...newTransport, destination: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label>Descripción / Detalles</label>
                <div className="input-with-icon align-start">
                  <Notebook size={16} />
                  <textarea
                    className="form-input"
                    style={{ height: '80px', paddingTop: '0.875rem' }}
                    value={newTransport.description || ''}
                    onChange={e => setNewTransport({ ...newTransport, description: e.target.value })}
                    placeholder="Tipo de vehículo, capacidad, recorrido..."
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Notas Adicionales</label>
                <div className="input-with-icon align-start">
                  <Notebook size={16} />
                  <textarea
                    className="form-input"
                    style={{ height: '80px', paddingTop: '0.875rem' }}
                    value={newTransport.notes || ''}
                    onChange={e => setNewTransport({ ...newTransport, notes: e.target.value })}
                    placeholder="Información extra, condiciones, contacto..."
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                <button className="btn btn-outline w-100" onClick={() => setShowTransportModal(false)}>Cancelar</button>
                <button className="btn btn-primary w-100" onClick={handleAddTransport}>
                  {editingTransportId ? 'Guardar Cambios' : 'Guardar Transporte'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

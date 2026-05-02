import { useState, useEffect } from 'react';
import { 
  Folder, 
  FolderPlus, 
  Plus, 
  DollarSign, 
  Map, 
  MapPin,
  Notebook, 
  Trash2, 
  ChevronLeft,
  RefreshCw,
  Edit2,
  Link as LinkIcon
} from 'lucide-react';
import './Excursiones.css';

interface ExcursionLink {
  label: string;
  url: string;
}

interface Excursion {
  id: string;
  name: string;
  costUsd: number;
  location: string;
  itinerary: string;
  notes: string;
  links: ExcursionLink[];
}

interface ExcursionFolder {
  id: string;
  name: string;
  excursions: Excursion[];
}

export default function ExcursionesPage() {
  const [folders, setFolders] = useState<ExcursionFolder[]>(() => {
    const saved = localStorage.getItem('travelkit_excursion_folders');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [dollarRate, setDollarRate] = useState<number>(0);
  const [isLoadingDollar, setIsLoadingDollar] = useState(true);
  
  // Modals
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [showExcursionModal, setShowExcursionModal] = useState(false);
  const [editingExcursionId, setEditingExcursionId] = useState<string | null>(null);
  
  // Form States
  const [newFolderName, setNewFolderName] = useState('');
  const [newExcursion, setNewExcursion] = useState<Partial<Excursion>>({
    name: '',
    costUsd: 0,
    location: '',
    itinerary: '',
    notes: '',
    links: []
  });

  const selectedFolder = folders.find(f => f.id === selectedFolderId);

  useEffect(() => {
    localStorage.setItem('travelkit_excursion_folders', JSON.stringify(folders));
  }, [folders]);

  const fetchDollarRate = async () => {
    setIsLoadingDollar(true);
    try {
      const response = await fetch('https://dolarapi.com/v1/dolares/blue');
      const data = await response.json();
      setDollarRate(data.venta);
    } catch (error) {
      console.error("Error fetching dollar:", error);
      setDollarRate(1000); // Fallback
    } finally {
      setIsLoadingDollar(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchDollarRate();
  }, []);

  const handleCreateFolder = () => {
    if (!newFolderName.trim()) return;
    const newFolder: ExcursionFolder = {
      id: `folder-${Date.now()}`,
      name: newFolderName,
      excursions: []
    };
    setFolders([...folders, newFolder]);
    setNewFolderName('');
    setShowFolderModal(false);
  };

  const handleAddExcursion = () => {
    if (!selectedFolderId || !newExcursion.name) return;
    
    if (editingExcursionId) {
      // Update existing
      setFolders(folders.map(f => {
        if (f.id === selectedFolderId) {
          return {
            ...f,
            excursions: f.excursions.map(e => 
              e.id === editingExcursionId ? { ...e, ...newExcursion as Excursion } : e
            )
          };
        }
        return f;
      }));
    } else {
      // Create new
      const excursion: Excursion = {
        id: `exc-${Date.now()}`,
        name: newExcursion.name || '',
        costUsd: Number(newExcursion.costUsd) || 0,
        location: newExcursion.location || '',
        itinerary: newExcursion.itinerary || '',
        notes: newExcursion.notes || '',
        links: newExcursion.links || []
      };

      setFolders(folders.map(f => {
        if (f.id === selectedFolderId) {
          return { ...f, excursions: [...f.excursions, excursion] };
        }
        return f;
      }));
    }

    setNewExcursion({ name: '', costUsd: 0, location: '', itinerary: '', notes: '', links: [] });
    setEditingExcursionId(null);
    setShowExcursionModal(false);
  };

  const openEditModal = (exc: Excursion) => {
    setNewExcursion(exc);
    setEditingExcursionId(exc.id);
    setShowExcursionModal(true);
  };

  const openCreateModal = () => {
    setNewExcursion({ name: '', costUsd: 0, itinerary: '', notes: '', links: [] });
    setEditingExcursionId(null);
    setShowExcursionModal(true);
  };

  const handleDeleteFolder = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('¿Eliminar esta carpeta y todas sus excursiones?')) {
      setFolders(folders.filter(f => f.id !== id));
      if (selectedFolderId === id) setSelectedFolderId(null);
    }
  };

  const handleDeleteExcursion = (excId: string) => {
    if (!selectedFolderId) return;
    setFolders(folders.map(f => {
      if (f.id === selectedFolderId) {
        return { ...f, excursions: f.excursions.filter(e => e.id !== excId) };
      }
      return f;
    }));
  };

  return (
    <div className="excursiones-page animate-fade-in">
      <header className="page-header-centered">
        <h1>Catálogo de Excursiones</h1>
        <p>Organiza actividades por destino, gestiona costos en dólares y mantén itinerarios actualizados.</p>
      </header>

      {/* Dollar Bar */}
      <div className="dollar-info-bar">
        <div className="dollar-rate">
          <div className="rate-item">
            <span className="label">Dólar Blue (Venta)</span>
            <div className="value">
              {isLoadingDollar ? <RefreshCw className="animate-spin" size={18} /> : `$${dollarRate}`}
            </div>
          </div>
          <button className="btn-icon-sm" onClick={fetchDollarRate} title="Actualizar cotización">
            <RefreshCw size={14} />
          </button>
        </div>
        <div className="text-sm opacity-80">
          Cotización en tiempo real para conversiones ARS
        </div>
      </div>

      {!selectedFolderId ? (
        <div className="folders-view">
          <div className="section-header mb-4">
            <h3>Mis Destinos</h3>
            <button className="btn btn-primary" onClick={() => setShowFolderModal(true)}>
              <FolderPlus size={18} />
              Nueva Carpeta
            </button>
          </div>

          <div className="folders-grid">
            {folders.map(folder => (
              <div 
                key={folder.id} 
                className="glass-card folder-card"
                onClick={() => setSelectedFolderId(folder.id)}
              >
                <div className="folder-icon-wrapper">
                  <Folder size={64} fill="currentColor" />
                </div>
                <span className="folder-name">{folder.name}</span>
                <span className="text-xs text-secondary">{folder.excursions.length} excursiones</span>
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
        </div>
      ) : (
        <div className="folder-detail-view animate-slide-up">
          <div className="section-header mb-4">
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
              <button className="btn-icon-sm" onClick={() => setSelectedFolderId(null)} style={{ background: 'white', boxShadow: 'var(--shadow-sm)' }}>
                <ChevronLeft size={20} />
              </button>
              <h2 className="m-0" style={{ fontWeight: 700, fontSize: '2.2rem', letterSpacing: '-0.02em' }}>{selectedFolder?.name}</h2>
            </div>
            <button className="btn btn-primary" onClick={openCreateModal}>
              <Plus size={18} />
              Nueva Excursión
            </button>
          </div>

          <div className="folder-detail-container">
            <div className="excursions-list">
              {selectedFolder?.excursions.length === 0 ? (
                <div className="empty-state-card">
                  <Map size={80} strokeWidth={1} />
                  <h3>No hay excursiones</h3>
                  <p>Comienza agregando tu primera actividad para {selectedFolder?.name}.</p>
                </div>
              ) : (
                selectedFolder?.excursions.map(exc => (
                  <div key={exc.id} className="glass-card excursion-item">
                    <div className="excursion-header">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <h3 className="excursion-title">{exc.name}</h3>
                        <div className="excursion-costs">
                          <span className="cost-usd">u$s {exc.costUsd}</span>
                          <span className="cost-ars">≈ ${(exc.costUsd * dollarRate).toLocaleString('es-AR')}</span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button className="btn-edit-excursion" onClick={() => openEditModal(exc)} title="Editar">
                          <Edit2 size={16} />
                        </button>
                        <button className="btn-delete-excursion" onClick={() => handleDeleteExcursion(exc.id)} title="Eliminar">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>

                    <div className="excursion-links">
                      {exc.links.map((link, i) => (
                        <a key={i} href={link.url} target="_blank" rel="noopener noreferrer" className="excursion-link">
                          <LinkIcon size={12} />
                          {link.label}
                        </a>
                      ))}
                    </div>

                    <div className="excursion-content-compact">
                      {exc.location && (
                        <div className="itinerary-box" style={{ marginBottom: '0.5rem' }}>
                          <span style={{ fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--color-secondary)', marginRight: '1rem' }}>
                            Lugar:
                          </span>
                          {exc.location}
                        </div>
                      )}
                      <div className="itinerary-box">
                        <span style={{ fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--color-secondary)', marginRight: '1rem' }}>
                          Itinerario:
                        </span>
                        {exc.itinerary || 'Sin itinerario.'}
                      </div>
                      
                      {exc.notes && (
                        <div className="mt-2 text-sm" style={{ color: 'var(--color-secondary)', paddingLeft: '1rem' }}>
                          <strong className="text-primary" style={{ fontSize: '0.7rem', textTransform: 'uppercase' }}>Notas:</strong> {exc.notes}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="folder-sidebar">
              <div className="glass-card folder-info-card">
                <h4>Resumen de Destino</h4>
                <div className="folder-stats">
                  <div className="stat-row">
                    <span className="stat-label">Total Excursiones</span>
                    <span className="stat-value">{selectedFolder?.excursions.length}</span>
                  </div>
                  <div className="stat-row">
                    <span className="stat-label">Costo Promedio</span>
                    <span className="stat-value highlight">
                      u$s {selectedFolder?.excursions.length ? 
                        (selectedFolder.excursions.reduce((a, b) => a + b.costUsd, 0) / selectedFolder.excursions.length).toFixed(0) : 0}
                    </span>
                  </div>
                </div>
                <div className="mt-4 p-3 bg-accent-light rounded text-xs text-accent-dark" style={{ border: '1px solid rgba(var(--color-accent-rgb), 0.2)', lineHeight: '1.5' }}>
                  * Los precios en pesos se calculan automáticamente con el dólar blue del día para facilitar tus presupuestos.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {showFolderModal && (
        <div className="modal-overlay">
          <div className="modal-content glass-card p-4" style={{ maxWidth: '400px' }}>
            <h3 className="mb-4">Nueva Carpeta de Destino</h3>
            <div className="form-group mb-4">
              <label>Nombre del Destino (ej: Brasil)</label>
              <input 
                type="text" 
                className="form-input" 
                value={newFolderName}
                onChange={e => setNewFolderName(e.target.value)}
                placeholder="Nombre del país o ciudad..."
                autoFocus
              />
            </div>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button className="btn btn-outline w-100" onClick={() => setShowFolderModal(false)}>Cancelar</button>
              <button className="btn btn-primary w-100" onClick={handleCreateFolder}>Crear Carpeta</button>
            </div>
          </div>
        </div>
      )}

      {showExcursionModal && (
        <div className="modal-overlay">
          <div className="modal-content glass-card p-5" style={{ maxWidth: '600px' }}>
            <div className="modal-header-premium mb-4">
              <h3 className="m-0" style={{ fontFamily: 'var(--font-main)', fontWeight: 800, fontSize: '1.75rem' }}>
                {editingExcursionId ? 'Editar Excursión' : 'Nueva Excursión'}
              </h3>
              <span className="destination-badge">{selectedFolder?.name}</span>
            </div>
            <div className="modal-form">
              <div className="form-group">
                <label>Nombre de la Excursión</label>
                <div className="input-with-icon">
                  <Plus size={16} />
                  <input 
                    type="text" 
                    className="form-input" 
                    value={newExcursion.name}
                    onChange={e => setNewExcursion({...newExcursion, name: e.target.value})}
                    placeholder="Ej: Tour por el Cristo Redentor"
                  />
                </div>
              </div>
              
              <div className="form-group">
                <label>Costo en Dólares (u$s)</label>
                <div className="input-with-icon">
                  <DollarSign size={16} />
                  <input 
                    type="number" 
                    className="form-input" 
                    value={newExcursion.costUsd}
                    onChange={e => setNewExcursion({...newExcursion, costUsd: Number(e.target.value)})}
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Lugar de la excursión</label>
                <div className="input-with-icon">
                  <MapPin size={16} />
                  <input 
                    type="text" 
                    className="form-input" 
                    value={newExcursion.location || ''}
                    onChange={e => setNewExcursion({...newExcursion, location: e.target.value})}
                    placeholder="Ej: Parque Nacional Torres del Paine"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Itinerario Base / Pasos</label>
                <div className="input-with-icon align-start">
                  <Map size={16} />
                  <textarea 
                    className="form-input" 
                    style={{ height: '120px', paddingTop: '0.875rem' }}
                    value={newExcursion.itinerary}
                    onChange={e => setNewExcursion({...newExcursion, itinerary: e.target.value})}
                    placeholder="Describe los pasos o el cronograma de la excursión..."
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Notas Adicionales</label>
                <div className="input-with-icon align-start">
                  <Notebook size={16} />
                  <textarea 
                    className="form-input" 
                    style={{ height: '100px', paddingTop: '0.875rem' }}
                    value={newExcursion.notes}
                    onChange={e => setNewExcursion({...newExcursion, notes: e.target.value})}
                    placeholder="Información extra, recomendaciones..."
                  />
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
              <button className="btn btn-outline w-100" onClick={() => setShowExcursionModal(false)}>Cancelar</button>
              <button className="btn btn-primary w-100" onClick={handleAddExcursion}>
                {editingExcursionId ? 'Guardar Cambios' : 'Guardar Excursión'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

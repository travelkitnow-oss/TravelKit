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
import { supabase } from '../../../lib/supabase';
import './Excursiones.css';

interface ExcursionLink {
  label: string;
  url: string;
}

interface Excursion {
  id: string;
  folder_id: string;
  name: string;
  cost_usd: number;
  location: string;
  description: string;
  notes: string;
  links: ExcursionLink[];
}

interface ExcursionFolder {
  id: string;
  name: string;
  excursions: Excursion[];
}

export default function ExcursionesPage() {
  const [folders, setFolders] = useState<ExcursionFolder[]>([]);
  const [loading, setLoading] = useState(true);
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
    name: '', cost_usd: 0, location: '', description: '', notes: '', links: []
  });

  useEffect(() => {
    fetchFolders();
  }, []);

  const fetchDollarRate = async () => {
    setIsLoadingDollar(true);
    try {
      const response = await fetch('https://dolarapi.com/v1/dolares/blue');
      const data = await response.json();
      setDollarRate(data.venta);
    } catch (error) {
      console.error("Error fetching dollar:", error);
      setDollarRate(1000); 
    } finally {
      setIsLoadingDollar(false);
    }
  };

  useEffect(() => {
    fetchDollarRate();
  }, []);

  const fetchFolders = async () => {
    setLoading(true);
    const { data: folderData, error: folderError } = await supabase
      .from('catalog_folders')
      .select('*')
      .eq('type', 'excursion')
      .order('name');

    if (folderError) {
      console.error('Error fetching folders:', folderError);
      setLoading(false);
      return;
    }

    if (folderData.length === 0) {
      setFolders([]);
      setLoading(false);
      return;
    }

    const { data: itemData, error: itemError } = await supabase
      .from('catalog_items')
      .select('*')
      .in('folder_id', folderData.map(f => f.id));

    if (itemError) console.error('Error fetching items:', itemError);

    const combined: ExcursionFolder[] = folderData.map(f => ({
      id: f.id,
      name: f.name,
      excursions: (itemData || [])
        .filter(i => i.folder_id === f.id)
        .map(i => ({
          id: i.id,
          folder_id: i.folder_id,
          name: i.name,
          cost_usd: i.cost_usd,
          location: i.location,
          description: i.description,
          notes: i.notes,
          links: i.links || []
        }))
    }));

    setFolders(combined);
    setLoading(false);
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    const { data, error } = await supabase
      .from('catalog_folders')
      .insert([{ name: newFolderName.trim(), type: 'excursion' }])
      .select();

    if (error) {
      alert('Error al crear carpeta');
    } else if (data) {
      setFolders([...folders, { id: data[0].id, name: data[0].name, excursions: [] }]);
      setNewFolderName('');
      setShowFolderModal(false);
    }
  };

  const handleDeleteFolder = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('¿Eliminar esta carpeta y todas sus excursiones?')) {
      const { error } = await supabase.from('catalog_folders').delete().eq('id', id);
      if (!error) {
        setFolders(folders.filter(f => f.id !== id));
        if (selectedFolderId === id) setSelectedFolderId(null);
      }
    }
  };

  const handleAddExcursion = async () => {
    if (!selectedFolderId || !newExcursion.name) return;

    const dbData = {
      folder_id: selectedFolderId,
      name: newExcursion.name,
      cost_usd: Number(newExcursion.cost_usd) || 0,
      location: newExcursion.location || '',
      description: newExcursion.description || '',
      notes: newExcursion.notes || '',
      links: newExcursion.links || []
    };

    if (editingExcursionId) {
      const { error } = await supabase.from('catalog_items').update(dbData).eq('id', editingExcursionId);
      if (error) alert('Error al actualizar excursión');
      else {
        fetchFolders();
        setShowExcursionModal(false);
      }
    } else {
      const { error } = await supabase.from('catalog_items').insert([dbData]);
      if (error) alert('Error al guardar excursión');
      else {
        fetchFolders();
        setShowExcursionModal(false);
      }
    }
  };

  const handleDeleteExcursion = async (id: string) => {
    if (window.confirm('¿Eliminar esta excursión?')) {
      const { error } = await supabase.from('catalog_items').delete().eq('id', id);
      if (!error) fetchFolders();
    }
  };

  const selectedFolder = folders.find(f => f.id === selectedFolderId);

  const openEditModal = (exc: Excursion) => {
    setNewExcursion(exc);
    setEditingExcursionId(exc.id);
    setShowExcursionModal(true);
  };

  const openCreateModal = () => {
    setNewExcursion({ name: '', cost_usd: 0, location: '', description: '', notes: '', links: [] });
    setEditingExcursionId(null);
    setShowExcursionModal(true);
  };

  return (
    <div className="excursiones-page animate-fade-in">
      <header className="page-header-centered">
        <h1>Catálogo de Excursiones</h1>
        <p>Gestiona los tours y actividades disponibles para tus clientes.</p>
      </header>

      {/* Dollar rate banner */}
      <div className="dollar-info-bar mb-4">
        <div className="dollar-rate">
          <div className="rate-item">
            <span className="label">Dólar Blue</span>
            <span className="value">
              {isLoadingDollar ? '...' : `$${dollarRate.toLocaleString('es-AR')}`}
            </span>
          </div>
          <button className="btn-refresh" onClick={fetchDollarRate} title="Actualizar cotización">
            <RefreshCw size={14} className={isLoadingDollar ? 'animate-spin' : ''} />
          </button>
        </div>
        <span style={{ fontSize: '0.8rem', opacity: 0.8 }}>Conversión automática a ARS</span>
      </div>

      {!selectedFolderId ? (
        <div>
          <div className="folders-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
            <h2 className="section-title">Carpetas de Excursiones</h2>
            <button className="btn btn-primary" onClick={() => setShowFolderModal(true)}>
              <FolderPlus size={18} />
              Nueva Carpeta
            </button>
          </div>

          {loading ? (
            <div className="p-5 text-center">
              <div className="loader-premium"></div>
              <p className="mt-3">Cargando excursiones...</p>
            </div>
          ) : folders.length === 0 ? (
            <div className="empty-state-card glass-card">
              <MapPin size={80} strokeWidth={1} />
              <h3>Sin carpetas aún</h3>
              <p>Crea tu primera carpeta para organizar las excursiones por destino.</p>
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
                  <span className="folder-count">{folder.excursions.length} excursiones</span>
                  <button
                    className="btn-delete-folder mt-2"
                    onClick={(e) => handleDeleteFolder(folder.id, e)}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div>
          <div className="folder-detail-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
              <button className="btn-icon" onClick={() => setSelectedFolderId(null)}>
                <ChevronLeft size={20} />
              </button>
              <h2 className="m-0" style={{ fontWeight: 800, fontSize: '2rem' }}>{selectedFolder?.name}</h2>
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
                  <p>Agrega tours y actividades para {selectedFolder?.name}.</p>
                </div>
              ) : (
                selectedFolder?.excursions.map(excursion => (
                  <div key={excursion.id} className="excursion-item glass-card">
                    <div className="excursion-header">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <h3 className="excursion-title">{excursion.name}</h3>
                        <div className="excursion-costs">
                          <span className="cost-usd">u$s {excursion.cost_usd}</span>
                          <span className="cost-ars">≈ ${(excursion.cost_usd * dollarRate).toLocaleString('es-AR')}</span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button className="btn-edit-excursion" onClick={() => openEditModal(excursion)}>
                          <Edit2 size={16} />
                        </button>
                        <button className="btn-delete-excursion" onClick={() => handleDeleteExcursion(excursion.id)}>
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>

                    <div className="excursion-links">
                      {excursion.links.map((link, i) => (
                        <a key={i} href={link.url} target="_blank" rel="noopener noreferrer" className="excursion-link">
                          <LinkIcon size={12} />
                          {link.label}
                        </a>
                      ))}
                    </div>

                    <div className="excursion-content-compact">
                      <div className="info-box mb-3">
                        <MapPin size={14} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />
                        <strong>Ubicación:</strong> {excursion.location || 'N/A'}
                      </div>
                      
                      <div className="info-box">
                        <Notebook size={14} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />
                        <strong>Itinerario / Descripción:</strong> {excursion.description || 'Sin descripción.'}
                      </div>

                      {excursion.notes && (
                        <div className="mt-2 text-sm" style={{ paddingLeft: '1rem', borderLeft: '2px solid var(--color-accent)' }}>
                          <strong>Notas:</strong> {excursion.notes}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* New Folder Modal */}
      {showFolderModal && (
        <div className="modal-overlay">
          <div className="modal-content glass-card p-5" style={{ maxWidth: '450px' }}>
            <h3 className="m-0 mb-4" style={{ fontFamily: 'var(--font-main)', fontWeight: 800 }}>Nueva Carpeta</h3>
            <div className="form-group">
              <label>Nombre del Destino / Categoría</label>
              <input
                type="text"
                className="form-input"
                value={newFolderName}
                onChange={e => setNewFolderName(e.target.value)}
                placeholder="Ej: Tours en Madrid"
                autoFocus
              />
            </div>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
              <button className="btn btn-outline w-100" onClick={() => setShowFolderModal(false)}>Cancelar</button>
              <button className="btn btn-primary w-100" onClick={handleCreateFolder}>Crear Carpeta</button>
            </div>
          </div>
        </div>
      )}

      {/* New/Edit Excursion Modal */}
      {showExcursionModal && (
        <div className="modal-overlay">
          <div className="modal-content glass-card p-5" style={{ maxWidth: '600px' }}>
            <h3 className="m-0 mb-4" style={{ fontFamily: 'var(--font-main)', fontWeight: 800, fontSize: '1.75rem' }}>
              {editingExcursionId ? 'Editar Excursión' : 'Nueva Excursión'}
            </h3>
            <div className="modal-form">
              <div className="form-group">
                <label>Nombre de la Excursión</label>
                <input
                  type="text"
                  className="form-input"
                  value={newExcursion.name || ''}
                  onChange={e => setNewExcursion({ ...newExcursion, name: e.target.value })}
                  placeholder="Ej: City Tour Madrid Histórico"
                />
              </div>

              <div className="grid-2 gap-4">
                <div className="form-group">
                  <label>Ubicación</label>
                  <input
                    type="text"
                    className="form-input"
                    value={newExcursion.location || ''}
                    onChange={e => setNewExcursion({ ...newExcursion, location: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Costo (U$S)</label>
                  <div className="input-with-icon">
                    <DollarSign size={16} />
                    <input
                      type="number"
                      className="form-input"
                      value={newExcursion.cost_usd || 0}
                      onChange={e => setNewExcursion({ ...newExcursion, cost_usd: parseFloat(e.target.value) })}
                    />
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label>Descripción / Itinerario</label>
                <textarea
                  className="form-input"
                  style={{ height: '80px' }}
                  value={newExcursion.description || ''}
                  onChange={e => setNewExcursion({ ...newExcursion, description: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Notas Internas</label>
                <textarea
                  className="form-input"
                  style={{ height: '60px' }}
                  value={newExcursion.notes || ''}
                  onChange={e => setNewExcursion({ ...newExcursion, notes: e.target.value })}
                />
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

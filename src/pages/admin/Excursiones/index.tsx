import { useState, useEffect, Fragment } from 'react';
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
  Move,
  Link as LinkIcon,
  Users,
  X
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import ConfirmationModal from '../../../components/ConfirmationModal/ConfirmationModal';
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
  pricing_type: 'per_person' | 'per_group';
  capacity: number;
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
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; folderId: string | null; folderName: string }>({
    isOpen: false,
    folderId: null,
    folderName: ''
  });
  const [currentPath, setCurrentPath] = useState<string[]>([]);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [movingExcursion, setMovingExcursion] = useState<Excursion | null>(null);
  
  // Form States
  const [newFolderName, setNewFolderName] = useState('');
  const [newExcursion, setNewExcursion] = useState<Partial<Excursion>>({
    name: '', cost_usd: 0, location: '', description: '', notes: '', links: [],
    pricing_type: 'per_person', capacity: 1
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
          links: i.links || [],
          pricing_type: i.pricing_type || 'per_person',
          capacity: i.capacity || 1
        }))
    }));

    setFolders(combined);
    setLoading(false);
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    const fullFolderName = currentPath.length > 0 
      ? `${currentPath.join(' / ')} / ${newFolderName.trim()}`
      : newFolderName.trim();

    const { data, error } = await supabase
      .from('catalog_folders')
      .insert([
        { name: fullFolderName, type: 'hotel' },
        { name: fullFolderName, type: 'transport' },
        { name: fullFolderName, type: 'excursion' }
      ])
      .select();

    if (error) {
      alert('Error al crear carpeta');
    } else if (data) {
      const currentTypeFolder = data.find(f => f.type === 'excursion');
      if (currentTypeFolder) {
        setFolders([...folders, { id: currentTypeFolder.id, name: currentTypeFolder.name, excursions: [] }]);
      }
      setNewFolderName('');
      setShowFolderModal(false);
    }
  };

  const handleDeleteFolder = async (id: string, e: React.MouseEvent, name: string) => {
    e.stopPropagation();
    setDeleteConfirm({ isOpen: true, folderId: id, folderName: name });
  };

  const confirmDeleteFolder = async () => {
    const id = deleteConfirm.folderId;
    if (!id) return;

    // Borramos items primero
    const { error: itemsError } = await supabase.from('catalog_items').delete().eq('folder_id', id);
    if (itemsError) {
      alert('Error al eliminar las excursiones de la carpeta: ' + itemsError.message);
      return;
    }

    const { error: folderError } = await supabase.from('catalog_folders').delete().eq('id', id);
    if (!folderError) {
      setFolders(folders.filter(f => f.id !== id));
      if (selectedFolderId === id) setSelectedFolderId(null);
    } else {
      alert('Error al eliminar la carpeta: ' + folderError.message);
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
      links: newExcursion.links || [],
      pricing_type: newExcursion.pricing_type || 'per_person',
      capacity: Number(newExcursion.capacity) || 1
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

  const handleMoveExcursion = async (targetFolderId: string) => {
    if (!movingExcursion) return;
    const { error } = await supabase
      .from('catalog_items')
      .update({ folder_id: targetFolderId })
      .eq('id', movingExcursion.id);

    if (error) {
      alert('Error al mover excursión');
    } else {
      fetchFolders();
      setShowMoveModal(false);
      setMovingExcursion(null);
    }
  };

  const selectedFolder = folders.find(f => f.id === selectedFolderId);

  // Lógica para carpetas anidadas
  const getDisplayName = (fullName: string) => {
    const parts = fullName.split(' / ');
    return parts[parts.length - 1];
  };

  const getParentPath = (fullName: string) => {
    const parts = fullName.split(' / ');
    return parts.slice(0, -1).join(' / ');
  };

  const currentPathString = currentPath.join(' / ');
  
  const currentFolders = folders.filter(f => {
    const parentPath = getParentPath(f.name);
    return parentPath === currentPathString;
  });

  const navigateToFolder = (folder: ExcursionFolder) => {
    const parts = folder.name.split(' / ');
    setCurrentPath(parts);
    setSelectedFolderId(folder.id);
  };

  const navigateToPath = (index: number) => {
    const newPath = currentPath.slice(0, index + 1);
    setCurrentPath(newPath);
    const pathStr = newPath.join(' / ');
    const folder = folders.find(f => f.name === pathStr);
    if (folder) setSelectedFolderId(folder.id);
    else setSelectedFolderId(null);
  };

  const goHome = () => {
    setCurrentPath([]);
    setSelectedFolderId(null);
  };

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

      {/* Breadcrumbs de Navegación */}
      <div className="breadcrumbs-container mb-4" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(31, 58, 77, 0.05)', padding: '0.75rem 1.25rem', borderRadius: '12px' }}>
        <button 
          className={`breadcrumb-item ${currentPath.length === 0 ? 'active' : ''}`} 
          onClick={goHome}
          style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: '0.9rem', fontWeight: currentPath.length === 0 ? 700 : 500, color: currentPath.length === 0 ? 'var(--color-primary)' : '#64748b' }}
        >
          Catálogo
        </button>
        {currentPath.map((part, index) => (
          <Fragment key={index}>
            <span style={{ color: '#cbd5e1' }}>/</span>
            <button 
              className={`breadcrumb-item ${index === currentPath.length - 1 ? 'active' : ''}`}
              onClick={() => navigateToPath(index)}
              style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: '0.9rem', fontWeight: index === currentPath.length - 1 ? 700 : 500, color: index === currentPath.length - 1 ? 'var(--color-primary)' : '#64748b' }}
            >
              {part}
            </button>
          </Fragment>
        ))}
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
          ) : currentFolders.length === 0 ? (
            <div className="empty-state-card glass-card">
              <MapPin size={80} strokeWidth={1} />
              <h3>Sin destinos aún</h3>
              <p>Crea tu primera carpeta para organizar las excursiones por destino.</p>
              <button className="btn btn-primary mt-4" onClick={() => setShowFolderModal(true)}>
                <FolderPlus size={18} /> Crear Carpeta
              </button>
            </div>
          ) : (
            <div className="folders-grid">
              {currentFolders.map(folder => (
                <div
                  key={folder.id}
                  className="folder-card glass-card"
                  onClick={() => navigateToFolder(folder)}
                >
                  <div className="folder-icon-wrapper">
                    <Folder size={64} fill="currentColor" />
                  </div>
                  <span className="folder-name">{getDisplayName(folder.name)}</span>
                  <span className="folder-count">{folder.excursions.length} excursiones</span>
                  <button
                    className="btn-delete-folder mt-2"
                    onClick={(e) => handleDeleteFolder(folder.id, e, folder.name)}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="folder-detail-view">
          <div className="folder-detail-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
              <button className="btn-icon" onClick={() => currentPath.length === 1 ? goHome() : navigateToPath(currentPath.length - 2)}>
                <ChevronLeft size={20} />
              </button>
              <h2 className="m-0" style={{ fontWeight: 800, fontSize: '2rem' }}>{selectedFolder ? getDisplayName(selectedFolder.name) : (currentPath[currentPath.length - 1] || '')}</h2>
            </div>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button className="btn btn-outline" onClick={() => setShowFolderModal(true)}>
                <Plus size={18} />
                Subcarpeta
              </button>
              <button className="btn btn-primary" onClick={openCreateModal}>
                <Plus size={18} />
                Nueva Excursión
              </button>
            </div>
          </div>

          {/* Subcarpetas dentro de la carpeta actual */}
          {currentFolders.length > 0 && (
            <div className="subfolders-section" style={{ marginBottom: '4rem', paddingBottom: '2rem', borderBottom: '1px solid rgba(31, 58, 77, 0.05)' }}>
              <h4 className="text-secondary uppercase text-xs font-bold mb-4" style={{ letterSpacing: '0.1em', opacity: 0.6 }}>Subcarpetas</h4>
              <div className="folders-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1.25rem' }}>
                {currentFolders.map(folder => (
                  <div
                    key={folder.id}
                    className="folder-card glass-card"
                    onClick={() => navigateToFolder(folder)}
                    style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer', minHeight: 'auto', background: 'white' }}
                  >
                    <div style={{ background: 'rgba(31, 58, 77, 0.03)', padding: '0.6rem', borderRadius: '10px' }}>
                      <Folder size={20} className="text-primary" fill="currentColor" opacity={0.4} />
                    </div>
                    <span className="folder-name" style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--color-primary)' }}>{getDisplayName(folder.name)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

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
                        <button 
                          className="btn-edit-excursion" 
                          onClick={() => { setMovingExcursion(excursion); setShowMoveModal(true); }}
                          title="Mover a otra carpeta"
                          style={{ background: 'rgba(31, 58, 77, 0.05)', color: 'var(--color-primary)' }}
                        >
                          <Move size={16} />
                        </button>
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
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                        <div className="info-box">
                          <MapPin size={14} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />
                          <strong>Ubicación:</strong> {excursion.location || 'N/A'}
                        </div>
                        <div className="info-box" style={{ background: 'rgba(31, 58, 77, 0.05)' }}>
                          <Users size={14} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />
                          <strong>{excursion.pricing_type === 'per_group' ? 'Grupo' : 'Por persona'}:</strong> {excursion.capacity} pax
                        </div>
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
          <div className="modal-content animate-scale-in" style={{ maxWidth: '450px' }}>
            <div className="modal-header">
              <h3><FolderPlus size={24} className="text-primary" style={{ marginRight: '0.75rem', verticalAlign: 'middle' }} /> Nuevo Destino</h3>
              <button onClick={() => setShowFolderModal(false)} className="btn-icon">
                <X size={20} />
              </button>
            </div>
            
            <div className="modal-body">
              <div className="form-group">
                <label>Nombre del Destino / Categoría</label>
                <div className="input-with-icon">
                  <MapPin size={18} />
                  <input
                    type="text"
                    className="form-input"
                    value={newFolderName}
                    onChange={e => setNewFolderName(e.target.value)}
                    placeholder="Ej: Madrid, España"
                    autoFocus
                  />
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setShowFolderModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleCreateFolder}>Crear Carpeta</button>
            </div>
          </div>
        </div>
      )}

      {/* New/Edit Excursion Modal */}
      {showExcursionModal && (
        <div className="modal-overlay">
          <div className="modal-content glass-card animate-scale-in" style={{ maxWidth: '550px', padding: '0', overflow: 'hidden' }}>
            <div style={{ background: 'linear-gradient(135deg, var(--color-primary) 0%, #0f2132 100%)', padding: '1.5rem 2rem', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)', padding: '0.6rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Map size={20} color="white" />
                </div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: 'white', lineHeight: 1.2 }}>
                  {editingExcursionId ? 'Editar Excursión' : 'Nueva Excursión'}
                </h3>
              </div>
              <button 
                onClick={() => setShowExcursionModal(false)}
                style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'white', transition: 'all 0.2s' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.25)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; }}
              >
                <X size={16} />
              </button>
            </div>

            <div className="modal-body custom-scrollbar" style={{ maxHeight: '70vh', overflowY: 'auto', padding: '1.5rem 2rem' }}>
              <div className="form-grid" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="form-group">
                  <label className="text-xs font-semibold uppercase text-secondary">Nombre de la Excursión</label>
                  <div className="input-with-icon">
                    <Map size={16} />
                    <input
                      type="text"
                      className="form-input"
                      value={newExcursion.name || ''}
                      onChange={e => setNewExcursion({ ...newExcursion, name: e.target.value })}
                      placeholder="Ej: Tour por el Museo del Prado"
                    />
                  </div>
                </div>

              <div className="grid-2 gap-3">
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

              <div className="grid-2 gap-3">
                <div className="form-group">
                  <label>Tipo de Precio</label>
                  <select
                    className="form-input"
                    value={newExcursion.pricing_type || 'per_person'}
                    onChange={e => setNewExcursion({ ...newExcursion, pricing_type: e.target.value as 'per_person' | 'per_group' })}
                  >
                    <option value="per_person">💰 Por Persona</option>
                    <option value="per_group">👥 Por Grupo (precio total)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>{newExcursion.pricing_type === 'per_group' ? 'Máx. Personas en Grupo' : 'Cantidad de Personas'}</label>
                  <div className="input-with-icon">
                    <Users size={16} />
                    <input
                      type="number"
                      min="1"
                      className="form-input"
                      value={newExcursion.capacity || 1}
                      onChange={e => setNewExcursion({ ...newExcursion, capacity: parseInt(e.target.value) })}
                    />
                  </div>
                </div>
              </div>

                <div className="form-group">
                  <label className="text-xs font-semibold uppercase text-secondary">Descripción / Itinerario</label>
                  <textarea
                    className="form-input"
                    style={{ height: '80px' }}
                    value={newExcursion.description || ''}
                    onChange={e => setNewExcursion({ ...newExcursion, description: e.target.value })}
                    placeholder="Detalles del tour, horarios, qué incluye..."
                  />
                </div>

                <div className="form-group">
                  <label className="text-xs font-semibold uppercase text-secondary">Notas Internas</label>
                  <textarea
                    className="form-input"
                    style={{ height: '60px' }}
                    value={newExcursion.notes || ''}
                    onChange={e => setNewExcursion({ ...newExcursion, notes: e.target.value })}
                    placeholder="Solo visible para administradores..."
                  />
                </div>
              </div>
            </div>
            
            <div className="modal-footer" style={{ padding: '1.25rem 2rem 1.5rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem', borderTop: '1px solid rgba(0,0,0,0.05)', background: '#f8fafc' }}>
              <button className="btn btn-outline" onClick={() => setShowExcursionModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleAddExcursion}>
                {editingExcursionId ? 'Guardar Cambios' : 'Guardar Excursión'}
              </button>
            </div>
          </div>
        </div>
      )}
      <ConfirmationModal 
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ ...deleteConfirm, isOpen: false })}
        onConfirm={confirmDeleteFolder}
        title="¿Eliminar carpeta?"
        message={`Esta acción eliminará la carpeta "${deleteConfirm.folderName}" y todas las excursiones que contenga de forma permanente.`}
        confirmText="Eliminar Carpeta"
        type="danger"
      />

      {/* Modal para Mover Excursión */}
      {showMoveModal && (
        <div className="modal-overlay" style={{ backdropFilter: 'blur(10px)', backgroundColor: 'rgba(15,23,42,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ width: '100%', maxWidth: '480px', borderRadius: '24px', overflow: 'hidden', boxShadow: '0 32px 64px -12px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.08)' }}>
            {/* Header con gradiente oscuro */}
            <div style={{ background: 'linear-gradient(135deg, var(--color-primary) 0%, #0f2132 100%)', padding: '2rem 2rem 1.75rem', position: 'relative' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                <div style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)', padding: '0.875rem', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.2)', flexShrink: 0 }}>
                  <Move size={22} color="white" />
                </div>
                <div style={{ flex: 1 }}>
                  <h3 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: 'white', lineHeight: 1.2 }}>Mover excursión</h3>
                  <p style={{ margin: '0.4rem 0 0', fontSize: '0.875rem', color: 'rgba(255,255,255,0.65)', lineHeight: 1.4 }}>
                    Seleccioná el destino para <strong style={{ color: 'rgba(255,255,255,0.95)' }}>{movingExcursion?.name}</strong>
                  </p>
                </div>
                <button 
                  onClick={() => setShowMoveModal(false)}
                  style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'white', flexShrink: 0, transition: 'all 0.2s' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.25)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; }}
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Lista de carpetas */}
            <div style={{ background: '#f8fafc', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.625rem', maxHeight: '360px', overflowY: 'auto' }}>
              {folders.filter(f => f.id !== selectedFolderId).length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                  <Folder size={40} style={{ margin: '0 auto 0.75rem', display: 'block', opacity: 0.4 }} />
                  <p style={{ margin: 0, fontSize: '0.9rem' }}>No hay otras carpetas disponibles</p>
                </div>
              ) : folders.filter(f => f.id !== selectedFolderId).map(folder => (
                <div
                  key={folder.id}
                  style={{ background: 'white', borderRadius: '14px', border: '1.5px solid #e2e8f0', padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', transition: 'all 0.2s' }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(31,58,77,0.3)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.06)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.boxShadow = 'none'; }}
                >
                  <div style={{ background: 'rgba(31,58,77,0.08)', padding: '0.6rem', borderRadius: '10px', flexShrink: 0 }}>
                    <Folder size={20} color="var(--color-primary)" fill="rgba(31,58,77,0.15)" />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ fontWeight: 700, color: '#1e293b', fontSize: '0.95rem', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{getDisplayName(folder.name)}</span>
                    <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>{folder.excursions?.length || 0} excursiones</span>
                  </div>
                  <button
                    onClick={() => handleMoveExcursion(folder.id)}
                    style={{ background: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: '10px', padding: '0.5rem 1rem', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.2s', flexShrink: 0 }}
                    onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.85'; e.currentTarget.style.transform = 'scale(1.03)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'scale(1)'; }}
                  >
                    Mover aquí
                  </button>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div style={{ background: 'white', padding: '1.25rem 1.5rem', borderTop: '1px solid #f1f5f9' }}>
              <button
                onClick={() => setShowMoveModal(false)}
                style={{ width: '100%', background: 'transparent', border: '1.5px solid #e2e8f0', borderRadius: '12px', padding: '0.875rem', fontSize: '0.9rem', fontWeight: 600, color: '#64748b', cursor: 'pointer', transition: 'all 0.2s' }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.color = '#334155'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.color = '#64748b'; }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

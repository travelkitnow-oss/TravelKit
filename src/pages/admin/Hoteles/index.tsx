import { useState, useEffect, Fragment } from 'react';
import {
  Folder,
  FolderPlus,
  Plus,
  Hotel as HotelIcon,
  Notebook,
  Trash2,
  ChevronLeft,
  Edit2,
  Link as LinkIcon,
  Move,
  DollarSign,
  MapPin,
  Info,
  Users,
  X
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import ConfirmationModal from '../../../components/ConfirmationModal/ConfirmationModal';
import './Hoteles.css';

interface HotelLink {
  label: string;
  url: string;
}

interface Hotel {
  id: string;
  folder_id: string;
  name: string;
  cost_usd: number;
  address: string;
  description: string;
  notes: string;
  links: HotelLink[];
  nights: number;
  stars: number;
  breakfast: boolean;
  half_board: boolean;
  all_inclusive: boolean;
  extra_services: string;
  capacity: number;
  currency?: 'USD' | 'ARS';
}

interface HotelFolder {
  id: string;
  name: string;
  hotels: Hotel[];
}

export default function HotelesPage() {
  const [folders, setFolders] = useState<HotelFolder[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [dollarRate, setDollarRate] = useState<number>(0);

  // Modals
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [showHotelModal, setShowHotelModal] = useState(false);
  const [editingHotelId, setEditingHotelId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; folderId: string | null; folderName: string }>({
    isOpen: false,
    folderId: null,
    folderName: ''
  });
  const [currentPath, setCurrentPath] = useState<string[]>([]); 
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [movingHotel, setMovingHotel] = useState<Hotel | null>(null); // Array de nombres de carpetas: ['España', 'Madrid']

  // Form States
  const [newFolderName, setNewFolderName] = useState('');
  const [newHotel, setNewHotel] = useState<Partial<Hotel>>({
    name: '', cost_usd: 0, address: '', description: '', notes: '', links: [],
    nights: 1, breakfast: false, half_board: false, all_inclusive: false, extra_services: '', stars: 3, capacity: 2, currency: 'USD'
  });

  useEffect(() => {
    fetchFolders();
  }, []);

  useEffect(() => {
    fetch('https://dolarapi.com/v1/dolares/blue')
      .then(res => res.json())
      .then(data => setDollarRate(data.venta || 0))
      .catch(() => setDollarRate(0));
  }, []);

  const fetchFolders = async () => {
    setLoading(true);
    const { data: folderData, error: folderError } = await supabase
      .from('catalog_folders')
      .select('*')
      .eq('type', 'hotel')
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

    const combined: HotelFolder[] = folderData.map(f => ({
      id: f.id,
      name: f.name,
      hotels: (itemData || [])
        .filter(i => i.folder_id === f.id)
        .map(i => ({
          id: i.id,
          folder_id: i.folder_id,
          name: i.name,
          cost_usd: i.cost_usd,
          address: i.location || '',
          description: i.description || '',
          links: i.links || [],
          nights: i.nights || 1,
          stars: i.stars || 3,
          breakfast: !!i.breakfast,
          half_board: !!i.half_board,
          all_inclusive: !!i.all_inclusive,
          extra_services: i.extra_services || '',
          capacity: i.capacity || 2,
          currency: (i.notes?.startsWith('{') ? JSON.parse(i.notes).currency : 'USD') || 'USD',
          notes: i.notes?.startsWith('{') ? JSON.parse(i.notes).text : (i.notes || '')
        })) as Hotel[]
    }));

    setFolders(combined);
    setLoading(false);
  };

  const handleAddFolder = async () => {
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
      const currentTypeFolder = data.find(f => f.type === 'hotel');
      if (currentTypeFolder) {
        setFolders([...folders, { id: currentTypeFolder.id, name: currentTypeFolder.name, hotels: [] }]);
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

    // Primero eliminamos los items de la carpeta para evitar conflictos de llave foránea
    const { error: itemsError } = await supabase.from('catalog_items').delete().eq('folder_id', id);
    if (itemsError) {
      alert('Error al eliminar los hoteles de la carpeta: ' + itemsError.message);
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

  const handleAddHotel = async () => {
    if (!selectedFolderId || !newHotel.name) return;
    
    const dbData = {
      folder_id: selectedFolderId,
      name: newHotel.name,
      cost_usd: Number(newHotel.cost_usd) || 0,
      location: newHotel.address || '',
      description: newHotel.description || '',
      links: newHotel.links || [],
      nights: Number(newHotel.nights) || 1,
      stars: Number(newHotel.stars) || 3,
      breakfast: !!newHotel.breakfast,
      half_board: !!newHotel.half_board,
      all_inclusive: !!newHotel.all_inclusive,
      extra_services: newHotel.extra_services || '',
      capacity: Number(newHotel.capacity) || 2,
      notes: JSON.stringify({ text: newHotel.notes || '', currency: newHotel.currency || 'USD' })
    };

    if (editingHotelId) {
      const { error } = await supabase.from('catalog_items').update(dbData).eq('id', editingHotelId);
      if (error) {
        console.error('Error updating hotel:', error);
        alert('Error al actualizar hotel: ' + error.message);
      } else {
        fetchFolders();
        setShowHotelModal(false);
      }
    } else {
      const { error } = await supabase.from('catalog_items').insert([dbData]);
      if (error) {
        console.error('Error saving hotel:', error);
        alert('Error al guardar hotel: ' + error.message);
      } else {
        fetchFolders();
        setShowHotelModal(false);
      }
    }
  };

  const handleDeleteHotel = async (id: string) => {
    if (window.confirm('¿Eliminar este hotel?')) {
      const { error } = await supabase.from('catalog_items').delete().eq('id', id);
      if (!error) fetchFolders();
    }
  };

  const handleMoveHotel = async (targetFolderId: string) => {
    if (!movingHotel) return;
    const { error } = await supabase
      .from('catalog_items')
      .update({ folder_id: targetFolderId })
      .eq('id', movingHotel.id);

    if (error) {
      alert('Error al mover hotel');
    } else {
      fetchFolders();
      setShowMoveModal(false);
      setMovingHotel(null);
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
  
  // Carpetas que pertenecen al nivel actual
  const currentFolders = folders.filter(f => {
    const parentPath = getParentPath(f.name);
    return parentPath === currentPathString;
  });

  const navigateToFolder = (folder: HotelFolder) => {
    const parts = folder.name.split(' / ');
    setCurrentPath(parts);
    setSelectedFolderId(folder.id);
  };

  const navigateToPath = (index: number) => {
    const newPath = currentPath.slice(0, index + 1);
    setCurrentPath(newPath);
    // Buscamos la carpeta correspondiente a ese path para marcarla como seleccionada
    const pathStr = newPath.join(' / ');
    const folder = folders.find(f => f.name === pathStr);
    if (folder) setSelectedFolderId(folder.id);
    else setSelectedFolderId(null);
  };

  const goHome = () => {
    setCurrentPath([]);
    setSelectedFolderId(null);
  };

  const openEditModal = (h: Hotel) => {
    setNewHotel(h);
    setEditingHotelId(h.id);
    setShowHotelModal(true);
  };

  const openCreateModal = () => {
    setNewHotel({
      name: '', cost_usd: 0, address: '', description: '', notes: '', links: [],
      nights: 1, breakfast: false, half_board: false, all_inclusive: false, extra_services: '', stars: 3, capacity: 2, currency: 'USD'
    });
    setEditingHotelId(null);
    setShowHotelModal(true);
  };

  return (
    <div className="hoteles-page animate-fade-in">
      <header className="page-header-centered">
        <h1>Catálogo de Hoteles</h1>
        <p>Organiza las opciones de alojamiento por ciudad o región.</p>
      </header>

      {/* Dollar rate banner */}
      <div className="dollar-info-bar mb-4">
        <div className="dollar-rate">
          <div className="rate-item">
            <span className="label">Dólar Blue</span>
            <span className="value">${dollarRate.toLocaleString('es-AR')}</span>
          </div>
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
            <h2 className="section-title">Destinos / Ciudades</h2>
            <button className="btn btn-primary" onClick={() => setShowFolderModal(true)}>
              <FolderPlus size={18} />
              Nueva Carpeta
            </button>
          </div>

          {loading ? (
            <div className="p-5 text-center">
              <div className="loader-premium"></div>
              <p className="mt-3">Cargando destinos...</p>
            </div>
          ) : currentFolders.length === 0 ? (
            <div className="empty-state-card glass-card">
              <HotelIcon size={80} strokeWidth={1} />
              <h3>Sin destinos aún</h3>
              <p>Crea tu primera carpeta para organizar los hoteles.</p>
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
                  style={{ position: 'relative' }}
                >
                  <div className="folder-icon-wrapper">
                    <Folder size={64} fill="currentColor" />
                  </div>
                  <span className="folder-name">{getDisplayName(folder.name)}</span>
                  <span className="folder-count">{folder.hotels.length} hoteles</span>
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
                Nuevo Hotel
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
            <div className="hotels-list">
              {selectedFolder?.hotels.length === 0 ? (
                <div className="empty-state-card">
                  <HotelIcon size={80} strokeWidth={1} />
                  <h3>No hay hoteles</h3>
                  <p>Agrega opciones de alojamiento para {selectedFolder?.name}.</p>
                </div>
              ) : (
                selectedFolder?.hotels.map(hotel => (
                  <div key={hotel.id} className="hotel-item glass-card">
                    <div className="hotel-header">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <h3 className="hotel-title">{hotel.name}</h3>
                          <div style={{ display: 'flex', gap: '2px', color: '#C89B5A', marginTop: '2px' }}>
                            {Array.from({ length: hotel.stars || 0 }).map((_, i) => <Plus key={i} size={10} />)}
                          </div>
                        </div>
                        <div className="hotel-costs">
                          <span className="cost-usd" style={{ fontSize: '1.1rem' }}>
                            {hotel.currency === 'ARS' ? '$' : 'u$s'} {hotel.cost_usd?.toLocaleString()}
                          </span>
                          <span className="cost-ars" style={{ fontSize: '0.8rem', opacity: 0.7 }}>
                            {hotel.currency === 'ARS' ? 
                              `≈ u$s ${Math.round(hotel.cost_usd / (dollarRate || 1))}` : 
                              `≈ $${Math.round(hotel.cost_usd * dollarRate).toLocaleString('es-AR')}`
                            }
                          </span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button 
                          className="btn-edit-hotel" 
                          onClick={() => { setMovingHotel(hotel); setShowMoveModal(true); }}
                          title="Mover a otra carpeta"
                          style={{ background: 'rgba(31, 58, 77, 0.05)', color: 'var(--color-primary)' }}
                        >
                          <Move size={16} />
                        </button>
                        <button className="btn-edit-hotel" onClick={() => openEditModal(hotel)}>
                          <Edit2 size={16} />
                        </button>
                        <button className="btn-delete-hotel" onClick={() => handleDeleteHotel(hotel.id)}>
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>

                    <div className="hotel-links">
                      {hotel.links.map((link, i) => (
                        <a key={i} href={link.url} target="_blank" rel="noopener noreferrer" className="hotel-link">
                          <LinkIcon size={12} />
                          {link.label}
                        </a>
                      ))}
                    </div>

                    <div className="hotel-content-compact">
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '0.75rem' }}>
                        {hotel.address && (
                          <div className="info-box">
                            <MapPin size={14} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />
                            <strong>Dirección:</strong> {hotel.address}
                          </div>
                        )}
                        <div className="info-box" style={{ background: 'rgba(200, 155, 90, 0.05)' }}>
                          <Notebook size={14} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />
                          <strong>Estancia:</strong> {hotel.nights} noches
                        </div>
                        <div className="info-box" style={{ background: 'rgba(31, 58, 77, 0.05)' }}>
                          <Users size={14} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />
                          <strong>Hab.:</strong> {hotel.capacity} pax
                        </div>
                      </div>

                      <div className="meal-plan-tags" style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
                        {hotel.breakfast && <span className="meal-tag">☕ Desayuno</span>}
                        {hotel.half_board && <span className="meal-tag">🍽️ Media Pensión</span>}
                        {hotel.all_inclusive && <span className="meal-tag" style={{ background: '#1F3A4D', color: 'white' }}>✨ All Inclusive</span>}
                      </div>

                      <div className="info-box">
                        <Info size={14} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />
                        <strong>Servicios/Descripción:</strong> {hotel.description || 'Sin descripción.'}
                        {hotel.extra_services && <span style={{ display: 'block', marginTop: '0.25rem', fontSize: '0.8rem', fontStyle: 'italic' }}>+ {hotel.extra_services}</span>}
                      </div>

                      {hotel.notes && (
                        <div className="mt-2 text-sm" style={{ paddingLeft: '1rem', borderLeft: '2px solid var(--color-accent)' }}>
                          <strong>Notas:</strong> {hotel.notes}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="folder-info-card glass-card">
              <h4>Resumen de Hoteles</h4>
              <div className="folder-stats">
                <div className="stat-row">
                  <span className="stat-label">Total Opciones</span>
                  <span className="stat-value">{selectedFolder?.hotels.length}</span>
                </div>
                <div className="stat-row">
                  <span className="stat-label">Costo Promedio</span>
                  <span className="stat-value highlight">
                    u$s {selectedFolder?.hotels.length
                      ? Math.round(selectedFolder.hotels.reduce((a, h) => a + h.cost_usd, 0) / selectedFolder.hotels.length)
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
          <div className="modal-content-pro" style={{ maxWidth: '450px' }}>
            <div className="modal-header-pro">
              <div className="header-left">
                <div className="header-icon">
                  <FolderPlus size={24} />
                </div>
                <div className="header-text">
                  <h3>Nuevo Destino</h3>
                  <p>Crea una carpeta para organizar hoteles</p>
                </div>
              </div>
              <button onClick={() => setShowFolderModal(false)} className="close-modal-btn">
                <X size={20} />
              </button>
            </div>
            
            <div className="modal-body-pro">
              <div className="form-group">
                <label>Nombre de la Ciudad / Región</label>
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

            <div className="modal-footer-pro">
              <button className="btn btn-outline" onClick={() => setShowFolderModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleAddFolder}>Crear Carpeta</button>
            </div>
          </div>
        </div>
      )}

      {/* New/Edit Hotel Modal */}
      {showHotelModal && (
        <div className="modal-overlay">
          <div className="modal-content-pro" style={{ maxWidth: '650px' }}>
            <div className="modal-header-pro">
              <div className="header-left">
                <div className="header-icon">
                  <HotelIcon size={24} />
                </div>
                <div className="header-text">
                  <h3>{editingHotelId ? 'Editar Hotel' : 'Nuevo Hotel'}</h3>
                  <p>{selectedFolder?.name || 'Añade una opción de alojamiento'}</p>
                </div>
              </div>
              <button onClick={() => setShowHotelModal(false)} className="close-modal-btn">
                <X size={20} />
              </button>
            </div>
            <div className="modal-body-pro custom-scrollbar" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
              <div className="modal-form">
                {/* ... existing form content ... */}
                <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div className="form-group">
                    <label className="text-xs font-semibold uppercase text-secondary" style={{ letterSpacing: '0.5px', marginBottom: '0.5rem', display: 'block' }}>Nombre del Hotel</label>
                    <div className="input-with-icon">
                      <HotelIcon size={16} />
                      <input
                        type="text"
                        className="form-input"
                        value={newHotel.name || ''}
                        onChange={e => setNewHotel({ ...newHotel, name: e.target.value })}
                        placeholder="Ej: Hotel Palace Madrid"
                      />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="text-xs font-semibold uppercase text-secondary" style={{ letterSpacing: '0.5px', marginBottom: '0.5rem', display: 'block' }}>Estrellas / Categoría</label>
                    <select
                      className="form-input"
                      value={newHotel.stars || 3}
                      onChange={e => setNewHotel({ ...newHotel, stars: Number(e.target.value) })}
                    >
                      <option value="1">1 Estrella</option>
                      <option value="2">2 Estrellas</option>
                      <option value="3">3 Estrellas</option>
                      <option value="4">4 Estrellas</option>
                      <option value="5">5 Estrellas</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div className="form-group">
                    <label className="text-xs font-semibold uppercase text-secondary" style={{ letterSpacing: '0.5px', marginBottom: '0.5rem', display: 'block' }}>Moneda</label>
                    <select
                      className="form-input"
                      value={newHotel.currency || 'USD'}
                      onChange={e => setNewHotel({ ...newHotel, currency: e.target.value as 'USD' | 'ARS' })}
                    >
                      <option value="USD">USD</option>
                      <option value="ARS">ARS</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="text-xs font-semibold uppercase text-secondary" style={{ letterSpacing: '0.5px', marginBottom: '0.5rem', display: 'block' }}>Costo Total ({newHotel.currency})</label>
                    <div className="input-with-icon">
                      <DollarSign size={16} />
                      <input
                        type="number"
                        className="form-input"
                        value={newHotel.cost_usd || 0}
                        onChange={e => setNewHotel({ ...newHotel, cost_usd: parseFloat(e.target.value) })}
                      />
                    </div>
                    {(newHotel.cost_usd || 0) > 0 && (
                      <span style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '4px', display: 'block' }}>
                        {newHotel.currency === 'ARS' ? 
                          `Equiv: u$s ${Math.round((newHotel.cost_usd || 0) / (dollarRate || 1))}` : 
                          `Equiv: $${Math.round((newHotel.cost_usd || 0) * dollarRate).toLocaleString('es-AR')} ARS`
                        }
                      </span>
                    )}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div className="form-group">
                    <label className="text-xs font-semibold uppercase text-secondary" style={{ letterSpacing: '0.5px', marginBottom: '0.5rem', display: 'block' }}>Noches</label>
                    <div className="input-with-icon">
                      <Notebook size={16} />
                      <input
                        type="number"
                        className="form-input"
                        value={newHotel.nights || 1}
                        onChange={e => setNewHotel({ ...newHotel, nights: parseInt(e.target.value) })}
                      />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="text-xs font-semibold uppercase text-secondary" style={{ letterSpacing: '0.5px', marginBottom: '0.5rem', display: 'block' }}>Pax x Hab.</label>
                    <div className="input-with-icon">
                      <Users size={16} />
                      <input
                        type="number"
                        className="form-input"
                        value={newHotel.capacity || 2}
                        onChange={e => setNewHotel({ ...newHotel, capacity: parseInt(e.target.value) })}
                      />
                    </div>
                  </div>
                </div>

                <div className="form-group">
                  <label className="text-xs font-semibold uppercase text-secondary">Dirección</label>
                  <div className="input-with-icon">
                    <MapPin size={16} />
                    <input
                      type="text"
                      className="form-input"
                      value={newHotel.address || ''}
                      onChange={e => setNewHotel({ ...newHotel, address: e.target.value })}
                      placeholder="Ej: Calle Gran Vía, 12"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="text-xs font-semibold uppercase text-secondary">Régimen de Comidas</label>
                  <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.5rem', background: '#f8fafc', padding: '1rem', borderRadius: '16px', border: '1px solid #edf2f7' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', margin: 0, fontSize: '0.9rem', fontWeight: 600 }}>
                      <input type="checkbox" style={{ width: '18px', height: '18px' }} checked={newHotel.breakfast} onChange={e => setNewHotel({ ...newHotel, breakfast: e.target.checked })} />
                      Desayuno
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', margin: 0, fontSize: '0.9rem', fontWeight: 600 }}>
                      <input type="checkbox" style={{ width: '18px', height: '18px' }} checked={newHotel.half_board} onChange={e => setNewHotel({ ...newHotel, half_board: e.target.checked })} />
                      Media Pensión
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', margin: 0, fontSize: '0.9rem', fontWeight: 600 }}>
                      <input type="checkbox" style={{ width: '18px', height: '18px' }} checked={newHotel.all_inclusive} onChange={e => setNewHotel({ ...newHotel, all_inclusive: e.target.checked })} />
                      All Inclusive
                    </label>
                  </div>
                </div>

                <div className="form-group">
                  <label className="text-xs font-semibold uppercase text-secondary">Otros Servicios</label>
                  <div className="input-with-icon">
                    <Info size={16} />
                    <input
                      type="text"
                      className="form-input"
                      value={newHotel.extra_services || ''}
                      onChange={e => setNewHotel({ ...newHotel, extra_services: e.target.value })}
                      placeholder="Ej: Merienda libre, Acceso al Spa..."
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="text-xs font-semibold uppercase text-secondary">Descripción General</label>
                  <textarea
                    className="form-input"
                    style={{ height: '80px' }}
                    value={newHotel.description || ''}
                    onChange={e => setNewHotel({ ...newHotel, description: e.target.value })}
                    placeholder="Detalles sobre el hotel..."
                  />
                </div>

                <div className="form-group">
                  <label className="text-xs font-semibold uppercase text-secondary">Notas Internas</label>
                  <textarea
                    className="form-input"
                    style={{ height: '60px' }}
                    value={newHotel.notes || ''}
                    onChange={e => setNewHotel({ ...newHotel, notes: e.target.value })}
                    placeholder="Solo visible para administradores..."
                  />
                </div>
              </div>
            </div>
            
            <div className="modal-footer-pro">
              <button className="btn btn-outline" onClick={() => setShowHotelModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleAddHotel}>
                {editingHotelId ? 'Guardar Cambios' : 'Guardar Hotel'}
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
        message={`Esta acción eliminará la carpeta "${deleteConfirm.folderName}" y todos los hoteles que contenga de forma permanente.`}
        confirmText="Eliminar Carpeta"
        type="danger"
      />

      {/* Modal para Mover Hotel */}
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
                  <h3 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: 'white', lineHeight: 1.2 }}>Mover hotel</h3>
                  <p style={{ margin: '0.4rem 0 0', fontSize: '0.875rem', color: 'rgba(255,255,255,0.65)', lineHeight: 1.4 }}>
                    Seleccioná el destino para <strong style={{ color: 'rgba(255,255,255,0.95)' }}>{movingHotel?.name}</strong>
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
                    <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>{folder.hotels?.length || 0} hoteles</span>
                  </div>
                  <button
                    onClick={() => handleMoveHotel(folder.id)}
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

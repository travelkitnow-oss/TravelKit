import { useState, useEffect, Fragment } from 'react';
import { 
  Folder, 
  FolderPlus, 
  Plus, 
  Truck, 
  Trash2, 
  ChevronLeft,
  Edit2,
  Move,
  Link as LinkIcon,
  DollarSign,
  Users,
  MapPin,
  X
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import ConfirmationModal from '../../../components/ConfirmationModal/ConfirmationModal';
import './Transportes.css';

interface TransportLink {
  label: string;
  url: string;
}

interface Transport {
  id: string;
  folder_id: string;
  name: string;
  cost_usd: number;
  origin: string;
  destination: string;
  description: string;
  notes: string;
  company: string;
  driver_name: string;
  links: TransportLink[];
  capacity: number;
  currency?: 'USD' | 'ARS';
}

interface TransportFolder {
  id: string;
  name: string;
  transports: Transport[];
}

export default function TransportesPage() {
  const [folders, setFolders] = useState<TransportFolder[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [dollarRate, setDollarRate] = useState<number>(0);

  // Modals
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [showTransportModal, setShowTransportModal] = useState(false);
  const [editingTransportId, setEditingTransportId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; folderId: string | null; folderName: string }>({
    isOpen: false,
    folderId: null,
    folderName: ''
  });
  const [currentPath, setCurrentPath] = useState<string[]>([]);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [movingTransport, setMovingTransport] = useState<Transport | null>(null);

  // Form States
  const [newFolderName, setNewFolderName] = useState('');
  const [newTransport, setNewTransport] = useState<Partial<Transport>>({
    name: '', cost_usd: 0, origin: '', destination: '', description: '', notes: '', links: [],
    company: '', driver_name: '', capacity: 4, currency: 'USD'
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
      .eq('type', 'transport')
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

    const combined: TransportFolder[] = folderData.map(f => ({
      id: f.id,
      name: f.name,
      transports: (itemData || [])
        .filter(i => i.folder_id === f.id)
        .map(i => ({
          id: i.id,
          folder_id: i.folder_id,
          name: i.name,
          cost_usd: i.cost_usd,
          origin: i.origin || '',
          destination: i.destination || '',
          description: i.description || '',
          capacity: i.capacity || 4,
          company: i.company || '',
          driver_name: i.driver_name || '',
          links: i.links || [],
          currency: (i.notes?.startsWith('{') ? JSON.parse(i.notes).currency : 'USD') || 'USD',
          notes: i.notes?.startsWith('{') ? JSON.parse(i.notes).text : (i.notes || '')
        }))
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
      const currentTypeFolder = data.find(f => f.type === 'transport');
      if (currentTypeFolder) {
        setFolders([...folders, { id: currentTypeFolder.id, name: currentTypeFolder.name, transports: [] }]);
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
      alert('Error al eliminar los transportes de la carpeta: ' + itemsError.message);
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

  const handleAddTransport = async () => {
    if (!selectedFolderId || !newTransport.name) return;

    const dbData = {
      folder_id: selectedFolderId,
      name: newTransport.name,
      cost_usd: Number(newTransport.cost_usd) || 0,
      origin: newTransport.origin || '',
      destination: newTransport.destination || '',
      description: newTransport.description || '',
      links: newTransport.links || [],
      capacity: Number(newTransport.capacity) || 4,
      company: newTransport.company || '',
      driver_name: newTransport.driver_name || '',
      notes: JSON.stringify({ text: newTransport.notes || '', currency: newTransport.currency || 'USD' })
    };

    if (editingTransportId) {
      const { error } = await supabase.from('catalog_items').update(dbData).eq('id', editingTransportId);
      if (error) alert('Error al actualizar transporte');
      else {
        fetchFolders();
        setShowTransportModal(false);
      }
    } else {
      const { error } = await supabase.from('catalog_items').insert([dbData]);
      if (error) alert('Error al guardar transporte');
      else {
        fetchFolders();
        setShowTransportModal(false);
      }
    }
  };

  const handleDeleteTransport = async (id: string) => {
    if (window.confirm('¿Eliminar este transporte?')) {
      const { error } = await supabase.from('catalog_items').delete().eq('id', id);
      if (!error) fetchFolders();
    }
  };

  const handleMoveTransport = async (targetFolderId: string) => {
    if (!movingTransport) return;
    const { error } = await supabase
      .from('catalog_items')
      .update({ folder_id: targetFolderId })
      .eq('id', movingTransport.id);

    if (error) {
      alert('Error al mover transporte');
    } else {
      fetchFolders();
      setShowMoveModal(false);
      setMovingTransport(null);
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

  const navigateToFolder = (folder: TransportFolder) => {
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

  const openEditModal = (t: Transport) => {
    setNewTransport(t);
    setEditingTransportId(t.id);
    setShowTransportModal(true);
  };

  const openCreateModal = () => {
    setNewTransport({ name: '', cost_usd: 0, origin: '', destination: '', description: '', notes: '', links: [] });
    setEditingTransportId(null);
    setShowTransportModal(true);
  };

  return (
    <div className="transportes-page animate-fade-in">
      <header className="page-header-centered">
        <h1>Catálogo de Transportes</h1>
        <p>Gestiona opciones de traslados, vuelos y buses por región.</p>
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
            <h2 className="section-title">Carpetas de Transporte</h2>
            <button className="btn btn-primary" onClick={() => setShowFolderModal(true)}>
              <FolderPlus size={18} />
              Nueva Carpeta
            </button>
          </div>

          {loading ? (
            <div className="p-5 text-center">
              <div className="loader-premium"></div>
              <p className="mt-3">Cargando carpetas...</p>
            </div>
          ) : currentFolders.length === 0 ? (
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
                  <span className="folder-count">{folder.transports.length} transportes</span>
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
          <div className="folder-detail-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem', flexWrap: 'wrap', gap: '1rem' }}>
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
                Nuevo Transporte
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
            <div className="transports-grid">
              {selectedFolder?.transports.length === 0 ? (
                <div className="empty-state-card">
                  <Truck size={80} strokeWidth={1} />
                  <h3>No hay transportes</h3>
                  <p>Agrega opciones de traslado para {selectedFolder?.name}.</p>
                </div>
              ) : (
                selectedFolder?.transports.map(transport => (
                  <div key={transport.id} className="transport-item glass-card">
                    <div className="transport-header">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <h3 className="transport-title">{transport.name}</h3>
                        <div className="transport-costs">
                          <span className="cost-usd" style={{ fontSize: '1.1rem' }}>
                            {transport.currency === 'ARS' ? '$' : 'u$s'} {transport.cost_usd?.toLocaleString()}
                          </span>
                          <span className="cost-ars" style={{ fontSize: '0.8rem', opacity: 0.7 }}>
                            {transport.currency === 'ARS' ? 
                              `≈ u$s ${Math.round(transport.cost_usd / (dollarRate || 1))}` : 
                              `≈ $${Math.round(transport.cost_usd * dollarRate).toLocaleString('es-AR')}`
                            }
                          </span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button 
                          className="btn-edit-hotel" 
                          onClick={() => { setMovingTransport(transport); setShowMoveModal(true); }}
                          title="Mover a otra carpeta"
                          style={{ background: 'rgba(31, 58, 77, 0.05)', color: 'var(--color-primary)' }}
                        >
                          <Move size={16} />
                        </button>
                        <button className="btn-edit-hotel" onClick={() => openEditModal(transport)}>
                          <Edit2 size={16} />
                        </button>
                        <button className="btn-delete-hotel" onClick={() => handleDeleteTransport(transport.id)}>
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>

                    <div className="transport-links">
                      {transport.links.map((link, i) => (
                        <a key={i} href={link.url} target="_blank" rel="noopener noreferrer" className="transport-link">
                          <LinkIcon size={12} />
                          {link.label}
                        </a>
                      ))}
                    </div>

                    <div className="transport-content-compact">
                      <div className="transport-grid-info">
                        <div className="info-item">
                          <strong>Origen:</strong> {transport.origin || '-'}
                        </div>
                        <div className="info-item">
                          <strong>Destino:</strong> {transport.destination || '-'}
                        </div>
                        <div className="info-item">
                          <strong>Empresa:</strong> {transport.company || '-'}
                        </div>
                        <div className="info-item">
                          <strong>Conductor:</strong> {transport.driver_name || '-'}
                        </div>
                      </div>

                      {(transport.description || transport.notes) && (
                        <div className="transport-extra-info">
                          {transport.description && <span><strong>D:</strong> {transport.description}</span>}
                          {transport.notes && <span><strong>N:</strong> {transport.notes}</span>}
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
          <div className="modal-content-pro" style={{ maxWidth: '450px' }}>
            <div className="modal-header-pro">
              <div className="header-left">
                <div className="header-icon">
                  <FolderPlus size={24} />
                </div>
                <div className="header-text">
                  <h3>Nueva Carpeta</h3>
                  <p>Organiza tus opciones de transporte</p>
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

      {/* New/Edit Transport Modal */}
      {showTransportModal && (
        <div className="modal-overlay">
          <div className="modal-content-pro" style={{ maxWidth: '550px' }}>
            <div className="modal-header-pro">
              <div className="header-left">
                <div className="header-icon">
                  <Truck size={24} />
                </div>
                <div className="header-text">
                  <h3>{editingTransportId ? 'Editar Transporte' : 'Nuevo Transporte'}</h3>
                  <p>{selectedFolder?.name || 'Añade una opción de traslado'}</p>
                </div>
              </div>
              <button onClick={() => setShowTransportModal(false)} className="close-modal-btn">
                <X size={20} />
              </button>
            </div>

            <div className="modal-body-pro custom-scrollbar" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
              <div className="form-grid" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="form-group">
                  <label className="text-xs font-semibold uppercase text-secondary">Nombre del Transporte / Servicio</label>
                  <div className="input-with-icon">
                    <Truck size={16} />
                    <input
                      type="text"
                      className="form-input"
                      value={newTransport.name || ''}
                      onChange={e => setNewTransport({ ...newTransport, name: e.target.value })}
                      placeholder="Ej: Vuelo Madrid - París"
                    />
                  </div>
                </div>

              <div className="grid-2 gap-3">
                <div className="form-group">
                  <label>Empresa de Transporte</label>
                  <input
                    type="text"
                    className="form-input"
                    value={newTransport.company || ''}
                    onChange={e => setNewTransport({ ...newTransport, company: e.target.value })}
                    placeholder="Ej: Alsa, Uber, etc."
                  />
                </div>
                <div className="form-group">
                  <label>Nombre del Conductor</label>
                  <input
                    type="text"
                    className="form-input"
                    value={newTransport.driver_name || ''}
                    onChange={e => setNewTransport({ ...newTransport, driver_name: e.target.value })}
                    placeholder="Ej: Juan Pérez"
                  />
                </div>
              </div>

              <div className="grid-2 gap-3">
                <div className="form-group">
                  <label>Origen</label>
                  <input
                    type="text"
                    className="form-input"
                    value={newTransport.origin || ''}
                    onChange={e => setNewTransport({ ...newTransport, origin: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Destino</label>
                  <input
                    type="text"
                    className="form-input"
                    value={newTransport.destination || ''}
                    onChange={e => setNewTransport({ ...newTransport, destination: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr 1fr', gap: '1rem', marginTop: '1rem' }}>
                <div className="form-group">
                  <label>Moneda</label>
                  <select 
                    className="form-input"
                    value={newTransport.currency || 'USD'}
                    onChange={e => setNewTransport({ ...newTransport, currency: e.target.value as 'USD' | 'ARS' })}
                  >
                    <option value="USD">USD</option>
                    <option value="ARS">ARS</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Costo {newTransport.currency === 'ARS' ? '(Pesos)' : '(U$S)'}</label>
                  <div className="input-with-icon">
                    <DollarSign size={16} />
                    <input
                      type="number"
                      className="form-input"
                      value={newTransport.cost_usd || 0}
                      onChange={e => setNewTransport({ ...newTransport, cost_usd: parseFloat(e.target.value) })}
                    />
                  </div>
                  {(newTransport.cost_usd || 0) > 0 && (
                    <span style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '4px', display: 'block' }}>
                      {newTransport.currency === 'ARS' ? 
                        `Equiv: u$s ${Math.round((newTransport.cost_usd || 0) / (dollarRate || 1))}` : 
                        `Equiv: $${Math.round((newTransport.cost_usd || 0) * dollarRate).toLocaleString('es-AR')} ARS`
                      }
                    </span>
                  )}
                </div>
                <div className="form-group">
                  <label>Capacidad (Pax)</label>
                  <div className="input-with-icon">
                    <Users size={16} />
                    <input
                      type="number"
                      min="1"
                      className="form-input"
                      value={newTransport.capacity || 4}
                      onChange={e => setNewTransport({ ...newTransport, capacity: parseInt(e.target.value) })}
                    />
                  </div>
                </div>
              </div>

              <div className="form-group">
                  <label className="text-xs font-semibold uppercase text-secondary">Descripción</label>
                  <textarea
                    className="form-input"
                    style={{ height: '80px' }}
                    value={newTransport.description || ''}
                    onChange={e => setNewTransport({ ...newTransport, description: e.target.value })}
                    placeholder="Detalles del viaje, escalas, equipaje..."
                  />
                </div>

                <div className="form-group">
                  <label className="text-xs font-semibold uppercase text-secondary">Notas Internas</label>
                  <textarea
                    className="form-input"
                    style={{ height: '60px' }}
                    value={newTransport.notes || ''}
                    onChange={e => setNewTransport({ ...newTransport, notes: e.target.value })}
                    placeholder="Solo visible para administradores..."
                  />
                </div>
              </div>
            </div>
            
            <div className="modal-footer-pro">
              <button className="btn btn-outline" onClick={() => setShowTransportModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleAddTransport}>
                {editingTransportId ? 'Guardar Cambios' : 'Guardar Transporte'}
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
        message={`Esta acción eliminará la carpeta "${deleteConfirm.folderName}" y todos los transportes que contenga de forma permanente.`}
        confirmText="Eliminar Carpeta"
        type="danger"
      />

      {/* Modal para Mover Transporte */}
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
                  <h3 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: 'white', lineHeight: 1.2 }}>Mover transporte</h3>
                  <p style={{ margin: '0.4rem 0 0', fontSize: '0.875rem', color: 'rgba(255,255,255,0.65)', lineHeight: 1.4 }}>
                    Seleccioná el destino para <strong style={{ color: 'rgba(255,255,255,0.95)' }}>{movingTransport?.name}</strong>
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
                    <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>{folder.transports?.length || 0} transportes</span>
                  </div>
                  <button
                    onClick={() => handleMoveTransport(folder.id)}
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

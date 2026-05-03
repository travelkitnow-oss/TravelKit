import { useState, useEffect } from 'react';
import { 
  Folder, 
  FolderPlus, 
  Plus, 
  Truck, 
  Trash2, 
  ChevronLeft,
  Edit2,
  Link as LinkIcon,
  DollarSign,
  Users
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
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

  // Form States
  const [newFolderName, setNewFolderName] = useState('');
  const [newTransport, setNewTransport] = useState<Partial<Transport>>({
    name: '', cost_usd: 0, origin: '', destination: '', description: '', notes: '', links: [],
    company: '', driver_name: '', capacity: 4
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
          notes: i.notes || '',
          company: i.company || '',
          driver_name: i.driver_name || '',
          links: i.links || [],
          capacity: i.capacity || 4
        }))
    }));

    setFolders(combined);
    setLoading(false);
  };

  const handleAddFolder = async () => {
    if (!newFolderName.trim()) return;
    const { data, error } = await supabase
      .from('catalog_folders')
      .insert([{ name: newFolderName.trim(), type: 'transport' }])
      .select();

    if (error) {
      alert('Error al crear carpeta');
    } else if (data) {
      setFolders([...folders, { id: data[0].id, name: data[0].name, transports: [] }]);
      setNewFolderName('');
      setShowFolderModal(false);
    }
  };

  const handleDeleteFolder = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('¿Eliminar esta carpeta y todos sus transportes?')) {
      const { error } = await supabase.from('catalog_folders').delete().eq('id', id);
      if (!error) {
        setFolders(folders.filter(f => f.id !== id));
        if (selectedFolderId === id) setSelectedFolderId(null);
      }
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
      notes: newTransport.notes || '',
      company: newTransport.company || '',
      driver_name: newTransport.driver_name || '',
      links: newTransport.links || [],
      capacity: Number(newTransport.capacity) || 4
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

  const selectedFolder = folders.find(f => f.id === selectedFolderId);

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
          ) : folders.length === 0 ? (
            <div className="empty-state-card glass-card">
              <Truck size={80} strokeWidth={1} />
              <h3>Sin carpetas aún</h3>
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
                  <span className="folder-count">{folder.transports.length} transportes</span>
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
              Nuevo Transporte
            </button>
          </div>

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
                          <span className="cost-usd">u$s {transport.cost_usd}</span>
                          <span className="cost-ars">≈ ${(transport.cost_usd * dollarRate).toLocaleString('es-AR')}</span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button className="btn-edit-transport" onClick={() => openEditModal(transport)}>
                          <Edit2 size={16} />
                        </button>
                        <button className="btn-delete-transport" onClick={() => handleDeleteTransport(transport.id)}>
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
          <div className="modal-content glass-card p-5" style={{ maxWidth: '450px' }}>
            <h3 className="m-0 mb-4" style={{ fontFamily: 'var(--font-main)', fontWeight: 800 }}>Nueva Carpeta</h3>
            <div className="form-group">
              <label>Nombre de la Carpeta</label>
              <input
                type="text"
                className="form-input"
                value={newFolderName}
                onChange={e => setNewFolderName(e.target.value)}
                placeholder="Ej: Traslados Europa"
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
            <h3 className="m-0 mb-4" style={{ fontFamily: 'var(--font-main)', fontWeight: 800, fontSize: '1.75rem' }}>
              {editingTransportId ? 'Editar Transporte' : 'Nuevo Transporte'}
            </h3>
            <div className="modal-form">
              <div className="form-group">
                <label>Nombre del Transporte / Servicio</label>
                <input
                  type="text"
                  className="form-input"
                  value={newTransport.name || ''}
                  onChange={e => setNewTransport({ ...newTransport, name: e.target.value })}
                  placeholder="Ej: Vuelo Madrid - París (Air France)"
                />
              </div>

              <div className="grid-2 gap-4">
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

              <div className="grid-2 gap-4">
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

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label>Costo (U$S)</label>
                  <div className="input-with-icon">
                    <DollarSign size={16} />
                    <input
                      type="number"
                      className="form-input"
                      value={newTransport.cost_usd || 0}
                      onChange={e => setNewTransport({ ...newTransport, cost_usd: parseFloat(e.target.value) })}
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label>Capacidad (Pasajeros)</label>
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
                <label>Descripción</label>
                <textarea
                  className="form-input"
                  style={{ height: '80px' }}
                  value={newTransport.description || ''}
                  onChange={e => setNewTransport({ ...newTransport, description: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Notas Internas</label>
                <textarea
                  className="form-input"
                  style={{ height: '60px' }}
                  value={newTransport.notes || ''}
                  onChange={e => setNewTransport({ ...newTransport, notes: e.target.value })}
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
      )}
    </div>
  );
}

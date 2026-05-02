import { useState, useEffect } from 'react';
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
  DollarSign,
  MapPin,
  Info
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
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

  // Form States
  const [newFolderName, setNewFolderName] = useState('');
  const [newHotel, setNewHotel] = useState<Partial<Hotel>>({
    name: '', cost_usd: 0, address: '', description: '', notes: '', links: [],
    nights: 1, breakfast: false, half_board: false, all_inclusive: false, extra_services: '', stars: 3
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
          address: i.address,
          description: i.description,
          notes: i.notes,
          links: i.links || [],
          nights: i.nights,
          stars: i.stars,
          breakfast: i.breakfast,
          half_board: i.half_board,
          all_inclusive: i.all_inclusive,
          extra_services: i.extra_services
        }))
    }));

    setFolders(combined);
    setLoading(false);
  };

  const handleAddFolder = async () => {
    if (!newFolderName.trim()) return;
    const { data, error } = await supabase
      .from('catalog_folders')
      .insert([{ name: newFolderName.trim(), type: 'hotel' }])
      .select();

    if (error) {
      alert('Error al crear carpeta');
    } else if (data) {
      setFolders([...folders, { id: data[0].id, name: data[0].name, hotels: [] }]);
      setNewFolderName('');
      setShowFolderModal(false);
    }
  };

  const handleDeleteFolder = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('¿Eliminar esta carpeta y todos sus hoteles?')) {
      const { error } = await supabase.from('catalog_folders').delete().eq('id', id);
      if (!error) {
        setFolders(folders.filter(f => f.id !== id));
        if (selectedFolderId === id) setSelectedFolderId(null);
      }
    }
  };

  const handleAddHotel = async () => {
    if (!selectedFolderId || !newHotel.name) return;

    const dbData = {
      folder_id: selectedFolderId,
      name: newHotel.name,
      cost_usd: Number(newHotel.cost_usd) || 0,
      address: newHotel.address || '',
      description: newHotel.description || '',
      notes: newHotel.notes || '',
      links: newHotel.links || [],
      nights: Number(newHotel.nights) || 1,
      stars: Number(newHotel.stars) || 3,
      breakfast: !!newHotel.breakfast,
      half_board: !!newHotel.half_board,
      all_inclusive: !!newHotel.all_inclusive,
      extra_services: newHotel.extra_services || ''
    };

    if (editingHotelId) {
      const { error } = await supabase.from('catalog_items').update(dbData).eq('id', editingHotelId);
      if (error) alert('Error al actualizar hotel');
      else {
        fetchFolders();
        setShowHotelModal(false);
      }
    } else {
      const { error } = await supabase.from('catalog_items').insert([dbData]);
      if (error) alert('Error al guardar hotel');
      else {
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

  const selectedFolder = folders.find(f => f.id === selectedFolderId);

  const openEditModal = (h: Hotel) => {
    setNewHotel(h);
    setEditingHotelId(h.id);
    setShowHotelModal(true);
  };

  const openCreateModal = () => {
    setNewHotel({ 
      name: '', cost_usd: 0, address: '', description: '', notes: '', links: [],
      nights: 1, breakfast: false, half_board: false, all_inclusive: false, extra_services: '', stars: 3
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
          ) : folders.length === 0 ? (
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
                  <span className="folder-count">{folder.hotels.length} hoteles</span>
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
              Nuevo Hotel
            </button>
          </div>

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
                          <span className="cost-usd">u$s {hotel.cost_usd}</span>
                          <span className="cost-ars">≈ ${(hotel.cost_usd * dollarRate).toLocaleString('es-AR')}</span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
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
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '0.75rem' }}>
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
          <div className="modal-content glass-card p-5" style={{ maxWidth: '450px' }}>
            <h3 className="m-0 mb-4" style={{ fontFamily: 'var(--font-main)', fontWeight: 800 }}>Nuevo Destino</h3>
            <div className="form-group">
              <label>Nombre de la Ciudad / Región</label>
              <input
                type="text"
                className="form-input"
                value={newFolderName}
                onChange={e => setNewFolderName(e.target.value)}
                placeholder="Ej: Madrid"
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

      {/* New/Edit Hotel Modal */}
      {showHotelModal && (
        <div className="modal-overlay">
          <div className="modal-content glass-card p-5" style={{ maxWidth: '700px' }}>
            <div className="modal-header-premium mb-4">
              <h3 className="m-0" style={{ fontFamily: 'var(--font-main)', fontWeight: 800, fontSize: '1.75rem' }}>
                {editingHotelId ? 'Editar Hotel' : 'Nuevo Hotel'}
              </h3>
              <span className="destination-badge">{selectedFolder?.name}</span>
            </div>
            <div className="modal-body-scrollable">
              <div className="modal-form">
                <div className="grid-2 gap-4">
                  <div className="form-group">
                    <label>Nombre del Hotel</label>
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
                    <label>Estrellas / Categoría</label>
                    <select 
                      className="form-input"
                      value={newHotel.stars || 3}
                      onChange={e => setNewHotel({ ...newHotel, stars: Number(e.target.value) })}
                    >
                      <option value="1">⭐ 1 Estrella</option>
                      <option value="2">⭐⭐ 2 Estrellas</option>
                      <option value="3">⭐⭐⭐ 3 Estrellas</option>
                      <option value="4">⭐⭐⭐⭐ 4 Estrellas</option>
                      <option value="5">⭐⭐⭐⭐⭐ 5 Estrellas</option>
                    </select>
                  </div>
                </div>

                <div className="grid-2 gap-4">
                  <div className="form-group">
                    <label>Costo Estancia Total (U$S)</label>
                    <div className="input-with-icon">
                      <DollarSign size={16} />
                      <input
                        type="number"
                        className="form-input"
                        value={newHotel.cost_usd || 0}
                        onChange={e => setNewHotel({ ...newHotel, cost_usd: parseFloat(e.target.value) })}
                      />
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Cantidad de Noches</label>
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
                </div>

                <div className="form-group">
                  <label>Dirección / Ubicación</label>
                  <div className="input-with-icon">
                    <MapPin size={16} />
                    <input
                      type="text"
                      className="form-input"
                      value={newHotel.address || ''}
                      onChange={e => setNewHotel({ ...newHotel, address: e.target.value })}
                      placeholder="Ej: Calle Gran Vía, 12, Madrid"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Régimen de Comidas</label>
                  <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.5rem', background: '#f8fafc', padding: '0.75rem', borderRadius: '12px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', margin: 0 }}>
                      <input type="checkbox" checked={newHotel.breakfast} onChange={e => setNewHotel({...newHotel, breakfast: e.target.checked})} />
                      Desayuno
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', margin: 0 }}>
                      <input type="checkbox" checked={newHotel.half_board} onChange={e => setNewHotel({...newHotel, half_board: e.target.checked})} />
                      Media Pensión
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', margin: 0 }}>
                      <input type="checkbox" checked={newHotel.all_inclusive} onChange={e => setNewHotel({...newHotel, all_inclusive: e.target.checked})} />
                      All Inclusive
                    </label>
                  </div>
                </div>

                <div className="form-group">
                  <label>Otros Servicios (Merienda, Snack Bar, etc.)</label>
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
                  <label>Descripción General</label>
                  <div className="input-with-icon align-start">
                    <Info size={16} />
                    <textarea
                      className="form-input"
                      style={{ height: '80px', paddingTop: '0.875rem' }}
                      value={newHotel.description || ''}
                      onChange={e => setNewHotel({ ...newHotel, description: e.target.value })}
                      placeholder="Detalles de la habitación, servicios incluidos..."
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-footer pt-4 mt-2">
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button className="btn btn-outline w-100" onClick={() => setShowHotelModal(false)}>Cancelar</button>
                <button className="btn btn-primary w-100" onClick={handleAddHotel}>
                  {editingHotelId ? 'Guardar Cambios' : 'Guardar Hotel'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

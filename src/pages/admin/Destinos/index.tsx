import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { Plus, Edit2, Trash2, Image as ImageIcon, Check, X, Upload } from 'lucide-react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import './Destinos.css';

interface Destination {
  id: string;
  title: string;
  description: string;
  image_url: string;
  images: string[];
  is_active: boolean;
  created_at: string;
}

export default function DestinosPage() {
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const handleUpload = async (file: File) => {
    try {
      setIsUploading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
      const filePath = fileName;

      const { error: uploadError } = await supabase.storage
        .from('destinations')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('destinations')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Error al subir la imagen. Asegúrate de que el bucket "destinations" sea público.');
      return null;
    } finally {
      setIsUploading(false);
    }
  };
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    image_url: '',
    images: [] as string[],
    is_active: true
  });

  useEffect(() => {
    fetchDestinations();
  }, []);

  const fetchDestinations = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('client_destinations')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching destinations:', error);
    } else {
      setDestinations(data || []);
    }
    setLoading(false);
  };

  const handleOpenModal = (destination?: Destination) => {
    if (destination) {
      setEditingId(destination.id);
      setFormData({
        title: destination.title,
        description: destination.description,
        image_url: destination.image_url,
        images: destination.images || [],
        is_active: destination.is_active
      });
    } else {
      setEditingId(null);
      setFormData({
        title: '',
        description: '',
        image_url: '',
        images: [],
        is_active: true
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.image_url.startsWith('data:image')) {
      alert('⚠️ Estás pegando una "vista previa" en miniatura (por eso se ve borrosa).\n\nPara obtener la imagen en alta calidad en Google:\n1. Haz clic en la imagen para que se abra en grande a la derecha.\n2. Haz clic derecho sobre esa imagen GRANDE.\n3. Selecciona "Copiar dirección de la imagen" (debe empezar con http).');
      return;
    }

    if (editingId) {
      const { error } = await supabase
        .from('client_destinations')
        .update(formData)
        .eq('id', editingId);
      
      if (error) {
        alert('Error al actualizar el destino');
        console.error(error);
      } else {
        setDestinations(destinations.map(d => d.id === editingId ? { ...d, ...formData } : d));
        handleCloseModal();
      }
    } else {
      const { data, error } = await supabase
        .from('client_destinations')
        .insert([formData])
        .select();
      
      if (error) {
        alert('Error al crear el destino. Recuerde ejecutar el script SQL primero.');
        console.error(error);
      } else if (data) {
        setDestinations([data[0], ...destinations]);
        handleCloseModal();
      }
    }
  };

  const toggleStatus = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from('client_destinations')
      .update({ is_active: !currentStatus })
      .eq('id', id);

    if (error) {
      alert('Error al actualizar el estado');
    } else {
      setDestinations(destinations.map(d => d.id === id ? { ...d, is_active: !currentStatus } : d));
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Estás seguro de eliminar este destino? Esta acción no se puede deshacer.')) return;
    
    const { error } = await supabase
      .from('client_destinations')
      .delete()
      .eq('id', id);

    if (error) {
      alert('Error al eliminar');
    } else {
      setDestinations(destinations.filter(d => d.id !== id));
    }
  };

  return (
    <div className="destinos-admin-page animate-fade-in">
      <header className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '2.5rem', fontFamily: "'Playfair Display', serif", fontWeight: 900, color: 'var(--color-primary)', margin: '0 0 0.5rem 0' }}>Recomendaciones de Destinos</h1>
          <p style={{ color: '#64748b', fontSize: '1.1rem', margin: 0 }}>Carga imágenes y descripciones para inspirar a tus futuros clientes.</p>
        </div>
        <button className="btn btn-primary" onClick={() => handleOpenModal()}>
          <Plus size={20} />
          Nuevo Destino
        </button>
      </header>

      {loading ? (
        <div className="loading-state-premium">
          <div className="loader-premium"></div>
          <p>Cargando destinos...</p>
        </div>
      ) : destinations.length === 0 ? (
        <div className="empty-state-premium glass-card">
          <div className="empty-state-icon-wrapper">
            <ImageIcon size={36} color="#C89B5A" />
          </div>
          <h3>Aún no tienes recomendaciones</h3>
          <p>Agrega lugares increíbles para mostrar en tu página principal.</p>
          <button className="btn btn-primary" onClick={() => handleOpenModal()} style={{ marginTop: '1.5rem' }}>
            Comenzar ahora
          </button>
        </div>
      ) : (
        <div className="destinos-grid">
          {destinations.map(destino => (
            <div key={destino.id} className={`destino-card glass-card ${!destino.is_active ? 'inactive' : ''}`}>
              <div className="destino-image-wrapper">
                <img src={destino.image_url} alt={destino.title} onError={(e) => (e.currentTarget.src = 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&q=80&w=600')} />
                <div className="destino-actions">
                  <button onClick={() => toggleStatus(destino.id, destino.is_active)} className="action-btn status-btn" title={destino.is_active ? 'Ocultar de la web' : 'Mostrar en la web'}>
                    {destino.is_active ? <Check size={18} /> : <X size={18} />}
                  </button>
                  <button onClick={() => handleOpenModal(destino)} className="action-btn edit-btn" title="Editar">
                    <Edit2 size={18} />
                  </button>
                  <button onClick={() => handleDelete(destino.id)} className="action-btn delete-btn" title="Eliminar">
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
              <div className="destino-info">
                <h3>{destino.title}</h3>
                <div dangerouslySetInnerHTML={{ __html: destino.description }} style={{ fontSize: '0.9rem', color: '#64748b', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }} />
                <div className="destino-status">
                  <span className={`status-badge ${destino.is_active ? 'active' : 'inactive'}`}>
                    {destino.is_active ? 'Público' : 'Oculto'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Formulario */}
      {isModalOpen && (
        <div className="modal-overlay animate-fade-in" onClick={handleCloseModal}>
          <div className="modal-content-pro animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingId ? 'Editar Destino' : 'Nuevo Destino Recomendado'}</h2>
              <button className="close-btn" onClick={handleCloseModal}><X size={24} /></button>
            </div>
            
            <form id="destination-form" onSubmit={handleSubmit} className="modal-form">
              <div className="form-group-pro">
                <label>Título del Destino *</label>
                <input 
                  type="text" 
                  required
                  placeholder="Ej: Playas Exclusivas del Caribe"
                  value={formData.title}
                  onChange={e => setFormData({...formData, title: e.target.value})}
                  className="pro-input"
                />
              </div>
              
              <div className="form-group-pro">
                <label>Descripción *</label>
                <div style={{ backgroundColor: 'white', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                  <ReactQuill 
                    theme="snow"
                    value={formData.description}
                    onChange={(val) => setFormData({...formData, description: val})}
                    style={{ height: '200px' }}
                  />
                </div>
                <div style={{ height: '45px' }}></div>
              </div>

              <div className="form-group-pro">
                <label>Imagen Principal (Portada) *</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input 
                    type="url" 
                    required
                    placeholder="URL de la imagen o sube una..."
                    value={formData.image_url}
                    onChange={e => setFormData({...formData, image_url: e.target.value})}
                    className="pro-input"
                    style={{ flex: 1 }}
                  />
                  <label className="btn btn-outline" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', whiteSpace: 'nowrap' }}>
                    <Upload size={18} />
                    <input 
                      type="file" 
                      accept="image/*" 
                      style={{ display: 'none' }}
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const url = await handleUpload(file);
                          if (url) setFormData({...formData, image_url: url});
                        }
                      }}
                    />
                    {isUploading ? '...' : 'Subir'}
                  </label>
                </div>
              </div>
              
              <div className="form-group-pro">
                <label>Galería de Imágenes Adicionales</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {formData.images.map((url, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <input 
                        type="url" 
                        value={url}
                        onChange={e => {
                          const newImages = [...formData.images];
                          newImages[idx] = e.target.value;
                          setFormData({...formData, images: newImages});
                        }}
                        className="pro-input"
                        placeholder="URL de imagen"
                        style={{ flex: 1 }}
                      />
                      <label className="btn btn-icon" style={{ cursor: 'pointer', color: 'var(--color-primary)' }} title="Subir archivo">
                        <Upload size={18} />
                        <input 
                          type="file" 
                          accept="image/*" 
                          style={{ display: 'none' }}
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const uploadedUrl = await handleUpload(file);
                              if (uploadedUrl) {
                                const newImages = [...formData.images];
                                newImages[idx] = uploadedUrl;
                                setFormData({...formData, images: newImages});
                              }
                            }
                          }}
                        />
                      </label>
                      <button 
                        type="button" 
                        onClick={() => {
                          const newImages = formData.images.filter((_, i) => i !== idx);
                          setFormData({...formData, images: newImages});
                        }}
                        style={{ 
                          background: 'none', 
                          border: 'none', 
                          color: '#ef4444', 
                          cursor: 'pointer',
                          padding: '0 8px',
                          display: 'flex',
                          alignItems: 'center',
                          transition: 'transform 0.2s'
                        }}
                        onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.2)'}
                        onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                        title="Eliminar"
                      >
                        <Trash2 size={20} />
                      </button>
                    </div>
                  ))}
                  <button 
                    type="button" 
                    className="btn btn-outline" 
                    onClick={() => setFormData({...formData, images: [...formData.images, '']})}
                    style={{ alignSelf: 'flex-start', fontSize: '0.85rem', marginTop: '0.5rem' }}
                  >
                    <Plus size={14} /> Agregar otra imagen
                  </button>
                </div>
              </div>
            </form>

            <div className="form-actions">
              <button type="button" className="btn btn-outline" onClick={handleCloseModal}>Cancelar</button>
              <button type="submit" form="destination-form" className="btn btn-primary">
                {editingId ? 'Guardar Cambios' : 'Crear Destino'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

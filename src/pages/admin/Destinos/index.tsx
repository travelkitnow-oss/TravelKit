import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { Plus, Edit2, Trash2, Image as ImageIcon, Eye, EyeOff, Upload, X } from 'lucide-react';
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
                  <button onClick={() => toggleStatus(destino.id, destino.is_active)} className="action-btn status-btn" title={destino.is_active ? 'Ocultar de la web' : 'Mostrar en la web'} style={{ color: destino.is_active ? '#10b981' : '#64748b' }}>
                    {destino.is_active ? <Eye size={18} /> : <EyeOff size={18} />}
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
              <div className="form-group-destino">
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
              
              <div className="form-group-destino">
                <label>Descripción *</label>
                <div style={{ backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '2.5rem' }}>
                  <ReactQuill 
                    theme="snow"
                    value={formData.description}
                    onChange={(val) => setFormData({...formData, description: val})}
                    className="quill-destino"
                  />
                </div>
              </div>

              <div className="form-group-destino">
                <label>Imagen Principal (Portada) *</label>
                
                {formData.image_url ? (
                  <div style={{ position: 'relative', borderRadius: '16px', overflow: 'hidden', height: '200px', border: '1px solid #e2e8f0', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)' }}>
                    <img src={formData.image_url} alt="Portada" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <button 
                      type="button" 
                      onClick={() => setFormData({...formData, image_url: ''})}
                      style={{ position: 'absolute', top: '12px', right: '12px', background: 'white', border: 'none', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 4px 15px rgba(0,0,0,0.15)', color: '#ef4444', transition: 'all 0.2s' }}
                      onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.1)'; e.currentTarget.style.background = '#fef2f2'; }}
                      onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.background = 'white'; }}
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ) : (
                  <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3.5rem 2rem', borderRadius: '20px', background: 'linear-gradient(145deg, #ffffff, #f8fafc)', border: '1px solid #e2e8f0', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.03)', cursor: 'pointer', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', textTransform: 'none', letterSpacing: 'normal' }}
                         onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 15px 35px -5px rgba(31, 58, 77, 0.1)'; e.currentTarget.style.borderColor = '#C89B5A'; }}
                         onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 10px 25px -5px rgba(0, 0, 0, 0.03)'; e.currentTarget.style.borderColor = '#e2e8f0'; }}>
                    <div style={{ background: 'white', padding: '1rem', borderRadius: '50%', boxShadow: '0 4px 15px rgba(0,0,0,0.06)', marginBottom: '1.2rem' }}>
                      <ImageIcon size={32} color="var(--color-primary)" />
                    </div>
                    <span style={{ fontFamily: "'Outfit', sans-serif", fontSize: '1.15rem', fontWeight: 700, color: '#1F3A4D', marginBottom: '0.4rem' }}>
                      {isUploading ? 'Subiendo...' : 'Subir imagen de portada'}
                    </span>
                    <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: 500 }}>
                      Haz clic para seleccionar un archivo
                    </span>
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
                  </label>
                )}
                
                <div style={{ position: 'relative', marginTop: '1rem' }}>
                  <div style={{ position: 'absolute', top: '50%', left: '1rem', transform: 'translateY(-50%)', color: '#94a3b8' }}>
                    <Upload size={18} />
                  </div>
                  <input 
                    type="url" 
                    placeholder="O pega directamente la URL de la imagen aquí..."
                    value={formData.image_url}
                    onChange={e => setFormData({...formData, image_url: e.target.value})}
                    className="pro-input"
                    style={{ paddingLeft: '3rem', background: '#f8fafc', border: '1px solid #e2e8f0' }}
                  />
                </div>
              </div>
              
              <div className="form-group-destino">
                <label>Galería de Imágenes Adicionales</label>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '1rem', marginTop: '0.5rem' }}>
                  {formData.images.map((url, idx) => (
                    <div key={idx} style={{ position: 'relative', borderRadius: '16px', overflow: 'hidden', height: '160px', border: '1px solid #e2e8f0', background: 'white', boxShadow: '0 4px 10px rgba(0,0,0,0.03)' }}>
                      {url ? (
                        <>
                          <img src={url} alt={`Galería ${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => (e.currentTarget.src = 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&q=80&w=300')} />
                          <button 
                            type="button" 
                            onClick={() => {
                              const newImages = formData.images.filter((_, i) => i !== idx);
                              setFormData({...formData, images: newImages});
                            }}
                            style={{ position: 'absolute', top: '8px', right: '8px', background: 'white', border: 'none', borderRadius: '50%', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 4px 10px rgba(0,0,0,0.15)', color: '#ef4444', transition: 'transform 0.2s' }}
                            onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.15)'}
                            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                          >
                            <Trash2 size={14} />
                          </button>
                        </>
                      ) : (
                        <div style={{ padding: '0.8rem', height: '100%', display: 'flex', flexDirection: 'column', gap: '0.5rem', background: '#f8fafc' }}>
                          <input 
                            type="url" 
                            value={url}
                            onChange={e => {
                              const newImages = [...formData.images];
                              newImages[idx] = e.target.value;
                              setFormData({...formData, images: newImages});
                            }}
                            placeholder="Pegar URL..."
                            className="pro-input"
                            style={{ padding: '0.6rem', fontSize: '0.85rem', background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                          />
                          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <span style={{ fontSize: '0.85rem', color: '#94a3b8', fontWeight: 600 }}>o sube archivo</span>
                          </div>
                          <label style={{ position: 'absolute', top: '50px', left: 0, right: 0, bottom: 0, cursor: 'pointer' }}>
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
                        </div>
                      )}
                    </div>
                  ))}
                  
                  <button 
                    type="button" 
                    onClick={() => setFormData({...formData, images: [...formData.images, '']})}
                    style={{ 
                      display: 'flex', 
                      flexDirection: 'column',
                      alignItems: 'center', 
                      justifyContent: 'center',
                      gap: '0.8rem', 
                      height: '160px',
                      borderRadius: '16px', 
                      background: 'linear-gradient(145deg, #ffffff, #f8fafc)', 
                      border: '1px solid #e2e8f0',
                      color: 'var(--color-primary)', 
                      cursor: 'pointer', 
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      boxShadow: '0 4px 10px rgba(0,0,0,0.03)'
                    }}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.borderColor = '#C89B5A'; e.currentTarget.style.boxShadow = '0 10px 20px rgba(31, 58, 77, 0.08)'; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.boxShadow = '0 4px 10px rgba(0,0,0,0.03)'; }}
                  >
                    <div style={{ background: '#f8fafc', padding: '0.7rem', borderRadius: '50%', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
                      <Plus size={20} color="var(--color-primary)" />
                    </div>
                    <span style={{ fontFamily: "'Outfit', sans-serif", fontSize: '0.95rem', fontWeight: 600 }}>Agregar Imagen</span>
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

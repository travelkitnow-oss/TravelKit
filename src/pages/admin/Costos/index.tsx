import { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, X, Check, Ticket, DollarSign, Package, Briefcase } from 'lucide-react';
import ConfirmationModal from '../../../components/ConfirmationModal/ConfirmationModal';
import { supabase } from '../../../lib/supabase';
import './Costos.css';

interface ServiceItem {
  id: string;
  name: string;
  price: number;
}

export default function CostosPage() {
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPrice, setNewPrice] = useState<string>('');
  const [editingService, setEditingService] = useState<ServiceItem | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('services').select('*').order('name');
    if (error) {
      console.error('Error fetching services:', error);
    } else {
      setServices(data || []);
    }
    setLoading(false);
  };

  const handleAddService = async () => {
    if (!newName || !newPrice) return;
    const { data, error } = await supabase.from('services').insert([
      { name: newName, price: parseFloat(newPrice) }
    ]).select();

    if (error) {
      console.error('Error saving service:', error);
      alert('Error al guardar servicio: ' + error.message);
    } else if (data) {
      setServices([...services, data[0]]);
      setNewName('');
      setNewPrice('');
      setShowAddModal(false);
    }
  };

  const handleUpdateService = async () => {
    if (!editingService) return;
    const { error } = await supabase
      .from('services')
      .update({ name: editingService.name, price: editingService.price })
      .eq('id', editingService.id);

    if (error) {
      console.error('Error updating service:', error);
      alert('Error al actualizar servicio: ' + error.message);
    } else {
      setServices(services.map(s => s.id === editingService.id ? editingService : s));
      setEditingService(null);
    }
  };

  const handleDeleteService = async () => {
    if (isDeleting) {
      const { error } = await supabase.from('services').delete().eq('id', isDeleting);
      if (error) {
        console.error('Error deleting service:', error);
        alert('Error al eliminar servicio: ' + error.message);
      } else {
        setServices(services.filter(s => s.id !== isDeleting));
        setIsDeleting(null);
      }
    }
  };

  return (
    <div className="costos-page animate-fade-in">
      <header className="page-header-centered">
        <h1>Tarifario de Servicios</h1>
        <p>Define los precios de tus asesorías y servicios personalizados para mantener la transparencia con tus viajeros.</p>
      </header>

      <div className="glass-card mb-4" style={{ borderLeft: '4px solid var(--color-accent)', background: 'rgba(212, 175, 55, 0.05)' }}>
        <div className="card-body py-3">
          <p className="text-sm m-0">
            <strong>💡 Tip:</strong> Crea un servicio llamado <strong>"Sesión Inicial"</strong> para que el sistema sepa qué precio cobrar en la Agenda (adelanto del 50% y saldo final).
          </p>
        </div>
      </div>

      <div className="glass-card">
        <div className="card-header border-bottom" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0 }}>Listado de Tarifas</h3>
          <button className="btn btn-primary btn-sm" onClick={() => setShowAddModal(true)}>
            <Plus size={18} /> Nueva Tarea/Costo
          </button>
        </div>
        
        {loading ? (
          <div className="p-5 text-center">
            <div className="loader-premium"></div>
            <p className="mt-3">Cargando tarifas...</p>
          </div>
        ) : (
          <table className="costos-table">
            <thead>
              <tr>
                <th>Nombre de la Tarea / Servicio</th>
                <th>Precio</th>
                <th style={{ textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {services.length > 0 ? (
                services.map(service => (
                  <tr key={service.id} className="costos-row">
                    <td>
                      {editingService?.id === service.id ? (
                        <div className="edit-input-wrapper">
                          <Package size={18} className="text-secondary" />
                          <input 
                            type="text" 
                            className="form-input-sm"
                            value={editingService.name}
                            onChange={e => setEditingService({...editingService, name: e.target.value})}
                          />
                        </div>
                      ) : (
                        <div className="service-info-cell">
                          <div className="service-icon-bg">
                            {service.name.toLowerCase().includes('sesi') ? <Briefcase size={18} /> : <Ticket size={18} />}
                          </div>
                          <span className="service-name">{service.name}</span>
                        </div>
                      )}
                    </td>
                    <td>
                      {editingService?.id === service.id ? (
                        <div className="edit-input-wrapper">
                          <span className="currency-prefix">$</span>
                          <input 
                            type="number" 
                            className="form-input-sm price-input"
                            style={{ fontWeight: 'bold' }}
                            value={editingService.price}
                            onChange={e => setEditingService({...editingService, price: parseFloat(e.target.value)})}
                          />
                        </div>
                      ) : (
                        <div className="price-badge">
                          <DollarSign size={14} />
                          <span>{service.price.toLocaleString('es-AR')}</span>
                        </div>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="actions-cell">
                        {editingService?.id === service.id ? (
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button className="btn btn-primary btn-xs" onClick={handleUpdateService} title="Guardar">
                              <Check size={14} />
                            </button>
                            <button className="btn btn-outline btn-xs" onClick={() => setEditingService(null)} title="Cancelar">
                              <X size={14} />
                            </button>
                          </div>
                        ) : (
                          <div className="action-buttons-row">
                            <button className="action-btn edit" onClick={() => setEditingService(service)} title="Editar">
                              <Edit2 size={16} />
                            </button>
                            <button className="action-btn delete" onClick={() => setIsDeleting(service.id)} title="Eliminar">
                              <Trash2 size={16} />
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3}>
                    <div className="empty-state-container">
                      <Package size={48} />
                      <p>No se encontraron servicios definidos.</p>
                      <button className="btn btn-outline btn-sm" onClick={() => setShowAddModal(true)}>Cargar mi primer servicio</button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {showAddModal && (
        <div className="modal-overlay animate-fade-in" style={{ zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="modal-content animate-scale-in" style={{ maxWidth: '420px', padding: 0, overflow: 'hidden' }}>
            <div className="modal-header-v2" style={{ background: 'var(--color-primary)', padding: '1.5rem 2rem', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ background: 'rgba(255,255,255,0.15)', padding: '8px', borderRadius: '10px' }}>
                  <Package size={20} color="white" />
                </div>
                <h3 style={{ margin: 0, color: 'white', fontSize: '1.2rem' }}>Nueva Tarea / Costo</h3>
              </div>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 'none', color: 'white', opacity: 0.7, cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>
            
            <div className="modal-body" style={{ padding: '2rem' }}>
              <div className="form-group mb-4">
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '0.5rem', letterSpacing: '0.5px' }}>Nombre del Servicio</label>
                <div className="input-with-icon" style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <Briefcase size={18} style={{ position: 'absolute', left: '1rem', color: 'var(--color-primary)', opacity: 0.5 }} />
                  <input 
                    type="text" 
                    className="form-input" 
                    style={{ paddingLeft: '3rem', width: '100%' }}
                    placeholder="Ej: Armado de itinerario"
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                  />
                </div>
              </div>
              <div className="form-group mb-4">
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '0.5rem', letterSpacing: '0.5px' }}>Precio Sugerido</label>
                <div className="input-with-icon" style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <DollarSign size={18} style={{ position: 'absolute', left: '1rem', color: '#10b981' }} />
                  <input 
                    type="number" 
                    className="form-input" 
                    style={{ paddingLeft: '3rem', width: '100%', fontWeight: 700, fontSize: '1.1rem', color: 'var(--color-primary)' }}
                    placeholder="0.00"
                    value={newPrice}
                    onChange={e => setNewPrice(e.target.value)}
                  />
                </div>
              </div>
              
              <div style={{ background: 'rgba(212, 175, 55, 0.05)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(212, 175, 55, 0.1)', marginTop: '1.5rem' }}>
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                  <strong>Nota:</strong> Los servicios cargados aquí aparecerán como opción en el panel de tareas de cada cliente.
                </p>
              </div>
            </div>
 
            <div className="modal-footer" style={{ padding: '1.5rem 2rem', background: '#f8fafc', display: 'flex', gap: '1rem' }}>
              <button className="btn btn-outline w-100" style={{ margin: 0 }} onClick={() => setShowAddModal(false)}>Cancelar</button>
              <button className="btn btn-primary w-100" style={{ margin: 0 }} onClick={handleAddService}>Guardar Servicio</button>
            </div>
          </div>
        </div>
      )}

      <ConfirmationModal 
        isOpen={!!isDeleting}
        onClose={() => setIsDeleting(null)}
        onConfirm={handleDeleteService}
        title="¿Eliminar costo?"
        message="Esta tarea ya no estará disponible para asignar a nuevos clientes."
        type="danger"
      />
    </div>
  );
}

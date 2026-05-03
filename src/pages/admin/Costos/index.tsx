import { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, X, Check } from 'lucide-react';
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
                  <tr key={service.id}>
                    <td>
                      {editingService?.id === service.id ? (
                        <input 
                          type="text" 
                          className="form-input-sm"
                          value={editingService.name}
                          onChange={e => setEditingService({...editingService, name: e.target.value})}
                        />
                      ) : (
                        <span className="service-name">{service.name}</span>
                      )}
                    </td>
                    <td>
                      {editingService?.id === service.id ? (
                        <input 
                          type="number" 
                          className="form-input-sm price-input"
                          style={{ width: '120px', textAlign: 'right', fontWeight: 'bold' }}
                          value={editingService.price}
                          onChange={e => setEditingService({...editingService, price: parseFloat(e.target.value)})}
                        />
                      ) : (
                        <span className="service-price">${service.price.toLocaleString('es-AR')}</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="actions-cell" style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                        {editingService?.id === service.id ? (
                          <>
                            <button className="btn btn-primary btn-xs" onClick={handleUpdateService} title="Guardar">
                              <Check size={14} />
                            </button>
                            <button className="btn btn-outline btn-xs" onClick={() => setEditingService(null)} title="Cancelar">
                              <X size={14} />
                            </button>
                          </>
                        ) : (
                          <>
                            <button className="btn-icon-sm" onClick={() => setEditingService(service)} title="Editar">
                              <Edit2 size={16} />
                            </button>
                            <button className="btn-icon-sm text-danger" onClick={() => setIsDeleting(service.id)} title="Eliminar">
                              <Trash2 size={16} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3} className="text-center py-4 text-secondary">No se encontraron servicios definidos.</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {showAddModal && (
        <div className="modal-overlay animate-fade-in" style={{ zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="modal-content animate-scale-in" style={{ maxWidth: '450px' }}>
            <div className="modal-header">
              <h3>Nueva Tarea / Costo</h3>
              <button onClick={() => setShowAddModal(false)} className="close-modal-btn">
                <X size={20} />
              </button>
            </div>
            
            <div className="modal-body">
              <div className="form-group">
                <label>Nombre del Servicio</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="Ej: Armado de itinerario"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Precio</label>
                <input 
                  type="number" 
                  className="form-input" 
                  placeholder="0.00"
                  value={newPrice}
                  onChange={e => setNewPrice(e.target.value)}
                />
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-outline w-100" onClick={() => setShowAddModal(false)}>Cancelar</button>
              <button className="btn btn-primary w-100" onClick={handleAddService}>Guardar</button>
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

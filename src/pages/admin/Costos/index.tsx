import { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, X, Check, Ticket, DollarSign, Package, Briefcase } from 'lucide-react';
import ConfirmationModal from '../../../components/ConfirmationModal/ConfirmationModal';
import { db } from '../../../lib/db';
import './Costos.css';

import PageHeader from '../../../components/PageHeader/PageHeader';
import TableEmpty from '../../../components/TableEmpty/TableEmpty';
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
    const { data, error } = await db.from('services').select('*').order('name');
    if (error) {
      console.error('Error fetching services:', error);
    } else {
      setServices(data || []);
    }
    setLoading(false);
  };

  const handleAddService = async () => {
    if (!newName || !newPrice) return;
    const { data, error } = await db.from('services').insert([
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
    const { error } = await db
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
      const { error } = await db.from('services').delete().eq('id', isDeleting);
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
      <PageHeader
        section="Gestión"
        title="Tarifario de Servicios"
        subtitle="Define los precios de tus asesorías y servicios personalizados para mantener la transparencia con tus viajeros."
      />

      <div className="glass-card mb-4" style={{ borderLeft: '4px solid var(--color-accent)', background: 'rgba(212, 175, 55, 0.05)' }}>
        <div className="card-body py-3">
          <p className="text-sm m-0">
            <strong>💡 Tip:</strong> Crea un servicio llamado <strong>"Sesión Inicial"</strong> para que el sistema sepa qué precio cobrar en la Agenda (adelanto del 50% y saldo final).
          </p>
        </div>
      </div>

      <div className="glass-card">
        <div className="tk-table-head">
          <div className="tk-table-title">
            <h3>Listado de tarifas</h3>
            <p>Los servicios que podés sumar a la cuenta de cada cliente.</p>
          </div>
          <div className="tk-table-tools">
            <span className="tk-count"><strong>{services.length}</strong> {services.length === 1 ? 'servicio' : 'servicios'}</span>
            <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
              <Plus size={18} /> Nuevo servicio
            </button>
          </div>
        </div>

        <div className="tk-table-wrap">
          <table className="tk-table">
            <thead>
              <tr>
                <th>Servicio</th>
                <th className="tk-num">Precio</th>
                <th className="tk-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <TableEmpty colSpan={3} loading title="Cargando tarifas…" />
              ) : services.length === 0 ? (
                <TableEmpty
                  colSpan={3}
                  icon={<Package size={26} />}
                  title="Todavía no hay servicios"
                  text="Definí tus asesorías y servicios con su precio para usarlos en las tareas de cada cliente."
                  action={<button className="btn btn-outline btn-sm" onClick={() => setShowAddModal(true)}><Plus size={16} /> Cargar mi primer servicio</button>}
                />
              ) : (
                services.map(service => (
                  <tr key={service.id}>
                    <td>
                      {editingService?.id === service.id ? (
                        <div className="tk-inline-input">
                          <input
                            type="text"
                            aria-label="Nombre del servicio"
                            value={editingService.name}
                            onChange={e => setEditingService({ ...editingService, name: e.target.value })}
                          />
                        </div>
                      ) : (
                        <div className="tk-cell-main">
                          <span className="tk-avatar square">
                            {service.name.toLowerCase().includes('sesi') ? <Briefcase size={16} /> : <Ticket size={16} />}
                          </span>
                          <div className="tk-cell-text"><strong>{service.name}</strong></div>
                        </div>
                      )}
                    </td>
                    <td className="tk-num">
                      {editingService?.id === service.id ? (
                        <div className="tk-inline-input" style={{ justifyContent: 'flex-end' }}>
                          <span className="tk-prefix">$</span>
                          <input
                            type="number"
                            aria-label="Precio"
                            style={{ maxWidth: 140, textAlign: 'right' }}
                            value={editingService.price}
                            onChange={e => setEditingService({ ...editingService, price: parseFloat(e.target.value) })}
                          />
                        </div>
                      ) : (
                        <span className="tk-amount">${service.price.toLocaleString('es-AR')}</span>
                      )}
                    </td>
                    <td>
                      <div className="tk-actions">
                        {editingService?.id === service.id ? (
                          <>
                            <button className="tk-icon-btn success" onClick={handleUpdateService} title="Guardar" aria-label="Guardar"><Check size={16} /></button>
                            <button className="tk-icon-btn" onClick={() => setEditingService(null)} title="Cancelar" aria-label="Cancelar"><X size={16} /></button>
                          </>
                        ) : (
                          <>
                            <button className="tk-icon-btn" onClick={() => setEditingService(service)} title="Editar" aria-label="Editar"><Edit2 size={16} /></button>
                            <button className="tk-icon-btn danger" onClick={() => setIsDeleting(service.id)} title="Eliminar" aria-label="Eliminar"><Trash2 size={16} /></button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showAddModal && (
        <div className="modal-overlay animate-fade-in" style={{ zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="modal-content-pro modal-sm">
            <div className="modal-header-pro">
              <div className="header-left">
                <div className="header-icon"><Package size={20} /></div>
                <div className="header-text">
                  <h3>Nueva tarea / costo</h3>
                  <p>Se suma al tarifario de servicios</p>
                </div>
              </div>
              <button onClick={() => setShowAddModal(false)} className="close-modal-btn" aria-label="Cerrar">
                <X size={18} />
              </button>
            </div>
            
            <div className="modal-body-pro">
              <div className="form-group mb-4">
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '0.5rem', letterSpacing: '0.5px' }}>Nombre del Servicio</label>
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
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '0.5rem', letterSpacing: '0.5px' }}>Precio Sugerido</label>
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
 
            <div className="modal-footer-pro">
              <button onClick={() => setShowAddModal(false)} className="btn btn-outline">Cancelar</button>
              <button onClick={handleAddService} className="btn btn-primary">Guardar Servicio</button>
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

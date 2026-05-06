import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Receipt, CreditCard, Clock, CheckCircle2, AlertCircle, Landmark, Copy } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import './ServiciosContratados.css';

interface Task {
  serviceId: string;
  name: string;
  price: number;
  date: string;
  completed: boolean;
  paid: boolean;
  payment_status?: 'pending' | 'requested' | 'paid';
}

export default function ServiciosContratadosPage() {
  const { clientId } = useOutletContext<{ clientId: string }>();
  const [loading, setLoading] = useState(true);
  const [billingData, setBillingData] = useState<any>(null);
  const [bankData, setBankData] = useState<any>({});
  const [selectedTasks, setSelectedTasks] = useState<number[]>([]);
  const [showPaymentInfo, setShowPaymentInfo] = useState(false);
  const [notifying, setNotifying] = useState(false);

  useEffect(() => {
    if (clientId) {
      fetchData();
    }
  }, [clientId]);

  async function fetchData() {
    setLoading(true);
    const { data: billing } = await supabase
      .from('client_billing')
      .select('*')
      .eq('client_id', clientId)
      .single();

    const { data: settings } = await supabase
      .from('site_settings')
      .select('key, value')
      .in('key', ['bank_name', 'bank_cbu', 'bank_alias', 'bank_holder']);

    if (billing) setBillingData(billing);
    if (settings) {
      const bank: any = {};
      settings.forEach(s => bank[s.key] = s.value);
      setBankData(bank);
    }
    setLoading(false);
  }

  const tasks = (billingData?.tasks as Task[]) || [];
  const unpaidTasks = tasks.filter(t => !t.paid && t.payment_status !== 'requested' && t.price > 0);
  const requestedTasks = tasks.filter(t => t.payment_status === 'requested');
  const paidTasks = tasks.filter(t => (t.paid || t.payment_status === 'paid') && t.price > 0);

  const totalSelected = selectedTasks.reduce((sum, idx) => sum + tasks[idx].price, 0);

  async function handleNotifyPayment() {
    if (selectedTasks.length === 0) return;
    setNotifying(true);
    const updatedTasks = [...tasks];
    selectedTasks.forEach(idx => {
      updatedTasks[idx].payment_status = 'requested';
    });

    const { error } = await supabase
      .from('client_billing')
      .update({ tasks: updatedTasks })
      .eq('client_id', clientId);

    if (!error) {
      setBillingData({ ...billingData, tasks: updatedTasks });
      setSelectedTasks([]);
      setShowPaymentInfo(false);
    }
    setNotifying(false);
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="servicios-contratados-page animate-fade-in">
      <header className="page-header-centered">
        <h1>Servicios Contratados</h1>
        <p>Gestiona tus pagos y revisa el historial de servicios de tu viaje.</p>
      </header>

      {loading ? (
        <div className="loading-container">
          <div className="loader-premium"></div>
          <p>Cargando información de servicios...</p>
        </div>
      ) : (
        <div className="servicios-container">
          <div className="servicios-main-grid">
            {/* Boleta / A pagar */}
            <section className="glass-card bill-card">
              <div className="card-header border-bottom">
                <h3><Receipt size={20} className="text-accent" /> Servicios Pendientes</h3>
                {unpaidTasks.length > 0 && <span className="badge badge-pending">{unpaidTasks.length} pendiente(s)</span>}
              </div>
              <div className="card-body p-0">
                {unpaidTasks.length === 0 ? (
                  <div className="empty-state-v2">
                    <div className="icon-wrapper success">
                      <CheckCircle2 size={32} />
                    </div>
                    <h4>¡Todo al día!</h4>
                    <p>No tienes servicios pendientes de pago en este momento.</p>
                  </div>
                ) : (
                  <div className="tasks-list">
                    {tasks.map((task, idx) => {
                      if (task.paid || task.payment_status === 'requested' || task.price <= 0) return null;
                      const isSelected = selectedTasks.includes(idx);
                      return (
                        <div 
                          key={idx} 
                          className={`task-item-v2 ${isSelected ? 'selected' : ''}`}
                          onClick={() => {
                            if (isSelected) setSelectedTasks(selectedTasks.filter(i => i !== idx));
                            else setSelectedTasks([...selectedTasks, idx]);
                          }}
                        >
                          <div className="checkbox-custom">
                            {isSelected && <div className="checked-inner"></div>}
                          </div>
                          <div className="task-content">
                            <span className="task-name">{task.name}</span>
                            <span className="task-date">{new Date(task.date).toLocaleDateString('es-AR')}</span>
                          </div>
                          <span className="task-price">${task.price.toLocaleString('es-AR')}</span>
                        </div>
                      );
                    })}
                    
                    <div className="billing-footer">
                      <div className="total-summary">
                        <span className="label">Monto a pagar:</span>
                        <span className="value">${totalSelected.toLocaleString('es-AR')}</span>
                      </div>
                      <button 
                        className="btn btn-primary btn-lg w-full" 
                        disabled={selectedTasks.length === 0}
                        onClick={() => setShowPaymentInfo(true)}
                      >
                        <CreditCard size={20} /> Notificar Pago
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* Historial */}
            <section className="glass-card history-card">
              <div className="card-header border-bottom">
                <h3><Clock size={20} className="text-accent" /> Historial de Actividad</h3>
              </div>
              <div className="card-body p-0">
                {requestedTasks.length === 0 && paidTasks.length === 0 ? (
                  <div className="empty-state-v2">
                    <div className="icon-wrapper gray">
                      <Clock size={32} />
                    </div>
                    <h4>Sin movimientos</h4>
                    <p>Aún no has registrado pagos para tus servicios.</p>
                  </div>
                ) : (
                  <div className="history-list-v2">
                    {requestedTasks.map((task, idx) => (
                      <div key={`req-${idx}`} className="history-item-v2 pending">
                        <div className="status-dot"></div>
                        <div className="history-content">
                          <span className="history-name">{task.name}</span>
                          <span className="history-status">Esperando confirmación</span>
                        </div>
                        <span className="history-amount">${task.price.toLocaleString('es-AR')}</span>
                      </div>
                    ))}
                    {paidTasks.map((task, idx) => (
                      <div key={`paid-${idx}`} className="history-item-v2 confirmed">
                        <div className="status-dot"></div>
                        <div className="history-content">
                          <span className="history-name">{task.name}</span>
                          <span className="history-status">Pago confirmado</span>
                        </div>
                        <span className="history-amount">${task.price.toLocaleString('es-AR')}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>
      )}

      {/* Modal de Pago */}
      {showPaymentInfo && (
        <div className="modal-overlay">
          <div className="modal-content-premium animate-scale-in">
            <div className="modal-header-v2">
              <div className="header-info">
                <div className="icon-badge">
                  <Landmark size={24} />
                </div>
                <div>
                  <h3>Detalles de Transferencia</h3>
                  <p>Copia los datos para realizar el pago</p>
                </div>
              </div>
              <button className="close-btn" onClick={() => setShowPaymentInfo(false)}>&times;</button>
            </div>
            
            <div className="modal-body-v2">
              <div className="payment-bill mb-6">
                <div className="bill-row">
                  <span>Items seleccionados ({selectedTasks.length})</span>
                  <span>${totalSelected.toLocaleString('es-AR')}</span>
                </div>
                <div className="bill-row total">
                  <span>Total a transferir</span>
                  <span>${totalSelected.toLocaleString('es-AR')}</span>
                </div>
              </div>

              <div className="bank-card-premium">
                <div className="bank-chip"></div>
                <div className="bank-name-label">{bankData.bank_name || 'Nombre del Banco'}</div>
                
                <div className="bank-data-grid">
                  <div className="data-item">
                    <label>Titular</label>
                    <div className="data-value">{bankData.bank_holder || 'Configuración pendiente'}</div>
                  </div>
                  <div className="data-item">
                    <label>CBU / CVU</label>
                    <div className="data-value-row">
                      <span className="mono">{bankData.bank_cbu || '0000000000000000000000'}</span>
                      <button className="copy-icon" onClick={() => copyToClipboard(bankData.bank_cbu)}><Copy size={14} /></button>
                    </div>
                  </div>
                  <div className="data-item">
                    <label>Alias</label>
                    <div className="data-value-row">
                      <span className="mono">{bankData.bank_alias || 'mi.viaje.kit'}</span>
                      <button className="copy-icon" onClick={() => copyToClipboard(bankData.bank_alias)}><Copy size={14} /></button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="payment-notice mt-6">
                <AlertCircle size={20} />
                <p>Al hacer clic en el botón, confirmarás que ya realizaste la transferencia. Nuestro equipo validará el ingreso en las próximas 24hs.</p>
              </div>

              <button 
                className="btn btn-primary btn-lg btn-centered-modal"
                onClick={handleNotifyPayment}
                disabled={notifying}
              >
                {notifying ? 'Procesando...' : 'Confirmar transferencia'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

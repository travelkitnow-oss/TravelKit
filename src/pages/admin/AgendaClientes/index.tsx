/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useMemo, useEffect } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  User, 
  Plane, 
  Plus, 
  X,
  Calendar as CalendarIcon,
  Download
} from 'lucide-react';
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  isSameMonth, 
  isSameDay, 
  addDays, 
  isWithinInterval,
  parseISO
} from 'date-fns';
import { es } from 'date-fns/locale';
import jsPDF from 'jspdf';
import { supabase } from '../../../lib/supabase';
import './AgendaClientes.css';

export default function AgendaClientesPage() {
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [addingType, setAddingType] = useState<'excursion' | 'transport' | 'hotel' | null>(null);
  const [newSchedule, setNewSchedule] = useState({ date: '', time: '', itemId: '', endTime: '', endDate: '' });

  const [clients, setClients] = useState<any[]>([]);
  const [billingData, setBillingData] = useState<Record<string, any>>({});
  const [scheduledItems, setScheduledItems] = useState<any[]>([]);
  const [catalogFolders, setCatalogFolders] = useState<any[]>([]);

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (selectedClientId) {
      fetchClientData(selectedClientId);
    }
  }, [selectedClientId]);

  const fetchInitialData = async () => {
    const { data: clientsData } = await supabase.from('clients').select('*').order('name');
    setClients(clientsData || []);

    const { data: foldersData } = await supabase.from('catalog_folders').select('*');
    const { data: itemsData } = await supabase.from('catalog_items').select('*');
    
    const combinedFolders = (foldersData || []).map(f => ({
      ...f,
      items: (itemsData || []).filter(i => i.folder_id === f.id)
    }));
    setCatalogFolders(combinedFolders);
  };

  const fetchClientData = async (clientId: string) => {
    const { data: bData } = await supabase.from('client_billing').select('*').eq('client_id', clientId).single();
    if (bData) {
      setBillingData(prev => ({ ...prev, [clientId]: bData }));
    }

    const { data: sItems } = await supabase.from('scheduled_items').select('*').eq('client_id', clientId).order('date');
    setScheduledItems(sItems || []);
  };

  const selectedClientData = useMemo(() => {
    if (!selectedClientId) return null;
    const client = clients.find((c: any) => c.id === selectedClientId);
    if (!client) return null;
    return {
      ...client,
      dates: billingData[selectedClientId] || {}
    };
  }, [selectedClientId, clients, billingData]);

  const tripDateMin = selectedClientData?.dates?.departure_date || '';
  const tripDateMax = selectedClientData?.dates?.return_date || '';

  const handleScheduleItem = async () => {
    if (!selectedClientId || !newSchedule.itemId || !newSchedule.date) return;

    const itemDetails = catalogFolders.flatMap(f => f.items).find(i => i.id === newSchedule.itemId);
    
    const { data, error } = await supabase.from('scheduled_items').insert([{
      client_id: selectedClientId,
      type: addingType,
      item_id: newSchedule.itemId,
      name: itemDetails?.name || 'Ítem agendado',
      date: newSchedule.date,
      time: newSchedule.time,
      end_date: newSchedule.endDate || null,
      end_time: newSchedule.endTime || null,
    }]).select();

    if (error) {
      alert('Error al agendar ítem');
    } else if (data) {
      setScheduledItems([...scheduledItems, data[0]]);
      setNewSchedule({ date: '', time: '', itemId: '', endTime: '', endDate: '' });
      setAddingType(null);
    }
  };

  const handleRemoveItem = async (id: string) => {
    if (!window.confirm('¿Eliminar este ítem de la agenda?')) return;
    const { error } = await supabase.from('scheduled_items').delete().eq('id', id);
    if (error) alert('Error al eliminar ítem');
    else setScheduledItems(scheduledItems.filter(item => item.id !== id));
  };

  const renderHeader = () => {
    return (
      <div className="calendar-header">
        <button className="btn-icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
          <ChevronLeft size={20} />
        </button>
        <span className="current-month">
          {format(currentMonth, "MMMM yyyy", { locale: es })}
        </span>
        <button className="btn-icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
          <ChevronRight size={20} />
        </button>
      </div>
    );
  };

  const renderDays = () => {
    const days = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
    return (
      <div className="calendar-days-grid">
        {days.map(d => <div key={d} className="calendar-day-label">{d}</div>)}
      </div>
    );
  };

  const renderCells = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const rows = [];
    let days = [];
    let day = startDate;

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        const cloneDay = day;
        const dayItems = scheduledItems.filter(item => {
          const itemStart = parseISO(item.date);
          if (item.type === 'hotel' && item.end_date) {
            const itemEnd = parseISO(item.end_date);
            return isWithinInterval(cloneDay, { start: itemStart, end: itemEnd });
          }
          return isSameDay(cloneDay, itemStart);
        });

        const isTripDay = tripDateMin && tripDateMax && 
                          isWithinInterval(cloneDay, { start: parseISO(tripDateMin), end: parseISO(tripDateMax) });
        
        const isStart = tripDateMin && isSameDay(cloneDay, parseISO(tripDateMin));
        const isEnd = tripDateMax && isSameDay(cloneDay, parseISO(tripDateMax));

        days.push(
          <div
            key={day.toString()}
            className={`calendar-cell ${!isSameMonth(day, monthStart) ? "disabled" : ""} ${isTripDay ? 'selected' : ''} ${isStart ? 'trip-start' : ''} ${isEnd ? 'trip-end' : ''}`}
          >
            <span className="number">{format(day, "d")}</span>
            <div className="trip-markers">
              {dayItems.map((item, idx) => (
                <div key={idx} className={`trip-marker ${item.type}`} title={`${item.time} - ${item.name}`}>
                  {item.type === 'hotel' ? 'H' : item.type === 'transport' ? 'T' : 'E'}
                </div>
              ))}
            </div>
          </div>
        );
        day = addDays(day, 1);
      }
      rows.push(<div className="calendar-row" key={day.toString()}>{days}</div>);
      days = [];
    }
    return <div className="calendar-body">{rows}</div>;
  };

  const generatePDF = () => {
    if (!selectedClientData) return;
    const doc = new jsPDF();
    const client = selectedClientData;
    doc.setFontSize(22);
    doc.text(`Itinerario: ${client.name}`, 20, 20);
    doc.save(`Itinerario_${client.name.replace(' ', '_')}.pdf`);
  };

  return (
    <div className="agenda-clientes-page animate-fade-in">
      <header className="page-header-centered">
        <h1>Agenda de Viaje Personalizada</h1>
        <p>Diseña el itinerario día por día para cada uno de tus clientes.</p>
      </header>

      {/* Selector de Clientes Estilo Pills */}
      <div className="agenda-client-selector glass-card">
        <div className="selector-label">
          <User size={18} />
          <span>Cliente:</span>
        </div>
        <div className="client-pills">
          {clients.length === 0 && <span className="no-clients-hint">No hay clientes registrados</span>}
          {clients.map(c => (
            <div 
              key={c.id} 
              className={`client-pill ${selectedClientId === c.id ? 'active' : ''}`}
              onClick={() => setSelectedClientId(c.id)}
            >
              {c.name}
            </div>
          ))}
        </div>
      </div>

      {selectedClientData && (
        <>
          {/* Banner de Info del Cliente */}
          <div className="agenda-client-banner animate-slide-up">
            <div className="banner-main-row">
              <div className="banner-group">
                <div className="banner-field">
                  <span className="banner-label">Destino</span>
                  <span className="banner-value highlight">{selectedClientData.dates.destination || 'Por definir'}</span>
                </div>
              </div>
              <div className="banner-group">
                <Plane size={24} className="banner-icon" />
                <div className="banner-field">
                  <span className="banner-label">Salida</span>
                  <span className="banner-value">{selectedClientData.dates.departure_date ? format(parseISO(selectedClientData.dates.departure_date), 'dd MMM yyyy', { locale: es }) : '-'}</span>
                </div>
              </div>
              <div className="banner-group">
                <div className="banner-field">
                  <span className="banner-label">Regreso</span>
                  <span className="banner-value">{selectedClientData.dates.return_date ? format(parseISO(selectedClientData.dates.return_date), 'dd MMM yyyy', { locale: es }) : '-'}</span>
                </div>
              </div>
              <button className="btn-export-pdf" onClick={generatePDF}>
                <Download size={18} /> Exportar Itinerario
              </button>
            </div>
            
            <div className="banner-stats-row">
              <div className="stat-item">
                <span className="stat-label">Acciones:</span>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button className="btn btn-sm btn-outline" onClick={() => setAddingType('hotel')}>+ Hotel</button>
                  <button className="btn btn-sm btn-outline" onClick={() => setAddingType('transport')}>+ Transporte</button>
                  <button className="btn btn-sm btn-outline" onClick={() => setAddingType('excursion')}>+ Excursión</button>
                </div>
              </div>
            </div>
          </div>

          {/* Calendario Full */}
          <div className="agenda-calendar-full glass-card animate-fade-in">
            {renderHeader()}
            {renderDays()}
            {renderCells()}
          </div>

          {/* Lista de Ítems Agendados */}
          <div className="agenda-scheduler-section mt-4">
             <div className="scheduler-card glass-card">
                <div className="scheduler-card-header excursion-header">
                   <div className="scheduler-card-title">
                      <CalendarIcon size={18} />
                      <h3>Actividades y Transporte</h3>
                   </div>
                </div>
                <div className="scheduler-items">
                   {scheduledItems.length === 0 ? (
                      <div className="scheduler-empty">No hay actividades agendadas.</div>
                   ) : (
                      scheduledItems.map(item => (
                        <div key={item.id} className="scheduler-item">
                           <div className={`scheduler-item-dot ${item.type}-dot`}></div>
                           <div className={`scheduler-item-time ${item.type === 'transport' ? 'transport-time' : ''}`}>{item.time}</div>
                           <div className="scheduler-item-info">
                              <span className="scheduler-item-name">{item.name}</span>
                              <span className="scheduler-item-date">{format(parseISO(item.date), 'dd/MM/yyyy')}</span>
                           </div>
                           <button className="btn-delete-scheduled" onClick={() => handleRemoveItem(item.id)}><X size={14} /></button>
                        </div>
                      ))
                   )}
                </div>
             </div>
          </div>
        </>
      )}

      {addingType && (
        <div className="modal-overlay">
          <div className="modal-content glass-card p-5" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3>Agendar {addingType}</h3>
              <button onClick={() => setAddingType(null)} className="close-modal-btn"><X size={24} /></button>
            </div>
            <div className="form-group mt-4">
              <label>Seleccionar del Catálogo</label>
              <select className="form-input" value={newSchedule.itemId} onChange={e => setNewSchedule({ ...newSchedule, itemId: e.target.value })}>
                <option value="">-- Seleccionar --</option>
                {catalogFolders.filter(f => f.type === addingType).map(folder => (
                  <optgroup key={folder.id} label={folder.name}>
                    {folder.items.map((item: any) => (
                      <option key={item.id} value={item.id}>{item.name}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
            <div className="grid-2 gap-3 mt-3">
              <input type="date" className="form-input" value={newSchedule.date} onChange={e => setNewSchedule({ ...newSchedule, date: e.target.value })} />
              <input type="time" className="form-input" value={newSchedule.time} onChange={e => setNewSchedule({ ...newSchedule, time: e.target.value })} />
            </div>
            <button className="btn btn-primary w-100 mt-4" onClick={handleScheduleItem}>Agendar Ítem</button>
          </div>
        </div>
      )}
    </div>
  );
}

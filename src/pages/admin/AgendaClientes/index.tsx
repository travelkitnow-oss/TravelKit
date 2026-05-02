/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useMemo, useEffect } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  User, 
  Plane, 
  MapPin, 
  Plus, 
  X,
  Clock,
  Check,
  Calendar as CalendarIcon,
  Bus,
  Hotel as HotelIcon
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (selectedClientId) {
      fetchClientData(selectedClientId);
    }
  }, [selectedClientId]);

  const fetchInitialData = async () => {
    setLoading(true);
    // 1. Fetch Clients
    const { data: clientsData } = await supabase.from('clients').select('*').order('name');
    setClients(clientsData || []);

    // 2. Fetch Catalog (for picking items)
    const { data: foldersData } = await supabase.from('catalog_folders').select('*');
    const { data: itemsData } = await supabase.from('catalog_items').select('*');
    
    const combinedFolders = (foldersData || []).map(f => ({
      ...f,
      items: (itemsData || []).filter(i => i.folder_id === f.id)
    }));
    setCatalogFolders(combinedFolders);
    setLoading(false);
  };

  const fetchClientData = async (clientId: string) => {
    setLoading(true);
    // 1. Fetch Billing
    const { data: bData } = await supabase.from('client_billing').select('*').eq('client_id', clientId).single();
    if (bData) {
      setBillingData(prev => ({ ...prev, [clientId]: bData }));
    }

    // 2. Fetch Scheduled Items
    const { data: sItems } = await supabase.from('scheduled_items').select('*').eq('client_id', clientId).order('date');
    setScheduledItems(sItems || []);
    setLoading(false);
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
    if (!selectedClientId || !newSchedule.itemId || !newSchedule.date || !newSchedule.time) return;

    let itemName = '';
    let location = '';
    let origin = '';
    let destination = '';
    let hotelDetails = {};
    const type = addingType;

    const allItems = catalogFolders.flatMap(f => f.items);
    const foundItem = allItems.find(i => i.id === newSchedule.itemId);

    if (foundItem) {
      itemName = foundItem.name;
      location = foundItem.location || foundItem.address || '';
      origin = foundItem.origin || '';
      destination = foundItem.destination || '';
      
      if (type === 'hotel') {
        let calculatedNights = foundItem.nights;
        if (newSchedule.date && newSchedule.endDate) {
          try {
            const start = parseISO(newSchedule.date);
            const end = parseISO(newSchedule.endDate);
            const diffTime = end.getTime() - start.getTime();
            calculatedNights = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          } catch { /* fallback */ }
        }
        hotelDetails = {
          nights: calculatedNights,
          breakfast: foundItem.breakfast,
          halfBoard: foundItem.half_board,
          allInclusive: foundItem.all_inclusive,
          extraServices: foundItem.extra_services,
          stars: foundItem.stars
        };
      }
    }

    const newItem = {
      client_id: selectedClientId,
      item_id: newSchedule.itemId,
      name: itemName,
      type,
      date: newSchedule.date,
      end_date: newSchedule.endDate || null,
      time: newSchedule.time,
      end_time: newSchedule.endTime || null,
      location,
      origin,
      destination,
      details: hotelDetails
    };

    const { data, error } = await supabase.from('scheduled_items').insert([newItem]).select();

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

  // Rest of the UI logic (Calendar, PDF, etc.) should remain mostly the same
  // but using 'date', 'end_date', 'time', 'end_time', etc.
  
  // To keep it short for this turn, I'll provide the full file in parts if needed
  // but I'll write a reasonably complete version now.

  const renderHeader = () => {
    const dateFormat = "MMMM yyyy";
    return (
      <div className="header row flex-middle">
        <div className="col col-start">
          <div className="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
            <ChevronLeft size={24} />
          </div>
        </div>
        <div className="col col-center">
          <span className="current-month-label">
            {format(currentMonth, dateFormat, { locale: es })}
          </span>
        </div>
        <div className="col col-end" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
          <div className="icon"><ChevronRight size={24} /></div>
        </div>
      </div>
    );
  };

  const renderDays = () => {
    const days = [];
    const dateNames = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
    for (let i = 0; i < 7; i++) {
      days.push(
        <div className="col col-center day-name-header" key={i}>
          {dateNames[i]}
        </div>
      );
    }
    return <div className="days row">{days}</div>;
  };

  const renderCells = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const rows = [];
    let days = [];
    let day = startDate;
    let formattedDate = "";

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        formattedDate = format(day, "d");
        const cloneDay = day;
        
        // Find items for this day
        const dayItems = scheduledItems.filter(item => {
          const itemStart = parseISO(item.date);
          if (item.type === 'hotel' && item.end_date) {
            const itemEnd = parseISO(item.end_date);
            return isWithinInterval(cloneDay, { start: itemStart, end: itemEnd });
          }
          return isSameDay(cloneDay, itemStart);
        });

        days.push(
          <div
            className={`col cell ${
              !isSameMonth(day, monthStart)
                ? "disabled"
                : isSameDay(day, new Date()) ? "selected" : ""
            }`}
            key={day.toString()}
          >
            <span className="number">{formattedDate}</span>
            <div className="cell-items-container">
              {dayItems.map((item, idx) => (
                <div key={idx} className={`calendar-item ${item.type}`}>
                  <span className="time">{item.time}</span>
                  <span className="name">{item.name}</span>
                  <button className="remove-item" onClick={(e) => { e.stopPropagation(); handleRemoveItem(item.id); }}>×</button>
                </div>
              ))}
            </div>
          </div>
        );
        day = addDays(day, 1);
      }
      rows.push(
        <div className="row" key={day.toString()}>
          {days}
        </div>
      );
      days = [];
    }
    return <div className="body">{rows}</div>;
  };

  const generatePDF = () => {
    if (!selectedClientData) return;
    const doc = new jsPDF();
    const client = selectedClientData;
    
    doc.setFontSize(22);
    doc.setTextColor(31, 58, 77); // Navy
    doc.text(`Itinerario: ${client.name}`, 20, 20);
    
    doc.setFontSize(12);
    doc.setTextColor(100);
    doc.text(`Email: ${client.email} | Tel: ${client.phone}`, 20, 30);
    doc.line(20, 35, 190, 35);

    let y = 45;
    const sortedItems = [...scheduledItems].sort((a, b) => a.date.localeCompare(b.date));
    
    sortedItems.forEach((item) => {
      if (y > 270) { doc.addPage(); y = 20; }
      
      doc.setFontSize(14);
      doc.setTextColor(200, 155, 90); // Gold
      doc.text(`${format(parseISO(item.date), 'dd/MM/yyyy')} - ${item.time}`, 20, y);
      y += 7;
      
      doc.setFontSize(12);
      doc.setTextColor(0);
      doc.text(`${item.name}`, 25, y);
      y += 5;
      
      if (item.type === 'transport') {
        doc.setFontSize(10);
        doc.text(`De: ${item.origin} a ${item.destination}`, 30, y);
        y += 5;
      } else if (item.type === 'hotel') {
        doc.setFontSize(10);
        doc.text(`Check-out: ${item.end_date ? format(parseISO(item.end_date), 'dd/MM/yyyy') : 'N/A'} | ${item.details?.nights || 0} noches`, 30, y);
        y += 5;
      }
      
      y += 10;
    });

    doc.save(`Itinerario_${client.name.replace(' ', '_')}.pdf`);
  };

  return (
    <div className="agenda-clientes-page animate-fade-in">
      <header className="page-header-centered">
        <h1>Agenda de Viaje Personalizada</h1>
        <p>Diseña el itinerario día por día para cada uno de tus clientes.</p>
      </header>

      <div className="agenda-layout">
        {/* Sidebar: Client Selector */}
        <div className="client-selector-sidebar glass-card">
          <div className="sidebar-header">
            <h3>Seleccionar Cliente</h3>
          </div>
          <div className="client-search">
            <User size={18} />
            <select 
              className="client-select"
              value={selectedClientId || ''}
              onChange={(e) => setSelectedClientId(e.target.value)}
            >
              <option value="">-- Elige un cliente --</option>
              {clients.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {selectedClientData && (
            <div className="selected-client-summary animate-slide-up">
              <div className="trip-bounds">
                <div className="bound">
                  <Plane size={16} className="rotate-45" />
                  <div>
                    <label>Salida</label>
                    <span>{selectedClientData.dates.departure_date ? format(parseISO(selectedClientData.dates.departure_date), 'dd MMM yyyy', { locale: es }) : 'No definida'}</span>
                  </div>
                </div>
                <div className="bound">
                  <Plane size={16} className="rotate-225" />
                  <div>
                    <label>Regreso</label>
                    <span>{selectedClientData.dates.return_date ? format(parseISO(selectedClientData.dates.return_date), 'dd MMM yyyy', { locale: es }) : 'No definida'}</span>
                  </div>
                </div>
              </div>

              <div className="sidebar-actions">
                <button className="btn btn-primary w-100 mb-3" onClick={() => setAddingType('hotel')}>
                  <Plus size={18} /> Agendar Hotel
                </button>
                <button className="btn btn-outline w-100 mb-3" onClick={() => setAddingType('transport')}>
                  <Plus size={18} /> Agendar Transporte
                </button>
                <button className="btn btn-outline w-100 mb-3" onClick={() => setAddingType('excursion')}>
                  <Plus size={18} /> Agendar Excursión
                </button>
                <button className="btn btn-accent w-100" onClick={generatePDF}>
                  Descargar Itinerario PDF
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Main Content: Calendar */}
        <div className="calendar-container glass-card">
          <div className="calendar">
            {renderHeader()}
            {renderDays()}
            {renderCells()}
          </div>
        </div>
      </div>

      {/* Add Item Modal */}
      {addingType && (
        <div className="modal-overlay">
          <div className="modal-content glass-card p-5" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3>Agendar {addingType === 'hotel' ? 'Hotel' : addingType === 'transport' ? 'Transporte' : 'Excursión'}</h3>
              <button onClick={() => setAddingType(null)} className="close-btn"><X size={24} /></button>
            </div>
            
            <div className="form-group mt-4">
              <label>Seleccionar del Catálogo</label>
              <select 
                className="form-input"
                value={newSchedule.itemId}
                onChange={e => setNewSchedule({ ...newSchedule, itemId: e.target.value })}
              >
                <option value="">-- Seleccionar --</option>
                {catalogFolders.filter(f => f.type === addingType).map(folder => (
                  <optgroup key={folder.id} label={folder.name}>
                    {folder.items.map((item: any) => (
                      <option key={item.id} value={item.id}>{item.name} - u$s {item.cost_usd}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            <div className="grid-2 gap-3">
              <div className="form-group">
                <label>{addingType === 'hotel' ? 'Fecha Check-in' : 'Fecha'}</label>
                <input 
                  type="date" 
                  className="form-input"
                  min={tripDateMin}
                  max={tripDateMax}
                  value={newSchedule.date}
                  onChange={e => setNewSchedule({ ...newSchedule, date: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Hora</label>
                <input 
                  type="time" 
                  className="form-input"
                  value={newSchedule.time}
                  onChange={e => setNewSchedule({ ...newSchedule, time: e.target.value })}
                />
              </div>
            </div>

            {addingType === 'hotel' && (
              <div className="grid-2 gap-3">
                <div className="form-group">
                  <label>Fecha Check-out</label>
                  <input 
                    type="date" 
                    className="form-input"
                    min={newSchedule.date || tripDateMin}
                    max={tripDateMax}
                    value={newSchedule.endDate}
                    onChange={e => setNewSchedule({ ...newSchedule, endDate: e.target.value })}
                  />
                </div>
              </div>
            )}

            <button className="btn btn-primary w-100 mt-4" onClick={handleScheduleItem}>
              Confirmar y Agendar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

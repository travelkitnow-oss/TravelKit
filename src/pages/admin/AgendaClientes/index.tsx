/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useMemo, useEffect } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  User,
  Plane,
  X,
  Calendar as CalendarIcon,
  Download,
  Hotel,
  Clock,
  ArrowRight,
  MapPin,
  PlaneTakeoff,
  PlaneLanding,
  Plus
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
import logo from '../../../assets/logo.jpg';
import './AgendaClientes.css';

export default function AgendaClientesPage() {
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [addingType, setAddingType] = useState<'excursion' | 'transport' | 'hotel' | null>(null);
  const [newSchedule, setNewSchedule] = useState({
    date: '',
    time: '14:00',
    itemId: '',
    endDate: '',
    endTime: '10:00'
  });

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
      end_date: addingType === 'hotel' ? newSchedule.endDate : null,
      end_time: addingType === 'hotel' ? newSchedule.endTime : null,
      origin: itemDetails?.origin || null,
      destination: itemDetails?.destination || null,
    }]).select();

    if (error) {
      alert('Error al agendar ítem');
    } else if (data) {
      setScheduledItems([...scheduledItems, data[0]]);
      setNewSchedule({ date: '', time: '14:00', itemId: '', endDate: '', endTime: '10:00' });
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
                  {item.name}
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
    if (!selectedClientData || !scheduledItems.length) {
      alert("No hay actividades agendadas para exportar.");
      return;
    }
    
    const doc = new jsPDF();
    const client = selectedClientData;
    const b = client.dates || {};
    
    // Palette
    const c = {
      deepBlue: [31, 58, 77],    // #1F3A4D
      grayBlue: [110, 136, 152], // #6E8898
      lightBlue: [183, 197, 207], // #B7C5CF
      gold: [200, 155, 90],      // #C89B5A
      beige: [233, 223, 210],    // #E9DFD2
      white: [255, 255, 255],
      green: [16, 185, 129],     // Hospedaje
      orange: [200, 155, 90],    // Excursion (Dorado)
      blue: [59, 130, 246]       // Traslado
    };

    const tripDuration = b.departure_date && b.return_date 
      ? Math.ceil((new Date(b.return_date).getTime() - new Date(b.departure_date).getTime()) / (1000 * 3600 * 24)) 
      : 0;

    const counts = {
      hotel: scheduledItems.filter(i => i.type === 'hotel').length,
      transport: scheduledItems.filter(i => i.type === 'transport').length,
      excursion: scheduledItems.filter(i => i.type === 'excursion').length
    };

    const drawHeader = () => {
      // Header Background
      doc.setFillColor(c.beige[0], c.beige[1], c.beige[2]);
      doc.rect(0, 0, 210, 55, 'F');
      
      // Logo (Left)
      try {
        doc.addImage(logo, 'JPEG', 15, 5, 45, 45);
      } catch (e) {
        doc.setTextColor(c.deepBlue[0], c.deepBlue[1], c.deepBlue[2]);
        doc.setFontSize(22);
        doc.text("Travel Kit", 15, 25);
      }

      // Title & Tagline
      doc.setTextColor(c.deepBlue[0], c.deepBlue[1], c.deepBlue[2]);
      doc.setFontSize(24);
      doc.setFont("helvetica", "bold");
      doc.text("Travel Kit", 65, 20);
      
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(c.grayBlue[0], c.grayBlue[1], c.grayBlue[2]);
      doc.text("EL VIAJE ES EL CAMINO", 65, 27);
      
      doc.setDrawColor(c.gold[0], c.gold[1], c.gold[2]);
      doc.setLineWidth(0.5);
      doc.line(65, 30, 135, 30);

      // Passenger Info
      doc.setTextColor(c.deepBlue[0], c.deepBlue[1], c.deepBlue[2]);
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text(client.name, 65, 40);
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(c.grayBlue[0], c.grayBlue[1], c.grayBlue[2]);
      doc.text(client.email || '', 65, 46);

      // Destination Badge (Right)
      if (b.destination) {
        doc.setFillColor(c.gold[0], c.gold[1], c.gold[2]);
        doc.roundedRect(155, 18, 45, 12, 2, 2, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text(b.destination.toUpperCase(), 177.5, 26, { align: "center" });
      }

      // Separator Line
      doc.setDrawColor(c.gold[0], c.gold[1], c.gold[2]);
      doc.setLineWidth(1);
      doc.line(0, 55, 210, 55);
    };

    drawHeader();
    let yPos = 70;

    // Summary Card
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(15, yPos, 180, 50, 3, 3, 'F');
    doc.setDrawColor(c.lightBlue[0], c.lightBlue[1], c.lightBlue[2]);
    doc.setLineWidth(0.2);
    doc.roundedRect(15, yPos, 180, 50, 3, 3, 'D');
    
    // Summary Card Gold Left Bar
    doc.setFillColor(c.gold[0], c.gold[1], c.gold[2]);
    doc.rect(15, yPos + 5, 2.5, 40, 'F');

    // Summary Content (3 Columns)
    doc.setFontSize(7);
    doc.setTextColor(c.grayBlue[0], c.grayBlue[1], c.grayBlue[2]);
    doc.setFont("helvetica", "bold");
    doc.text("ITINERARIO SALIDA", 35, yPos + 12);
    doc.text("ITINERARIO REGRESO", 90, yPos + 12);
    doc.text("DURACION TOTAL", 150, yPos + 12);

    doc.setFontSize(10);
    doc.setTextColor(c.deepBlue[0], c.deepBlue[1], c.deepBlue[2]);
    if (b.departure_date) {
      doc.text(`${format(parseISO(b.departure_date), 'dd/MM/yyyy')} • ${b.departure_time || '--'} hs`, 35, yPos + 20);
      doc.setFontSize(7);
      doc.setTextColor(c.grayBlue[0], c.grayBlue[1], c.grayBlue[2]);
      doc.text(`Llegada: ${format(parseISO(b.departure_date), 'dd/MM/yyyy')} • ${b.arrival_time || '--'} hs`, 35, yPos + 26);
    }
    
    doc.setFontSize(10);
    doc.setTextColor(c.deepBlue[0], c.deepBlue[1], c.deepBlue[2]);
    if (b.return_date) {
      doc.text(`${format(parseISO(b.return_date), 'dd/MM/yyyy')} • ${b.return_departure_time || '--'} hs`, 90, yPos + 20);
      doc.setFontSize(7);
      doc.setTextColor(c.grayBlue[0], c.grayBlue[1], c.grayBlue[2]);
      doc.text(`Llegada: ${format(parseISO(b.return_date), 'dd/MM/yyyy')} • ${b.return_arrival_time || '--'} hs`, 90, yPos + 26);
    }

    doc.setFontSize(14);
    doc.setTextColor(c.deepBlue[0], c.deepBlue[1], c.deepBlue[2]);
    doc.text(`${tripDuration} noches`, 150, yPos + 22);

    // Divider in summary
    doc.setDrawColor(c.lightBlue[0], c.lightBlue[1], c.lightBlue[2]);
    doc.line(35, yPos + 32, 175, yPos + 32);

    // Counts
    doc.setFontSize(7);
    doc.setTextColor(c.grayBlue[0], c.grayBlue[1], c.grayBlue[2]);
    doc.text("EXCURSIONES", 45, yPos + 38, { align: "center" });
    doc.text("TRANSPORTES", 105, yPos + 38, { align: "center" });
    doc.text("HOTELES", 165, yPos + 38, { align: "center" });

    doc.setFontSize(12);
    doc.setTextColor(c.deepBlue[0], c.deepBlue[1], c.deepBlue[2]);
    doc.text(`${counts.excursion}`, 45, yPos + 45, { align: "center" });
    doc.text(`${counts.transport}`, 105, yPos + 45, { align: "center" });
    doc.text(`${counts.hotel}`, 165, yPos + 45, { align: "center" });

    yPos += 70;

    // Body Title
    doc.setFontSize(12);
    doc.setTextColor(c.deepBlue[0], c.deepBlue[1], c.deepBlue[2]);
    doc.setFont("helvetica", "bold");
    doc.text("ITINERARIO DEL VIAJE", 15, yPos);
    doc.setDrawColor(c.gold[0], c.gold[1], c.gold[2]);
    doc.setLineWidth(1.5);
    doc.line(15, yPos + 2.5, 55, yPos + 2.5);
    
    yPos += 15;

    // Group items by day
    const groupedItems = scheduledItems.reduce((acc: any, item) => {
      const dateKey = item.date;
      if (!acc[dateKey]) acc[dateKey] = [];
      acc[dateKey].push(item);
      return acc;
    }, {});

    const sortedDates = Object.keys(groupedItems).sort();

    sortedDates.forEach((dateKey) => {
      if (yPos > 260) {
        doc.addPage();
        drawHeader();
        yPos = 70;
      }

      // Day Header
      doc.setFillColor(248, 250, 252);
      doc.rect(15, yPos, 180, 10, 'F');
      doc.setFillColor(c.gold[0], c.gold[1], c.gold[2]);
      doc.rect(15, yPos, 3, 10, 'F');
      
      doc.setTextColor(c.deepBlue[0], c.deepBlue[1], c.deepBlue[2]);
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      const formattedDate = format(parseISO(dateKey), "EEEE d 'de' MMMM yyyy", { locale: es });
      doc.text(formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1), 22, yPos + 6.5);
      
      yPos += 15;

      const itemsInDay = groupedItems[dateKey].sort((a: any, b: any) => a.time.localeCompare(b.time));

      itemsInDay.forEach((item: any) => {
        if (yPos > 270) {
          doc.addPage();
          drawHeader();
          yPos = 70;
        }

        const typeColor = item.type === 'hotel' ? c.green : item.type === 'transport' ? c.blue : c.orange;
        const typeLabel = item.type === 'hotel' ? 'HOSPEDAJE' : item.type === 'transport' ? 'TRASLADO' : 'EXCURSION';

        doc.setFillColor(248, 255, 255); // Very light background
        doc.rect(15, yPos, 180, 25, 'F');
        doc.setFillColor(typeColor[0], typeColor[1], typeColor[2]);
        doc.rect(15, yPos, 2.5, 25, 'F');

        doc.setFontSize(10);
        doc.setTextColor(typeColor[0], typeColor[1], typeColor[2]);
        doc.setFont("helvetica", "bold");
        doc.text(item.time, 22, yPos + 10);
        
        doc.setDrawColor(203, 213, 225);
        doc.setLineWidth(0.1);
        doc.line(38, yPos + 6, 38, yPos + 19);

        doc.setTextColor(c.deepBlue[0], c.deepBlue[1], c.deepBlue[2]);
        doc.setFontSize(11);
        doc.text(item.name, 45, yPos + 10);

        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(c.grayBlue[0], c.grayBlue[1], c.grayBlue[2]);
        
        const catalogItem = catalogFolders.flatMap(f => f.items).find(i => i.id === item.item_id);
        const displayOrigin = item.origin || catalogItem?.origin;
        const displayDestination = item.destination || catalogItem?.destination;

        if (item.type === 'hotel') {
          doc.text(`Ingreso: ${format(parseISO(item.date), 'dd/MM/yyyy')} • ${item.time} hs`, 45, yPos + 16);
          doc.text(`Egreso: ${format(parseISO(item.end_date), 'dd/MM/yyyy')} • ${item.end_time} hs`, 45, yPos + 20);
        } else if (item.type === 'transport') {
          doc.text(`${displayOrigin || '---'} > ${displayDestination || '---'}`, 45, yPos + 16);
        } else {
          doc.text(displayDestination || '', 45, yPos + 16);
        }

        doc.setTextColor(typeColor[0], typeColor[1], typeColor[2]);
        doc.setFontSize(7);
        doc.setFont("helvetica", "bold");
        doc.text(typeLabel, 190, yPos + 10, { align: "right" });

        yPos += 30;
      });
      yPos += 5;
    });

    doc.save(`Itinerario_${client.name.replace(/\s/g, '_')}.pdf`);
  };

  const b = selectedClientData?.dates || {};

  return (
    <div className="agenda-clientes-page animate-fade-in">
      <header className="page-header-centered">
        <h1>Agenda de Viaje Personalizada</h1>
        <p>Diseña el itinerario día por día para cada uno de tus clientes.</p>
      </header>

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
          <div className="agenda-client-banner-premium glass-card animate-slide-up">
            <div className="banner-top-row" style={{ justifyContent: 'flex-end', borderBottom: 'none', marginBottom: '1rem', paddingBottom: 0 }}>
              <div className="banner-actions">
                <button className="btn-export-pdf-premium" onClick={generatePDF}>
                  <Download size={18} /> Exportar Itinerario
                </button>
              </div>
            </div>

            <div className="banner-vuelos-grid">
              {/* Vuelo Ida */}
              <div className="vuelo-card ida">
                <div className="vuelo-card-header">
                  <div className="vuelo-tag">VUELO DE IDA</div>
                  <div className="vuelo-route-mini">
                    <span>{b.origin || '---'}</span>
                    <ArrowRight size={12} />
                    <span>{b.destination || '---'}</span>
                  </div>
                </div>
                <div className="vuelo-details">
                  <div className="vuelo-date">
                    <CalendarIcon size={14} />
                    {b.departure_date ? format(parseISO(b.departure_date), 'dd MMM yyyy', { locale: es }) : '---'}
                  </div>
                  <div className="vuelo-times">
                    <div className="time-group">
                      <PlaneTakeoff size={14} />
                      <span>{b.departure_time || '--:--'} hs</span>
                    </div>
                    <ArrowRight size={14} className="time-sep" />
                    <div className="time-group">
                      <PlaneLanding size={14} />
                      <span>{b.arrival_time || '--:--'} hs</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Vuelo Vuelta */}
              <div className="vuelo-card vuelta">
                <div className="vuelo-card-header">
                  <div className="vuelo-tag">VUELO DE VUELTA</div>
                  <div className="vuelo-route-mini">
                    <span>{b.return_origin || b.destination || '---'}</span>
                    <ArrowRight size={12} />
                    <span>{b.return_destination || b.origin || '---'}</span>
                  </div>
                </div>
                <div className="vuelo-details">
                  <div className="vuelo-date">
                    <CalendarIcon size={14} />
                    {b.return_date ? format(parseISO(b.return_date), 'dd MMM yyyy', { locale: es }) : '---'}
                  </div>
                  <div className="vuelo-times">
                    <div className="time-group">
                      <PlaneTakeoff size={14} />
                      <span>{b.return_departure_time || '--:--'} hs</span>
                    </div>
                    <ArrowRight size={14} className="time-sep" />
                    <div className="time-group">
                      <PlaneLanding size={14} />
                      <span>{b.return_arrival_time || '--:--'} hs</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="agenda-action-bar">
              <div className="passengers-count">
                <User size={18} />
                <span>{b.passengers || 1} Pasajeros</span>
              </div>
              <div className="action-buttons-group">
                <button className="btn-action-add hotel" onClick={() => setAddingType('hotel')}>
                  <Plus size={16} /> Agregar Hotel
                </button>
                <button className="btn-action-add transport" onClick={() => setAddingType('transport')}>
                  <Plus size={16} /> Agregar Transporte
                </button>
                <button className="btn-action-add excursion" onClick={() => setAddingType('excursion')}>
                  <Plus size={16} /> Agregar Excursión
                </button>
              </div>
            </div>
          </div>

          <div className="agenda-main-layout">
            <div className="agenda-calendar-column">
              <div className="agenda-calendar-full glass-card animate-fade-in">
                {renderHeader()}
                {renderDays()}
                {renderCells()}
              </div>
            </div>

            <div className="section-divider"></div>

            <div className="activities-header-professional animate-slide-up">
              <h2>Actividades y Alojamiento</h2>
              <p className="subtitle">Detalle completo de la estadía, transportes y excursiones programadas.</p>
              <div className="accent-line"></div>
            </div>

            <div className="agenda-activities-column animate-fade-in">
              <div className="timeline-container">
                {scheduledItems.length === 0 ? (
                  <div className="scheduler-empty glass-card p-12 text-center">
                    <CalendarIcon size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
                    <p>No hay actividades agendadas aún.</p>
                  </div>
                ) : (
                  scheduledItems.map(item => {
                    const catalogItem = catalogFolders.flatMap(f => f.items).find(i => i.id === item.item_id);
                    const displayOrigin = item.origin || catalogItem?.origin;
                    const displayDestination = item.destination || catalogItem?.destination;

                    return (
                      <div key={item.id} className={`timeline-item ${item.type}`}>
                        <div className="timeline-dot"></div>
                        <div className="timeline-content-card">
                          <div className="timeline-time-col">
                            <span className="timeline-date">{format(parseISO(item.date), 'dd MMM', { locale: es })}</span>
                            <span className="timeline-hour">{item.time} hs</span>
                          </div>
                          
                          <div className="timeline-info-col">
                            <div className="timeline-category">
                              {item.type === 'hotel' ? 'Alojamiento' : item.type === 'transport' ? 'Transporte' : 'Excursión'}
                            </div>
                            <div className="timeline-title">
                              {item.type === 'hotel' ? <Hotel size={20} /> : item.type === 'transport' ? <Plane size={20} /> : <MapPin size={20} />}
                              {item.name}
                            </div>

                            <div className="timeline-details-grid">
                              {item.type === 'hotel' ? (
                                <>
                                  <div className="detail-sub-item">
                                    <span className="detail-label">Check-in</span>
                                    <div className="detail-value">
                                      <CalendarIcon size={14} /> {format(parseISO(item.date), 'dd/MM/yyyy')}
                                    </div>
                                    <div className="detail-value">
                                      <Clock size={14} /> {item.time} hs
                                    </div>
                                  </div>
                                  <div className="detail-sub-item">
                                    <span className="detail-label">Check-out</span>
                                    <div className="detail-value">
                                      <CalendarIcon size={14} /> {format(parseISO(item.end_date), 'dd/MM/yyyy')}
                                    </div>
                                    <div className="detail-value">
                                      <Clock size={14} /> {item.end_time} hs
                                    </div>
                                  </div>
                                </>
                              ) : (
                                <div className="detail-sub-item">
                                  <span className="detail-label">{item.type === 'transport' ? 'Salida' : 'Visita'}</span>
                                  <div className="detail-value">
                                    <CalendarIcon size={14} /> {format(parseISO(item.date), 'dd/MM/yyyy')}
                                    <Clock size={14} style={{ marginLeft: '8px' }} /> {item.time} hs
                                  </div>
                                  {item.type === 'transport' && (displayOrigin || displayDestination) && (
                                    <div className="detail-value" style={{ marginTop: '0.5rem', color: 'var(--color-primary)' }}>
                                      <MapPin size={14} />
                                      <span>{displayOrigin || '---'}</span>
                                      <ArrowRight size={12} style={{ margin: '0 4px' }} />
                                      <span>{displayDestination || '---'}</span>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>

                          <button className="btn-delete-timeline" onClick={() => handleRemoveItem(item.id)}>
                            <X size={18} />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {addingType && (
        <div className="modal-overlay">
          <div className="modal-content glass-card p-6" style={{ maxWidth: addingType === 'hotel' ? '650px' : '450px', width: '95%' }}>
            <div className="modal-header-premium mb-6">
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div className={`icon-badge ${addingType}`}>
                  {addingType === 'hotel' ? <Hotel size={24} /> : addingType === 'transport' ? <Plane size={24} /> : <MapPin size={24} />}
                </div>
                <h3 className="m-0 modal-title-premium">
                  {addingType === 'hotel' ? 'Agendar Estadía de Hotel' :
                    addingType === 'transport' ? 'Agendar Transporte' :
                      `Agendar Excursión`}
                </h3>
              </div>
              <button onClick={() => setAddingType(null)} className="close-modal-btn"><X size={24} /></button>
            </div>

            <div className="form-group mb-6">
              <label className="text-xs font-bold uppercase text-secondary mb-2 display-block">Seleccionar del Catálogo</label>
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

            {addingType === 'hotel' ? (
              <div className="hotel-range-form animate-fade-in">
                <div className="grid-2 gap-6">
                  <div className="range-column">
                    <label className="text-xs font-bold uppercase text-success mb-3 display-block">Check-in (Ingreso)</label>
                    <div className="form-group mb-3">
                      <div className="input-with-icon">
                        <CalendarIcon size={16} />
                        <input type="date" className="form-input" value={newSchedule.date} onChange={e => setNewSchedule({ ...newSchedule, date: e.target.value })} />
                      </div>
                    </div>
                    <div className="form-group">
                      <div className="input-with-icon">
                        <Clock size={16} />
                        <input type="time" className="form-input" value={newSchedule.time} onChange={e => setNewSchedule({ ...newSchedule, time: e.target.value })} />
                      </div>
                    </div>
                  </div>

                  <div className="range-column">
                    <label className="text-xs font-bold uppercase text-error mb-3 display-block">Check-out (Egreso)</label>
                    <div className="form-group mb-3">
                      <div className="input-with-icon">
                        <CalendarIcon size={16} />
                        <input type="date" className="form-input" value={newSchedule.endDate} onChange={e => setNewSchedule({ ...newSchedule, endDate: e.target.value })} />
                      </div>
                    </div>
                    <div className="form-group">
                      <div className="input-with-icon">
                        <Clock size={16} />
                        <input type="time" className="form-input" value={newSchedule.endTime} onChange={e => setNewSchedule({ ...newSchedule, endTime: e.target.value })} />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="range-connector">
                  <ArrowRight size={20} />
                </div>
              </div>
            ) : (
              <div className="grid-2 gap-3 mb-6">
                <div className="form-group">
                  <label className="text-xs font-bold uppercase text-secondary mb-2 display-block">Fecha</label>
                  <input type="date" className="form-input" value={newSchedule.date} onChange={e => setNewSchedule({ ...newSchedule, date: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="text-xs font-bold uppercase text-secondary mb-2 display-block">Hora</label>
                  <input type="time" className="form-input" value={newSchedule.time} onChange={e => setNewSchedule({ ...newSchedule, time: e.target.value })} />
                </div>
              </div>
            )}

            <button className="btn btn-primary w-100 mt-6 py-3" onClick={handleScheduleItem} style={{ borderRadius: '50px', fontSize: '1rem' }}>
              Confirmar en Agenda
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

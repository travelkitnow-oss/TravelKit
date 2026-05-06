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
  PlaneLanding,
  Plus,
  QrCode,
  Folder,
  ChevronDown
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
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);
  const [expandedFolderId, setExpandedFolderId] = useState<string | null>(null);
  const [newSchedule, setNewSchedule] = useState({
    date: '',
    time: '14:00',
    itemId: '',
    endDate: '',
    endTime: '10:00',
    reservationCode: ''
  });
  const [selectedDayForDetails, setSelectedDayForDetails] = useState<Date | null>(null);
  const [selectedItemForDetails, setSelectedItemForDetails] = useState<any | null>(null);

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
    const { data: clientsData } = await supabase
      .from('clients')
      .select('*')
      .neq('source', 'agenda_session_only')
      .order('name');
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
    const { data: bData } = await supabase.from('client_billing').select('*').eq('client_id', clientId).maybeSingle();
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
      reservation_code: newSchedule.reservationCode || null
    }]).select();

    if (error) {
      alert('Error al agendar ítem');
    } else if (data) {
      setScheduledItems([...scheduledItems, data[0]]);
      setNewSchedule({ date: '', time: '14:00', itemId: '', endDate: '', endTime: '10:00', reservationCode: '' });
      setAddingType(null);
      setIsSelectorOpen(false);
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
            onClick={() => setSelectedDayForDetails(cloneDay)}
          >
            <span className="number">{format(day, "d")}</span>
            <div className="trip-markers">
              {dayItems.slice(0, 2).map((item, idx) => (
                <div key={idx} className={`trip-pill ${item.type}`} title={`${item.time} - ${item.name}`}>
                  <span className="pill-dot"></span>
                  <span className="pill-name">{item.name}</span>
                </div>
              ))}
              {dayItems.length > 2 && (
                <div className="more-markers">+{dayItems.length - 2} más</div>
              )}
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

        if (item.reservation_code) {
          doc.setTextColor(c.deepBlue[0], c.deepBlue[1], c.deepBlue[2]);
          doc.setFontSize(8);
          doc.setFont("helvetica", "normal");
          doc.text(`Reserva: ${item.reservation_code}`, 190, yPos + 16, { align: "right" });
        }

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
              <div className="vuelo-card ida premium-ticket">
                <div className="ticket-main">
                  <div className="ticket-header-pro">
                    <div className="vuelo-tag-pro">BOARDING PASS</div>
                    <div className="vuelo-status">CONFIRMADO</div>
                  </div>

                  <div className="ticket-route-pro">
                    <div className="city-group">
                      <span className="city-code">{b.origin?.substring(0, 3).toUpperCase() || '---'}</span>
                      <span className="city-name">{b.origin || 'Origen'}</span>
                    </div>

                    <div className="flight-path">
                      <div className="path-line"></div>
                      <Plane size={20} className="path-plane" />
                    </div>

                    <div className="city-group dest">
                      <span className="city-code">{b.destination?.substring(0, 3).toUpperCase() || '---'}</span>
                      <span className="city-name">{b.destination || 'Destino'}</span>
                    </div>
                  </div>

                  <div className="ticket-footer-pro">
                    <div className="footer-item">
                      <span className="item-label">FECHA</span>
                      <span className="item-value">{b.departure_date ? format(parseISO(b.departure_date), 'dd MMM yyyy', { locale: es }) : '---'}</span>
                    </div>
                    <div className="footer-item">
                      <span className="item-label">SALIDA</span>
                      <span className="item-value">{b.departure_time || '--:--'} HS</span>
                    </div>
                    <div className="footer-item">
                      <span className="item-label">LLEGADA</span>
                      <span className="item-value">{b.arrival_time || '--:--'} HS</span>
                    </div>
                  </div>
                </div>

                <div className="ticket-stub">
                  <div className="stub-notch top"></div>
                  <div className="stub-content">
                    <QrCode size={40} className="stub-qr" />
                    <div className="stub-text">GATE OPEN</div>
                  </div>
                  <div className="stub-notch bottom"></div>
                </div>
              </div>

              {/* Vuelo Vuelta */}
              <div className="vuelo-card vuelta premium-ticket">
                <div className="ticket-main">
                  <div className="ticket-header-pro">
                    <div className="vuelo-tag-pro">BOARDING PASS</div>
                    <div className="vuelo-status">CONFIRMADO</div>
                  </div>

                  <div className="ticket-route-pro">
                    <div className="city-group">
                      <span className="city-code">{(b.return_origin || b.destination)?.substring(0, 3).toUpperCase() || '---'}</span>
                      <span className="city-name">{b.return_origin || b.destination || 'Origen'}</span>
                    </div>

                    <div className="flight-path">
                      <div className="path-line"></div>
                      <Plane size={20} className="path-plane" />
                    </div>

                    <div className="city-group dest">
                      <span className="city-code">{(b.return_destination || b.origin)?.substring(0, 3).toUpperCase() || '---'}</span>
                      <span className="city-name">{b.return_destination || b.origin || 'Destino'}</span>
                    </div>
                  </div>

                  <div className="ticket-footer-pro">
                    <div className="footer-item">
                      <span className="item-label">FECHA</span>
                      <span className="item-value">{b.return_date ? format(parseISO(b.return_date), 'dd MMM yyyy', { locale: es }) : '---'}</span>
                    </div>
                    <div className="footer-item">
                      <span className="item-label">SALIDA</span>
                      <span className="item-value">{b.return_departure_time || '--:--'} HS</span>
                    </div>
                    <div className="footer-item">
                      <span className="item-label">LLEGADA</span>
                      <span className="item-value">{b.return_arrival_time || '--:--'} HS</span>
                    </div>
                  </div>
                </div>

                <div className="ticket-stub">
                  <div className="stub-notch top"></div>
                  <div className="stub-content">
                    <QrCode size={40} className="stub-qr" />
                    <div className="stub-text">GATE OPEN</div>
                  </div>
                  <div className="stub-notch bottom"></div>
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

            <div className="agenda-sectors-container animate-fade-in">
              <div className="agenda-sector hotel">
                <div className="sector-header">
                  <Hotel size={20} />
                  <h3>Alojamientos</h3>
                </div>
                <div className="sector-list">
                  {scheduledItems.filter(i => i.type === 'hotel').length === 0 ? (
                    <div className="sector-empty">Sin hoteles agendados</div>
                  ) : (
                    scheduledItems.filter(i => i.type === 'hotel').map(item => {
                      const catalogItem = catalogFolders.flatMap(f => f.items).find(i => i.id === item.item_id);
                      const address = item.address || catalogItem?.location;
                      return (
                        <div key={item.id} className="sector-item" onClick={() => setSelectedItemForDetails(item)}>
                          <div className="item-main-info">
                            <div className="item-date">{format(parseISO(item.date), 'dd/MM')}</div>
                            <div className="item-details-brief">
                              <span className="item-name">{item.name}</span>
                              {address && <span className="item-address-mini"><MapPin size={10} /> {address}</span>}
                            </div>
                          </div>
                          <button className="btn-mini-delete" onClick={(e) => { e.stopPropagation(); handleRemoveItem(item.id); }}>
                            <X size={12} />
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="agenda-sector transport">
                <div className="sector-header">
                  <Plane size={20} />
                  <h3>Transportes</h3>
                </div>
                <div className="sector-list">
                  {scheduledItems.filter(i => i.type === 'transport').length === 0 ? (
                    <div className="sector-empty">Sin transportes agendados</div>
                  ) : (
                    scheduledItems.filter(i => i.type === 'transport').map(item => {
                      const catalogItem = catalogFolders.flatMap(f => f.items).find(i => i.id === item.item_id);
                      const origin = item.origin || catalogItem?.origin;
                      const destination = item.destination || catalogItem?.destination;
                      return (
                        <div key={item.id} className="sector-item" onClick={() => setSelectedItemForDetails(item)}>
                          <div className="item-main-info">
                            <div className="item-date">{format(parseISO(item.date), 'dd/MM')}</div>
                            <div className="item-details-brief">
                              <span className="item-name">{item.name}</span>
                              {(origin || destination) && (
                                <span className="item-address-mini">
                                  {origin} <ArrowRight size={10} /> {destination}
                                </span>
                              )}
                            </div>
                          </div>
                          <button className="btn-mini-delete" onClick={(e) => { e.stopPropagation(); handleRemoveItem(item.id); }}>
                            <X size={12} />
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="agenda-sector excursion">
                <div className="sector-header">
                  <MapPin size={20} />
                  <h3>Excursiones</h3>
                </div>
                <div className="sector-list">
                  {scheduledItems.filter(i => i.type === 'excursion').length === 0 ? (
                    <div className="sector-empty">Sin excursiones agendadas</div>
                  ) : (
                    scheduledItems.filter(i => i.type === 'excursion').map(item => {
                      const catalogItem = catalogFolders.flatMap(f => f.items).find(i => i.id === item.item_id);
                      const address = item.address || catalogItem?.location;
                      return (
                        <div key={item.id} className="sector-item" onClick={() => setSelectedItemForDetails(item)}>
                          <div className="item-main-info">
                            <div className="item-date">{format(parseISO(item.date), 'dd/MM')}</div>
                            <div className="item-details-brief">
                              <span className="item-name">{item.name}</span>
                              {address && <span className="item-address-mini"><MapPin size={10} /> {address}</span>}
                            </div>
                          </div>
                          <button className="btn-mini-delete" onClick={(e) => { e.stopPropagation(); handleRemoveItem(item.id); }}>
                            <X size={12} />
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {addingType && (
        <div className="modal-overlay">
          <div className="modal-content glass-card" style={{ maxWidth: addingType === 'hotel' ? '650px' : '450px', width: '95%', padding: '0', overflow: 'hidden' }}>
            <div style={{ background: 'linear-gradient(135deg, var(--color-primary) 0%, #0f2132 100%)', padding: '1.5rem 2rem', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)', padding: '0.6rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {addingType === 'hotel' ? <Hotel size={20} color="white" /> : addingType === 'transport' ? <Plane size={20} color="white" /> : <MapPin size={20} color="white" />}
                </div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: 'white', lineHeight: 1.2 }}>
                  {addingType === 'hotel' ? 'Agendar Estadía de Hotel' :
                    addingType === 'transport' ? 'Agendar Transporte' :
                      `Agendar Excursión`}
                </h3>
              </div>
              <button 
                onClick={() => {
                  setAddingType(null);
                  setIsSelectorOpen(false);
                }}
                style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'white', transition: 'all 0.2s' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.25)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; }}
              >
                <X size={16} />
              </button>
            </div>

            <div style={{ padding: '2rem' }}>
              <div className="form-group mb-3">
              <label className="text-xs font-bold uppercase text-secondary mb-1 display-block">Seleccionar del Catálogo</label>
              
              <div className="custom-item-selector">
                <div 
                  className="selector-header" 
                  onClick={() => setIsSelectorOpen(!isSelectorOpen)}
                  style={{ padding: '0.5rem 0.8rem', fontSize: '0.85rem', borderRadius: '8px' }}
                >
                  <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: 600 }}>
                    {catalogFolders.flatMap(f => f.items).find((i: any) => i.id === newSchedule.itemId)?.name || '-- Seleccionar del Catálogo --'}
                  </span>
                  <ChevronDown size={14} color="var(--color-primary)" opacity={0.5} />
                </div>

                {isSelectorOpen && (
                  <div className="selector-dropdown custom-scrollbar">
                    {catalogFolders.filter(f => f.type === addingType).length === 0 ? (
                      <div className="p-3 text-center text-secondary text-sm">No hay carpetas creadas</div>
                    ) : (
                      catalogFolders.filter(f => f.type === addingType).map(folder => (
                        <div key={folder.id} className="selector-folder">
                          <div 
                            className="folder-header" 
                            onClick={() => setExpandedFolderId(expandedFolderId === folder.id ? null : folder.id)}
                            style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', minHeight: '36px', background: expandedFolderId === folder.id ? 'rgba(31,58,77,0.03)' : 'transparent', borderBottom: '1px solid rgba(0,0,0,0.02)' }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <Folder size={12} className="text-primary" fill="rgba(31,58,77,0.15)" />
                              <span className="folder-name" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '250px', fontSize: '0.8rem', fontWeight: 600 }}>{folder.name}</span>
                            </div>
                            {expandedFolderId === folder.id ? <ChevronDown size={12} opacity={0.4} /> : <ChevronRight size={12} opacity={0.4} />}
                          </div>
                          
                          {expandedFolderId === folder.id && (
                            <div className="folder-items">
                              {folder.items.length === 0 ? (
                                <div className="empty-items" style={{ padding: '0.75rem 1rem 0.75rem 2.5rem', fontSize: '0.8rem', color: '#94a3b8', fontStyle: 'italic' }}>Carpeta vacía</div>
                              ) : (
                                folder.items.map((item: any) => (
                                    <div 
                                      key={item.id} 
                                      className={`item-row ${newSchedule.itemId === item.id ? 'selected' : ''}`}
                                      onClick={() => {
                                        setNewSchedule({ ...newSchedule, itemId: item.id });
                                        setIsSelectorOpen(false);
                                      }}
                                      style={{ padding: '0.3rem 0.8rem 0.3rem 1.8rem', fontSize: '0.8rem', minHeight: '32px' }}
                                    >
                                      <div className="item-icon-small">
                                        {addingType === 'hotel' ? <Hotel size={10} /> : addingType === 'transport' ? <Plane size={10} /> : <MapPin size={10} />}
                                      </div>
                                      <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</span>
                                    </div>
                                ))
                              )}
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
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

            <div className="form-group mb-4 mt-4">
              <label className="text-xs font-bold uppercase text-secondary mb-2 display-block">Código de Reserva (Opcional)</label>
              <div className="input-with-icon">
                <QrCode size={16} />
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="Ej: ABC1234" 
                  value={newSchedule.reservationCode} 
                  onChange={e => setNewSchedule({ ...newSchedule, reservationCode: e.target.value.toUpperCase() })} 
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid rgba(0,0,0,0.05)' }}>
              <button 
                className="btn btn-primary" 
                onClick={handleScheduleItem}
                style={{ borderRadius: '12px', padding: '0.75rem 2rem' }}
              >
                Confirmar en Agenda
              </button>
            </div>
          </div>
        </div>
      </div>
    )}

      {selectedDayForDetails && (
        <div className="modal-overlay">
          <div className="modal-content glass-card day-details-modal animate-scale-in">
            <div className="modal-header-premium">
              <div className="day-info-pro">
                <div className="day-circle">
                  <span className="day-number">{format(selectedDayForDetails, "d")}</span>
                </div>
                <div className="day-text">
                  <span className="day-month">{format(selectedDayForDetails, "MMMM", { locale: es })}</span>
                  <span className="day-weekday">{format(selectedDayForDetails, "EEEE", { locale: es })}</span>
                </div>
              </div>
              <button onClick={() => setSelectedDayForDetails(null)} className="close-modal-btn"><X size={24} /></button>
            </div>

            <div className="day-view-container">
              <div className="hour-grid custom-scroll">
                {Array.from({ length: 24 }).map((_, i) => {
                  const hour = i; // 00:00 to 23:00
                  const hourStr = hour < 10 ? `0${hour}:00` : `${hour}:00`;
                  const activitiesInHour = scheduledItems
                    .filter(item => {
                      const itemStart = parseISO(item.date);
                      const matchesDay = (item.type === 'hotel' && item.end_date)
                        ? isWithinInterval(selectedDayForDetails, { start: itemStart, end: parseISO(item.end_date) })
                        : isSameDay(selectedDayForDetails, itemStart);

                      return matchesDay && item.time.startsWith(hourStr.split(':')[0]);
                    });

                  return (
                    <div key={hour} className="hour-row">
                      <div className="hour-label">{hourStr}</div>
                      <div className="hour-content">
                        {activitiesInHour.map((item, idx) => {
                          const catalogItem = catalogFolders.flatMap(f => f.items).find(i => i.id === item.item_id);
                          const address = item.address || catalogItem?.location;
                          const origin = item.origin || catalogItem?.origin;
                          const destination = item.destination || catalogItem?.destination;

                          return (
                            <div key={idx} className={`hour-activity-card ${item.type}`}>
                              <div className="card-accent"></div>
                              <div className="card-info">
                                <span className="card-type">{item.type}</span>
                                <span className="card-name">{item.name}</span>
                                <span className="card-time">{item.time} hs</span>
                                {item.type === 'transport' ? (
                                  <div className="card-route-mini">
                                    {origin} <ArrowRight size={10} /> {destination}
                                  </div>
                                ) : address ? (
                                  <div className="card-address-mini">
                                    <MapPin size={10} /> {address}
                                  </div>
                                ) : null}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedItemForDetails && (
        <div className="modal-overlay">
          <div className="modal-content glass-card item-details-modal animate-scale-in">
            <div className={`item-modal-header ${selectedItemForDetails.type}`}>
              <div className="header-icon">
                {selectedItemForDetails.type === 'hotel' ? <Hotel size={32} /> :
                  selectedItemForDetails.type === 'transport' ? <Plane size={32} /> : <MapPin size={32} />}
              </div>
              <div className="header-titles">
                <span className="type-badge">{selectedItemForDetails.type}</span>
                <h3 className="item-name">{selectedItemForDetails.name}</h3>
              </div>
              <button onClick={() => setSelectedItemForDetails(null)} className="close-modal-btn white"><X size={24} /></button>
            </div>

            <div className="item-modal-body">
              <div className="info-grid-premium">
                <div className={`info-box-pro ${selectedItemForDetails.type === 'hotel' ? 'checkin' : ''}`}>
                  <div className="box-icon"><CalendarIcon size={20} /></div>
                  <div className="box-content">
                    <span className="box-label">{selectedItemForDetails.type === 'hotel' ? 'Check-in (Entrada)' : 'Fecha del servicio'}</span>
                    <span className="box-value">
                      {format(parseISO(selectedItemForDetails.date), 'EEEE, dd MMMM', { locale: es })}
                      {selectedItemForDetails.type === 'hotel' && ` - ${selectedItemForDetails.time} hs`}
                    </span>
                  </div>
                </div>

                {selectedItemForDetails.type !== 'hotel' && (
                  <div className="info-box-pro">
                    <div className="box-icon"><Clock size={20} /></div>
                    <div className="box-content">
                      <span className="box-label">Horario previsto</span>
                      <span className="box-value">{selectedItemForDetails.time} hs</span>
                    </div>
                  </div>
                )}

                {selectedItemForDetails.type === 'hotel' && selectedItemForDetails.end_date && (
                  <div className="info-box-pro checkout">
                    <div className="box-icon"><PlaneLanding size={20} /></div>
                    <div className="box-content">
                      <span className="box-label">Check-out (Salida)</span>
                      <span className="box-value">{format(parseISO(selectedItemForDetails.end_date), 'dd/MM/yyyy')} - {selectedItemForDetails.end_time} hs</span>
                    </div>
                  </div>
                )}

                {selectedItemForDetails.reservation_code && (
                  <div className="info-box-pro">
                    <div className="box-icon"><QrCode size={20} /></div>
                    <div className="box-content">
                      <span className="box-label">Código de Reserva</span>
                      <span className="box-value font-bold text-primary">{selectedItemForDetails.reservation_code}</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="location-section-premium">
                <h4 className="section-title-pro">Ubicación</h4>
                {selectedItemForDetails.type === 'transport' ? (
                  <div className="transport-route-pro">
                    <div className="route-stop">
                      <div className="stop-marker start"></div>
                      <div className="stop-info">
                        <span className="stop-name">{selectedItemForDetails.origin || 'Origen no especificado'}</span>
                      </div>
                    </div>
                    <div className="route-line-pro"></div>
                    <div className="route-stop">
                      <div className="stop-marker end"></div>
                      <div className="stop-info">
                        <span className="stop-name">{selectedItemForDetails.destination || 'Destino no especificado'}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="address-card-pro">
                    <div className="address-icon"><MapPin size={20} /></div>
                    <div className="address-text">
                      <span className="address-value">
                        {selectedItemForDetails.address || catalogFolders.flatMap(f => f.items).find(i => i.id === selectedItemForDetails.item_id)?.location || 'Solicitar dirección al prestador'}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <button className="btn-modal-confirm" onClick={() => setSelectedItemForDetails(null)}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

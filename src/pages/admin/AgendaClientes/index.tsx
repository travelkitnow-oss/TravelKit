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
  ChevronDown,
  Archive,
  AlertTriangle,
  Search
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
  parseISO,
  differenceInDays
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
  const [showFinishConfirm, setShowFinishConfirm] = useState(false);
  const [tickets, setTickets] = useState<any[]>([]);
  const [currentTicketIndex, setCurrentTicketIndex] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (selectedClientId) {
      fetchClientData(selectedClientId);
      fetchTickets(selectedClientId);
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

  const fetchTickets = async (clientId: string) => {
    // Sort by created_at to avoid 400 error if departure_date column is missing
    const { data, error } = await supabase
      .from('tickets')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: true });
    
    if (error) {
      console.error('Error fetching tickets:', error);
      return;
    }

    const processedTickets = (data || []).flatMap(t => {
      let flight_info = null;
      try {
        if (t.notes && t.notes.trim().startsWith('{')) {
          flight_info = JSON.parse(t.notes);
        }
      } catch (e) { /* ignore */ }
      
      if (flight_info) {
        const legs = [
          { ...t, leg_type: 'IDA', ...flight_info.outbound }
        ];
        if (flight_info.is_round_trip && flight_info.return) {
          legs.push({ ...t, leg_type: 'VUELTA', ...flight_info.return });
        }
        return legs;
      }
      // Fallback for old tickets
      return [{ 
        ...t, 
        leg_type: 'VUELO',
        origin: t.origin || '---',
        destination: t.destination || '---',
        date: t.departure_date || '',
        departure_time: t.departure_time || '',
        arrival_time: t.arrival_time || ''
      }];
    });

    const sortedTickets = processedTickets.sort((a: any, b: any) => {
      if (!a.date) return 1;
      if (!b.date) return -1;
      return a.date.localeCompare(b.date);
    });
    setTickets(sortedTickets);
    setCurrentTicketIndex(0);
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

  const tripDateMin = selectedClientData?.dates?.departure_date || (tickets.length > 0 ? tickets[0].date : '');
  const tripDateMax = selectedClientData?.dates?.return_date || (tickets.length > 0 ? tickets[tickets.length - 1].date : '');

  const locationsByDate = useMemo(() => {
    if (!tripDateMin || !tripDateMax) return {};
    
    const locMap: Record<string, string> = {};
    const sortedLegs = [...tickets].sort((a, b) => {
      if (!a.date) return 1;
      if (!b.date) return -1;
      return a.date.localeCompare(b.date);
    });

    if (sortedLegs.length === 0) return {};

    const firstLeg = sortedLegs[0];
    const initialOrigin = firstLeg.origin || '';
    const initialOriginCountry = initialOrigin.includes('-') ? initialOrigin.split('-')[0].trim() : initialOrigin;
    
    let currentCountry = initialOriginCountry;
    let d = parseISO(tripDateMin);
    const end = parseISO(tripDateMax);
    
    while (d <= end) {
      const dateStr = format(d, 'yyyy-MM-dd');
      const flightsToday = sortedLegs.filter(l => l.date === dateStr);
      
      if (flightsToday.length > 0) {
        const lastFlight = flightsToday[flightsToday.length - 1];
        const dest = lastFlight.destination || '';
        const destCountry = dest.includes('-') ? dest.split('-')[0].trim() : dest;
        currentCountry = destCountry;
      }
      
      locMap[dateStr] = currentCountry;
      d = addDays(d, 1);
    }
    return locMap;
  }, [tickets, tripDateMin, tripDateMax]);

  const handleScheduleItem = async () => {
    if (!selectedClientId || !newSchedule.itemId || !newSchedule.date) return;

    const itemDetails = catalogFolders.flatMap(f => f.items).find(i => i.id === newSchedule.itemId);

    const { data, error } = await supabase.from('scheduled_items').insert([{
      client_id: selectedClientId,
      type: addingType,
      item_id: newSchedule.itemId,
      name: (itemDetails?.name || 'Ítem agendado') + (newSchedule.reservationCode ? ` (Reserva: ${newSchedule.reservationCode})` : ''),
      date: newSchedule.date || null,
      time: newSchedule.time || null,
      end_date: (addingType === 'hotel' && newSchedule.endDate) ? newSchedule.endDate : null,
      end_time: (addingType === 'hotel' && newSchedule.endTime) ? newSchedule.endTime : null,
      origin: itemDetails?.origin || null,
      destination: itemDetails?.destination || null
    }]).select();

    if (error) {
      console.error('Error scheduling item:', error);
      alert('Error al agendar ítem: ' + error.message);
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

  const handleFinishTrip = async () => {
    if (!selectedClientData) return;
    
    try {
      // 1. Prepare data for history
      const historyData = {
        client_id: selectedClientId,
        trip_name: selectedClientData.dates?.destination ? `Viaje a ${selectedClientData.dates.destination}` : 'Viaje Finalizado',
        destination: selectedClientData.dates?.destination || 'N/A',
        start_date: selectedClientData.dates?.departure_date || null,
        end_date: selectedClientData.dates?.return_date || null,
        itinerary_data: scheduledItems,
        billing_data: selectedClientData.dates || {},
        created_at: new Date().toISOString()
      };

      // 2. Insert into travel_history
      const { error: historyError } = await supabase.from('travel_history').insert([historyData]);
      if (historyError) throw historyError;

      // 3. Clear current data
      await supabase.from('scheduled_items').delete().eq('client_id', selectedClientId);
      
      await supabase.from('client_billing').update({
        tasks: [],
        notes: '[]',
        departure_date: null,
        return_date: null,
        destination: null,
        origin: null,
        departure_time: null,
        arrival_time: null,
        return_departure_time: null,
        return_arrival_time: null,
        arrival_date: null,
        return_arrival_date: null,
        return_origin: null,
        return_destination: null,
        passengers: 1
      }).eq('client_id', selectedClientId);

      setShowFinishConfirm(false);
      alert('Viaje finalizado y archivado con éxito.');
      setSelectedClientId(null);
      fetchInitialData();
    } catch (error: any) {
      console.error('Error finishing trip:', error);
      alert('Error al finalizar el viaje.');
    }
  };

  const nextTicket = () => {
    if (currentTicketIndex < tickets.length - 1) {
      setCurrentTicketIndex(currentTicketIndex + 1);
    }
  };

  const prevTicket = () => {
    if (currentTicketIndex > 0) {
      setCurrentTicketIndex(currentTicketIndex - 1);
    }
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
            
            {isTripDay && locationsByDate[format(cloneDay, 'yyyy-MM-dd')] && (() => {
              const loc = locationsByDate[format(cloneDay, 'yyyy-MM-dd')];
              const destColors = [
                { bg: 'rgba(255, 255, 255, 0.9)', text: '#059669', border: '#059669' }, // Verde Esmeralda
                { bg: 'rgba(255, 255, 255, 0.9)', text: '#7c3aed', border: '#7c3aed' }, // Violeta
                { bg: 'rgba(255, 255, 255, 0.9)', text: '#d97706', border: '#d97706' }, // Ámbar
                { bg: 'rgba(255, 255, 255, 0.9)', text: '#5d4037', border: '#5d4037' }, // Marrón
                { bg: 'rgba(255, 255, 255, 0.9)', text: '#0f766e', border: '#0f766e' }, // Teal
              ];
              
              let colorIndex;
              const lowLoc = loc.toLowerCase();
              if (lowLoc.includes('madrid')) colorIndex = 0;
              else if (lowLoc.includes('aeroparque')) colorIndex = 3;
              else colorIndex = loc.split('').reduce((a, b) => a + b.charCodeAt(0), 0) % destColors.length;
              
              const color = destColors[colorIndex];
              
              return (
                <div className="day-location-badge animate-fade-in" style={{ background: color.bg, color: color.text, border: `1px solid ${color.border}` }}>
                  <MapPin size={8} />
                  <span>{loc}</span>
                </div>
              );
            })()}

            <div className="trip-markers">
              {dayItems.slice(0, 2).map((item, idx) => (
                <div key={idx} className={`trip-pill ${item.type}`} title={`${item.time} - ${item.name}`}>
                  <span className="pill-dot"></span>
                  <span className="pill-name">{item.name}</span>
                </div>
              ))}
              {dayItems.length > 2 && (
                <div className="more-marker">+{dayItems.length - 2} ver más</div>
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

    const c = {
      deepBlue: [31, 58, 77],
      grayBlue: [110, 136, 152],
      lightBlue: [183, 197, 207],
      gold: [200, 155, 90],
      beige: [233, 223, 210],
      white: [255, 255, 255],
      green: [16, 185, 129],
      orange: [200, 155, 90],
      blue: [59, 130, 246]
    };


    const counts = {
      hotel: scheduledItems.filter(i => i.type === 'hotel').length,
      transport: scheduledItems.filter(i => i.type === 'transport').length,
      excursion: scheduledItems.filter(i => i.type === 'excursion').length
    };

    const firstTicket = tickets[0];
    const lastTicket = tickets[tickets.length - 1];

    const effDeparture = {
      date: b.departure_date || firstTicket?.date,
      time: b.departure_time || (firstTicket as any)?.departure_time,
      arrival_time: b.arrival_time || (firstTicket as any)?.arrival_time,
      origin: b.origin || (firstTicket as any)?.origin,
      destination: b.destination || (firstTicket as any)?.destination
    };

    const effReturn = {
      date: b.return_date || lastTicket?.date,
      time: b.return_departure_time || (lastTicket as any)?.departure_time,
      arrival_time: b.return_arrival_time || (lastTicket as any)?.arrival_time,
      origin: b.return_origin || (lastTicket as any)?.origin,
      destination: b.return_destination || (lastTicket as any)?.destination
    };

    const effTripDuration = effDeparture.date && effReturn.date 
      ? Math.max(0, differenceInDays(parseISO(effReturn.date), parseISO(effDeparture.date)))
      : 0;

    const drawHeader = () => {
      doc.setFillColor(c.beige[0], c.beige[1], c.beige[2]);
      doc.rect(0, 0, 210, 55, 'F');

      try {
        doc.addImage(logo, 'JPEG', 15, 5, 45, 45);
      } catch (e) {
        doc.setTextColor(c.deepBlue[0], c.deepBlue[1], c.deepBlue[2]);
        doc.setFontSize(22);
        doc.text("Travel Kit", 15, 25);
      }

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

      doc.setTextColor(c.deepBlue[0], c.deepBlue[1], c.deepBlue[2]);
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text(client.name, 65, 40);
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(c.grayBlue[0], c.grayBlue[1], c.grayBlue[2]);
      doc.text(client.email || '', 65, 46);

      const displayDest = b.destination || effDeparture.destination;
      if (displayDest) {
        doc.setFillColor(c.gold[0], c.gold[1], c.gold[2]);
        doc.roundedRect(155, 18, 45, 12, 2, 2, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text(displayDest.toUpperCase(), 177.5, 26, { align: "center" });
      }

      doc.setDrawColor(c.gold[0], c.gold[1], c.gold[2]);
      doc.setLineWidth(1);
      doc.line(0, 55, 210, 55);
    };

    drawHeader();
    let yPos = 70;

    doc.setFillColor(255, 255, 255);
    doc.roundedRect(15, yPos, 180, 50, 3, 3, 'F');
    doc.setDrawColor(c.lightBlue[0], c.lightBlue[1], c.lightBlue[2]);
    doc.setLineWidth(0.2);
    doc.roundedRect(15, yPos, 180, 50, 3, 3, 'D');

    doc.setFillColor(c.gold[0], c.gold[1], c.gold[2]);
    doc.rect(15, yPos + 5, 2.5, 40, 'F');

    doc.setFontSize(7);
    doc.setTextColor(c.grayBlue[0], c.grayBlue[1], c.grayBlue[2]);
    doc.setFont("helvetica", "bold");
    doc.text("ITINERARIO SALIDA", 35, yPos + 12);
    doc.text("ITINERARIO REGRESO", 90, yPos + 12);
    doc.text("DURACION TOTAL", 150, yPos + 12);

    doc.setFontSize(10);
    doc.setTextColor(c.deepBlue[0], c.deepBlue[1], c.deepBlue[2]);
    if (effDeparture.date) {
      doc.text(`${format(parseISO(effDeparture.date), 'dd/MM/yyyy')} • ${effDeparture.time || '--'} hs`, 35, yPos + 20);
      doc.setFontSize(7);
      doc.setTextColor(c.grayBlue[0], c.grayBlue[1], c.grayBlue[2]);
      const isNextDay = effDeparture.arrival_time && effDeparture.time && effDeparture.arrival_time < effDeparture.time;
      doc.text(`Llegada: ${format(parseISO(effDeparture.date), 'dd/MM/yyyy')} • ${effDeparture.arrival_time || '--'} hs ${isNextDay ? '(+1 Día)' : ''}`, 35, yPos + 26);
    }

    doc.setFontSize(10);
    doc.setTextColor(c.deepBlue[0], c.deepBlue[1], c.deepBlue[2]);
    if (effReturn.date) {
      doc.text(`${format(parseISO(effReturn.date), 'dd/MM/yyyy')} • ${effReturn.time || '--'} hs`, 90, yPos + 20);
      doc.setFontSize(7);
      doc.setTextColor(c.grayBlue[0], c.grayBlue[1], c.grayBlue[2]);
      const isNextDayReturn = effReturn.arrival_time && effReturn.time && effReturn.arrival_time < effReturn.time;
      doc.text(`Llegada: ${format(parseISO(effReturn.date), 'dd/MM/yyyy')} • ${effReturn.arrival_time || '--'} hs ${isNextDayReturn ? '(+1 Día)' : ''}`, 90, yPos + 26);
    }

    doc.setFontSize(14);
    doc.setTextColor(c.deepBlue[0], c.deepBlue[1], c.deepBlue[2]);
    doc.text(`${effTripDuration} noches`, 150, yPos + 22);

    doc.setDrawColor(c.lightBlue[0], c.lightBlue[1], c.lightBlue[2]);
    doc.line(35, yPos + 32, 175, yPos + 32);

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


    doc.setFontSize(12);
    doc.setTextColor(c.deepBlue[0], c.deepBlue[1], c.deepBlue[2]);
    doc.setFont("helvetica", "bold");
    doc.text("ITINERARIO DEL VIAJE", 15, yPos);
    doc.setDrawColor(c.gold[0], c.gold[1], c.gold[2]);
    doc.setLineWidth(1.5);
    doc.line(15, yPos + 2.5, 55, yPos + 2.5);

    yPos += 15;

    const allItineraryItems = [
      ...scheduledItems.map(i => ({ ...i, isFlight: false })),
      ...tickets.map(t => ({
        ...t,
        type: 'flight',
        name: `Vuelo: ${t.origin} -> ${t.destination}`,
        time: (t as any).departure_time,
        isFlight: true
      }))
    ];

    const groupedItems = allItineraryItems.reduce((acc: any, item) => {
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

        const isFlight = item.isFlight;
        const typeColor = isFlight ? c.deepBlue : (item.type === 'hotel' ? c.green : (item.type === 'transport' ? c.blue : c.orange));
        const typeLabel = isFlight ? 'VUELO / PASAJES' : (item.type === 'hotel' ? 'HOSPEDAJE' : (item.type === 'transport' ? 'TRASLADO' : 'EXCURSION'));

        doc.setFillColor(248, 255, 255);
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

            <div className="banner-vuelos-container">
              {tickets.length > 2 && (
                <button className="carousel-control prev" onClick={prevTicket} disabled={currentTicketIndex === 0}>
                  <ChevronLeft size={24} />
                </button>
              )}
              
              <div className="banner-vuelos-grid">
                {tickets.length === 0 ? (
                  <div className="vuelo-card ida premium-ticket empty-ticket">
                    <div className="ticket-main">
                      <div className="ticket-header-pro">
                        <div className="vuelo-tag-pro">BOARDING PASS</div>
                        <div className="vuelo-status" style={{ background: 'rgba(0,0,0,0.05)', color: '#94a3b8' }}>PENDIENTE</div>
                      </div>
                      <div className="ticket-route-pro" style={{ opacity: 0.3 }}>
                        <div className="city-group"><span className="city-code">---</span><span className="city-name">ORIGEN</span></div>
                        <div className="flight-path"><div className="path-line"></div><Plane size={20} className="path-plane" /></div>
                        <div className="city-group dest"><span className="city-code">---</span><span className="city-name">DESTINO</span></div>
                      </div>
                      <div className="ticket-footer-pro" style={{ opacity: 0.3 }}>
                        <div className="footer-item"><span className="item-label">FECHA</span><span className="item-value">---</span></div>
                        <div className="footer-item"><span className="item-label">SALIDA</span><span className="item-value">--:-- HS</span></div>
                        <div className="footer-item"><span className="item-label">LLEGADA</span><span className="item-value">--:-- HS</span></div>
                      </div>
                    </div>
                    <div className="ticket-stub" style={{ opacity: 0.3 }}>
                      <div className="stub-notch top"></div>
                      <div className="stub-content"><QrCode size={40} className="stub-qr" /><div className="stub-text">GATE OPEN</div></div>
                      <div className="stub-notch bottom"></div>
                    </div>
                  </div>
                ) : (
                  tickets.slice(currentTicketIndex, currentTicketIndex + 2).map((ticket, idx) => (
                    <div key={`${ticket.id}-${idx}`} className={`vuelo-card ${ticket.leg_type === 'VUELTA' ? 'vuelta' : 'ida'} premium-ticket animate-fade-in`}>
                      <div className="ticket-main">
                        <div className="ticket-header-pro">
                          <div className="vuelo-tag-pro">BOARDING PASS - {ticket.leg_type}</div>
                          <div className="vuelo-status">CONFIRMADO</div>
                        </div>

                        <div className="ticket-route-pro">
                          <div className="city-group">
                            <span className="city-code">{ticket.origin?.substring(0, 3).toUpperCase() || '---'}</span>
                            <span className="city-name">{ticket.origin || 'Origen'}</span>
                          </div>

                          <div className="flight-path">
                            <div className="path-line"></div>
                            <Plane size={20} className="path-plane" />
                          </div>

                          <div className="city-group dest">
                            <span className="city-code">{ticket.destination?.substring(0, 3).toUpperCase() || '---'}</span>
                            <span className="city-name">{ticket.destination || 'Destino'}</span>
                          </div>
                        </div>

                        <div className="ticket-footer-pro">
                          <div className="footer-item">
                            <span className="item-label">FECHA</span>
                            <span className="item-value">{ticket.date ? format(parseISO(ticket.date), 'dd MMM yyyy', { locale: es }) : '---'}</span>
                          </div>
                          <div className="footer-item">
                            <span className="item-label">SALIDA</span>
                            <span className="item-value">{ticket.departure_time || '--:--'} HS</span>
                          </div>
                          <div className="footer-item">
                            <span className="item-label">LLEGADA</span>
                            <span className="item-value">
                              {ticket.arrival_time || '--:--'} HS
                              {ticket.arrival_time && ticket.departure_time && ticket.arrival_time < ticket.departure_time && (
                                <span style={{ fontSize: '0.65rem', color: '#ef4444', fontWeight: 'bold', marginLeft: '4px' }}>(+1 Día)</span>
                              )}
                            </span>
                          </div>
                        </div>
                        
                        {ticket.notes && (
                          <div style={{ marginTop: '0.75rem', fontSize: '0.7rem', color: '#64748b', fontStyle: 'italic', background: '#f8fafc', padding: '0.5rem', borderRadius: '8px' }}>
                            {ticket.notes}
                          </div>
                        )}
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
                  ))
                )}
              </div>

              {tickets.length > 2 && (
                <button className="carousel-control next" onClick={nextTicket} disabled={currentTicketIndex >= tickets.length - 2}>
                  <ChevronRight size={24} />
                </button>
              )}
            </div>

            <div className="agenda-action-bar">
              <div className="passengers-count">
                <User size={18} />
                <span>{(tickets.length > 0 ? tickets[0].passenger_count : (b.passengers || 1))} Pasajeros</span>
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
                <button className="btn-finish-trip-red" onClick={() => setShowFinishConfirm(true)}>
                  <Archive size={16} /> Finalizar Viaje
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

          {showFinishConfirm && (
            <div className="modal-overlay">
              <div className="modal-content glass-card confirm-finish-modal" style={{ maxWidth: '450px', padding: 0, overflow: 'hidden' }}>
                <div style={{ background: '#ef4444', padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', color: 'white' }}>
                  <AlertTriangle size={24} />
                  <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>Confirmar Finalización</h3>
                </div>
                <div style={{ padding: '2rem' }}>
                  <p style={{ color: 'var(--color-primary)', fontSize: '1rem', lineHeight: '1.5', margin: '0 0 1.5rem 0' }}>
                    ¿Estás seguro de que deseas finalizar el viaje de <strong>{selectedClientData.name}</strong>?
                  </p>
                  <p style={{ color: 'var(--color-secondary)', fontSize: '0.9rem', lineHeight: '1.5', background: '#fff7ed', padding: '1rem', borderRadius: '8px', borderLeft: '4px solid #f97316' }}>
                    Toda la información actual (itinerario, fechas y pagos) se guardará en el historial y el cliente quedará listo para un nuevo viaje.
                  </p>
                  <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                    <button 
                      className="btn-cancel-modal" 
                      onClick={() => setShowFinishConfirm(false)}
                      style={{ flex: 1, padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0', background: 'white', fontWeight: 700, cursor: 'pointer' }}
                    >
                      Cancelar
                    </button>
                    <button 
                      className="btn-confirm-finish" 
                      onClick={handleFinishTrip}
                      style={{ flex: 1, padding: '0.75rem', borderRadius: '8px', border: 'none', background: '#ef4444', color: 'white', fontWeight: 800, cursor: 'pointer' }}
                    >
                      Finalizar Viaje
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
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
                    <div className="selector-search-wrapper" onClick={e => e.stopPropagation()}>
                      <Search size={14} className="search-icon" />
                      <input 
                        type="text" 
                        placeholder="Buscar en el catálogo..." 
                        className="selector-search-input"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        autoFocus
                      />
                    </div>
                    
                    {catalogFolders.filter(f => f.type === addingType).length === 0 ? (
                      <div className="p-3 text-center text-secondary text-sm">No hay carpetas creadas</div>
                    ) : (
                      catalogFolders.filter(f => f.type === addingType).map(folder => {
                        const filteredItems = folder.items.filter((i: any) => 
                          i.name.toLowerCase().includes(searchTerm.toLowerCase())
                        );
                        
                        if (searchTerm && filteredItems.length === 0) return null;
                        
                        return (
                          <div key={folder.id} className="selector-folder">
                            <div 
                              className="folder-header" 
                              onClick={() => setExpandedFolderId(expandedFolderId === folder.id ? null : folder.id)}
                              style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', minHeight: '36px', background: (expandedFolderId === folder.id || searchTerm) ? 'rgba(31,58,77,0.03)' : 'transparent' }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Folder size={12} className="text-primary" fill="rgba(31,58,77,0.15)" />
                                <span className="folder-name" style={{ fontSize: '0.8rem', fontWeight: 600 }}>{folder.name}</span>
                              </div>
                              {(expandedFolderId === folder.id || searchTerm) ? <ChevronDown size={12} opacity={0.4} /> : <ChevronRight size={12} opacity={0.4} />}
                            </div>
                            
                            {(expandedFolderId === folder.id || searchTerm) && (
                              <div className="folder-items">
                                {filteredItems.length === 0 ? (
                                  <div className="empty-items" style={{ padding: '0.75rem 1rem 0.75rem 2.5rem', fontSize: '0.8rem', color: '#94a3b8', fontStyle: 'italic' }}>No hay coincidencias</div>
                                ) : (
                                  filteredItems.map((item: any) => (
                                    <div 
                                      key={item.id} 
                                      className={`item-row ${newSchedule.itemId === item.id ? 'selected' : ''}`}
                                      onClick={() => {
                                        setNewSchedule({ ...newSchedule, itemId: item.id });
                                        setIsSelectorOpen(false);
                                        setSearchTerm('');
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
                        );
                      })
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
                        <input 
                          type="date" 
                          className="form-input" 
                          value={newSchedule.date} 
                          min={tripDateMin}
                          max={tripDateMax}
                          onChange={e => setNewSchedule({ ...newSchedule, date: e.target.value })} 
                        />
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
                        <input 
                          type="date" 
                          className="form-input" 
                          value={newSchedule.endDate} 
                          min={newSchedule.date || tripDateMin}
                          max={tripDateMax}
                          onChange={e => setNewSchedule({ ...newSchedule, endDate: e.target.value })} 
                        />
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
                  <input 
                    type="date" 
                    className="form-input" 
                    value={newSchedule.date} 
                    min={tripDateMin}
                    max={tripDateMax}
                    onChange={e => setNewSchedule({ ...newSchedule, date: e.target.value })} 
                  />
                </div>
                <div className="form-group">
                  <label className="text-xs font-bold uppercase text-secondary mb-2 display-block">Hora</label>
                  <input type="time" className="form-input" value={newSchedule.time} onChange={e => setNewSchedule({ ...newSchedule, time: e.target.value })} />
                </div>
              </div>
            )}

            <div className="form-group mb-4 mt-4">
              <label className="text-xs font-bold uppercase text-secondary mb-2 display-block">Código de Reserva (Se guardará en el nombre)</label>
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

                {/* Reservation code removed to avoid DB column error, now part of name */}
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

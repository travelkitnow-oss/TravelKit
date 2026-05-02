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
import './AgendaClientes.css';

export default function AgendaClientesPage() {
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [addingType, setAddingType] = useState<'excursion' | 'transport' | 'hotel' | null>(null);
  const [newSchedule, setNewSchedule] = useState({ date: '', time: '', itemId: '', endTime: '', endDate: '' });

  const clients = useMemo(() => {
    return JSON.parse(localStorage.getItem('travelkit_manual_clients') || '[]');
  }, []);

  const billingData = useMemo(() => {
    return JSON.parse(localStorage.getItem('travelkit_client_billing') || '{}');
  }, []);

  const excursionFolders = useMemo(() => {
    return JSON.parse(localStorage.getItem('travelkit_excursion_folders') || '[]');
  }, []);

  const transportFolders = useMemo(() => {
    return JSON.parse(localStorage.getItem('travelkit_transport_folders') || '[]');
  }, []);

  const hotelFolders = useMemo(() => {
    return JSON.parse(localStorage.getItem('travelkit_hotel_folders') || '[]');
  }, []);

  const [scheduledItems, setScheduledItems] = useState<Record<string, any[]>>(() => {
    const saved = localStorage.getItem('travelkit_scheduled_items');
    return saved ? JSON.parse(saved) : {};
  });

  useEffect(() => {
    localStorage.setItem('travelkit_scheduled_items', JSON.stringify(scheduledItems));
  }, [scheduledItems]);

  const selectedClientData = useMemo(() => {
    if (!selectedClientId) return null;
    const client = clients.find((c: any) => c.id === selectedClientId);
    if (!client) return null;
    return {
      ...client,
      dates: billingData[selectedClientId] || {}
    };
  }, [selectedClientId, clients, billingData]);

  // Trip date bounds for the date picker
  const tripDateMin = selectedClientData?.dates?.departureDate || '';
  const tripDateMax = selectedClientData?.dates?.returnDate || '';

  const handleScheduleItem = () => {
    if (!selectedClientId || !newSchedule.itemId || !newSchedule.date || !newSchedule.time) return;

    let itemName = '';
    let location = '';
    let origin = '';
    let destination = '';
    let hotelDetails = {};
    const type = addingType;
    if (type === 'excursion') {
      excursionFolders.forEach((f: any) => {
        const found = f.excursions.find((e: any) => e.id === newSchedule.itemId);
        if (found) {
          itemName = found.name;
          location = found.location || '';
        }
      });
    } else if (type === 'transport') {
      transportFolders.forEach((f: any) => {
        const found = f.transports.find((t: any) => t.id === newSchedule.itemId);
        if (found) {
          itemName = found.name;
          origin = found.origin || '';
          destination = found.destination || '';
        }
      });
    } else if (type === 'hotel') {
      hotelFolders.forEach((f: any) => {
        const found = f.hotels.find((h: any) => h.id === newSchedule.itemId);
        if (found) {
          itemName = found.name;
          location = found.address || '';
          
          let calculatedNights = found.nights;
          if (newSchedule.date && newSchedule.endDate) {
            try {
              const start = parseISO(newSchedule.date);
              const end = parseISO(newSchedule.endDate);
              // Calculate difference in days
              const diffTime = end.getTime() - start.getTime();
              calculatedNights = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            } catch { /* fallback */ }
          }

          hotelDetails = {
            nights: calculatedNights,
            breakfast: found.breakfast,
            halfBoard: found.halfBoard,
            allInclusive: found.allInclusive,
            extraServices: found.extraServices,
            stars: found.stars
          };
        }
      });
    }

    const newItem = {
      date: newSchedule.date,
      endDate: newSchedule.endDate,
      time: newSchedule.time,
      endTime: newSchedule.endTime,
      itemId: newSchedule.itemId,
      name: itemName,
      location,
      origin,
      destination,
      type,
      ...hotelDetails,
      id: `item-${Date.now()}`
    };

    setScheduledItems(prev => ({
      ...prev,
      [selectedClientId!]: [...(prev[selectedClientId!] || []), newItem]
    }));

    setAddingType(null);
    setNewSchedule({ date: '', time: '', itemId: '', endTime: '', endDate: '' });
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'No definida';
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  };

  // PDF Export
  const handleExportPDF = async () => {
    if (!selectedClientData) return;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const client = selectedClientData;
    const items = (scheduledItems[selectedClientId || ''] || [])
      .sort((a: any, b: any) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));

    // Brand palette
    const C = {
      blue:   [31, 58, 77]    as [number,number,number],
      mid:    [110, 136, 152] as [number,number,number],
      light:  [183, 197, 207] as [number,number,number],
      gold:   [200, 155, 90]  as [number,number,number],
      beige:  [233, 223, 210] as [number,number,number],
      white:  [255, 255, 255] as [number,number,number],
      offW:   [250, 248, 245] as [number,number,number],
      rowExc: [252, 249, 244] as [number,number,number],
      rowTrn: [246, 249, 252] as [number,number,number],
    };

    // White page
    doc.setFillColor(...C.white);
    doc.rect(0, 0, 210, 297, 'F');

    // --- Load logo ---
    let logoBase64 = '';
    try {
      const resp = await fetch('/travel-kit-logo.jpg');
      const blob = await resp.blob();
      logoBase64 = await new Promise<string>(resolve => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
    } catch { /* optional */ }

    const W = 210, margin = 16;

    // ── HEADER — clean beige, NO dark strips ──
    doc.setFillColor(...C.beige);
    doc.rect(0, 0, W, 54, 'F');
    // Gold bottom line only
    doc.setFillColor(...C.gold);
    doc.rect(0, 53, W, 1.5, 'F');

    // Logo
    if (logoBase64) {
      doc.addImage(logoBase64, 'JPEG', margin, 5, 40, 40);
    }

    const bx = logoBase64 ? margin + 46 : margin;

    // Brand name
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(21);
    doc.setTextColor(...C.blue);
    doc.text('Travel Kit', bx, 19);

    // Tagline
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...C.mid);
    doc.text('EL VIAJE ES EL CAMINO', bx, 27);

    // Thin separator
    doc.setDrawColor(...C.gold);
    doc.setLineWidth(0.4);
    doc.line(bx, 30, bx + 65, 30);

    // Client name
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...C.blue);
    doc.text(client.name, bx, 40);
    if (client.email) {
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...C.mid);
      doc.text(client.email, bx, 48);
    }

    // Destination — gold pill, right-aligned
    if (client.dates?.destination) {
      doc.setFillColor(...C.gold);
      const destText = client.dates.destination.toUpperCase();
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      const textW = doc.getTextWidth(destText);
      const pillW = Math.max(45, textW + 12);
      doc.roundedRect(W - margin - pillW, 18, pillW, 12, 2.5, 2.5, 'F');
      doc.setTextColor(...C.white);
      doc.text(destText, W - margin - (pillW / 2), 26, { align: 'center' });
    }

    let y = 65;

    // ── TRIP SUMMARY — white card, gold left rule, light border ──
    doc.setFillColor(...C.white);
    const summaryH = 54; // Increased for routes
    doc.roundedRect(margin, y, W - margin * 2, summaryH, 2, 2, 'F');
    doc.setDrawColor(...C.light);
    doc.setLineWidth(0.3);
    doc.roundedRect(margin, y, W - margin * 2, summaryH, 2, 2, 'S');
    // Gold left rule
    doc.setFillColor(...C.gold);
    doc.rect(margin, y, 2.5, summaryH, 'F');

    // --- ROW 1: FLIGHTS ---
    const colW = (W - margin * 2) / 3;
    const cols = [margin + colW * 0.5, margin + colW * 1.5, margin + colW * 2.5];
    
    doc.setFontSize(6);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...C.mid);
    doc.text('ITINERARIO SALIDA', cols[0], y + 8, { align: 'center' });
    doc.text('ITINERARIO REGRESO', cols[1], y + 8, { align: 'center' });
    doc.text('DURACION TOTAL', cols[2], y + 8, { align: 'center' });

    // Outbound
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...C.blue);
    doc.text(`${formatDate(client.dates?.departureDate)} • ${client.dates?.departureTime || '--:--'} hs`, cols[0], y + 16, { align: 'center' });
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...C.mid);
    doc.text(`Ruta: ${client.dates?.origin || '--'} > ${client.dates?.destination || '--'}`, cols[0], y + 22, { align: 'center' });
    doc.text(`Llegada: ${formatDate(client.dates?.arrivalDate)} • ${client.dates?.arrivalTime || '--:--'} hs`, cols[0], y + 27, { align: 'center' });

    // Inbound
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...C.blue);
    doc.text(`${formatDate(client.dates?.returnDate)} • ${client.dates?.returnDepartureTime || '--:--'} hs`, cols[1], y + 16, { align: 'center' });
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...C.mid);
    doc.text(`Ruta: ${client.dates?.returnOrigin || '--'} > ${client.dates?.returnDestination || '--'}`, cols[1], y + 22, { align: 'center' });
    doc.text(`Llegada: ${formatDate(client.dates?.returnArrivalDate)} • ${client.dates?.returnArrivalTime || '--:--'} hs`, cols[1], y + 27, { align: 'center' });

    // Duration
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...C.blue);
    if (client.dates?.departureDate && client.dates?.returnDate) {
      try {
        const dep = parseISO(client.dates.departureDate);
        const ret = parseISO(client.dates.returnDate);
        const diff = Math.ceil((ret.getTime() - dep.getTime()) / (1000 * 60 * 60 * 24));
        doc.text(`${diff} noches`, cols[2], y + 20, { align: 'center' });
      } catch { /* skip */ }
    }

    // --- ROW 2: SERVICES ---
    doc.setDrawColor(...C.light);
    doc.setLineWidth(0.2);
    doc.line(margin + 8, y + 34, W - margin - 8, y + 34); // Horizontal separator

    const statLabels = ['EXCURSIONES', 'TRANSPORTES', 'HOTELES'];
    const statValues = [excursionItems.length, transportItems.length, hotelItems.length];
    
    statLabels.forEach((label, i) => {
      doc.setFontSize(5.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...C.mid);
      doc.text(label, cols[i], y + 41, { align: 'center' });
      
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...C.blue);
      doc.text(statValues[i].toString(), cols[i], y + 48, { align: 'center' });
    });

    y += summaryH + 12;

    if (items.length === 0) {
      doc.setTextColor(...C.mid);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'italic');
      doc.text('Sin actividades agendadas para este viaje.', W / 2, y + 20, { align: 'center' });
    } else {
      // ── SECTION TITLE ──
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...C.mid);
      doc.text('ITINERARIO DEL VIAJE', margin, y);
      doc.setFillColor(...C.gold);
      doc.rect(margin, y + 2, 38, 0.7, 'F');
      y += 9;

      const grouped: Record<string, any[]> = {};
      items.forEach((item: any) => {
        if (!grouped[item.date]) grouped[item.date] = [];
        grouped[item.date].push(item);
      });

      Object.entries(grouped).forEach(([date, dayItems]) => {
        if (y > 265) { doc.addPage(); doc.setFillColor(...C.white); doc.rect(0,0,210,297,'F'); y = 20; }

        // Day header — beige bg, gold left border, dark blue text
        doc.setFillColor(...C.offW);
        doc.roundedRect(margin, y, W - margin * 2, 10, 2, 2, 'F');
        doc.setFillColor(...C.gold);
        doc.rect(margin, y, 3, 10, 'F');
        doc.setTextColor(...C.blue);
        doc.setFontSize(8.5);
        doc.setFont('helvetica', 'bold');
        const dayLabel = format(parseISO(date), "EEEE d 'de' MMMM yyyy", { locale: es });
        doc.text(dayLabel.charAt(0).toUpperCase() + dayLabel.slice(1), margin + 7, y + 7);
        y += 13;

        (dayItems as any[]).forEach((item: any) => {
          const isTransport = item.type === 'transport';
          const isHotel = item.type === 'hotel';
          const hasDetail = !!(item.location || item.origin || item.destination);
          // If hotel, we want more space for the extra info. If it has extra services, even more.
          const rowH = isHotel ? (item.extraServices ? 33 : 28) : (hasDetail ? 16 : 10);

          if (y + rowH > 272) { doc.addPage(); doc.setFillColor(...C.white); doc.rect(0,0,210,297,'F'); y = 20; }

          // Style based on type
          let rowColor: [number, number, number] = isTransport ? C.rowTrn : C.rowExc;
          let borderColor: [number, number, number] = isTransport ? C.mid : C.gold;
          let badgeText = isTransport ? 'TRASLADO' : 'EXCURSION';

          if (isHotel) {
            rowColor = [242, 249, 245];
            borderColor = [16, 185, 129];
            badgeText = 'HOSPEDAJE';
          }

          // Row — very light fill, thin colored left border
          doc.setFillColor(...rowColor);
          doc.roundedRect(margin, y, W - margin * 2, rowH, 1, 1, 'F');
          // Left border line (2px)
          doc.setFillColor(...borderColor);
          doc.rect(margin, y, 2, rowH, 'F');

          // Time (plain text, no pill)
          doc.setFontSize(8);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(...borderColor);
          doc.text(item.time, margin + 6, y + 6.5);

          // Separator dot
          doc.setFontSize(8);
          doc.setTextColor(...C.light);
          doc.text('|', margin + 22, y + 6.5);

          // Activity name
          doc.setFontSize(9.5);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(...C.blue);
          doc.text(item.name, margin + 26, y + 6.5, { maxWidth: 105 });

          // Detail line
          if (isHotel) {
            doc.setFontSize(7.5);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(...C.mid);
            
            const meals = [];
            if (item.breakfast) meals.push('Desayuno');
            if (item.halfBoard) meals.push('Media Pensión');
            if (item.allInclusive) meals.push('All Inclusive');
            
            const hotelLine1 = `${item.location || ''}`;
            const hotelLine2 = `Ingreso: ${formatDate(item.date)} • ${item.time} hs`;
            const hotelLine3 = `Egreso:  ${formatDate(item.endDate)} • ${item.endTime} hs`;
            const hotelLine4 = `${item.nights || 1} noches ${meals.length > 0 ? '• ' + meals.join(', ') : ''}`;
            const hotelLine5 = item.extraServices ? `Servicios extra: ${item.extraServices}` : '';
            
            doc.text(hotelLine1, margin + 26, y + 12);
            doc.text(hotelLine2, margin + 26, y + 16.5);
            doc.text(hotelLine3, margin + 26, y + 20.5);
            doc.text(hotelLine4, margin + 26, y + 25, { maxWidth: 140 });
            if (hotelLine5) {
              doc.text(hotelLine5, margin + 26, y + 29, { maxWidth: 140 });
            }

            // Type badge
            doc.setFontSize(6);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(...borderColor);
            doc.text(badgeText, W - margin - 2, y + 6.5, { align: 'right' });
            if (item.stars) {
              doc.text(`${item.stars} ESTRELLAS`, W - margin - 2, y + 10, { align: 'right' });
            }
          } else {
            if (hasDetail) {
              doc.setFontSize(7);
              doc.setFont('helvetica', 'normal');
              doc.setTextColor(...C.mid);
              if (item.location) {
                doc.text(`${item.location}`, margin + 26, y + 12.5, { maxWidth: 105 });
              } else {
                const route = [item.origin, item.destination].filter(Boolean).join(' > ');
                doc.text(route, margin + 26, y + 12.5, { maxWidth: 105 });
              }
            }

            // Type badge
            doc.setFontSize(6);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(...borderColor);
            doc.text(badgeText, W - margin - 2, y + 6.5, { align: 'right' });
          }

          y += rowH + 2.5;
        });
        y += 4;
      });
    }

    // ── FOOTER — minimal: just a gold rule + text ──
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let p = 1; p <= pageCount; p++) {
      doc.setPage(p);
      doc.setFillColor(...C.gold);
      doc.rect(margin, 287, W - margin * 2, 0.5, 'F');
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...C.blue);
      doc.text('Travel Kit', margin, 292);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...C.mid);
      doc.text('· El viaje es el camino', margin + 20, 292);
      doc.text(`${p} / ${pageCount}  —  ${format(new Date(), 'dd/MM/yyyy')}`, W - margin, 292, { align: 'right' });
    }

    doc.save(`agenda-${client.name.toLowerCase().replace(/\s+/g, '-')}.pdf`);
  };



  const renderHeader = () => (

    <div className="calendar-header">
      <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="btn-icon">
        <ChevronLeft size={20} />
      </button>
      <h2 className="current-month">
        {format(currentMonth, 'MMMM yyyy', { locale: es })}
      </h2>
      <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="btn-icon">
        <ChevronRight size={20} />
      </button>
    </div>
  );

  const renderDays = () => {
    const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    return (
      <div className="calendar-days-grid">
        {days.map(day => (
          <div key={day} className="calendar-day-label">{day}</div>
        ))}
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
        let isSelected = false;
        let isStart = false;
        let isEnd = false;

        if (selectedClientData?.dates?.departureDate && selectedClientData?.dates?.returnDate) {
          try {
            const start = parseISO(selectedClientData.dates.departureDate);
            const end = parseISO(selectedClientData.dates.returnDate);
            isSelected = isWithinInterval(cloneDay, { start, end });
            isStart = isSameDay(cloneDay, start);
            isEnd = isSameDay(cloneDay, end);
          } catch {
            // Invalid dates
          }
        }

        const itemsForDay = (scheduledItems[selectedClientId || ''] || []).filter(e =>
          isSameDay(cloneDay, parseISO(e.date))
        );

        days.push(
          <div
            key={day.toString()}
            className={`calendar-cell ${!isSameMonth(day, monthStart) ? 'disabled' : ''} ${isSelected ? 'selected' : ''} ${isStart ? 'trip-start' : ''} ${isEnd ? 'trip-end' : ''}`}
          >
            <span className="number">{format(day, 'd')}</span>
            <div className="trip-markers">
              {isStart && <div className="trip-marker start"><Plane size={10} /></div>}
              {isEnd && <div className="trip-marker end"><Plane size={10} /></div>}
              {itemsForDay.filter(e => e.type === 'excursion').map((e, idx) => (
                <div key={idx} className="trip-marker excursion" title={`${e.time} - ${e.name}`}>
                  <MapPin size={8} />
                </div>
              ))}
              {itemsForDay.filter(e => e.type === 'transport').map((e, idx) => (
                <div key={idx} className="trip-marker transport" title={`${e.time} - ${e.name}`}>
                  <Bus size={8} />
                </div>
              ))}
              {itemsForDay.filter(e => e.type === 'hotel').map((e, idx) => (
                <div key={idx} className="trip-marker hotel" title={`${e.time}${e.endTime ? ' - ' + e.endTime : ''} | ${e.name}`}>
                  <HotelIcon size={8} />
                </div>
              ))}
            </div>
          </div>
        );
        day = addDays(day, 1);
      }
      rows.push(
        <div className="calendar-row" key={day.toString()}>
          {days}
        </div>
      );
      days = [];
    }
    return <div className="calendar-body">{rows}</div>;
  };

  const clientItems = scheduledItems[selectedClientId || ''] || [];
  const excursionItems = clientItems.filter(i => i.type === 'excursion');
  const transportItems = clientItems.filter(i => i.type === 'transport');
  const hotelItems = clientItems.filter(i => i.type === 'hotel');

  return (
    <div className="agenda-clientes-page animate-fade-in">
      <header className="page-header-centered">
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '3rem', fontWeight: 800 }}>Agenda de Clientes</h1>
        <p>Seleccioná un viajero, revisá el calendario y agendá sus actividades.</p>
      </header>

      {/* ── CLIENT SELECTOR ── */}
      <div className="agenda-client-selector">
        <span className="selector-label"><User size={14} /> Viajero:</span>
        <div className="client-pills">
          {clients.map((client: any) => (
            <button
              key={client.id}
              className={`client-pill ${selectedClientId === client.id ? 'active' : ''}`}
              onClick={() => {
                setSelectedClientId(client.id);
                if (billingData[client.id]?.departureDate) {
                  setCurrentMonth(parseISO(billingData[client.id].departureDate));
                }
              }}
            >
              <User size={13} />
              {client.name}
            </button>
          ))}
          {clients.length === 0 && (
            <span className="no-clients-hint">No hay clientes registrados aún.</span>
          )}
        </div>
      </div>

      {selectedClientData ? (
        <>
          {/* ── CLIENT INFO BANNER ── */}
          <div className="agenda-client-banner glass-card">
            <div className="banner-main-row">
              {/* 1. Destination */}
              <div className="banner-group destination-group">
                <MapPin size={24} className="banner-icon" />
                <div className="banner-field">
                  <span className="banner-label">Destino</span>
                  <span className="banner-value highlight">{selectedClientData.dates.destination || 'No definido'}</span>
                </div>
              </div>

              {/* 2. Outbound Flight */}
              <div className="banner-group flight-group">
                <Plane size={24} className="banner-icon" />
                <div className="banner-field">
                  <span className="banner-label">Vuelo de Salida</span>
                  <div className="banner-flight-details">
                    <div className="flight-segment-route">
                      {selectedClientData.dates?.origin || '--'} → {selectedClientData.dates?.destination || '--'}
                    </div>
                    <div className="flight-segment">
                      <span className="segment-label">Sale:</span>
                      <span className="segment-value">
                        {formatDate(selectedClientData.dates.departureDate)}
                        {selectedClientData.dates.departureTime && ` • ${selectedClientData.dates.departureTime} hs`}
                      </span>
                    </div>
                    <div className="flight-segment">
                      <span className="segment-label">Llega:</span>
                      <span className="segment-value">
                        {formatDate(selectedClientData.dates.arrivalDate)}
                        {selectedClientData.dates.arrivalTime && ` • ${selectedClientData.dates.arrivalTime} hs`}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. Return Flight */}
              <div className="banner-group flight-group">
                <Plane size={24} className="banner-icon" style={{ transform: 'rotate(180deg)' }} />
                <div className="banner-field">
                  <span className="banner-label">Vuelo de Regreso</span>
                  <div className="banner-flight-details">
                    <div className="flight-segment-route">
                      {selectedClientData.dates?.returnOrigin || '--'} → {selectedClientData.dates?.returnDestination || '--'}
                    </div>
                    <div className="flight-segment">
                      <span className="segment-label">Sale:</span>
                      <span className="segment-value">
                        {formatDate(selectedClientData.dates.returnDate)}
                        {selectedClientData.dates.returnDepartureTime && ` • ${selectedClientData.dates.returnDepartureTime} hs`}
                      </span>
                    </div>
                    <div className="flight-segment">
                      <span className="segment-label">Llega:</span>
                      <span className="segment-value">
                        {formatDate(selectedClientData.dates.returnArrivalDate)}
                        {selectedClientData.dates.returnArrivalTime && ` • ${selectedClientData.dates.returnArrivalTime} hs`}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 4. Export Button */}
              <button className="btn-export-pdf" onClick={handleExportPDF}>
                <Plane size={18} />
                Exportar PDF
              </button>
            </div>

            <div className="banner-stats-row">
              <div className="stat-item">
                <MapPin size={16} className="banner-icon" />
                <div className="stat-content">
                  <span className="stat-label">Excursiones</span>
                  <div className="stat-value">{excursionItems.length}</div>
                </div>
              </div>
              <div className="stat-item">
                <Bus size={16} className="banner-icon" />
                <div className="stat-content">
                  <span className="stat-label">Transportes</span>
                  <div className="stat-value">{transportItems.length}</div>
                </div>
              </div>
              <div className="stat-item">
                <HotelIcon size={16} className="banner-icon" />
                <div className="stat-content">
                  <span className="stat-label">Hoteles</span>
                  <div className="stat-value">{hotelItems.length}</div>
                </div>
              </div>
            </div>
          </div>

          {/* ── CALENDAR ── */}
          <div className="agenda-calendar-full glass-card">
            {renderHeader()}
            {renderDays()}
            {renderCells()}
          </div>

          {/* ── SCHEDULER SECTION ── */}
          <div className="agenda-scheduler-section">
            {/* Excursiones */}
            <div className="scheduler-card glass-card">
              <div className="scheduler-card-header excursion-header">
                <div className="scheduler-card-title">
                  <MapPin size={18} />
                  <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.5rem' }}>Excursiones</h3>
                  <span className="scheduler-count">{excursionItems.length}</span>
                </div>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => { setAddingType('excursion'); setNewSchedule({ date: '', time: '', itemId: '', endTime: '', endDate: '' }); }}
                >
                  <Plus size={15} /> Agendar
                </button>
              </div>

              <div className="scheduler-items">
                {excursionItems.length === 0 ? (
                  <div className="scheduler-empty">
                    <MapPin size={28} className="empty-icon" />
                    <p>Sin excursiones agendadas</p>
                  </div>
                ) : (
                  excursionItems
                    .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time))
                    .map((item) => (
                      <div key={item.id} className="scheduler-item excursion-item">
                        <div className="scheduler-item-dot excursion-dot" />
                        <div className="scheduler-item-time">{item.time}</div>
                        <div className="scheduler-item-info">
                          <span className="scheduler-item-name">{item.name}</span>
                          <span className="scheduler-item-date">{formatDate(item.date)}</span>
                          {item.location && <span className="scheduler-item-detail">{item.location}</span>}
                          {item.type === 'hotel' && (
                            <span className="scheduler-item-detail">
                              {item.nights} noches • {[
                                item.breakfast && 'Desayuno',
                                item.halfBoard && 'Media Pensión',
                                item.allInclusive && 'All Inclusive'
                              ].filter(Boolean).join(', ')}
                            </span>
                          )}
                        </div>
                        <button
                          className="btn-delete-scheduled"
                          onClick={() => setScheduledItems(prev => ({
                            ...prev,
                            [selectedClientId!]: prev[selectedClientId!].filter(i => i.id !== item.id)
                          }))}
                        >
                          <X size={13} />
                        </button>
                      </div>
                    ))
                )}
              </div>
            </div>

            {/* Transportes */}
            <div className="scheduler-card glass-card">
              <div className="scheduler-card-header transport-header">
                <div className="scheduler-card-title">
                  <Bus size={18} />
                  <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.5rem' }}>Transportes</h3>
                  <span className="scheduler-count transport-count">{transportItems.length}</span>
                </div>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => { setAddingType('transport'); setNewSchedule({ date: '', time: '', itemId: '', endTime: '', endDate: '' }); }}
                >
                  <Plus size={15} /> Agendar
                </button>
              </div>

              <div className="scheduler-items">
                {transportItems.length === 0 ? (
                  <div className="scheduler-empty">
                    <Bus size={28} className="empty-icon" />
                    <p>Sin transportes agendados</p>
                  </div>
                ) : (
                  transportItems
                    .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time))
                    .map((item) => (
                      <div key={item.id} className="scheduler-item transport-item">
                        <div className="scheduler-item-dot transport-dot" />
                        <div className="scheduler-item-time transport-time">{item.time}</div>
                        <div className="scheduler-item-info">
                          <span className="scheduler-item-name">{item.name}</span>
                          <span className="scheduler-item-date">{formatDate(item.date)}</span>
                          {(item.origin || item.destination) && (
                            <span className="scheduler-item-detail">
                              {[item.origin, item.destination].filter(Boolean).join(' → ')}
                            </span>
                          )}
                        </div>
                        <button
                          className="btn-delete-scheduled"
                          onClick={() => setScheduledItems(prev => ({
                            ...prev,
                            [selectedClientId!]: prev[selectedClientId!].filter(i => i.id !== item.id)
                          }))}
                        >
                          <X size={13} />
                        </button>
                      </div>
                    ))
                )}
              </div>
            </div>

            {/* Hoteles */}
            <div className="scheduler-card glass-card">
              <div className="scheduler-card-header" style={{ background: 'rgba(16, 185, 129, 0.03)' }}>
                <div className="scheduler-card-title">
                  <HotelIcon size={18} />
                  <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.5rem' }}>Hoteles</h3>
                  <span className="scheduler-count hotel-count">{hotelItems.length}</span>
                </div>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => { setAddingType('hotel'); setNewSchedule({ date: '', time: '', itemId: '', endTime: '', endDate: '' }); }}
                >
                  <Plus size={15} /> Agendar
                </button>
              </div>

              <div className="scheduler-items">
                {hotelItems.length === 0 ? (
                  <div className="scheduler-empty">
                    <HotelIcon size={28} className="empty-icon" />
                    <p>Sin hoteles agendados</p>
                  </div>
                ) : (
                  hotelItems
                    .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time))
                    .map((item) => (
                      <div key={item.id} className="scheduler-item hotel-item">
                        <div className="scheduler-item-dot" style={{ background: '#10b981' }} />
                        <div className="scheduler-item-time hotel-nights-pill">
                          {item.nights} {item.nights === 1 ? 'noche' : 'noches'}
                        </div>
                        <div className="scheduler-item-info">
                          <span className="scheduler-item-name">{item.name}</span>
                          <div className="hotel-timeline-info">
                            <div className="timeline-segment">
                              <span className="segment-label">Ingreso:</span>
                              <span className="segment-value">{formatDate(item.date)} • {item.time} hs</span>
                            </div>
                            <div className="timeline-segment">
                              <span className="segment-label">Egreso:</span>
                              <span className="segment-value">{formatDate(item.endDate)} • {item.endTime} hs</span>
                            </div>
                          </div>
                          {item.location && <span className="scheduler-item-detail">{item.location}</span>}
                          <div className="scheduler-item-detail" style={{ color: '#10b981', fontWeight: 700, marginTop: '0.2rem' }}>
                            {[
                              item.breakfast && 'Desayuno',
                              item.halfBoard && 'Media Pensión',
                              item.allInclusive && 'All Inclusive'
                            ].filter(Boolean).join(', ')}
                          </div>
                        </div>
                        <button
                          className="btn-delete-scheduled"
                          onClick={() => setScheduledItems(prev => ({
                            ...prev,
                            [selectedClientId!]: prev[selectedClientId!].filter(i => i.id !== item.id)
                          }))}
                        >
                          <X size={13} />
                        </button>
                      </div>
                    ))
                )}
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="empty-calendar-state">
          <CalendarIcon size={48} className="mb-4 text-muted" />
          <h3>Seleccioná un viajero para ver su agenda</h3>
        </div>
      )}


      {/* Scheduling Modal */}
      {addingType && (
        <div className="modal-overlay">
          <div className="modal-content glass-card p-5" style={{ maxWidth: '500px' }}>
            <div className="modal-header-premium mb-4">
              <h3 className="m-0" style={{ fontWeight: 800 }}>
                {addingType === 'excursion' ? 'Agendar Excursión' : 
                 addingType === 'transport' ? 'Agendar Transporte' : 
                 'Agendar Hotel'}
              </h3>
              <button className="btn-icon-sm" onClick={() => setAddingType(null)}>
                <X size={20} />
              </button>
            </div>

            {tripDateMin && tripDateMax && (
              <div className="trip-range-badge mb-3">
                <Plane size={13} />
                Viaje: {formatDate(tripDateMin)} → {formatDate(tripDateMax)}
              </div>
            )}

            <div className="modal-form">
              <div className="form-group mb-3">
                <label>Seleccionar del catálogo</label>
                <div className="input-with-icon">
                  {addingType === 'excursion' ? <MapPin size={16} /> : 
                   addingType === 'transport' ? <Bus size={16} /> : 
                   <HotelIcon size={16} />}
                  <select
                    className="form-input"
                    value={newSchedule.itemId}
                    onChange={e => setNewSchedule({ ...newSchedule, itemId: e.target.value })}
                  >
                    <option value="">Selecciona una opción...</option>
                    {(addingType === 'excursion' ? excursionFolders : 
                      addingType === 'transport' ? transportFolders : 
                      hotelFolders).map((folder: any) => (
                      <optgroup key={folder.id} label={folder.name}>
                        {(addingType === 'excursion' ? folder.excursions : 
                          addingType === 'transport' ? folder.transports : 
                          folder.hotels).map((item: any) => (
                          <option key={item.id} value={item.id}>{item.name}</option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>
              </div>

              {addingType === 'hotel' ? (
                <div className="hotel-dates-grid">
                  <div className="grid-2 gap-3 mb-4">
                    <div className="form-group">
                      <label>Fecha Ingreso</label>
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
                      <label>Hora Ingreso</label>
                      <div className="input-with-icon">
                        <Clock size={16} />
                        <input
                          type="time"
                          className="form-input"
                          step="300"
                          value={newSchedule.time}
                          onChange={e => setNewSchedule({ ...newSchedule, time: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid-2 gap-3">
                    <div className="form-group">
                      <label>Fecha Egreso</label>
                      <input
                        type="date"
                        className="form-input"
                        value={newSchedule.endDate}
                        min={newSchedule.date || tripDateMin}
                        max={tripDateMax}
                        onChange={e => setNewSchedule({ ...newSchedule, endDate: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label>Hora Egreso</label>
                      <div className="input-with-icon">
                        <Clock size={16} />
                        <input
                          type="time"
                          className="form-input"
                          step="300"
                          value={newSchedule.endTime}
                          onChange={e => setNewSchedule({ ...newSchedule, endTime: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid-2 gap-3">
                  <div className="form-group">
                    <label>Fecha del viaje</label>
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
                    <label>Horario</label>
                    <div className="input-with-icon">
                      <Clock size={16} />
                      <input
                        type="time"
                        className="form-input"
                        value={newSchedule.time}
                        onChange={e => setNewSchedule({ ...newSchedule, time: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '2.5rem' }}>
                <button className="btn btn-outline w-100" onClick={() => setAddingType(null)}>
                  Cancelar
                </button>
                <button className="btn btn-primary w-100" onClick={handleScheduleItem}>
                  <Check size={18} /> Agendar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

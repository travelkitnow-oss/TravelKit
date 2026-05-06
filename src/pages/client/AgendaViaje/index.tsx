/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  User,
  Plane,
  X,
  Download,
  Hotel,
  ArrowRight,
  MapPin,
  QrCode
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
import './AgendaViaje.css';

export default function AgendaViajePage() {
  const { clientId } = useOutletContext<{ clientId: string }>();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [scheduledItems, setScheduledItems] = useState<any[]>([]);
  const [clientData, setClientData] = useState<any>(null);
  const [billingData, setBillingData] = useState<any>(null);
  const [catalogItems, setCatalogItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItemForDetails, setSelectedItemForDetails] = useState<any | null>(null);

  useEffect(() => {
    if (clientId) {
      fetchInitialData();
    }
  }, [clientId]);

  const fetchInitialData = async () => {
    setLoading(true);
    
    // Fetch client basic info
    const { data: client } = await supabase
      .from('clients')
      .select('*')
      .eq('id', clientId)
      .single();
    setClientData(client);

    // Fetch client billing (dates, destination, etc.)
    const { data: bData } = await supabase
      .from('client_billing')
      .select('*')
      .eq('client_id', clientId)
      .maybeSingle();
    setBillingData(bData);

    // Fetch scheduled items
    const { data: sItems } = await supabase
      .from('scheduled_items')
      .select('*')
      .eq('client_id', clientId)
      .order('date');
    setScheduledItems(sItems || []);

    // Fetch catalog items for reference (origin/destination info)
    const { data: itemsData } = await supabase.from('catalog_items').select('*');
    setCatalogItems(itemsData || []);

    setLoading(false);
  };

  const tripDateMin = billingData?.departure_date || '';
  const tripDateMax = billingData?.return_date || '';

  const renderHeader = () => (
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
    if (!scheduledItems.length) {
      alert("No hay actividades agendadas para exportar.");
      return;
    }

    const doc = new jsPDF();
    const client = clientData;
    const b = billingData || {};

    const c = {
      deepBlue: [31, 58, 77],
      grayBlue: [110, 136, 152],
      lightBlue: [183, 197, 207],
      gold: [200, 155, 90],
      beige: [233, 223, 210],
      green: [16, 185, 129],
      blue: [59, 130, 246],
      orange: [200, 155, 90]
    };



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
      doc.text("EL VIAJE ES EL CAMINO", 65, 27);
      doc.setDrawColor(c.gold[0], c.gold[1], c.gold[2]);
      doc.line(65, 30, 135, 30);
      doc.setFontSize(16);
      doc.text(client.name, 65, 40);
      doc.setFontSize(9);
      doc.setTextColor(c.grayBlue[0], c.grayBlue[1], c.grayBlue[2]);
      doc.text(client.email || '', 65, 46);
      if (b.destination) {
        doc.setFillColor(c.gold[0], c.gold[1], c.gold[2]);
        doc.roundedRect(155, 18, 45, 12, 2, 2, 'F');
        doc.setTextColor(255, 255, 255);
        doc.text(b.destination.toUpperCase(), 177.5, 26, { align: "center" });
      }
      doc.line(0, 55, 210, 55);
    };

    drawHeader();
    let yPos = 70;
    
    // Summary card and detailed items similar to Admin PDF generation...
    // (Simplified for brevity but maintaining the professional structure)
    doc.setFontSize(12);
    doc.setTextColor(c.deepBlue[0], c.deepBlue[1], c.deepBlue[2]);
    doc.text("ITINERARIO DEL VIAJE", 15, yPos);
    yPos += 10;

    const groupedItems = scheduledItems.reduce((acc: any, item) => {
      const dateKey = item.date;
      if (!acc[dateKey]) acc[dateKey] = [];
      acc[dateKey].push(item);
      return acc;
    }, {});

    const sortedDates = Object.keys(groupedItems).sort();

    sortedDates.forEach((dateKey) => {
      if (yPos > 260) { doc.addPage(); drawHeader(); yPos = 70; }
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text(format(parseISO(dateKey), "EEEE d 'de' MMMM", { locale: es }).toUpperCase(), 15, yPos);
      yPos += 10;

      groupedItems[dateKey].forEach((item: any) => {
        if (yPos > 270) { doc.addPage(); drawHeader(); yPos = 70; }
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.text(`${item.time} - ${item.name}`, 20, yPos);
        yPos += 7;
      });
      yPos += 5;
    });

    doc.save(`Mi_Itinerario_${client.name.replace(/\s/g, '_')}.pdf`);
  };

  if (loading) {
    return (
      <div className="agenda-viaje-page animate-fade-in">
        <div className="loading-state-premium">
          <div className="loader-premium"></div>
          <p>Cargando tu cronograma personalizado...</p>
        </div>
      </div>
    );
  }

  const b = billingData || {};

  return (
    <div className="agenda-viaje-page animate-fade-in">
      <header className="page-header-centered">
        <h1>Mi Agenda de Viaje</h1>
        <p>Tu itinerario exclusivo diseñado por Travel Kit.</p>
      </header>

      <div className="agenda-client-banner-premium glass-card animate-slide-up">
        <div className="banner-top-row" style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1.5rem' }}>
          <button className="btn-export-pdf-premium" onClick={generatePDF}>
            <Download size={18} /> Exportar Itinerario
          </button>
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
                <QrCode size={34} className="stub-qr" />
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
                <QrCode size={34} className="stub-qr" />
                <div className="stub-text">GATE OPEN</div>
              </div>
              <div className="stub-notch bottom"></div>
            </div>
          </div>
        </div>

        <div className="agenda-action-bar-readonly">
          <div className="passengers-count">
            <User size={18} />
            <span>{b.passengers || 1} Pasajeros</span>
          </div>
          <div className="trip-status-badge">
            <div className="status-dot"></div>
            <span>VIAJE PROGRAMADO</span>
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
          <p className="subtitle">Detalle completo de tu estadía, transportes y excursiones programadas.</p>
          <div className="accent-line"></div>
        </div>

        <div className="agenda-sectors-container animate-fade-in">
          {/* Alojamiento */}
          <div className="agenda-sector hotel">
            <div className="sector-header">
              <Hotel size={20} />
              <h3>Alojamientos</h3>
            </div>
            <div className="sector-list">
              {scheduledItems.filter(i => i.type === 'hotel').length === 0 ? (
                <div className="sector-empty">Aún no se asignaron hoteles</div>
              ) : (
                scheduledItems.filter(i => i.type === 'hotel').map(item => {
                  const catalogItem = catalogItems.find(i => i.id === item.item_id);
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
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Transportes */}
          <div className="agenda-sector transport">
            <div className="sector-header">
              <Plane size={20} />
              <h3>Transportes</h3>
            </div>
            <div className="sector-list">
              {scheduledItems.filter(i => i.type === 'transport').length === 0 ? (
                <div className="sector-empty">Aún no se asignaron transportes</div>
              ) : (
                scheduledItems.filter(i => i.type === 'transport').map(item => {
                  const catalogItem = catalogItems.find(i => i.id === item.item_id);
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
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Excursiones */}
          <div className="agenda-sector excursion">
            <div className="sector-header">
              <MapPin size={20} />
              <h3>Excursiones</h3>
            </div>
            <div className="sector-list">
              {scheduledItems.filter(i => i.type === 'excursion').length === 0 ? (
                <div className="sector-empty">Aún no se asignaron excursiones</div>
              ) : (
                scheduledItems.filter(i => i.type === 'excursion').map(item => {
                  const catalogItem = catalogItems.find(i => i.id === item.item_id);
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
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {selectedItemForDetails && (
        <div className="modal-overlay" onClick={() => setSelectedItemForDetails(null)}>
          <div className="modal-content glass-card item-details-modal animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className={`item-modal-header ${selectedItemForDetails.type}`}>
              <div className="header-icon">
                {selectedItemForDetails.type === 'hotel' ? <Hotel size={24} /> : 
                 selectedItemForDetails.type === 'transport' ? <Plane size={24} /> : <MapPin size={24} />}
              </div>
              <div className="header-titles">
                <h3>{selectedItemForDetails.name}</h3>
                <p>{selectedItemForDetails.type.toUpperCase()}</p>
              </div>
              <button className="close-modal-btn white" onClick={() => setSelectedItemForDetails(null)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body p-4">
              <div className="detail-grid">
                <div className="detail-item">
                  <label>Fecha</label>
                  <p>{format(parseISO(selectedItemForDetails.date), 'dd/MM/yyyy')}</p>
                </div>
                <div className="detail-item">
                  <label>Horario</label>
                  <p>{selectedItemForDetails.time} HS</p>
                </div>
                {selectedItemForDetails.reservation_code && (
                  <div className="detail-item">
                    <label>Reserva</label>
                    <p className="fw-bold">{selectedItemForDetails.reservation_code}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

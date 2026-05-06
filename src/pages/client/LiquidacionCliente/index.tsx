/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { 
  Plane, 
  Hotel, 
  Map, 
  Bus, 
  Calculator,
  Download,
  CreditCard,
  User
} from 'lucide-react';
import jsPDF from 'jspdf';
import { supabase } from '../../../lib/supabase';
import logo from '../../../assets/logo.jpg';
import './LiquidacionCliente.css';

interface TaskItem {
  name: string;
  price: number;
  type?: string;
}

interface LiquidacionData {
  ticketsTotal: number;
  ticketsCount: number;
  hotelsTotal: number;
  hotelsList: TaskItem[];
  transportsTotal: number;
  transportsList: TaskItem[];
  excursionsTotal: number;
  excursionsList: TaskItem[];
  othersTotal: number;
  othersList: TaskItem[];
}

export default function LiquidacionClientePage() {
  const { clientId } = useOutletContext<{ clientId: string }>();
  const [clientName, setClientName] = useState('');
  const [data, setData] = useState<LiquidacionData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (clientId) {
      fetchClientInfo();
      fetchLiquidacionData();
    }
  }, [clientId]);

  const fetchClientInfo = async () => {
    const { data } = await supabase.from('clients').select('name').eq('id', clientId).single();
    if (data) setClientName(data.name);
  };

  const fetchLiquidacionData = async () => {
    setLoading(true);
    const { data: tickets } = await supabase.from('tickets').select('amount').eq('client_id', clientId);
    const ticketsTotal = (tickets || []).reduce((sum, t) => sum + (t.amount || 0), 0);

    const { data: scheduled } = await supabase.from('scheduled_items').select('*').eq('client_id', clientId);
    const itemIds = (scheduled || []).map(s => s.item_id).filter(id => !!id);
    const { data: catalogItems } = itemIds.length > 0 
      ? await supabase.from('catalog_items').select('id, cost_usd').in('id', itemIds)
      : { data: [] };

    const priceMap: Record<string, number> = {};
    (catalogItems || []).forEach(item => { priceMap[item.id] = item.cost_usd || 0; });

    const { data: billing } = await supabase.from('client_billing').select('tasks').eq('client_id', clientId).maybeSingle();
    const { data: serviceFees } = await supabase.from('services').select('name');
    const luciaFeeNames = (serviceFees || []).map(s => s.name.toLowerCase());

    const billingTasks: TaskItem[] = billing?.tasks || [];
    const hotels: TaskItem[] = [];
    const transports: TaskItem[] = [];
    const excursions: TaskItem[] = [];
    const others: TaskItem[] = [];

    (scheduled || []).forEach(item => {
      const price = priceMap[item.item_id] || 0;
      const taskItem = { name: item.name, price, type: item.type };
      if (item.type === 'hotel') hotels.push(taskItem);
      else if (item.type === 'transport') transports.push(taskItem);
      else if (item.type === 'excursion') excursions.push(taskItem);
    });

    billingTasks.forEach(task => {
      const taskNameLower = task.name.toLowerCase();
      if (luciaFeeNames.some(fee => taskNameLower.includes(fee))) return;
      const item = { name: task.name, price: task.price, type: task.type };
      if (taskNameLower.includes('[hotel]')) hotels.push(item);
      else if (taskNameLower.includes('[transport]')) transports.push(item);
      else if (taskNameLower.includes('[excursion]')) excursions.push(item);
      else others.push(item);
    });

    setData({
      ticketsTotal,
      ticketsCount: tickets?.length || 0,
      hotelsTotal: hotels.reduce((sum, i) => sum + i.price, 0),
      hotelsList: hotels,
      transportsTotal: transports.reduce((sum, i) => sum + i.price, 0),
      transportsList: transports,
      excursionsTotal: excursions.reduce((sum, i) => sum + i.price, 0),
      excursionsList: excursions,
      othersTotal: others.reduce((sum, i) => sum + i.price, 0),
      othersList: others
    });
    setLoading(false);
  };

  const totalTripCost = data ? (data.ticketsTotal + data.hotelsTotal + data.transportsTotal + data.excursionsTotal + data.othersTotal) : 0;

  const generateInvoicePDF = () => {
    if (!data) return;
    
    const doc = new jsPDF();
    const c = {
      deepBlue: [31, 58, 77],
      gold: [163, 124, 70],
      gray: [100, 116, 139],
      lightGray: [241, 245, 249],
      white: [255, 255, 255]
    };

    // Background
    doc.setFillColor(c.lightGray[0], c.lightGray[1], c.lightGray[2]);
    doc.rect(0, 0, 210, 297, 'F');

    // White Receipt Container
    doc.setFillColor(255, 255, 255);
    doc.rect(15, 15, 180, 267, 'F');

    // Header with Logo
    try {
      doc.addImage(logo, 'JPEG', 25, 20, 25, 25);
    } catch (e) {
      doc.setFillColor(c.deepBlue[0], c.deepBlue[1], c.deepBlue[2]);
      doc.roundedRect(25, 20, 25, 25, 3, 3, 'F');
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(24);
    doc.setTextColor(c.deepBlue[0], c.deepBlue[1], c.deepBlue[2]);
    doc.text("Travel Kit", 55, 32);
    
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(c.gray[0], c.gray[1], c.gray[2]);
    doc.text("LIQUIDACIÓN DE SERVICIOS", 55, 38);

    doc.setFontSize(9);
    doc.text("FECHA", 160, 30);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(c.deepBlue[0], c.deepBlue[1], c.deepBlue[2]);
    doc.text(new Date().toLocaleDateString(), 160, 35);

    // Client Info Box
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(25, 50, 160, 30, 3, 3, 'F');
    
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(c.gray[0], c.gray[1], c.gray[2]);
    doc.text("PASAJERO", 35, 60);
    
    doc.setFontSize(14);
    doc.setTextColor(c.deepBlue[0], c.deepBlue[1], c.deepBlue[2]);
    doc.text(clientName || '', 35, 68);
    
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text("TOTAL VIAJE", 140, 60);
    doc.setFontSize(18);
    doc.setTextColor(c.deepBlue[0], c.deepBlue[1], c.deepBlue[2]);
    doc.text(`USD ${totalTripCost.toLocaleString()}`, 140, 68);

    // Table Header
    let y = 95;
    doc.setDrawColor(c.lightGray[0], c.lightGray[1], c.lightGray[2]);
    doc.setLineWidth(0.5);
    doc.line(25, y, 185, y);
    
    doc.setFontSize(8);
    doc.setTextColor(c.gray[0], c.gray[1], c.gray[2]);
    doc.text("DESCRIPCIÓN DEL SERVICIO", 25, y - 3);
    doc.text("COSTO (USD)", 160, y - 3);

    const addRow = (label: string, price: number, isHeader = false) => {
      if (isHeader) {
        y += 12;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(c.deepBlue[0], c.deepBlue[1], c.deepBlue[2]);
        doc.text(label.toUpperCase(), 25, y);
        y += 4;
        doc.line(25, y, 185, y);
      } else {
        y += 10;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(c.deepBlue[0], c.deepBlue[1], c.deepBlue[2]);
        doc.text(label, 25, y);
        doc.setFont("helvetica", "bold");
        doc.text(`USD ${price.toLocaleString()}`, 160, y);
      }
    };

    if (data.ticketsTotal > 0) {
      addRow("Vuelos / Pasajes", 0, true);
      addRow(`Consolidado de tickets (${data.ticketsCount})`, data.ticketsTotal);
    }

    if (data.hotelsList.length > 0) {
      addRow("Alojamiento / Hotelería", 0, true);
      data.hotelsList.forEach(h => addRow(h.name, h.price));
    }

    if (data.transportsList.length > 0) {
      addRow("Transporte / Traslados", 0, true);
      data.transportsList.forEach(t => addRow(t.name, t.price));
    }

    if (data.excursionsList.length > 0) {
      addRow("Excursiones / Actividades", 0, true);
      data.excursionsList.forEach(e => addRow(e.name, e.price));
    }

    if (data.othersTotal > 0) {
      addRow("Otros Gastos Operativos", 0, true);
      data.othersList.forEach(o => addRow(o.name, o.price));
    }

    // Footer
    y = 250;
    doc.line(25, y, 185, y);
    doc.setFontSize(7);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(c.gray[0], c.gray[1], c.gray[2]);
    doc.text("* Valores expresados en dólares estadounidenses.", 25, y + 8);
    doc.text("* No incluye honorarios de gestión ni impuestos locales.", 25, y + 13);

    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(c.deepBlue[0], c.deepBlue[1], c.deepBlue[2]);
    doc.text("TOTAL FINAL", 140, y + 8);
    doc.setFontSize(18);
    doc.setTextColor(c.gold[0], c.gold[1], c.gold[2]);
    doc.text(`USD ${totalTripCost.toLocaleString()}`, 140, y + 18);

    doc.save(`Mi_Liquidacion_${clientName.replace(' ', '_')}.pdf`);
  };

  return (
    <div className="liquidacion-cliente-page animate-fade-in">
      <header className="page-header-centered" style={{ marginBottom: '3rem' }}>
        <h1 className="display-title">Mi Liquidación</h1>
        <p className="subtitle">Desglose transparente y profesional de los servicios contratados.</p>
      </header>

      {loading ? (
        <div className="liq-loader-premium">
          <div className="loader-premium"></div>
          <p>Preparando tu resumen de costos...</p>
        </div>
      ) : data ? (
        <div className="invoice-container-premium" style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <div className="invoice-receipt premium-shadow">
            <div className="premium-invoice-header">
              <div className="agency-brand">
                <img src={logo} alt="Travel Kit" style={{ width: '80px', height: '80px', borderRadius: '14px' }} />
                <div className="brand-text">
                  <h2>Travel Kit</h2>
                  <span>RESUMEN DE LIQUIDACIÓN</span>
                </div>
              </div>
              <button className="btn-download-premium" onClick={generateInvoicePDF}>
                <Download size={20} /> Descargar Itinerario & Costos
              </button>
            </div>

            <div className="premium-client-data">
              <div className="client-info-pro">
                <div className="label-wrap">
                  <User size={14} />
                  <span>CLIENTE REGISTRADO</span>
                </div>
                <h3>{clientName}</h3>
              </div>
              <div className="premium-total-badge">
                <span className="label">TOTAL ESTIMADO DEL VIAJE</span>
                <p className="value">USD {totalTripCost.toLocaleString()}</p>
              </div>
            </div>

            <div className="invoice-table-container">
              <table className="premium-receipt-table">
                <thead>
                  <tr>
                    <th>DESCRIPCIÓN DE LOS SERVICIOS</th>
                    <th style={{ textAlign: 'right' }}>VALOR (USD)</th>
                  </tr>
                </thead>
                <tbody>
                  {data.ticketsTotal > 0 && (
                    <>
                      <tr className="premium-category-row">
                        <td colSpan={2}><Plane size={20} /> Pasajes de Avión</td>
                      </tr>
                      <tr className="premium-service-row">
                        <td>Vuelos consolidados y tasas de emisión</td>
                        <td className="premium-price-cell">USD {data.ticketsTotal.toLocaleString()}</td>
                      </tr>
                    </>
                  )}
                  {data.hotelsList.length > 0 && (
                    <>
                      <tr className="premium-category-row">
                        <td colSpan={2}><Hotel size={20} /> Alojamiento y Estadías</td>
                      </tr>
                      {data.hotelsList.map((h, i) => (
                        <tr key={i} className="premium-service-row">
                          <td>{h.name}</td>
                          <td className="premium-price-cell">USD {h.price.toLocaleString()}</td>
                        </tr>
                      ))}
                    </>
                  )}
                  {data.transportsList.length > 0 && (
                    <>
                      <tr className="premium-category-row">
                        <td colSpan={2}><Bus size={20} /> Traslados y Movilidad</td>
                      </tr>
                      {data.transportsList.map((t, i) => (
                        <tr key={i} className="premium-service-row">
                          <td>{t.name}</td>
                          <td className="premium-price-cell">USD {t.price.toLocaleString()}</td>
                        </tr>
                      ))}
                    </>
                  )}
                  {data.excursionsList.length > 0 && (
                    <>
                      <tr className="premium-category-row">
                        <td colSpan={2}><Map size={20} /> Actividades en Destino</td>
                      </tr>
                      {data.excursionsList.map((e, i) => (
                        <tr key={i} className="premium-service-row">
                          <td>{e.name}</td>
                          <td className="premium-price-cell">USD {e.price.toLocaleString()}</td>
                        </tr>
                      ))}
                    </>
                  )}
                  {data.othersTotal > 0 && (
                    <>
                      <tr className="premium-category-row">
                        <td colSpan={2}><CreditCard size={20} /> Otros Servicios</td>
                      </tr>
                      {data.othersList.map((o, i) => (
                        <tr key={i} className="premium-service-row">
                          <td>{o.name}</td>
                          <td className="premium-price-cell">USD {o.price.toLocaleString()}</td>
                        </tr>
                      ))}
                    </>
                  )}
                </tbody>
              </table>
            </div>

            <div className="premium-invoice-footer">
              <div className="footer-notes">
                <p style={{ margin: 0, fontSize: '0.8rem', color: '#94a3b8', fontStyle: 'italic' }}>* Valores calculados en dólares estadounidenses (USD) vigentes a la fecha.</p>
              </div>
              <div className="footer-total-final-premium">
                <div className="label">MONTO FINAL A LIQUIDAR</div>
                <div className="value">USD {totalTripCost.toLocaleString()}</div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="liq-empty-state" style={{ textAlign: 'center', padding: '5rem' }}>
          <Calculator size={80} color="#94a3b8" />
          <h3 style={{ marginTop: '2rem', color: 'var(--color-primary)' }}>No hay datos disponibles</h3>
          <p style={{ color: '#94a3b8' }}>Tu liquidación aún se está procesando. Por favor, vuelve más tarde.</p>
        </div>
      )}
    </div>
  );
}

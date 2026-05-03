/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from 'react';
import { 
  Search, 
  ChevronRight, 
  Plane, 
  Hotel, 
  Map, 
  Bus, 
  Calculator,
  Download,
  CreditCard
} from 'lucide-react';
import jsPDF from 'jspdf';
import { supabase } from '../../../lib/supabase';
import logo from '../../../assets/logo.jpg';
import './Liquidacion.css';

interface Client {
  id: string;
  name: string;
  email?: string;
}

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

export default function LiquidacionPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [data, setData] = useState<LiquidacionData | null>(null);
  const [loadingData, setLoadingData] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchClients();
  }, []);

  useEffect(() => {
    if (selectedClientId) {
      fetchLiquidacionData(selectedClientId);
    }
  }, [selectedClientId]);

  const fetchClients = async () => {
    const { data } = await supabase.from('clients').select('*').order('name');
    setClients(data || []);
  };

  const fetchLiquidacionData = async (clientId: string) => {
    setLoadingData(true);
    
    // 1. Fetch Tickets
    const { data: tickets } = await supabase
      .from('tickets')
      .select('amount')
      .eq('client_id', clientId);
    
    const ticketsTotal = (tickets || []).reduce((sum, t) => sum + (t.amount || 0), 0);

    // 2. Fetch Scheduled Items for the client
    const { data: scheduled } = await supabase
      .from('scheduled_items')
      .select('*')
      .eq('client_id', clientId);
    
    // 3. Fetch Catalog Items to get prices
    const itemIds = (scheduled || []).map(s => s.item_id).filter(id => !!id);
    const { data: catalogItems } = itemIds.length > 0 
      ? await supabase.from('catalog_items').select('id, cost_usd').in('id', itemIds)
      : { data: [] };

    // Create a price map for quick lookup
    const priceMap: Record<string, number> = {};
    (catalogItems || []).forEach(item => {
      priceMap[item.id] = item.cost_usd || 0;
    });

    // 4. Fetch Billing Tasks
    const { data: billing } = await supabase
      .from('client_billing')
      .select('tasks')
      .eq('client_id', clientId)
      .maybeSingle();
    
    // 5. Fetch Service Fee IDs (Lucia's fees) to exclude them
    const { data: serviceFees } = await supabase.from('services').select('name');
    const luciaFeeNames = (serviceFees || []).map(s => s.name.toLowerCase());

    const billingTasks: TaskItem[] = billing?.tasks || [];
    
    // Categorize
    const hotels: TaskItem[] = [];
    const transports: TaskItem[] = [];
    const excursions: TaskItem[] = [];
    const others: TaskItem[] = [];

    // Process Scheduled Items (Source 1)
    (scheduled || []).forEach(item => {
      const price = priceMap[item.item_id] || 0;
      const taskItem: TaskItem = { name: item.name, price, type: item.type };
      
      if (item.type === 'hotel') hotels.push(taskItem);
      else if (item.type === 'transport') transports.push(taskItem);
      else if (item.type === 'excursion') excursions.push(taskItem);
    });

    // Process Billing Tasks (Source 2)
    billingTasks.forEach(task => {
      const taskNameLower = task.name.toLowerCase();
      if (luciaFeeNames.some(fee => taskNameLower.includes(fee))) return;

      const item: TaskItem = { name: task.name, price: task.price, type: task.type };

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

    setLoadingData(false);
  };

  const generateInvoicePDF = () => {
    if (!data || !selectedClientId) return;
    const client = clients.find(c => c.id === selectedClientId);
    
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
    doc.text(client?.name || '', 35, 68);
    
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(c.gray[0], c.gray[1], c.gray[2]);
    doc.text(client?.email || '', 35, 73);

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

    doc.save(`Liquidacion_${client?.name.replace(' ', '_')}.pdf`);
  };

  const filteredClients = clients.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()));
  const totalTripCost = data ? (data.ticketsTotal + data.hotelsTotal + data.transportsTotal + data.excursionsTotal + data.othersTotal) : 0;

  return (
    <div className="liquidacion-page animate-fade-in">
      <div className="liq-main-grid">
        {/* Sidebar: Client Selection */}
        <aside className="liq-sidebar">
          <div className="search-box-premium">
            <Search size={20} />
            <input 
              type="text" 
              placeholder="Buscar cliente..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="clients-list-premium">
            {filteredClients.map(client => (
              <div 
                key={client.id}
                className={`client-item-premium ${selectedClientId === client.id ? 'active' : ''}`}
                onClick={() => setSelectedClientId(client.id)}
              >
                <div className="client-info-main">
                  <div className="client-avatar-mini">
                    {client.name.charAt(0)}
                  </div>
                  <div className="client-text-liq">
                    <h4>{client.name}</h4>
                    <p>{client.email || 'Sin email'}</p>
                  </div>
                </div>
                <ChevronRight size={18} opacity={0.5} />
              </div>
            ))}
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="liq-content">
          {!selectedClientId ? (
            <div className="liq-empty-state animate-fade-in">
              <Calculator size={80} strokeWidth={1} color="#B7C5CF" />
              <h3>Selecciona un cliente</h3>
              <p>Elige un pasajero de la lista para ver el desglose completo de costos de su viaje.</p>
            </div>
          ) : loadingData ? (
            <div className="liq-loader-container">
              <div className="liq-loader-spinner"></div>
              <p>Generando liquidación...</p>
            </div>
          ) : data ? (
            <div className="invoice-container animate-slide-up">
              <div className="invoice-receipt">
                <div className="invoice-header">
                  <div className="agency-brand">
                    <img src={logo} alt="Travel Kit" className="brand-logo-large" />
                    <div className="brand-text">
                      <h2>Travel Kit</h2>
                      <span>Liquidación de Servicios</span>
                    </div>
                  </div>
                  <div className="invoice-meta">
                    <span className="meta-label">Fecha</span>
                    <span className="meta-value">{new Date().toLocaleDateString()}</span>
                    <button className="btn-download-receipt" onClick={generateInvoicePDF}>
                      <Download size={16} /> Descargar PDF
                    </button>
                  </div>
                </div>

                <div className="invoice-client-section">
                  <div className="client-data-box">
                    <span className="box-label">PASAJERO</span>
                    <h3>{clients.find(c => c.id === selectedClientId)?.name}</h3>
                    <p>{clients.find(c => c.id === selectedClientId)?.email}</p>
                  </div>
                  <div className="invoice-total-summary">
                    <span className="total-label">TOTAL VIAJE</span>
                    <h2 className="total-value">USD {totalTripCost.toLocaleString()}</h2>
                  </div>
                </div>

                <div className="invoice-table-wrapper">
                  <table className="receipt-table">
                    <thead>
                      <tr>
                        <th>Descripción del Servicio</th>
                        <th className="text-right">Costo Neto (USD)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* Vuelos */}
                      {data.ticketsTotal > 0 && (
                        <tr className="category-header">
                          <td colSpan={2}>
                            <Plane size={14} /> Vuelos / Pasajes
                          </td>
                        </tr>
                      )}
                      {data.ticketsTotal > 0 && (
                        <tr className="service-row">
                          <td>Consolidado de tickets cargados ({data.ticketsCount})</td>
                          <td className="text-right">USD {data.ticketsTotal.toLocaleString()}</td>
                        </tr>
                      )}

                      {/* Hoteles */}
                      {data.hotelsList.length > 0 && (
                        <tr className="category-header">
                          <td colSpan={2}>
                            <Hotel size={14} /> Alojamiento / Hotelería
                          </td>
                        </tr>
                      )}
                      {data.hotelsList.map((h, i) => (
                        <tr key={`h-${i}`} className="service-row">
                          <td>{h.name}</td>
                          <td className="text-right">USD {h.price.toLocaleString()}</td>
                        </tr>
                      ))}

                      {/* Transporte */}
                      {data.transportsList.length > 0 && (
                        <tr className="category-header">
                          <td colSpan={2}>
                            <Bus size={14} /> Transporte / Traslados
                          </td>
                        </tr>
                      )}
                      {data.transportsList.map((t, i) => (
                        <tr key={`t-${i}`} className="service-row">
                          <td>{t.name}</td>
                          <td className="text-right">USD {t.price.toLocaleString()}</td>
                        </tr>
                      ))}

                      {/* Excursiones */}
                      {data.excursionsList.length > 0 && (
                        <tr className="category-header">
                          <td colSpan={2}>
                            <Map size={14} /> Excursiones / Actividades
                          </td>
                        </tr>
                      )}
                      {data.excursionsList.map((e, i) => (
                        <tr key={`e-${i}`} className="service-row">
                          <td>{e.name}</td>
                          <td className="text-right">USD {e.price.toLocaleString()}</td>
                        </tr>
                      ))}

                      {/* Otros */}
                      {data.othersList.length > 0 && (
                        <tr className="category-header">
                          <td colSpan={2}>
                            <CreditCard size={14} /> Otros Gastos Operativos
                          </td>
                        </tr>
                      )}
                      {data.othersList.map((o, i) => (
                        <tr key={`o-${i}`} className="service-row">
                          <td>{o.name}</td>
                          <td className="text-right">USD {o.price.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="invoice-footer">
                  <div className="footer-notes">
                    <p>* Valores expresados en dólares estadounidenses.</p>
                    <p>* No incluye honorarios de gestión ni impuestos locales.</p>
                  </div>
                  <div className="footer-total-final">
                    <div className="final-label">TOTAL FINAL</div>
                    <div className="final-value">USD {totalTripCost.toLocaleString()}</div>
                  </div>
                </div>
                
                <div className="receipt-cut-line"></div>
              </div>
            </div>
          ) : null}
        </main>
      </div>
    </div>
  );
}

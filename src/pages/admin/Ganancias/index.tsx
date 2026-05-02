/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from 'react';
import { 
  DollarSign, 
  TrendingUp, 
  Users, 
  Calendar, 
  ChevronRight, 
  ArrowUpRight, 
  ArrowDownRight,
  PieChart,
  BarChart3,
  Download
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import './Ganancias.css';

export default function GananciasPage() {
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('este-mes');
  const [stats, setStats] = useState<any[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);

  useEffect(() => {
    fetchFinancialData();
  }, []);

  const fetchFinancialData = async () => {
    setLoading(true);
    
    // 1. Fetch Billing for Total Income
    const { data: billingData } = await supabase.from('client_billing').select('tasks');
    let totalIncome = 0;
    (billingData || []).forEach(b => {
      if (b.tasks && Array.isArray(b.tasks)) {
        b.tasks.forEach((t: any) => {
          totalIncome += Number(t.price) || 0;
        });
      }
    });

    // 2. Fetch Meetings
    const { data: meetingsData } = await supabase.from('admin_meetings').select('*').eq('status', 'confirmed');
    const sessionsCount = meetingsData?.length || 0;

    // 3. Fetch Clients
    const { data: clientsData } = await supabase.from('clients').select('id, name, created_at').order('created_at', { ascending: false });
    const clientsCount = clientsData?.length || 0;

    // 4. Update Stats
    setStats([
      { label: 'Ingresos Totales', value: `$${totalIncome.toLocaleString('es-AR')}`, change: '+12.5%', isUp: true, icon: DollarSign },
      { label: 'Sesiones Realizadas', value: sessionsCount.toString(), change: '+8%', isUp: true, icon: Calendar },
      { label: 'Clientes Nuevos', value: clientsCount.toString(), change: '+2%', isUp: true, icon: Users },
      { label: 'Tasa de Conversión', value: '64%', change: '+5%', isUp: true, icon: TrendingUp },
    ]);

    // 5. Build Recent Transactions (from billing + clients)
    // For simplicity, we'll just show the latest clients as "transactions" or we could fetch billing join clients
    // Let's just use the latest 5 clients for now as a mock for recently active billing
    const transactions = (clientsData || []).slice(0, 5).map(c => ({
      id: c.id,
      client: c.name,
      service: 'Planificación de Viaje',
      amount: '$15.000', // This would ideally come from the billing table
      date: new Date(c.created_at).toLocaleDateString(),
      status: 'completado'
    }));
    setRecentTransactions(transactions);

    setLoading(false);
  };

  return (
    <div className="ganancias-page animate-fade-in">
      <header className="page-header-centered">
        <h1>Resumen Financiero</h1>
        <p>Visualiza tus ingresos proyectados y confirmados para tener un control total de tu rentabilidad.</p>
      </header>

      {loading ? (
        <div className="p-5 text-center">
          <div className="loader-premium"></div>
          <p className="mt-3">Calculando estados financieros...</p>
        </div>
      ) : (
        <>
          <div className="ganancias-header mb-4">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="period-selector">
                <button className={`period-btn ${period === 'este-mes' ? 'active' : ''}`} onClick={() => setPeriod('este-mes')}>Este Mes</button>
                <button className={`period-btn ${period === 'ultimo-trimestre' ? 'active' : ''}`} onClick={() => setPeriod('ultimo-trimestre')}>Último Trimestre</button>
                <button className={`period-btn ${period === 'este-año' ? 'active' : ''}`} onClick={() => setPeriod('este-año')}>Este Año</button>
              </div>
              <button className="btn btn-outline btn-sm">
                <Download size={16} /> Exportar Reporte
              </button>
            </div>
          </div>

          <div className="stats-grid">
            {stats.map((stat, i) => (
              <div key={i} className="stat-card glass-card">
                <div className="stat-icon-wrapper">
                  <stat.icon size={24} />
                </div>
                <div className="stat-content">
                  <span className="stat-label">{stat.label}</span>
                  <div className="stat-value-row">
                    <span className="stat-value">{stat.value}</span>
                    <span className={`stat-change ${stat.isUp ? 'up' : 'down'}`}>
                      {stat.isUp ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                      {stat.change}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="ganancias-main-grid">
            <div className="glass-card main-chart-card">
              <div className="card-header border-bottom">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3><BarChart3 size={20} className="text-primary" /> Rendimiento de Ingresos</h3>
                  <select className="form-input-sm">
                    <option>Mensual</option>
                    <option>Semanal</option>
                  </select>
                </div>
              </div>
              <div className="card-body chart-placeholder">
                <div className="mock-chart">
                  {[40, 65, 45, 80, 55, 90, 70].map((h, i) => (
                    <div key={i} className="chart-bar-wrapper">
                      <div className="chart-bar" style={{ height: `${h}%` }}>
                        <div className="bar-tooltip">${(h * 150).toLocaleString()}</div>
                      </div>
                      <span className="bar-label">S{i+1}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="glass-card secondary-chart-card">
              <div className="card-header border-bottom">
                <h3><PieChart size={20} className="text-primary" /> Distribución por Servicio</h3>
              </div>
              <div className="card-body pie-placeholder">
                <div className="mock-pie">
                  <div className="pie-slice slice-1"></div>
                  <div className="pie-slice slice-2"></div>
                  <div className="pie-slice slice-3"></div>
                  <div className="pie-center">
                    <span className="pie-total">100%</span>
                  </div>
                </div>
                <div className="pie-legend">
                  <div className="legend-item"><span className="dot slice-1"></span> Sesiones (45%)</div>
                  <div className="legend-item"><span className="dot slice-2"></span> Planificación (35%)</div>
                  <div className="legend-item"><span className="dot slice-3"></span> Otros (20%)</div>
                </div>
              </div>
            </div>
          </div>

          <div className="glass-card transactions-card mt-4">
            <div className="card-header border-bottom">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3>Actividad Reciente</h3>
                <button className="btn-link">Ver todas <ChevronRight size={16} /></button>
              </div>
            </div>
            <div className="card-body p-0">
              <table className="transactions-table">
                <thead>
                  <tr>
                    <th>Cliente</th>
                    <th>Servicio</th>
                    <th>Fecha</th>
                    <th>Monto Estimado</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {recentTransactions.map(tx => (
                    <tr key={tx.id}>
                      <td>
                        <div className="td-client">
                          <div className="client-avatar-sm">{tx.client.charAt(0)}</div>
                          {tx.client}
                        </div>
                      </td>
                      <td>{tx.service}</td>
                      <td>{tx.date}</td>
                      <td className="fw-bold">{tx.amount}</td>
                      <td>
                        <span className={`status-pill ${tx.status}`}>{tx.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

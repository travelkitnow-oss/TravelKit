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
  Download,
  X
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import './Ganancias.css';

export default function GananciasPage() {
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('este-mes');
  const [stats, setStats] = useState<any[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [pieData, setPieData] = useState<any[]>([]);

  useEffect(() => {
    fetchFinancialData();
  }, []);

  const fetchFinancialData = async () => {
    setLoading(true);
    
    // 1. Fetch Billing and join with Clients
    const { data: billingData } = await supabase
      .from('client_billing')
      .select('tasks, client_id, clients(name)');

    let totalIncome = 0;
    const confirmedTransactions: any[] = [];
    const revenueByMonth: { [key: string]: number } = {};
    const revenueByService: { [key: string]: number } = {};

    (billingData || []).forEach(b => {
      if (b.tasks && Array.isArray(b.tasks)) {
        b.tasks.forEach((t: any, idx: number) => {
          if (t.paid) {
            const amount = Math.abs(Number(t.price) || 0);
            totalIncome += amount;
            
            const paidDate = t.paidAt ? new Date(t.paidAt) : new Date(t.date);
            const monthKey = paidDate.toLocaleString('es-AR', { month: 'short' });
            revenueByMonth[monthKey] = (revenueByMonth[monthKey] || 0) + amount;
            
            // For pie chart, clean up names or use categories
            const serviceName = t.name.split('] ').pop() || t.name;
            revenueByService[serviceName] = (revenueByService[serviceName] || 0) + amount;

            confirmedTransactions.push({
              id: `${b.client_id}-${idx}`,
              clientId: b.client_id,
              taskIndex: idx,
              client: (b.clients as any)?.name || 'Cliente desconocido',
              service: t.name,
              amount: `$${amount.toLocaleString('es-AR')}`,
              numericAmount: amount,
              date: paidDate.toLocaleDateString(),
              status: 'completado',
              timestamp: paidDate.getTime()
            });
          }
        });
      }
    });

    // Sort transactions by date (newest first)
    confirmedTransactions.sort((a, b) => b.timestamp - a.timestamp);

    // 2. Fetch Meetings
    const { data: meetingsData } = await supabase.from('admin_meetings').select('*').eq('status', 'confirmed');
    const sessionsCount = meetingsData?.length || 0;

    // 3. Fetch Clients
    const { data: clientsData } = await supabase.from('clients').select('id, name, created_at').order('created_at', { ascending: false });
    const clientsCount = clientsData?.length || 0;

    // 4. Update Stats
    setStats([
      { label: 'Ingresos Cobrados', value: `$${totalIncome.toLocaleString('es-AR')}`, change: '+12.5%', isUp: true, icon: DollarSign },
      { label: 'Sesiones Realizadas', value: sessionsCount.toString(), change: '+8%', isUp: true, icon: Calendar },
      { label: 'Clientes Nuevos', value: clientsCount.toString(), change: '+2%', isUp: true, icon: Users },
      { label: 'Tasa de Conversión', value: '64%', change: '+5%', isUp: true, icon: TrendingUp },
    ]);

    // 5. Update Recent Transactions
    setRecentTransactions(confirmedTransactions.slice(0, 10));

    // 6. Set Chart Data
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const currentMonthIdx = new Date().getMonth();
    const last6Months = [];
    for (let i = 5; i >= 0; i--) {
      const idx = (currentMonthIdx - i + 12) % 12;
      const m = months[idx];
      last6Months.push({ label: m, value: revenueByMonth[m] || 0 });
    }
    setChartData(last6Months);

    // 7. Set Pie Data
    const sortedServices = Object.entries(revenueByService)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    const totalForPie = sortedServices.reduce((sum, s) => sum + s[1], 0);
    setPieData(sortedServices.map(([name, val]) => ({
      name,
      value: val,
      percent: totalForPie > 0 ? Math.round((val / totalIncome) * 100) : 0
    })));

    setLoading(false);
  };

  const handleDeleteActivity = async (tx: any) => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar este registro de cobro? El servicio volverá a estar pendiente de pago.')) return;

    try {
      // 1. Fetch current billing data to get the latest tasks array
      const { data: billing, error: fetchError } = await supabase
        .from('client_billing')
        .select('tasks')
        .eq('client_id', tx.clientId)
        .single();

      if (fetchError || !billing) throw new Error('No se pudo encontrar la cuenta del cliente');

      const tasks = [...(billing.tasks as any[])];
      const task = tasks[tx.taskIndex];

      if (task) {
        // If it was a "payment-record" OR a session charge that was duplicated, we remove it entirely
        if (task.serviceId === 'payment-record' || task.name.includes('Sesión Inicial')) {
          tasks.splice(tx.taskIndex, 1);
        } else {
          // If it was a regular service marked as paid, we mark it as unpaid
          tasks[tx.taskIndex] = {
            ...task,
            paid: false,
            paidAt: null,
            completed: false
          };
        }

        // 2. Update Supabase
        const { error: updateError } = await supabase
          .from('client_billing')
          .update({ tasks })
          .eq('client_id', tx.clientId);

        if (updateError) throw updateError;

        // 3. Refresh data
        fetchFinancialData();
      }
    } catch (error: any) {
      console.error('Error deleting activity:', error);
      alert('Error al eliminar la actividad: ' + error.message);
    }
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
                  {chartData.map((d, i) => {
                    const maxVal = Math.max(...chartData.map(cd => cd.value), 1000);
                    const height = (d.value / maxVal) * 100;
                    return (
                      <div key={i} className="chart-bar-wrapper">
                        <div className="chart-bar" style={{ height: `${Math.max(height, 5)}%` }}>
                          <div className="bar-tooltip">${d.value.toLocaleString()}</div>
                        </div>
                        <span className="bar-label">{d.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="glass-card secondary-chart-card">
              <div className="card-header border-bottom">
                <h3><PieChart size={20} className="text-primary" /> Distribución por Servicio</h3>
              </div>
              <div className="card-body pie-placeholder">
                <div className="mock-pie">
                  {pieData.map((d, i) => (
                    <div key={i} className={`pie-slice slice-${i+1}`} style={{ transform: `rotate(${pieData.slice(0, i).reduce((sum, p) => sum + (p.percent * 3.6), 0)}deg)`, clipPath: `polygon(50% 50%, 50% 0%, ${d.percent > 50 ? '100% 0%, 100% 100%, 0% 100%, 0% 0%,' : ''} 100% 0%)` }}></div>
                  ))}
                  <div className="pie-center">
                    <span className="pie-total">100%</span>
                  </div>
                </div>
                <div className="pie-legend">
                  {pieData.length > 0 ? pieData.map((d, i) => (
                    <div key={i} className="legend-item"><span className={`dot slice-${i+1}`}></span> {d.name} ({d.percent}%)</div>
                  )) : (
                    <div className="legend-item" style={{ opacity: 0.5 }}>Sin datos de servicios</div>
                  )}
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
                    <th>Monto Cobrado</th>
                    <th>Estado</th>
                    <th>Acciones</th>
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
                      <td>
                        <button 
                          className="btn-icon-sm" 
                          style={{ color: '#ef4444', background: 'rgba(239, 68, 68, 0.1)', border: 'none', borderRadius: '6px', padding: '4px', cursor: 'pointer' }}
                          onClick={() => handleDeleteActivity(tx)}
                          title="Eliminar registro"
                        >
                          <X size={14} />
                        </button>
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

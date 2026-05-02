import { Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import AdminLayout from './pages/admin/Layout/AdminLayout';
import AgendaPage from './pages/admin/Agenda';
import ConsultasPage from './pages/admin/Consultas';
import FormularioPage from './pages/admin/Formulario';
import GananciasPage from './pages/admin/Ganancias';
import ClientesPage from './pages/admin/Clientes';
import ConfiguracionPage from './pages/admin/Configuracion';
import CostosPage from './pages/admin/Costos';
import TareasPage from './pages/admin/Tareas';
import ExcursionesPage from './pages/admin/Excursiones';
import TransportesPage from './pages/admin/Transportes';
import HotelesPage from './pages/admin/Hoteles';
import AgendaClientesPage from './pages/admin/AgendaClientes';
import './App.css';

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      
      {/* Admin Routes */}
      <Route element={<AdminLayout />}>
        <Route path="/mi-agenda" element={<AgendaPage />} />
        <Route path="/consultas" element={<ConsultasPage />} />
        <Route path="/clientes" element={<ClientesPage />} />
        <Route path="/agenda-clientes" element={<AgendaClientesPage />} />
        <Route path="/formulario" element={<FormularioPage />} />
        <Route path="/tareas" element={<TareasPage />} />
        <Route path="/excursiones" element={<ExcursionesPage />} />
        <Route path="/transportes" element={<TransportesPage />} />
        <Route path="/hoteles" element={<HotelesPage />} />
        <Route path="/costos" element={<CostosPage />} />
        <Route path="/ganancias" element={<GananciasPage />} />
        <Route path="/configuracion" element={<ConfiguracionPage />} />
        
        {/* Redirect from old dashboard or just to default */}
        <Route path="/dashboard" element={<Navigate to="/mi-agenda" replace />} />
      </Route>
      
      {/* Catch all to landing */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;

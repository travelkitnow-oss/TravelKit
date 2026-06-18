import { Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import AdminLayout from './pages/admin/Layout/AdminLayout';
import AgendaPage from './pages/admin/Agenda';
import ConsultasPage from './pages/admin/Consultas';
import FormularioPage from './pages/admin/Formulario';
import GananciasPage from './pages/admin/Ganancias';
import ClientesPage from './pages/admin/Clientes';
import AdminConfigPage from './pages/admin/Configuracion';
import CostosPage from './pages/admin/Costos';
import TareasPage from './pages/admin/Tareas';
import ExcursionesPage from './pages/admin/Excursiones';
import TransportesPage from './pages/admin/Transportes';
import HotelesPage from './pages/admin/Hoteles';
import PasajesPage from './pages/admin/Pasajes';
import AgendaClientesPage from './pages/admin/AgendaClientes';
import LiquidacionPage from './pages/admin/Liquidacion';
import EditarPrincipal from './pages/admin/EditarPrincipal';
import ViajeIdealPage from './pages/admin/ViajeIdeal';
import RespuestasViajeIdealPage from './pages/admin/RespuestasViajeIdeal';
import GestionUsuariosPage from './pages/admin/GestionUsuarios';
import ResenasPage from './pages/admin/Resenas';
import DestinosPage from './pages/admin/Destinos';
import DatosBancariosPage from './pages/admin/DatosBancarios';
import ClientLayout from './pages/client/Layout/ClientLayout';
import LiquidacionClientePage from './pages/client/LiquidacionCliente';
import AgendaViajePage from './pages/client/AgendaViaje';
import ClientConfigPage from './pages/client/Configuracion';
import EncuestaViajePage from './pages/client/EncuestaViaje';
import ResenaViajePage from './pages/client/ResenaViaje';
import ServiciosContratadosPage from './pages/client/ServiciosContratados';
import HistorialViajesAdminPage from './pages/admin/HistorialViajes';
import HistorialViajesClientePage from './pages/client/HistorialViajes';
import LogsPage from './pages/admin/Logs';
import CampanasPage from './pages/admin/Campanas';
import NavigationLogger from './components/NavigationLogger';
import './App.css';

function App() {
  return (
    <>
      <NavigationLogger />
      <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      
      {/* Admin Routes */}
      <Route element={<AdminLayout />}>
        <Route path="/pasajes" element={<PasajesPage />} />
        <Route path="/mi-agenda" element={<AgendaPage />} />
        <Route path="/consultas" element={<ConsultasPage />} />
        <Route path="/clientes" element={<ClientesPage />} />
        <Route path="/agenda-clientes" element={<AgendaClientesPage />} />
        <Route path="/formulario" element={<FormularioPage />} />
        <Route path="/editar-principal" element={<EditarPrincipal />} />
        <Route path="/tareas" element={<TareasPage />} />
        <Route path="/excursiones" element={<ExcursionesPage />} />
        <Route path="/transportes" element={<TransportesPage />} />
        <Route path="/hoteles" element={<HotelesPage />} />
        <Route path="/costos" element={<CostosPage />} />
        <Route path="/ganancias" element={<GananciasPage />} />
        <Route path="/liquidacion" element={<LiquidacionPage />} />
        <Route path="/viaje-ideal" element={<ViajeIdealPage />} />
        <Route path="/respuestas-viaje-ideal" element={<RespuestasViajeIdealPage />} />
        <Route path="/resenas" element={<ResenasPage />} />
        <Route path="/destinos" element={<DestinosPage />} />
        <Route path="/datos-bancarios" element={<DatosBancariosPage />} />
        <Route path="/historial" element={<HistorialViajesAdminPage />} />
        <Route path="/gestion-usuarios" element={<GestionUsuariosPage />} />
        <Route path="/logs" element={<LogsPage />} />
        <Route path="/campanas" element={<CampanasPage />} />
        <Route path="/configuracion" element={<AdminConfigPage />} />
        
        {/* Redirect from old dashboard or just to default */}
        <Route path="/dashboard" element={<Navigate to="/mi-agenda" replace />} />
      </Route>

      {/* Client Portal Routes */}
      <Route path="/portal" element={<ClientLayout />}>
        <Route index element={<Navigate to="/portal/agenda" replace />} />
        <Route path="agenda" element={<AgendaViajePage />} />
        <Route path="liquidacion" element={<LiquidacionClientePage />} />
        <Route path="encuesta" element={<EncuestaViajePage />} />
        <Route path="servicios" element={<ServiciosContratadosPage />} />
        <Route path="resena" element={<ResenaViajePage />} />
        <Route path="historial" element={<HistorialViajesClientePage />} />
        <Route path="configuracion" element={<ClientConfigPage />} />
      </Route>
      
      {/* Catch all to landing */}
      <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

export default App;

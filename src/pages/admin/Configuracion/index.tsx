import './Configuracion.css';

export default function ConfiguracionPage() {
  return (
    <div className="config-page animate-fade-in">
      <header className="page-header-centered">
        <h1>Configuración del Sistema</h1>
        <p>Personaliza los parámetros de tu plataforma y gestiona tus preferencias de usuario.</p>
      </header>

      <div className="glass-card">
        <div className="card-header border-bottom">
          <h3>Ajustes Generales</h3>
          <p className="text-secondary text-sm">Gestiona la configuración de tu cuenta y preferencias de la plataforma.</p>
        </div>
        <div className="card-body">
          <div className="settings-grid">
            <div className="settings-section">
              <h4>Horarios de Trabajo</h4>
              <p className="text-secondary text-sm mb-4">Define en qué franjas horarias estás disponible para recibir sesiones.</p>
              
              <div className="work-hours-list">
                {['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'].map(day => (
                  <div key={day} className="day-row">
                    <span className="day-name">{day}</span>
                    <div className="hours-inputs">
                      <input type="time" defaultValue="08:00" className="time-input" />
                      <span>a</span>
                      <input type="time" defaultValue="19:00" className="time-input" />
                    </div>
                    <label className="switch">
                      <input type="checkbox" defaultChecked />
                      <span className="slider round"></span>
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div className="settings-section">
              <h4>Notificaciones</h4>
              <div className="checkbox-group">
                <label className="checkbox-item">
                  <input type="checkbox" defaultChecked />
                  <span>Notificar nuevas consultas por email</span>
                </label>
                <label className="checkbox-item">
                  <input type="checkbox" defaultChecked />
                  <span>Recordatorio de sesiones 1h antes</span>
                </label>
                <label className="checkbox-item">
                  <input type="checkbox" />
                  <span>Resumen semanal de ganancias</span>
                </label>
              </div>
            </div>
          </div>
          
          <div className="card-footer mt-5 border-top pt-4">
            <button className="btn btn-primary">Guardar Cambios</button>
          </div>
        </div>
      </div>
    </div>
  );
}

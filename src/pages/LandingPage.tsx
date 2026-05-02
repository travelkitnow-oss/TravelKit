import Navbar from '../components/Navbar';
import Hero from '../components/Hero';
import Calendar from '../components/Calendar';
import { Plane, CalendarCheck, Shield } from 'lucide-react';
import '../App.css';

export default function LandingPage() {
  return (
    <div className="app">
      <Navbar />
      
      <main>
        <Hero />
        
        <section id="servicios" className="section-padding bg-light">
          <div className="container">
            <div className="section-header text-center animate-fade-in">
              <h2>Por qué elegir Travel Kit</h2>
              <p className="subtitle">Nos encargamos de todo para que tu única tarea sea armar las valijas y disfrutar.</p>
            </div>
            
            <div className="features-grid">
              <div className="feature-card">
                <div className="feature-icon">
                  <Plane size={32} />
                </div>
                <h3>Itinerarios a medida</h3>
                <p>Diseñamos rutas personalizadas basadas en tus gustos, presupuesto y ritmo de viaje preferido.</p>
              </div>
              
              <div className="feature-card">
                <div className="feature-icon">
                  <CalendarCheck size={32} />
                </div>
                <h3>Gestión de reservas</h3>
                <p>Nos ocupamos de vuelos, alojamientos y excursiones, encontrando siempre las mejores opciones del mercado.</p>
              </div>
              
              <div className="feature-card">
                <div className="feature-icon">
                  <Shield size={32} />
                </div>
                <h3>Asistencia en viaje</h3>
                <p>Viaja con tranquilidad. Estaremos disponibles para resolver cualquier imprevisto durante tu aventura.</p>
              </div>
            </div>
          </div>
        </section>
        
        <section id="sesion" className="section-padding">
          <div className="container session-container">
            <div className="session-content">
              <h2>Comienza a planear tu próximo viaje</h2>
              <p className="subtitle" style={{ marginBottom: '2rem' }}>
                Agenda una sesión inicial de 1 hora con nosotros. Como si fuera una sesión de psicólogo, pero para descubrir tus sueños viajeros y hacerlos realidad.
              </p>
              
              <ul className="benefits-list">
                <li>
                  <div className="benefit-dot"></div>
                  <span>Hablaremos sobre tus destinos soñados</span>
                </li>
                <li>
                  <div className="benefit-dot"></div>
                  <span>Definiremos tu estilo de viaje ideal</span>
                </li>
                <li>
                  <div className="benefit-dot"></div>
                  <span>Estableceremos un presupuesto estimado</span>
                </li>
                <li>
                  <div className="benefit-dot"></div>
                  <span>Esquematizaremos los primeros pasos</span>
                </li>
              </ul>
              
              <div className="testimonial glass">
                <p>"La sesión inicial con Travel Kit fue reveladora. Me ayudaron a decidir entre dos destinos y organizaron todo a la perfección."</p>
                <div className="testimonial-author">
                  <strong>María G.</strong> - Viaje a Europa 2023
                </div>
              </div>
            </div>
            
            <div className="session-calendar">
              <Calendar />
            </div>
          </div>
        </section>
      </main>
      
      <footer className="footer">
        <div className="container footer-container">
          <div className="footer-brand">
            <h3>Travel Kit</h3>
            <p>Diseñando viajes inolvidables a medida.</p>
          </div>
          <div className="footer-links">
            <a href="#inicio">Inicio</a>
            <a href="#servicios">Servicios</a>
            <a href="#sesion">Agendar Sesión</a>
          </div>
        </div>
        <div className="footer-bottom">
          <p>&copy; {new Date().getFullYear()} Travel Kit. Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  );
}

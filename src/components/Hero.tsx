import { ArrowRight, Compass, Headphones, MessagesSquare } from 'lucide-react';
import { useSiteSettings } from '../hooks/useSiteSettings';
import './Hero.css';

const HERO_IMAGE = 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?q=80&w=2074&auto=format&fit=crop';

export default function Hero() {
  const { settings } = useSiteSettings();

  return (
    <section id="inicio" className="hero">
      <div className="hero-media" aria-hidden="true">
        <img src={HERO_IMAGE} alt="" className="hero-media-img" />
        <div className="hero-media-overlay" />
      </div>

      <div className="container hero-container">
        <div className="landing-hero-content animate-fade-in">
          <span className="hero-eyebrow">Agencia de viajes a medida</span>

          <div
            className="hero-title-wrapper"
            role="heading"
            aria-level={1}
            dangerouslySetInnerHTML={{ __html: settings.hero_title.replace('Travel Kit', '<span class="text-accent">Travel Kit</span>') }}
          />

          <div
            className="hero-description"
            dangerouslySetInnerHTML={{ __html: settings.hero_description }}
          />

          <div className="hero-actions">
            <a href="#sesion" className="btn btn-accent btn-lg">
              Agendar sesión inicial <ArrowRight size={18} />
            </a>
            <a href="#servicios" className="btn btn-ghost-light btn-lg">
              Conocé nuestros servicios
            </a>
          </div>
        </div>
      </div>

      <div className="hero-trust">
        <div className="container hero-trust-grid">
          <div className="trust-item">
            <MessagesSquare size={20} />
            <div>
              <strong>Sesiones 1 a 1</strong>
              <span>Planificación personalizada</span>
            </div>
          </div>
          <div className="trust-item">
            <Compass size={20} />
            <div>
              <strong>Itinerarios a medida</strong>
              <span>Según tu ritmo y presupuesto</span>
            </div>
          </div>
          <div className="trust-item">
            <Headphones size={20} />
            <div>
              <strong>Asistencia en viaje</strong>
              <span>Te acompañamos en cada etapa</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

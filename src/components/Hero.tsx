import { ArrowRight, MapPin, Plane } from 'lucide-react';
import { useSiteSettings } from '../hooks/useSiteSettings';
import './Hero.css';

export default function Hero() {
  const { settings } = useSiteSettings();

  return (
    <section id="inicio" className="hero">
      <div className="hero-background">
        <div className="blob blob-1"></div>
        <div className="blob blob-2"></div>
      </div>
      
      <div className="container hero-container">
        <div className="landing-hero-content animate-fade-in">
          <div className="badge">
            <Plane size={16} />
            <span>Diseña tu viaje soñado</span>
          </div>
          
          <div className="hero-title-wrapper" dangerouslySetInnerHTML={{ __html: settings.hero_title.replace('Travel Kit', '<span class="text-accent">Travel Kit</span>') }} />
          
          <div 
            className="hero-description" 
            dangerouslySetInnerHTML={{ __html: settings.hero_description }} 
          />
          
          <div className="hero-actions">
            <a href="#sesion" className="btn btn-accent btn-lg">
              Empezar ahora <ArrowRight size={20} />
            </a>
            <a href="#servicios" className="btn btn-outline btn-lg">
              Conoce más
            </a>
          </div>
          
          <div className="hero-stats">
            <div className="stat">
              <span className="stat-number">100+</span>
              <span className="stat-label">Viajes organizados</span>
            </div>
            <div className="stat-divider"></div>
            <div className="stat">
              <span className="stat-number">24/7</span>
              <span className="stat-label">Soporte continuo</span>
            </div>
          </div>
        </div>
        
        <div className="hero-image-wrapper animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <div className="hero-image-glass">
            <div className="destination-card destination-1">
              <MapPin size={20} color="var(--color-accent)" />
              <div>
                <h4>París, Francia</h4>
                <p>Planificado hace 2 días</p>
              </div>
            </div>
            
            <div className="destination-card destination-2">
              <MapPin size={20} color="var(--color-accent)" />
              <div>
                <h4>Tokio, Japón</h4>
                <p>Próximo destino</p>
              </div>
            </div>
            
            <img 
              src="https://images.unsplash.com/photo-1436491865332-7a61a109cc05?q=80&w=2074&auto=format&fit=crop" 
              alt="Avión volando" 
              className="main-hero-image"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

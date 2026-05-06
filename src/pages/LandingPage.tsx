import Navbar from '../components/Navbar';
import Hero from '../components/Hero';
import Calendar from '../components/Calendar';
import { Plane, CalendarCheck, Shield, Star, MapPin, Heart, Compass, ChevronLeft, ChevronRight } from 'lucide-react';
import { useSiteSettings } from '../hooks/useSiteSettings';
import { useRef, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import '../App.css';

const ICON_MAP: Record<string, any> = {
  Plane, CalendarCheck, Shield, Star, MapPin, Heart, Compass
};

export default function LandingPage() {
  const { settings } = useSiteSettings();
  const trackRef = useRef<HTMLDivElement>(null);
  
  const [reviews, setReviews] = useState<any[]>([]);
  const [currentReviewIndex, setCurrentReviewIndex] = useState(0);

  const [destinations, setDestinations] = useState<any[]>([]);
  const [currentDestIndex, setCurrentDestIndex] = useState(0);

  useEffect(() => {
    const fetchReviews = async () => {
      const { data } = await supabase
        .from('client_reviews')
        .select('*, clients(name)')
        .not('comment', 'is', null)
        .neq('comment', '')
        .not('is_public', 'is', false)
        .order('created_at', { ascending: false })
        .limit(10);
        
      if (data && data.length > 0) {
        setReviews(data);
      }
    };
    fetchReviews();

    const fetchDestinations = async () => {
      const { data } = await supabase
        .from('client_destinations')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      if (data) {
        setDestinations(data);
      }
    };
    fetchDestinations();
  }, []);

  useEffect(() => {
    if (reviews.length <= 1) return;
    
    const interval = setInterval(() => {
      setCurrentReviewIndex(prev => (prev + 1) % reviews.length);
    }, 3000);
    
    return () => clearInterval(interval);
  }, [reviews]);

  useEffect(() => {
    if (destinations.length <= 1) return;
    
    const interval = setInterval(() => {
      setCurrentDestIndex(prev => (prev + 1) % destinations.length);
    }, 5000);
    
    return () => clearInterval(interval);
  }, [destinations]);
  
  let benefits = [];
  try {
    benefits = JSON.parse(settings.benefits_list || '[]');
  } catch (e) {
    console.error('Error parsing benefits list:', e);
  }

  const scrollCarousel = (direction: 'left' | 'right') => {
    if (trackRef.current) {
      const track = trackRef.current;
      const scrollAmount = track.clientWidth; // Scroll one full view width
      
      if (direction === 'right') {
        // If we are at the end, loop back to start
        if (track.scrollLeft + track.clientWidth >= track.scrollWidth - 10) {
          track.scrollTo({ left: 0, behavior: 'smooth' });
        } else {
          track.scrollBy({ left: scrollAmount, behavior: 'smooth' });
        }
      } else {
        // If we are at the start, loop to end
        if (track.scrollLeft <= 10) {
          track.scrollTo({ left: track.scrollWidth, behavior: 'smooth' });
        } else {
          track.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
        }
      }
    }
  };

  return (
    <div className="app">
      <Navbar />
      
      <main>
        <Hero />
        
        <section id="servicios" className="section-padding bg-light">
          <div className="container">
            <div className="section-header text-center animate-fade-in">
              <h2 dangerouslySetInnerHTML={{ __html: settings.services_title }} />
              <div className="subtitle" dangerouslySetInnerHTML={{ __html: settings.services_subtitle }} />
            </div>
            
            <div className="benefits-carousel-wrapper">
              <button className="carousel-arrow left" onClick={() => scrollCarousel('left')}>
                <ChevronLeft size={24} />
              </button>
              
              <div className="benefits-track" ref={trackRef}>
                {benefits.map((benefit: any) => {
                  const Icon = ICON_MAP[benefit.icon] || Star;
                  return (
                    <div key={benefit.id} className="feature-card carousel-card">
                      <div className="feature-icon">
                        <Icon size={32} />
                      </div>
                      <h3 dangerouslySetInnerHTML={{ __html: benefit.title }} />
                      <div dangerouslySetInnerHTML={{ __html: benefit.description }} />
                    </div>
                  );
                })}
              </div>

              <button className="carousel-arrow right" onClick={() => scrollCarousel('right')}>
                <ChevronRight size={24} />
              </button>
            </div>
          </div>
        </section>

        {destinations.length > 0 && (
          <section id="destinos" className="section-padding" style={{ backgroundColor: 'var(--color-primary)', color: 'white' }}>
            <div className="container">
              <div className="text-center animate-fade-in" style={{ marginBottom: '3rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <h2 
                  style={{ color: 'var(--color-accent)', fontFamily: "'Playfair Display', serif", fontSize: '2.5rem', marginBottom: '1rem' }}
                  dangerouslySetInnerHTML={{ __html: settings.destinations_title || 'Inspiración para tu próximo viaje' }}
                />
                <div 
                  className="subtitle" 
                  style={{ color: '#e2e8f0', maxWidth: '600px', margin: '0 auto' }}
                  dangerouslySetInnerHTML={{ __html: settings.destinations_subtitle || 'Descubre algunos de los destinos que hemos preparado para nuestros viajeros.' }}
                />
              </div>

              <div className="destination-carousel-container" style={{ maxWidth: '1000px', margin: '0 auto' }}>
                <div className="destination-showcase" style={{ position: 'relative', borderRadius: '24px', overflow: 'hidden', height: '550px', width: '100%', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}>
                  {destinations.map((dest, index) => (
                    <div 
                      key={dest.id}
                      className="destination-slide"
                      style={{
                        position: 'absolute',
                        top: 0, left: 0, width: '100%', height: '100%',
                        opacity: index === currentDestIndex ? 1 : 0,
                        transition: 'opacity 1s ease-in-out',
                        zIndex: index === currentDestIndex ? 1 : 0
                      }}
                    >
                      <img 
                        src={dest.image_url} 
                        alt={dest.title} 
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                        onError={(e) => (e.currentTarget.src = 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&q=80&w=1200')}
                      />
                      <div style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', padding: '6rem 3rem 2rem', background: 'linear-gradient(to top, rgba(0,0,0,0.95), rgba(0,0,0,0.4), transparent)', color: 'white' }}>
                        <h3 style={{ fontSize: '2.5rem', fontFamily: "'Playfair Display', serif", marginBottom: '0.5rem', color: 'white', textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}>{dest.title}</h3>
                        <p style={{ 
                          fontSize: '1.15rem', 
                          maxWidth: '850px', 
                          opacity: 0.95,
                          textShadow: '1px 1px 3px rgba(0,0,0,0.8)',
                          wordBreak: 'break-word',
                          display: '-webkit-box',
                          WebkitLineClamp: 3,
                          lineClamp: 3,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden'
                        }}>{dest.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
                
                {destinations.length > 1 && (
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem', marginTop: '1.5rem' }}>
                    {destinations.map((_, idx) => (
                      <button 
                        key={idx}
                        onClick={() => setCurrentDestIndex(idx)}
                        style={{
                          width: '12px', height: '12px', borderRadius: '50%', border: 'none', cursor: 'pointer',
                          backgroundColor: idx === currentDestIndex ? 'var(--color-accent)' : 'rgba(255,255,255,0.3)',
                          transition: 'background-color 0.3s',
                          padding: 0
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>
        )}
        
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
              
              <div className="testimonial glass animate-fade-in" key={currentReviewIndex}>
                {reviews.length > 0 ? (
                  <>
                    <p>"{reviews[currentReviewIndex].comment}"</p>
                    <div className="testimonial-author">
                      <strong>{reviews[currentReviewIndex].clients?.name || 'Cliente'}</strong> 
                      {reviews[currentReviewIndex].pax && ` - ${reviews[currentReviewIndex].pax} persona${reviews[currentReviewIndex].pax > 1 ? 's' : ''}`}
                      {reviews[currentReviewIndex].destination && ` - ${reviews[currentReviewIndex].destination}`}
                      <span style={{ color: '#C89B5A', marginLeft: '6px' }}>
                        {'★'.repeat(reviews[currentReviewIndex].rating)}{'☆'.repeat(5 - reviews[currentReviewIndex].rating)}
                      </span>
                    </div>
                  </>
                ) : (
                  <>
                    <p>"La sesión inicial con Travel Kit fue reveladora. Me ayudaron a decidir entre dos destinos y organizaron todo a la perfección."</p>
                    <div className="testimonial-author">
                      <strong>María G.</strong> - Viaje a Europa 2023
                    </div>
                  </>
                )}
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

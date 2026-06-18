import Navbar from '../components/Navbar';
import Hero from '../components/Hero';
import Calendar from '../components/Calendar';
import DownloadAppBanner from '../components/DownloadAppBanner';
import { Plane, CalendarCheck, Shield, Star, MapPin, Heart, Compass, ChevronLeft, ChevronRight, X, Megaphone } from 'lucide-react';
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

  const [showPopupAd, setShowPopupAd] = useState(false);

  useEffect(() => {
    if (settings.popup_ad_enabled === 'true') {
      const alreadyShown = sessionStorage.getItem('travelkit_popup_ad_shown');
      if (alreadyShown !== 'true') {
        const timer = setTimeout(() => {
          setShowPopupAd(true);
        }, 1200);
        return () => clearTimeout(timer);
      }
    }
  }, [settings.popup_ad_enabled]);

  const handleClosePopupAd = () => {
    setShowPopupAd(false);
    sessionStorage.setItem('travelkit_popup_ad_shown', 'true');
  };

  const [destinations, setDestinations] = useState<any[]>([]);
  const [currentDestIndex, setCurrentDestIndex] = useState(0);
  const [selectedDestination, setSelectedDestination] = useState<any | null>(null);
  const [currentModalImgIndex, setCurrentModalImgIndex] = useState(0);

  const [meetings, setMeetings] = useState<any[]>([]);
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

    const fetchMeetings = async () => {
      const { data } = await supabase
        .from('admin_meetings')
        .select('*')
        .neq('status', 'cancelled');
      if (data) setMeetings(data.map(m => ({
        date: m.meeting_date,
        time: m.meeting_time,
        status: m.status
      })));
    };
    fetchMeetings();

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

  useEffect(() => {
    if (!selectedDestination) {
      setCurrentModalImgIndex(0);
      return;
    }
    
    const allImages = [selectedDestination.image_url, ...(selectedDestination.images || [])];
    if (allImages.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentModalImgIndex(prev => (prev + 1) % allImages.length);
    }, 7000);

    return () => clearInterval(interval);
  }, [selectedDestination]);
  
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
      <DownloadAppBanner />
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
              <div className="text-center animate-fade-in" style={{ marginBottom: '3rem', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                <h2 
                  style={{ color: 'var(--color-accent)', fontFamily: "'Playfair Display', serif", fontSize: '2.5rem', marginBottom: '1rem', width: '100%' }}
                  dangerouslySetInnerHTML={{ __html: settings.destinations_title || 'Inspiración para tu próximo viaje' }}
                />
                <div 
                  className="subtitle" 
                  style={{ color: '#e2e8f0', maxWidth: '800px', margin: '0 auto', width: '100%' }}
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
                        visibility: index === currentDestIndex ? 'visible' : 'hidden',
                        transition: 'opacity 1s ease-in-out, visibility 1s',
                        zIndex: index === currentDestIndex ? 1 : 0
                      }}
                    >
                      <div
                        onClick={() => setSelectedDestination(dest)}
                        style={{ width: '100%', height: '100%', cursor: 'pointer', position: 'relative' }}
                      >
                        <img 
                          src={dest.image_url} 
                          alt={dest.title} 
                          style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.5s' }} 
                          className="destination-img-hover"
                          onError={(e) => (e.currentTarget.src = 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&q=80&w=1200')}
                        />
                        <div style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', padding: '6rem 3rem 2rem', background: 'linear-gradient(to top, rgba(0,0,0,0.95), rgba(0,0,0,0.4), transparent)', color: 'white', pointerEvents: 'none' }}>
                          <h3 style={{ fontSize: '2.5rem', fontFamily: "'Playfair Display', serif", marginBottom: '0.5rem', color: 'white', textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}>{dest.title}</h3>
                          <div 
                            style={{ 
                              fontSize: '1.15rem', 
                              maxWidth: '850px', 
                              opacity: 0.95,
                              textShadow: '1px 1px 3px rgba(0,0,0,0.8)',
                              wordBreak: 'break-word',
                              display: '-webkit-box',
                              WebkitLineClamp: 1,
                              lineClamp: 1,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden'
                            }}
                            dangerouslySetInnerHTML={{ __html: dest.description }}
                          />
                        </div>
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

        {/* Premium Destination Modal */}
        {selectedDestination && (
          <div className="modal-overlay" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }} onClick={() => setSelectedDestination(null)}>
            <div 
              className="glass-card animate-scale-in" 
              style={{ 
                width: '95%', 
                maxWidth: '800px', 
                maxHeight: '90vh', 
                overflowY: 'auto', 
                display: 'flex', 
                flexDirection: 'column', 
                position: 'relative',
                borderRadius: '24px',
                border: '1px solid rgba(255,255,255,0.2)',
                boxShadow: '0 50px 100px -20px rgba(0,0,0,0.7)',
                backgroundColor: '#1f3a4d',
                backdropFilter: 'blur(20px)'
              }} 
              onClick={e => e.stopPropagation()}
            >
              <button 
                onClick={() => setSelectedDestination(null)}
                style={{ position: 'absolute', top: '20px', right: '20px', background: 'rgba(0,0,0,0.5)', border: 'none', color: 'white', cursor: 'pointer', zIndex: 10, padding: '8px', borderRadius: '50%', display: 'flex' }}
              >
                <X size={24} />
              </button>

              {(() => {
                const allImages = [selectedDestination.image_url, ...(selectedDestination.images || [])].filter(url => url && url.trim() !== '');
                
                return (
                  <div style={{ width: '100%', height: '450px', minHeight: '450px', position: 'relative', overflow: 'hidden', backgroundColor: '#1a2a36' }}>
                    {allImages.map((img, idx) => (
                      <img 
                        key={idx}
                        src={img} 
                        alt={`${selectedDestination.title} ${idx + 1}`} 
                        style={{ 
                          position: 'absolute',
                          top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover',
                          opacity: idx === currentModalImgIndex ? 1 : 0,
                          transition: 'opacity 0.8s ease-in-out',
                          zIndex: idx === currentModalImgIndex ? 2 : 1
                        }}
                        onError={(e) => (e.currentTarget.src = 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&q=80&w=1200')}
                      />
                    ))}
                    
                    {allImages.length > 1 && (
                      <>
                        <button 
                          className="carousel-arrow left" 
                          style={{ left: '20px', width: '40px', height: '40px', zIndex: 10, background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(5px)' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setCurrentModalImgIndex(prev => (prev - 1 + allImages.length) % allImages.length);
                          }}
                        >
                          <ChevronLeft size={20} />
                        </button>
                        <button 
                          className="carousel-arrow right" 
                          style={{ right: '20px', width: '40px', height: '40px', zIndex: 10, background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(5px)' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setCurrentModalImgIndex(prev => (prev + 1) % allImages.length);
                          }}
                        >
                          <ChevronRight size={20} />
                        </button>
                        
                        <div style={{ position: 'absolute', bottom: '40px', left: '0', width: '100%', display: 'flex', justifyContent: 'center', gap: '8px', zIndex: 10 }}>
                          {allImages.map((_, idx) => (
                            <div 
                              key={idx}
                              style={{ 
                                width: '8px', height: '8px', borderRadius: '50%', 
                                backgroundColor: idx === currentModalImgIndex ? 'var(--color-accent)' : 'rgba(255,255,255,0.3)',
                                transition: 'background-color 0.3s'
                              }}
                            />
                          ))}
                        </div>
                      </>
                    )}
                    <div style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: '100px', background: 'linear-gradient(to top, #1f3a4d, transparent)', zIndex: 3 }}></div>
                  </div>
                );
              })()}

              <div style={{ padding: '3rem', color: 'white', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                <div style={{ textAlign: 'center' }}>
                  <span style={{ color: 'var(--color-accent)', fontWeight: 'bold', letterSpacing: '3px', fontSize: '0.9rem', textTransform: 'uppercase' }}>Destino Destacado</span>
                  <h3 style={{ fontSize: '3.5rem', fontFamily: "'Playfair Display', serif", marginTop: '1rem', color: 'white', lineHeight: '1.1' }}>{selectedDestination.title}</h3>
                  <div style={{ width: '80px', height: '4px', backgroundColor: 'var(--color-accent)', margin: '2rem auto' }}></div>
                </div>
                
                <div 
                  className="rich-text-content"
                  style={{ 
                    fontSize: '1.25rem', 
                    opacity: 0.95, 
                    color: '#f8fafc',
                    textAlign: 'left',
                    fontFamily: 'inherit'
                  }} 
                  dangerouslySetInnerHTML={{ __html: selectedDestination.description }} 
                />

                <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'center' }}>
                  <button 
                    className="btn-primary" 
                    onClick={() => {
                      document.getElementById('sesion')?.scrollIntoView({ behavior: 'smooth' });
                      setSelectedDestination(null);
                    }}
                    style={{ minWidth: '300px', padding: '1.2rem 2.5rem', fontSize: '1.1rem' }}
                  >
                    Llená tu formulario
                  </button>
                </div>
              </div>
            </div>
          </div>
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
              <Calendar reservations={meetings} />
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

      {/* Promotional Popup Modal */}
      {showPopupAd && (
        <div className="modal-overlay animate-fade-in" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000 }} onClick={handleClosePopupAd}>
          <div
            className="glass-card animate-scale-in"
            style={{
              width: '90%',
              maxWidth: '500px',
              backgroundColor: 'white',
              borderRadius: '24px',
              overflow: 'hidden',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              border: '1px solid rgba(255, 255, 255, 0.4)',
              color: '#1f3a4d',
              position: 'relative'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={handleClosePopupAd}
              style={{
                position: 'absolute',
                top: '14px',
                right: '14px',
                background: 'none',
                border: 'none',
                color: '#ef4444',
                cursor: 'pointer',
                zIndex: 10,
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: 0.85,
                transition: 'opacity 0.2s, transform 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = '1';
                e.currentTarget.style.transform = 'scale(1.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = '0.85';
                e.currentTarget.style.transform = 'scale(1)';
              }}
              aria-label="Cerrar"
            >
              <X size={22} />
            </button>

            {/* Ad Image */}
            {settings.popup_ad_image ? (
              <div style={{ width: '100%', height: '220px', overflow: 'hidden', backgroundColor: '#f1f5f9', borderRadius: '24px 24px 0 0' }}>
                <img
                  src={settings.popup_ad_image}
                  alt={settings.popup_ad_title || 'Publicidad'}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </div>
                        ) : (
              <div style={{ width: '100%', height: '120px', background: 'linear-gradient(135deg, #1f3a4d 0%, #294c63 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', borderRadius: '24px 24px 0 0' }}>
                <Megaphone size={40} style={{ opacity: 0.8 }} />
              </div>
            )}

            {/* Content */}
            <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <h3 style={{
                fontSize: '1.5rem',
                fontWeight: 800,
                color: '#1f3a4d',
                margin: 0,
                fontFamily: "'Outfit', sans-serif",
                lineHeight: '1.3'
              }}>
                {settings.popup_ad_title}
              </h3>
              
              <p style={{
                fontSize: '0.95rem',
                color: '#64748b',
                lineHeight: '1.6',
                margin: 0,
                whiteSpace: 'pre-wrap'
              }}>
                {settings.popup_ad_description}
              </p>

              <button
                className="btn btn-primary"
                onClick={() => {
                  handleClosePopupAd();
                  document.getElementById('sesion')?.scrollIntoView({ behavior: 'smooth' });
                }}
                style={{
                  marginTop: '1rem',
                  padding: '0.85rem',
                  borderRadius: '12px',
                  fontWeight: 600,
                  fontSize: '1rem',
                  fontFamily: "'Outfit', sans-serif",
                  boxShadow: '0 4px 12px rgba(31, 58, 77, 0.15)'
                }}
              >
                ¡Quiero más información!
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

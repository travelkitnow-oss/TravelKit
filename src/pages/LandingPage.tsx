import Navbar from '../components/Navbar';
import Hero from '../components/Hero';
import Calendar from '../components/Calendar';
import DownloadAppBanner from '../components/DownloadAppBanner';
import { Plane, CalendarCheck, Shield, Star, MapPin, Heart, Compass, ChevronLeft, ChevronRight, X, Megaphone, ArrowRight, Check, Quote } from 'lucide-react';
import { useSiteSettings } from '../hooks/useSiteSettings';
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { db } from '../lib/db';
import '../App.css';

const ICON_MAP: Record<string, any> = {
  Plane, CalendarCheck, Shield, Star, MapPin, Heart, Compass
};

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&q=80&w=1200';

const PROCESS_STEPS = [
  { title: 'Sesión inicial', description: 'Una hora para conocer tus destinos soñados, tu estilo de viaje y el presupuesto que tenés en mente.' },
  { title: 'Diseño del itinerario', description: 'Armamos una propuesta a medida y nos ocupamos de vuelos, alojamientos, traslados y excursiones.' },
  { title: 'Viajá tranquilo', description: 'Recibís tu agenda completa en el portal y contás con asistencia durante todo el viaje.' },
];

const SESSION_BENEFITS = [
  'Hablaremos sobre tus destinos soñados',
  'Definiremos tu estilo de viaje ideal',
  'Estableceremos un presupuesto estimado',
  'Esquematizaremos los primeros pasos',
];

export default function LandingPage() {
  const { settings } = useSiteSettings();

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
      const { data } = await db
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
      const { data } = await db
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
      const { data } = await db
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
    }, 6000);

    return () => clearInterval(interval);
  }, [reviews]);

  useEffect(() => {
    if (destinations.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentDestIndex(prev => (prev + 1) % destinations.length);
    }, 6000);

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

  const currentReview = reviews[currentReviewIndex];

  return (
    <div className="app">
      <DownloadAppBanner />
      <Navbar />

      <main>
        <Hero />

        {/* ─── Servicios ─── */}
        <section id="servicios" className="section-padding section-light">
          <div className="container">
            <div className="section-header text-center animate-fade-in">
              <span className="eyebrow">Servicios</span>
              <h2 dangerouslySetInnerHTML={{ __html: settings.services_title }} />
              <div className="subtitle" dangerouslySetInnerHTML={{ __html: settings.services_subtitle }} />
            </div>

            <div className="features-grid">
              {benefits.map((benefit: any) => {
                const Icon = ICON_MAP[benefit.icon] || Star;
                return (
                  <article key={benefit.id} className="feature-card">
                    <div className="feature-icon">
                      <Icon size={22} strokeWidth={1.75} />
                    </div>
                    <h3 dangerouslySetInnerHTML={{ __html: benefit.title }} />
                    <div className="feature-text" dangerouslySetInnerHTML={{ __html: benefit.description }} />
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        {/* ─── Proceso ─── */}
        <section id="proceso" className="section-padding section-warm">
          <div className="container">
            <div className="process-layout">
              <div className="process-intro">
                <span className="eyebrow">Cómo trabajamos</span>
                <h2>Del primer sueño a la valija lista, en tres pasos</h2>
                <p className="subtitle">
                  Un proceso simple y acompañado, para que solo te ocupes de disfrutar el destino.
                </p>
                <a href="#sesion" className="btn btn-primary">
                  Empezar ahora <ArrowRight size={16} />
                </a>
              </div>

              <ol className="process-steps">
                {PROCESS_STEPS.map((step, idx) => (
                  <li key={step.title} className="process-step">
                    <span className="process-number">{String(idx + 1).padStart(2, '0')}</span>
                    <div>
                      <h3>{step.title}</h3>
                      <p>{step.description}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>

        {/* ─── Destinos ─── */}
        {destinations.length > 0 && (
          <section id="destinos" className="section-padding section-dark">
            <div className="container">
              <div className="section-header text-center animate-fade-in">
                <span className="eyebrow eyebrow-light">Destinos</span>
                <h2 dangerouslySetInnerHTML={{ __html: settings.destinations_title || 'Inspiración para tu próximo viaje' }} />
                <div
                  className="subtitle"
                  dangerouslySetInnerHTML={{ __html: settings.destinations_subtitle || 'Descubre algunos de los destinos que hemos preparado para nuestros viajeros.' }}
                />
              </div>

              <div className="destination-carousel-container">
                <div className="destination-showcase">
                  {destinations.map((dest, index) => (
                    <button
                      type="button"
                      key={dest.id}
                      className={`destination-slide ${index === currentDestIndex ? 'is-active' : ''}`}
                      onClick={() => setSelectedDestination(dest)}
                      aria-label={`Ver destino ${dest.title}`}
                      tabIndex={index === currentDestIndex ? 0 : -1}
                    >
                      <img
                        src={dest.image_url}
                        alt=""
                        className="destination-img"
                        loading="lazy"
                        onError={(e) => (e.currentTarget.src = FALLBACK_IMAGE)}
                      />
                      <div className="destination-caption">
                        <span className="destination-tag">Destino destacado</span>
                        <h3>{dest.title}</h3>
                        <div className="destination-excerpt" dangerouslySetInnerHTML={{ __html: dest.description }} />
                        <span className="destination-more">Ver detalles <ArrowRight size={16} /></span>
                      </div>
                    </button>
                  ))}
                </div>

                {destinations.length > 1 && (
                  <div className="destination-dots">
                    {destinations.map((dest, idx) => (
                      <button
                        key={idx}
                        onClick={() => setCurrentDestIndex(idx)}
                        className={`destination-dot ${idx === currentDestIndex ? 'is-active' : ''}`}
                        aria-label={`Mostrar ${dest.title}`}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* Modal de destino */}
        {selectedDestination && (
          <div className="modal-overlay" onClick={() => setSelectedDestination(null)}>
            <div className="glass-card destination-modal animate-scale-in" onClick={e => e.stopPropagation()}>
              <button
                className="destination-modal-close"
                onClick={() => setSelectedDestination(null)}
                aria-label="Cerrar"
              >
                <X size={20} />
              </button>

              {(() => {
                const allImages = [selectedDestination.image_url, ...(selectedDestination.images || [])].filter(url => url && url.trim() !== '');

                return (
                  <div className="destination-modal-media">
                    {allImages.map((img, idx) => (
                      <img
                        key={idx}
                        src={img}
                        alt={`${selectedDestination.title} ${idx + 1}`}
                        className={idx === currentModalImgIndex ? 'is-active' : ''}
                        onError={(e) => (e.currentTarget.src = FALLBACK_IMAGE)}
                      />
                    ))}

                    {allImages.length > 1 && (
                      <>
                        <button
                          className="modal-arrow left"
                          aria-label="Imagen anterior"
                          onClick={(e) => {
                            e.stopPropagation();
                            setCurrentModalImgIndex(prev => (prev - 1 + allImages.length) % allImages.length);
                          }}
                        >
                          <ChevronLeft size={20} />
                        </button>
                        <button
                          className="modal-arrow right"
                          aria-label="Imagen siguiente"
                          onClick={(e) => {
                            e.stopPropagation();
                            setCurrentModalImgIndex(prev => (prev + 1) % allImages.length);
                          }}
                        >
                          <ChevronRight size={20} />
                        </button>

                        <div className="modal-dots">
                          {allImages.map((_, idx) => (
                            <span key={idx} className={idx === currentModalImgIndex ? 'is-active' : ''} />
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                );
              })()}

              <div className="destination-modal-body">
                <span className="eyebrow">Destino destacado</span>
                <h3>{selectedDestination.title}</h3>

                <div
                  className="rich-text-content"
                  dangerouslySetInnerHTML={{ __html: selectedDestination.description }}
                />

                <button
                  className="btn btn-accent btn-lg"
                  onClick={() => {
                    document.getElementById('sesion')?.scrollIntoView({ behavior: 'smooth' });
                    setSelectedDestination(null);
                  }}
                >
                  Quiero viajar ahí <ArrowRight size={18} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ─── Sesión ─── */}
        <section id="sesion" className="section-padding">
          <div className="container session-container">
            <div className="session-content">
              <span className="eyebrow">Sesión inicial</span>
              <h2>Comenzá a planear tu próximo viaje</h2>
              <p className="subtitle">
                Agendá una sesión inicial de 1 hora con nosotros. Como si fuera una sesión de psicólogo, pero para descubrir tus sueños viajeros y hacerlos realidad.
              </p>

              <ul className="benefits-list">
                {SESSION_BENEFITS.map(item => (
                  <li key={item}>
                    <span className="benefit-check"><Check size={14} strokeWidth={2.5} /></span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>

              <figure className="testimonial animate-fade-in" key={currentReviewIndex}>
                <Quote size={22} className="testimonial-quote" />
                {currentReview ? (
                  <>
                    <blockquote>{currentReview.comment}</blockquote>
                    <figcaption className="testimonial-author">
                      <span className="testimonial-stars" aria-label={`${currentReview.rating} de 5 estrellas`}>
                        {'★'.repeat(currentReview.rating)}{'☆'.repeat(5 - currentReview.rating)}
                      </span>
                      <strong>{currentReview.clients?.name || 'Cliente'}</strong>
                      {currentReview.pax && <span> · {currentReview.pax} persona{currentReview.pax > 1 ? 's' : ''}</span>}
                      {currentReview.destination && <span> · {currentReview.destination}</span>}
                    </figcaption>
                  </>
                ) : (
                  <>
                    <blockquote>La sesión inicial con Travel Kit fue reveladora. Me ayudaron a decidir entre dos destinos y organizaron todo a la perfección.</blockquote>
                    <figcaption className="testimonial-author">
                      <strong>María G.</strong> <span>· Viaje a Europa 2023</span>
                    </figcaption>
                  </>
                )}
              </figure>
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
            <div className="footer-logo">
              <img src="/travel-kit-logo.jpg" alt="" />
              <h3>Travel Kit</h3>
            </div>
            <p>Diseñando viajes inolvidables a medida.</p>
          </div>
          <nav className="footer-col" aria-label="Secciones">
            <h4>Explorar</h4>
            <a href="#inicio">Inicio</a>
            <a href="#servicios">Servicios</a>
            <a href="#proceso">Cómo trabajamos</a>
            <a href="#sesion">Agendar sesión</a>
          </nav>
          <div className="footer-col">
            <h4>Clientes</h4>
            <Link to="/login">Portal del viajero</Link>
            <a href="#sesion">Reservar sesión inicial</a>
          </div>
        </div>
        <div className="container footer-bottom">
          <p>&copy; {new Date().getFullYear()} Travel Kit. Todos los derechos reservados.</p>
        </div>
      </footer>

      {/* Popup promocional */}
      {showPopupAd && (
        <div className="modal-overlay animate-fade-in" style={{ zIndex: 10000 }} onClick={handleClosePopupAd}>
          <div className="glass-card popup-ad animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <button onClick={handleClosePopupAd} className="popup-ad-close" aria-label="Cerrar">
              <X size={18} />
            </button>

            {settings.popup_ad_image ? (
              <div className="popup-ad-media">
                <img src={settings.popup_ad_image} alt={settings.popup_ad_title || 'Publicidad'} />
              </div>
            ) : (
              <div className="popup-ad-media popup-ad-placeholder">
                <Megaphone size={36} />
              </div>
            )}

            <div className="popup-ad-body">
              <h3>{settings.popup_ad_title}</h3>
              <p>{settings.popup_ad_description}</p>
              <button
                className="btn btn-primary btn-lg"
                onClick={() => {
                  handleClosePopupAd();
                  document.getElementById('sesion')?.scrollIntoView({ behavior: 'smooth' });
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

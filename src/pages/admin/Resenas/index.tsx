import { useState, useEffect } from 'react';
import { Star, MessageSquare, User, Eye, EyeOff, Trash2 } from 'lucide-react';
import { db } from '../../../lib/db';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import './Resenas.css';

import PageHeader from '../../../components/PageHeader/PageHeader';
import SearchBar from '../../../components/SearchBar/SearchBar';
interface Review {
  id: string;
  client_id: string;
  rating: number;
  comment: string;
  destination: string;
  pax: string;
  is_public: boolean;
  created_at: string;
  clients: {
    name: string;
  };
}

export default function ResenasPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRating, setFilterRating] = useState<number | 'all'>('all');

  useEffect(() => {
    fetchReviews();
  }, []);

  const fetchReviews = async () => {
    setLoading(true);
    const { data, error } = await db
      .from('client_reviews')
      .select(`
        *,
        clients (
          name
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching reviews:', error);
    } else {
      // Set default true for old reviews that don't have is_public defined yet
      const mappedReviews = (data || []).map(r => ({
        ...r,
        is_public: r.is_public !== false
      }));
      setReviews(mappedReviews);
    }
    setLoading(false);
  };

  const toggleVisibility = async (id: string, currentStatus: boolean) => {
    const { error } = await db
      .from('client_reviews')
      .update({ is_public: !currentStatus })
      .eq('id', id);

    if (error) {
      console.error('Error updating review:', error);
      alert('Error al actualizar el estado de la reseña');
    } else {
      setReviews(reviews.map(r => r.id === id ? { ...r, is_public: !currentStatus } : r));
    }
  };

  const deleteReview = async (id: string) => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar esta reseña permanentemente?')) return;
    
    const { error } = await db
      .from('client_reviews')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting review:', error);
      alert('Error al eliminar la reseña');
    } else {
      setReviews(reviews.filter(r => r.id !== id));
    }
  };

  const filteredReviews = reviews.filter(review => {
    const matchesSearch = review.clients?.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (review.comment && review.comment.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesRating = filterRating === 'all' || review.rating === filterRating;
    return matchesSearch && matchesRating;
  });

  const averageRating = reviews.length > 0 
    ? (reviews.reduce((acc, curr) => acc + curr.rating, 0) / reviews.length).toFixed(1)
    : '0.0';

  const ratingCounts = {
    5: reviews.filter(r => r.rating === 5).length,
    4: reviews.filter(r => r.rating === 4).length,
    3: reviews.filter(r => r.rating === 3).length,
    2: reviews.filter(r => r.rating === 2).length,
    1: reviews.filter(r => r.rating === 1).length,
  };

  if (loading) {
    return (
      <div className="resenas-admin-page animate-fade-in">
        <PageHeader
          section="Gestión"
          title="Reseñas de Clientes"
          subtitle="Feedback y opiniones de los viajeros sobre su experiencia con Travel Kit."
        />
        <div className="loading-state-premium">
          <div className="loader-premium"></div>
          <p>Cargando reseñas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="resenas-admin-page animate-fade-in">
      <PageHeader
        section="Gestión"
        title="Reseñas de Clientes"
        subtitle="Feedback y opiniones de los viajeros sobre su experiencia con Travel Kit."
      />

      <div className="resenas-dashboard">
        {/* Panel Izquierdo: Estadísticas y Filtros */}
        <aside className="resenas-sidebar">
          <div className="glass-card stats-card-premium">
            <h3 className="card-title-mini">Calificación global</h3>
            <div className="global-rating">
              <span className="rating-number">{averageRating}</span>
              <div className="rating-stars-large">
                {[1, 2, 3, 4, 5].map(star => (
                  <Star 
                    key={star} 
                    size={28} 
                    fill={star <= Math.round(Number(averageRating)) ? '#C89B5A' : 'none'} 
                    color={star <= Math.round(Number(averageRating)) ? '#C89B5A' : '#E7E1D8'} 
                  />
                ))}
              </div>
              <span className="rating-total">Basado en {reviews.length} reseñas</span>
            </div>

            <div className="rating-bars">
              {[5, 4, 3, 2, 1].map(stars => (
                <div key={stars} className="rating-bar-row">
                  <span className="star-label">{stars} <Star size={12} fill="#C89B5A" color="#C89B5A" /></span>
                  <div className="bar-track">
                    <div 
                      className="bar-fill" 
                      style={{ width: reviews.length > 0 ? `${(ratingCounts[stars as keyof typeof ratingCounts] / reviews.length) * 100}%` : '0%' }}
                    ></div>
                  </div>
                  <span className="count-label">{ratingCounts[stars as keyof typeof ratingCounts]}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-card filter-card-premium">
            <h3 className="card-title-mini">Filtrar reseñas</h3>

            <SearchBar placeholder="Buscar por cliente o comentario..." value={searchTerm} onChange={setSearchTerm} />

            <span className="filter-group-label">Calificación</span>
            <div className="rating-filters" role="radiogroup" aria-label="Filtrar por calificación">
              <button
                role="radio"
                aria-checked={filterRating === 'all'}
                className={`filter-btn ${filterRating === 'all' ? 'active' : ''}`}
                onClick={() => setFilterRating('all')}
              >
                <span className="filter-btn-label">Todas</span>
                <span className="filter-btn-count">{reviews.length}</span>
              </button>
              {[5, 4, 3, 2, 1].map(stars => (
                <button
                  key={stars}
                  role="radio"
                  aria-checked={filterRating === stars}
                  aria-label={`${stars} ${stars === 1 ? 'estrella' : 'estrellas'}`}
                  className={`filter-btn ${filterRating === stars ? 'active' : ''}`}
                  onClick={() => setFilterRating(stars)}
                >
                  <span className="filter-btn-stars" aria-hidden="true">
                    {[1, 2, 3, 4, 5].map(i => (
                      <Star key={i} size={14} className={i <= stars ? 'on' : 'off'} />
                    ))}
                  </span>
                  <span className="filter-btn-count">{reviews.filter(r => r.rating === stars).length}</span>
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* Panel Derecho: Lista de Reseñas */}
        <main className="resenas-list-container">
          {filteredReviews.length === 0 ? (
            <div className="empty-state-premium glass-card animate-scale-in">
              <div className="empty-state-icon-wrapper">
                <MessageSquare size={36} color="#C89B5A" />
              </div>
              <h3>No se encontraron reseñas</h3>
              <p>Actualmente no hay opiniones que coincidan con los filtros aplicados o aún no has recibido reseñas.</p>
            </div>
          ) : (
            <div className="reviews-grid">
              {filteredReviews.map(review => (
                <div key={review.id} className="review-card glass-card">
                  <div className="review-header">
                    <div className="client-ident">
                      <div className="avatar-circle">
                        <User size={20} color="var(--color-primary)" />
                      </div>
                      <div>
                        <h4>{review.clients?.name || 'Cliente Desconocido'}</h4>
                        <span className="review-date" style={{ display: 'block', marginBottom: '4px' }}>
                          {format(parseISO(review.created_at), "d 'de' MMMM, yyyy", { locale: es })}
                        </span>
                        {(review.destination || review.pax) && (
                          <span style={{ fontSize: '0.8rem', color: '#5A7181', fontWeight: 600 }}>
                            {review.pax && `${review.pax} pax`}
                            {review.pax && review.destination && ' • '}
                            {review.destination}
                          </span>
                        )}
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
                      <div className="review-stars-mini">
                        {[1, 2, 3, 4, 5].map(star => (
                          <Star 
                            key={star} 
                            size={16} 
                            fill={star <= review.rating ? '#C89B5A' : 'none'} 
                            color={star <= review.rating ? '#C89B5A' : '#E7E1D8'} 
                          />
                        ))}
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button 
                          onClick={() => toggleVisibility(review.id, review.is_public)}
                          title={review.is_public ? "Ocultar de la web" : "Mostrar en la web"}
                          style={{ 
                            background: 'none', border: 'none', cursor: 'pointer',
                            padding: '0.4rem', borderRadius: '50%',
                            backgroundColor: review.is_public ? '#f0fdf4' : '#F3EEE7',
                            color: review.is_public ? '#10b981' : '#8FA2AF',
                            display: 'flex', alignItems: 'center', justifyItems: 'center'
                          }}
                        >
                          {review.is_public ? <Eye size={16} /> : <EyeOff size={16} />}
                        </button>
                        <button 
                          onClick={() => deleteReview(review.id)}
                          title="Eliminar reseña"
                          style={{ 
                            background: 'none', border: 'none', cursor: 'pointer',
                            padding: '0.4rem', borderRadius: '50%',
                            backgroundColor: '#fef2f2', color: '#ef4444',
                            display: 'flex', alignItems: 'center', justifyItems: 'center'
                          }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                  {review.comment ? (
                    <div className="review-body">
                      <p>"{review.comment}"</p>
                    </div>
                  ) : (
                    <div className="review-body empty-comment">
                      <p>El cliente no dejó un comentario escrito, solo la calificación.</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

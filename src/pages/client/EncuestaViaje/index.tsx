import { useEffect, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { CalendarDays } from 'lucide-react';
import { db } from '../../../lib/db';
import { toStoredAnswers, type VIAnswers, type VIQuestion, type VIResult } from '../../../lib/viajeIdeal';
import PageHeader from '../../../components/PageHeader/PageHeader';
import ViajeIdealSurvey from '../../../components/ViajeIdealSurvey/ViajeIdealSurvey';
import './EncuestaViaje.css';

export default function EncuestaViajePage() {
  const { clientId } = useOutletContext<{ clientId: string }>();
  const [questions, setQuestions] = useState<VIQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data, error } = await db
        .from('viaje_ideal_questions')
        .select('*')
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true });
      if (error) setLoadError(true);
      else setQuestions((data || []) as VIQuestion[]);
      setLoading(false);
    };
    load();
  }, []);

  const saveSubmission = async (answers: VIAnswers, result: VIResult) => {
    // Datos de contacto del cliente para la ficha del agente
    const { data: client } = await db.from('clients').select('name, email, phone').eq('id', clientId).maybeSingle();
    const stored = localStorage.getItem('travelkit_client');
    const fallbackName = stored ? JSON.parse(stored).name : 'Viajero';

    const { error } = await db.from('viaje_ideal_submissions').insert([{
      client_id: clientId || null,
      client_name: client?.name || fallbackName,
      email: client?.email || null,
      phone: client?.phone || null,
      answers: toStoredAnswers(questions, answers),
      result: {
        profile: result.profile?.key || null,
        profile_name: result.profile?.name || null,
        secondary: result.secondary?.key || null,
        secondary_name: result.secondary?.name || null,
        scores: result.scores,
      },
      status: 'nuevo',
    }]);
    return !error;
  };

  return (
    <div className="encuesta-cliente-page animate-fade-in">
      <PageHeader
        section="Mi viaje"
        title="Encuesta de Viaje Ideal"
        subtitle="Contanos cómo te gusta viajar y preparamos propuestas a tu medida."
      />

      <div className="encuesta-card">
        {loading ? (
          <div className="loading-state-premium">
            <div className="loader-premium"></div>
            <p>Cargando encuesta...</p>
          </div>
        ) : loadError ? (
          <p className="encuesta-error">No pudimos cargar la encuesta. Probá recargar la página en unos minutos.</p>
        ) : (
          <ViajeIdealSurvey
            questions={questions}
            onComplete={saveSubmission}
            cta={
              <Link to="/portal/agenda" className="btn btn-primary">
                <CalendarDays size={16} /> Ver mi agenda de viaje
              </Link>
            }
          />
        )}
      </div>
    </div>
  );
}

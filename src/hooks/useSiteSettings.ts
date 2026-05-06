import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const DEFAULT_CONTENT = {
  hero_title: 'Organiza el viaje de tu vida con Travel Kit',
  hero_description: 'Descubre una nueva forma de viajar. Te ayudamos a planificar cada detalle con sesiones personalizadas uno a uno para que tu única preocupación sea disfrutar el destino.',
  services_title: 'Por qué elegir Travel Kit',
  services_subtitle: 'Nos encargamos de todo para que tu única tarea sea armar las valijas y disfrutar.',
  benefits_list: JSON.stringify([
    { id: '1', title: 'Itinerarios a medida', description: 'Diseñamos rutas personalizadas basadas en tus gustos, presupuesto y ritmo de viaje preferido.', icon: 'Plane' },
    { id: '2', title: 'Gestión de reservas', description: 'Nos ocupamos de vuelos, alojamientos y excursiones, encontrando siempre las mejores opciones del mercado.', icon: 'CalendarCheck' },
    { id: '3', title: 'Asistencia en viaje', description: 'Viaja con tranquilidad. Estaremos disponibles para resolver cualquier imprevisto durante tu aventura.', icon: 'Shield' }
  ]),
  destinations_title: 'Inspiración para tu próximo viaje',
  destinations_subtitle: 'Descubre algunos de los destinos que hemos preparado para nuestros viajeros.'
};

export function useSiteSettings() {
  const [settings, setSettings] = useState(DEFAULT_CONTENT);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSettings() {
      try {
        const { data, error } = await supabase.from('site_settings').select('*');
        
        if (error) throw error;

        if (data && data.length > 0) {
          const newSettings = { ...DEFAULT_CONTENT };
          data.forEach((item: { key: string, value: string }) => {
            if (item.key in newSettings) {
              newSettings[item.key as keyof typeof DEFAULT_CONTENT] = item.value;
            }
          });
          setSettings(newSettings);
        }
      } catch (error) {
        console.error('Error fetching site settings:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchSettings();
  }, []);

  return { settings, loading };
}

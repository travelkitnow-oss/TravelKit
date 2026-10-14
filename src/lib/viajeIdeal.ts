/**
 * Viaje Ideal: modelo de preguntas, perfiles viajeros y armado de la ficha.
 * Lo comparten la encuesta del cliente, el editor del admin y la ficha del agente.
 */

export type QuestionType = 'single' | 'multi' | 'text';

export interface VIOption {
  id: string;
  text: string;
  /** Puntos que suma a cada perfil viajero (clave de PROFILES) */
  points: Record<string, number>;
}

export interface VIQuestion {
  id: string;
  key?: string | null;
  text: string;
  helper?: string | null;
  type?: QuestionType | null;
  max_select?: number | null;
  required?: boolean | null;
  sort_order?: number | null;
  options: VIOption[];
}

/** Respuestas del viajero: ids de opciones elegidas, o texto libre */
export type VIAnswers = Record<string, string[] | string>;

/** Respuesta guardada en la base (legible sin necesitar las preguntas) */
export interface StoredAnswer {
  questionId: string;
  key: string | null;
  question: string;
  type: QuestionType;
  optionIds: string[];
  values: string[];
}

export interface VIProfile {
  key: string;
  name: string;
  description: string;
}

export interface VIResult {
  profile: VIProfile | null;
  secondary: VIProfile | null;
  scores: Record<string, number>;
}

// ─── Perfiles viajeros ────────────────────────────────────────────────
export const PROFILES: Record<string, VIProfile> = {
  relax:       { key: 'relax',       name: 'Viajero relax',          description: 'Busca desconectar, descansar y disfrutar sin apuros: playas tranquilas, buenos hoteles y tiempo libre.' },
  aventura:    { key: 'aventura',    name: 'Aventurero',             description: 'Quiere adrenalina y actividades: trekking, deportes, excursiones y paisajes que se ganan caminando.' },
  cultura:     { key: 'cultura',     name: 'Explorador cultural',    description: 'Le interesan la historia, los museos, la arquitectura y entender cómo vive la gente del lugar.' },
  gastronomia: { key: 'gastronomia', name: 'Viajero gastronómico',   description: 'Elige destinos por su comida: mercados, bodegas, restaurantes y experiencias culinarias.' },
  romance:     { key: 'romance',     name: 'Escapada romántica',     description: 'Viaja en pareja buscando momentos especiales, lugares con encanto y alojamientos con detalles.' },
  familia:     { key: 'familia',     name: 'Viaje en familia',       description: 'Necesita logística simple, actividades para todas las edades y alojamientos cómodos y seguros.' },
  naturaleza:  { key: 'naturaleza',  name: 'Amante de la naturaleza', description: 'Prefiere paisajes, parques nacionales, fauna y destinos lejos del ruido de la ciudad.' },
  ciudad:      { key: 'ciudad',      name: 'Urbano',                 description: 'Disfruta de grandes ciudades: barrios para caminar, compras, vida nocturna y propuestas culturales.' },
  lujo:        { key: 'lujo',        name: 'Viajero premium',        description: 'Valora el confort y el servicio: hoteles de categoría, traslados privados y experiencias exclusivas.' },
};

const id = (q: string, n: number) => `${q}-${n}`;

// ─── Preguntas sugeridas (punto de partida editable desde el admin) ─────
export const DEFAULT_QUESTIONS: Omit<VIQuestion, 'id'>[] = [
  {
    key: 'feeling', type: 'multi', max_select: 2, required: true,
    text: '¿Qué querés sentir en este viaje?', helper: 'Elegí hasta 2 opciones.',
    options: [
      { id: id('feeling', 1), text: 'Descansar y desconectar', points: { relax: 10, lujo: 2 } },
      { id: id('feeling', 2), text: 'Aventura y adrenalina', points: { aventura: 10, naturaleza: 4 } },
      { id: id('feeling', 3), text: 'Descubrir otras culturas', points: { cultura: 10, ciudad: 3 } },
      { id: id('feeling', 4), text: 'Comer y beber rico', points: { gastronomia: 10, cultura: 2 } },
      { id: id('feeling', 5), text: 'Romance', points: { romance: 10, relax: 3 } },
      { id: id('feeling', 6), text: 'Celebrar algo especial', points: { lujo: 6, romance: 4 } },
    ],
  },
  {
    key: 'companions', type: 'single', required: true,
    text: '¿Con quién viajás?', helper: null,
    options: [
      { id: id('companions', 1), text: 'Solo/a', points: { aventura: 3, cultura: 3 } },
      { id: id('companions', 2), text: 'En pareja', points: { romance: 6 } },
      { id: id('companions', 3), text: 'En familia con chicos', points: { familia: 10 } },
      { id: id('companions', 4), text: 'Con amigos', points: { aventura: 3, ciudad: 3 } },
      { id: id('companions', 5), text: 'En grupo grande', points: { familia: 3, relax: 2 } },
    ],
  },
  {
    key: 'when', type: 'single', required: true,
    text: '¿Cuándo te gustaría viajar?', helper: 'Si todavía no sabés, elegí "Soy flexible".',
    options: [
      { id: id('when', 1), text: 'Verano (dic – feb)', points: {} },
      { id: id('when', 2), text: 'Otoño (mar – may)', points: {} },
      { id: id('when', 3), text: 'Invierno (jun – ago)', points: {} },
      { id: id('when', 4), text: 'Primavera (sep – nov)', points: {} },
      { id: id('when', 5), text: 'Soy flexible', points: {} },
    ],
  },
  {
    key: 'duration', type: 'single', required: true,
    text: '¿Cuántos días tenés?', helper: null,
    options: [
      { id: id('duration', 1), text: 'Fin de semana largo', points: { relax: 2, ciudad: 2 } },
      { id: id('duration', 2), text: 'Una semana', points: {} },
      { id: id('duration', 3), text: 'Dos semanas', points: { cultura: 2 } },
      { id: id('duration', 4), text: 'Tres semanas o más', points: { aventura: 2, cultura: 3 } },
    ],
  },
  {
    key: 'scenery', type: 'multi', max_select: 2, required: true,
    text: '¿Cuál es tu escenario soñado?', helper: 'Elegí hasta 2 opciones.',
    options: [
      { id: id('scenery', 1), text: 'Playa y mar', points: { relax: 8, romance: 2 } },
      { id: id('scenery', 2), text: 'Montaña y lagos', points: { naturaleza: 8, aventura: 4 } },
      { id: id('scenery', 3), text: 'Gran ciudad', points: { ciudad: 10, cultura: 3 } },
      { id: id('scenery', 4), text: 'Pueblos con historia', points: { cultura: 8, gastronomia: 3 } },
      { id: id('scenery', 5), text: 'Selva y naturaleza salvaje', points: { naturaleza: 10, aventura: 4 } },
      { id: id('scenery', 6), text: 'Nieve', points: { aventura: 6, naturaleza: 3 } },
    ],
  },
  {
    key: 'climate', type: 'single', required: true,
    text: '¿Qué clima preferís?', helper: null,
    options: [
      { id: id('climate', 1), text: 'Calor', points: { relax: 3 } },
      { id: id('climate', 2), text: 'Templado', points: { cultura: 2, ciudad: 2 } },
      { id: id('climate', 3), text: 'Frío', points: { aventura: 2, naturaleza: 2 } },
      { id: id('climate', 4), text: 'Me da igual', points: {} },
    ],
  },
  {
    key: 'pace', type: 'single', required: true,
    text: '¿A qué ritmo te gusta viajar?', helper: null,
    options: [
      { id: id('pace', 1), text: 'Relajado: pocas actividades', points: { relax: 6, romance: 2 } },
      { id: id('pace', 2), text: 'Equilibrado: un poco de todo', points: { cultura: 2, gastronomia: 2 } },
      { id: id('pace', 3), text: 'A full: aprovechar cada minuto', points: { aventura: 4, ciudad: 4, cultura: 2 } },
    ],
  },
  {
    key: 'lodging', type: 'single', required: true,
    text: '¿Dónde te gustaría alojarte?', helper: null,
    options: [
      { id: id('lodging', 1), text: 'All inclusive', points: { relax: 6, familia: 3 } },
      { id: id('lodging', 2), text: 'Hotel boutique con encanto', points: { romance: 5, gastronomia: 2 } },
      { id: id('lodging', 3), text: 'Departamento o casa', points: { familia: 4, cultura: 2 } },
      { id: id('lodging', 4), text: 'Opción económica', points: { aventura: 3 } },
      { id: id('lodging', 5), text: 'Hotel de lujo', points: { lujo: 10 } },
    ],
  },
  {
    key: 'budget', type: 'single', required: true,
    text: '¿Cuál es tu presupuesto por persona?', helper: 'Aproximado, incluyendo vuelos y alojamiento.',
    options: [
      { id: id('budget', 1), text: 'Hasta USD 1.000', points: {} },
      { id: id('budget', 2), text: 'USD 1.000 – 2.000', points: {} },
      { id: id('budget', 3), text: 'USD 2.000 – 3.500', points: {} },
      { id: id('budget', 4), text: 'USD 3.500 – 5.000', points: { lujo: 2 } },
      { id: id('budget', 5), text: 'Más de USD 5.000', points: { lujo: 6 } },
    ],
  },
  {
    key: 'distance', type: 'single', required: true,
    text: '¿Hasta dónde estás dispuesto a viajar?', helper: null,
    options: [
      { id: id('distance', 1), text: 'Dentro de Argentina', points: { naturaleza: 2 } },
      { id: id('distance', 2), text: 'Sudamérica', points: {} },
      { id: id('distance', 3), text: 'Caribe o Centroamérica', points: { relax: 3 } },
      { id: id('distance', 4), text: 'Estados Unidos o Canadá', points: { ciudad: 3 } },
      { id: id('distance', 5), text: 'Europa', points: { cultura: 3, gastronomia: 2 } },
      { id: id('distance', 6), text: 'Más lejos (Asia, Oceanía, África)', points: { aventura: 3, cultura: 3 } },
    ],
  },
  {
    key: 'experience', type: 'multi', required: true,
    text: 'Contanos sobre tu experiencia viajando', helper: 'Marcá todas las que apliquen.',
    options: [
      { id: id('experience', 1), text: 'Es mi primer viaje al exterior', points: {} },
      { id: id('experience', 2), text: 'Viajo seguido', points: {} },
      { id: id('experience', 3), text: 'Tengo pasaporte vigente', points: {} },
      { id: id('experience', 4), text: 'No tengo pasaporte o está vencido', points: {} },
    ],
  },
  {
    key: 'notes', type: 'text', required: false,
    text: '¿Algo más que tengamos que saber?', helper: 'Algo que no puede faltar, algo que querés evitar o un destino que soñás conocer.',
    options: [],
  },
];

// ─── Utilidades ──────────────────────────────────────────────────────
export const questionType = (q: VIQuestion): QuestionType => (q.type as QuestionType) || 'single';

export const isAnswered = (q: VIQuestion, answers: VIAnswers) => {
  const a = answers[q.id];
  return questionType(q) === 'text' ? typeof a === 'string' && a.trim().length > 0 : Array.isArray(a) && a.length > 0;
};

export function computeResult(questions: VIQuestion[], answers: VIAnswers): VIResult {
  const scores: Record<string, number> = {};
  for (const q of questions) {
    const chosen = answers[q.id];
    if (!Array.isArray(chosen)) continue;
    for (const optId of chosen) {
      const opt = q.options.find((o) => o.id === optId);
      for (const [k, pts] of Object.entries(opt?.points || {})) {
        scores[k] = (scores[k] || 0) + (Number(pts) || 0);
      }
    }
  }
  const ranked = Object.entries(scores).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
  const toProfile = (k?: string) => (k ? PROFILES[k] || { key: k, name: k, description: '' } : null);
  return { profile: toProfile(ranked[0]?.[0]), secondary: toProfile(ranked[1]?.[0]), scores };
}

export function toStoredAnswers(questions: VIQuestion[], answers: VIAnswers): StoredAnswer[] {
  return questions.map((q) => {
    const a = answers[q.id];
    const type = questionType(q);
    if (type === 'text') {
      return { questionId: q.id, key: q.key || null, question: q.text, type, optionIds: [], values: typeof a === 'string' && a.trim() ? [a.trim()] : [] };
    }
    const ids = Array.isArray(a) ? a : [];
    return {
      questionId: q.id, key: q.key || null, question: q.text, type, optionIds: ids,
      values: ids.map((oid) => q.options.find((o) => o.id === oid)?.text).filter(Boolean) as string[],
    };
  });
}

/** Valores de una respuesta guardada por clave (feeling, budget, ...) */
export const valuesByKey = (stored: StoredAnswer[] | null | undefined, key: string) =>
  (Array.isArray(stored) ? stored : []).find((a) => a.key === key)?.values || [];

/** Línea resumen para el agente: "Pareja · Descansar + Comer rico · Verano · Una semana · ..." */
export function summaryChips(stored: StoredAnswer[] | null | undefined): { label: string; value: string }[] {
  const pick = (key: string, label: string, join = ' + ') => {
    const v = valuesByKey(stored, key);
    return v.length ? { label, value: v.join(join) } : null;
  };
  return [
    pick('companions', 'Con quién'),
    pick('feeling', 'Busca'),
    pick('when', 'Cuándo'),
    pick('duration', 'Duración'),
    pick('scenery', 'Escenario'),
    pick('budget', 'Presupuesto p/p'),
    pick('distance', 'Hasta'),
    pick('lodging', 'Alojamiento'),
    pick('pace', 'Ritmo'),
    pick('climate', 'Clima'),
  ].filter(Boolean) as { label: string; value: string }[];
}

export interface VIAlert {
  level: 'warning' | 'info';
  text: string;
}

/** Señales que el agente tiene que ver antes de la entrevista */
export function agentAlerts(stored: StoredAnswer[] | null | undefined): VIAlert[] {
  const alerts: VIAlert[] = [];
  const exp = valuesByKey(stored, 'experience').join(' ').toLowerCase();
  const budget = valuesByKey(stored, 'budget')[0] || '';
  const distance = valuesByKey(stored, 'distance')[0] || '';
  const companions = valuesByKey(stored, 'companions')[0] || '';

  if (exp.includes('no tengo pasaporte')) {
    alerts.push({ level: 'warning', text: 'No tiene pasaporte vigente: si el destino es fuera de Argentina, hay que tramitarlo con tiempo.' });
  }
  if (exp.includes('primer viaje')) {
    alerts.push({ level: 'info', text: 'Primer viaje al exterior: conviene explicar requisitos de entrada, seguros y cambio de moneda.' });
  }
  const lowBudget = /hasta usd 1\.000/i.test(budget);
  const midBudget = /usd 1\.000 – 2\.000/i.test(budget);
  const far = /europa|más lejos|estados unidos/i.test(distance);
  if (far && (lowBudget || midBudget)) {
    alerts.push({ level: 'warning', text: `Presupuesto ajustado (${budget}) para ${distance}: revisar expectativas o proponer alternativas más cercanas.` });
  }
  if (/chicos/i.test(companions)) {
    alerts.push({ level: 'info', text: 'Viaja con chicos: preguntar edades y necesidades (habitaciones, actividades, horarios de vuelo).' });
  }
  return alerts;
}

export const STATUS_LABELS: Record<string, string> = {
  nuevo: 'Nuevo',
  contactado: 'Contactado',
  sesion_agendada: 'Sesión agendada',
};

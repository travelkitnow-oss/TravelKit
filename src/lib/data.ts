import { format } from 'date-fns';

export type Reservation = {
  id: string;
  client: string;
  dest: string;
  time: string;
  status: 'confirmed' | 'pending' | 'cancelled';
  googleMeet?: string;
  dateStr?: string;
  submissionId?: string;
  email?: string;
  phone?: string;
};

// Persistent storage for reservations
const getSavedReservations = (): Record<string, Reservation[]> => {
  const saved = localStorage.getItem('travelkit_reservations');
  if (saved) return JSON.parse(saved);
  
  // Default mock data if none exists
  const today = format(new Date(), 'yyyy-MM-dd');
  return {
    [today]: [
      { id: '1', client: "Martín Pérez", dest: "Europa Central", time: "10:00", status: "confirmed", googleMeet: "https://meet.google.com/abc-defg-hij" },
    ]
  };
};

export const mockReservations: Record<string, Reservation[]> = getSavedReservations();

export const saveReservations = () => {
  localStorage.setItem('travelkit_reservations', JSON.stringify(mockReservations));
  notifyReservationsChanged();
};

// Simple event emitter for mock data changes
type Listener = () => void;
const listeners: Listener[] = [];

export const subscribeToReservations = (listener: Listener) => {
  listeners.push(listener);
  return () => {
    const index = listeners.indexOf(listener);
    if (index > -1) listeners.splice(index, 1);
  };
};

export const notifyReservationsChanged = () => {
  listeners.forEach(l => l());
};

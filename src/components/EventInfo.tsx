import { InfoItem } from './InfoItem';
import {
  FaCalendarAlt,
  FaFlagCheckered,
  FaMapMarkerAlt,
  FaUserTie,
  FaExclamationTriangle,
  FaUsers,
  FaSyncAlt,
} from 'react-icons/fa';

interface Event {
  datetime_start: string | null;
  datetime_end: string | null;
  location_?: {
    name: string;
    address?: string;
  };
  subscribers?: number;
  created_at: string;
  updated_at: string | null;
  description_extended?: string;
  dress_code?: string | null;
  age_recommended?: string | null;
}

// Utility per aggiustare le date per il frontend
const adjustDateForDisplay = (dateString: string): Date => {
  const date = new Date(dateString);
  // Sottrai 2 ore per compensare l'offset del server
  date.setHours(date.getHours() - 2);
  return date;
};

export function EventInfo({ event }: { event: Event }) {
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-4">
          <InfoItem 
            icon={FaCalendarAlt}
            label="Data Inizio" 
            value={event.datetime_start ? 
              adjustDateForDisplay(event.datetime_start).toLocaleString('it-IT', {
              }) : 
              'Non specificata'
            } 
          />
          {event.datetime_end && (
            <InfoItem 
              icon={FaFlagCheckered}
              label="Data Fine" 
              value={adjustDateForDisplay(event.datetime_end).toLocaleString('it-IT', {
              })} 
            />
          )}
          {event.location_ && (
            <InfoItem 
              icon={FaMapMarkerAlt}
              label="Location" 
              value={`${event.location_.name}${event.location_.address ? ` - ${event.location_.address}` : ''}`} 
            />
          )}
          {event.dress_code && (
            <InfoItem 
              icon={FaUserTie}
              label="Dress Code" 
              value={event.dress_code} 
            />
          )}
          {event.age_recommended && (
            <InfoItem 
              icon={FaExclamationTriangle}
              label="Età Consigliata" 
              value={event.age_recommended} 
            />
          )}
        </div>
        <div className="space-y-4">
          <InfoItem 
            icon={FaUsers}
            label="Iscritti" 
            value={`${event.subscribers ?? 0}`} 
          />
          <InfoItem 
            icon={FaCalendarAlt}
            label="Creato il" 
            value={adjustDateForDisplay(event.created_at).toLocaleDateString('it-IT', {
            })} 
          />
          {event.updated_at && (
            <InfoItem 
              icon={FaSyncAlt}
              label="Aggiornato il" 
              value={adjustDateForDisplay(event.updated_at).toLocaleDateString('it-IT', {
              })} 
            />
          )}
        </div>
      </div>
      {event.description_extended && (
        <div className="pt-6 border-t border-white/10">
          <h3 className="text-lg font-semibold text-white mb-3">Descrizione</h3>
          <p className="text-white/60 whitespace-pre-wrap">{event.description_extended}</p>
        </div>
      )}
    </>
  );
}
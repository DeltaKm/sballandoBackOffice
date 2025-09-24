import { InfoItem } from './InfoItem';

interface Event {
  datetime_start: string | null;
  datetime_end: string | null;
  location?: {
    name: string;
    address?: string;
  };
  subscribers?: number;
  created_at: string;
  updated_at: string | null;
  description_extended?: string;
}

export function EventInfo({ event }: { event: Event }) {
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-4">
          <InfoItem 
            icon="📅" 
            label="Data Inizio" 
            value={event.datetime_start ? new Date(event.datetime_start).toLocaleString('it-IT') : 'Non specificata'} 
          />
          {event.datetime_end && (
            <InfoItem 
              icon="🏁" 
              label="Data Fine" 
              value={new Date(event.datetime_end).toLocaleString('it-IT')} 
            />
          )}
          {event.location && (
            <InfoItem 
              icon="📍" 
              label="Location" 
              value={`${event.location.name}${event.location.address ? ` - ${event.location.address}` : ''}`} 
            />
          )}
        </div>
        <div className="space-y-4">
          <InfoItem 
            icon="👥" 
            label="Iscritti" 
            value={`${event.subscribers || 0}`} 
          />
          <InfoItem 
            icon="📅" 
            label="Creato il" 
            value={new Date(event.created_at).toLocaleDateString('it-IT')} 
          />
          {event.updated_at && (
            <InfoItem 
              icon="🔄" 
              label="Aggiornato il" 
              value={new Date(event.updated_at).toLocaleDateString('it-IT')} 
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
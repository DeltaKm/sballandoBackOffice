import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { FaCalendarAlt, FaMapMarkerAlt, FaChartBar, FaEdit, FaTrash } from "react-icons/fa";
import { getEventCoverUrl } from "~/lib/imageUtils";
import type { Event } from "~/types";

interface EventCardProps {
  event: Event;
  onClick?: (event: Event) => void;
  onDelete?: (event: Event) => void;
  showEditButton?: boolean;
  className?: string;
  bottomContent?: ReactNode;
}

export function EventCard({ 
  event, 
  onClick, 
  onDelete,
  showEditButton = true, 
  className = "",
  bottomContent,
}: EventCardProps) {
  const router = useRouter();
  const [imageError, setImageError] = useState(false);

  const handleCardClick = () => {
    if (onClick) {
      onClick(event);
    } else {
      router.push(`/event/${event.id}`);
    }
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    router.push(`/event/${event.id}/edit`);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete?.(event);
  };

  const handleImageError = () => {
    setImageError(true);
  };

  return (
    <div
      onClick={handleCardClick}
      className={`bg-white/5 border border-white/10 rounded-xl overflow-hidden hover:bg-white/10 transition-all duration-300 hover:scale-105 cursor-pointer h-full flex flex-col ${className}`}
    >
      {/* Immagine di copertina */}
      {getEventCoverUrl(event) && !imageError ? (
        <div className="relative h-48 w-full">
          <img
            src={getEventCoverUrl(event)!}
            alt={event.title || "Evento"}
            className="w-full h-full object-cover"
            onError={handleImageError}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        </div>
      ) : (
        <div className="relative h-48 w-full">
          <img
            src="/sballando_no_photo.png"
            alt="Immagine non disponibile"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        </div>
      )}

      {/* Contenuto della card */}
      <div className="p-6 flex flex-1 flex-col">
        <div className="flex justify-between items-start mb-3">
          <h2 className="text-xl font-semibold text-white line-clamp-2">
            {event.title}
          </h2>
          <div className="flex gap-2">
            {/* Badge stato pubblicazione */}
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
              event.state === 'published' 
                ? 'bg-green-500/20 text-green-400' 
                : 'bg-yellow-500/20 text-yellow-400'
            }`}>
              {event.state === 'published' ? 'Pubblicato' : 'Bozza'}
            </span>
            
          </div>
        </div>

        {/* Sottotitolo */}
        {event.subtitle && (
          <p className="text-white/60 text-sm mb-3 line-clamp-1">
            {event.subtitle}
          </p>
        )}

        {/* Informazioni evento */}
        <div className="space-y-2 text-white/60 text-sm">
          <div className="flex items-center gap-2">
            <FaCalendarAlt className="shrink-0" />
            <span>
              {event.datetime_start && new Date(event.datetime_start).toLocaleDateString('it-IT', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
              })}
            </span>
            <span className="text-white/40">•</span>
            <span>
              {event.datetime_start && new Date(event.datetime_start).toLocaleTimeString('it-IT', {
                hour: '2-digit',
                minute: '2-digit'
              })}
            </span>
          </div>
          
          {event.location_ && (
            <div className="flex items-center gap-2">
              <FaMapMarkerAlt className="shrink-0" />
              <span className="line-clamp-1">{event.location_.name}</span>
            </div>
          )}

          <div className="flex items-center gap-2">
            <FaChartBar className="shrink-0" />
            <span>
              Creato il {new Date(event.created_at).toLocaleDateString('it-IT')}
            </span>
          </div>
        </div>

        {bottomContent && (
          <div className="mt-4 border-t border-white/10 pt-4">
            {bottomContent}
          </div>
        )}

        {/* Azioni card */}
        {(showEditButton || onDelete) && (
          <div className="mt-auto pt-4 flex justify-end gap-2">
            {showEditButton && (
              <button
                onClick={handleEditClick}
                className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors inline-flex items-center gap-2"
              >
                <FaEdit />
                <span>Modifica</span>
              </button>
            )}

            {onDelete && (
              <button
                onClick={handleDeleteClick}
                className="px-4 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors inline-flex items-center gap-2"
              >
                <FaTrash />
                <span>Elimina</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
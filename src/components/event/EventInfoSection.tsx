"use client";

import { EventInfo } from "~/components/EventInfo";
import type { Event } from "~/types";

interface EventInfoSectionProps {
  event: Event;
}

export function EventInfoSection({ event }: EventInfoSectionProps) {
  return (
    <div className="space-y-8">
      {/* Cover Image */}
      {event.cover && (
        <div className="relative w-full h-[500px] rounded-xl overflow-hidden">
          <img
            src={`https://webservice.sballando.it/storage/${event.cover}`}
            alt={event.title || 'Event cover'}
            className="w-full h-full object-cover"
          />
        </div>
      )}
      <EventInfo event={event} />
    </div>
  );
}
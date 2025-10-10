"use client";

import { EventInfo } from "~/components/EventInfo";
import { getEventCoverUrl } from "~/lib/imageUtils";
import type { Event } from "~/types";

interface EventInfoSectionProps {
  event: Event;
}

export function EventInfoSection({ event }: EventInfoSectionProps) {
  return (
    <div className="space-y-8">
      {/* Cover Image */}
      {getEventCoverUrl(event) && (
        <div className="relative w-full h-[500px] rounded-xl overflow-hidden">
          <img
            src={getEventCoverUrl(event)!}
            alt={event.title || 'Event cover'}
            className="w-full h-full object-cover"
          />
        </div>
      )}
      <EventInfo event={event} />
    </div>
  );
}
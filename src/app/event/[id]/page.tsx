"use client";

import { useState, useEffect } from "react";
import { useAuthStore } from "~/store/auth";
import { useRouter } from "next/navigation";
import { useParams } from "next/navigation";
import { SidebarNav } from "~/components/SidebarNav";
import { EventInfoSection } from "~/components/event/EventInfoSection";
import { GallerySection } from "~/components/event/GallerySection";

import { ProductsSection } from "~/components/event/ProductsSection";
import { EntryTypesSection } from "~/components/event/EntryTypesSection";
import { CollaboratorsSection } from "~/components/event/CollaboratorsSection";
import { MusicGenresSection } from "~/components/event/MusicGenresSection";
import { StatisticsSection } from "~/components/event/StatisticsSection";
import { ChatSection } from "~/components/event/ChatSection";
import { JukeboxSection } from "~/components/event/JukeboxSection";
import { PaymentsSection } from "~/components/event/PaymentsSection";
import { NotificationModal } from "~/components/event/NotificationModal";
import type { IconType } from 'react-icons';
import {
  FaClipboardList,
  FaChartBar,
  FaMusic,
  FaUsers,
  FaTicketAlt,
  FaShoppingBag,
  FaImages,
  FaHeadphones,
  FaComments,
  FaBullhorn,
  FaEdit,
  FaTrash,
} from 'react-icons/fa';


import type { Event } from "~/types";

export default function EventDetailPage() {
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const user = useAuthStore((state) => state.user);
  const router = useRouter();
  const params = useParams();

  const sections: Array<{ id: string; label: string; icon: IconType; count?: number }> = [
    { id: 'info', label: 'Informazioni', icon: FaClipboardList },
    { id: 'dashboard', label: 'Statistiche', icon: FaChartBar },
    { id: 'music_genres', label: 'Generi Musicali', icon: FaMusic, count: event?.event_music_genres?.length || 0 },
    { id: 'collaborators', label: 'Collaboratori', icon: FaUsers, count: event?.collaborators?.length || 0 },
    { id: 'entry_types', label: 'Ingressi', icon: FaTicketAlt, count: event?.entry_types?.length || 0 },
    { id: 'products', label: 'Prodotti', icon: FaShoppingBag, count: event?.products?.length || 0 },
    { id: 'gallery', label: 'Galleria', icon: FaImages }, 
    { id: 'jukebox', label: 'JukeBox', icon: FaHeadphones },
    { id: 'chat', label: 'Chat', icon: FaComments },


  ];

  const [activeSection, setActiveSection] = useState('info');

  useEffect(() => {
    if (!user) {
      router.push("/");
      return;
    }
    fetchEventDetails();
  }, [user, router, params.id]);

  const fetchEventDetails = async () => {
    try {
      const res = await fetch(`/api/events/${params.id}`, {
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) throw new Error("Failed to fetch event details");
      const data = await res.json();
      setEvent(data);
    } catch (err) {
      setError("Errore nel caricamento dei dettagli evento");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleEventUpdate = (updatedEvent: Event) => {
    setEvent(updatedEvent);
  };

  const handleDeleteEvent = async () => {
    if (!confirm('Sei sicuro di voler eliminare questo evento?')) return;

    try {
      const res = await fetch(`/api/events/${event?.id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        router.push('/event');
      }
    } catch (err) {
      console.error('Error deleting event:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#212938] flex items-center justify-center">
        <div className="text-white">Caricamento...</div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen bg-[#212938] p-6">
        <div className="max-w-4xl mx-auto bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-white">
          {error || "Evento non trovato"}
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#212938] flex">
      <SidebarNav
        sections={sections}
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        title={event.title || ''}
        state={event.state}
        onBack={() => router.back()}
      />

      <div className="flex-1 overflow-auto">
        {/* Header con azioni */}
        <div className="sticky top-0 z-10 bg-[#212938]/95 backdrop-blur-sm border-b border-white/10 p-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-white">{event.title}</h1>
              {event.subtitle && (
                <p className="text-white/60 mt-1">{event.subtitle}</p>
              )}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowNotificationModal(true)}
                className="px-4 py-2 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-colors flex items-center gap-2"
                title="Invia notifica agli iscritti"
              >
                <FaBullhorn className="text-sm" />
                <span>Notifica</span>
              </button>
              <button
                onClick={() => router.push(`/event/${event.id}/edit`)}
                className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors flex items-center gap-2"
              >
                <FaEdit className="text-sm" />
                <span>Modifica</span>
              </button>
              <button
                onClick={handleDeleteEvent}
                className="px-4 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors flex items-center gap-2"
              >
                <FaTrash className="text-sm" />
                <span>Elimina</span>
              </button>
            </div>
          </div>
        </div>

        {/* Contenuto principale */}
        <div className="p-6">
          {activeSection === 'info' && (
            <EventInfoSection event={event} />
          )}
          {activeSection === 'dashboard' && (
            <StatisticsSection event={event} />
          )}
          {activeSection === 'products' && (
            <ProductsSection event={event} onUpdate={handleEventUpdate} />
          )}
          {activeSection === 'entry_types' && (
            <EntryTypesSection event={event} onUpdate={handleEventUpdate} />
          )}
          {activeSection === 'collaborators' && (
            <CollaboratorsSection event={event} onUpdate={handleEventUpdate} />
          )}
          {activeSection === 'music_genres' && (
            <MusicGenresSection event={event} onUpdate={handleEventUpdate} />
          )}
          {activeSection === 'jukebox' && (
            <JukeboxSection event={event} onUpdate={handleEventUpdate} />
          )}
          {activeSection === 'chat' && (
            <ChatSection event={event} onUpdate={handleEventUpdate} />
          )}
          {activeSection === 'payments' && (
            <PaymentsSection event={event} onUpdate={handleEventUpdate} />
          )}
          {activeSection === 'gallery' && (
            <GallerySection event={event} />
          )}
        </div>
      </div>

      {/* Notification Modal */}
      <NotificationModal
        isOpen={showNotificationModal}
        onClose={() => setShowNotificationModal(false)}
        eventId={event.id}
        eventTitle={event.title || ''}
        subscribersCount={event.subscribers || 0}
      />
    </main>
  );
}


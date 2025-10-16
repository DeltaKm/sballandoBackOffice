"use client";

import { useState, useEffect, useMemo } from "react";
import { useAuthStore } from "~/store/auth";
import { useRouter } from "next/navigation";
import { Sidebar } from "~/components/Sidebar";
import { EventCard } from "~/components/EventCard";
import type { Event } from "~/types";

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const user = useAuthStore((state) => state.user);
  const router = useRouter();

  // Filtra gli eventi in base alla ricerca
  const filteredEvents = useMemo(() => {
    if (!searchQuery.trim()) return events;
    
    const query = searchQuery.toLowerCase();
    return events.filter(event => 
      event.title?.toLowerCase().includes(query) ||
      event.subtitle?.toLowerCase().includes(query) ||
      event.location_?.name?.toLowerCase().includes(query) ||
      event.description_extended?.toLowerCase().includes(query)
    );
  }, [events, searchQuery]);

  useEffect(() => {
    if (!user) {
      router.push("/");
      return;
    }

    fetchEvents();
  }, [user, router]);

  const fetchEvents = async () => {
    try {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ user_token: user!.token }),
      });

      if (!res.ok) {
        throw new Error("Failed to fetch events");
      }

      const data = await res.json();
      setEvents(data);
    } catch (err) {
      setError("Ancora nessun evento dove sei collaboratore, o errore di caricamento.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#212938] flex">
        <Sidebar />
        <div className="flex-1 ml-64 flex items-center justify-center">
          <div className="text-white">Caricamento...</div>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#212938] flex">
      <Sidebar />
      
      {/* Main Content */}
      <div className="flex-1 ml-64">
        {/* Header */}
        <nav className="bg-[#FC0045] p-4 shadow-lg">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <h1 className="text-2xl font-bold text-white">Eventi</h1>
            <button
              onClick={() => router.push("/event/create")}
              className="px-4 py-2 bg-white text-[#FC0045] rounded-lg hover:bg-white/90 transition-colors"
            >
              Nuovo Evento
            </button>
          </div>
        </nav>

        {/* Search Bar */}
        <div className="max-w-7xl mx-auto p-6 pb-0">
          <div className="relative mb-6">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="text-white/60">🔍</span>
            </div>
            <input
              type="text"
              placeholder="Cerca eventi per titolo, sottotitolo, location_..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-[#FC0045] focus:border-transparent"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-white/60 hover:text-white"
              >
                ✕
              </button>
            )}
          </div>

          {/* Results counter */}
          {searchQuery && (
            <div className="mb-4">
              <p className="text-white/60 text-sm">
                {filteredEvents.length} {filteredEvents.length === 1 ? 'evento trovato' : 'eventi trovati'} 
                {searchQuery && ` per "${searchQuery}"`}
              </p>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="max-w-7xl mx-auto px-6 pb-6">
          {error ? (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-white">
              {error}
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="text-center py-12">
              {searchQuery ? (
                <div>
                  <p className="text-white/60 mb-4">
                    Nessun evento trovato per "{searchQuery}"
                  </p>
                  <button
                    onClick={() => setSearchQuery("")}
                    className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors"
                  >
                    Mostra tutti gli eventi
                  </button>
                </div>
              ) : (
                <p className="text-white/60">Nessun evento trovato</p>
              )}
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredEvents.map((event) => (
                <EventCard 
                  key={event.id} 
                  event={event}
                  showEditButton={true}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
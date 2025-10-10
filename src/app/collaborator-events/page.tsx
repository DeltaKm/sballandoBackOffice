"use client";

import { useState, useEffect, useMemo } from "react";
import { useAuthRedirect } from "~/lib/useAuth";
import { useRouter } from "next/navigation";
import { Sidebar } from "~/components/Sidebar";
import { EventCard } from "~/components/EventCard";
import type { Event } from "~/types";

interface CollaboratorEvent extends Event {
  is_upcoming: boolean;
  is_past: boolean;
  collaborator_role: string;
  collaborator_label: string;
  permissions: {
    guest_enabled: boolean;
    vidimate_enabled_product: boolean;
    vidimate_enabled_entry: boolean;
  };
  products_count: number;
  entry_types_count: number;
  music_genres_count: number;
}

interface CollaboratorEventsStats {
  total_events: number;
  upcoming_events: number;
  past_events: number;
  published_events: number;
  draft_events: number;
}

export default function CollaboratorEventsPage() {
  const [events, setEvents] = useState<CollaboratorEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<'all' | 'upcoming' | 'past' | 'published' | 'draft'>('all');
  const [stats, setStats] = useState<CollaboratorEventsStats | null>(null);
  
  const auth = useAuthRedirect();
  const router = useRouter();

  // Filtra gli eventi in base alla ricerca e al filtro stato
  const filteredEvents = useMemo(() => {
    let filtered = events;

    // Filtro per stato
    if (filterStatus !== 'all') {
      filtered = events.filter(event => {
        switch (filterStatus) {
          case 'upcoming':
            return event.is_upcoming;
          case 'past':
            return event.is_past;
          case 'published':
            return event.state === 'published';
          case 'draft':
            return event.state === 'draft';
          default:
            return true;
        }
      });
    }

    // Filtro per ricerca
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(event => 
        event.title?.toLowerCase().includes(query) ||
        event.subtitle?.toLowerCase().includes(query) ||
        event.location_?.name?.toLowerCase().includes(query) ||
        event.description_extended?.toLowerCase().includes(query) ||
        event.collaborator_role?.toLowerCase().includes(query) ||
        event.collaborator_label?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [events, searchQuery, filterStatus]);

  useEffect(() => {
    if (auth.isLoading) return;
    if (!auth.user) return;
    
    fetchCollaboratorEvents();
  }, [auth.user, auth.isLoading]);

  const fetchCollaboratorEvents = async () => {
    if (!auth.user?.token) return;

    try {
      setLoading(true);
      const res = await fetch("/api/events/collaborator-events", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ user_token: auth.user.token }),
      });

      if (!res.ok) {
        throw new Error("Failed to fetch collaborator events");
      }

      const data = await res.json();
      setEvents(data.events || []);
      setStats(data.stats || null);
    } catch (err) {
      setError("Errore nel caricamento degli eventi collaboratori");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (auth.isLoading || loading) {
    return (
      <div className="min-h-screen bg-[#212938] flex">
        <Sidebar />
        <div className="flex-1 ml-64 flex items-center justify-center">
          <div className="text-white flex items-center gap-3">
            <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
            <span>Caricamento eventi collaboratori...</span>
          </div>
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
            <div>
              <h1 className="text-2xl font-bold text-white">Eventi Collaboratori</h1>
              <p className="text-white/80 text-sm mt-1">
                Eventi dove sei collaboratore
              </p>
            </div>
            <button
              onClick={() => router.push("/event")}
              className="px-4 py-2 bg-white text-[#FC0045] rounded-lg hover:bg-white/90 transition-colors flex items-center gap-2"
            >
              <span>📋</span>
              Miei Eventi
            </button>
          </div>
        </nav>

        {/* Stats Cards */}
        {stats && (
          <div className="max-w-7xl mx-auto p-6 pb-0">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
              <div className="bg-blue-500/20 rounded-lg p-4 text-center border border-blue-500/30">
                <div className="text-blue-300 font-bold text-2xl">{stats.total_events}</div>
                <div className="text-blue-400/80 text-sm">Totali</div>
              </div>
              <div className="bg-green-500/20 rounded-lg p-4 text-center border border-green-500/30">
                <div className="text-green-300 font-bold text-2xl">{stats.upcoming_events}</div>
                <div className="text-green-400/80 text-sm">Prossimi</div>
              </div>
              <div className="bg-orange-500/20 rounded-lg p-4 text-center border border-orange-500/30">
                <div className="text-orange-300 font-bold text-2xl">{stats.past_events}</div>
                <div className="text-orange-400/80 text-sm">Passati</div>
              </div>
              <div className="bg-purple-500/20 rounded-lg p-4 text-center border border-purple-500/30">
                <div className="text-purple-300 font-bold text-2xl">{stats.published_events}</div>
                <div className="text-purple-400/80 text-sm">Pubblicati</div>
              </div>
              <div className="bg-gray-500/20 rounded-lg p-4 text-center border border-gray-500/30">
                <div className="text-gray-300 font-bold text-2xl">{stats.draft_events}</div>
                <div className="text-gray-400/80 text-sm">Bozze</div>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="max-w-7xl mx-auto px-6 pb-0">
          {/* Search Bar */}
          <div className="relative mb-4">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="text-white/60">🔍</span>
            </div>
            <input
              type="text"
              placeholder="Cerca eventi per titolo, sottotitolo, location, ruolo..."
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

          {/* Status Filter */}
          <div className="flex flex-wrap gap-2 mb-6">
            {[
              { key: 'all', label: 'Tutti', icon: '📋' },
              { key: 'upcoming', label: 'Prossimi', icon: '🚀' },
              { key: 'past', label: 'Passati', icon: '📅' },
              { key: 'published', label: 'Pubblicati', icon: '✅' },
              { key: 'draft', label: 'Bozze', icon: '📝' }
            ].map((filter) => (
              <button
                key={filter.key}
                onClick={() => setFilterStatus(filter.key as any)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                  filterStatus === filter.key
                    ? 'bg-[#FC0045] text-white'
                    : 'bg-white/10 text-white/70 hover:bg-white/20'
                }`}
              >
                <span>{filter.icon}</span>
                {filter.label}
              </button>
            ))}
          </div>

          {/* Results counter */}
          {(searchQuery || filterStatus !== 'all') && (
            <div className="mb-4">
              <p className="text-white/60 text-sm">
                {filteredEvents.length} {filteredEvents.length === 1 ? 'evento trovato' : 'eventi trovati'}
                {searchQuery && ` per "${searchQuery}"`}
                {filterStatus !== 'all' && ` (filtro: ${filterStatus})`}
              </p>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="max-w-7xl mx-auto px-6 pb-6">
          {error ? (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-white">
              <div className="flex items-center gap-3">
                <span className="text-2xl">❌</span>
                <div>
                  <h3 className="font-bold mb-1">Errore di caricamento</h3>
                  <p>{error}</p>
                  <button
                    onClick={fetchCollaboratorEvents}
                    className="mt-3 px-4 py-2 bg-red-500/20 text-red-300 rounded-lg hover:bg-red-500/30 transition-colors"
                  >
                    Riprova
                  </button>
                </div>
              </div>
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="text-center py-12">
              {searchQuery || filterStatus !== 'all' ? (
                <div>
                  <div className="text-6xl mb-4">🔍</div>
                  <p className="text-white/60 mb-4">
                    Nessun evento trovato{searchQuery && ` per "${searchQuery}"`}
                    {filterStatus !== 'all' && ` con filtro "${filterStatus}"`}
                  </p>
                  <div className="flex gap-3 justify-center">
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery("")}
                        className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors"
                      >
                        Rimuovi ricerca
                      </button>
                    )}
                    {filterStatus !== 'all' && (
                      <button
                        onClick={() => setFilterStatus('all')}
                        className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors"
                      >
                        Mostra tutti
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div>
                  <div className="text-6xl mb-4">👥</div>
                  <h3 className="text-white text-xl font-bold mb-2">Nessun evento collaboratore</h3>
                  <p className="text-white/60 mb-6">
                    Non sei ancora collaboratore di nessun evento.
                  </p>
                  <div className="flex gap-3 justify-center">
                    <button
                      onClick={() => router.push("/event")}
                      className="px-6 py-3 bg-[#FC0045] text-white rounded-lg hover:bg-[#FC0045]/80 transition-colors"
                    >
                      Vai ai miei eventi
                    </button>
                    <button
                      onClick={() => router.push("/event/create")}
                      className="px-6 py-3 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors"
                    >
                      Crea nuovo evento
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredEvents.map((event) => (
                <div key={event.id} className="relative">
                  <div 
                    onClick={() => router.push(`/collaborator-events/${event.id}`)}
                    className="cursor-pointer group"
                  >
                    <EventCard 
                      event={event}
                      showEditButton={false} // I collaboratori non possono modificare
                      className="pb-16 group-hover:shadow-xl group-hover:scale-[1.02] transition-all duration-200" // Spazio per le informazioni collaboratore
                    />
                    
                    {/* Collaborator Info Overlay */}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 rounded-b-xl">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-orange-400 text-sm">👤</span>
                          <span className="text-orange-300 text-sm font-medium">
                            {event.collaborator_label || event.collaborator_role}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          {event.is_upcoming && (
                            <span className="px-2 py-1 bg-green-500/20 text-green-300 text-xs rounded">
                              Prossimo
                            </span>
                          )}
                          {event.is_past && (
                            <span className="px-2 py-1 bg-gray-500/20 text-gray-300 text-xs rounded">
                              Passato
                            </span>
                          )}
                          {event.state === 'draft' && (
                            <span className="px-2 py-1 bg-yellow-500/20 text-yellow-300 text-xs rounded">
                              Bozza
                            </span>
                          )}
                        </div>
                      </div>
                      
                      {/* Permissions */}
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-white/60">Permessi:</span>
                        {event.permissions.guest_enabled && (
                          <span className="px-2 py-1 bg-purple-500/20 text-purple-300 rounded">🎭 Ospite</span>
                        )}
                        {event.permissions.vidimate_enabled_entry && (
                          <span className="px-2 py-1 bg-blue-500/20 text-blue-300 rounded">🎫 Ingressi</span>
                        )}
                        {event.permissions.vidimate_enabled_product && (
                          <span className="px-2 py-1 bg-green-500/20 text-green-300 rounded">🛍️ Prodotti</span>
                        )}
                        {!event.permissions.guest_enabled && 
                         !event.permissions.vidimate_enabled_entry && 
                         !event.permissions.vidimate_enabled_product && (
                          <span className="text-white/40">Nessuno</span>
                        )}
                      </div>
                      
                      {/* Quick stats */}
                      <div className="flex items-center gap-4 mt-2 text-xs text-white/60">
                        <span>🛍️ {event.products_count} prodotti</span>
                        <span>🎫 {event.entry_types_count} ingressi</span>
                        <span>🎵 {event.music_genres_count} generi</span>
                      </div>
                      
                      {/* Action button */}
                      <div className="mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button className="w-full px-3 py-2 bg-[#FC0045] text-white rounded-lg text-sm font-medium hover:bg-[#FC0045]/80 transition-colors">
                          👁️ Visualizza Dettagli
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
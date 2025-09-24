"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "~/store/auth";
import { Sidebar } from "~/components/Sidebar";
import { Location } from "~/types";

export default function LocationsPage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [toggleLoading, setToggleLoading] = useState<number | null>(null);

  // Verifica se l'utente è super admin
  const isSuperAdmin = user?.role === 'SUPERADMIN';

  // Filtra i locali in base alla ricerca
  const filteredLocations = useMemo(() => {
    if (!searchQuery.trim()) return locations;
    
    const query = searchQuery.toLowerCase();
    return locations.filter(location => 
      location.name?.toLowerCase().includes(query) ||
      location.address?.toLowerCase().includes(query) ||
      location.city?.toLowerCase().includes(query) ||
      location.description?.toLowerCase().includes(query) ||
      location.phone?.toLowerCase().includes(query) ||
      location.email?.toLowerCase().includes(query)
    );
  }, [locations, searchQuery]);

  // Funzione per attivare/disattivare un locale
  const toggleLocationStatus = async (locationId: number, currentStatus: boolean) => {
    if (!user?.token || !isSuperAdmin) return;
    
    setToggleLoading(locationId);
    
    try {
      const res = await fetch('/api/locations/toggle-status', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          location_id: locationId,
          enable: !currentStatus,  // Inverte il valore: 0 diventa 1, 1 diventa 0
          user_token: user.token 
        }),
      });

      if (!res.ok) {
        throw new Error('Errore nel cambio di stato del locale');
      }

      // Aggiorna lo stato locale
      setLocations(prev => prev.map(location => 
  location.id === locationId 
    ? { ...location, enable: !currentStatus }  // Aggiorna il campo enable
    : location
));

    } catch (err) {
      console.error('Errore nel toggle del locale:', err);
      alert('Errore nel cambio di stato del locale');
    } finally {
      setToggleLoading(null);
    }
  };

  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const res = await fetch('/api/locations', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ user_token: user?.token }),
        });

        if (!res.ok) {
          throw new Error('Errore nel caricamento dei locali');
        }

        const data = await res.json();
        setLocations(data);
      } catch (err) {
        setError("Errore nel caricamento dei locali");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    if (user?.id) {
      fetchLocations();
    }
  }, [user?.id]);

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
            <div>
              <h1 className="text-2xl font-bold text-white">I Miei Locali</h1>
              {isSuperAdmin && (
                <p className="text-white/80 text-sm mt-1">Modalità Super Admin - Puoi gestire tutti i locali</p>
              )}
            </div>
            <button
              onClick={() => router.push("/locations/create")}
              className="px-4 py-2 bg-white text-[#FC0045] rounded-lg hover:bg-white/90 transition-colors"
            >
              Nuovo Locale
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
              placeholder="Cerca locali per nome, indirizzo, città, telefono..."
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
                {filteredLocations.length} {filteredLocations.length === 1 ? 'locale trovato' : 'locali trovati'} 
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
          ) : filteredLocations.length === 0 ? (
            <div className="text-center py-12">
              {searchQuery ? (
                <div>
                  <p className="text-white/60 mb-4">
                    Nessun locale trovato per "{searchQuery}"
                  </p>
                  <button
                    onClick={() => setSearchQuery("")}
                    className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors"
                  >
                    Mostra tutti i locali
                  </button>
                </div>
              ) : (
                <div>
                  <p className="text-white/60 mb-4">Nessun locale trovato</p>
                  <button
                    onClick={() => router.push("/locations/create")}
                    className="px-6 py-2 bg-[#FC0045] text-white rounded-lg hover:bg-[#FC0045]/90 transition-colors"
                  >
                    Aggiungi il tuo primo locale
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredLocations.map((location) => (
                <div
                  key={location.id}
                  onClick={() => router.push(`/locations/${location.id}`)}
                  className="bg-white/5 border border-white/10 rounded-xl overflow-hidden hover:bg-white/10 transition-all duration-300 hover:scale-105 cursor-pointer"
                >
                  {/* Immagine di copertina */}
                  {location.cover && location.token ? (
                    <div className="relative h-48 w-full">
                      <img
                        src={`/uploads/locations/${location.token}/${location.cover}`}
                        alt={location.name}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                      
                      {/* Badge Super Admin in overlay */}
                      {isSuperAdmin && (
                        <div className="absolute top-3 left-3">
                          <span className="px-2 py-1 bg-yellow-500/90 text-yellow-900 rounded text-xs font-bold">
                            👑 SUPER ADMIN
                          </span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="h-48 w-full bg-gradient-to-br from-[#FC0045]/20 to-purple-600/20 flex items-center justify-center relative">
                      <span className="text-4xl">🏢</span>
                      
                      {/* Badge Super Admin */}
                      {isSuperAdmin && (
                        <div className="absolute top-3 left-3">
                          <span className="px-2 py-1 bg-yellow-500/90 text-yellow-900 rounded text-xs font-bold">
                            👑 SUPER ADMIN
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Contenuto della card */}
                  <div className="p-6">
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="text-xl font-semibold text-white line-clamp-2">
                        {location.name}
                      </h3>
                      <div className="flex gap-2">
                        {/* Badge stato */}
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          location.enable 
                            ? 'bg-green-500/20 text-green-400' 
                            : 'bg-gray-500/20 text-gray-400'
                        }`}>
                          {location.enable ? 'Attivo' : 'Inattivo'}
                        </span>
                      </div>
                    </div>

                    {/* Descrizione se presente */}
                    {location.description && (
                      <p className="text-white/60 text-sm mb-3 line-clamp-2">
                        {location.description}
                      </p>
                    )}

                    {/* Informazioni location */}
                    <div className="space-y-2 text-white/60 text-sm">
                      <div className="flex items-center gap-2">
                        <span>📍</span>
                        <span className="line-clamp-1">
                          {location.address}
                          {location.city && `, ${location.city}`}
                        </span>
                      </div>
                      
                      {location.phone && (
                        <div className="flex items-center gap-2">
                          <span>📞</span>
                          <span>{location.phone}</span>
                        </div>
                      )}

                      {location.email && (
                        <div className="flex items-center gap-2">
                          <span>📧</span>
                          <span className="line-clamp-1">{location.email}</span>
                        </div>
                      )}

                      <div className="flex items-center gap-2">
                        <span>📊</span>
                        <span>
                          Creato il {new Date(location.created_at).toLocaleDateString('it-IT')}
                        </span>
                      </div>
                    </div>

                    {/* Statistiche se disponibili */}
                    {(location.events_count !== undefined || location.capacity !== undefined) && (
                      <div className="mt-4 pt-4 border-t border-white/10">
                        <div className="flex justify-between text-sm">
                          {location.events_count !== undefined && (
                            <div className="text-center">
                              <div className="text-white font-medium">{location.events_count}</div>
                              <div className="text-white/60">Eventi</div>
                            </div>
                          )}
                          {location.capacity !== undefined && (
                            <div className="text-center">
                              <div className="text-white font-medium">{location.capacity}</div>
                              <div className="text-white/60">Capacità</div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Azioni - Layout diverso per Super Admin */}
                    <div className="mt-4 flex justify-between gap-2">
                      {/* Pulsanti Super Admin */}
                      {isSuperAdmin && (
                        <div className="flex gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleLocationStatus(location.id, location.enable);
                            }}
                            disabled={toggleLoading === location.id}
                            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                              location.enable
                                ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/40'
                                : 'bg-green-500/20 text-green-400 hover:bg-green-500/30 border border-green-500/40'
                            } ${toggleLoading === location.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                            title={location.enable ? 'Disattiva locale' : 'Attiva locale'}
                          >
                            {toggleLoading === location.id ? (
                              <>
                                <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin"></div>
                                <span className="text-xs">...</span>
                              </>
                            ) : location.enable ? (
                              <>
                                <span>❌</span>
                                <span className="text-xs">Disattiva</span>
                              </>
                            ) : (
                              <>
                                <span>✅</span>
                                <span className="text-xs">Attiva</span>
                              </>
                            )}
                          </button>
                        </div>
                      )}
                      
                      {/* Pulsante Modifica sempre presente */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/locations/${location.id}/edit`);
                        }}
                        className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors"
                      >
                        ✏️ Modifica
                      </button>
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
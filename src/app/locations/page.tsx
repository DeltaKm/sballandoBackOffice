"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "~/store/auth";
import { useAuthRedirect } from "~/lib/useAuth";
import { Sidebar } from "~/components/Sidebar";
import { getLocationLogoUrl } from "~/lib/imageUtils";
import {
  FaSearch,
  FaTimes,
  FaCrown,
  FaBuilding,
  FaMapMarkerAlt,
  FaPhone,
  FaEnvelope,
  FaChartBar,
  FaCheckCircle,
  FaTimesCircle,
  FaTrash,
  FaEdit,
} from "react-icons/fa";
import type { location_ } from "~/types";

export default function locationsPage() {
  const router = useRouter();
  const auth = useAuthRedirect();
  const user = auth.user;
  const [locations, setlocations] = useState<location_[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [toggleLoading, setToggleLoading] = useState<number | null>(null);
  const [deletingLocation, setDeletingLocation] = useState<number | null>(null);

  // Verifica se l'utente è super admin
  const isSuperAdmin = user?.role === 'SUPERADMIN';

  // Filtra i locali in base alla ricerca (sempre chiamato)
  const filteredlocations = useMemo(() => {
    if (!searchQuery.trim()) return locations;

    const query = searchQuery.toLowerCase();
    return locations.filter(location_ =>
      location_.name?.toLowerCase().includes(query) ||
      location_.address?.toLowerCase().includes(query) ||
      location_.comune?.toLowerCase().includes(query) ||
      location_.description?.toLowerCase().includes(query) ||
      location_.phone?.toLowerCase().includes(query) ||
      location_.email?.toLowerCase().includes(query)
    );
  }, [locations, searchQuery]);

  // Funzione per attivare/disattivare un locale
  const togglelocationStatus = async (locationId: number, currentStatus: boolean) => {
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
      setlocations(prev =>
        prev.map(location_ =>
          location_.id === locationId
            ? { ...location_, enable: currentStatus ? 0 : 1 } // 0 = false, 1 = true
            : location_
        )
      );

    } catch (err) {
      console.error('Errore nel toggle del locale:', err);
      alert('Errore nel cambio di stato del locale');
    } finally {
      setToggleLoading(null);
    }
  };

  // Funzione per eliminare un locale
  const handleDeleteLocation = async (location_: location_) => {
    if (!user?.token || !isSuperAdmin) return;

    // Doppia conferma per sicurezza
    const confirmed = confirm(
      `ATTENZIONE: Vuoi davvero eliminare il locale "${location_.name}"?\n\n` +
      `Questa azione è IRREVERSIBILE e eliminerà:\n` +
      `• Il locale e tutti i suoi dati\n` +
      `• Tutte le informazioni associate\n\n` +
      `Clicca OK per continuare...`
    );

    if (!confirmed) return;

    const confirmation = prompt('Per confermare, digita il nome del locale:');
    if (confirmation !== location_.name) {
      alert('Cancellazione annullata. Il nome non corrisponde.');
      return;
    }

    setDeletingLocation(location_.id);

    try {
      const res = await fetch(`/api/locations/${location_.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_token: user.token }),
      });

      if (res.ok) {
        const result = await res.json();
        alert(`Locale "${result.deletedLocation.name}" eliminato con successo!`);
        
        // Rimuovi il locale dalla lista locale
        setlocations(prev => prev.filter(loc => loc.id !== location_.id));
      } else {
        const error = await res.json();
        alert(`Errore: ${error.error}`);
        if (error.details) {
          alert(`Dettagli: ${error.details}`);
        }
      }
    } catch (err) {
      console.error('Error deleting location:', err);
      alert('Errore di connessione durante l\'eliminazione');
    } finally {
      setDeletingLocation(null);
    }
  };

  useEffect(() => {
    const fetchlocations = async () => {
      // Se non c'è utente, non fare nulla (sarà gestito dall'auth hook)
      if (!user?.token) {
        setLoading(false);
        return;
      }

      try {
        const res = await fetch('/api/locations', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ user_token: user.token }),
        });

        if (!res.ok) {
          throw new Error('Errore nel caricamento dei locali');
        }

        const data = await res.json();
        setlocations(data);
      } catch (err) {
        setError("Errore nel caricamento dei locali");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    // Fetch solo se l'autenticazione è inizializzata
    if (auth.isAuthenticated) {
      fetchlocations();
    }
  }, [auth.isAuthenticated, user?.token]);

  // Render condizionale DOPO che tutti gli hook sono stati chiamati
  if (auth.isLoading) {
    return (
      <div className="min-h-screen bg-[#212938] flex">
        <Sidebar />
        <div className="flex-1 ml-64 flex items-center justify-center">
          <div className="text-white">Caricamento autenticazione...</div>
        </div>
      </div>
    );
  }

  // Se non è autenticato, non mostrare nulla (verrà reindirizzato)
  if (!auth.isAuthenticated) {
    return null;
  }

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
              <FaSearch className="text-white/60" />
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
                <FaTimes />
              </button>
            )}
          </div>

          {/* Results counter */}
          {searchQuery && (
            <div className="mb-4">
              <p className="text-white/60 text-sm">
                {filteredlocations.length} {filteredlocations.length === 1 ? 'locale trovato' : 'locali trovati'}
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
          ) : filteredlocations.length === 0 ? (
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
              {filteredlocations.map((location_) => (
                <div
                  key={location_.id}
                  onClick={() => router.push(`/locations/${location_.id}`)}
                  className="bg-white/5 border border-white/10 rounded-xl overflow-hidden hover:bg-white/10 transition-all duration-300 hover:scale-105 cursor-pointer h-full flex flex-col"
                >
                  {/* Immagine di copertina */}
                  {getLocationLogoUrl(location_) ? (
                    <div className="relative h-48 w-full">
                      <img
                        src={getLocationLogoUrl(location_)!}
                        alt={location_.name}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />

                      {/* Badge Super Admin in overlay */}
                      {isSuperAdmin && (
                        <div className="absolute top-3 left-3">
                          <span className="px-2 py-1 bg-yellow-500/90 text-yellow-900 rounded text-xs font-bold inline-flex items-center gap-1">
                            <FaCrown />
                            <span>SUPER ADMIN</span>
                          </span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="h-48 w-full bg-gradient-to-br from-[#FC0045]/20 to-purple-600/20 flex items-center justify-center relative">
                      <FaBuilding className="text-4xl" />

                      {/* Badge Super Admin */}
                      {isSuperAdmin && (
                        <div className="absolute top-3 left-3">
                          <span className="px-2 py-1 bg-yellow-500/90 text-yellow-900 rounded text-xs font-bold inline-flex items-center gap-1">
                            <FaCrown />
                            <span>SUPER ADMIN</span>
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Contenuto della card */}
                  <div className="p-6 flex flex-1 flex-col">
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="text-xl font-semibold text-white line-clamp-2">
                        {location_.name}
                      </h3>
                      <div className="flex gap-2">
                        {/* Badge stato */}
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${location_.enable
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-gray-500/20 text-gray-400'
                          }`}>
                          {location_.enable ? 'Attivo' : 'Inattivo'}
                        </span>
                      </div>
                    </div>

                    {/* Descrizione se presente */}
                    {location_.description && (
                      <p className="text-white/60 text-sm mb-3 line-clamp-2">
                        {location_.description}
                      </p>
                    )}

                    {/* Informazioni location_ */}
                    <div className="space-y-2 text-white/60 text-sm">
                      <div className="flex items-center gap-2">
                        <FaMapMarkerAlt />
                        <span className="line-clamp-1">
                          {location_.address}
                          {location_.comune && `, ${location_.comune}`}
                        </span>
                      </div>

                      {location_.phone && (
                        <div className="flex items-center gap-2">
                          <FaPhone />
                          <span>{location_.phone}</span>
                        </div>
                      )}

                      {location_.email && (
                        <div className="flex items-center gap-2">
                          <FaEnvelope />
                          <span className="line-clamp-1">{location_.email}</span>
                        </div>
                      )}

                      <div className="flex items-center gap-2">
                        <FaChartBar />
                        <span>
                          Creato il {new Date(location_.created_at).toLocaleDateString('it-IT')}
                        </span>
                      </div>
                    </div>

                    {/* Statistiche se disponibili */}
                    {(location_.events_count !== undefined || location_.capacity !== undefined) && (
                      <div className="mt-4 pt-4 border-t border-white/10">
                        <div className="flex justify-between text-sm">
                          {location_.events_count !== undefined && (
                            <div className="text-center">
                              <div className="text-white font-medium">{location_.events_count}</div>
                              <div className="text-white/60">Eventi</div>
                            </div>
                          )}
                          {location_.capacity !== undefined && (
                            <div className="text-center">
                              <div className="text-white font-medium">{location_.capacity}</div>
                              <div className="text-white/60">Capacità</div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Azioni - Layout diverso per Super Admin */}
                    <div className="mt-auto pt-4 flex justify-between gap-2">
                      {/* Pulsanti Super Admin */}
                      {isSuperAdmin && (
                        <div className="flex gap-2">
                          {/* Pulsante Attiva/Disattiva */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              togglelocationStatus(location_.id, location_.enable == 1);
                            }}
                            disabled={toggleLoading === location_.id}
                            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${location_.enable
                                ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/40'
                                : 'bg-green-500/20 text-green-400 hover:bg-green-500/30 border border-green-500/40'
                              } ${toggleLoading === location_.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                            title={location_.enable ? 'Disattiva locale' : 'Attiva locale'}
                          >
                            {toggleLoading === location_.id ? (
                              <>
                                <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin"></div>
                                <span className="text-xs">...</span>
                              </>
                            ) : location_.enable ? (
                              <>
                                <FaTimesCircle />
                                <span className="text-xs">Disattiva</span>
                              </>
                            ) : (
                              <>
                                <FaCheckCircle />
                                <span className="text-xs">Attiva</span>
                              </>
                            )}
                          </button>

                          {/* Pulsante Elimina */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteLocation(location_);
                            }}
                            disabled={deletingLocation === location_.id}
                            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 border ${
                              deletingLocation === location_.id
                                ? 'bg-red-500/10 text-red-300 border-red-500/20 cursor-not-allowed'
                                : 'bg-red-500/20 text-red-400 hover:bg-red-500/30 border-red-500/40'
                            }`}
                            title="Elimina locale (ATTENZIONE: azione irreversibile!)"
                          >
                            {deletingLocation === location_.id ? (
                              <>
                                <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin"></div>
                                <span className="text-xs">...</span>
                              </>
                            ) : (
                              <>
                                <FaTrash />
                                <span className="text-xs">Elimina</span>
                              </>
                            )}
                          </button>
                        </div>
                      )}



                      {/* Pulsante Modifica sempre presente */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/locations/${location_.id}/update`);
                        }}
                        className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors inline-flex items-center gap-2"
                      >
                        <FaEdit />
                        <span>Modifica</span>
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
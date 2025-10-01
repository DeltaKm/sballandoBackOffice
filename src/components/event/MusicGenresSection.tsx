"use client";

import { useState, useEffect } from "react";
import { useAuthStore } from "~/store/auth";
import type { Event, MusicGenre } from "~/types";

interface MusicGenresSectionProps {
  event: Event;
  onUpdate?: (updatedEvent: Event) => void;
}

export function MusicGenresSection({ event, onUpdate }: MusicGenresSectionProps) {
  const [allGenres, setAllGenres] = useState<MusicGenre[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<MusicGenre[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    fetchAllGenres();
  }, []);

  // Cerca automaticamente quando cambia la query
  useEffect(() => {
    if (searchQuery.length >= 2) {
      searchGenres();
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  const fetchAllGenres = async () => {
    try {
      const res = await fetch('/api/music-genres');
      if (res.ok) {
        const genres = await res.json();
        setAllGenres(genres);
      }
    } catch (err) {
      console.error('Error fetching genres:', err);
    }
  };

  const searchGenres = () => {
    setSearchLoading(true);
    
    // Filtra i generi non ancora selezionati che corrispondono alla ricerca
    const selectedGenreIds = event.event_music_genres?.map(emg => emg.music_genre_id) || [];
    const availableGenres = allGenres.filter(genre => 
      !selectedGenreIds.includes(genre.id) && 
      genre.label.toLowerCase().includes(searchQuery.toLowerCase())
    );
    
    setSearchResults(availableGenres);
    setSearchLoading(false);
  };

  const handleToggleGenre = async (genreId: number, isRemoving: boolean = false) => {
    if (!user?.token) {
      alert('Devi essere loggato per modificare i generi musicali');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/music-genres/add-event`, {
        method: isRemoving ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          music_genre_id: genreId,
          event_id: event.id,
          user_token: user.token 
        }),
      });

      if (res.ok) {
        const updatedEvent = await res.json();
        onUpdate?.(updatedEvent);
        
        // Se abbiamo aggiunto un genere, aggiorna i risultati di ricerca
        if (!isRemoving) {
          searchGenres();
        }
      } else {
        const error = await res.json();
        alert(error.error || 'Errore durante l\'operazione');
      }
    } catch (err) {
      console.error('Error updating genre:', err);
      alert('Errore di connessione');
    } finally {
      setLoading(false);
    }
  };

  const selectedGenres = event.event_music_genres || [];
  const validSelectedGenres = selectedGenres.filter((emg) => emg.music_genre);

  return (
    <div className="pt-6 border-t border-white/10">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-white">Generi Musicali</h3>
        <button
          onClick={() => setShowSearch(!showSearch)}
          className="px-4 py-2 bg-[#FC0045] text-white rounded-lg hover:bg-[#FC0045]/80 transition-colors flex items-center gap-2"
        >
          <span>{showSearch ? '✕' : '🔍'}</span>
          {showSearch ? 'Chiudi Ricerca' : 'Aggiungi Generi'}
        </button>
      </div>

      {/* Generi Selezionati */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <h4 className="text-white/80 font-medium">Generi Selezionati</h4>
          <span className="px-2 py-1 bg-[#FC0045]/20 text-[#FC0045] rounded-full text-xs">
            {validSelectedGenres.length}
          </span>
        </div>

        {validSelectedGenres.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {validSelectedGenres.map((emg) => (
              <div
                key={emg.id}
                className="flex items-center justify-between p-3 bg-[#FC0045]/10 border border-[#FC0045]/30 rounded-lg"
              >
                <span className="text-[#FC0045] font-medium text-sm">
                  {emg.music_genre.label}
                </span>
                <button
                  onClick={() => handleToggleGenre(emg.music_genre_id, true)}
                  disabled={loading}
                  className="w-6 h-6 bg-red-500/20 text-red-400 rounded-full hover:bg-red-500/40 transition-colors flex items-center justify-center text-xs disabled:opacity-50"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 border border-white/10 rounded-lg bg-white/5">
            <div className="text-white/60 mb-2">
              <span className="text-2xl">🎵</span>
            </div>
            <p className="text-white/60 text-sm mb-3">Nessun genere musicale selezionato</p>
            <button
              onClick={() => setShowSearch(true)}
              className="px-4 py-2 bg-[#FC0045] text-white rounded-lg hover:bg-[#FC0045]/80 transition-colors text-sm"
            >
              Aggiungi il primo genere
            </button>
          </div>
        )}
      </div>

      {/* Barra di Ricerca */}
      {showSearch && (
        <div className="mb-6 p-4 bg-white/5 border border-white/10 rounded-lg">
          <div className="space-y-4">
            <div>
              <label className="block text-white/80 text-sm mb-2">Cerca generi musicali</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Digita il nome del genere..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-3 py-2 pr-10 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-[#FC0045]"
                />
                {searchLoading && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                  </div>
                )}
              </div>
            </div>

            {/* Risultati ricerca */}
            {searchQuery.length >= 2 && (
              <div>
                {searchResults.length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-white/80 text-sm">
                      {searchResults.length} genere/i trovato/i:
                    </p>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 max-h-48 overflow-y-auto">
                      {searchResults.map((genre) => (
                        <button
                          key={genre.id}
                          onClick={() => handleToggleGenre(genre.id)}
                          disabled={loading}
                          className="flex items-center justify-between p-2 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors disabled:opacity-50 text-left"
                        >
                          <span className="text-white text-sm">{genre.label}</span>
                          <span className="text-[#FC0045] text-lg">➕</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <div className="text-white/60 mb-2">
                      <span className="text-2xl">🔍</span>
                    </div>
                    <p className="text-white/60 text-sm">
                      Nessun genere trovato per "{searchQuery}"
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Messaggio minimo caratteri */}
            {searchQuery.length > 0 && searchQuery.length < 2 && (
              <p className="text-white/60 text-sm">
                Digita almeno 2 caratteri per iniziare la ricerca
              </p>
            )}
          </div>
        </div>
      )}

      {/* Loader globale */}
      {loading && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gray-900 border border-white/20 rounded-lg p-6 flex items-center gap-3">
            <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            <span className="text-white">Aggiornamento in corso...</span>
          </div>
        </div>
      )}
    </div>
  );
}
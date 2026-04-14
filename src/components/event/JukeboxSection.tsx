"use client";
import { useState, useEffect, useRef } from "react";
import io from "socket.io-client";
import type { Socket } from "socket.io-client";
import { FaMusic, FaCheckCircle, FaExpand, FaBell } from "react-icons/fa";
import { useAuthStore } from "~/store/auth";
import type { Event } from "~/types";

interface JukeboxSectionProps {
  event: Event;
  onUpdate?: (updatedEvent: Event) => void;
}

interface CurrentTrack {
  title: string;
  artists: string;
  cover?: string;
  is_playing: boolean;
  duration_ms: number;
}

interface QueueTrack {
  title: string;
  message?: string;
  subtitle: string;
  cover?: string;
}

interface ChatMessage {
  id?: number;
  message?: string;
  created_at: string;
  sender: {
    id: number;
    nickname?: string;
    name?: string;
    surname?: string;
  };
  spotify_playlist?: {
    title: string;
    subtitle?: string;
    cover?: string;
  };
}

export function JukeboxSection({ event, onUpdate }: JukeboxSectionProps) {
  const [socket, setSocket] = useState<ReturnType<typeof io> | null>(null);
  const { user } = useAuthStore();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentTrack, setCurrentTrack] = useState<CurrentTrack | null>(null);
  const [queueTracks, setQueueTracks] = useState<QueueTrack[]>([]);
  const [isLoadingPlaylist, setIsLoadingPlaylist] = useState(true);
  const [currentProgressMs, setCurrentProgressMs] = useState(0);
  const [currentDurationMs, setCurrentDurationMs] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const playbackTimerRef = useRef<NodeJS.Timeout | null>(null);
  const progressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [notifiedTracks, setNotifiedTracks] = useState<Set<string>>(new Set());

  // Configurazione Spotify
  const clientId = '78a92b28562b4024bfe61a6914e093b2';
  const scopes = [
    "playlist-modify-public",
    "playlist-modify-private",
    "user-read-playback-state",
    "user-modify-playback-state"
  ];
  const spotifyUrl = `https://accounts.spotify.com/authorize?client_id=${clientId}&response_type=code&redirect_uri=${encodeURIComponent("https://backend.sballando.it/callback")}&scope=${encodeURIComponent(scopes.join(" "))}&state=${event?.id}`;

  // Scroll to bottom function
  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  };

  // Filter messages by current track
  const filterMessagesByCurrentTrack = () => {
    if (!currentTrack || !Array.isArray(messages) || messages.length === 0) return;
    
    // Trova tutti i messaggi con spotify_playlist
    const spotifyMessages = messages.filter(msg => msg.spotify_playlist);
    
    // Trova l'indice del brano corrente
    const currentIndex = spotifyMessages.findIndex((msg) => {
      if (!msg.spotify_playlist) return false;
      return msg.spotify_playlist.title === currentTrack.title;
    });
    
    if (currentIndex >= 0) {
      console.log(`Current track found at position ${currentIndex + 1}/${spotifyMessages.length}`);
      
      // NON RIMUOVERE I MESSAGGI, LASCIA CHE IL FILTRO NEL RENDER SE NE OCCUPI
      // Questo evita di perdere messaggi e permette di visualizzare la cronologia
      
      // Opzionalmente, puoi scrollare o evidenziare il brano corrente
      setTimeout(() => {
        scrollToBottom();
      }, 100);
    }
  };

  // Fetch current track from Spotify
  const fetchCurrentTrack = async () => {
    if (!event.spotify_access_token) return;
    try {
      const res = await fetch("https://api.spotify.com/v1/me/player/currently-playing", {
        headers: { Authorization: `Bearer ${event.spotify_access_token}` },
      });
      if (res.status === 200) {
        const data = await res.json();
        if (data.item) {
          const newTrack: CurrentTrack = {
            title: data.item.name,
            artists: data.item.artists.map((a: any) => a.name).join(", "),
            cover: data.item.album.images[0]?.url,
            is_playing: data.is_playing ?? false,
            duration_ms: data.item.duration_ms ?? 0,
          };

          // CONTROLLA SE È UNA NUOVA TRACCIA IN RIPRODUZIONE
          const isNewTrack = !currentTrack || 
            currentTrack.title !== newTrack.title || 
            currentTrack.artists !== newTrack.artists;

          setCurrentProgressMs(data.progress_ms ?? 0);
          setCurrentDurationMs(data.item.duration_ms ?? 0);
          setCurrentTrack(newTrack);

          // SE È UNA NUOVA TRACCIA E STA SUONANDO, CONTROLLA LE NOTIFICHE
          if (isNewTrack && newTrack.is_playing) {
            console.log('New track detected:', newTrack.title);
            // Aspetta un po' per assicurarsi che i messaggi siano caricati
            setTimeout(() => {
              checkAndSendNotification(newTrack);
            }, 1000);
          }
        }
      } else if (res.status === 204) {
        setCurrentTrack(null);
      }
    } catch (e) {
      console.error("Errore fetchCurrentTrack:", e);
    }
  };

  // Fetch playback queue
  const fetchPlaybackQueue = async () => {
    try {
      const res = await fetch(
        `https://webservice.sballando.it/api/spotify/get_playback_queue?eventId=${event.id}`,
        { method: "POST" }
      );
      if (!res.ok) throw new Error(`Errore HTTP: ${res.status}`);
      const data = await res.json();
      if (data.status !== true) throw new Error(data.error ?? "Errore caricamento coda");
      
      const current = data.current_track;
      const queue = data.queue ?? [];
      const tracks: QueueTrack[] = [];

      if (current) {
        tracks.push({
          title: current.name,
          message: current.message,
          subtitle: current.artists.map((a: any) => a.name).join(", "),
          cover: current.album.images[0]?.url ?? "",
        });
      }
      
      
      if (currentTrack) {
        const index = tracks.findIndex(
          t => t.title === currentTrack.title && t.subtitle === currentTrack.artists
        );
        if (index > 0) {
          setQueueTracks(tracks.slice(index));
        } else {
          setQueueTracks(tracks);
        }
      } else {
        setQueueTracks(tracks);
      }
    } catch (e) {
      console.error("Errore fetchPlaybackQueue:", e);
    }
  };

  // Fetch messages
  const fetchMessages = async () => {
    if (!user?.token) return;
    try {
      console.log('Fetching messages from API...');
      
      const res = await fetch('/api/messages/get_messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          user_token: user.token,
          event_id: event.id
        }),
      });
      
      if (res.ok) {
        const data = await res.json();
        console.log('API Response:', data);
        
        if (data.success) {
          const apiMessages = data.messages ?? [];
          console.log('Setting messages from API:', apiMessages.length);
          
          // ASSICURATI CHE OGNI MESSAGGIO ABBIA UN ID UNICO
          const processedMessages = apiMessages.map((msg: any, index: number) => ({
            ...msg,
            id: msg.id || `api-${Date.now()}-${index}` // Fallback ID se manca
          }));
          
          setMessages(processedMessages);
          setIsLoadingPlaylist(false);
          scrollToBottom();
        } else {
          console.log('API error:', data.error);
          setMessages([]);
          setIsLoadingPlaylist(false);
        }
      } else {
        console.log('HTTP error:', res.status);
        setMessages([]);
        setIsLoadingPlaylist(false);
      }
    } catch (error) {
      console.error("Error loading messages:", error);
      setMessages([]);
      setIsLoadingPlaylist(false);
    }
  };

  // Initialize socket
  const initSocket = () => {
    if (!event) return;
    if (socket?.connected) {
      socket.disconnect();
    }
    
    const newSocket = io('https://websocket.sballando.it', {
      transports: ['websocket'],
      autoConnect: false,
      timeout: 10000,
    });
    
    newSocket.on('connect', () => {
      console.log('Socket connessa');
      newSocket.emit('join-to-room', JSON.stringify({ 
        joinType: 'publish', 
        eventId: event.id 
      }));
    });
    
    // AGGIUNGI CONTROLLO PER EVITARE DUPLICATI
    newSocket.on('new-public-message', (data: any) => {
      console.log('New socket message received:', data);
      
      let newMessage: ChatMessage;
      
      if (data.spotify_playlist) {
        // Messaggio con playlist Spotify
        newMessage = {
          id: data.id || Date.now(), // Usa l'ID se presente, altrimenti timestamp
          message: data.message,
          created_at: data.created_at || new Date().toISOString(),
          sender: data.sender || { id: 0, name: 'Sconosciuto' },
          spotify_playlist: data.spotify_playlist
        };
      } else if (data.message) {
        // Messaggio di testo normale
        newMessage = { 
          ...data.message, 
          sender: data.sender || { id: 0, name: 'Sconosciuto' },
          id: data.message?.id || data.id || Date.now(),
          created_at: data.message?.created_at || data.created_at || new Date().toISOString()
        };
      } else {
        console.log('Invalid message format:', data);
        return;
      }
      
      console.log('Processed message:', newMessage);
      
      // CONTROLLA SE IL MESSAGGIO ESISTE GIÀ PRIMA DI AGGIUNGERLO
      setMessages(prev => {
        // Controlla se il messaggio esiste già per ID
        if (newMessage.id && prev.some(msg => msg.id === newMessage.id)) {
          console.log('Message already exists, skipping:', newMessage.id);
          return prev;
        }
        
        // Controlla se esiste un messaggio identico per contenuto e timestamp
        const isDuplicate = prev.some(msg => 
          msg.message === newMessage.message &&
          msg.created_at === newMessage.created_at &&
          msg.sender?.id === newMessage.sender?.id
        );
        
        if (isDuplicate) {
          console.log('Duplicate message detected, skipping');
          return prev;
        }
        
        console.log('Adding new message to array');
        return [...prev, newMessage];
      });
      
      setTimeout(() => {
        filterMessagesByCurrentTrack();
        scrollToBottom();
      }, 100);
    });
    
    // AGGIUNGI GESTIONE ERRORI E DISCONNECT
    newSocket.on('disconnect', () => {
      console.log('Socket disconnessa');
    });

    
    newSocket.connect();
    setSocket(newSocket);
  };

  // AGGIUNGI FUNZIONE PER PULIRE DUPLICATI (OPZIONALE)
  const removeDuplicateMessages = () => {
    setMessages(prev => {
      const seen = new Set();
      const unique = prev.filter(msg => {
        // Crea una chiave unica basata su contenuto + timestamp + sender
        const key = `${msg.message || ''}-${msg.created_at}-${msg.sender?.id || 0}-${msg.spotify_playlist?.title || ''}`;
        
        if (seen.has(key)) {
          return false; // Duplicato, rimuovi
        }
        
        seen.add(key);
        return true; // Unico, mantieni
      });
      
      if (unique.length !== prev.length) {
        console.log(`Removed ${prev.length - unique.length} duplicate messages`);
      }
      
      return unique;
    });
  };

  // Toggle fullscreen
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.error(`Errore fullscreen: ${err.message}`);
      });
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // Format duration
  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = String(Math.floor(seconds / 60)).padStart(2, "0");
    const remaining = String(seconds % 60).padStart(2, "0");
    return `${minutes}:${remaining}`;
  };

  const formatProgress = () => {
    const seconds = Math.floor(currentProgressMs / 1000);
    const minutes = String(Math.floor(seconds / 60)).padStart(2, "0");
    const rem = String(seconds % 60).padStart(2, "0");
    return `${minutes}:${rem}`;
  };

  // Find current track dedication
  const getCurrentTrackDedication = () => {
    if (!currentTrack || !messages.length) return null;
    
    const dedicationMessage = messages.find(msg => 
      msg.spotify_playlist && 
      msg.spotify_playlist.title === currentTrack.title &&
      msg.message
    );
    
    return dedicationMessage;
  };

  // Effects
  useEffect(() => {
    if (!user?.token) return;
    
    const initializeJukebox = async () => {
      await fetchCurrentTrack();
      await fetchPlaybackQueue();
      await fetchMessages();
      await initSocket();
      
      // PULISCI DUPLICATI DOPO 2 SECONDI
      setTimeout(() => {
        removeDuplicateMessages();
      }, 2000);
    };
    
    void initializeJukebox();

    playbackTimerRef.current = setInterval(() => {
      void fetchCurrentTrack();
      void fetchPlaybackQueue();
      filterMessagesByCurrentTrack();
      
      // PULISCI DUPLICATI OGNI 30 SECONDI
      removeDuplicateMessages();
    }, 5000);

    progressTimerRef.current = setInterval(() => {
      if (currentTrack?.is_playing) {
        setCurrentProgressMs(prev => {
          const newProgress = prev + 100;
          return newProgress > currentDurationMs ? currentDurationMs : newProgress;
        });
      }
    }, 100);

    return () => {
      if (playbackTimerRef.current) clearInterval(playbackTimerRef.current);
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
      if (socket?.connected) {
        socket.disconnect();
      }
    };
  }, [event.id, user?.token]);

  useEffect(() => {
    if (currentTrack && currentTrack.is_playing && messages.length > 0) {
      // Controlla se dobbiamo inviare una notifica per la traccia corrente
      setTimeout(() => {
        checkAndSendNotification(currentTrack);
      }, 500);
    }
  }, [messages, currentTrack]);

  useEffect(() => {
    setNotifiedTracks(new Set());
  }, [event.id]);

  if (!user) {
    return (
      <div className="pt-8 border-t border-white/10">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-white/60">Caricamento autenticazione...</p>
          </div>
        </div>
      </div>
    );
  }

  const currentDedication = getCurrentTrackDedication();

  const sendPlayingNotification = async (track: CurrentTrack, dedicationMessage: ChatMessage) => {
    try {
      console.log('Sending playing notification for:', track.title);
      
      const notificationData = {
        event_id: event.id,
        track_title: track.title,
        track_artist: track.artists,
        user_id: dedicationMessage.sender.id,
        user_name: dedicationMessage.sender.nickname || dedicationMessage.sender.name,
        dedication: dedicationMessage.message,
        event_title: event.title,
        timestamp: new Date().toISOString()
      };

      const response = await fetch('/api/notifications/track-playing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.token}`
        },
        body: JSON.stringify(notificationData)
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Notification sent successfully:', result);
        
        // AGGIUNGI LA TRACCIA AL SET DELLE NOTIFICHE INVIATE
        const trackKey = `${track.title}-${track.artists}`;
        setNotifiedTracks(prev => new Set(prev).add(trackKey));
        
      } else {
        const error = await response.json();
        console.error('Failed to send notification:', error);
      }

    } catch (error) {
      console.error('Error sending notification:', error);
    }
  };

  const checkAndSendNotification = async (track: CurrentTrack) => {
    if (!track || !track.is_playing) return;

    // Crea una chiave unica per la traccia
    const trackKey = `${track.title}-${track.artists}`;
    
    // Se abbiamo già inviato la notifica per questa traccia, non inviarla di nuovo
    if (notifiedTracks.has(trackKey)) {
      return;
    }

    // Trova il messaggio di dedica per questa traccia
    const dedicationMessage = messages.find(msg => 
      msg.spotify_playlist && 
      msg.spotify_playlist.title === track.title &&
      msg.spotify_playlist.subtitle === track.artists &&
      msg.sender?.id // Assicurati che ci sia un sender ID
    );

    if (dedicationMessage) {
      console.log('Found dedication for playing track, sending notification...');
      await sendPlayingNotification(track, dedicationMessage);
    } else {
      console.log('No dedication found for current track');
    }
  };

  return (
    <div className={`jukebox relative pt-8 min-h-screen font-sans ${isFullscreen ? 'fixed inset-0 z-50' : ''}`}
         style={{ background: '#121212', color: '#fff' }}>
      
      {/* Spotify Connection Button */}
      <div className="p-5 mb-6">
        {!event.spotify_token_expires_at ? (
          <a 
            href={spotifyUrl}
            className="inline-flex items-center gap-2 px-6 py-3 text-white font-bold rounded-lg transition-colors"
            style={{ backgroundColor: 'rgb(79, 174, 27)' }}
          >
            <FaMusic className="text-xl" />
            Collega Spotify
          </a>
        ) : (
          <a
            href={spotifyUrl}
            className="inline-flex items-center gap-2 px-6 py-3 text-white font-bold rounded-lg transition-colors"
            style={{ backgroundColor: 'rgb(79, 174, 27)' }}
          >
            <FaCheckCircle className="text-xl" />
            Spotify connesso
          </a>
        )}
      </div>

      {/* Fullscreen Button */}
      <button 
        onClick={toggleFullscreen}
        className="absolute top-4 right-4 bg-green-600 hover:bg-green-700 text-white text-xl px-3 py-2 rounded-md transition-colors z-50"
      >
        <FaExpand />
      </button>

      {/* Main Content */}
      <div className="flex gap-8 h-full">
        {/* Current Track Section */}
        <div className="flex-1">
          <h3 className="text-5xl font-normal p-5">Canzone in riproduzione</h3>
          
          {currentTrack && (
            <div className="current-track flex items-center mx-40">
              <div>
                {currentTrack.cover ? (
                  <img 
                    src={currentTrack.cover} 
                    alt="cover"
                    className="w-96 h-96 object-cover mb-8 rounded-lg"
                  />
                ) : (
                  <div className="w-96 h-96 bg-white/10 mb-8 rounded-lg flex items-center justify-center text-6xl">
                    <FaMusic />
                  </div>
                )}
                
                <div className="info pb-10">
                  <h3 className="text-4xl font-medium text-white mb-2">
                    {currentTrack.title}
                  </h3>
                  <p className="text-3xl text-gray-400 mb-4">
                    {currentTrack.artists}
                  </p>

                  {/* Progress Bar */}
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <span>{formatProgress()}</span>
                    <div className="flex-1 h-1.5 bg-gray-600 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-green-500 transition-all duration-100"
                        style={{ width: `${(currentProgressMs / currentDurationMs) * 100}%` }}
                      />
                    </div>
                    <span>{formatDuration(currentDurationMs)}</span>
                  </div>
                </div>

                {/* Current Track Dedication */}
                {currentDedication && (
                  <div className="playlist-message text-3xl mb-3 p-2.5 rounded-lg text-white">
                    <div className="font-bold text-green-400 mb-2">
                      {currentDedication.sender.nickname ?? 'Un utente'}
                    </div>
                    {currentDedication.message && (
                      <div className="text-4xl text-gray-300 mb-1">
                        Dedica: {currentDedication.message}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Queue Section - USA I MESSAGGI DAL DB + WEBSOCKET */}
        <div className="flex-1 p-4 rounded-lg max-h-screen overflow-y-auto">
          <h3 className="text-5xl font-normal pb-10">Canzoni in coda</h3>
          
          {/* Debug Info - rimuovi dopo */}
          {process.env.NODE_ENV === 'development' && (
            <div className="p-4 mb-4 bg-blue-500/10 border border-blue-500/20 rounded-lg text-sm">
              <strong>Debug:</strong>
              <br />• Total Messages: {messages.length}
              <br />• Messages with Spotify: {messages.filter(m => m.spotify_playlist).length}
              <br />• Queue Tracks from API: {queueTracks.length}
              <br />• Current Track: {currentTrack?.title || 'None'}
              <br />• Is Playing: {currentTrack?.is_playing ? 'Playing' : 'Paused'}
              <br />• Notifications Sent: {notifiedTracks.size}
              <br />• Current Track Has Dedication: {getCurrentTrackDedication() ? 'Yes' : 'No'}
              
              {/* LISTA NOTIFICHE INVIATE */}
              {notifiedTracks.size > 0 && (
                <>
                  <br />• Notified Tracks:
                  <div className="text-xs text-gray-400 mt-1">
                    {Array.from(notifiedTracks).map(track => (
                      <div key={track}>→ {track}</div>
                    ))}
                  </div>
                </>
              )}
              
              {/* BOTTONE PER TESTARE NOTIFICA */}
              <div className="mt-2">
                <button 
                  onClick={() => {
                    if (currentTrack) {
                      const dedication = getCurrentTrackDedication();
                      if (dedication) {
                        sendPlayingNotification(currentTrack, dedication);
                      } else {
                        alert('Nessuna dedica trovata per il brano corrente');
                      }
                    } else {
                      alert('Nessun brano in riproduzione');
                    }
                  }}
                  className="px-2 py-1 bg-purple-500/20 border border-purple-500/30 rounded text-xs"
                >
                  <span className="inline-flex items-center gap-1"><FaBell /><span>Test Notification</span></span>
                </button>
              </div>
            </div>
          )}
          
          {/* MESSAGGI DALLA CHAT (DATABASE + WEBSOCKET) - SOLO BRANI FUTURI */}
          <div>
            <h4 className="text-3xl text-green-400 mb-6 inline-flex items-center gap-2"><FaMusic /><span>Brani richiesti dagli utenti</span></h4>
            
            {(() => {
              // FILTRA MESSAGGI: RIMUOVI QUELLI PRECEDENTI AL BRANO CORRENTE
              const spotifyMessages = messages.filter(msg => msg.spotify_playlist);
              
              if (!currentTrack || spotifyMessages.length === 0) {
                return spotifyMessages; // Se non c'è traccia corrente, mostra tutti
              }
              
              // Trova l'indice del brano attualmente in riproduzione
              const currentTrackIndex = spotifyMessages.findIndex(msg =>
                msg.spotify_playlist?.title === currentTrack.title &&
                msg.spotify_playlist?.subtitle === currentTrack.artists
              );
              
              // Se il brano corrente è trovato, mostra solo quelli successivi
              // Altrimenti mostra tutti (il brano corrente potrebbe non essere nella chat)
              const filteredMessages = currentTrackIndex >= 0 
                ? spotifyMessages.slice(currentTrackIndex + 1) // +1 per escludere anche quello corrente
                : spotifyMessages;
              
              console.log('Queue filtering:', {
                totalSpotifyMessages: spotifyMessages.length,
                currentTrack: currentTrack?.title,
                currentTrackIndex,
                filteredMessages: filteredMessages.length
              });
              
              return filteredMessages;
            })().length > 0 ? (
              <div className="space-y-4">
                {(() => {
                  // STESSA LOGICA DI FILTRO PER IL RENDERING
                  const spotifyMessages = messages.filter(msg => msg.spotify_playlist);
                  
                  if (!currentTrack) {
                    return spotifyMessages;
                  }
                  
                  const currentTrackIndex = spotifyMessages.findIndex(msg =>
                    msg.spotify_playlist?.title === currentTrack.title &&
                    msg.spotify_playlist?.subtitle === currentTrack.artists
                  );
                  
                  const filteredMessages = currentTrackIndex >= 0 
                    ? spotifyMessages.slice(currentTrackIndex + 1)
                    : spotifyMessages;
                  
                  return filteredMessages;
                })().map((msg, index) => (
                  <div key={`msg-${msg.id ?? index}`} className="bg-gray-800/50 border border-green-500/30 rounded-lg p-4">
                    {/* AGGIUNGI NUMERO DI POSIZIONE NELLA CODA */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-green-500 text-black rounded-full flex items-center justify-center font-bold text-sm">
                          {index + 1}
                        </div>
                        <div className="font-bold text-green-400 text-xl">
                          {msg.sender.nickname ?? msg.sender.name ?? 'Un utente'}
                        </div>
                      </div>
                      <div className="text-sm text-gray-400">
                        {new Date(msg.created_at).toLocaleTimeString('it-IT', {
                          hour: '2-digit', 
                          minute: '2-digit'
                        })}
                      </div>
                    </div>
                    
                    {/* Canzone */}
                    <div className="flex items-start gap-4 mb-3">
                      {msg.spotify_playlist?.cover ? (
                        <img 
                          src={msg.spotify_playlist.cover}
                          alt="track cover"
                          className="w-20 h-20 rounded-lg object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="w-20 h-20 bg-white/10 rounded-lg flex items-center justify-center text-2xl flex-shrink-0">
                          <FaMusic />
                        </div>
                      )}
                      
                      <div className="flex-1 min-w-0">
                        <div className="text-white font-semibold text-lg mb-1 truncate">
                          {msg.spotify_playlist?.title ?? 'Titolo sconosciuto'}
                        </div>
                        <div className="text-gray-300 text-sm truncate">
                          {msg.spotify_playlist?.subtitle ?? 'Artista sconosciuto'}
                        </div>
                      </div>
                    </div>

                    
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-64 text-white/30">
                <div className="text-center">
                  <FaMusic className="text-6xl mb-4 mx-auto" />
                  <p className="text-xl">
                    {currentTrack ? 'Nessun brano in coda' : 'Nessun brano richiesto'}
                  </p>
                  <p className="text-sm text-white/50 mt-2">
                    {currentTrack 
                      ? 'Tutti i brani richiesti sono già stati riprodotti'
                      : 'I brani aggiunti dagli utenti appariranno qui'
                    }
                  </p>
                  {/* MOSTRA BRANO CORRENTE SE PRESENTE */}
                  {currentTrack && (
                    <div className="mt-4 text-xs text-gray-400">
                      Ora in riproduzione: <span className="text-green-400">{currentTrack.title}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

        </div>

      </div>

      {/* Loading State */}
      {isLoadingPlaylist && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gray-900 border border-white/20 rounded-lg p-6 flex items-center gap-4">
            <div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-white">Caricamento coda Spotify...</span>
          </div>
        </div>
      )}
    </div>
  );
}
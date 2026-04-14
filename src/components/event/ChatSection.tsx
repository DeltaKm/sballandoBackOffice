"use client";

import { useState, useEffect, useRef } from "react";
import io from "socket.io-client";
import { FaComments, FaCircle, FaMusic } from "react-icons/fa";
import { useAuthStore } from "~/store/auth";
import type { Event } from "~/types";

interface ChatSectionProps {
  event: Event;
  onUpdate?: (updatedEvent: Event) => void;
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
    email?: string;
    picture?: string;
  };
  spotify_playlist?: {
    title: string;
    subtitle?: string;
    cover?: string;
  };
}

export function ChatSection({ event, onUpdate }: ChatSectionProps) {
  const { user } = useAuthStore();
  const [socket, setSocket] = useState<ReturnType<typeof io> | null>(null); // Usa ReturnType
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);

  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const lastSentMessageRef = useRef<string>("");

  // Scroll to bottom function
  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  };

  // Fetch messages from API
  const fetchMessages = async () => {
    if (!user?.token) {
      console.log('No user token available');
      return;
    }

    try {
      const res = await fetch('/api/messages/get_messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          user_token: user.token,
          event_id: event.id
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setMessages(data.messages || []);
          setIsLoading(false);
          setTimeout(scrollToBottom, 100); // Scroll dopo il render
        } else {
          console.error('Error from API:', data.error);
          setMessages([]);
          setIsLoading(false);
        }
      } else {
        console.error('HTTP Error:', res.status);
        setMessages([]);
        setIsLoading(false);
      }
    } catch (error) {
      console.error("Errore caricamento messaggi:", error);
      setMessages([]);
      setIsLoading(false);
    }
  };

  // Initialize socket connection
  const initSocket = async () => {
    if (!event) return;

    if (socket?.connected) {
      socket.disconnect();
      setSocket(null);
    }

    const newSocket = io('https://websocket.sballando.it', {
      transports: ['websocket'],
      autoConnect: false,
    });

    newSocket.on('connect', () => {
      console.log('Socket connessa');
      newSocket.emit('join-to-room', JSON.stringify({ 
        joinType: 'publish', 
        eventId: event.id 
      }));
    });

    // newSocket.on('disconnect', () => console.log('Socket disconnessa'));
    // newSocket.on('connect_error', (err) => console.log('Errore connessione:', err));
    // newSocket.on('error', (err) => console.log('Errore generico:', err));

    // Handle incoming messages
    newSocket.on('new-public-message', (data: any) => {
      console.log('Messaggio ricevuto:', data);
      
      // Evita duplicati controllando se il messaggio esiste già
      setMessages(prev => {
        // Se il messaggio ha un ID, controlla se esiste già
        if (data.id && prev.some(msg => msg.id === data.id)) {
          console.log('Messaggio duplicato ignorato:', data.id);
          return prev;
        }
        
        // Se è il messaggio che abbiamo appena inviato, ignoralo
        const messageText = data.message || (data.spotify_playlist ? '' : '');
        if (messageText && 
            messageText === lastSentMessageRef.current && 
            data.sender?.id === user?.id) {
          console.log('Messaggio proprio ignorato (appena inviato)');
          return prev;
        }
        
        // Se non ha ID, controlla per contenuto e timestamp simili
        const isDuplicate = prev.some(msg => 
          msg.message === messageText && 
          msg.sender?.id === data.sender?.id &&
          Math.abs(new Date(msg.created_at).getTime() - new Date(data.created_at || Date.now()).getTime()) < 5000
        );
        
        if (isDuplicate) {
          console.log('Messaggio duplicato (simile) ignorato');
          return prev;
        }
        
        // Aggiungi il messaggio
        let newMessage;
        if (data.spotify_playlist) {
          newMessage = data;
        } else if (data.message) {
          newMessage = { ...data.message, sender: data.sender };
        } else {
          newMessage = data;
        }
        
        return [...prev, newMessage];
      });
      
      // Scroll automatico in basso
      setTimeout(scrollToBottom, 100);
    });

    newSocket.connect();
    setSocket(newSocket);
  };

  // Send message (versione semplificata)
  const sendMessage = async () => {
    if (!newMessage.trim() || isSending || !user?.token) return;

    setIsSending(true);
    
    // Salva il messaggio che stiamo per inviare
    const messageToSend = newMessage.trim();
    lastSentMessageRef.current = messageToSend;

    try {
      const res = await fetch('/api/messages/send_message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_token: user.token,
          event_id: event.id,
          message: messageToSend
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setNewMessage(""); // Pulisci il campo input
          // NON aggiungere il messaggio qui, arriverà via WebSocket
          
          // Pulisci il reference dopo 3 secondi
          setTimeout(() => {
            lastSentMessageRef.current = "";
          }, 3003);
          
        } else {
          console.error('Errore invio messaggio:', data.error);
        }
      }
    } catch (error) {
      console.error("Errore invio messaggio:", error);
    } finally {
      setIsSending(false);
    }
  };

  // Handle Enter key
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Effects
  useEffect(() => {
    if (!user?.token) {
      console.log('Waiting for user authentication...');
      return;
    }

    console.log('User authenticated, initializing chat...');
    fetchMessages();
    initSocket();

    // Cleanup function
    return () => {
      if (socket?.connected) {
        socket.disconnect();
        console.log('Socket disconnessa manualmente');
      }
    };
  }, [event.id, user?.token]);

  // Se non c'è utente, mostra loading
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

  return (
    <div className="pt-8 border-t border-white/10">
      {/* Header */}
      <div className="mb-6">
        <h3 className="text-2xl font-bold text-white flex items-center gap-3">
          <FaComments className="text-3xl" />
          <span>Chat dell'evento</span>
        </h3>
        <p className="text-white/60 mt-2 flex items-center gap-2">
          <span>{messages.length} messaggi</span>
          <span>•</span>
          <span className="inline-flex items-center gap-1">
            <FaCircle className={`text-[10px] ${socket?.connected ? 'text-green-400' : 'text-red-400'}`} />
            <span>{socket?.connected ? 'Online' : 'Offline'}</span>
          </span>
        </p>
      </div>

      {/* Chat Container */}
      <div className="bg-gray-800/50 border border-white/10 rounded-xl overflow-hidden">
        {/* Messages Area */}
        <div 
          ref={messagesContainerRef}
          className="h-96 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent"
        >
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-2"></div>
                <p className="text-white/60 text-sm">Caricamento messaggi...</p>
              </div>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-white/40">
                <FaComments className="text-4xl mb-2 block mx-auto" />
                <p>Nessun messaggio ancora</p>
                <p className="text-sm">Invia il primo messaggio!</p>
              </div>
            </div>
          ) : (
            messages.map((msg, index) => (
              <div key={index} className="flex items-start gap-3">
                {/* Avatar */}
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-semibold text-sm">
                    {((msg.sender.nickname && msg.sender.nickname[0]) 
                      || (msg.sender.name && msg.sender.name[0]) 
                      || 'U').toUpperCase()}
                  </span>
                </div>

                {/* Message Content */}
                <div className="flex-1 min-w-0">
                  {/* Se il messaggio contiene una playlist Spotify */}
                  {msg.spotify_playlist ? (
                    <div className="bg-green-900/30 border border-green-500/30 rounded-lg p-4">
                      <div className="text-green-300 font-medium text-sm mb-2">
                        <span className="inline-flex items-center gap-2">
                          <FaMusic />
                          <span>{msg.sender.nickname || msg.sender.name} ha messo in coda una canzone:</span>
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        {msg.spotify_playlist.cover ? (
                          <img 
                            src={msg.spotify_playlist.cover} 
                            alt="cover"
                            className="w-12 h-12 rounded object-cover"
                          />
                        ) : (
                          <div className="w-12 h-12 bg-white/10 rounded flex items-center justify-center">
                            <FaMusic className="text-2xl" />
                          </div>
                        )}
                        <div>
                          <div className="text-white font-medium">
                            {msg.spotify_playlist.title || 'Titolo sconosciuto'}
                          </div>
                          <div className="text-white/60 text-sm">
                            {msg.spotify_playlist.subtitle || 'Artista sconosciuto'}
                          </div>
                        </div>
                      </div>
                      {msg.message && (
                        <div className="mt-3 text-white/80 text-sm">
                          <strong>Dedica:</strong> {msg.message}
                        </div>
                      )}
                      <div className="text-white/40 text-xs mt-2">
                        {new Date(msg.created_at).toLocaleTimeString('it-IT', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </div>
                  ) : (
                    /* Messaggio normale */
                    <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-blue-300 font-medium text-sm">
                          {msg.sender.nickname || msg.sender.name || 'Utente'}
                        </span>
                        <span className="text-white/40 text-xs">
                          {new Date(msg.created_at).toLocaleTimeString('it-IT', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                      <div className="text-white text-sm">
                        {msg.message}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

      </div>
    </div>
  );
}
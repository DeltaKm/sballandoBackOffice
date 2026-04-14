"use client";

import { useState } from "react";
import { useAuthStore } from "~/store/auth";
import { FaBullhorn, FaUsers, FaCheckCircle, FaInfoCircle, FaPaperPlane, FaTimes } from 'react-icons/fa';

interface NotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: number;
  eventTitle: string;
  subscribersCount?: number;
}

export function NotificationModal({ 
  isOpen, 
  onClose, 
  eventId, 
  eventTitle, 
  subscribersCount = 0 
}: NotificationModalProps) {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const user = useAuthStore((state) => state.user);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.token) return;

    setLoading(true);
    try {
      const res = await fetch('/api/notifications/send-to-event-subscribers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          event_id: eventId,
          title: title.trim(),
          message: message.trim(),
          user_token: user.token
        }),
      });

      if (res.ok) {
        setSuccess(true);
        setTimeout(() => {
          handleClose();
        }, 2000);
      } else {
        const error = await res.json();
        alert(error.error || 'Errore durante l\'invio della notifica');
      }
    } catch (err) {
      console.error('Error sending notification:', err);
      alert('Errore di connessione');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setTitle("");
    setMessage("");
    setSuccess(false);
    setLoading(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#212938] border border-white/20 rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="border-b border-white/10 p-6">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-xl font-bold text-white mb-2">
                <span className="inline-flex items-center gap-2">
                  <FaBullhorn />
                  <span>Invia Notifica</span>
                </span>
              </h2>
              <p className="text-white/60 text-sm">
                Invia una notifica personalizzata a tutti gli iscritti all'evento "{eventTitle}"
              </p>
              {subscribersCount > 0 && (
                <div className="mt-2 flex items-center gap-2">
                  <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded-full text-xs">
                    <span className="inline-flex items-center gap-1">
                      <FaUsers />
                      <span>{subscribersCount} iscritti</span>
                    </span>
                  </span>
                </div>
              )}
            </div>
            <button
              onClick={handleClose}
              className="text-white/60 hover:text-white transition-colors"
            >
              <FaTimes />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {success ? (
            <div className="text-center">
              <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mb-4 mx-auto">
                <FaCheckCircle className="text-green-400 text-2xl" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">
                Notifica Inviata!
              </h3>
              <p className="text-white/60 text-sm">
                La notifica è stata inviata con successo a tutti gli iscritti all'evento.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Titolo */}
              <div>
                <label className="block text-white/80 text-sm font-medium mb-2">
                  Titolo Notifica *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-[#FC0045]"
                  placeholder="Es. Aggiornamento importante!"
                  required
                  maxLength={100}
                />
                <div className="flex justify-end mt-1">
                  <span className={`text-xs ${title.length > 80 ? 'text-yellow-400' : 'text-white/60'}`}>
                    {title.length}/100 caratteri
                  </span>
                </div>
              </div>

              {/* Messaggio */}
              <div>
                <label className="block text-white/80 text-sm font-medium mb-2">
                  Messaggio *
                </label>
                <textarea
                  value={message}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value.length <= 500) {
                      setMessage(value);
                    }
                  }}
                  rows={4}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-[#FC0045] resize-none"
                  placeholder="Scrivi qui il messaggio che vuoi inviare agli iscritti..."
                  required
                  maxLength={500}
                />
                <div className="flex justify-end mt-1">
                  <span 
                    className={`text-xs ${
                      message.length > 450 
                        ? message.length >= 500 
                          ? "text-red-400" 
                          : "text-yellow-400"
                        : "text-white/60"
                    }`}
                  >
                    {message.length}/500 caratteri
                  </span>
                </div>
              </div>

              {/* Info box */}
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <FaInfoCircle className="text-blue-400 text-sm mt-0.5" />
                  <div className="text-blue-400 text-xs">
                    <p className="font-medium mb-1">Informazioni sull'invio:</p>
                    <ul className="space-y-1 text-blue-300/80">
                      <li>• La notifica sarà inviata immediatamente</li>
                      <li>• Solo gli utenti iscritti all'evento la riceveranno</li>
                      <li>• Non è possibile annullare l'invio una volta confermato</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleClose}
                  className="flex-1 px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors"
                  disabled={loading}
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  disabled={loading || !title.trim() || !message.trim()}
                  className="flex-1 px-4 py-2 bg-[#FC0045] text-white rounded-lg hover:bg-[#FC0045]/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Invio...
                    </>
                  ) : (
                    <>
                      <FaPaperPlane className="text-sm" />
                      <span>Invia Notifica</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

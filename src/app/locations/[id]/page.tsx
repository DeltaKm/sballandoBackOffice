"use client";

import { useEffect, useState, use } from "react";
import { useAuthStore } from "~/store/auth";
import Link from "next/link";
import { EventCard } from "~/components/EventCard";
import type { Location, Event } from "~/types";

export default function LocationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const user = useAuthStore((state) => state.user);

  const [location, setLocation] = useState<Location & { events: Event[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.token) {
      setError("Devi essere loggato per visualizzare questa pagina");
      setLoading(false);
      return;
    }

    fetch(`/api/locations/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_token: user.token }),
    })
      .then(async (res) => { 
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || "Errore nel caricamento");
        }
        return res.json();
      })
      .then((data) => {
        setLocation(data);
        setError(null);
      })
      .catch((err) => {
        setError(err.message);
        setLocation(null);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [id, user?.token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white">Caricamento locale...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mb-4 mx-auto">
            <span className="text-red-400 text-2xl">⚠️</span>
          </div>
          <p className="text-red-400 mb-4">{error}</p>
          <Link href="/" className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
            Torna alla Home
          </Link>
        </div>
      </div>
    );
  }

  if (!location) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400">Locale non trovato</p>
        </div>
      </div>
    );
  }

  const now = new Date();
  const futureEvents = Array.isArray(location.events)
    ? location.events.filter(e => {
        const eventDate = new Date(e.datetime_start || "");
        return eventDate >= now;
      })
    : [];

  const pastEvents = Array.isArray(location.events)
    ? location.events.filter(e => {
        const eventDate = new Date(e.datetime_start || "");
        return eventDate < now;
      })
    : [];

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header locale */}
        <div className="mb-8">
          <div className="flex items-start gap-6 mb-6">
            {location.cover && (
              <img
                src={location.cover}
                alt={location.name}
                className="w-32 h-32 object-cover rounded-lg border border-white/20"
              />
            )}
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-white mb-2">{location.name}</h1>
              <p className="text-white/80 text-lg mb-2">
                📍 {location.address}{location.city && `, ${location.city}`}
              </p>
              {location.description && (
                <p className="text-white/60">{location.description}</p>
              )}
            </div>
          </div>

          {/* Statistiche */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="p-4 bg-white/5 border border-white/10 rounded-lg text-center">
              <div className="text-2xl font-bold text-[#FC0045]">{location.events.length}</div>
              <div className="text-white/60 text-sm">Eventi Totali</div>
            </div>
            <div className="p-4 bg-white/5 border border-white/10 rounded-lg text-center">
              <div className="text-2xl font-bold text-blue-400">{futureEvents.length}</div>
              <div className="text-white/60 text-sm">Eventi Futuri</div>
            </div>
            <div className="p-4 bg-white/5 border border-white/10 rounded-lg text-center">
              <div className="text-2xl font-bold text-orange-400">{pastEvents.length}</div>
              <div className="text-white/60 text-sm">Eventi Passati</div>
            </div>
          </div>
        </div>

        {/* Eventi futuri */}
        <div className="mb-10">
          <h2 className="text-2xl font-semibold text-[#FC0045] mb-6 flex items-center gap-2">
            🔮 Eventi Futuri
          </h2>
          {futureEvents.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {futureEvents.map(event => (
                <EventCard 
                  key={event.id} 
                  event={event}
                  showEditButton={true}
                  className="hover:border-blue-500/40 hover:bg-blue-500/5"
                />
              ))}
            </div>
          ) : (
            <div className="p-8 bg-white/5 border border-white/10 rounded-lg text-center">
              <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mb-4 mx-auto">
                <span className="text-blue-400 text-2xl">📅</span>
              </div>
              <p className="text-white/60">Nessun evento futuro programmato</p>
            </div>
          )}
        </div>

        {/* Eventi passati */}
        <div>
          <h2 className="text-2xl font-semibold text-white mb-6 flex items-center gap-2">
            📚 Eventi Passati
          </h2>
          {pastEvents.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {pastEvents.map(event => (
                <EventCard 
                  key={event.id} 
                  event={event}
                  showEditButton={true}
                  className="opacity-75 hover:opacity-100 hover:border-orange-500/40 hover:bg-orange-500/5 transition-all"
                />
              ))}
            </div>
          ) : (
            <div className="p-8 bg-white/5 border border-white/10 rounded-lg text-center">
              <div className="w-16 h-16 bg-orange-500/20 rounded-full flex items-center justify-center mb-4 mx-auto">
                <span className="text-orange-400 text-2xl">📖</span>
              </div>
              <p className="text-white/60">Nessun evento passato</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
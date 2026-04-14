"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuthRedirect } from "~/lib/useAuth";
import { getLocationLogoUrl } from "~/lib/imageUtils";
import Link from "next/link";
import { EventCard } from "~/components/EventCard";
import {
  FaExclamationTriangle,
  FaMapMarkerAlt,
  FaCreditCard,
  FaCheckCircle,
  FaLink,
  FaTicketAlt,
  FaLock,
  FaChartBar,
  FaEuroSign,
  FaRocket,
  FaEdit,
  FaTrash,
  FaMagic,
  FaCalendarAlt,
  FaBook,
  FaBookOpen,
} from "react-icons/fa";
import type { location_, Event } from "~/types";

export default function locationPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const auth = useAuthRedirect();
  const user = auth.user;

  const [location_, setlocation] = useState<location_ & { events: Event[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [isPaymentLoading, setIsPaymentLoading] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  useEffect(() => {
    const fetchLocation = async () => {
      if (!user?.token) {
        setError("Devi essere loggato per visualizzare questa pagina");
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(`/api/locations/${id}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user_token: user.token }),
        });

        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || "Errore nel caricamento");
        }

        const data = await res.json();
        setlocation(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Errore sconosciuto");
        setlocation(null);
      } finally {
        setLoading(false);
      }
    };

    // Fetch solo se l'autenticazione è inizializzata
    if (auth.isAuthenticated && id) {
      fetchLocation();
    } else if (auth.isInitialized && !auth.isAuthenticated) {
      setError("Devi essere loggato per visualizzare questa pagina");
      setLoading(false);
    }
  }, [id, auth.isAuthenticated, auth.isInitialized, user?.token]);

  const handleDeleteLocation = async () => {
    if (!location_ || !user?.token) return;

    // Doppia conferma per sicurezza
    const confirmed = confirm(
      `ATTENZIONE: Vuoi davvero eliminare il locale "${location_.name}"?\n\n` +
      `Questa azione è IRREVERSIBILE e eliminerà:\n` +
      `• Il locale e tutti i suoi dati\n` +
      `• Tutte le informazioni associate\n\n` +
      `Digita "ELIMINA" per confermare:`
    );

    if (!confirmed) return;

    const confirmation = prompt('Digita "ELIMINA" per confermare la cancellazione:');
    if (confirmation !== 'ELIMINA') {
      alert('Cancellazione annullata. Il testo non corrisponde.');
      return;
    }

    setDeleting(true);

    try {
      const res = await fetch(`/api/locations/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_token: user.token }),
      });

      if (res.ok) {
        const result = await res.json();
        alert(`Locale "${result.deletedLocation.name}" eliminato con successo!`);
        router.push('/locations');
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
      setDeleting(false);
    }
  };

  const handleActivatePayment = async () => {
    if (!location_ || !user?.token) return;
    
    setIsPaymentLoading(true);
    setShowConfirmModal(false);

    try {
      const res = await fetch('/api/payments/createMerchantLink', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          user_token: user.token,
          location_id: location_.id 
        }),
      });

      const data = await res.json();
      console.log('Merchant link response:', data);

      if (res.ok && data.link_stripe_created) {
        // Redirect to Stripe onboarding
        window.location.href = data.link_stripe_created;
      } else {
        alert(`Errore: ${data.error || 'Impossibile creare il link Stripe'}`);
      }
    } catch (err) {
      console.error('Error creating merchant link:', err);
      alert('Errore di connessione durante l\'attivazione dei pagamenti');
    } finally {
      setIsPaymentLoading(false);
    }
  };

  const handleGoToStripeAccount = () => {
    if (location_?.stripe_account?.id) {
      window.open(`https://dashboard.stripe.com/connect/accounts/${location_.stripe_account.id}`, '_blank');
    }
  };

  // Se non è ancora inizializzato, mostra loading
  if (auth.isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white">Caricamento autenticazione...</p>
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
            <FaExclamationTriangle className="text-red-400 text-2xl" />
          </div>
          <p className="text-red-400 mb-4">{error}</p>
          <Link href="/" className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
            Torna alla Home
          </Link>
        </div>
      </div>
    );
  }

  if (!location_) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400">Locale non trovato</p>
        </div>
      </div>
    );
  }

  const now = new Date();
  const futureEvents = Array.isArray(location_.events)
    ? location_.events.filter(e => {
        const eventDate = new Date(e.datetime_start || "");
        return eventDate >= now;
      })
    : [];

  const pastEvents = Array.isArray(location_.events)
    ? location_.events.filter(e => {
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
            {getLocationLogoUrl(location_) && (
              <img
                src={getLocationLogoUrl(location_)!}
                alt={location_.name}
                className="w-32 h-32 object-cover rounded-lg border border-white/20"
              />
            )}
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-white mb-2">{location_.name}</h1>
              <p className="text-white/80 text-lg mb-2 inline-flex items-center gap-2">
                <FaMapMarkerAlt />
                <span>{location_.address}{location_.comune && `, ${location_.comune}`}</span>
              </p>
              {location_.description && (
                <p className="text-white/60">{location_.description}</p>
              )}
            </div>
          </div>

          {/* Statistiche */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
            <div className="p-4 bg-white/5 border border-white/10 rounded-lg text-center">
              <div className="text-2xl font-bold text-[#FC0045]">{location_.events.length}</div>
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

          {/* Sezione Pagamenti Stripe */}
          <div className="mb-6 p-6 bg-white/5 border border-white/10 rounded-lg">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <FaCreditCard />
              <span>Gestione Pagamenti</span>
            </h3>
            
            {location_.stripe_account?.active ? (
              // Stato Attivo
              <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-5">
                <div className="flex items-center gap-3 mb-4">
                  <FaCheckCircle className="text-2xl" />
                  <div>
                    <div className="text-green-400 font-semibold text-lg">Pagamenti Attivi</div>
                    <div className="text-white/60 text-sm">Account Stripe connesso e attivo</div>
                  </div>
                </div>
                
                {location_.stripe_account?.id && (
                  <div className="mb-4 p-3 bg-white/5 rounded">
                    <div className="text-white/60 text-xs mb-1">Account ID</div>
                    <div className="text-white font-mono text-sm">{location_.stripe_account.id}</div>
                  </div>
                )}

                <button
                  onClick={handleGoToStripeAccount}
                  className="w-full px-4 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors flex items-center justify-center gap-2 font-medium"
                >
                  <FaLink />
                  Vai al Dashboard Stripe
                </button>
              </div>
            ) : (
              // Stato Inattivo
              <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-5">
                <div className="flex items-center gap-3 mb-4">
                  <FaExclamationTriangle className="text-2xl" />
                  <div>
                    <div className="text-orange-400 font-semibold text-lg">Pagamenti Non Attivi</div>
                    <div className="text-white/60 text-sm">Abilita i pagamenti per vendere biglietti</div>
                  </div>
                </div>

                <div className="mb-4 p-4 bg-white/5 rounded-lg">
                  <div className="text-white/80 font-medium mb-3">Vantaggi dell'attivazione:</div>
                  <ul className="space-y-2 text-white/70 text-sm">
                    <li className="flex items-start gap-2">
                      <FaTicketAlt className="mt-0.5" />
                      <span>Vendere biglietti direttamente dall'app Sballando</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <FaLock className="mt-0.5" />
                      <span>Pagamenti sicuri gestiti da Stripe, leader mondiale nei pagamenti online</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <FaChartBar className="mt-0.5" />
                      <span>Dashboard completa per gestire i tuoi ricavi e transazioni</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <FaEuroSign className="mt-0.5" />
                      <span>Accredito diretto sul tuo conto corrente</span>
                    </li>
                  </ul>
                </div>

                <button
                  onClick={() => setShowConfirmModal(true)}
                  disabled={isPaymentLoading}
                  className={`w-full px-4 py-3 rounded-lg transition-colors flex items-center justify-center gap-2 font-medium ${
                    isPaymentLoading
                      ? 'bg-orange-500/30 text-orange-300 cursor-not-allowed'
                      : 'bg-orange-500 hover:bg-orange-600 text-white'
                  }`}
                >
                  {isPaymentLoading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-orange-300/30 border-t-orange-300 rounded-full animate-spin"></div>
                      Attivazione in corso...
                    </>
                  ) : (
                    <>
                      <FaRocket />
                      <span>Attiva Pagamenti con Stripe</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Bottoni di azione */}
          <div className="flex flex-wrap gap-3 justify-center md:justify-start">
            {/* Debug info - RIMUOVERE IN PRODUZIONE */}
            <div className="w-full mb-4 p-3 bg-yellow-500/20 border border-yellow-400/30 rounded-lg text-yellow-300 text-sm">
              <strong>Debug Info:</strong> User role: {user?.role || 'undefined'} | 
              Is SUPERADMIN: {user?.role === 'SUPERADMIN' ? 'YES' : 'NO'} | 
              User email: {user?.email || 'undefined'}
            </div>

            {/* Pulsante Modifica (sempre visibile) */}
            <Link
              href={`/locations/${id}/update`}
              className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2"
            >
              <FaEdit />
              <span>Modifica Locale</span>
            </Link>

            {/* Pulsante Elimina (solo per SUPERADMIN) */}
            {user?.role === 'SUPERADMIN' && (
              <button
                onClick={handleDeleteLocation}
                disabled={deleting}
                className={`px-6 py-3 rounded-lg transition-colors flex items-center gap-2 ${
                  deleting
                    ? 'bg-red-500/30 text-red-300 cursor-not-allowed'
                    : 'bg-red-500 text-white hover:bg-red-600'
                }`}
                title={deleting ? 'Eliminazione in corso...' : 'Elimina locale (ATTENZIONE: azione irreversibile!)'}
              >
                {deleting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-red-300/30 border-t-red-300 rounded-full animate-spin"></div>
                    Eliminando...
                  </>
                ) : (
                  <>
                    <FaTrash />
                    <span>Elimina Locale</span>
                  </>
                )}
              </button>
            )}

            {/* Pulsante Elimina SEMPRE VISIBILE per debug - RIMUOVERE IN PRODUZIONE */}
            

            {/* Link torna indietro */}
            <Link
              href="/locations"
              className="px-6 py-3 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors flex items-center gap-2"
            >
              <span>←</span>
              Torna ai Locali
            </Link>
          </div>
        </div>

        {/* Eventi futuri */}
        <div className="mb-10">
          <h2 className="text-2xl font-semibold text-[#FC0045] mb-6 flex items-center gap-2">
            <FaMagic />
            <span>Eventi Futuri</span>
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
                <FaCalendarAlt className="text-blue-400 text-2xl" />
              </div>
              <p className="text-white/60">Nessun evento futuro programmato</p>
            </div>
          )}
        </div>

        {/* Eventi passati */}
        <div>
          <h2 className="text-2xl font-semibold text-white mb-6 flex items-center gap-2">
            <FaBook />
            <span>Eventi Passati</span>
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
                <FaBookOpen className="text-orange-400 text-2xl" />
              </div>
              <p className="text-white/60">Nessun evento passato</p>
            </div>
          )}
        </div>
      </div>

      {/* Modale Conferma Attivazione Pagamenti */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 border border-white/20 rounded-lg max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-white mb-4 inline-flex items-center gap-2">
              <FaRocket />
              <span>Attivazione Pagamenti</span>
            </h3>
            
            <div className="text-white/80 mb-6 space-y-3 text-sm">
              <p>
                Per abilitare la vendita dei biglietti nel tuo locale, è necessario attivare i pagamenti.
              </p>
              <p>
                Verrai reindirizzato su <strong className="text-blue-400">Stripe</strong>, una piattaforma esterna sicura, 
                per completare la registrazione del tuo account.
              </p>
              <p>
                Una volta attivato, potrai creare ingressi e vendere i tuoi biglietti direttamente dall'app Sballando.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 px-4 py-3 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors font-medium"
              >
                Annulla
              </button>
              <button
                onClick={handleActivatePayment}
                disabled={isPaymentLoading}
                className={`flex-1 px-4 py-3 rounded-lg transition-colors font-medium ${
                  isPaymentLoading
                    ? 'bg-blue-500/30 text-blue-300 cursor-not-allowed'
                    : 'bg-blue-500 hover:bg-blue-600 text-white'
                }`}
              >
                {isPaymentLoading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-blue-300/30 border-t-blue-300 rounded-full animate-spin"></div>
                    Caricamento...
                  </div>
                ) : (
                  'Attiva Pagamenti'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
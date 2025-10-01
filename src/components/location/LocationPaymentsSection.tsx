"use client";

import { useState } from "react";
import { useAuthStore } from "~/store/auth";
import type { location_ } from "~/types";

interface locationPaymentsSectionProps {
  location_: location_;
  onUpdate?: (updatedlocation: location_) => void;
}

export function locationPaymentsSection({ location_, onUpdate }: locationPaymentsSectionProps) {
  const { user } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [confirmModal, setConfirmModal] = useState(false);

  // Verifica se i pagamenti sono attivi per questa location_
  const isPaymentActive = location_.stripe_account?.active || false;

  const createMerchantLink = async (userToken: string, locationId: number) => {
    try {
      const response = await fetch('/api/payments/createMerchantLink', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          location_id: locationId,
          user_token: userToken,
        })
      });

      const json = await response.json();
      
      if (json && json.status) {
        console.log('✅ Merchant link response:', json);
        return json;
      } else {
        throw new Error(json.error || 'Errore durante la creazione del link');
      }
    } catch (error) {
      console.error('❌ Error creating merchant link:', error);
      throw error;
    }
  };

  const fetchCreateMerchantLink = async () => {
    if (!user?.token || !location_.id) {
      alert('Dati mancanti per attivare i pagamenti');
      return;
    }

    try {
      setIsLoading(true);
      const response = await createMerchantLink(user.token, location_.id);
      
      console.log('📊 Merchant link response:', response);
      
      if (response.status && response.link_stripe_created) {
        // Reindirizza a Stripe per completare l'attivazione

      } else {
        alert('Errore nel recupero del link Stripe');
      }
    } catch (error) {
      console.error('Error fetching merchant link:', error);
      alert('Errore durante l\'attivazione dei pagamenti. Riprova.');
    } finally {
      setIsLoading(false);
    }
  };

  const activePayment = () => {
    setConfirmModal(true);
  };

  const goToStripeAccount = () => {
    if (location_.stripe_account?.id) {
      window.open(
        `https://dashboard.stripe.com/connect/accounts/${location_.stripe_account.id}`, 
        '_blank'
      );
    }
  };

  const closeConfirmModal = () => {
    setConfirmModal(false);
  };

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-white flex items-center gap-3">
          <span className="text-2xl">💳</span>
          Gestione Pagamenti
        </h3>
        
        {/* Stato Pagamenti */}
        <div className="flex items-center gap-3">
          {isPaymentActive ? (
            <div className="flex items-center gap-2 px-3 py-1 bg-green-500/20 border border-green-500/30 rounded-lg">
              <span className="text-green-400 text-sm">✅</span>
              <span className="text-green-300 font-medium text-sm">Pagamenti Attivi</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-1 bg-orange-500/20 border border-orange-500/30 rounded-lg">
              <span className="text-orange-400 text-sm">⚠️</span>
              <span className="text-orange-300 font-medium text-sm">Pagamenti Non Attivi</span>
            </div>
          )}
        </div>
      </div>

      {!isPaymentActive ? (
        /* Pagamenti Non Attivi */
        <div className="text-center space-y-4">
          <div className="text-4xl mb-3">💳</div>
          
          <div>
            <h4 className="text-white font-semibold text-lg mb-2">Attiva i Pagamenti In-App</h4>
            <p className="text-white/70 text-sm max-w-xl mx-auto leading-relaxed">
              Per abilitare la vendita dei biglietti in questo locale, è necessario attivare i pagamenti. 
              Verrai reindirizzato su Stripe per completare la registrazione in sicurezza.
            </p>
          </div>

          {/* Vantaggi compatti */}
          <div className="grid grid-cols-3 gap-3 mt-6">
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 text-center">
              <span className="text-blue-400 text-xl block mb-1">🎫</span>
              <h5 className="text-blue-300 font-medium text-xs">Vendi Biglietti</h5>
              <p className="text-blue-400/80 text-xs">Direttamente dall'app</p>
            </div>
            
            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 text-center">
              <span className="text-green-400 text-xl block mb-1">🔒</span>
              <h5 className="text-green-300 font-medium text-xs">Pagamenti Sicuri</h5>
              <p className="text-green-400/80 text-xs">Gestiti da Stripe</p>
            </div>
            
            <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-3 text-center">
              <span className="text-purple-400 text-xl block mb-1">📊</span>
              <h5 className="text-purple-300 font-medium text-xs">Gestione Ricavi</h5>
              <p className="text-purple-400/80 text-xs">Dashboard completa</p>
            </div>
          </div>

          {/* Bottone Attiva */}
          <div className="pt-4">
            <button
              onClick={activePayment}
              disabled={isLoading}
              className="px-6 py-3 bg-[#FC0045] text-white rounded-xl hover:bg-[#FC0045]/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3 text-base font-semibold mx-auto"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Attivando...
                </>
              ) : (
                <>
                  <span className="text-lg">🚀</span>
                  Attiva Pagamenti
                </>
              )}
            </button>
          </div>
        </div>
      ) : (
        /* Pagamenti Attivi */
        <div className="text-center space-y-4">
          <div className="text-4xl mb-3">✅</div>
          
          <div>
            <h4 className="text-white font-semibold text-lg mb-2">Pagamenti Già Attivi</h4>
            <p className="text-white/70 text-sm max-w-lg mx-auto">
              I pagamenti sono già configurati per questo locale. Puoi gestire le transazioni e visualizzare i ricavi.
            </p>
          </div>

          {/* Info Account Stripe */}
          {location_.stripe_account?.id && (
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 max-w-sm mx-auto">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-blue-400 text-lg">🏦</span>
                <span className="text-blue-300 font-medium text-sm">Account Stripe</span>
              </div>
              <p className="text-blue-400/80 text-xs font-mono break-all">{location_.stripe_account.id}</p>
            </div>
          )}

          {/* Statistiche Pagamenti se disponibili */}
          {location_.stripe_account && (
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
                <span className="text-green-400 text-lg block mb-1">💰</span>
                <h5 className="text-green-300 font-medium text-sm">Status</h5>
                <p className="text-green-400/80 text-xs">
                  {location_.stripe_account.active ? 'Completamente Attivo' : 'In Configurazione'}
                </p>
              </div>
              
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                <span className="text-blue-400 text-lg block mb-1">📈</span>
                <h5 className="text-blue-300 font-medium text-sm">Transazioni</h5>
                <p className="text-blue-400/80 text-xs">Dashboard Stripe</p>
              </div>
            </div>
          )}

          {/* Bottone Dashboard Stripe */}
          <div className="pt-2">
            <button
              onClick={goToStripeAccount}
              className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm font-medium mx-auto"
            >
              <span className="text-base">🔗</span>
              Vai al tuo Account Stripe
            </button>
          </div>
        </div>
      )}

      {/* Modal di Conferma */}
      {confirmModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900 border border-white/20 rounded-lg p-6 max-w-md w-full mx-4">
            {/* Header */}
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-shrink-0 w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center">
                <span className="text-blue-400 text-lg">💳</span>
              </div>
              <div>
                <h3 className="text-white font-semibold">Attivazione dei Pagamenti In-App</h3>
                <p className="text-white/60 text-sm">Configurazione account Stripe per {location_.name}</p>
              </div>
            </div>

            {/* Content */}
            <div className="mb-6">
              <p className="text-white/80 text-sm leading-relaxed mb-4">
                Per abilitare la vendita dei biglietti in <span className="font-semibold text-[#FC0045]">{location_.name}</span>, è necessario attivare i pagamenti. 
                Verrai reindirizzato su <span className="font-semibold text-blue-400">Stripe</span>, una piattaforma esterna sicura, per completare la registrazione del tuo account.
              </p>
              
              <p className="text-white/80 text-sm leading-relaxed">
                Una volta attivato, potrai creare eventi con ingressi a pagamento e vendere i biglietti direttamente dall'app.
              </p>

              <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <h4 className="text-blue-400 font-medium text-sm mb-2">✨ Cosa succederà:</h4>
                <ul className="text-blue-300 text-xs space-y-1">
                  <li className="flex items-center gap-2">
                    <span>1️⃣</span>
                    <span>Reindirizzamento sicuro a Stripe</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span>2️⃣</span>
                    <span>Configurazione account pagamenti</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span>3️⃣</span>
                    <span>Ritorno automatico all'app</span>
                  </li>
                </ul>
              </div>

              {/* Info Locale */}
              <div className="mt-4 p-3 bg-gray-500/10 border border-gray-500/20 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-gray-400 text-sm">🏢</span>
                  <span className="text-gray-300 font-medium text-sm">{location_.name}</span>
                </div>
                <p className="text-gray-400 text-xs">
                  📍 {location_.address}
                  {location_.comune && `, ${location_.comune}`}
                </p>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-3">
              <button
                onClick={closeConfirmModal}
                disabled={isLoading}
                className="flex-1 px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors disabled:opacity-50"
              >
                Annulla
              </button>
              <button
                onClick={() => {
                  closeConfirmModal();
                  fetchCreateMerchantLink();
                }}
                disabled={isLoading}
                className="flex-1 px-4 py-2 bg-[#FC0045] text-white rounded-lg hover:bg-[#FC0045]/80 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Attivando...
                  </>
                ) : (
                  <>
                    🚀 Continua con Stripe
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
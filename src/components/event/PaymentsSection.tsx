"use client";

import { useState } from "react";
import { useAuthStore } from "~/store/auth";
import type { Event, location_ } from "~/types";

interface PaymentsSectionProps {
    event: Event;
    onUpdate?: (updatedEvent: Event) => void;
}

export function PaymentsSection({ event, onUpdate }: PaymentsSectionProps) {
    const { user } = useAuthStore();
    const [isLoading, setIsLoading] = useState(false);
    const [confirmModal, setConfirmModal] = useState(false);

    // Verifica se i pagamenti sono attivi per la location_ dell'evento
    const isPaymentActive = event.location_?.stripe_account?.active || false;

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
        if (!user?.token || !event.location_?.id) {
            alert('Dati mancanti per attivare i pagamenti');
            return;
        }

        try {
            setIsLoading(true);
            const response = await createMerchantLink(user.token, event.location_.id);

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
        if (event.location_?.stripe_account?.id) {
            window.open(
                `https://dashboard.stripe.com/connect/accounts/${event.location_.stripe_account.id}`,
                '_blank'
            );
        }
    };

    const closeConfirmModal = () => {
        setConfirmModal(false);
    };

    return (
        <div className="pt-8 border-t border-white/10">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-white flex items-center gap-3">
                    <span className="text-3xl">💳</span>
                    Gestione Pagamenti
                </h3>

                {/* Stato Pagamenti */}
                <div className="flex items-center gap-3">
                    {isPaymentActive ? (
                        <div className="flex items-center gap-2 px-4 py-2 bg-green-500/20 border border-green-500/30 rounded-xl">
                            <span className="text-green-400 text-xl">✅</span>
                            <span className="text-green-300 font-semibold">Pagamenti Attivi</span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 px-4 py-2 bg-orange-500/20 border border-orange-500/30 rounded-xl">
                            <span className="text-orange-400 text-xl">⚠️</span>
                            <span className="text-orange-300 font-semibold">Pagamenti Non Attivi</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Contenuto */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                {!isPaymentActive ? (
                    /* Pagamenti Non Attivi */
                    <div className="text-center space-y-6">
                        <div className="text-6xl mb-4">💳</div>

                        <div>
                            <h4 className="text-white font-bold text-xl mb-2">Attiva i Pagamenti In-App</h4>
                            <p className="text-white/70 text-sm max-w-2xl mx-auto leading-relaxed">
                                Per abilitare la vendita dei biglietti per questo evento, è necessario attivare i pagamenti.
                                Verrai reindirizzato su Stripe per completare la registrazione in sicurezza.
                            </p>
                        </div>

                        {/* Vantaggi */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
                            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                                <span className="text-blue-400 text-2xl block mb-2">🎫</span>
                                <h5 className="text-blue-300 font-semibold text-sm">Vendi Biglietti</h5>
                                <p className="text-blue-400/80 text-xs mt-1">Direttamente dall'app</p>
                            </div>

                            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                                <span className="text-green-400 text-2xl block mb-2">🔒</span>
                                <h5 className="text-green-300 font-semibold text-sm">Pagamenti Sicuri</h5>
                                <p className="text-green-400/80 text-xs mt-1">Gestiti da Stripe</p>
                            </div>

                            <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-4">
                                <span className="text-purple-400 text-2xl block mb-2">📊</span>
                                <h5 className="text-purple-300 font-semibold text-sm">Gestione Ricavi</h5>
                                <p className="text-purple-400/80 text-xs mt-1">Dashboard completa</p>
                            </div>
                        </div>

                        {/* Bottone Attiva */}
                        <button
                            onClick={activePayment}
                            disabled={isLoading}
                            className="px-8 py-4 bg-[#FC0045] text-white rounded-xl hover:bg-[#FC0045]/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3 text-lg font-semibold mx-auto"
                        >
                            {isLoading ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    Attivando...
                                </>
                            ) : (
                                <>
                                    <span className="text-xl">🚀</span>
                                    Attiva Pagamenti
                                </>
                            )}
                        </button>
                    </div>
                ) : (
                    /* Pagamenti Attivi */
                    <div className="text-center space-y-6">
                        <div className="text-6xl mb-4">✅</div>

                        <div>
                            <h4 className="text-white font-bold text-xl mb-2">Pagamenti Già Attivi</h4>
                            <p className="text-white/70 text-sm max-w-xl mx-auto">
                                I pagamenti sono già configurati per questo locale. Puoi gestire le transazioni e visualizzare i ricavi.
                            </p>
                        </div>

                        {/* Info Account Stripe */}
                        {event.location_?.stripe_account?.id && (
                            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 max-w-md mx-auto">
                                <div className="flex items-center gap-3 mb-2">
                                    <span className="text-blue-400 text-xl">🏦</span>
                                    <span className="text-blue-300 font-medium">Account Stripe</span>
                                </div>
                                <p className="text-blue-400/80 text-xs font-mono">{event.location_.stripe_account.id}</p>
                            </div>
                        )}

                        {/* Bottone Dashboard Stripe */}
                        <button
                            onClick={goToStripeAccount}
                            className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors flex items-center gap-3 text-base font-medium mx-auto"
                        >
                            <span className="text-lg">🔗</span>
                            Vai al tuo Account Stripe
                        </button>
                    </div>
                )}
            </div>

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
                                <p className="text-white/60 text-sm">Configurazione account Stripe</p>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="mb-6">
                            <p className="text-white/80 text-sm leading-relaxed mb-4">
                                Per abilitare la vendita dei biglietti nel tuo locale, è necessario attivare i pagamenti.
                                Verrai reindirizzato su <span className="font-semibold text-blue-400">Stripe</span>, una piattaforma esterna sicura, per completare la registrazione del tuo account.
                            </p>

                            <p className="text-white/80 text-sm leading-relaxed">
                                Una volta attivato, potrai creare ingressi e vendere i tuoi biglietti direttamente dall'app.
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
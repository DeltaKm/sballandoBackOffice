"use client";

import { useState, useEffect } from "react";
import { useAuthRedirect } from "~/lib/useAuth";
import { useRouter, useParams } from "next/navigation";
import { Sidebar } from "~/components/Sidebar";
import { getEventCoverUrl } from "~/lib/imageUtils";
import {
  FaSearch,
  FaCalendarAlt,
  FaMapMarkerAlt,
  FaEuroSign,
  FaBolt,
  FaTicketAlt,
  FaShoppingBag,
  FaMask,
  FaUser,
  FaChartBar,
  FaEnvelope,
  FaClipboardList,
  FaMoneyBillWave,
  FaTag,
  FaBox,
  FaMobileAlt,
  FaCheckCircle,
  FaTimesCircle,
  FaHourglassHalf,
} from 'react-icons/fa';
import type { Event, Product, EntryType } from "~/types";

interface CollaboratorEventDetail extends Event {
  collaborator: {
    id: number;
    permissions: {
      guest_enabled: boolean;
      vidimate_enabled_product: boolean;
      vidimate_enabled_entry: boolean;
    };
    role: string;
    label: string;
  };
  assigned_products: (Product & {
    sold_count: number;
    validated_count: number;
  })[];
  assigned_entry_types: (EntryType & {
    sold_count: number;
    validated_count: number;
  })[];
  invited_users: Array<{
    id: number;
    name: string;
    surname: string;
    email: string;
    phone: string;
    status: 'pending' | 'accepted' | 'declined';
    created_at: string;
  }>;
  statistics: {
    total_revenue: number;
    products_revenue: number;
    entries_revenue: number;
    products_sold: number;
    entries_sold: number;
    entries_validated: number;
    products_validated: number;
  };
}

export default function CollaboratorEventDetailPage() {
  const [event, setEvent] = useState<CollaboratorEventDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<'overview' | 'products' | 'entries' | 'invitations'>('overview');
  
  const auth = useAuthRedirect();
  const router = useRouter();
  const params = useParams();
  const eventId = params?.id as string;

  useEffect(() => {
    if (auth.isLoading) return;
    if (!auth.user) return;
    if (!eventId) return;
    
    fetchEventDetail();
  }, [auth.user, auth.isLoading, eventId]);

  const fetchEventDetail = async () => {
    if (!auth.user?.token || !eventId) return;

    try {
      setLoading(true);
      setError(""); // Reset error
      console.log('Fetching event detail for ID:', eventId);
      console.log('Using token:', auth.user.token.substring(0, 8) + '...');
      
      const res = await fetch(`/api/events/collaborator-events/${eventId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ user_token: auth.user.token }),
      });

      console.log('Response status:', res.status);
      console.log('Response headers:', Object.fromEntries(res.headers.entries()));

      if (!res.ok) {
        const errorData = await res.json();
        console.error('API Error:', errorData);
        throw new Error(errorData.error || `HTTP ${res.status}: ${res.statusText}`);
      }

      const data = await res.json();
      console.log('Event data received:', data);
      setEvent(data);
    } catch (err: any) {
      const errorMessage = err.message || "Errore nel caricamento dell'evento";
      console.error('Fetch error:', err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('it-IT', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(price);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('it-IT', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (auth.isLoading || loading) {
    return (
      <div className="min-h-screen bg-[#212938] flex">
        <Sidebar />
        <div className="flex-1 ml-64 flex items-center justify-center">
          <div className="text-white flex items-center gap-3">
            <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
            <span>Caricamento evento...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#212938] flex">
        <Sidebar />
        <div className="flex-1 ml-64 flex items-center justify-center">
          <div className="text-center">
            <FaTimesCircle className="text-6xl mb-4 mx-auto text-red-300" />
            <h2 className="text-white text-2xl font-bold mb-2">Errore</h2>
            <p className="text-white/60 mb-6">{error}</p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => router.push('/collaborator-events')}
                className="px-6 py-3 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors"
              >
                Torna agli eventi
              </button>
              <button
                onClick={fetchEventDetail}
                className="px-6 py-3 bg-[#FC0045] text-white rounded-lg hover:bg-[#FC0045]/80 transition-colors"
              >
                Riprova
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-[#212938] flex">
        <Sidebar />
        <div className="flex-1 ml-64 flex items-center justify-center">
          <div className="text-center">
            <FaSearch className="text-6xl mb-4 mx-auto text-white/60" />
            <h2 className="text-white text-2xl font-bold mb-2">Evento non trovato</h2>
            <p className="text-white/60 mb-6">
              L'evento richiesto non esiste o non hai i permessi per visualizzarlo.
            </p>
            <button
              onClick={() => router.push('/collaborator-events')}
              className="px-6 py-3 bg-[#FC0045] text-white rounded-lg hover:bg-[#FC0045]/80 transition-colors"
            >
              Torna agli eventi
            </button>
          </div>
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
          <div className="max-w-7xl mx-auto">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-white/80 text-sm mb-3">
              <button
                onClick={() => router.push('/collaborator-events')}
                className="hover:text-white transition-colors"
              >
                Eventi Collaboratori
              </button>
              <span>›</span>
              <span className="text-white">{event.title}</span>
            </div>
            
            <div className="flex items-center gap-4 mb-4">
              <button
                onClick={() => router.push('/collaborator-events')}
                className="p-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors"
              >
                ←
              </button>
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-white">{event.title}</h1>
                <p className="text-white/80 text-sm">
                  {event.subtitle}
                </p>
              </div>
              <div className="text-right">
                <div className="text-white/80 text-sm">Ruolo:</div>
                <div className="text-white font-semibold">
                  {event.collaborator.label || event.collaborator.role}
                </div>
              </div>
            </div>
            
            {/* Event Info */}
            <div className="flex items-center gap-6 text-white/80 text-sm">
              {event.datetime_start && (
                <div className="flex items-center gap-2">
                  <FaCalendarAlt />
                  <span>{formatDate(event.datetime_start)}</span>
                </div>
              )}
              {event.location_?.name && (
                <div className="flex items-center gap-2">
                  <FaMapMarkerAlt />
                  <span>{event.location_.name}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <FaEuroSign />
                <span>€{formatPrice(event.statistics.total_revenue)} ricavi totali</span>
              </div>
            </div>
          </div>
        </nav>

        {/* Cover Image */}
        {event.cover && (
          <div className="relative h-48 bg-black/20">
            <img
              src={getEventCoverUrl(event) || ''}
              alt={event.title || 'Evento'}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/40"></div>
          </div>
        )}

        {/* Quick Actions Panel */}
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="bg-gray-500/10 border border-gray-500/30 rounded-lg p-4">
            <h3 className="text-gray-200 font-semibold mb-3 flex items-center gap-2">
              <FaBolt />
              <span>Azioni Rapide</span>
            </h3>
            <div className="flex flex-wrap gap-3">
              {event.collaborator.permissions.vidimate_enabled_entry && (
                <button 
                  onClick={() => setActiveTab('entries')}
                  className="px-4 py-2 bg-blue-500/20 text-blue-300 rounded-lg hover:bg-blue-500/30 transition-colors flex items-center gap-2 text-sm"
                >
                  <FaTicketAlt />
                  <span>Gestisci Ingressi ({event.assigned_entry_types.length})</span>
                </button>
              )}
              {event.collaborator.permissions.vidimate_enabled_product && (
                <button 
                  onClick={() => setActiveTab('products')}
                  className="px-4 py-2 bg-green-500/20 text-green-300 rounded-lg hover:bg-green-500/30 transition-colors flex items-center gap-2 text-sm"
                >
                  <FaShoppingBag />
                  <span>Gestisci Prodotti ({event.assigned_products.length})</span>
                </button>
              )}
              {event.collaborator.permissions.guest_enabled && (
                <button 
                  onClick={() => setActiveTab('invitations')}
                  className="px-4 py-2 bg-purple-500/20 text-purple-300 rounded-lg hover:bg-purple-500/30 transition-colors flex items-center gap-2 text-sm"
                >
                  <FaMask />
                  <span>Gestisci Ospiti ({event.invited_users.length})</span>
                </button>
              )}
              <button 
                onClick={() => router.push('/collaborator-events')}
                className="px-4 py-2 bg-white/10 text-white/70 rounded-lg hover:bg-white/20 transition-colors flex items-center gap-2 text-sm"
              >
                ← Torna alla Lista
              </button>
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <FaUser className="text-blue-400 text-2xl" />
              <div className="flex-1">
                <h3 className="text-blue-300 font-semibold mb-1">Le tue responsabilità</h3>
                <div className="flex items-center gap-3 text-sm">
                  {event.collaborator.permissions.guest_enabled && (
                    <span className="px-3 py-1 bg-purple-500/20 text-purple-300 rounded-lg inline-flex items-center gap-2">
                      <FaMask />
                      <span>Gestione Ospiti</span>
                    </span>
                  )}
                  {event.collaborator.permissions.vidimate_enabled_entry && (
                    <span className="px-3 py-1 bg-blue-500/20 text-blue-300 rounded-lg inline-flex items-center gap-2">
                      <FaTicketAlt />
                      <span>Vidimazione Ingressi</span>
                    </span>
                  )}
                  {event.collaborator.permissions.vidimate_enabled_product && (
                    <span className="px-3 py-1 bg-green-500/20 text-green-300 rounded-lg inline-flex items-center gap-2">
                      <FaShoppingBag />
                      <span>Vidimazione Prodotti</span>
                    </span>
                  )}
                  {!event.collaborator.permissions.guest_enabled && 
                   !event.collaborator.permissions.vidimate_enabled_entry && 
                   !event.collaborator.permissions.vidimate_enabled_product && (
                    <span className="text-white/60">Nessuna responsabilità specifica assegnata</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="max-w-7xl mx-auto px-6 pb-6">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-6">
            <div className="bg-green-500/20 rounded-lg p-4 text-center border border-green-500/30">
              <div className="text-green-300 font-bold text-xl">€{formatPrice(event.statistics.total_revenue)}</div>
              <div className="text-green-400/80 text-xs">Ricavi Totali</div>
            </div>
            <div className="bg-blue-500/20 rounded-lg p-4 text-center border border-blue-500/30">
              <div className="text-blue-300 font-bold text-xl">€{formatPrice(event.statistics.entries_revenue)}</div>
              <div className="text-blue-400/80 text-xs">Ricavi Ingressi</div>
            </div>
            <div className="bg-purple-500/20 rounded-lg p-4 text-center border border-purple-500/30">
              <div className="text-purple-300 font-bold text-xl">€{formatPrice(event.statistics.products_revenue)}</div>
              <div className="text-purple-400/80 text-xs">Ricavi Prodotti</div>
            </div>
            <div className="bg-orange-500/20 rounded-lg p-4 text-center border border-orange-500/30">
              <div className="text-orange-300 font-bold text-xl">{event.statistics.entries_sold}</div>
              <div className="text-orange-400/80 text-xs">Ingressi Venduti</div>
            </div>
            <div className="bg-cyan-500/20 rounded-lg p-4 text-center border border-cyan-500/30">
              <div className="text-cyan-300 font-bold text-xl">{event.statistics.products_sold}</div>
              <div className="text-cyan-400/80 text-xs">Prodotti Venduti</div>
            </div>
            <div className="bg-red-500/20 rounded-lg p-4 text-center border border-red-500/30">
              <div className="text-red-300 font-bold text-xl">{event.statistics.entries_validated}</div>
              <div className="text-red-400/80 text-xs">Ingressi Vidimati</div>
            </div>
            <div className="bg-yellow-500/20 rounded-lg p-4 text-center border border-yellow-500/30">
              <div className="text-yellow-300 font-bold text-xl">{event.statistics.products_validated}</div>
              <div className="text-yellow-400/80 text-xs">Prodotti Vidimati</div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex border-b border-white/10 mb-6">
            {[
              { key: 'overview', label: 'Panoramica', icon: FaChartBar },
              { key: 'products', label: 'Prodotti', icon: FaShoppingBag, count: event.assigned_products.length },
              { key: 'entries', label: 'Ingressi', icon: FaTicketAlt, count: event.assigned_entry_types.length },
              { key: 'invitations', label: 'Inviti', icon: FaEnvelope, count: event.invited_users.length }
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                  activeTab === tab.key
                    ? 'border-[#FC0045] text-white'
                    : 'border-transparent text-white/60 hover:text-white/80'
                }`}
              >
                <tab.icon />
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span className="px-2 py-1 bg-white/10 text-white/80 rounded-full text-xs">
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="pb-8">
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Event Description */}
                {event.description_extended && (
                  <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                    <h3 className="text-white font-bold text-lg mb-4 inline-flex items-center gap-2"><FaClipboardList /> <span>Descrizione Evento</span></h3>
                    <div 
                      className="text-white/80 prose prose-invert max-w-none"
                      dangerouslySetInnerHTML={{ __html: event.description_extended }}
                    />
                  </div>
                )}

                {/* Quick Summary */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-6">
                    <h4 className="text-blue-300 font-bold text-lg mb-4 inline-flex items-center gap-2"><FaTicketAlt /> <span>I Tuoi Ingressi</span></h4>
                    <div className="space-y-3">
                      <div className="text-blue-200 text-2xl font-bold">{event.assigned_entry_types.length}</div>
                      <div className="text-blue-400/80 text-sm">Tipi di ingresso assegnati</div>
                      {event.assigned_entry_types.slice(0, 3).map((entry) => (
                        <div key={entry.id} className="flex justify-between items-center text-sm">
                          <span className="text-blue-300">{entry.label}</span>
                          <span className="text-blue-400">€{formatPrice(entry.price || 0)}</span>
                        </div>
                      ))}
                      {event.assigned_entry_types.length > 3 && (
                        <div className="text-blue-400/60 text-xs">
                          +{event.assigned_entry_types.length - 3} altri
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-6">
                    <h4 className="text-green-300 font-bold text-lg mb-4 inline-flex items-center gap-2"><FaShoppingBag /> <span>I Tuoi Prodotti</span></h4>
                    <div className="space-y-3">
                      <div className="text-green-200 text-2xl font-bold">{event.assigned_products.length}</div>
                      <div className="text-green-400/80 text-sm">Prodotti assegnati</div>
                      {event.assigned_products.slice(0, 3).map((product) => (
                        <div key={product.id} className="flex justify-between items-center text-sm">
                          <span className="text-green-300">{product.label}</span>
                          <span className="text-green-400">€{formatPrice(product.price || 0)}</span>
                        </div>
                      ))}
                      {event.assigned_products.length > 3 && (
                        <div className="text-green-400/60 text-xs">
                          +{event.assigned_products.length - 3} altri
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-6">
                    <h4 className="text-purple-300 font-bold text-lg mb-4 inline-flex items-center gap-2"><FaEnvelope /> <span>Inviti Gestiti</span></h4>
                    <div className="space-y-3">
                      <div className="text-purple-200 text-2xl font-bold">{event.invited_users.length}</div>
                      <div className="text-purple-400/80 text-sm">Utenti invitati</div>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-green-300">Accettati:</span>
                          <span className="text-green-400">
                            {event.invited_users.filter(u => u.status === 'accepted').length}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-yellow-300">In attesa:</span>
                          <span className="text-yellow-400">
                            {event.invited_users.filter(u => u.status === 'pending').length}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-red-300">Rifiutati:</span>
                          <span className="text-red-400">
                            {event.invited_users.filter(u => u.status === 'declined').length}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'products' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-white font-bold text-xl inline-flex items-center gap-2"><FaShoppingBag /> <span>I Tuoi Prodotti</span></h3>
                  <div className="text-white/60 text-sm">
                    {event.assigned_products.length} prodotti assegnati
                  </div>
                </div>

                {event.assigned_products.length === 0 ? (
                  <div className="text-center py-12">
                    <FaShoppingBag className="text-6xl mb-4 mx-auto text-white/60" />
                    <h3 className="text-white text-xl font-bold mb-2">Nessun prodotto assegnato</h3>
                    <p className="text-white/60">
                      Non hai prodotti assegnati per questo evento.
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {event.assigned_products.map((product) => (
                      <div key={product.id} className="bg-white/5 border border-white/10 rounded-xl p-6 hover:bg-white/10 transition-colors">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <h4 className="text-white font-bold text-lg mb-2">{product.label}</h4>
                            {product.description && (
                              <p className="text-white/70 text-sm mb-3">{product.description}</p>
                            )}
                            <div className="flex items-center gap-4 text-sm">
                              <div className="flex items-center gap-2">
                                <FaMoneyBillWave className="text-green-400" />
                                <span className="text-green-300 font-semibold">€{formatPrice(product.price || 0)}</span>
                              </div>
                              {product.category && (
                                <div className="flex items-center gap-2">
                                  <FaTag className="text-blue-400" />
                                  <span className="text-blue-300">{product.category}</span>
                                </div>
                              )}
                              <div className="flex items-center gap-2">
                                <FaBox className="text-purple-400" />
                                <span className="text-purple-300">Stock: {product.stock || 0}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        {/* Product Statistics */}
                        <div className="grid grid-cols-3 gap-4 pt-4 border-t border-white/10">
                          <div className="text-center">
                            <div className="text-orange-300 font-bold text-lg">{product.sold_count || 0}</div>
                            <div className="text-orange-400/80 text-xs">Venduti</div>
                          </div>
                          <div className="text-center">
                            <div className="text-red-300 font-bold text-lg">{product.validated_count || 0}</div>
                            <div className="text-red-400/80 text-xs">Vidimati</div>
                          </div>
                          <div className="text-center">
                            <div className="text-green-300 font-bold text-lg">€{formatPrice((product.sold_count || 0) * (product.price || 0))}</div>
                            <div className="text-green-400/80 text-xs">Ricavi</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'entries' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-white font-bold text-xl inline-flex items-center gap-2"><FaTicketAlt /> <span>I Tuoi Ingressi</span></h3>
                  <div className="text-white/60 text-sm">
                    {event.assigned_entry_types.length} tipi di ingresso assegnati
                  </div>
                </div>

                {event.assigned_entry_types.length === 0 ? (
                  <div className="text-center py-12">
                    <FaTicketAlt className="text-6xl mb-4 mx-auto text-white/60" />
                    <h3 className="text-white text-xl font-bold mb-2">Nessun ingresso assegnato</h3>
                    <p className="text-white/60">
                      Non hai tipi di ingresso assegnati per questo evento.
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {event.assigned_entry_types.map((entry) => (
                      <div key={entry.id} className="bg-white/5 border border-white/10 rounded-xl p-6 hover:bg-white/10 transition-colors">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <h4 className="text-white font-bold text-lg mb-2">{entry.label}</h4>
                            {entry.description && (
                              <p className="text-white/70 text-sm mb-3">{entry.description}</p>
                            )}
                            <div className="flex items-center gap-4 text-sm">
                              <div className="flex items-center gap-2">
                                <FaMoneyBillWave className="text-green-400" />
                                <span className="text-green-300 font-semibold">€{formatPrice(entry.price || 0)}</span>
                              </div>
                              {entry.category && (
                                <div className="flex items-center gap-2">
                                  <FaTag className="text-blue-400" />
                                  <span className="text-blue-300">{entry.category}</span>
                                </div>
                              )}
                              <div className="flex items-center gap-2">
                                <FaBox className="text-purple-400" />
                                <span className="text-purple-300">Stock: {entry.stock || 0}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        {/* Entry Statistics */}
                        <div className="grid grid-cols-4 gap-4 pt-4 border-t border-white/10">
                          <div className="text-center">
                            <div className="text-blue-300 font-bold text-lg">{entry.transfer_qnt || 0}</div>
                            <div className="text-blue-400/80 text-xs">Totali</div>
                          </div>
                          <div className="text-center">
                            <div className="text-orange-300 font-bold text-lg">{entry.stock || 0}</div>
                            <div className="text-orange-400/80 text-xs">Ancora in possesso</div>
                          </div>
                          <div className="text-center">
                            <div className="text-red-300 font-bold text-lg">{(entry.transfer_qnt || 0) - (entry.stock || 0)}</div>
                            <div className="text-red-400/80 text-xs">Distribuiti</div>
                          </div>
                          <div className="text-center">
                            <div className="text-green-300 font-bold text-lg">€{formatPrice((entry.sold_count || 0) * (entry.price || 0))}</div>
                            <div className="text-green-400/80 text-xs">Ricavi</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'invitations' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-white font-bold text-xl inline-flex items-center gap-2"><FaEnvelope /> <span>Inviti Gestiti</span></h3>
                  <div className="text-white/60 text-sm">
                    {event.invited_users.length} utenti invitati
                  </div>
                </div>

                {event.invited_users.length === 0 ? (
                  <div className="text-center py-12">
                    <FaEnvelope className="text-6xl mb-4 mx-auto text-white/60" />
                    <h3 className="text-white text-xl font-bold mb-2">Nessun invito gestito</h3>
                    <p className="text-white/60">
                      Non hai utenti invitati da gestire per questo evento.
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {event.invited_users.map((user) => (
                      <div key={user.id} className="bg-white/5 border border-white/10 rounded-xl p-6 hover:bg-white/10 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <h4 className="text-white font-bold text-lg">{user.name} {user.surname}</h4>
                            <div className="text-white/70 text-sm mb-2">{user.email}</div>
                            {user.phone && (
                              <div className="text-white/60 text-sm mb-2 inline-flex items-center gap-2"><FaMobileAlt /> <span>{user.phone}</span></div>
                            )}
                            <div className="text-white/60 text-xs">
                              Invitato il {formatDate(user.created_at)}
                            </div>
                          </div>
                          <div className="ml-4">
                            <span className={`px-3 py-2 rounded-lg text-sm font-medium ${
                              user.status === 'accepted' ? 'bg-green-500/20 text-green-300' :
                              user.status === 'declined' ? 'bg-red-500/20 text-red-300' :
                              'bg-yellow-500/20 text-yellow-300'
                            }`}>
                              <span className="inline-flex items-center gap-2">
                                {user.status === 'accepted' ? <FaCheckCircle /> :
                                 user.status === 'declined' ? <FaTimesCircle /> :
                                 <FaHourglassHalf />}
                                <span>
                                  {user.status === 'accepted' ? 'Accettato' :
                                   user.status === 'declined' ? 'Rifiutato' :
                                   'In attesa'}
                                </span>
                              </span>
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

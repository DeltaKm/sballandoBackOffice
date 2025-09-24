"use client";

import { useState, useEffect, useMemo } from "react";
import type { Event, Product, EntryType } from "~/types";

interface StatisticsSectionProps {
  event: Event;
}

export function StatisticsSection({ event }: StatisticsSectionProps) {
  const [loading, setLoading] = useState(false);

  // Calcoli per i prodotti basati sui dati reali
  const productStats = useMemo(() => {
    const myProducts = event.products?.filter(p => p.user_id === event.user_id) || [];
    const collaboratorProducts = event.products?.filter(p => p.user_id !== event.user_id) || [];
    
    const totalProducts = event.products?.length || 0;
    
    // Ricavi reali: solo prodotti venduti (transfer_qnt - stock rimanenti)
    const totalRevenue = event.products?.reduce((sum, p) => {
      const sold = (p.transfer_qnt || 0) - (p.stock || 0);
      return sum + (Number(p.price || 0) * sold);
    }, 0) || 0;
    
    const totalStock = event.products?.reduce((sum, p) => sum + (p.stock || 0), 0) || 0;
    const totalDistributed = event.products?.reduce((sum, p) => sum + (p.transfer_qnt || 0), 0) || 0;
    const totalSold = totalStock - totalDistributed ;

    // Ricavi per collaboratori
    const collaboratorRevenue = collaboratorProducts.reduce((sum, p) => {
      const sold = (p.transfer_qnt || 0) - (p.stock || 0);
      return sum + (Number(p.price || 0) * sold);
    }, 0);

    // Ricavi miei
    const myRevenue = myProducts.reduce((sum, p) => {
      const sold = (p.transfer_qnt || 0) - (p.stock || 0);
      return sum + (Number(p.price || 0) * sold);
    }, 0);

    return {
      total: totalProducts,
      myProducts: myProducts.length,
      collaboratorProducts: collaboratorProducts.length,
      totalRevenue: totalRevenue,
      myRevenue: myRevenue,
      collaboratorRevenue: collaboratorRevenue,
      totalStock: totalStock,
      totalDistributed: totalDistributed,
      totalSold: totalSold,
      categories: [...new Set(event.products?.map(p => p.category).filter(Boolean))].length
    };
  }, [event.products, event.user_id]);

  // Calcoli per gli ingressi basati sui dati reali
  const entryStats = useMemo(() => {
    const myEntries = event.entry_types?.filter(e => e.user_id === event.user_id) || [];
    const collaboratorEntries = event.entry_types?.filter(e => e.user_id !== event.user_id) || [];
    
    const totalEntries = event.entry_types?.length || 0;
    
    // Incassi reali: solo ingressi pagati (paid === 'paid')
    const totalRevenue = event.entry_types?.reduce((sum, e) => {
      if (e.paid === 'paid') {
        const sold = (e.transfer_qnt || 0) - (e.stock || 0);
        return sum + (Number(e.price || 0) * sold);
      }
      return sum;
    }, 0) || 0;
    
    const totalStock = event.entry_types?.reduce((sum, e) => sum + (e.stock || 0), 0) || 0;
    const totalDistributed = event.entry_types?.reduce((sum, e) => sum + (e.transfer_qnt || 0), 0) || 0;
    const totalSold = totalDistributed - totalStock;

    // Solo ingressi pagati per statistiche vendite
    const paidEntries = event.entry_types?.filter(e => e.paid === 'paid') || [];
    const paidSold = paidEntries.reduce((sum, e) => sum + ((e.transfer_qnt || 0) - (e.stock || 0)), 0);

    // Incassi per collaboratori (solo pagati)
    const collaboratorRevenue = collaboratorEntries.reduce((sum, e) => {
      if (e.paid === 'paid') {
        const sold = (e.transfer_qnt || 0) - (e.stock || 0);
        return sum + (Number(e.price || 0) * sold);
      }
      return sum;
    }, 0);

    // Incassi miei (solo pagati)
    const myRevenue = myEntries.reduce((sum, e) => {
      if (e.paid === 'paid') {
        const sold = (e.transfer_qnt || 0) - (e.stock || 0);
        return sum + (Number(e.price || 0) * sold);
      }
      return sum;
    }, 0);

    return {
      total: totalEntries,
      myEntries: myEntries.length,
      collaboratorEntries: collaboratorEntries.length,
      totalRevenue: totalRevenue,
      myRevenue: myRevenue,
      collaboratorRevenue: collaboratorRevenue,
      totalStock: totalStock,
      totalDistributed: totalDistributed,
      totalSold: totalSold,
      paidSold: paidSold,
      freeDistributed: totalDistributed - paidEntries.reduce((sum, e) => sum + (e.transfer_qnt || 0), 0),
      categories: [...new Set(event.entry_types?.map(e => e.category).filter(Boolean))].length
    };
  }, [event.entry_types, event.user_id]);

  // Calcoli generali
  const generalStats = useMemo(() => {
    const collaborators = event.collaborators?.length || 0;
    const musicGenres = event.event_music_genres?.length || 0;
    const totalRevenue = productStats.totalRevenue + entryStats.totalRevenue;
    
    return {
      collaborators,
      musicGenres,
      totalRevenue,
      myRevenue: productStats.myRevenue + entryStats.myRevenue,
      collaboratorRevenue: productStats.collaboratorRevenue + entryStats.collaboratorRevenue,
      createdAt: event.created_at,
      updatedAt: event.updated_at
    };
  }, [event, productStats, entryStats]);

  const formatPrice = (price: number | string | undefined) => {
    if (!price) return '0.00';
    return Number(price).toFixed(2);
  };

  const formatDate = (date: string | undefined) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Statistiche dettagliate per prodotti raggruppati per label
  const detailedProductStats = useMemo(() => {
    if (!event.products || event.products.length === 0) return {};

    const productsByLabel = event.products.reduce((acc, product) => {
      const label = product.label;
      if (!acc[label]) {
        acc[label] = [];
      }
      acc[label].push(product);
      return acc;
    }, {} as Record<string, Product[]>);

    const stats = Object.entries(productsByLabel).reduce((acc, [label, products]) => {
      // Trova il prodotto originale (quello del creatore che ha created_qnt > 0)
      const originalProduct = products.find(p => (p.created_qnt || 0) > 0);
      const totalCreated = originalProduct?.created_qnt || 0;
      
      // Prodotto del creatore
      const creatorProduct = products.find(p => p.user_id === event.user_id);
      const creatorStock = creatorProduct?.stock || 0;
      const creatorReceived = creatorProduct?.transfer_qnt || 0;
      
      // Prodotti dei collaboratori
      const collaboratorProducts = products.filter(p => p.user_id !== event.user_id);
      const collaboratorsData = collaboratorProducts.map(p => {
        const collaborator = event.collaborators?.find(c => c.user_id === p.user_id);
        return {
          userId: p.user_id,
          name: collaborator?.user ? `${collaborator.user.name} ${collaborator.user.surname}` : `User ${p.user_id}`,
          received: p.transfer_qnt || 0,
          remaining: p.stock || 0,
          sold: (p.transfer_qnt || 0) - (p.stock || 0)
        };
      });

      const totalDistributed = products.reduce((sum, p) => sum + (p.transfer_qnt || 0), 0);
      const totalRemaining = products.reduce((sum, p) => sum + (p.stock || 0), 0);
      const totalSold = totalDistributed - totalRemaining;

      acc[label] = {
        label,
        totalCreated,
        totalDistributed,
        totalRemaining,
        totalSold,
        price: originalProduct?.price || products[0]?.price || 0,
        category: originalProduct?.category || products[0]?.category || 'Senza Categoria',
        creator: {
          received: creatorReceived,
          remaining: creatorStock,
          sold: creatorReceived - creatorStock
        },
        collaborators: collaboratorsData,
        revenue: totalSold * (Number(originalProduct?.price || products[0]?.price || 0))
      };

      return acc;
    }, {} as Record<string, any>);

    return stats;
  }, [event.products, event.collaborators, event.user_id]);

  // Statistiche dettagliate per ingressi raggruppati per label
  const detailedEntryStats = useMemo(() => {
    if (!event.entry_types || event.entry_types.length === 0) return {};

    const entriesByLabel = event.entry_types.reduce((acc, entry) => {
      const label = entry.label;
      if (!acc[label]) {
        acc[label] = [];
      }
      acc[label].push(entry);
      return acc;
    }, {} as Record<string, EntryType[]>);

    const stats = Object.entries(entriesByLabel).reduce((acc, [label, entries]) => {
      // Trova l'ingresso originale (quello del creatore che ha created_qnt > 0)
      const originalEntry = entries.find(e => (e.created_qnt || 0) > 0);
      const totalCreated = originalEntry?.created_qnt || 0;
      
      // Ingresso del creatore
      const creatorEntry = entries.find(e => e.user_id === event.user_id);
      const creatorStock = creatorEntry?.stock || 0;
      const creatorReceived = creatorEntry?.transfer_qnt || 0;
      
      // Ingressi dei collaboratori
      const collaboratorEntries = entries.filter(e => e.user_id !== event.user_id);
      const collaboratorsData = collaboratorEntries.map(e => {
        const collaborator = event.collaborators?.find(c => c.user_id === e.user_id);
        return {
          userId: e.user_id,
          name: collaborator?.user ? `${collaborator.user.name} ${collaborator.user.surname}` : `User ${e.user_id}`,
          received: e.transfer_qnt || 0,
          remaining: e.stock || 0,
          sold: (e.transfer_qnt || 0) - (e.stock || 0)
        };
      });

      const totalDistributed = entries.reduce((sum, e) => sum + (e.transfer_qnt || 0), 0);
      const totalRemaining = entries.reduce((sum, e) => sum + (e.stock || 0), 0);
      const totalSold = totalDistributed - totalRemaining;

      // Solo ingressi pagati per i ricavi
      const isPaid = originalEntry?.paid === 'paid' || entries[0]?.paid === 'paid';
      const revenue = isPaid ? totalSold * (Number(originalEntry?.price || entries[0]?.price || 0)) : 0;

      acc[label] = {
        label,
        totalCreated,
        totalDistributed,
        totalRemaining,
        totalSold,
        price: originalEntry?.price || entries[0]?.price || 0,
        category: originalEntry?.category || entries[0]?.category || 'Senza Categoria',
        type: originalEntry?.type || entries[0]?.type || 'entrance',
        paid: isPaid,
        creator: {
          received: creatorReceived,
          remaining: creatorStock,
          sold: creatorReceived - creatorStock
        },
        collaborators: collaboratorsData,
        revenue
      };

      return acc;
    }, {} as Record<string, any>);

    return stats;
  }, [event.entry_types, event.collaborators, event.user_id]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <div className="w-16 h-16 bg-blue-500/30 rounded-2xl flex items-center justify-center">
          <span className="text-blue-400 text-3xl">📊</span>
        </div>
        <div className="flex-1">
          <h2 className="text-blue-300 font-bold text-3xl">Statistiche Evento</h2>
          <p className="text-blue-400/80 text-lg mt-2">Dashboard vendite e performance</p>
        </div>
      </div>

      {/* Statistiche Ricavi Principali */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-green-500/20 to-emerald-600/20 border border-green-500/30 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-green-400 text-2xl">💰</span>
            <span className="px-3 py-1 bg-green-500/30 text-green-300 rounded-lg text-sm font-semibold">
              Incasso Totale
            </span>
          </div>
          <div className="text-green-300 font-bold text-3xl">€{formatPrice(generalStats.totalRevenue)}</div>
          <p className="text-green-400/80 text-sm mt-1">Solo vendite pagate</p>
        </div>

        <div className="bg-gradient-to-br from-blue-500/20 to-cyan-600/20 border border-blue-500/30 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-blue-400 text-2xl">👤</span>
            <span className="px-3 py-1 bg-blue-500/30 text-blue-300 rounded-lg text-sm font-semibold">
              Miei Ricavi
            </span>
          </div>
          <div className="text-blue-300 font-bold text-3xl">€{formatPrice(generalStats.myRevenue)}</div>
          <p className="text-blue-400/80 text-sm mt-1">Le mie vendite</p>
        </div>

        <div className="bg-gradient-to-br from-purple-500/20 to-violet-600/20 border border-purple-500/30 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-purple-400 text-2xl">👥</span>
            <span className="px-3 py-1 bg-purple-500/30 text-purple-300 rounded-lg text-sm font-semibold">
              Ricavi Collaboratori
            </span>
          </div>
          <div className="text-purple-300 font-bold text-3xl">€{formatPrice(generalStats.collaboratorRevenue)}</div>
          <p className="text-purple-400/80 text-sm mt-1">Vendite del team</p>
        </div>
      </div>

      {/* Info Generali */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <div className="bg-white/10 border border-white/20 rounded-xl p-4 text-center">
          <div className="text-white font-bold text-2xl">{generalStats.collaborators}</div>
          <div className="text-white/60 text-sm">👥 Collaboratori</div>
        </div>
        
        <div className="bg-white/10 border border-white/20 rounded-xl p-4 text-center">
          <div className="text-white font-bold text-2xl">{generalStats.musicGenres}</div>
          <div className="text-white/60 text-sm">🎵 Generi</div>
        </div>

        <div className="bg-white/10 border border-white/20 rounded-xl p-4 text-center">
          <div className="text-white font-bold text-sm">{formatDate(event.created_at)}</div>
          <div className="text-white/60 text-sm">📅 Creato</div>
        </div>

        <div className="bg-white/10 border border-white/20 rounded-xl p-4 text-center">
          <div className="text-white font-bold text-sm">{formatDate(event.updated_at)}</div>
          <div className="text-white/60 text-sm">🔄 Aggiornato</div>
        </div>
      </div>

      {/* Sezioni Dettagliate */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Statistiche Prodotti */}
        <div className="bg-orange-500/10 border-2 border-orange-500/30 rounded-2xl p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 bg-orange-500/30 rounded-xl flex items-center justify-center">
              <span className="text-orange-400 text-xl">🛍️</span>
            </div>
            <div>
              <h3 className="text-orange-300 font-bold text-xl">Prodotti</h3>
              <p className="text-orange-400/80 text-sm">Analisi vendite prodotti</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-orange-500/20 rounded-lg p-4 text-center">
                <div className="text-orange-300 font-bold text-xl">{productStats.total}</div>
                <div className="text-orange-400/80 text-xs">Tipologie</div>
              </div>
              <div className="bg-orange-500/20 rounded-lg p-4 text-center">
                <div className="text-orange-300 font-bold text-xl">{productStats.categories}</div>
                <div className="text-orange-400/80 text-xs">Categorie</div>
              </div>
              <div className="bg-orange-500/20 rounded-lg p-4 text-center">
                <div className="text-orange-300 font-bold text-xl">{productStats.totalSold}</div>
                <div className="text-orange-400/80 text-xs">Venduti</div>
              </div>
            </div>

            <div className="bg-orange-500/20 rounded-lg p-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-orange-400 text-sm">💰 Ricavi Totali:</span>
                <span className="text-orange-300 font-bold">€{formatPrice(productStats.totalRevenue)}</span>
              </div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-orange-400 text-sm">📦 Distribuiti:</span>
                <span className="text-orange-300 font-bold">{productStats.totalDistributed}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-orange-400 text-sm">📊 Stock Rimasto:</span>
                <span className="text-orange-300 font-bold">{productStats.totalStock}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-orange-500/20 rounded-lg p-3 text-center">
                <div className="text-orange-300 font-bold text-lg">€{formatPrice(productStats.myRevenue)}</div>
                <div className="text-orange-400/80 text-xs">I Miei Ricavi</div>
              </div>
              <div className="bg-orange-500/20 rounded-lg p-3 text-center">
                <div className="text-orange-300 font-bold text-lg">€{formatPrice(productStats.collaboratorRevenue)}</div>
                <div className="text-orange-400/80 text-xs">Ricavi Collaboratori</div>
              </div>
            </div>
          </div>
        </div>

        {/* Statistiche Ingressi */}
        <div className="bg-cyan-500/10 border-2 border-cyan-500/30 rounded-2xl p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 bg-cyan-500/30 rounded-xl flex items-center justify-center">
              <span className="text-cyan-400 text-xl">🎟️</span>
            </div>
            <div>
              <h3 className="text-cyan-300 font-bold text-xl">Ingressi</h3>
              <p className="text-cyan-400/80 text-sm">Analisi vendite biglietti</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-cyan-500/20 rounded-lg p-4 text-center">
                <div className="text-cyan-300 font-bold text-xl">{entryStats.total}</div>
                <div className="text-cyan-400/80 text-xs">Tipologie</div>
              </div>
              <div className="bg-cyan-500/20 rounded-lg p-4 text-center">
                <div className="text-cyan-300 font-bold text-xl">{entryStats.categories}</div>
                <div className="text-cyan-400/80 text-xs">Categorie</div>
              </div>
              <div className="bg-cyan-500/20 rounded-lg p-4 text-center">
                <div className="text-cyan-300 font-bold text-xl">{entryStats.paidSold}</div>
                <div className="text-cyan-400/80 text-xs">Pagati Venduti</div>
              </div>
            </div>

            <div className="bg-cyan-500/20 rounded-lg p-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-cyan-400 text-sm">💰 Incassi (solo pagati):</span>
                <span className="text-cyan-300 font-bold">€{formatPrice(entryStats.totalRevenue)}</span>
              </div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-cyan-400 text-sm">🎟️ Distribuiti Totali:</span>
                <span className="text-cyan-300 font-bold">{entryStats.totalDistributed}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-cyan-400 text-sm">📊 Stock Rimasto:</span>
                <span className="text-cyan-300 font-bold">{entryStats.totalStock}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-cyan-500/20 rounded-lg p-3 text-center">
                <div className="text-cyan-300 font-bold text-lg">€{formatPrice(entryStats.myRevenue)}</div>
                <div className="text-cyan-400/80 text-xs">I Miei Incassi</div>
              </div>
              <div className="bg-cyan-500/20 rounded-lg p-3 text-center">
                <div className="text-cyan-300 font-bold text-lg">€{formatPrice(entryStats.collaboratorRevenue)}</div>
                <div className="text-cyan-400/80 text-xs">Incassi Collaboratori</div>
              </div>
            </div>

            {entryStats.freeDistributed > 0 && (
              <div className="bg-green-500/20 rounded-lg p-3 text-center border border-green-500/30">
                <div className="text-green-300 font-bold text-lg">{entryStats.freeDistributed}</div>
                <div className="text-green-400/80 text-xs">🎁 Ingressi Gratuiti</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Statistiche Dettagliate Prodotti */}
      {Object.keys(detailedProductStats).length > 0 && (
        <div className="bg-orange-500/10 border-2 border-orange-500/30 rounded-2xl p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 bg-orange-500/30 rounded-xl flex items-center justify-center">
              <span className="text-orange-400 text-xl">🛍️</span>
            </div>
            <div>
              <h3 className="text-orange-300 font-bold text-xl">Dettaglio Prodotti per Tipologia</h3>
              <p className="text-orange-400/80 text-sm">Distribuzione e vendite per ogni prodotto</p>
            </div>
          </div>

          <div className="space-y-6">
            {Object.values(detailedProductStats).map((product: any) => (
              <div key={product.label} className="bg-orange-500/20 rounded-xl p-5 border border-orange-400/40">
                {/* Header Prodotto */}
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h4 className="text-orange-200 font-bold text-lg">{product.label}</h4>
                    <div className="flex items-center gap-3 mt-1">
                      {product.category && (
                        <span className="px-2 py-1 bg-orange-500/30 text-orange-300 rounded text-xs">
                          {product.category}
                        </span>
                      )}
                      <span className="text-orange-300 font-semibold">€{formatPrice(product.price)}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-green-400 font-bold text-xl">€{formatPrice(product.revenue)}</div>
                    <div className="text-orange-400/80 text-sm">Ricavi totali</div>
                  </div>
                </div>

                {/*
                                Statistiche Generali
                */}
                <div className="grid grid-cols-4 gap-4 mb-4">
                  <div className="bg-orange-600/30 rounded-lg p-3 text-center">
                    <div className="text-orange-200 font-bold text-lg">{product.totalCreated}</div>
                    <div className="text-orange-400/80 text-xs">Creati</div>
                  </div>
                  <div className="bg-orange-600/30 rounded-lg p-3 text-center">
                    <div className="text-orange-200 font-bold text-lg">{product.totalDistributed}</div>
                    <div className="text-orange-400/80 text-xs">Distribuiti</div>
                  </div>
                  <div className="bg-orange-600/30 rounded-lg p-3 text-center">
                    <div className="text-orange-200 font-bold text-lg">{product.totalSold}</div>
                    <div className="text-orange-400/80 text-xs">Venduti</div>
                  </div>
                  <div className="bg-orange-600/30 rounded-lg p-3 text-center">
                    <div className="text-orange-200 font-bold text-lg">{product.totalRemaining}</div>
                    <div className="text-orange-400/80 text-xs">Rimasti</div>
                  </div>
                </div>

                {/* Dettaglio Creatore */}
                <div className="mb-4">
                  <h5 className="text-orange-200 font-semibold mb-2">👤 Creatore (Tu)</h5>
                  <div className="bg-orange-600/40 rounded-lg p-3">
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div className="text-center">
                        <div className="text-orange-200 font-bold">{product.creator.received}</div>
                        <div className="text-orange-400/80">Ricevuti</div>
                      </div>
                      <div className="text-center">
                        <div className="text-orange-200 font-bold">{product.creator.sold}</div>
                        <div className="text-orange-400/80">Venduti</div>
                      </div>
                      <div className="text-center">
                        <div className="text-orange-200 font-bold">{product.creator.remaining}</div>
                        <div className="text-orange-400/80">Rimasti</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Dettaglio Collaboratori */}
                {product.collaborators.length > 0 && (
                  <div>
                    <h5 className="text-orange-200 font-semibold mb-2">👥 Collaboratori</h5>
                    <div className="space-y-2">
                      {product.collaborators.map((collab: any) => (
                        <div key={collab.userId} className="bg-orange-600/25 rounded-lg p-3">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-orange-200 font-medium">{collab.name}</span>
                          </div>
                          <div className="grid grid-cols-3 gap-4 text-sm">
                            <div className="text-center">
                              <div className="text-orange-200 font-bold">{collab.received}</div>
                              <div className="text-orange-400/80">Ricevuti</div>
                            </div>
                            <div className="text-center">
                              <div className="text-orange-200 font-bold">{collab.sold}</div>
                              <div className="text-orange-400/80">Venduti</div>
                            </div>
                            <div className="text-center">
                              <div className="text-orange-200 font-bold">{collab.remaining}</div>
                              <div className="text-orange-400/80">Rimasti</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Statistiche Dettagliate Ingressi */}
      {Object.keys(detailedEntryStats).length > 0 && (
        <div className="bg-cyan-500/10 border-2 border-cyan-500/30 rounded-2xl p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 bg-cyan-500/30 rounded-xl flex items-center justify-center">
              <span className="text-cyan-400 text-xl">🎟️</span>
            </div>
            <div>
              <h3 className="text-cyan-300 font-bold text-xl">Dettaglio Ingressi per Tipologia</h3>
              <p className="text-cyan-400/80 text-sm">Distribuzione e vendite per ogni ingresso</p>
            </div>
          </div>

          <div className="space-y-6">
            {Object.values(detailedEntryStats).map((entry: any) => (
              <div key={entry.label} className="bg-cyan-500/20 rounded-xl p-5 border border-cyan-400/40">
                {/* Header Ingresso */}
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h4 className="text-cyan-200 font-bold text-lg">{entry.label}</h4>
                    <div className="flex items-center gap-3 mt-1">
                      {entry.category && (
                        <span className="px-2 py-1 bg-cyan-500/30 text-cyan-300 rounded text-xs">
                          {entry.category}
                        </span>
                      )}
                      <span className="text-cyan-300 font-semibold">€{formatPrice(entry.price)}</span>
                      {!entry.paid && (
                        <span className="px-2 py-1 bg-green-500/30 text-green-300 rounded text-xs">
                          GRATUITO
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-green-400 font-bold text-xl">€{formatPrice(entry.revenue)}</div>
                    <div className="text-cyan-400/80 text-sm">{entry.paid ? 'Incassi' : 'Gratuito'}</div>
                  </div>
                </div>

                {/* Statistiche Generali */}
                <div className="grid grid-cols-4 gap-4 mb-4">
                  <div className="bg-cyan-600/30 rounded-lg p-3 text-center">
                    <div className="text-cyan-200 font-bold text-lg">{entry.totalCreated}</div>
                    <div className="text-cyan-400/80 text-xs">Creati</div>
                  </div>
                  <div className="bg-cyan-600/30 rounded-lg p-3 text-center">
                    <div className="text-cyan-200 font-bold text-lg">{entry.totalDistributed}</div>
                    <div className="text-cyan-400/80 text-xs">Distribuiti</div>
                  </div>
                  <div className="bg-cyan-600/30 rounded-lg p-3 text-center">
                    <div className="text-cyan-200 font-bold text-lg">{entry.totalSold}</div>
                    <div className="text-cyan-400/80 text-xs">Venduti</div>
                  </div>
                  <div className="bg-cyan-600/30 rounded-lg p-3 text-center">
                    <div className="text-cyan-200 font-bold text-lg">{entry.totalRemaining}</div>
                    <div className="text-cyan-400/80 text-xs">Rimasti</div>
                  </div>
                </div>

                {/* Dettaglio Creatore */}
                <div className="mb-4">
                  <h5 className="text-cyan-200 font-semibold mb-2">👤 Creatore (Tu)</h5>
                  <div className="bg-cyan-600/40 rounded-lg p-3">
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div className="text-center">
                        <div className="text-cyan-200 font-bold">{entry.creator.received}</div>
                        <div className="text-cyan-400/80">Ricevuti</div>
                      </div>
                      <div className="text-center">
                        <div className="text-cyan-200 font-bold">{entry.creator.sold}</div>
                        <div className="text-cyan-400/80">Venduti</div>
                      </div>
                      <div className="text-center">
                        <div className="text-cyan-200 font-bold">{entry.creator.remaining}</div>
                        <div className="text-cyan-400/80">Rimasti</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Dettaglio Collaboratori */}
                {entry.collaborators.length > 0 && (
                  <div>
                    <h5 className="text-cyan-200 font-semibold mb-2">👥 Collaboratori</h5>
                    <div className="space-y-2">
                      {entry.collaborators.map((collab: any) => (
                        <div key={collab.userId} className="bg-cyan-600/25 rounded-lg p-3">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-cyan-200 font-medium">{collab.name}</span>
                          </div>
                          <div className="grid grid-cols-3 gap-4 text-sm">
                            <div className="text-center">
                              <div className="text-cyan-200 font-bold">{collab.received}</div>
                              <div className="text-cyan-400/80">Ricevuti</div>
                            </div>
                            <div className="text-center">
                              <div className="text-cyan-200 font-bold">{collab.sold}</div>
                              <div className="text-cyan-400/80">Venduti</div>
                            </div>
                            <div className="text-center">
                              <div className="text-cyan-200 font-bold">{collab.remaining}</div>
                              <div className="text-cyan-400/80">Rimasti</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Performance Summary */}
      <div className="bg-gradient-to-r from-indigo-500/20 to-purple-600/20 border border-indigo-500/30 rounded-2xl p-8">
        <div className="text-center">
          <h3 className="text-white font-bold text-2xl mb-4">🏆 Performance Riepilogo</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="text-4xl font-bold text-green-400 mb-2">€{formatPrice(generalStats.totalRevenue)}</div>
              <div className="text-white/80">Ricavi Totali Reali</div>
              <div className="text-white/60 text-sm mt-1">Solo vendite confermate</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-blue-400 mb-2">{productStats.totalSold + entryStats.totalSold}</div>
              <div className="text-white/80">Articoli Venduti</div>
              <div className="text-white/60 text-sm mt-1">Prodotti + Ingressi</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-purple-400 mb-2">{((productStats.totalSold + entryStats.paidSold) / Math.max(productStats.totalDistributed + entryStats.totalDistributed, 1) * 100).toFixed(1)}%</div>
              <div className="text-white/80">Tasso Vendita</div>
              <div className="text-white/60 text-sm mt-1">Venduti su distribuiti</div>
            </div>
          </div>
        </div>
      </div>
    </div>

  );
}
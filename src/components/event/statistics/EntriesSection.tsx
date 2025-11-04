"use client";

import type { EntryType } from "~/types";
import { useState, useMemo } from "react";

interface EntryStats {
  label: string;
  category: string;
  price: number;
  totalCreated: number;
  totalDistributed: number;
  totalRemaining: number;
  totalSold: number;
  totalRevenue: number;
  burnedCount?: number;
  userStats: Array<{
    uniqueId: string;
    userId: number;
    name: string;
    role: string;
    received: number;
    remaining: number;
    sold: number;
    burned: number;
    isPaid: boolean;
    revenue: number;
    paidCount: number;
  }>;
}

interface EntriesSectionProps {
  entries: EntryType[];
  collaborators: Array<{ user_id: number; users?: { name: string; surname: string } }>;
  eventUserId: number;
  selectedCollaborator: string;
}

export function EntriesSection({ 
  entries, 
  collaborators, 
  eventUserId, 
  selectedCollaborator 
}: EntriesSectionProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const formatPrice = (price: number | string | undefined | null): string => {
    if (price === null || price === undefined || price === '') return '0.00';
    const numPrice = typeof price === 'string' ? parseFloat(price) : price;
    return isNaN(numPrice) ? '0.00' : numPrice.toFixed(2);
  };

  // Filtra gli ingressi per mostrare solo creatore + collaboratori (no utenti finali)
  const filteredEntries = useMemo(() => {
    if (selectedCollaborator === 'all' || selectedCollaborator === 'me') {
      // Per "tutti" e "me": mostra solo ingressi di creatore + collaboratori
      const collaboratorIds = [eventUserId, ...(collaborators?.map(c => c.user_id) || [])];
      return entries.filter(e => 
        e.user_id && collaboratorIds.includes(e.user_id)
      );
    } else {
      // Per collaboratore specifico: mostra TUTTI gli ingressi che lo riguardano
      const targetUserId = parseInt(selectedCollaborator);
      return entries.filter(e => 
        e.user_id === targetUserId ||  // Ingressi che possiede
        e.old_user_id === targetUserId // Ingressi che ha venduto
      );
    }
  }, [entries, collaborators, eventUserId, selectedCollaborator]);

  // Estrai tutte le categorie disponibili
  const availableCategories = useMemo(() => {
    const categories = new Set<string>();
    filteredEntries.forEach(entry => {
      const category = entry.category || 'Senza Categoria';
      categories.add(category);
    });
    return Array.from(categories).sort();
  }, [filteredEntries]);

  // Filtra gli ingressi per categoria selezionata
  const categoryFilteredEntries = useMemo(() => {
    if (selectedCategory === 'all') return filteredEntries;
    return filteredEntries.filter(e => 
      (e.category || 'Senza Categoria') === selectedCategory
    );
  }, [filteredEntries, selectedCategory]);

  console.log('🎟️ EntriesSection Debug:', {
    totalEntries: entries.length,
    filteredEntries: filteredEntries.length,
    categoryFilteredEntries: categoryFilteredEntries.length,
    selectedCollaborator,
    selectedCategory,
    eventUserId,
    availableCategories,
    entriesPreview: categoryFilteredEntries.slice(0, 3).map(e => ({
      id: e.id,
      label: e.label,
      category: e.category,
      status: e.paid,
      price: e.price,
      user_id: e.user_id,
      old_user_id: e.old_user_id
    }))
  });

  // ==================== VISTA CREATORE ====================
  function renderCreatorView() {
    console.log('🎯 Rendering Creator View for Entries, selectedCollaborator:', selectedCollaborator);
    
    // Raggruppa per label
    const entriesByLabel = categoryFilteredEntries.reduce((acc, entry) => {
      const label = entry.label || 'Senza Nome';
      if (!acc[label]) {
        acc[label] = [];
      }
      acc[label].push(entry);
      return acc;
    }, {} as Record<string, EntryType[]>);

    console.log('🎟️ Entries grouped by label:', Object.keys(entriesByLabel));

    // Calcola statistiche per ogni gruppo
    const entryStats: EntryStats[] = Object.entries(entriesByLabel).map(([label, groupEntries]) => {
      if (selectedCollaborator === 'me') {
        // ============ STATISTICHE PER IL CREATORE ============
        const creatorEntry = groupEntries.find(e => e.user_id === eventUserId);
        
        if (!creatorEntry) {
          console.warn(`⚠️ No creator entry found for label: ${label}`);
          return null;
        }
        
        const totalCreated = creatorEntry.created_qnt || 0;
        const creatorRemaining = creatorEntry.stock || 0;
        const totalDistributed = totalCreated - creatorRemaining;
        
        // Solo gli ingressi pagati del creatore per questa label
        const paidEntries = entries.filter(e => 
          e.label === label && 
          e.old_user_id === eventUserId && 
          e.paid === 'paid'
        );
        const paidCount = paidEntries.length;
        const totalRevenue = paidEntries.reduce((sum, e) => sum + Number(e.price || 0), 0);
        
        // Ingressi vidimati venduti dal creatore
        const burnedEntries = entries.filter(e => 
          e.label === label && 
          e.old_user_id === eventUserId && 
          e.burned === 1
        );
        const burnedCount = burnedEntries.length;

        console.log(`👑 Creator stats for entry ${label}:`, {
          totalCreated,
          creatorRemaining,
          totalDistributed,
          paidEntries: paidEntries.length,
          totalRevenue,
          burnedCount
        });

        const userStats = [{
          uniqueId: `creator-${eventUserId}`,
          userId: eventUserId,
          name: 'Io (Creatore)',
          role: 'Creatore',
          received: totalCreated,
          remaining: creatorRemaining,
          sold: totalDistributed,
          burned: burnedCount,
          isPaid: paidCount > 0,
          revenue: totalRevenue,
          paidCount
        }];

        return {
          label,
          category: creatorEntry.category || 'Senza Categoria',
          price: Number(creatorEntry.price || 0),
          totalCreated,
          totalDistributed,
          totalRemaining: creatorRemaining,
          totalSold: totalDistributed,
          totalRevenue,
          burnedCount,
          userStats
        };
      } else {
        // ============ STATISTICHE GLOBALI (TUTTI) ============
        const originalEntry = groupEntries.find(e => (e.created_qnt || 0) > 0);
        const totalCreated = originalEntry?.created_qnt || 0;
        
        // Statistiche globali (solo creatore + collaboratori)
        const totalDistributed = groupEntries.reduce((sum, e) => sum + (e.transfer_qnt || 0), 0);
        const totalRemaining = groupEntries.reduce((sum, e) => sum + (e.stock || 0), 0);
        const totalSold = totalDistributed - totalRemaining;
        
        // RICAVO TOTALE = Solo dagli ingressi venduti da creatore + collaboratori
        const collaboratorIds = [eventUserId, ...(collaborators?.map(c => c.user_id) || [])];
        const paidEntries = entries.filter(e => 
          e.label === label && 
          e.old_user_id && 
          collaboratorIds.includes(e.old_user_id) && 
          e.paid === 'paid'
        );
        const totalRevenue = paidEntries.reduce((sum, e) => sum + Number(e.price || 0), 0);

        console.log(`🌍 Global stats for entry ${label}:`, {
          totalCreated,
          totalDistributed,
          totalRemaining,
          paidEntries: paidEntries.length,
          totalRevenue,
          collaboratorIds
        });

        // User stats per creatore + collaboratori (no utenti finali)
        const userStats = groupEntries.map((e, index) => {
          const collaborator = collaborators?.find(c => c.user_id === e.user_id);
          const isMe = e.user_id === eventUserId;
          
          // Ingressi venduti da questo utente (solo se è creatore o collaboratore)
          const soldByUser = entries.filter(entry => 
            entry.label === label &&
            entry.old_user_id === e.user_id && 
            entry.paid === 'paid'
          );
          const burnedByUser = entries.filter(entry => 
            entry.label === label &&
            entry.old_user_id === e.user_id && 
            (entry.burned === 1)
          ).length;
          
          const userRevenue = soldByUser.reduce((sum, entry) => sum + Number(entry.price || 0), 0);
          
          return {
            uniqueId: `${e.id || e.user_id}-${index}`,
            userId: e.user_id,
            name: isMe ? 'Io (Creatore)' : 
                  collaborator?.users ? `${collaborator.users.name} ${collaborator.users.surname}` : 
                  `Utente ${e.user_id}`,
            role: isMe ? 'Creatore' : 'Collaboratore',
            received: e.transfer_qnt || 0,
            remaining: e.stock || 0,
            sold: (e.transfer_qnt || 0) - (e.stock || 0),
            burned: burnedByUser,
            isPaid: soldByUser.length > 0,
            revenue: userRevenue,
            paidCount: soldByUser.length
          };
        });

        return {
          label,
          category: originalEntry?.category || groupEntries[0]?.category || 'Senza Categoria',
          price: Number(originalEntry?.price || groupEntries[0]?.price || 0),
          totalCreated,
          totalDistributed,
          totalRemaining,
          totalSold,
          totalRevenue,
          userStats
        };
      }
    }).filter(Boolean) as EntryStats[];

    // CALCOLO RICAVI TOTALI (filtrati per categoria)
    const totalEventRevenue = entryStats.reduce((sum, entry) => sum + entry.totalRevenue, 0);

    console.log(`💰 TOTAL EVENT REVENUE from entries (category: ${selectedCategory}): €${totalEventRevenue}`);

    if (entryStats.length === 0) {
      return (
        <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-8 text-center">
          <span className="text-purple-400 text-5xl">🎟️</span>
          <p className="text-purple-300 mt-4">
            {selectedCategory === 'all' ? 'Nessun ingresso trovato' : `Nessun ingresso trovato per "${selectedCategory}"`}
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* FILTRI CATEGORIE */}
        <div className="bg-gray-500/10 border border-gray-500/30 rounded-xl p-4">
          <h4 className="text-gray-200 font-semibold mb-3">🏷️ Filtra per Categoria</h4>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                selectedCategory === 'all'
                  ? 'bg-purple-500 text-white'
                  : 'bg-purple-500/20 text-purple-300 hover:bg-purple-500/30'
              }`}
            >
              Tutte ({filteredEntries.length})
            </button>
            {availableCategories.map((category) => {
              const count = filteredEntries.filter(e => 
                (e.category || 'Senza Categoria') === category
              ).length;
              return (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                    selectedCategory === category
                      ? 'bg-purple-500 text-white'
                      : 'bg-purple-500/20 text-purple-300 hover:bg-purple-500/30'
                  }`}
                >
                  {category} ({count})
                </button>
              );
            })}
          </div>
        </div>

        {/* RIEPILOGO TOTALE EVENTO */}
        {selectedCollaborator === 'all' && (
          <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-6">
            <h3 className="text-green-200 font-bold text-xl mb-4">
              🎟️ Ricavi Totali Evento - Ingressi
              {selectedCategory !== 'all' && (
                <span className="text-green-400/80 font-normal ml-2">({selectedCategory})</span>
              )}
            </h3>
            <div className="text-center">
              <div className="text-green-400 font-bold text-4xl">€{formatPrice(totalEventRevenue)}</div>
              <div className="text-green-400/80 text-lg mt-2">
                Totale da {selectedCategory === 'all' ? 'Tutti gli Ingressi' : `Ingressi "${selectedCategory}"`} Venduti
              </div>
            </div>
          </div>
        )}

        {/* RIEPILOGO CREATORE */}
        {selectedCollaborator === 'me' && (
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-6">
            <h3 className="text-blue-200 font-bold text-xl mb-4">
              👑 I Miei Ricavi Totali - Ingressi
              {selectedCategory !== 'all' && (
                <span className="text-blue-400/80 font-normal ml-2">({selectedCategory})</span>
              )}
            </h3>
            <div className="text-center">
              <div className="text-blue-400 font-bold text-4xl">€{formatPrice(totalEventRevenue)}</div>
              <div className="text-blue-400/80 text-lg mt-2">
                Totale dai Miei Ingressi {selectedCategory !== 'all' ? `"${selectedCategory}"` : ''}
              </div>
            </div>
          </div>
        )}

        {entryStats.map((entry) => (
          <div key={entry.label} className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-6">
            {/* Header Ingresso */}
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-purple-200 font-bold text-xl">{entry.label}</h3>
                <div className="flex items-center gap-3 mt-2">
                  <span className="px-2 py-1 bg-purple-500/30 text-purple-300 rounded text-sm">
                    {entry.category}
                  </span>
                  <span className="text-purple-300 font-semibold">€{formatPrice(entry.price)}</span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-green-400 font-bold text-2xl">€{formatPrice(entry.totalRevenue)}</div>
                <div className="text-purple-400/80 text-sm">
                  Ricavi da questo Ingresso
                </div>
              </div>
            </div>

            {/* Statistiche */}
            <div className="grid grid-cols-4 gap-4 mb-6">
              <div className="bg-purple-600/30 rounded-lg p-4 text-center">
                <div className="text-purple-200 font-bold text-2xl">{entry.totalCreated}</div>
                <div className="text-purple-400/80 text-sm">
                  {selectedCollaborator === 'me' ? 'Creati' : 'Totale Creati'}
                </div>
              </div>
              <div className="bg-purple-600/30 rounded-lg p-4 text-center">
                <div className="text-purple-200 font-bold text-2xl">{entry.totalDistributed}</div>
                <div className="text-purple-400/80 text-sm">Distribuiti</div>
              </div>
              <div className="bg-purple-600/30 rounded-lg p-4 text-center">
                <div className="text-purple-200 font-bold text-2xl">{entry.totalRemaining}</div>
                <div className="text-purple-400/80 text-sm">Rimasti</div>
              </div>
              <div className="bg-red-600/30 rounded-lg p-4 text-center">
                <div className="text-red-200 font-bold text-2xl">{entry.burnedCount || 0}</div>
                <div className="text-red-400/80 text-sm">Vidimati</div>
              </div>
            </div>

            {/* Dettaglio Utenti (Solo Creatore + Collaboratori) */}
            <div className="space-y-3">
              <h4 className="text-purple-300 font-semibold">
                {selectedCollaborator === 'me' ? 'Le Mie Statistiche' : 'Dettagli Creatore & Collaboratori'}
              </h4>
              {entry.userStats.map((user) => (
                <div key={user.uniqueId} className="bg-purple-600/20 rounded-lg p-4">
                  <div className="flex justify-between items-center mb-3">
                    <div>
                      <span className="text-purple-200 font-medium">{user.name}</span>
                      <span className="ml-2 px-2 py-1 bg-purple-500/20 text-purple-300 rounded text-xs">
                        {user.role}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      {user.paidCount > 0 && (
                        <span className="px-2 py-1 bg-green-500/30 text-green-300 rounded text-xs">
                          {user.paidCount} VENDUTI €{formatPrice(user.revenue)}
                        </span>
                      )}
                      {user.burned > 0 && (
                        <span className="px-2 py-1 bg-red-500/30 text-red-300 rounded text-xs">
                          {user.burned} VIDIMATI
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-purple-200 font-bold text-lg">{user.received}</div>
                      <div className="text-purple-400/80 text-sm">
                        {selectedCollaborator === 'me' ? 'Creati' : 'Ricevuti'}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-purple-200 font-bold text-lg">{user.sold}</div>
                      <div className="text-purple-400/80 text-sm">Distribuiti</div>
                    </div>
                    <div className="text-center">
                      <div className="text-purple-200 font-bold text-lg">{user.remaining}</div>
                      <div className="text-purple-400/80 text-sm">Rimasti</div>
                    </div>
                    <div className="text-center">
                      <div className="text-red-200 font-bold text-lg">{user.burned}</div>
                      <div className="text-red-400/80 text-sm">Vidimati</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  // ================= VISTA COLLABORATORE =================
  function renderCollaboratorView() {
    const targetUserId = parseInt(selectedCollaborator);
    
    console.log('👤 Rendering Collaborator View for Entries, userId:', targetUserId);
    
    // Trova gli ingressi di questo collaboratore (già filtrati per categoria)
    const collaboratorEntries = categoryFilteredEntries.filter(e => 
      e.user_id === targetUserId || e.old_user_id === targetUserId
    );

    console.log(`🎟️ Found ${collaboratorEntries.length} entries for collaborator ${targetUserId}`);

    if (collaboratorEntries.length === 0) {
      const collaboratorName = collaborators.find(c => c.user_id === targetUserId)?.users ? 
        `${collaborators.find(c => c.user_id === targetUserId)!.users!.name} ${collaborators.find(c => c.user_id === targetUserId)!.users!.surname}` :
        `Utente ${targetUserId}`;

      return (
        <div className="space-y-6">
          {/* FILTRI CATEGORIE ANCHE PER COLLABORATORI */}
          <div className="bg-gray-500/10 border border-gray-500/30 rounded-xl p-4">
            <h4 className="text-gray-200 font-semibold mb-3">🏷️ Filtra per Categoria</h4>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                  selectedCategory === 'all'
                    ? 'bg-purple-500 text-white'
                    : 'bg-purple-500/20 text-purple-300 hover:bg-purple-500/30'
                }`}
              >
                Tutte ({entries.filter(e => e.user_id === targetUserId || e.old_user_id === targetUserId).length})
              </button>
              {availableCategories.map((category) => {
                const count = entries.filter(e => 
                  (e.user_id === targetUserId || e.old_user_id === targetUserId) &&
                  (e.category || 'Senza Categoria') === category
                ).length;
                return (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                      selectedCategory === category
                        ? 'bg-purple-500 text-white'
                        : 'bg-purple-500/20 text-purple-300 hover:bg-purple-500/30'
                    }`}
                  >
                    {category} ({count})
                  </button>
                );
              })}
            </div>
          </div>

          <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-8 text-center">
            <span className="text-purple-400 text-5xl">🎟️</span>
            <p className="text-purple-300 mt-4">
              {selectedCategory === 'all' ? 'Nessun ingresso trovato' : `Nessun ingresso trovato per "${selectedCategory}"`}
            </p>
            <p className="text-purple-400/60 text-sm mt-2">
              Collaboratore: {collaboratorName}
            </p>
          </div>
        </div>
      );
    }

    // Raggruppa per label
    const entriesByLabel = collaboratorEntries.reduce((acc, entry) => {
      const label = entry.label || 'Senza Nome';
      if (!acc[label]) {
        acc[label] = [];
      }
      acc[label].push(entry);
      return acc;
    }, {} as Record<string, EntryType[]>);

    // Calcola statistiche SPECIFICHE del collaboratore
    const entryStats: EntryStats[] = Object.entries(entriesByLabel).map(([label, groupEntries]) => {
      // Trova il record principale del collaboratore
      const collaboratorEntry = groupEntries.find(e => e.user_id === targetUserId);
      
      // Statistiche del collaboratore
      const collaboratorReceived = collaboratorEntry?.transfer_qnt || 0;
      const collaboratorRemaining = collaboratorEntry?.stock || 0;
      const collaboratorDistributed = collaboratorReceived - collaboratorRemaining;
      
      // Ingressi venduti dal collaboratore (old_user_id === targetUserId && paid === 'paid')
      const soldByCollaborator = entries.filter(e => 
        e.label === label && 
        e.old_user_id === targetUserId && 
        e.paid === 'paid' &&
        (selectedCategory === 'all' || (e.category || 'Senza Categoria') === selectedCategory)
      );
      
      // Ingressi vidimati distribuiti dal collaboratore
      const burnedByCollaborator = entries.filter(e => 
        e.label === label && 
        e.old_user_id === targetUserId && 
        (e.burned === 1) &&
        (selectedCategory === 'all' || (e.category || 'Senza Categoria') === selectedCategory)
      );
      
      // RICAVO del collaboratore
      const collaboratorRevenue = soldByCollaborator.reduce((sum, e) => sum + Number(e.price || 0), 0);

      console.log(`👤 Collaborator ${targetUserId} revenue for entry ${label}:`, {
        received: collaboratorReceived,
        remaining: collaboratorRemaining,
        distributed: collaboratorDistributed,
        soldCount: soldByCollaborator.length,
        burnedCount: burnedByCollaborator.length,
        revenue: collaboratorRevenue
      });

      const originalEntry = entries.find(e => e.label === label && (e.created_qnt || 0) > 0);
      const collaborator = collaborators.find(c => c.user_id === targetUserId);

      const userStats = [{
        uniqueId: `collab-${targetUserId}`,
        userId: targetUserId,
        name: collaborator?.users ? 
          `${collaborator.users.name} ${collaborator.users.surname}` : 
          `Utente ${targetUserId}`,
        role: 'Collaboratore',
        received: collaboratorReceived,
        remaining: collaboratorRemaining,
        sold: collaboratorDistributed,
        burned: burnedByCollaborator.length,
        isPaid: soldByCollaborator.length > 0,
        revenue: collaboratorRevenue,
        paidCount: soldByCollaborator.length
      }];

      return {
        label,
        category: originalEntry?.category || collaboratorEntry?.category || 'Senza Categoria',
        price: Number(originalEntry?.price || collaboratorEntry?.price || 0),
        totalCreated: collaboratorReceived,
        totalDistributed: collaboratorDistributed,
        totalRemaining: collaboratorRemaining,
        totalSold: collaboratorDistributed,
        totalRevenue: collaboratorRevenue,
        burnedCount: burnedByCollaborator.length,
        userStats
      };
    });

    // CALCOLO TOTALE RICAVI DEL COLLABORATORE (filtrato per categoria)
    const totalCollaboratorRevenue = entries.filter(e => 
      e.old_user_id === targetUserId && 
      e.paid === 'paid' &&
      (selectedCategory === 'all' || (e.category || 'Senza Categoria') === selectedCategory)
    ).reduce((sum, e) => sum + Number(e.price || 0), 0);

    console.log(`💵 Total collaborator ${targetUserId} entry revenue (category: ${selectedCategory}): €${totalCollaboratorRevenue}`);

    return (
      <div className="space-y-6">
        {/* FILTRI CATEGORIE */}
        <div className="bg-gray-500/10 border border-gray-500/30 rounded-xl p-4">
          <h4 className="text-gray-200 font-semibold mb-3">🏷️ Filtra per Categoria</h4>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                selectedCategory === 'all'
                  ? 'bg-purple-500 text-white'
                  : 'bg-purple-500/20 text-purple-300 hover:bg-purple-500/30'
              }`}
            >
              Tutte ({entries.filter(e => e.user_id === targetUserId || e.old_user_id === targetUserId).length})
            </button>
            {availableCategories.map((category) => {
              const count = entries.filter(e => 
                (e.user_id === targetUserId || e.old_user_id === targetUserId) &&
                (e.category! || 'Senza Categoria') === category
              ).length;
              return (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                    selectedCategory === category
                      ? 'bg-purple-500 text-white'
                      : 'bg-purple-500/20 text-purple-300 hover:bg-purple-500/30'
                  }`}
                >
                  {category} ({count})
                </button>
              );
            })}
          </div>
        </div>

        {/* RIEPILOGO TOTALE COLLABORATORE */}
        <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-6">
          <h3 className="text-green-200 font-bold text-xl mb-4">
            🎟️ Riepilogo Totale Ricavi - Ingressi
            {selectedCategory !== 'all' && (
              <span className="text-green-400/80 font-normal ml-2">({selectedCategory})</span>
            )}
          </h3>
          <div className="text-center">
            <div className="text-green-400 font-bold text-4xl">€{formatPrice(totalCollaboratorRevenue)}</div>
            <div className="text-green-400/80 text-lg mt-2">
              Totale Ricavi da {selectedCategory === 'all' ? 'Tutti gli' : `"${selectedCategory}"`} Ingressi Venduti
            </div>
          </div>
        </div>
    
        {/* DETTAGLI INGRESSI */}
        {entryStats.map((entry) => (
          <div key={entry.label} className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-6">
            {/* Header Ingresso */}
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-purple-200 font-bold text-xl">{entry.label}</h3>
                <div className="flex items-center gap-3 mt-2">
                  <span className="px-2 py-1 bg-purple-500/30 text-purple-300 rounded text-sm">
                    {entry.category}
                  </span>
                  <span className="text-purple-300 font-semibold">€{formatPrice(entry.price)}</span>
                  <span className="px-2 py-1 bg-blue-500/30 text-blue-300 rounded text-sm">
                    Vista Collaboratore
                  </span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-green-400 font-bold text-2xl">€{formatPrice(entry.totalRevenue)}</div>
                <div className="text-purple-400/80 text-sm">I Tuoi Ricavi</div>
              </div>
            </div>

            {/* Statistiche del Collaboratore */}
            <div className="grid grid-cols-4 gap-4 mb-6">
              <div className="bg-purple-600/30 rounded-lg p-4 text-center">
                <div className="text-purple-200 font-bold text-2xl">{entry.totalCreated}</div>
                <div className="text-purple-400/80 text-sm">Ricevuti</div>
              </div>
              <div className="bg-purple-600/30 rounded-lg p-4 text-center">
                <div className="text-purple-200 font-bold text-2xl">{entry.totalDistributed}</div>
                <div className="text-purple-400/80 text-sm">Distribuiti</div>
              </div>
              <div className="bg-purple-600/30 rounded-lg p-4 text-center">
                <div className="text-purple-200 font-bold text-2xl">{entry.totalRemaining}</div>
                <div className="text-purple-400/80 text-sm">Rimasti</div>
              </div>
              <div className="bg-red-600/30 rounded-lg p-4 text-center">
                <div className="text-red-200 font-bold text-2xl">{entry.burnedCount || 0}</div>
                <div className="text-red-400/80 text-sm">Vidimati</div>
              </div>
            </div>

            {/* Dettaglio del Collaboratore */}
            <div className="space-y-3">
              <h4 className="text-purple-300 font-semibold">Le Tue Statistiche</h4>
              {entry.userStats.map((user) => (
                <div key={user.uniqueId} className="bg-purple-600/20 rounded-lg p-4">
                  <div className="flex justify-between items-center mb-3">
                    <div>
                      <span className="text-purple-200 font-medium">{user.name}</span>
                      <span className="ml-2 px-2 py-1 bg-purple-500/20 text-purple-300 rounded text-xs">
                        {user.role}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      {user.paidCount > 0 && (
                        <span className="px-2 py-1 bg-green-500/30 text-green-300 rounded text-xs">
                          {user.paidCount} VENDUTI €{formatPrice(user.revenue)}
                        </span>
                      )}
                      {user.burned > 0 && (
                        <span className="px-2 py-1 bg-red-500/30 text-red-300 rounded text-xs">
                          {user.burned} VIDIMATI
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-purple-200 font-bold text-lg">{user.received}</div>
                      <div className="text-purple-400/80 text-sm">Hai Ricevuto</div>
                    </div>
                    <div className="text-center">
                      <div className="text-purple-200 font-bold text-lg">{user.sold}</div>
                      <div className="text-purple-400/80 text-sm">Hai Distribuito</div>
                    </div>
                    <div className="text-center">
                      <div className="text-purple-200 font-bold text-lg">{user.remaining}</div>
                      <div className="text-purple-400/80 text-sm">Ti Rimangono</div>
                    </div>
                    <div className="text-center">
                      <div className="text-red-200 font-bold text-lg">{user.burned}</div>
                      <div className="text-red-400/80 text-sm">Sono Vidimati</div>
                    </div>
                  </div>
                </div>
                
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  // SEPARAZIONE LOGICA: Creatore vs Collaboratori
  if (selectedCollaborator === 'all' || selectedCollaborator === 'me') {
    return renderCreatorView();
  } else {
    return renderCollaboratorView();
  }
}
"use client";

import { useState, useMemo } from "react";
import type { Event } from "~/types";
import { StatisticsHeader } from "./statistics/StatisticsHeader";
import { CollaboratorFilter } from "./statistics/CollaboratorFilter";
import { ProductsSection } from "./statistics/ProductsSection";
import { EntriesSection } from "./statistics/EntriesSection";

interface StatisticsSectionProps {
  event: Event;
}

export function StatisticsSection({ event }: StatisticsSectionProps) {
  const [activeTab, setActiveTab] = useState<'products' | 'entries'>('products');
  const [selectedCollaborator, setSelectedCollaborator] = useState<string>('all');

  // Lista dei collaboratori per il filtro
  const collaboratorsList = useMemo(() => {
    const list = [
      { id: 'all', name: 'Tutti', userId: 'all' },
      { id: 'me', name: 'Io (Creatore)', userId: event.user_id.toString() }
    ];
    
    event.collaborators?.forEach(collab => {
      if (collab.user) {
        list.push({
          id: collab.user_id?.toString() || 'unknown',
          name: `${collab.user.name} ${collab.user.surname}`,
          userId: collab.user_id?.toString() || 'unknown'
        });
      }
    });
    
    return list;
  }, [event.collaborators, event.user_id]);

  // Statistiche generali per collaboratore selezionato
  const collaboratorGeneralStats = useMemo(() => {
    if (selectedCollaborator === 'all') {
      // TUTTI - Ricavi totali evento
      const totalProductRevenue = (event.products || []).reduce((sum, p) => 
        p.paid == 'paid' ? sum + Number(p.price || 0) : sum, 0
      );
      const totalEntryRevenue = (event.entry_types || []).reduce((sum, e) => 
        e.paid == 'paid' ? sum + Number(e.price || 0) : sum, 0
      );
      
      return {
        totalRevenue: totalProductRevenue + totalEntryRevenue,
        productRevenue: totalProductRevenue,
        entryRevenue: totalEntryRevenue,
        productsSold: (event.products || []).filter(p => p.paid === 'paid').length,
        entriesSold: (event.entry_types || []).filter(e => e.paid === 'paid').length
      };
      
    } else if (selectedCollaborator === 'me') {
      // CREATORE - Ricavi totali (come "tutti")
      const totalProductRevenue = (event.products || []).reduce((sum, p) => 
        p.paid == 'paid' ? sum + Number(p.price || 0) : sum, 0
      );
      const totalEntryRevenue = (event.entry_types || []).reduce((sum, e) => 
        e.paid == 'paid' ? sum + Number(e.price || 0) : sum, 0
      );
      
      return {
        totalRevenue: totalProductRevenue + totalEntryRevenue,
        productRevenue: totalProductRevenue,
        entryRevenue: totalEntryRevenue,
        productsSold: (event.products || []).filter(p => p.paid === 'paid').length,
        entriesSold: (event.entry_types || []).filter(e => e.paid === 'paid').length
      };
      
    } else {
      // COLLABORATORE SPECIFICO - Solo i suoi ricavi
      const userId = parseInt(selectedCollaborator);
      
      // RICAVI CORRETTI: dai prodotti/ingressi venduti dal collaboratore
      const productRevenue = (event.products || [])
        .filter(p => p.old_user_id === userId && p.paid === 'paid')
        .reduce((sum, p) => sum + Number(p.price || 0), 0);
        
      const entryRevenue = (event.entry_types || [])
        .filter(e => e.old_user_id === userId && e.paid === 'paid')
        .reduce((sum, e) => sum + Number(e.price || 0), 0);
      
      return {
        totalRevenue: productRevenue + entryRevenue,
        productRevenue,
        entryRevenue,
        productsSold: (event.products || []).filter(p => 
          p.old_user_id === userId && p.paid === 'paid'
        ).length,
        entriesSold: (event.entry_types || []).filter(e => 
          e.old_user_id === userId && e.paid === 'paid'
        ).length
      };
    }
  }, [event.products, event.entry_types, event.user_id, selectedCollaborator]);

  return (
    <div className="space-y-8">
      <StatisticsHeader eventName={event.title ?? undefined} />
      
      <CollaboratorFilter
        collaborators={collaboratorsList}
        selectedCollaborator={selectedCollaborator}
        onCollaboratorChange={setSelectedCollaborator}
        generalStats={collaboratorGeneralStats}
      />

      {/* Tab Navigation */}
      <div className="flex gap-4 border-b border-white/20">
        <button
          onClick={() => setActiveTab('products')}
          className={`px-6 py-3 font-semibold transition-all ${
            activeTab === 'products'
              ? 'text-orange-300 border-b-2 border-orange-400'
              : 'text-white/60 hover:text-white/80'
          }`}
        >
          🛍️ Prodotti
        </button>
        <button
          onClick={() => setActiveTab('entries')}
          className={`px-6 py-3 font-semibold transition-all ${
            activeTab === 'entries'
              ? 'text-cyan-300 border-b-2 border-cyan-400'
              : 'text-white/60 hover:text-white/80'
          }`}
        >
          🎟️ Ingressi
        </button>
      </div>

      {/* Contenuto Tab */}
      <div className="min-h-[400px]">
        {activeTab === 'products' ? (
          <ProductsSection
            products={event.products || []}
            collaborators={(event.collaborators || []).filter(c => c.user_id !== null) as Array<{ user_id: number; user?: { name: string; surname: string } }>}
            eventUserId={event.user_id}
            selectedCollaborator={selectedCollaborator}
          />
        ) : (
          <EntriesSection
            entries={event.entry_types || []}
            collaborators={(event.collaborators || []).filter(c => c.user_id !== null) as Array<{ user_id: number; user?: { name: string; surname: string } }>}
            eventUserId={event.user_id}
            selectedCollaborator={selectedCollaborator}
          />
        )}
      </div>
    </div>
  );
}
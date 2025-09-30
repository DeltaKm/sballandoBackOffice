"use client";

import type { Product } from "~/types";
import { useState, useMemo } from "react";

interface ProductStats {
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

interface ProductsSectionProps {
  products: Product[];
  collaborators: Array<{ user_id: number; user?: { name: string; surname: string } }>;
  eventUserId: number;
  selectedCollaborator: string;
}

export function ProductsSection({ 
  products, 
  collaborators, 
  eventUserId, 
  selectedCollaborator 
}: ProductsSectionProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const formatPrice = (price: number | string | undefined | null): string => {
    if (price === null || price === undefined || price === '') return '0.00';
    const numPrice = typeof price === 'string' ? parseFloat(price) : price;
    return isNaN(numPrice) ? '0.00' : numPrice.toFixed(2);
  };

  // CORREZIONE: Includi TUTTI i prodotti per calcolare correttamente i ricavi
  const filteredProducts = useMemo(() => {
    if (selectedCollaborator === 'all' || selectedCollaborator === 'me') {
      // Per "tutti" e "me": mostra solo prodotti di creatore + collaboratori
      const collaboratorIds = [eventUserId, ...(collaborators?.map(c => c.user_id) || [])];
      return products.filter(p => 
        p.user_id && collaboratorIds.includes(p.user_id)
      );
    } else {
      // Per collaboratore specifico: mostra TUTTI i prodotti che lo riguardano
      const targetUserId = parseInt(selectedCollaborator);
      return products.filter(p => 
        p.user_id === targetUserId ||  // Prodotti che possiede
        p.old_user_id === targetUserId // Prodotti che ha venduto
      );
    }
  }, [products, collaborators, eventUserId, selectedCollaborator]);

  // Estrai tutte le categorie disponibili
  const availableCategories = useMemo(() => {
    const categories = new Set<string>();
    filteredProducts.forEach(product => {
      const category = product.category || 'Senza Categoria';
      categories.add(category);
    });
    return Array.from(categories).sort();
  }, [filteredProducts]);

  // Filtra i prodotti per categoria selezionata
  const categoryFilteredProducts = useMemo(() => {
    if (selectedCategory === 'all') return filteredProducts;
    return filteredProducts.filter(p => 
      (p.category || 'Senza Categoria') === selectedCategory
    );
  }, [filteredProducts, selectedCategory]);

  console.log('🔍 ProductsSection Debug:', {
    totalProducts: products.length,
    filteredProducts: filteredProducts.length,
    categoryFilteredProducts: categoryFilteredProducts.length,
    selectedCollaborator,
    selectedCategory,
    eventUserId,
    availableCategories,
    productsPreview: categoryFilteredProducts.slice(0, 3).map(p => ({
      id: p.id,
      label: p.label,
      category: p.category,
      status: p.paid,
      price: p.price,
      user_id: p.user_id,
      old_user_id: p.old_user_id
    }))
  });

  // ==================== VISTA CREATORE ====================
  function renderCreatorView() {
    console.log('🎯 Rendering Creator View, selectedCollaborator:', selectedCollaborator);
    
    // Raggruppa per label
    const productsByLabel = categoryFilteredProducts.reduce((acc, product) => {
      const label = product.label || 'Senza Nome';
      if (!acc[label]) {
        acc[label] = [];
      }
      acc[label].push(product);
      return acc;
    }, {} as Record<string, Product[]>);

    console.log('📊 Products grouped by label:', Object.keys(productsByLabel));

    // Calcola statistiche per ogni gruppo
    const productStats: ProductStats[] = Object.entries(productsByLabel).map(([label, groupProducts]) => {
      if (selectedCollaborator === 'me') {
        // ============ STATISTICHE PER IL CREATORE ============
        const creatorProduct = groupProducts.find(p => p.user_id === eventUserId);
        
        if (!creatorProduct) {
          console.warn(`⚠️ No creator product found for label: ${label}`);
          return null;
        }
        
        const totalCreated = creatorProduct.created_qnt || 0;
        const creatorRemaining = creatorProduct.stock || 0;
        const totalDistributed = totalCreated - creatorRemaining;
        
        // Solo i prodotti pagati del creatore per questa label
        const paidProducts = products.filter(p => 
          p.label === label && 
          p.old_user_id === eventUserId && 
          p.paid === 'paid'
        );
        const paidCount = paidProducts.length;
        const totalRevenue = paidProducts.reduce((sum, p) => sum + Number(p.price || 0), 0);
        
        // Prodotti vidimati venduti dal creatore
        const burnedProducts = products.filter(p => 
          p.label === label && 
          p.old_user_id === eventUserId && 
          p.burned === 1
        );
        const burnedCount = burnedProducts.length;

        console.log(`👑 Creator stats for ${label}:`, {
          totalCreated,
          creatorRemaining,
          totalDistributed,
          paidProducts: paidProducts.length,
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
          category: creatorProduct.category || 'Senza Categoria',
          price: Number(creatorProduct.price || 0),
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
        const originalProduct = groupProducts.find(p => (p.created_qnt || 0) > 0);
        const totalCreated = originalProduct?.created_qnt || 0;
        
        // Statistiche globali (solo creatore + collaboratori)
        const totalDistributed = groupProducts.reduce((sum, p) => sum + (p.transfer_qnt || 0), 0);
        const totalRemaining = groupProducts.reduce((sum, p) => sum + (p.stock || 0), 0);
        const totalSold = totalDistributed - totalRemaining;
        
        // RICAVO TOTALE = Solo dai prodotti venduti da creatore + collaboratori
        const collaboratorIds = [eventUserId, ...(collaborators?.map(c => c.user_id) || [])];
        const paidProducts = products.filter(p => 
          p.label === label && 
          p.old_user_id && 
          collaboratorIds.includes(p.old_user_id) && 
          p.paid === 'paid'
        );
        const totalRevenue = paidProducts.reduce((sum, p) => sum + Number(p.price || 0), 0);

        console.log(`🌍 Global stats for ${label}:`, {
          totalCreated,
          totalDistributed,
          totalRemaining,
          paidProducts: paidProducts.length,
          totalRevenue,
          collaboratorIds
        });

        // User stats per creatore + collaboratori (no utenti finali)
        const userStats = groupProducts.map((p, index) => {
          const collaborator = collaborators?.find(c => c.user_id === p.user_id);
          const isMe = p.user_id === eventUserId;
          
          // Prodotti venduti da questo utente (solo se è creatore o collaboratore)
          const soldByUser = products.filter(prod => 
            prod.label === label &&
            prod.old_user_id === p.user_id && 
            prod.paid === 'paid'
          );
          const burnedByUser = products.filter(prod => 
            prod.label === label &&
            prod.old_user_id === p.user_id && 
            prod.burned === 1
          ).length;
          
          const userRevenue = soldByUser.reduce((sum, prod) => sum + Number(prod.price || 0), 0);
          
          return {
            uniqueId: `${p.id || p.user_id}-${index}`,
            userId: p.user_id,
            name: isMe ? 'Io (Creatore)' : 
                  collaborator?.user ? `${collaborator.user.name} ${collaborator.user.surname}` : 
                  `Utente ${p.user_id}`,
            role: isMe ? 'Creatore' : 'Collaboratore',
            received: p.transfer_qnt || 0,
            remaining: p.stock || 0,
            sold: (p.transfer_qnt || 0) - (p.stock || 0),
            burned: burnedByUser,
            isPaid: soldByUser.length > 0,
            revenue: userRevenue,
            paidCount: soldByUser.length
          };
        });

        return {
          label,
          category: originalProduct?.category || groupProducts[0]?.category || 'Senza Categoria',
          price: Number(originalProduct?.price || groupProducts[0]?.price || 0),
          totalCreated,
          totalDistributed,
          totalRemaining,
          totalSold,
          totalRevenue,
          userStats
        };
      }
    }).filter(Boolean) as ProductStats[];

    // CALCOLO RICAVI TOTALI (filtrati per categoria)
    const totalEventRevenue = productStats.reduce((sum, product) => sum + product.totalRevenue, 0);

    console.log(`💰 TOTAL EVENT REVENUE from products (category: ${selectedCategory}): €${totalEventRevenue}`);

    if (productStats.length === 0) {
      return (
        <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-8 text-center">
          <span className="text-orange-400 text-5xl">🛍️</span>
          <p className="text-orange-300 mt-4">
            {selectedCategory === 'all' ? 'Nessun prodotto trovato' : `Nessun prodotto trovato per "${selectedCategory}"`}
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
                  ? 'bg-orange-500 text-white'
                  : 'bg-orange-500/20 text-orange-300 hover:bg-orange-500/30'
              }`}
            >
              Tutte ({filteredProducts.length})
            </button>
            {availableCategories.map((category) => {
              const count = filteredProducts.filter(p => 
                (p.category || 'Senza Categoria') === category
              ).length;
              return (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                    selectedCategory === category
                      ? 'bg-orange-500 text-white'
                      : 'bg-orange-500/20 text-orange-300 hover:bg-orange-500/30'
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
              💰 Ricavi Totali Evento - Prodotti
              {selectedCategory !== 'all' && (
                <span className="text-green-400/80 font-normal ml-2">({selectedCategory})</span>
              )}
            </h3>
            <div className="text-center">
              <div className="text-green-400 font-bold text-4xl">€{formatPrice(totalEventRevenue)}</div>
              <div className="text-green-400/80 text-lg mt-2">
                Totale da {selectedCategory === 'all' ? 'Tutti i Prodotti' : `Prodotti "${selectedCategory}"`} Venduti
              </div>
            </div>
          </div>
        )}

        {/* RIEPILOGO CREATORE */}
        {selectedCollaborator === 'me' && (
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-6">
            <h3 className="text-blue-200 font-bold text-xl mb-4">
              👑 I Miei Ricavi Totali - Prodotti
              {selectedCategory !== 'all' && (
                <span className="text-blue-400/80 font-normal ml-2">({selectedCategory})</span>
              )}
            </h3>
            <div className="text-center">
              <div className="text-blue-400 font-bold text-4xl">€{formatPrice(totalEventRevenue)}</div>
              <div className="text-blue-400/80 text-lg mt-2">
                Totale dai Miei Prodotti {selectedCategory !== 'all' ? `"${selectedCategory}"` : ''}
              </div>
            </div>
          </div>
        )}

        {productStats.map((product) => (
          <div key={product.label} className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-6">
            {/* Header Prodotto */}
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-orange-200 font-bold text-xl">{product.label}</h3>
                <div className="flex items-center gap-3 mt-2">
                  <span className="px-2 py-1 bg-orange-500/30 text-orange-300 rounded text-sm">
                    {product.category}
                  </span>
                  <span className="text-orange-300 font-semibold">€{formatPrice(product.price)}</span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-green-400 font-bold text-2xl">€{formatPrice(product.totalRevenue)}</div>
                <div className="text-orange-400/80 text-sm">
                  Ricavi da questo Prodotto
                </div>
              </div>
            </div>

            {/* Statistiche */}
            <div className="grid grid-cols-4 gap-4 mb-6">
              <div className="bg-orange-600/30 rounded-lg p-4 text-center">
                <div className="text-orange-200 font-bold text-2xl">{product.totalCreated}</div>
                <div className="text-orange-400/80 text-sm">
                  {selectedCollaborator === 'me' ? 'Creati' : 'Totale Creati'}
                </div>
              </div>
              <div className="bg-orange-600/30 rounded-lg p-4 text-center">
                <div className="text-orange-200 font-bold text-2xl">{product.totalDistributed}</div>
                <div className="text-orange-400/80 text-sm">Distribuiti</div>
              </div>
              <div className="bg-orange-600/30 rounded-lg p-4 text-center">
                <div className="text-orange-200 font-bold text-2xl">{product.totalRemaining}</div>
                <div className="text-orange-400/80 text-sm">Rimasti</div>
              </div>
              <div className="bg-red-600/30 rounded-lg p-4 text-center">
                <div className="text-red-200 font-bold text-2xl">{product.burnedCount || 0}</div>
                <div className="text-red-400/80 text-sm">Vidimati</div>
              </div>
            </div>

            {/* Dettaglio Utenti (Solo Creatore + Collaboratori) */}
            <div className="space-y-3">
              <h4 className="text-orange-300 font-semibold">
                {selectedCollaborator === 'me' ? 'Le Mie Statistiche' : 'Dettagli Creatore & Collaboratori'}
              </h4>
              {product.userStats.map((user) => (
                <div key={user.uniqueId} className="bg-orange-600/20 rounded-lg p-4">
                  <div className="flex justify-between items-center mb-3">
                    <div>
                      <span className="text-orange-200 font-medium">{user.name}</span>
                      <span className="ml-2 px-2 py-1 bg-orange-500/20 text-orange-300 rounded text-xs">
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
                      <div className="text-orange-200 font-bold text-lg">{user.received}</div>
                      <div className="text-orange-400/80 text-sm">
                        {selectedCollaborator === 'me' ? 'Creati' : 'Ricevuti'}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-orange-200 font-bold text-lg">{user.sold}</div>
                      <div className="text-orange-400/80 text-sm">Distribuiti</div>
                    </div>
                    <div className="text-center">
                      <div className="text-orange-200 font-bold text-lg">{user.remaining}</div>
                      <div className="text-orange-400/80 text-sm">Rimasti</div>
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
    
    console.log('👤 Rendering Collaborator View for userId:', targetUserId);
    
    // CORREZIONE: Usa filteredProducts che ora include i prodotti venduti
    const collaboratorProducts = categoryFilteredProducts.filter(p => 
      p.user_id === targetUserId || p.old_user_id === targetUserId
    );

    console.log(`📦 Found ${collaboratorProducts.length} products for collaborator ${targetUserId}`, {
      categoryFilteredProducts: categoryFilteredProducts.length,
      collaboratorProductsDetails: collaboratorProducts.slice(0, 3).map(p => ({
        id: p.id,
        label: p.label,
        user_id: p.user_id,
        old_user_id: p.old_user_id,
        paid: p.paid
      }))
    });

    if (collaboratorProducts.length === 0) {
      const collaboratorName = collaborators.find(c => c.user_id === targetUserId)?.user ? 
        `${collaborators.find(c => c.user_id === targetUserId)!.user!.name} ${collaborators.find(c => c.user_id === targetUserId)!.user!.surname}` :
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
                    ? 'bg-orange-500 text-white'
                    : 'bg-orange-500/20 text-orange-300 hover:bg-orange-500/30'
                }`}
              >
                Tutte ({products.filter(p => p.user_id === targetUserId || p.old_user_id === targetUserId).length})
              </button>
              {availableCategories.map((category) => {
                const count = products.filter(p => 
                  (p.user_id === targetUserId || p.old_user_id === targetUserId) &&
                  (p.category || 'Senza Categoria') === category
                ).length;
                return (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                      selectedCategory === category
                        ? 'bg-orange-500 text-white'
                        : 'bg-orange-500/20 text-orange-300 hover:bg-orange-500/30'
                    }`}
                  >
                    {category} ({count})
                  </button>
                );
              })}
            </div>
          </div>

          <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-8 text-center">
            <span className="text-orange-400 text-5xl">🛍️</span>
            <p className="text-orange-300 mt-4">
              {selectedCategory === 'all' ? 'Nessun prodotto trovato' : `Nessun prodotto trovato per "${selectedCategory}"`}
            </p>
            <p className="text-orange-400/60 text-sm mt-2">
              Collaboratore: {collaboratorName}
            </p>
            <div className="text-orange-400/40 text-xs mt-4">
              Debug: targetUserId={targetUserId}, totalProducts={products.length}
            </div>
          </div>
        </div>
      );
    }

    // Raggruppa per label
    const productsByLabel = collaboratorProducts.reduce((acc, product) => {
      const label = product.label || 'Senza Nome';
      if (!acc[label]) {
        acc[label] = [];
      }
      acc[label].push(product);
      return acc;
    }, {} as Record<string, Product[]>);

    // Calcola statistiche SPECIFICHE del collaboratore
    const productStats: ProductStats[] = Object.entries(productsByLabel).map(([label, groupProducts]) => {
      // Trova il record principale del collaboratore
      const collaboratorProduct = groupProducts.find(p => p.user_id === targetUserId);
      
      // Statistiche del collaboratore
      const collaboratorReceived = collaboratorProduct?.transfer_qnt || 0;
      const collaboratorRemaining = collaboratorProduct?.stock || 0;
      const collaboratorDistributed = collaboratorReceived - collaboratorRemaining;
      
      // Prodotti venduti dal collaboratore (old_user_id === targetUserId && paid === 'paid')
      const soldByCollaborator = products.filter(p => 
        p.label === label && 
        p.old_user_id === targetUserId && 
        p.paid === 'paid' &&
        (selectedCategory === 'all' || (p.category || 'Senza Categoria') === selectedCategory)
      );
      
      // Prodotti vidimati distribuiti dal collaboratore
      const burnedByCollaborator = products.filter(p => 
        p.label === label && 
        p.old_user_id === targetUserId && 
        p.burned === 1 &&
        (selectedCategory === 'all' || (p.category || 'Senza Categoria') === selectedCategory)
      );
      
      // RICAVO del collaboratore
      const collaboratorRevenue = soldByCollaborator.reduce((sum, p) => sum + Number(p.price || 0), 0);

      console.log(`👤 Collaborator ${targetUserId} revenue for ${label}:`, {
        received: collaboratorReceived,
        remaining: collaboratorRemaining,
        distributed: collaboratorDistributed,
        soldCount: soldByCollaborator.length,
        burnedCount: burnedByCollaborator.length,
        revenue: collaboratorRevenue
      });

      const originalProduct = products.find(p => p.label === label && (p.created_qnt || 0) > 0);
      const collaborator = collaborators.find(c => c.user_id === targetUserId);

      const userStats = [{
        uniqueId: `collab-${targetUserId}`,
        userId: targetUserId,
        name: collaborator?.user ? 
          `${collaborator.user.name} ${collaborator.user.surname}` : 
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
        category: originalProduct?.category || collaboratorProduct?.category || 'Senza Categoria',
        price: Number(originalProduct?.price || collaboratorProduct?.price || 0),
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
    const totalCollaboratorRevenue = products.filter(p => 
      p.old_user_id === targetUserId && 
      p.paid === 'paid' &&
      (selectedCategory === 'all' || (p.category || 'Senza Categoria') === selectedCategory)
    ).reduce((sum, p) => sum + Number(p.price || 0), 0);

    console.log(`💵 Total collaborator ${targetUserId} revenue (category: ${selectedCategory}): €${totalCollaboratorRevenue}`);

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
                  ? 'bg-orange-500 text-white'
                  : 'bg-orange-500/20 text-orange-300 hover:bg-orange-500/30'
              }`}
            >
              Tutte ({products.filter(p => p.user_id === targetUserId || p.old_user_id === targetUserId).length})
            </button>
            {availableCategories.map((category) => {
              const count = products.filter(p => 
                (p.user_id === targetUserId || p.old_user_id === targetUserId) &&
                (p.category || 'Senza Categoria') === category
              ).length;
              return (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                    selectedCategory === category
                      ? 'bg-orange-500 text-white'
                      : 'bg-orange-500/20 text-orange-300 hover:bg-orange-500/30'
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
            💰 Riepilogo Totale Ricavi
            {selectedCategory !== 'all' && (
              <span className="text-green-400/80 font-normal ml-2">({selectedCategory})</span>
            )}
          </h3>
          <div className="text-center">
            <div className="text-green-400 font-bold text-4xl">€{formatPrice(totalCollaboratorRevenue)}</div>
            <div className="text-green-400/80 text-lg mt-2">
              Totale Ricavi da {selectedCategory === 'all' ? 'Tutte le' : `"${selectedCategory}"`} Vendite
            </div>
          </div>
        </div>

        {/* DETTAGLI PRODOTTI */}
        {productStats.map((product) => (
          <div key={product.label} className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-6">
            {/* Header Prodotto */}
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-orange-200 font-bold text-xl">{product.label}</h3>
                <div className="flex items-center gap-3 mt-2">
                  <span className="px-2 py-1 bg-orange-500/30 text-orange-300 rounded text-sm">
                    {product.category}
                  </span>
                  <span className="text-orange-300 font-semibold">€{formatPrice(product.price)}</span>
                  <span className="px-2 py-1 bg-blue-500/30 text-blue-300 rounded text-sm">
                    Vista Collaboratore
                  </span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-green-400 font-bold text-2xl">€{formatPrice(product.totalRevenue)}</div>
                <div className="text-orange-400/80 text-sm">I Tuoi Ricavi</div>
              </div>
            </div>

            {/* Statistiche del Collaboratore */}
            <div className="grid grid-cols-4 gap-4 mb-6">
              <div className="bg-orange-600/30 rounded-lg p-4 text-center">
                <div className="text-orange-200 font-bold text-2xl">{product.totalCreated}</div>
                <div className="text-orange-400/80 text-sm">Ricevuti</div>
              </div>
              <div className="bg-orange-600/30 rounded-lg p-4 text-center">
                <div className="text-orange-200 font-bold text-2xl">{product.totalDistributed}</div>
                <div className="text-orange-400/80 text-sm">Distribuiti</div>
              </div>
              <div className="bg-orange-600/30 rounded-lg p-4 text-center">
                <div className="text-orange-200 font-bold text-2xl">{product.totalRemaining}</div>
                <div className="text-orange-400/80 text-sm">Rimasti</div>
              </div>
              <div className="bg-red-600/30 rounded-lg p-4 text-center">
                <div className="text-red-200 font-bold text-2xl">{product.burnedCount || 0}</div>
                <div className="text-red-400/80 text-sm">Vidimati</div>
              </div>
            </div>

            {/* Dettaglio del Collaboratore */}
            <div className="space-y-3">
              <h4 className="text-orange-300 font-semibold">Le Tue Statistiche</h4>
              {product.userStats.map((user) => (
                <div key={user.uniqueId} className="bg-orange-600/20 rounded-lg p-4">
                  <div className="flex justify-between items-center mb-3">
                    <div>
                      <span className="text-orange-200 font-medium">{user.name}</span>
                      <span className="ml-2 px-2 py-1 bg-orange-500/20 text-orange-300 rounded text-xs">
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
                      <div className="text-orange-200 font-bold text-lg">{user.received}</div>
                      <div className="text-orange-400/80 text-sm">Hai Ricevuto</div>
                    </div>
                    <div className="text-center">
                      <div className="text-orange-200 font-bold text-lg">{user.sold}</div>
                      <div className="text-orange-400/80 text-sm">Hai Distribuito</div>
                    </div>
                    <div className="text-center">
                      <div className="text-orange-200 font-bold text-lg">{user.remaining}</div>
                      <div className="text-orange-400/80 text-sm">Ti Rimangono</div>
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
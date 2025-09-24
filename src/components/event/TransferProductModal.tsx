"use client";

import { useState, useMemo } from "react";
import { useAuthStore } from "~/store/auth";
import type { Event, Product } from "~/types";

interface TransferProductModalProps {
  show: boolean;
  product: Product | null;
  event: Event;
  onClose: () => void;
  onSuccess: (updatedEvent: Event) => void;
}

export function TransferProductModal({ show, product, event, onClose, onSuccess }: TransferProductModalProps) {
  const [transfers, setTransfers] = useState<Record<number, string>>({});
  const [transferring, setTransferring] = useState(false);
  const user = useAuthStore((state) => state.user);

  // Analisi collaboratori e loro prodotti compatibili
  const collaboratorsData = useMemo(() => {
    if (!product || !event.collaborators || !event.products) return [];

    return event.collaborators.map(collab => {
      // Trova prodotti del collaboratore con stesso label
      const compatibleProducts = event.products?.filter(p => 
        p.user_id === collab.user_id && 
        p.label.toLowerCase() === product.label.toLowerCase()
      ) || [];

      return {
        collaborator: collab,
        user: collab.user,
        compatibleProducts,
        hasCompatibleProduct: compatibleProducts.length > 0,
        totalStock: compatibleProducts.reduce((sum, p) => sum + (p.stock || 0), 0)
      };
    });
  }, [product, event.collaborators, event.products]);

  const availableQuantity = product ? (product.stock || 0) : 0;
  
  // Calcola totale da trasferire
  const totalToTransfer = Object.values(transfers).reduce((sum, qty) => {
    const num = parseInt(qty) || 0;
    return sum + num;
  }, 0);

  const handleTransferChange = (collaboratorId: number, value: string) => {
    const numValue = parseInt(value) || 0;
    const maxAllowed = Math.min(availableQuantity - (totalToTransfer - (parseInt(transfers[collaboratorId]) || 0)), availableQuantity);
    
    if (numValue <= maxAllowed && numValue >= 0) {
      setTransfers(prev => ({
        ...prev,
        [collaboratorId]: value
      }));
    }
  };

  const handleConfirmTransfer = async () => {
    if (!product || !user?.token || totalToTransfer === 0) return;

    setTransferring(true);
    try {
      const transferData = Object.entries(transfers)
        .filter(([_, qty]) => parseInt(qty) > 0)
        .map(([collaboratorId, qty]) => ({
          collaborator_id: parseInt(collaboratorId),
          quantity: parseInt(qty)
        }));

      const res = await fetch('/api/products/transfer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          product_id: product.id,
          transfers: transferData,
          user_token: user.token
        }),
      });

      if (res.ok) {
        const updatedEvent = await res.json();
        onSuccess(updatedEvent);
        onClose();
        setTransfers({});
      } else {
        const errorData = await res.json();
        alert(`Errore durante il trasferimento: ${errorData.error || 'Errore sconosciuto'}`);
      }
    } catch (err) {
      console.error('Error transferring products:', err);
      alert('Errore durante la connessione al server');
    } finally {
      setTransferring(false);
    }
  };

  if (!show || !product) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-gray-900 border border-white/20 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 w-10 h-10 bg-purple-500/20 rounded-full flex items-center justify-center">
              <span className="text-purple-400 text-lg">🛍️</span>
            </div>
            <div>
              <h3 className="text-white font-semibold">Trasferisci Prodotti</h3>
              <p className="text-white/60 text-sm">"{product.label}" - Disponibili: {availableQuantity}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
          >
            <span className="text-white/80">✕</span>
          </button>
        </div>

        {/* Info Prodotto */}
        <div className="mb-6 p-4 bg-white/5 border border-white/10 rounded-lg">
          <div className="flex justify-between items-start">
            <div>
              <h4 className="text-white font-medium mb-1">{product.label}</h4>
              {product.description && (
                <p className="text-white/60 text-sm mb-2">{product.description}</p>
              )}
              {product.category && (
                <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs">
                  {product.category}
                </span>
              )}
            </div>
            <div className="text-right">
              <div className="text-[#FC0045] font-bold">€{product.price || '0.00'}</div>
              <div className="text-white/60 text-sm">Stock: {product.stock || '0'}</div>
            </div>
          </div>
        </div>

        {/* Riepilogo Trasferimento */}
        {totalToTransfer > 0 && (
          <div className="mb-6 p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-purple-400 font-medium">Totale da trasferire:</span>
              <span className="text-purple-400 font-bold">{totalToTransfer}</span>
            </div>
            <div className="flex justify-between items-center mt-1">
              <span className="text-white/60 text-sm">Rimanenti dopo trasferimento:</span>
              <span className="text-white/60 text-sm">{availableQuantity - totalToTransfer}</span>
            </div>
          </div>
        )}

        {/* Lista Collaboratori */}
        <div className="space-y-4 mb-6">
          <h4 className="text-white font-medium">Collaboratori</h4>
          
          {collaboratorsData.length === 0 ? (
            <div className="text-center py-6 text-white/60">
              <span className="text-2xl mb-2 block">👥</span>
              <p>Nessun collaboratore disponibile</p>
            </div>
          ) : (
            <div className="space-y-3">
              {collaboratorsData.map(({ collaborator, user: collabUser, compatibleProducts, hasCompatibleProduct, totalStock }) => {
                const maxTransfer = Math.min(availableQuantity - (totalToTransfer - (parseInt(transfers[collaborator.user_id]) || 0)), availableQuantity);
                const currentValue = transfers[collaborator.user_id] || '';
                
                return (
                  <div key={collaborator.user_id} className="p-4 bg-white/5 border border-white/10 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="flex items-center gap-2">
                            {collabUser?.picture && (
                              <img 
                                src={collabUser.picture} 
                                alt={collabUser.name} 
                                className="w-8 h-8 rounded-full"
                              />
                            )}
                            <div>
                              <span className="text-white font-medium">
                                {collabUser ? `${collabUser.name} ${collabUser.surname}` : `User ${collaborator.user_id}`}
                              </span>
                              <span className="ml-2 px-2 py-1 bg-purple-500/20 text-purple-400 rounded text-xs">
                                {collaborator.role}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Info prodotti compatibili */}
                        <div className="mb-3">
                          {hasCompatibleProduct ? (
                            <div className="flex items-center gap-2">
                              <span className="text-green-400 text-sm">✅ Ha prodotti compatibili</span>
                              <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs">
                                {compatibleProducts.length} tipo{compatibleProducts.length !== 1 ? 'i' : ''} 
                                {totalStock > 0 && ` • Stock totale: ${totalStock}`}
                              </span>
                            </div>
                          ) : (
                            <span className="text-yellow-400 text-sm">⚠️ Nessun prodotto compatibile (stesso nome)</span>
                          )}
                        </div>

                        {/* Input quantità */}
                        <div className="flex items-center gap-3">
                          <label className="text-white/80 text-sm font-medium min-w-0">
                            Trasferisci:
                          </label>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min="0"
                              max={maxTransfer}
                              value={currentValue}
                              onChange={(e) => handleTransferChange(collaborator.user_id, e.target.value)}
                              placeholder="0"
                              className="w-20 px-2 py-1 bg-white/10 border border-white/20 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                              disabled={maxTransfer === 0}
                            />
                            <span className="text-white/60 text-sm">
                              (max: {maxTransfer})
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Lista prodotti compatibili */}
                    {hasCompatibleProduct && (
                      <div className="mt-3 pt-3 border-t border-white/10">
                        <p className="text-white/60 text-xs mb-2">Prodotti compatibili:</p>
                        <div className="space-y-1">
                          {compatibleProducts.map(cp => (
                            <div key={cp.id} className="flex justify-between items-center text-xs">
                              <span className="text-white/80">
                                {cp.label} {cp.category && `(${cp.category})`}
                              </span>
                              <span className="text-white/60">
                                €{cp.price} • Stock: {cp.stock || '0'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={transferring}
            className="flex-1 px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors disabled:opacity-50"
          >
            Annulla
          </button>
          <button
            onClick={handleConfirmTransfer}
            disabled={transferring || totalToTransfer === 0 || totalToTransfer > availableQuantity}
            className="flex-1 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {transferring ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                Trasferendo...
              </>
            ) : (
              <>
                🛍️ Trasferisci {totalToTransfer > 0 ? `(${totalToTransfer})` : ''}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
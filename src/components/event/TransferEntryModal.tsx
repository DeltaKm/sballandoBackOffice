"use client";

import { useState, useMemo } from "react";
import { useAuthStore } from "~/store/auth";
import type { Event, EntryType } from "~/types";

interface TransferEntryModalProps {
  show: boolean;
  entry: EntryType | null;
  event: Event;
  onClose: () => void;
  onSuccess: (updatedEvent: Event) => void;
}

export function TransferEntryModal({ show, entry, event, onClose, onSuccess }: TransferEntryModalProps) {
  const [transfers, setTransfers] = useState<Record<number, string>>({});
  const [transferring, setTransferring] = useState(false);
  const user = useAuthStore((state) => state.user);

  // Analisi collaboratori e loro ingressi compatibili
  const collaboratorsData = useMemo(() => {
    if (!entry || !event.collaborators || !event.entry_types) return [];

    return event.collaborators.map(collab => {
      // Trova ingressi del collaboratore con stesso label
      const compatibleEntries = event.entry_types?.filter(et => 
        et.user_id === collab.user_id && 
        et.label.toLowerCase() === entry.label.toLowerCase()
      ) || [];

      return {
        collaborator: collab,
        user: collab.users,
        compatibleEntries,
        hasCompatibleEntry: compatibleEntries.length > 0,
        totalStock: compatibleEntries.reduce((sum, et) => sum + (et.stock || 0), 0)
      };
    });
  }, [entry, event.collaborators, event.entry_types]);

  const availableQuantity = entry ? (entry.stock || 0) : 0;
  
  // Calcola totale da trasferire
  const totalToTransfer = Object.values(transfers).reduce((sum, qty) => {
    const num = parseInt(qty) || 0;
    return sum + num;
  }, 0);

  const handleTransferChange = (collaboratorId: number, value: string) => {
    const numValue = parseInt(value) || 0;
    const maxAllowed = Math.min(
      availableQuantity - (totalToTransfer - (parseInt(transfers[collaboratorId] ?? "") || 0)),
      availableQuantity
    );
    
    if (numValue <= maxAllowed && numValue >= 0) {
      setTransfers(prev => ({
        ...prev,
        [collaboratorId]: value
      }));
    }
  };

  const handleConfirmTransfer = async () => {
    if (!entry || !user?.token || totalToTransfer === 0) return;

    setTransferring(true);
    try {
      const transferData = Object.entries(transfers)
        .filter(([_, qty]) => parseInt(qty) > 0)
        .map(([collaboratorId, qty]) => ({
          collaborator_id: parseInt(collaboratorId),
          quantity: parseInt(qty)
        }));

      const res = await fetch('/api/entry_types/transfer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          entry_type_id: entry.id,
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
      console.error('Error transferring entries:', err);
      alert('Errore durante la connessione al server');
    } finally {
      setTransferring(false);
    }
  };

  if (!show || !entry) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-gray-900 border border-white/20 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center">
              <span className="text-blue-400 text-lg">🎫</span>
            </div>
            <div>
              <h3 className="text-white font-semibold">Trasferisci Ingressi</h3>
              <p className="text-white/60 text-sm">"{entry.label}" - Disponibili: {availableQuantity}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
          >
            <span className="text-white/80">✕</span>
          </button>
        </div>

        {/* Info Ingresso */}
        <div className="mb-6 p-4 bg-white/5 border border-white/10 rounded-lg">
          <div className="flex justify-between items-start">
            <div>
              <h4 className="text-white font-medium mb-1">{entry.label}</h4>
              {entry.description && (
                <p className="text-white/60 text-sm mb-2">{entry.description}</p>
              )}
              {entry.category && (
                <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs">
                  {entry.category}
                </span>
              )}
            </div>
            <div className="text-right">
              <div className="text-[#FC0045] font-bold">€{entry.price || '0.00'}</div>
              <div className="text-white/60 text-sm">Stock: {entry.stock || '0'}</div>
            </div>
          </div>
        </div>

        {/* Riepilogo Trasferimento */}
        {totalToTransfer > 0 && (
          <div className="mb-6 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-blue-400 font-medium">Totale da trasferire:</span>
              <span className="text-blue-400 font-bold">{totalToTransfer}</span>
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
              {collaboratorsData.map(({ collaborator, user: collabUser, compatibleEntries, hasCompatibleEntry, totalStock }) => {
                // Early return if user_id is null
                if (collaborator.user_id === null || collaborator.user_id == event.user_id) {
                  return null;
                }

                const userId = collaborator.user_id; // TypeScript now knows this is number
                const maxTransfer = Math.min(availableQuantity - (totalToTransfer - (parseInt(transfers[userId] ?? "") || 0)), availableQuantity);
                const currentValue = transfers[userId] || '';
                
                return (
                  
                  <div key={userId} className="p-4 bg-white/5 border border-white/10 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="flex items-center gap-2">
                            {collabUser?.picture && (
                              <img 
                                src={'https://webservice.sballando.it/storage/' + collabUser.picture} 
                                className="w-20 h-20 rounded-full"
                              />
                            )}
                            <div>
                              <span className="text-white font-medium">
                                {collabUser ? `${collabUser.name} ${collabUser.surname}` : `User ${userId}`}
                              </span>
                              <span className="ml-2 px-2 py-1 bg-purple-500/20 text-purple-400 rounded text-xs">
                                {collaborator.role}
                              </span>
                            </div>
                          </div>
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
                              onChange={(e) => handleTransferChange(userId, e.target.value)}
                              placeholder="0"
                              className="w-20 px-2 py-1 bg-white/10 border border-white/20 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              disabled={maxTransfer === 0}
                            />
                            <span className="text-white/60 text-sm">
                              (max: {maxTransfer})
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Lista ingressi compatibili */}
                    {hasCompatibleEntry && (
                      <div className="mt-3 pt-3 border-t border-white/10">
                        <p className="text-white/60 text-xs mb-2">Ingressi compatibili:</p>
                        <div className="space-y-1">
                          {compatibleEntries.map(ce => (
                            <div key={ce.id} className="flex justify-between items-center text-xs">
                              <span className="text-white/80">
                                {ce.label} {ce.category && `(${ce.category})`}
                              </span>
                              <span className="text-white/60">
                                €{ce.price} • Stock: {ce.stock || '0'}
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
            className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {transferring ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                Trasferendo...
              </>
            ) : (
              <>
                🎫 Trasferisci {totalToTransfer > 0 ? `(${totalToTransfer})` : ''}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
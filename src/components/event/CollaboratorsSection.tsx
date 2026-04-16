"use client";

import { useState } from "react";
import { useAuthStore } from "~/store/auth";
import { UserCard } from "~/components/UserCard";
import { getImageUrl } from "~/lib/imageUtils";
import type { Event, User } from "~/types";
import {
  FaLock,
  FaTimes,
  FaPlus,
  FaUser,
  FaSearch,
  FaTrash,
  FaTicketAlt,
  FaShoppingBag,
  FaMask,
  FaUsers,
} from 'react-icons/fa';

interface CollaboratorsSectionProps {
  event: Event;
  onUpdate: (updatedEvent: Event) => void;
}

export function CollaboratorsSection({ event, onUpdate }: CollaboratorsSectionProps) {
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [selectedRole, setSelectedRole] = useState("");
  const [updatingRoles, setUpdatingRoles] = useState<Record<number, boolean>>({});
  const [removingCollaborator, setRemovingCollaborator] = useState<Record<number, boolean>>({});
  
  const user = useAuthStore((state) => state.user);

  const getUserPictureUrl = (picture?: string | null) => {
    if (!picture || picture.trim() === '') return null;
    return getImageUrl(picture);
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }

    setSearchLoading(true);
    try {
      const res = await fetch(`/api/users/search?q=${encodeURIComponent(query)}`);
      if (res.ok) {
        const users = await res.json();
        setSearchResults(users);
      }
    } catch (err) {
      console.error('Error searching users:', err);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleAddCollaborator = async (userId: number) => {
    if (!user || !user.token) {
      alert('Devi essere loggato per aggiungere collaboratori');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/events/collaborators/add-event`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_token: user.token,
          event_id: event.id,
          collaborator_user_id: userId,
          role: selectedRole || 'Collaboratore'
        }),
      });
      
      if (res.ok) {
        const updatedEvent = await res.json();
        onUpdate(updatedEvent);
        setShowForm(false);
        setSearchQuery("");
        setSearchResults([]);
        setSelectedRole("");
      } else {
        const error = await res.json();
        alert(error.error || 'Errore durante l\'aggiunta del collaboratore');
      }
    } catch (err) {
      console.error('Network Error:', err);
      alert('Errore di connessione');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveCollaborator = async (collaboratorId: number) => {
    if (!confirm('Vuoi rimuovere questo collaboratore?')) return;

    if (!user || !user.token) {
      alert('Devi essere loggato per rimuovere collaboratori');
      return;
    }

    // Attiva il loader per questo collaboratore
    setRemovingCollaborator(prev => ({ ...prev, [collaboratorId]: true }));

    try {
      const res = await fetch(`/api/events/collaborators/${collaboratorId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_token: user.token
        }),
      });

      if (res.ok) {
        const updatedEvent = await res.json();
        onUpdate(updatedEvent);
      } else {
        const error = await res.json();
        alert(error.error || 'Errore durante la rimozione del collaboratore');
      }
    } catch (err) {
      console.error('Error removing collaborator:', err);
      alert('Errore di connessione');
    } finally {
      // Disattiva il loader per questo collaboratore
      setRemovingCollaborator(prev => ({ ...prev, [collaboratorId]: false }));
    }
  };

  const handleRoleToggle = async (collaboratorId: number, field: string, currentValue: boolean) => {
    if (!user || !user.token) {
      alert('Devi essere loggato per modificare i ruoli');
      return;
    }

    setUpdatingRoles(prev => ({ ...prev, [collaboratorId]: true }));
    
    try {
      const res = await fetch(`/api/events/collaborators/update-roles`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_token: user.token,
          collaborator_id: collaboratorId,
          [field]: !currentValue
        }),
      });

      if (res.ok) {
        const updatedEvent = await res.json();
        onUpdate(updatedEvent);
      } else {
        const error = await res.json();
        alert(error.error || 'Errore durante l\'aggiornamento del ruolo');
      }
    } catch (err) {
      console.error('Error updating role:', err);
      alert('Errore di connessione');
    } finally {
      setUpdatingRoles(prev => ({ ...prev, [collaboratorId]: false }));
    }
  };

  if (!user) {
    return (
      <div className="pt-6 border-t border-white/10">
        <div className="text-center py-8">
          <div className="text-white/60 mb-4">
            <FaLock className="text-4xl mx-auto" />
          </div>
          <p className="text-white/60">Devi essere loggato per gestire i collaboratori</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-6 border-t border-white/10">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-white">Collaboratori</h3>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-[#FC0045] text-white rounded-lg hover:bg-[#FC0045]/80 transition-colors flex items-center gap-2"
        >
          {showForm ? <FaTimes /> : <FaPlus />}
          {showForm ? 'Annulla' : 'Aggiungi Collaboratore'}
        </button>
      </div>

      {/* Form per aggiungere collaboratori */}
      {showForm && (
        <div className="mb-6 p-4 bg-white/5 border border-white/10 rounded-lg">
          <div className="space-y-4">
            <div>
              <label className="block text-white/80 text-sm mb-2">Cerca utente</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Nome, email o nickname..."
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="w-full px-3 py-2 pr-10 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-[#FC0045]"
                />
                {searchLoading && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                  </div>
                )}
              </div>
            </div>

            {/* Risultati ricerca */}
            {!searchLoading && searchResults.length > 0 && (
              <div className="max-h-48 overflow-y-auto space-y-2">
                <p className="text-white/80 text-sm mb-2">
                  {searchResults.length} utente/i trovato/i:
                </p>
                {searchResults.map((searchUser) => (
                  <div
                    key={searchUser.id}
                    className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {getUserPictureUrl(searchUser.picture) ? (
                        <img 
                          src={getUserPictureUrl(searchUser.picture)!} 
                          alt={searchUser.name || ''} 
                          className="w-8 h-8 rounded-full object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            e.currentTarget.nextElementSibling?.classList.remove('hidden');
                          }}
                        />
                      ) : null}
                      <div className={`w-8 h-8 rounded-full bg-white/20 flex items-center justify-center ${getUserPictureUrl(searchUser.picture) ? 'hidden' : ''}`}>
                        <FaUser className="text-white/60 text-sm" />
                      </div>
                      <div>
                        <p className="text-white text-sm">
                          {searchUser.name} {searchUser.surname}
                        </p>
                        <p className="text-white/60 text-xs">{searchUser.email}</p>
                        {searchUser.nickname && (
                          <p className="text-white/60 text-xs">@{searchUser.nickname}</p>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleAddCollaborator(searchUser.id)}
                      disabled={loading}
                      className="px-3 py-1 bg-[#FC0045] text-white rounded text-sm hover:bg-[#FC0045]/80 transition-colors disabled:opacity-50 flex items-center gap-1"
                    >
                      {loading ? (
                        <>
                          <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin"></div>
                          <span>Aggiungendo...</span>
                        </>
                      ) : (
                        'Aggiungi'
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Nessun risultato */}
            {!searchLoading && searchQuery && searchQuery.length >= 2 && searchResults.length === 0 && (
              <div className="text-center py-4">
                <div className="text-white/60 mb-2">
                  <FaSearch className="text-2xl mx-auto" />
                </div>
                <p className="text-white/60 text-sm">
                  Nessun utente trovato per "{searchQuery}"
                </p>
              </div>
            )}

            {/* Messaggio minimo caratteri */}
            {searchQuery && searchQuery.length < 2 && (
              <p className="text-white/60 text-sm">
                Digita almeno 2 caratteri per iniziare la ricerca
              </p>
            )}
          </div>
        </div>
      )}

      {/* Lista collaboratori */}
      {event.collaborators?.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {event.collaborators.map((collab) => (
            <div key={collab.id} className="relative p-4 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors">
              
              {/* Bottone Rimuovi in alto a destra */}
              <button
                onClick={() => handleRemoveCollaborator(collab.id)}
                disabled={removingCollaborator[collab.id] || false}
                className={`absolute top-2 right-2 p-1.5 rounded-lg transition-colors z-10 ${
                  removingCollaborator[collab.id] 
                    ? 'text-red-300 bg-red-500/10 cursor-not-allowed' 
                    : 'text-red-400 hover:bg-red-500/20'
                }`}
                title={removingCollaborator[collab.id] ? 'Rimozione in corso...' : 'Rimuovi collaboratore'}
              >
                {removingCollaborator[collab.id] ? (
                  <div className="w-4 h-4 border-2 border-red-400/30 border-t-red-400 rounded-full animate-spin"></div>
                ) : (
                  <FaTrash className="text-sm" />
                )}
              </button>

              {/* Header con foto e info */}
              <div className="flex flex-col items-center text-center mb-4">
                {getUserPictureUrl(collab.users?.picture) ? (
                  <img 
                    src={getUserPictureUrl(collab.users?.picture)!} 
                    alt={collab.users?.name || ''} 
                    className="w-40 h-40 rounded-full object-cover mb-3"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center mb-3">
                    <FaUser className="text-white/60 text-2xl" />
                  </div>
                )}
                
                <h4 className="text-white font-medium text-xl mb-1">
                  {collab.users?.name} {collab.users?.surname}
                </h4>
                
                <p className="text-white/60 text-xl mb-1">{collab.users?.email}</p>
                
                {collab.users?.nickname && (
                  <p className="text-white/60 text-xl mb-2">@{collab.users?.nickname}</p>
                )}
                
                <span className="inline-block px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-xl">
                  {collab.role}
                </span>
              </div>

              {/* Sezione Permessi */}
              <div className="space-y-3 pt-3 border-t border-white/10">
                <h5 className="text-white/80 text-sm font-medium text-center mb-3">Permessi</h5>
                
                {/* Switch Vidimare Ingressi */}
                <div className="flex items-center justify-between">
                  <label className="text-white/70 text-sm flex items-center gap-2 flex-1">
                    <FaTicketAlt className="text-base" />
                    <span>Vidimare Ingressi</span>
                  </label>
                  <button
                    onClick={() => handleRoleToggle(collab.id, 'vidimate_enabled_entry', collab.vidimate_enabled_entry || false)}
                    disabled={updatingRoles[collab.id]}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900 ${
                      collab.vidimate_enabled_entry 
                        ? 'bg-blue-500' 
                        : 'bg-gray-600'
                    } ${updatingRoles[collab.id] ? 'opacity-50' : ''}`}
                  >
                    <span
                      className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                        collab.vidimate_enabled_entry ? 'translate-x-5' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {/* Switch Vidimare Prodotti */}
                <div className="flex items-center justify-between">
                  <label className="text-white/70 text-sm flex items-center gap-2 flex-1">
                    <FaShoppingBag className="text-base" />
                    <span>Vidimare Prodotti</span>
                  </label>
                  <button
                    onClick={() => handleRoleToggle(collab.id, 'vidimate_enabled_product', collab.vidimate_enabled_product || false)}
                    disabled={updatingRoles[collab.id]}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-gray-900 ${
                      collab.vidimate_enabled_product 
                        ? 'bg-purple-500' 
                        : 'bg-gray-600'
                    } ${updatingRoles[collab.id] ? 'opacity-50' : ''}`}
                  >
                    <span
                      className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                        collab.vidimate_enabled_product ? 'translate-x-5' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {/* Switch Ospite */}
                <div className="flex items-center justify-between">
                  <label className="text-white/70 text-sm flex items-center gap-2 flex-1">
                    <FaMask className="text-base" />
                    <span>Ospite</span>
                  </label>
                  <button
                    onClick={() => handleRoleToggle(collab.id, 'guest_enabled', collab.guest_enabled || false)}
                    disabled={updatingRoles[collab.id]}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-gray-900 ${
                      collab.guest_enabled 
                        ? 'bg-green-500' 
                        : 'bg-gray-600'
                    } ${updatingRoles[collab.id] ? 'opacity-50' : ''}`}
                  >
                    <span
                      className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                        collab.guest_enabled ? 'translate-x-5' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Indicatore caricamento */}
              {updatingRoles[collab.id] && (
                <div className="mt-3 flex items-center justify-center gap-2 text-white/60 text-xs">
                  <div className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                  <span>Aggiornamento...</span>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <div className="text-white/60 mb-4">
            <FaUsers className="text-4xl mx-auto" />
          </div>
          <p className="text-white/60 mb-4">Nessun collaboratore aggiunto</p>
          <button
            onClick={() => setShowForm(true)}
            className="px-6 py-2 bg-[#FC0045] text-white rounded-lg hover:bg-[#FC0045]/80 transition-colors"
          >
            Aggiungi il primo collaboratore
          </button>
        </div>
      )}
    </div>
  );
}
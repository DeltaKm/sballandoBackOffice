"use client";

import { useState, useMemo, type JSXElementConstructor, type Key, type ReactElement, type ReactNode, type ReactPortal } from "react";
import { useAuthStore } from "~/store/auth";
import type { Event, EntryType } from "~/types";
import { EntryTypeForm } from "./EntryTypeForm";
import { TransferEntryModal } from "./TransferEntryModal";
import { EditEntryTypeModal } from "./EditEntryTypeModal";
import { NewEntryModal } from "./NewEntryModal";
import QRCode from 'qrcode';
import {
  FaTicketAlt,
  FaDownload,
  FaBan,
  FaTimes,
  FaPlus,
  FaBolt,
  FaBullseye,
  FaPalette,
  FaUser,
  FaUndo,
  FaTrash,
  FaSyncAlt,
  FaExclamationTriangle,
  FaQrcode,
  FaMagic,
  FaClipboardList,
  FaLock,
  FaLightbulb,
  FaCalendarAlt,
} from 'react-icons/fa';

interface EntryTypesSectionProps {
  event: Event;
  onUpdate?: (updatedEvent: Event) => void;
}

function NewEntryModalWithTemplates({ show, eventId, onClose, onSuccess }: {
  show: boolean;
  eventId: number;
  onClose: () => void;
  onSuccess: (updatedEvent: any) => void;
}) {
  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-gray-900 border border-white/20 rounded-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div>
            <h3 className="text-white font-bold text-2xl flex items-center gap-3">
              <FaTicketAlt className="text-3xl" />
              Crea Nuovo Ingresso
            </h3>
            <p className="text-white/60 text-sm mt-1">
              Usa i template veloci o personalizza completamente
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-white/60 hover:text-white transition-colors text-2xl"
          >
            <FaTimes />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-100px)] scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
          <EntryTypeForm
            eventId={eventId}
            onSuccess={(updatedEvent) => {
              onSuccess(updatedEvent);
              onClose();
            }}
            onCancel={onClose}
          />
        </div>
      </div>
    </div>
  );
}

export function EntryTypesSection({ event, onUpdate }: EntryTypesSectionProps) {

  
  const [showForm, setShowForm] = useState(false);
  const [deleteModal, setDeleteModal] = useState<{ show: boolean; entryId: number | null; entryLabel: string }>({
    show: false,
    entryId: null,
    entryLabel: ''
  });
  const [withdrawModal, setWithdrawModal] = useState<{
    show: boolean;
    entry: EntryType | null;
    withdrawableCount: number;
  }>({
    show: false,
    entry: null,
    withdrawableCount: 0
  });
  const [deleting, setDeleting] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [myActiveCategory, setMyActiveCategory] = useState<string>('all');
  const [collaboratorActiveCategories, setCollaboratorActiveCategories] = useState<Record<number, string>>({});
  const [transferModal, setTransferModal] = useState<{
    show: boolean;
    entry: EntryType | null;
  }>({
    show: false,
    entry: null
  });
  const [editModal, setEditModal] = useState<{ show: boolean; entry: EntryType | null }>({
    show: false,
    entry: null
  });

  const [newEntryModal, setNewEntryModal] = useState<{ show: boolean }>({
    show: false
  });

  const [qrModal, setQrModal] = useState<{
    show: boolean;
    generating: boolean;
  }>({
    show: false,
    generating: false
  });

  const [disableQrModal, setDisableQrModal] = useState<{
    show: boolean;
    disabling: boolean;
  }>({
    show: false,
    disabling: false
  });

  const user = useAuthStore((state) => state.user);

  // Funzione per scaricare il QR code (versione migliorata)
  const downloadQrCode = async () => {
    if (!event.qr_enter) return;
    
    try {
      // Genera il QR code come Data URL
      const qrDataUrl = await QRCode.toDataURL(event.qr_enter, {
        width: 400,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });

      // Crea un canvas per aggiungere il testo
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const size = 400;
      
      canvas.width = size;
      canvas.height = size + 120; // Extra spazio per il testo
      
      if (ctx) {
        // Background bianco
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Carica e disegna il QR code
        const qrImage = new Image();
        qrImage.onload = () => {
          ctx.drawImage(qrImage, 0, 0, size, size);
          
          // Aggiungi testo
          ctx.fillStyle = '#000000';
          ctx.font = 'bold 24px Arial';
          ctx.textAlign = 'center';
          ctx.fillText(event.title || 'Evento', canvas.width / 2, size + 40);
          
          ctx.font = '14px Arial';
          ctx.fillText(`Codice Ingresso: ${event.qr_enter}`, canvas.width / 2, size + 70);
          
          ctx.font = '12px Arial';
          ctx.fillStyle = '#666666';
          ctx.fillText(`Generato il ${new Date().toLocaleDateString('it-IT')}`, canvas.width / 2, size + 95);
          
          // Download
          const link = document.createElement('a');
          link.download = `qr-ingresso-${event.title?.replace(/[^a-zA-Z0-9]/g, '-') || 'evento'}-${event.qr_enter?.slice(0, 8)}.png`;
          link.href = canvas.toDataURL('image/png');
          link.click();
        };
        qrImage.src = qrDataUrl;
      }
    } catch (error) {
      console.error('Error generating QR code:', error);
      alert('Errore durante la generazione del QR code');
    }
  };

  // Divide gli ingressi e raggruppa per categoria
  const { myEntriesByCategory, collaboratorsEntriesByCategory, myCategories, collaboratorCategories } = useMemo(() => {
    if (!event.entry_types || event.entry_types.length === 0 || !user) {
      return {
        myEntriesByCategory: {},
        collaboratorsEntriesByCategory: {},
        myCategories: [],
        collaboratorCategories: {}
      };
    }

    const collaboratorsUserIds = event.collaborators?.map(collab => collab.user_id).filter(Boolean) || [];

    // I miei ingressi raggruppati per categoria
    const myEntries = event.entry_types.filter(entry => entry.user_id === user.id);
    const myEntriesByCategory = myEntries.reduce((acc, entry) => {
      const category = entry.category || 'Senza Categoria';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(entry);
      return acc;
    }, {} as Record<string, EntryType[]>);

    const myCategories = Object.keys(myEntriesByCategory);

    // Ingressi dei collaboratori raggruppati per user_id e poi per categoria
    const collaboratorsEntries = event.entry_types.filter(entry =>
      entry.user_id !== user.id && collaboratorsUserIds.includes(entry.user_id)
    );

    const collaboratorsEntriesByCategory = collaboratorsEntries.reduce((acc, entry) => {
      if (!acc[entry.user_id]) {
        const collaborator = event.collaborators?.find(collab => collab.user_id === entry.user_id);
        acc[entry.user_id] = {
          user_id: entry.user_id,
          collaboratorName: collaborator?.users ?
            `${collaborator.users.name} ${collaborator.users.surname}` :
            `User ${entry.user_id}`,
          collaboratorRole: collaborator?.role || 'Collaboratore',
          categoriesData: {}
        };
      }

      const category = entry.category || 'Senza Categoria';
      if (!acc[entry.user_id]?.categoriesData[category]) {
        acc[entry.user_id]!.categoriesData[category] = [];
      }
      acc[entry.user_id]!.categoriesData[category]!.push(entry);
      return acc;
    }, {} as Record<number, {
      user_id: number;
      collaboratorName: string;
      collaboratorRole: string;
      categoriesData: Record<string, EntryType[]>;
    }>);

    // Categorie per ogni collaboratore
    const collaboratorCategories = Object.keys(collaboratorsEntriesByCategory).reduce((acc, userId) => {
      const collaborator = collaboratorsEntriesByCategory[parseInt(userId)];
      if (collaborator && collaborator.categoriesData) {
        acc[parseInt(userId)] = Object.keys(collaborator.categoriesData);
      } else {
        acc[parseInt(userId)] = [];
      }
      return acc;
    }, {} as Record<number, string[]>);

    return {
      myEntriesByCategory,
      collaboratorsEntriesByCategory: Object.values(collaboratorsEntriesByCategory),
      myCategories,
      collaboratorCategories
    };
  }, [event.entry_types, event.collaborators, user]);

  // Inizializza le categorie attive per i collaboratori
  useMemo(() => {
    const newActiveCategories: Record<number, string> = {};
    Object.keys(collaboratorCategories).forEach(userId => {
      const userIdNum = parseInt(userId);
      if (!collaboratorActiveCategories[userIdNum]) {
        newActiveCategories[userIdNum] = 'all';
      }
    });
    if (Object.keys(newActiveCategories).length > 0) {
      setCollaboratorActiveCategories(prev => ({ ...prev, ...newActiveCategories }));
    }
  }, [collaboratorCategories]);

  // Ottieni gli ingressi filtrati per categoria
  const getMyFilteredEntries = () => {
    if (myActiveCategory === 'all') {
      return Object.values(myEntriesByCategory).flat();
    }
    return (myEntriesByCategory as Record<string, EntryType[]>)[myActiveCategory] || [];
  };

  const getCollaboratorFilteredEntries = (userId: number) => {
    const collaboratorArray = Array.isArray(collaboratorsEntriesByCategory) ? collaboratorsEntriesByCategory : [];
    const collaborator = collaboratorArray.find(c => c.user_id === userId);
    if (!collaborator) return [];

    const activeCategory = collaboratorActiveCategories[userId] || 'all';
    if (activeCategory === 'all') {
      return Object.values(collaborator.categoriesData).flat();
    }
    return collaborator.categoriesData[activeCategory] || [];
  };

  const openNewEntryModal = () => {
    setNewEntryModal({ show: true });
  };

  const closeNewEntryModal = () => {
    setNewEntryModal({ show: false });
  };

  const handleFormSuccess = (updatedEvent: any) => {
    onUpdate?.(updatedEvent);
    closeNewEntryModal();
  };

  const openDeleteModal = (entryId: number, entryLabel: string) => {
    setDeleteModal({
      show: true,
      entryId,
      entryLabel
    });
  };

  const closeDeleteModal = () => {
    setDeleteModal({
      show: false,
      entryId: null,
      entryLabel: ''
    });
  };

  const handleConfirmDelete = async () => {
    if (!deleteModal.entryId || !user?.token) return;

    setDeleting(true);
    try {
      const res = await fetch('/api/entry_types/delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          entry_type_id: deleteModal.entryId,
          user_token: user.token
        }),
      });

      if (res.ok) {
        const updatedEvent = await res.json();
        onUpdate?.(updatedEvent);
        closeDeleteModal();
      } else {
        const errorData = await res.json();
        alert(`Errore durante l'eliminazione: ${errorData.error || 'Errore sconosciuto'}`);
      }
    } catch (err) {
      console.error('Error deleting entry type:', err);
      alert('Errore durante la connessione al server');
    } finally {
      setDeleting(false);
    }
  };

  const openTransferModal = (entry: EntryType) => {
    setTransferModal({
      show: true,
      entry
    });
  };

  const closeTransferModal = () => {
    setTransferModal({
      show: false,
      entry: null
    });
  };

  const handleTransferSuccess = (updatedEvent: Event) => {
    onUpdate?.(updatedEvent);
    closeTransferModal();
  };

  const handleDeleteEntry = (entryId: number) => {
    const entry = event.entry_types?.find(e => e.id === entryId);
    if (entry) {
      openDeleteModal(entryId, entry.label);
    }
  };

  const handleWithdrawEntry = async (entry: EntryType) => {
    if (!user?.token) return;

    // Calcola gli ingressi ritirabili
    const collaboratorEntries = event.entry_types?.filter(et =>
      et.user_id !== user.id &&
      et.label.toLowerCase() === entry.label.toLowerCase() &&
      et.stock && et.stock > 0
    ) || [];

    if (collaboratorEntries.length === 0) {
      alert('Nessun ingresso da ritirare dai collaboratori');
      return;
    }

    const totalToWithdraw = collaboratorEntries.reduce((sum, et) => sum + (et.stock || 0), 0);

    // Apri la modale di conferma
    setWithdrawModal({
      show: true,
      entry,
      withdrawableCount: totalToWithdraw
    });
  };

  const closeWithdrawModal = () => {
    setWithdrawModal({
      show: false,
      entry: null,
      withdrawableCount: 0
    });
  };

  const handleConfirmWithdraw = async () => {
    if (!withdrawModal.entry || !user?.token) return;

    setWithdrawing(true);

    try {
      const res = await fetch('/api/entry_types/withdraw', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          entry_type_id: withdrawModal.entry.id,
          user_token: user.token
        }),
      });

      if (res.ok) {
        const updatedEvent = await res.json();
        onUpdate?.(updatedEvent);
        closeWithdrawModal();
      } else {
        const errorData = await res.json();
        alert(`Errore durante il ritiro: ${errorData.error || 'Errore sconosciuto'}`);
      }
    } catch (err) {
      console.error('Error withdrawing entries:', err);
      alert('Errore durante la connessione al server');
    } finally {
      setWithdrawing(false);
    }
  };

  const getWithdrawableCount = (entry: EntryType) => {
    if (!user) return 0;

    const collaboratorEntries = event.entry_types?.filter(et =>
      et.user_id !== user.id &&
      et.label.toLowerCase() === entry.label.toLowerCase() &&
      et.stock && et.stock > 0
    ) || [];

    return collaboratorEntries.reduce((sum, et) => sum + (et.stock || 0), 0);
  };

  const openEditModal = (entry: EntryType) => {
    setEditModal({ show: true, entry });
  };

  const closeEditModal = () => {
    setEditModal({ show: false, entry: null });
  };

  const handleEditSuccess = (updatedEvent: Event) => {
    onUpdate?.(updatedEvent);
    closeEditModal();
  };

  const openQrModal = () => {
    setQrModal({ show: true, generating: false });
  };

  const closeQrModal = () => {
    setQrModal({ show: false, generating: false });
  };

  const handleGenerateQr = async () => {
    if (!user?.token) return;

    setQrModal(prev => ({ ...prev, generating: true }));

    try {
      const res = await fetch('/api/events/generate-qr', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          event_id: event.id,
          user_token: user.token
        }),
      });

      if (res.ok) {
        const response = await res.json();
        
        // Aggiorna solo il campo QR dell'evento senza ricaricare tutto
        if (onUpdate && response.qr_code) {
          const updatedEvent = {
            ...event,
            qr_enter: response.qr_code
          };
          onUpdate(updatedEvent);
        }
        
        closeQrModal();
        
        // Mostra messaggio di successo
        console.log('QR Code generato:', response.qr_code);
        
      } else {
        const errorData = await res.json();
        alert(`Errore durante la generazione del QR: ${errorData.error || 'Errore sconosciuto'}`);
      }
    } catch (err) {
      console.error('Error generating QR code:', err);
      alert('Errore durante la connessione al server');
    } finally {
      setQrModal(prev => ({ ...prev, generating: false }));
    }
  };

  const openDisableQrModal = () => {
    setDisableQrModal({ show: true, disabling: false });
  };

  const closeDisableQrModal = () => {
    setDisableQrModal({ show: false, disabling: false });
  };

  const handleDisableQr = async () => {
    if (!user?.token) return;

    setDisableQrModal(prev => ({ ...prev, disabling: true }));

    try {
      const res = await fetch('/api/events/disable-qr', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          event_id: event.id,
          user_token: user.token
        }),
      });

      if (res.ok) {
        const response = await res.json();
        
        // Aggiorna solo il campo QR dell'evento (impostalo a null)
        if (onUpdate) {
          const updatedEvent = {
            ...event,
            qr_enter: null
          };
          onUpdate(updatedEvent);
        }
        
        closeDisableQrModal();
        
        // Mostra messaggio di successo
        console.log('QR Code disattivato');
        
      } else {
        const errorData = await res.json();
        alert(`Errore durante la disattivazione del QR: ${errorData.error || 'Errore sconosciuto'}`);
      }
    } catch (err) {
      console.error('Error disabling QR code:', err);
      alert('Errore durante la connessione al server');
    } finally {
      setDisableQrModal(prev => ({ ...prev, disabling: false }));
    }
  };

  // Funzione per formattare il prezzo
  const formatPrice = (price: number | null | undefined): string => {
    if (price === null || price === undefined) return '0.00';
    return Number(price).toFixed(2);
  };

  const myFilteredEntries = getMyFilteredEntries();
  const totalMyEntries = Object.values(myEntriesByCategory).flat().length;

  return (
    <div className="pt-8 border-t border-white/10">
      {/* Header principale */}
      <div className="flex justify-between items-center mb-8">
        <h3 className="text-3xl font-bold text-white">Gestione Ingressi</h3>
        <div className="flex items-center gap-4">
          {/* Bottone QR dinamico */}
          {event.qr_enter ? (
            <div className="flex items-center gap-3">
              {/* Mostra QR Code esistente */}
              <div className="flex items-center gap-3 px-4 py-3 bg-green-500/20 border border-green-500/30 rounded-xl">
                <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center">
                  <div className="w-10 h-10 bg-black rounded-sm flex items-center justify-center">
                    <span className="text-white text-xs font-mono">{event.qr_enter.slice(0, 4)}</span>
                  </div>
                </div>
                <div>
                  <div className="text-green-300 font-semibold text-sm">QR Code Attivo</div>
                  <div className="text-green-400/80 text-xs font-mono">{event.qr_enter}</div>
                </div>
              </div>

              {/* Bottone Scarica */}
              <button
                onClick={downloadQrCode}
                className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors flex items-center gap-3 text-lg font-semibold"
              >
                <FaDownload className="text-xl" />
                Scarica QR
              </button>

      

              {/* Bottone Disattiva */}
              <button
                onClick={openDisableQrModal}
                className="px-4 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors flex items-center gap-2 text-base font-medium"
              >
                <FaBan className="text-lg" />
                Disattiva
              </button>
            </div>
          ) : (
            /* Bottone Crea QR quando non esiste */
            <button
              onClick={openQrModal}
              className="group w-[420px] px-8 py-4 bg-gradient-to-r from-[#FC0045] via-[#FF6B35] to-[#9B59B6] text-white rounded-xl hover:from-[#FC0045]/90 hover:via-[#FF6B35]/90 hover:to-[#9B59B6]/90 transition-all duration-300 shadow-lg hover:shadow-2xl transform hover:scale-[1.02] flex items-center gap-4 relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 -skew-x-12 transform translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700"></div>

              <div className="relative z-10 flex items-center gap-4">
                <div className="flex items-center justify-center w-12 h-12 bg-white/20 rounded-xl group-hover:bg-white/30 transition-colors">
                  <FaQrcode className="text-2xl" />
                </div>
                <div className="text-left">
                  <div className="text-xl font-bold">Crea QR Ingressi</div>
                  <div className="text-sm font-normal opacity-90 group-hover:opacity-100 transition-opacity inline-flex items-center gap-2">
                    <FaMagic />
                    <span>Generazione automatica</span>
                  </div>
                </div>
              </div>
            </button>
          )}

          <button
            onClick={openNewEntryModal}
            className="group px-8 py-4 bg-gradient-to-r from-[#FC0045] via-[#FF6B35] to-[#9B59B6] text-white rounded-xl hover:from-[#FC0045]/90 hover:via-[#FF6B35]/90 hover:to-[#9B59B6]/90 transition-all duration-300 shadow-lg hover:shadow-2xl transform hover:scale-[1.02] flex items-center gap-4 relative overflow-hidden"
          >
            {/* Animated background effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 -skew-x-12 transform translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700"></div>
            
            <div className="relative z-10 flex items-center gap-4">
              <div className="flex items-center justify-center w-12 h-12 bg-white/20 rounded-xl group-hover:bg-white/30 transition-colors">
                <FaBolt className="text-2xl" />
              </div>
              <div className="text-left">
                <div className="text-xl font-bold">Nuovo Ingresso</div>
                <div className="text-sm font-normal opacity-90 group-hover:opacity-100 transition-opacity inline-flex items-center gap-2">
                  <FaBullseye />
                  <span>Con template veloci</span>
                  <span>•</span>
                  <FaPalette />
                  <span>Personalizzabile</span>
                </div>
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* Container principale con layout a schermo intero */}
      <div className="h-[75vh]">

        {/* I MIEI INGRESSI - SCHERMO INTERO */}
        <div className="bg-blue-500/10 border-2 border-blue-500/30 rounded-2xl overflow-hidden flex flex-col h-full">
          <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-blue-500/50 scrollbar-track-transparent">
            {/* Header sezione */}
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 bg-blue-500/30 rounded-xl flex items-center justify-center">
                <FaUser className="text-blue-400 text-2xl" />
              </div>
              <div className="flex-1">
                <h4 className="text-blue-300 font-bold text-xl">I Miei Ingressi</h4>
                <p className="text-blue-400/80 text-base mt-1">Controllo completo e gestione autonoma</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="px-4 py-2 bg-blue-500/30 text-blue-300 rounded-xl text-base font-semibold">
                  {totalMyEntries} ingressi
                </span>
              </div>
            </div>

            {/* Tabs Categorie */}
            {myCategories.length > 0 && (
              <div className="mb-6 flex flex-wrap gap-3">
                <button
                  onClick={() => setMyActiveCategory('all')}
                  className={`px-4 py-2 rounded-xl text-base font-semibold transition-colors ${myActiveCategory === 'all'
                      ? 'bg-blue-500 text-white shadow-lg'
                      : 'bg-white/20 text-white/90 hover:bg-white/30'
                    }`}
                >
                  Tutte ({totalMyEntries})
                </button>
                {myCategories.map((category) => (
                  <button
                    key={category}
                    onClick={() => setMyActiveCategory(category)}
                    className={`px-4 py-2 rounded-xl text-base font-semibold transition-colors ${myActiveCategory === category
                        ? 'bg-blue-500 text-white shadow-lg'
                        : 'bg-white/20 text-white/90 hover:bg-white/30'
                      }`}
                  >
                    {category} {((myEntriesByCategory as Record<string, EntryType[]>)[category]?.length || 0)}
                  </button>
                ))}
              </div>
            )}

            {/* Lista ingressi */}
            <div className="space-y-4">
              {myFilteredEntries.length > 0 ? (
                myFilteredEntries.map((entry) => (
                  <div
                    key={entry.id}
                    className="p-5 bg-white/15 border border-blue-400/40 rounded-xl hover:border-blue-400/70 hover:bg-blue-500/10 transition-all group cursor-pointer shadow-lg hover:shadow-xl"
                    onClick={(e) => {
                      if ((e.target as HTMLElement).tagName !== "BUTTON") {
                        openEditModal(entry);
                      }
                    }}
                    title="Clicca per modificare"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h5 className="text-white font-bold text-lg">{entry.label}</h5>
                          {entry.category && (
                            <span className="px-3 py-1 bg-blue-500/40 text-blue-300 rounded-lg text-sm font-semibold">
                              {entry.category}
                            </span>
                          )}
                        </div>
                        {entry.description && (
                          <p className="text-white/80 text-sm leading-relaxed">{entry.description}</p>
                        )}
                      </div>
                      {entry.price && entry.price > 0 && (
                        <div className="text-right ml-4">
                          <span className="text-[#FC0045] font-bold text-2xl">€{formatPrice(entry.price)}</span>
                        </div>
                      )}
                    </div>

                    <div className="bg-blue-500/20 rounded-xl p-4 mb-4">
                      <div className="grid grid-cols-2 gap-4 text-base">
                        <div className="text-center">
                          <div className="text-blue-300 font-bold text-xl">{entry.created_qnt}</div>
                          <div className="text-blue-400/90 text-sm">Creati</div>
                        </div>
                        <div className="text-center">
                          <div className="text-blue-300 font-bold text-xl">{entry.stock || '0'}</div>
                          <div className="text-blue-400/90 text-sm">Rimasti</div>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end gap-3">
                      {/* <button
                        onClick={(e) => { e.stopPropagation(); entry.stock && entry.stock > 0 ? openTransferModal(entry) : null; }}
                        disabled={!entry.stock || entry.stock <= 0}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${entry.stock && entry.stock > 0
                            ? 'bg-blue-500/30 text-blue-300 hover:bg-blue-500/50 border border-blue-400/40'
                            : 'bg-gray-500/30 text-gray-400 cursor-not-allowed border border-gray-500/40'
                          }`}
                        title={
                          !entry.stock || entry.stock <= 0
                            ? 'Nessuno stock disponibile per il trasferimento'
                            : 'Trasferisci ingressi ai collaboratori'
                        }
                      >
                        Trasferisci
                      </button> */}

                      <button
                        onClick={(e) => { e.stopPropagation(); handleWithdrawEntry(entry); }}
                        disabled={getWithdrawableCount(entry) === 0}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${getWithdrawableCount(entry) > 0
                            ? 'bg-orange-500/30 text-orange-300 hover:bg-orange-500/50 border border-orange-400/40'
                            : 'bg-gray-500/30 text-gray-400 cursor-not-allowed border border-gray-500/40'
                          }`}
                        title={
                          getWithdrawableCount(entry) === 0
                            ? 'Nessun ingresso da ritirare dai collaboratori'
                            : `Ritira ${getWithdrawableCount(entry)} ingressi dai collaboratori`
                        }
                      >
                        <FaUndo />
                        <span>Ritira</span>
                        {getWithdrawableCount(entry) > 0 && (
                          <span className="bg-orange-500/50 px-2 py-1 rounded-lg text-xs font-bold">
                            {getWithdrawableCount(entry)}
                          </span>
                        )}
                      </button>

                      <button
                        onClick={(e) => { e.stopPropagation(); openDeleteModal(entry.id, entry.label); }}
                        className="px-4 py-2 bg-red-500/30 text-red-300 rounded-lg text-sm font-medium hover:bg-red-500/50 transition-colors border border-red-400/40 inline-flex items-center gap-2"
                        title="Elimina ingresso"
                      >
                        <FaTrash />
                        <span>Elimina</span>
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 border-2 border-dashed border-blue-400/40 rounded-xl bg-blue-500/10">
                  <div className="text-blue-400/70 mb-4">
                    <FaTicketAlt className="text-5xl mx-auto" />
                  </div>
                  <p className="text-blue-300 text-lg mb-3 font-semibold">
                    {myActiveCategory === 'all'
                      ? 'Non hai ancora creato ingressi'
                      : `Nessun ingresso nella categoria "${myActiveCategory}"`
                    }
                  </p>
                  <p className="text-blue-400/80 text-base mb-6">
                    {myActiveCategory === 'all'
                      ? 'Inizia creando il tuo primo tipo di ingresso'
                      : 'Prova a cambiare categoria o crea un nuovo ingresso'
                    }
                  </p>
                  {myActiveCategory === 'all' && (
                    <button
                      onClick={() => openNewEntryModal()}
                      className="px-6 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors text-base font-semibold inline-flex items-center gap-2"
                    >
                      <FaPlus />
                      <span>Crea il primo ingresso</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

      </div>

        {/* MODALE DI CONFERMA ELIMINAZIONE */}
        {deleteModal.show && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-gray-900 border border-white/20 rounded-lg p-6 max-w-md w-full mx-4">
              {/* Header */}
              <div className="flex items-center gap-3 mb-4">
                <div className="flex-shrink-0 w-10 h-10 bg-red-500/20 rounded-full flex items-center justify-center">
                  <FaExclamationTriangle className="text-red-400 text-lg" />
                </div>
                <div>
                  <h3 className="text-white font-semibold">Conferma Eliminazione</h3>
                  <p className="text-white/60 text-sm">Questa azione non può essere annullata</p>
                </div>
              </div>

              {/* Content */}
              <div className="mb-6">
                <p className="text-white/80 mb-2">
                  Sei sicuro di voler eliminare l'ingresso:
                </p>
                <div className="p-3 bg-white/5 border border-white/10 rounded-lg">
                  <span className="text-white font-medium">"{deleteModal.entryLabel}"</span>
                </div>
                <p className="text-red-400 text-sm mt-2">
                  Tutti i dati associati verranno eliminati permanentemente
                </p>
              </div>

              {/* Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={closeDeleteModal}
                  disabled={deleting}
                  className="flex-1 px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors disabled:opacity-50"
                >
                  Annulla
                </button>
                <button
                  onClick={handleConfirmDelete}
                  disabled={deleting}
                  className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {deleting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Eliminando...
                    </>
                  ) : (
                    <>
                      <FaTrash />
                      <span>Elimina</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODALE CONFERMA RITIRO */}
        {withdrawModal.show && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-gray-900 border border-white/20 rounded-lg p-6 max-w-md w-full mx-4">
              {/* Header */}
              <div className="flex items-center gap-3 mb-4">
                <div className="flex-shrink-0 w-10 h-10 bg-orange-500/20 rounded-full flex items-center justify-center">
                  <FaSyncAlt className="text-orange-400 text-lg" />
                </div>
                <div>
                  <h3 className="text-white font-semibold">Conferma Ritiro</h3>
                  <p className="text-white/60 text-sm">Ritira ingressi dai collaboratori</p>
                </div>
              </div>

              {/* Content */}
              <div className="mb-6">
                <p className="text-white/80 mb-2">
                  Stai per ritirare ingressi dai collaboratori:
                </p>
                <div className="p-3 bg-white/5 border border-white/10 rounded-lg mb-3">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-white font-medium">"{withdrawModal.entry?.label}"</span>
                    {withdrawModal.entry?.price && withdrawModal.entry.price > 0 && (
                      <span className="text-[#FC0045] font-bold">€{formatPrice(withdrawModal.entry.price)}</span>
                    )}
                  </div>
                  {withdrawModal.entry?.description && (
                    <p className="text-white/60 text-sm mb-2">{withdrawModal.entry.description}</p>
                  )}
                  {withdrawModal.entry?.category && (
                    <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs">
                      {withdrawModal.entry.category}
                    </span>
                  )}
                </div>

                <div className="p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-orange-400 font-medium">Quantità da ritirare:</span>
                    <span className="text-orange-400 font-bold text-lg">{withdrawModal.withdrawableCount}</span>
                  </div>
                  <div className="flex items-center justify-between mt-1 text-sm">
                    <span className="text-white/60">Saranno aggiunti al tuo stock:</span>
                    <span className="text-white/60">
                      {(withdrawModal.entry?.stock || 0)} + {withdrawModal.withdrawableCount} = {(withdrawModal.entry?.stock || 0) + withdrawModal.withdrawableCount}
                    </span>
                  </div>
                </div>

                <p className="text-orange-400 text-sm mt-3 flex items-center gap-2">
                  <FaExclamationTriangle />
                  <span>Questa azione rimuoverà tutti gli ingressi compatibili dai collaboratori</span>
                </p>
              </div>

              {/* Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={closeWithdrawModal}
                  disabled={withdrawing}
                  className="flex-1 px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors disabled:opacity-50"
                >
                  Annulla
                </button>
                <button
                  onClick={handleConfirmWithdraw}
                  disabled={withdrawing}
                  className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {withdrawing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Ritirando...
                    </>
                  ) : (
                    <>
                      <FaSyncAlt />
                      <span>Ritira ({withdrawModal.withdrawableCount})</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODALE CONFERMA GENERAZIONE QR - Aggiornato per rigenerazione */}
        {qrModal.show && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-gray-900 border border-white/20 rounded-lg p-6 max-w-md w-full mx-4">
              {/* Header */}
              <div className="flex items-center gap-3 mb-4">
                <div className="flex-shrink-0 w-10 h-10 bg-[#FC0045]/20 rounded-full flex items-center justify-center">
                  <FaQrcode className="text-[#FC0045] text-lg" />
                </div>
                <div>
                  <h3 className="text-white font-semibold">
                    {event.qr_enter ? 'Rigenera QR Code Ingresso' : 'Genera QR Code Ingresso'}
                  </h3>
                  <p className="text-white/60 text-sm">
                    {event.qr_enter ? 'Sostituisci il QR code esistente' : 'Crea il codice QR per l\'accesso all\'evento'}
                  </p>
                </div>
              </div>

              {/* Content */}
              <div className="mb-6">
                <div className="p-4 bg-white/5 border border-white/10 rounded-lg mb-4">
                  <div className="flex items-center gap-3 mb-2">
                    <FaTicketAlt className="text-2xl" />
                    <span className="text-white font-medium">{event.title}</span>
                  </div>
                  {event.description_extended && (
                    <p className="text-white/60 text-sm">{event.description_extended}</p>
                  )}
                </div>

                {event.qr_enter ? (
                  <div className="space-y-3">
                    {/* QR Code Corrente */}
                    <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                      <p className="text-blue-400 text-sm flex items-center gap-2 mb-2">
                        <FaQrcode />
                        <span className="font-medium">QR Code Corrente:</span>
                      </p>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white rounded flex items-center justify-center">
                          <div className="w-8 h-8 bg-black rounded-sm flex items-center justify-center">
                            <span className="text-white text-xs font-mono">{event.qr_enter?.slice(0, 3) ?? ''}</span>
                          </div>
                        </div>
                        <span className="text-blue-300 font-mono text-sm">{event.qr_enter}</span>
                      </div>
                    </div>

                    {/* Warning */}
                    <div className="p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg">
                      <p className="text-orange-400 text-sm flex items-center gap-2">
                        <FaExclamationTriangle />
                        <span>Generando un nuovo QR code, il precedente non sarà più valido.</span>
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                    <p className="text-green-400 text-sm flex items-center gap-2">
                      <FaMagic />
                      <span>Verrà generato un nuovo QR code univoco per l'accesso all'evento.</span>
                    </p>
                  </div>
                )}

                <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                  <h4 className="text-blue-400 font-medium mb-2 inline-flex items-center gap-2"><FaClipboardList /> <span>Cosa succederà:</span></h4>
                  <ul className="text-blue-300 text-sm space-y-1">
                    <li className="flex items-center gap-2">
                      <FaBullseye />
                      <span>{event.qr_enter ? 'Sostituzione' : 'Generazione'} codice univoco per l'evento</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <FaQrcode />
                      <span>QR code scaricabile e stampabile</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <FaLock />
                      <span>Controllo accessi sicuro e tracciato</span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={closeQrModal}
                  disabled={qrModal.generating}
                  className="flex-1 px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors disabled:opacity-50"
                >
                  Annulla
                </button>
                <button
                  onClick={handleGenerateQr}
                  disabled={qrModal.generating}
                  className="flex-1 px-4 py-2 bg-[#FC0045] text-white rounded-lg hover:bg-[#FC0045]/80 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {qrModal.generating ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      {event.qr_enter ? 'Rigenerando...' : 'Generando...'}
                    </>
                  ) : (
                    <>
                      <FaQrcode />
                      <span>{event.qr_enter ? 'Rigenera QR' : 'Genera QR'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODALE CONFERMA DISATTIVAZIONE QR */}
        {disableQrModal.show && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-gray-900 border border-white/20 rounded-lg p-6 max-w-md w-full mx-4">
              {/* Header */}
              <div className="flex items-center gap-3 mb-4">
                <div className="flex-shrink-0 w-10 h-10 bg-red-500/20 rounded-full flex items-center justify-center">
                  <FaBan className="text-red-400 text-lg" />
                </div>
                <div>
                  <h3 className="text-white font-semibold">Disattiva QR Code Ingresso</h3>
                  <p className="text-white/60 text-sm">Rimuovi il codice QR per l'accesso all'evento</p>
                </div>
              </div>

              {/* Content */}
              <div className="mb-6">
                <div className="p-4 bg-white/5 border border-white/10 rounded-lg mb-4">
                  <div className="flex items-center gap-3 mb-2">
                    <FaTicketAlt className="text-2xl" />
                    <span className="text-white font-medium">{event.title}</span>
                  </div>
                  {event.description_extended && (
                    <p className="text-white/60 text-sm">{event.description_extended}</p>
                  )}
                </div>

                {/* QR Code Corrente */}
                <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg mb-4">
                  <p className="text-blue-400 text-sm flex items-center gap-2 mb-2">
                    <FaQrcode />
                    <span className="font-medium">QR Code Attuale:</span>
                  </p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white rounded flex items-center justify-center">
                      <div className="w-8 h-8 bg-black rounded-sm flex items-center justify-center">
                        <span className="text-white text-xs font-mono">{event.qr_enter!.slice(0, 3)}</span>
                      </div>
                    </div>
                    <span className="text-blue-300 font-mono text-sm">{event.qr_enter}</span>
                  </div>
                </div>

                {/* Warning */}
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg mb-4">
                  <p className="text-red-400 text-sm flex items-center gap-2 mb-2">
                    <FaExclamationTriangle />
                    <span className="font-medium">Attenzione: Operazione irreversibile</span>
                  </p>
                  <ul className="text-red-300 text-sm space-y-1 ml-6">
                    <li>• Il QR code attuale diventerà immediatamente inutilizzabile</li>
                    <li>• L'accesso tramite QR sarà completamente disattivato</li>
                    <li>• Dovrai generare un nuovo QR se vuoi riattivare l'accesso</li>
                  </ul>
                </div>

                {/* Info */}
                <div className="p-3 bg-gray-500/10 border border-gray-500/20 rounded-lg">
                  <h4 className="text-gray-400 font-medium mb-2 inline-flex items-center gap-2"><FaLightbulb /> <span>Quando disattivare il QR:</span></h4>
                  <ul className="text-gray-300 text-sm space-y-1">
                    <li className="flex items-center gap-2">
                      <FaLock />
                      <span>Per motivi di sicurezza (QR compromesso)</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <FaCalendarAlt />
                      <span>Quando l'evento è terminato</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <FaBan />
                      <span>Per impedire nuovi accessi</span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={closeDisableQrModal}
                  disabled={disableQrModal.disabling}
                  className="flex-1 px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors disabled:opacity-50"
                >
                  Annulla
                </button>
                <button
                  onClick={handleDisableQr}
                  disabled={disableQrModal.disabling}
                  className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {disableQrModal.disabling ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Disattivando...
                    </>
                  ) : (
                    <>
                      <FaBan />
                      <span>Disattiva QR</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODALE TRASFERIMENTO */}
        <TransferEntryModal
          show={transferModal.show}
          entry={transferModal.entry}
          event={event}
          onClose={closeTransferModal}
          onSuccess={handleTransferSuccess}
        />

        {/* MODALE MODIFICA */}
        <EditEntryTypeModal
          show={editModal.show}
          entry={editModal.entry}
          onClose={closeEditModal}
          onSuccess={handleEditSuccess}
        />

        {/* MODALE NUOVO INGRESSO */}
        <NewEntryModalWithTemplates
          show={newEntryModal.show}
          eventId={event.id}
          onClose={closeNewEntryModal}
          onSuccess={handleFormSuccess}
        />
    </div>
  );
}
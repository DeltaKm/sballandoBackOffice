"use client";

import { useState, useMemo } from "react";
import { useAuthStore } from "~/store/auth";
import type { Event, Product } from "~/types";
import { TransferProductModal } from "./TransferProductModal";
import { EditProductModal } from "./EditProductModal";
import { NewProductModal } from "./NewProductModal";

interface ProductsSectionProps {
  event: Event;
  onUpdate?: (updatedEvent: Event) => void;
}

export function ProductsSection({ event, onUpdate }: ProductsSectionProps) {
  const [newProductModal, setNewProductModal] = useState<{ show: boolean }>({
    show: false
  });
  const [editModal, setEditModal] = useState<{ 
    show: boolean; 
    product: Product | null; 
  }>({
    show: false,
    product: null
  });
  const [deleteModal, setDeleteModal] = useState<{ show: boolean; productId: number | null; productLabel: string }>({
    show: false,
    productId: null,
    productLabel: ''
  });
  const [withdrawModal, setWithdrawModal] = useState<{ 
    show: boolean; 
    product: Product | null; 
    withdrawableCount: number; 
  }>({
    show: false,
    product: null,
    withdrawableCount: 0
  });
  const [transferModal, setTransferModal] = useState<{ 
    show: boolean; 
    product: Product | null;
  }>({
    show: false,
    product: null
  });
  const [deleting, setDeleting] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [myActiveCategory, setMyActiveCategory] = useState<string>('all');
  const [collaboratorActiveCategories, setCollaboratorActiveCategories] = useState<Record<number, string>>({});
  
  const user = useAuthStore((state) => state.user);
  
  const [formData, setFormData] = useState({
    label: "",
    price: "",
    description: "",
    stock: "",
    category: "",
  });

  const { myProductsByCategory, collaboratorsProductsByCategory, myCategories, collaboratorCategories } = useMemo((): {
    myProductsByCategory: Record<string, Product[]>;
    collaboratorsProductsByCategory: Array<{
      user_id: number;
      collaboratorName: string;
      collaboratorRole: string;
      categoriesData: Record<string, Product[]>;
    }>;
    myCategories: string[];
    collaboratorCategories: Record<number, string[]>;
  } => {
    if (!event.products || event.products.length === 0 || !user) {
      return { 
        myProductsByCategory: {}, 
        collaboratorsProductsByCategory: [], 
        myCategories: [],
        collaboratorCategories: {}
      };
    }

    // Debug: verifica i prodotti ricevuti
    console.log('🔍 ProductsSection - Products received:', {
      totalProducts: event.products.length,
      sampleProducts: event.products.slice(0, 5).map(p => ({
        id: p.id,
        label: p.label,
        entry_type_id: p.entry_type_id,
        hasEntryTypeId: p.entry_type_id !== null && p.entry_type_id !== undefined
      })),
      productsWithEntryType: event.products.filter(p => p.entry_type_id).length,
      productsWithoutEntryType: event.products.filter(p => !p.entry_type_id).length
    });

    const collaboratorsUserIds = event.collaborators?.map(collab => collab.user_id).filter(Boolean) || [];
    
    // Filtra solo i prodotti che NON sono legati a un ingresso
    // Controllo robusto: entry_type_id deve essere null, undefined, o 0
    const standaloneProducts = event.products.filter(product => {
      const hasEntryType = product.entry_type_id && 
                          product.entry_type_id !== null && 
                          product.entry_type_id !== undefined && 
                          product.entry_type_id !== 0;
      return !hasEntryType;
    });
    
    console.log('🔍 ProductsSection - After filtering:', {
      standaloneProducts: standaloneProducts.length,
      filteredOut: event.products.length - standaloneProducts.length
    });
    
    const myProducts = standaloneProducts.filter(product => product.user_id === user.id);
    const myProductsByCategory = myProducts.reduce((acc, product) => {
      const category = product.category || 'Senza Categoria';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(product);
      return acc;
    }, {} as Record<string, Product[]>);

    const myCategories = Object.keys(myProductsByCategory);

    const collaboratorsProducts = standaloneProducts.filter(product => 
      product.user_id !== user.id && collaboratorsUserIds.includes(product.user_id)
    );

    const collaboratorsProductsByCategory = collaboratorsProducts.reduce((acc, product) => {
      if (!acc[product.user_id]) {
        const collaborator = event.collaborators?.find(collab => collab.user_id === product.user_id);
        acc[product.user_id] = {
          user_id: product.user_id,
          collaboratorName: collaborator?.users ? 
            `${collaborator.users.name} ${collaborator.users.surname}` : 
            `User ${product.user_id}`,
          collaboratorRole: collaborator?.role || 'Collaboratore',
          categoriesData: {}
        };
      }

      const category = product.category || 'Senza Categoria';
      if (!acc[product.user_id]!.categoriesData[category]) {
        acc[product.user_id]!.categoriesData[category] = [];
      }
      acc[product.user_id]!.categoriesData[category]!.push(product);
      return acc;
    }, {} as Record<number, {
      user_id: number;
      collaboratorName: string;
      collaboratorRole: string;
      categoriesData: Record<string, Product[]>;
    }>);

    const collaboratorCategories = Object.keys(collaboratorsProductsByCategory).reduce((acc, userId) => {
      const collaborator = collaboratorsProductsByCategory[parseInt(userId)];
      if (collaborator && collaborator.categoriesData) {
        acc[parseInt(userId)] = Object.keys(collaborator.categoriesData);
      }
      return acc;
    }, {} as Record<number, string[]>);

    return {
      myProductsByCategory,
      collaboratorsProductsByCategory: Object.values(collaboratorsProductsByCategory),
      myCategories,
      collaboratorCategories
    };
  }, [event.products, event.collaborators, user]);

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

  const getMyFilteredProducts = () => {
    if (myActiveCategory === 'all') {
      return Object.values(myProductsByCategory).flat();
    }
    return myProductsByCategory[myActiveCategory] || [];
  };

  const getCollaboratorFilteredProducts = (userId: number) => {
    const collaborator = collaboratorsProductsByCategory.find(c => c.user_id === userId);
    if (!collaborator) return [];

    const activeCategory = collaboratorActiveCategories[userId] || 'all';
    if (activeCategory === 'all') {
      return Object.values(collaborator.categoriesData).flat();
    }
    return collaborator.categoriesData[activeCategory] || [];
  };

  const openNewProductModal = () => {
    setNewProductModal({ show: true });
  };

  const closeNewProductModal = () => {
    setNewProductModal({ show: false });
  };

  const handleFormSuccess = (updatedEvent: any) => {
    onUpdate?.(updatedEvent);
    closeNewProductModal();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.label || !formData.price || !user?.token) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/products/create`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify({
          label: formData.label,
          price: parseFloat(formData.price),
          description: formData.description || null,
          stock: formData.stock ? parseInt(formData.stock) : null,
          category: formData.category || null,
          user_token: user.token,
          event_id: event.id
        }),
      });

      if (res.ok) {
        const updatedEvent = await res.json();
        handleFormSuccess(updatedEvent);
      } else {
        const errorData = await res.json();
        const errorMessage = errorData.message 
          ? `${errorData.error}\n\n${errorData.message}` 
          : errorData.error || 'Errore sconosciuto';
        alert(`❌ ${errorMessage}`);
      }
    } catch (err) {
      console.error('Error adding product:', err);
      alert('Errore durante la connessione al server');
    } finally {
      setLoading(false);
    }
  };

  const openDeleteModal = (productId: number, productLabel: string) => {
    setDeleteModal({
      show: true,
      productId,
      productLabel
    });
  };

  const closeDeleteModal = () => {
    setDeleteModal({
      show: false,
      productId: null,
      productLabel: ''
    });
  };

  const handleConfirmDelete = async () => {
    if (!deleteModal.productId || !user?.token) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/products/delete`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          product_id: deleteModal.productId,
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
      console.error('Error deleting product:', err);
      alert('Errore durante la connessione al server');
    } finally {
      setDeleting(false);
    }
  };

  const openTransferModal = (product: Product) => {
    setTransferModal({
      show: true,
      product
    });
  };

  const closeTransferModal = () => {
    setTransferModal({
      show: false,
      product: null
    });
  };

  const handleTransferSuccess = (updatedEvent: Event) => {
    onUpdate?.(updatedEvent);
    closeTransferModal();
  };

  const handleDeleteProduct = (productId: number) => {
    const product = event.products?.find(p => p.id === productId);
    if (product) {
      openDeleteModal(productId, product.label);
    }
  };

  const handleWithdrawProduct = async (product: Product) => {
    if (!user?.token) return;

    // Filtra solo prodotti standalone (non legati a ingressi)
    const standaloneProducts = event.products?.filter(p => {
      const hasEntryType = p.entry_type_id && 
                          p.entry_type_id !== null && 
                          p.entry_type_id !== undefined && 
                          p.entry_type_id !== 0;
      return !hasEntryType;
    }) || [];
    
    const collaboratorProducts = standaloneProducts.filter(p => 
      p.user_id !== user.id && 
      p.label.toLowerCase() === product.label.toLowerCase() &&
      p.stock && p.stock > 0
    );

    if (collaboratorProducts.length === 0) {
      alert('Nessun prodotto da ritirare dai collaboratori');
      return;
    }

    const totalToWithdraw = collaboratorProducts.reduce((sum, p) => sum + (p.stock || 0), 0);
    
    setWithdrawModal({
      show: true,
      product,
      withdrawableCount: totalToWithdraw
    });
  };

  const closeWithdrawModal = () => {
    setWithdrawModal({
      show: false,
      product: null,
      withdrawableCount: 0
    });
  };

  const handleConfirmWithdraw = async () => {
    if (!withdrawModal.product || !user?.token) return;

    setWithdrawing(true);
    
    try {
      const res = await fetch('/api/products/withdraw', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          product_id: withdrawModal.product.id,
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
      console.error('Error withdrawing products:', err);
      alert('Errore durante la connessione al server');
    } finally {
      setWithdrawing(false);
    }
  };

  const getWithdrawableCount = (product: Product) => {
    if (!user) return 0;
    
    // Filtra solo prodotti standalone (non legati a ingressi)
    const standaloneProducts = event.products?.filter(p => {
      const hasEntryType = p.entry_type_id && 
                          p.entry_type_id !== null && 
                          p.entry_type_id !== undefined && 
                          p.entry_type_id !== 0;
      return !hasEntryType;
    }) || [];
    
    const collaboratorProducts = standaloneProducts.filter(p => 
      p.user_id !== user.id && 
      p.label.toLowerCase() === product.label.toLowerCase() &&
      p.stock && p.stock > 0
    );

    return collaboratorProducts.reduce((sum, p) => sum + (p.stock || 0), 0);
  };

  const openEditModal = (product: Product) => {
    setEditModal({
      show: true,
      product
    });
  };

  const closeEditModal = () => {
    setEditModal({
      show: false,
      product: null
    });
  };

  const handleEditSuccess = (updatedEvent: Event) => {
    onUpdate?.(updatedEvent);
    closeEditModal();
  };

  // Funzione per formattare il prezzo
  const formatPrice = (price: number | null | undefined): string => {
    if (price === null || price === undefined) return '0.00';
    return Number(price).toFixed(2);
  };

  const myFilteredProducts = getMyFilteredProducts();
  const totalMyProducts = Object.values(myProductsByCategory).flat().length;

  return (
    <div className="pt-8 border-t border-white/10">
      {/* Header principale */}
      <div className="flex justify-between items-center mb-8">
        <h3 className="text-3xl font-bold text-white">Gestione Prodotti</h3>
        <button
          onClick={openNewProductModal}
          className="px-6 py-3 bg-[#FC0045] text-white rounded-xl hover:bg-[#FC0045]/80 transition-colors flex items-center gap-3 text-lg font-semibold"
        >
          <span className="text-xl">➕</span>
          Nuovo Prodotto
        </button>
      </div>

      {/* Container principale con layout a due colonne con scroll */}
      <div className="grid grid-cols-2 gap-6 h-[75vh]">
        
        {/* COLONNA SINISTRA: I MIEI PRODOTTI */}
        <div className="bg-purple-500/10 border-2 border-purple-500/30 rounded-2xl overflow-hidden flex flex-col">
          <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-purple-500/50 scrollbar-track-transparent">
            {/* Header sezione */}
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 bg-purple-500/30 rounded-xl flex items-center justify-center">
                <span className="text-purple-400 text-2xl">🛍️</span>
              </div>
              <div className="flex-1">
                <h4 className="text-purple-300 font-bold text-xl">I Miei Prodotti</h4>
                <p className="text-purple-400/80 text-base mt-1">Controllo completo e gestione autonoma</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="px-4 py-2 bg-purple-500/30 text-purple-300 rounded-xl text-base font-semibold">
                  {totalMyProducts} prodotti
                </span>
              </div>
            </div>

            {/* Tabs Categorie per i miei prodotti */}
            {myCategories.length > 0 && (
              <div className="mb-6">
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => setMyActiveCategory('all')}
                    className={`px-4 py-2 rounded-xl text-base font-semibold transition-colors ${myActiveCategory === 'all'
                      ? 'bg-purple-500 text-white shadow-lg'
                      : 'bg-white/20 text-white/90 hover:bg-white/30'
                      }`}
                  >
                    Tutte ({totalMyProducts})
                  </button>
                  {myCategories.map((category) => (
                    <button
                      key={category}
                      onClick={() => setMyActiveCategory(category)}
                      className={`px-4 py-2 rounded-xl text-base font-semibold transition-colors ${myActiveCategory === category
                        ? 'bg-purple-500 text-white shadow-lg'
                        : 'bg-white/20 text-white/90 hover:bg-white/30'
                        }`}
                    >
                      {category} ({myProductsByCategory[category]?.length || 0})
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Lista prodotti */}
            <div className="space-y-4">
              {myFilteredProducts.length > 0 ? (
                myFilteredProducts.map((product) => (
                  <div
                    key={product.id}
                    className="p-5 bg-white/15 border border-purple-400/40 rounded-xl hover:border-purple-400/70 hover:bg-purple-500/10 transition-all group cursor-pointer shadow-lg hover:shadow-xl"
                    onClick={(e) => {
                      if ((e.target as HTMLElement).tagName !== "BUTTON") {
                        openEditModal(product);
                      }
                    }}
                    title="Clicca per modificare"
                  >
                    {/* Header prodotto */}
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h5 className="text-white font-bold text-lg">{product.label}</h5>
                          {(product as any).category && (
                            <span className="px-3 py-1 bg-purple-500/40 text-purple-300 rounded-lg text-sm font-semibold">
                              {(product as any).category}
                            </span>
                          )}
                        </div>
                        {product.description && (
                          <p className="text-white/80 text-sm leading-relaxed">{product.description}</p>
                        )}
                      </div>
                      {product.price && product.price > 0 && (
                        <div className="text-right ml-4">
                          <span className="text-[#FC0045] font-bold text-2xl">€{formatPrice(product.price)}</span>
                        </div>
                      )}
                    </div>

                    {/* Statistiche */}
                    <div className="bg-purple-500/20 rounded-xl p-4 mb-4">
                      <div className="grid grid-cols-2 gap-4 text-base">
                        <div className="text-center">
                          <div className="text-purple-300 font-bold text-xl">{product.created_qnt}</div>
                          <div className="text-purple-400/90 text-sm">Creati</div>
                        </div>
                        <div className="text-center">
                          <div className="text-purple-300 font-bold text-xl">{product.stock || '0'}</div>
                          <div className="text-purple-400/90 text-sm">Rimasti</div>
                        </div>
                      </div>
                    </div>

                    {/* Azioni */}
                    <div className="flex justify-end gap-3">
                      <button
                        onClick={(e) => { e.stopPropagation(); product.stock && product.stock > 0 ? openTransferModal(product) : null; }}
                        disabled={!product.stock || product.stock <= 0}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${product.stock && product.stock > 0
                          ? 'bg-purple-500/30 text-purple-300 hover:bg-purple-500/50 border border-purple-400/40'
                          : 'bg-gray-500/30 text-gray-400 cursor-not-allowed border border-gray-500/40'
                          }`}
                        title={
                          !product.stock || product.stock <= 0
                            ? 'Nessuno stock disponibile per il trasferimento'
                            : 'Trasferisci prodotti ai collaboratori'
                        }
                      >
                        🔄 Trasferisci
                      </button>
                      
                      <button
                        onClick={(e) => { e.stopPropagation(); handleWithdrawProduct(product); }}
                        disabled={getWithdrawableCount(product) === 0}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${getWithdrawableCount(product) > 0
                          ? 'bg-orange-500/30 text-orange-300 hover:bg-orange-500/50 border border-orange-400/40'
                          : 'bg-gray-500/30 text-gray-400 cursor-not-allowed border border-gray-500/40'
                          }`}
                        title={
                          getWithdrawableCount(product) === 0
                            ? 'Nessun prodotto da ritirare dai collaboratori'
                            : `Ritira ${getWithdrawableCount(product)} prodotti dai collaboratori`
                        }
                      >
                        ↩️ Ritira
                        {getWithdrawableCount(product) > 0 && (
                          <span className="bg-orange-500/50 px-2 py-1 rounded-lg text-xs font-bold">
                            {getWithdrawableCount(product)}
                          </span>
                        )}
                      </button>
                      
                      <button
                        onClick={(e) => { e.stopPropagation(); openDeleteModal(product.id, product.label); }}
                        className="px-4 py-2 bg-red-500/30 text-red-300 rounded-lg text-sm font-medium hover:bg-red-500/50 transition-colors border border-red-400/40"
                        title="Elimina prodotto"
                      >
                        🗑️ Elimina
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 border-2 border-dashed border-purple-400/40 rounded-xl bg-purple-500/10">
                  <div className="text-purple-400/70 mb-4">
                    <span className="text-5xl">🛍️</span>
                  </div>
                  <p className="text-purple-300 text-lg mb-3 font-semibold">
                    {myActiveCategory === 'all'
                      ? 'Non hai ancora aggiunto prodotti'
                      : `Nessun prodotto nella categoria "${myActiveCategory}"`
                    }
                  </p>
                  <p className="text-purple-400/80 text-base mb-6">
                    {myActiveCategory === 'all'
                      ? 'Inizia aggiungendo il tuo primo prodotto'
                      : 'Prova a cambiare categoria o aggiungi un nuovo prodotto'
                    }
                  </p>
                  {myActiveCategory === 'all' && (
                    <button
                      onClick={openNewProductModal}
                      className="px-6 py-3 bg-purple-500 text-white rounded-xl hover:bg-purple-600 transition-colors text-base font-semibold"
                    >
                      ➕ Aggiungi il primo prodotto
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* COLONNA DESTRA: PRODOTTI COLLABORATORI */}
        <div className="bg-green-500/10 border-2 border-green-500/30 rounded-2xl overflow-hidden flex flex-col">
          <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-green-500/50 scrollbar-track-transparent">
            {/* Header sezione */}
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 bg-green-500/30 rounded-xl flex items-center justify-center">
                <span className="text-green-400 text-2xl">👥</span>
              </div>
              <div className="flex-1">
                <h4 className="text-green-300 font-bold text-xl">Prodotti Collaboratori</h4>
                <p className="text-green-400/80 text-base mt-1">Prodotti gestiti dai tuoi collaboratori</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="px-4 py-2 bg-green-500/30 text-green-300 rounded-xl text-base font-semibold">
                  {Array.isArray(collaboratorsProductsByCategory) ? collaboratorsProductsByCategory.length : 0} collaboratori
                </span>
              </div>
            </div>

            {/* Lista collaboratori */}
            <div className="space-y-6">
              {Array.isArray(collaboratorsProductsByCategory) && collaboratorsProductsByCategory.length > 0 ? (
                collaboratorsProductsByCategory.map((collaboratorGroup: any) => {
                  const collaboratorProducts = getCollaboratorFilteredProducts(collaboratorGroup.user_id);
                  const totalCollaboratorProducts = Object.values(collaboratorGroup.categoriesData).flat().length;
                  const collaboratorCategoryList = (collaboratorCategories as any)[collaboratorGroup.user_id] || [];

                  return (
                    <div key={collaboratorGroup.user_id} className="bg-white/15 border border-green-400/40 rounded-xl p-6 shadow-lg">
                      {/* Header Collaboratore */}
                      <div className="flex items-center justify-between mb-6 pb-4 border-b border-green-400/30">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-green-500/30 rounded-lg flex items-center justify-center">
                            <span className="text-green-400 text-xl">👤</span>
                          </div>
                          <div>
                            <h5 className="text-green-300 font-bold text-lg">{collaboratorGroup.collaboratorName}</h5>
                            <div className="flex items-center gap-3 mt-1">
                              <span className="px-3 py-1 bg-purple-500/30 text-purple-300 rounded-lg text-sm font-semibold">
                                {collaboratorGroup.collaboratorRole}
                              </span>
                              <span className="px-3 py-1 bg-green-500/30 text-green-300 rounded-lg text-sm font-semibold">
                                {totalCollaboratorProducts} prodotti
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Tabs Categorie per questo collaboratore */}
                      {collaboratorCategoryList.length > 0 && (
                        <div className="mb-6">
                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={() => setCollaboratorActiveCategories(prev => ({
                                ...prev,
                                [collaboratorGroup.user_id]: 'all'
                              }))}
                              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${(collaboratorActiveCategories[collaboratorGroup.user_id] || 'all') === 'all'
                                ? 'bg-green-500 text-white shadow-lg'
                                : 'bg-white/20 text-white/90 hover:bg-white/30'
                                }`}
                            >
                              Tutte ({totalCollaboratorProducts})
                            </button>
                            {collaboratorCategoryList.map((category: any) => (
                              <button
                                key={category}
                                onClick={() => setCollaboratorActiveCategories(prev => ({
                                  ...prev,
                                  [collaboratorGroup.user_id]: category
                                }))}
                                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${collaboratorActiveCategories[collaboratorGroup.user_id] === category
                                  ? 'bg-green-500 text-white shadow-lg'
                                  : 'bg-white/20 text-white/90 hover:bg-white/30'
                                  }`}
                              >
                                {category} ({collaboratorGroup.categoriesData[category]?.length || 0})
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Prodotti del collaboratore */}
                      {collaboratorProducts.length > 0 ? (
                        <div className="space-y-4">
                          {collaboratorProducts.map((product: any) => (
                            <div key={product.id} className="p-4 bg-green-500/10 border border-green-400/30 rounded-lg shadow-md">
                              <div className="flex justify-between items-start mb-3">
                                <div className="flex-1">
                                  <div className="flex items-center gap-3 mb-2">
                                    <h6 className="text-white font-bold text-base">{product.label}</h6>
                                    {product.category && (
                                      <span className="px-2 py-1 bg-green-500/40 text-green-300 rounded text-xs font-semibold">
                                        {product.category}
                                      </span>
                                    )}
                                  </div>
                                  {product.description && (
                                    <p className="text-white/80 text-sm">{product.description}</p>
                                  )}
                                </div>
                                {product.price && product.price > 0 && (
                                  <span className="text-[#FC0045] font-bold text-xl">€{formatPrice(product.price)}</span>
                                )}
                              </div>

                              <div className="bg-green-500/20 rounded-lg p-3">
                                <div className="grid grid-cols-2 gap-3 text-sm">
                                  <div className="text-center">
                                    <div className="text-green-300 font-semibold text-lg">{product.transfer_qnt || '0'}</div>
                                    <div className="text-green-400/80 text-xs">Creati</div>
                                  </div>
                                  <div className="text-center">
                                    <div className="text-green-300 font-semibold text-lg">{product.stock || '0'}</div>
                                    <div className="text-green-400/80 text-xs">Rimasti</div>
                                  </div>
                                </div>
                              </div>

                              {/* Pulsanti Azione */}
                              <div className="mt-3 flex justify-end gap-2">
                                <button
                                  onClick={() => handleWithdrawProduct(product as unknown as Product)}
                                  className="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg transition-all duration-200 flex items-center gap-2"
                                >
                                  <span>↩️</span>
                                  <span>Ritira</span>
                                </button>
                                <button
                                  onClick={() => handleDeleteProduct(product.id as number)}
                                  className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-all duration-200 flex items-center gap-2"
                                >
                                  <span>🗑️</span>
                                  <span>Elimina</span>
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 border border-dashed border-green-400/40 rounded-lg bg-green-500/10">
                          <div className="text-green-400/70 mb-3">
                            <span className="text-3xl">📝</span>
                          </div>
                          <p className="text-green-300 text-base font-semibold">
                            {(collaboratorActiveCategories[collaboratorGroup.user_id] || 'all') === 'all'
                              ? 'Nessun prodotto per questo collaboratore'
                              : `Nessun prodotto nella categoria "${collaboratorActiveCategories[collaboratorGroup.user_id]}"`
                            }
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-12 border-2 border-dashed border-green-400/40 rounded-xl bg-green-500/10">
                  <div className="text-green-400/70 mb-4">
                    <span className="text-5xl">👥</span>
                  </div>
                  <p className="text-green-300 text-lg mb-3 font-semibold">Nessun collaboratore attivo</p>
                  <p className="text-green-400/80 text-base">
                    I collaboratori potranno aggiungere i loro prodotti una volta invitati
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Stato vuoto generale */}
      {totalMyProducts === 0 && (!Array.isArray(collaboratorsProductsByCategory) || collaboratorsProductsByCategory.length === 0) && (
        <div className="text-center py-16 bg-white/10 rounded-2xl border-2 border-dashed border-white/30 mt-8">
          <div className="text-white/70 mb-6">
            <span className="text-6xl">🛍️</span>
          </div>
          <h4 className="text-white text-2xl font-bold mb-4">Nessun prodotto configurato</h4>
          <p className="text-white/80 text-lg mb-8">Inizia aggiungendo il tuo primo prodotto per l'evento</p>
          <button
            onClick={openNewProductModal}
            className="px-8 py-4 bg-[#FC0045] text-white rounded-xl hover:bg-[#FC0045]/80 transition-colors text-lg font-semibold"
          >
            ➕ Aggiungi il primo prodotto
          </button>
        </div>
      )}

      {/* MODALE CONFERMA RITIRO */}
      {withdrawModal.show && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900 border border-white/20 rounded-lg p-6 max-w-md w-full mx-4">
            {/* Header */}
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-shrink-0 w-10 h-10 bg-orange-500/20 rounded-full flex items-center justify-center">
                <span className="text-orange-400 text-lg">🔄</span>
              </div>
              <div>
                <h3 className="text-white font-semibold">Conferma Ritiro</h3>
                <p className="text-white/60 text-sm">Ritira prodotti dai collaboratori</p>
              </div>
            </div>

            {/* Content */}
            <div className="mb-6">
              <p className="text-white/80 mb-2">
                Stai per ritirare prodotti dai collaboratori:
              </p>
              <div className="p-3 bg-white/5 border border-white/10 rounded-lg mb-3">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-white font-medium">"{withdrawModal.product?.label}"</span>
                  {withdrawModal.product?.price && withdrawModal.product.price > 0 && (
                    <span className="text-[#FC0045] font-bold">€{formatPrice(withdrawModal.product.price)}</span>
                  )}
                </div>
                {withdrawModal.product?.description && (
                  <p className="text-white/60 text-sm mb-2">{withdrawModal.product.description}</p>
                )}
                {withdrawModal.product?.category && (
                  <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs">
                    {withdrawModal.product.category}
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
                    {(withdrawModal.product?.stock || 0)} + {withdrawModal.withdrawableCount} = {(withdrawModal.product?.stock || 0) + withdrawModal.withdrawableCount}
                  </span>
                </div>
              </div>

              <p className="text-orange-400 text-sm mt-3 flex items-center gap-2">
                <span>⚠️</span>
                <span>Questa azione rimuoverà tutti i prodotti compatibili dai collaboratori</span>
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
                    🔄 Ritira ({withdrawModal.withdrawableCount})
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODALE CONFERMA ELIMINAZIONE */}
      {deleteModal.show && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900 border border-white/20 rounded-lg p-6 max-w-md w-full mx-4">
            {/* Header */}
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-shrink-0 w-10 h-10 bg-red-500/20 rounded-full flex items-center justify-center">
                <span className="text-red-400 text-lg">⚠️</span>
              </div>
              <div>
                <h3 className="text-white font-semibold">Conferma Eliminazione</h3>
                <p className="text-white/60 text-sm">Questa azione non può essere annullata</p>
              </div>
            </div>

            {/* Content */}
            <div className="mb-6">
              <p className="text-white/80 mb-2">
                Sei sicuro di voler eliminare il prodotto:
              </p>
              <div className="p-3 bg-white/5 border border-white/10 rounded-lg">
                <span className="text-white font-medium">"{deleteModal.productLabel}"</span>
              </div>
              <p className="text-red-400 text-sm mt-2">
                ⚠️ Tutti i dati associati verranno eliminati permanentemente
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
                    🗑️ Elimina
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODALI COMPONENTI ESISTENTI */}
      <EditProductModal
        show={editModal.show}
        product={editModal.product}
        onClose={closeEditModal}
        onSuccess={handleEditSuccess}
      />

      <TransferProductModal
        show={transferModal.show}
        product={transferModal.product}
        event={event}
        onClose={closeTransferModal}
        onSuccess={handleTransferSuccess}
      />

      <NewProductModal
        show={newProductModal.show}
        eventId={event.id}
        onClose={closeNewProductModal}
        onSuccess={handleFormSuccess}
      />
    </div>
  );
}
"use client";

import { useState, useEffect } from "react";
import { FaExclamationTriangle, FaEdit, FaTimes, FaSyncAlt, FaLightbulb, FaChartBar, FaCheckCircle } from "react-icons/fa";
import { useAuthStore } from "~/store/auth";
import type { Product, Event } from "~/types";

interface EditProductModalProps {
  show: boolean;
  product: Product | null;
  onClose: () => void;
  onSuccess: (updatedEvent: Event) => void;
}

export function EditProductModal({ show, product, onClose, onSuccess }: EditProductModalProps) {
  const [formData, setFormData] = useState({
    label: "",
    price: "",
    description: "",
    category: "",
    stock: "",
  });
  
  const [errors, setErrors] = useState({
    label: "",
    price: "",
    stock: "",
    general: ""
  });
  
  const [updating, setUpdating] = useState(false);
  const [transferInfo, setTransferInfo] = useState<{
    isTransferred: boolean;
    allowedChanges?: string[];
    minStock?: number;
    totalTransferred?: number;
  } | null>(null);
  
  const user = useAuthStore((state) => state.user);

  // Aggiorna form data quando il prodotto cambia
  useEffect(() => {
    if (product) {
      setFormData({
        label: product.label || "",
        price: product.price?.toString() || "",
        description: product.description || "",
        category: product.category || "",
        stock: product.stock?.toString() || "",
      });
      setErrors({
        label: "",
        price: "",
        stock: "",
        general: ""
      });
      setTransferInfo(null);
    }
  }, [product]);

  const validateForm = () => {
    const newErrors = {
      label: "",
      price: "",
      stock: "",
      general: ""
    };

    if (!formData.label.trim()) {
      newErrors.label = "Il nome del prodotto è obbligatorio";
    }

    if (!formData.price || parseFloat(formData.price) < 0) {
      newErrors.price = "Il prezzo deve essere un numero valido maggiore o uguale a 0";
    }

    if (formData.stock && (isNaN(parseInt(formData.stock)) || parseInt(formData.stock) < 0)) {
      newErrors.stock = "La quantità deve essere un numero intero maggiore o uguale a 0";
    }

    // Validazione specifica per prodotti trasferiti
    if (transferInfo?.minStock && formData.stock) {
      const newStock = parseInt(formData.stock);
      if (newStock < transferInfo.minStock) {
        newErrors.stock = `La quantità non può essere inferiore a ${transferInfo.minStock} (prodotti già trasferiti)`;
      }
    }

    setErrors(newErrors);
    return !newErrors.label && !newErrors.price && !newErrors.stock;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product || !user?.token) return;
    
    if (!validateForm()) return;

    setUpdating(true);
    setErrors(prev => ({ ...prev, general: "" }));
    setTransferInfo(null);

    try {
      const res = await fetch('/api/products/update', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          product_id: product.id,
          user_token: user.token,
          label: formData.label.trim(),
          price: parseFloat(formData.price),
          description: formData.description.trim() || null,
          category: formData.category.trim() || null,
          stock: formData.stock ? parseInt(formData.stock) : null,
        }),
      });

      if (res.ok) {
        const updatedEvent = await res.json();
        onSuccess(updatedEvent);
        onClose();
      } else {
        const errorData = await res.json();
        
        // Gestisci errori specifici per prodotti trasferiti
        if (errorData.code === 'PRODUCT_TRANSFERRED_LIMITED_EDIT') {
          setTransferInfo({
            isTransferred: true,
            allowedChanges: errorData.allowed_changes,
            totalTransferred: errorData.total_transferred_stock
          });
        } else if (errorData.code === 'STOCK_BELOW_TRANSFERRED') {
          setTransferInfo({
            isTransferred: true,
            minStock: errorData.min_allowed_stock,
            totalTransferred: errorData.total_transferred_stock
          });
        }
        
        setErrors(prev => ({ 
          ...prev, 
          general: errorData.error || 'Errore durante l\'aggiornamento del prodotto' 
        }));
      }
    } catch (err) {
      console.error('Error updating product:', err);
      setErrors(prev => ({ 
        ...prev, 
        general: 'Errore durante la connessione al server' 
      }));
    } finally {
      setUpdating(false);
    }
  };

  const handleClose = () => {
    if (!updating) {
      onClose();
    }
  };

  if (!show || !product) return null;

  const isLimitedEdit = transferInfo?.isTransferred && transferInfo?.allowedChanges;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-gray-900 border border-white/20 rounded-lg p-6 max-w-md w-full mx-4">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
            isLimitedEdit ? 'bg-orange-500/20' : 'bg-blue-500/20'
          }`}>
            {isLimitedEdit ? (
              <FaExclamationTriangle className="text-lg text-orange-400" />
            ) : (
              <FaEdit className="text-lg text-blue-400" />
            )}
          </div>
          <div className="flex-1">
            <h3 className="text-white font-semibold">
              {isLimitedEdit ? 'Modifica Limitata' : 'Modifica Prodotto'}
            </h3>
            <p className="text-white/60 text-sm">
              {isLimitedEdit 
                ? 'Prodotto trasferito: solo descrizione e quantità modificabili'
                : 'Aggiorna le informazioni del prodotto'
              }
            </p>
          </div>
          <button
            onClick={handleClose}
            disabled={updating}
            className="text-white/60 hover:text-white transition-colors disabled:opacity-50"
          >
            <FaTimes />
          </button>
        </div>

        {/* Avviso prodotto trasferito */}
        {isLimitedEdit && (
          <div className="mb-4 p-3 bg-orange-500/20 border border-orange-500/20 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <FaSyncAlt className="text-orange-400" />
              <span className="text-orange-400 font-medium text-sm">Prodotto Trasferito</span>
            </div>
            <p className="text-orange-400/80 text-xs">
              Questo prodotto è stato trasferito ai collaboratori. 
              Puoi modificare solo la descrizione e la quantità.
              {transferInfo?.totalTransferred && (
                <span className="block mt-1">
                  Stock trasferito: {transferInfo.totalTransferred} pz
                </span>
              )}
            </p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 mb-6">
          {errors.general && (
            <div className="p-3 bg-red-500/20 border border-red-500/20 rounded-lg">
              <p className="text-red-400 text-sm">{errors.general}</p>
            </div>
          )}

          {/* Nome */}
          <div>
            <label className="block text-white/80 text-sm mb-2">Nome Prodotto *</label>
            <input
              type="text"
              value={formData.label}
              onChange={(e) => setFormData({ ...formData, label: e.target.value })}
              placeholder="es. Birra, Cocktail..."
              disabled={updating || !!isLimitedEdit}
              className={`w-full px-3 py-2 bg-white/10 border rounded-lg text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed ${
                errors.label ? 'border-red-500' : 'border-white/20'
              }`}
            />
            {errors.label && (
              <p className="text-red-400 text-sm mt-1">{errors.label}</p>
            )}
            {isLimitedEdit && (
              <p className="text-orange-400/60 text-xs mt-1">Campo non modificabile (prodotto trasferito)</p>
            )}
          </div>

          {/* Prezzo */}
          <div>
            <label className="block text-white/80 text-sm mb-2">Prezzo (€) *</label>
            <input
              type="number"
              step="0.01"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              placeholder="0.00"
              disabled={updating || !!isLimitedEdit}
              className={`w-full px-3 py-2 bg-white/10 border rounded-lg text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed ${
                errors.price ? 'border-red-500' : 'border-white/20'
              }`}
            />
            {errors.price && (
              <p className="text-red-400 text-sm mt-1">{errors.price}</p>
            )}
            {isLimitedEdit && (
              <p className="text-orange-400/60 text-xs mt-1">Campo non modificabile (prodotto trasferito)</p>
            )}
          </div>

          {/* Quantità/Stock */}
          <div>
            <label className="block text-white/80 text-sm mb-2">
              Quantità Stock
              <span className="text-white/50 text-xs ml-2">(lascia vuoto per illimitato)</span>
            </label>
            <input
              type="number"
              min={transferInfo?.minStock || "0"}
              step="1"
              value={formData.stock}
              onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
              placeholder={
                transferInfo?.minStock 
                  ? `Minimo ${transferInfo.minStock} (prodotti trasferiti)`
                  : "es. 100 (lascia vuoto per illimitato)"
              }
              disabled={updating}
              className={`w-full px-3 py-2 bg-white/10 border rounded-lg text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 ${
                errors.stock ? 'border-red-500' : 'border-white/20'
              }`}
            />
            {errors.stock && (
              <p className="text-red-400 text-sm mt-1">{errors.stock}</p>
            )}
            {transferInfo?.minStock && (
              <p className="text-orange-400/80 text-xs mt-1 inline-flex items-center gap-1">
                <FaExclamationTriangle />
                <span>Quantità minima: {transferInfo.minStock} (prodotti già trasferiti)</span>
              </p>
            )}
          </div>

          {/* Categoria */}
          <div>
            <label className="block text-white/80 text-sm mb-2">Categoria</label>
            <input
              type="text"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              placeholder="es. Bevande, Cibo..."
              disabled={updating || !!isLimitedEdit}
              className={`w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed`}
            />
            {isLimitedEdit && (
              <p className="text-orange-400/60 text-xs mt-1">Campo non modificabile (prodotto trasferito)</p>
            )}
          </div>

          {/* Descrizione */}
          <div>
            <label className="block text-white/80 text-sm mb-2">
              Descrizione
              {isLimitedEdit && (
                <span className="text-green-400 text-xs ml-2 inline-flex items-center gap-1"><FaCheckCircle /><span>Modificabile</span></span>
              )}
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Descrizione del prodotto..."
              rows={3}
              disabled={updating}
              className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none disabled:opacity-50"
            />
            {isLimitedEdit && (
              <p className="text-green-400/60 text-xs mt-1 inline-flex items-center gap-1">
                <FaLightbulb />
                <span>La modifica della descrizione verrà applicata anche ai prodotti trasferiti</span>
              </p>
            )}
          </div>

          {/* Info Originali (readonly) */}
          <div className="p-3 bg-white/5 border border-white/10 rounded-lg">
            <h4 className="text-white font-medium text-sm mb-2 inline-flex items-center gap-2">
              <FaChartBar />
              <span>Informazioni Originali</span>
            </h4>
            <div className="flex justify-between items-center text-sm">
              <span className="text-white/60">Stock attuale:</span>
              <span className="text-white">{product.stock || 'Illimitato'}</span>
            </div>
            <div className="flex justify-between items-center text-sm mt-1">
              <span className="text-white/60">Quantità creata inizialmente:</span>
              <span className="text-white">{product.created_qnt}</span>
            </div>
            {formData.stock && formData.stock !== product.stock?.toString() && (
              <div className="mt-2 pt-2 border-t border-white/10">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-blue-400">Nuovo stock:</span>
                  <span className="text-blue-400 font-medium">
                    {formData.stock || '0'}
                  </span>
                </div>
              </div>
            )}
          </div>
        </form>

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleClose}
            disabled={updating}
            className="flex-1 px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors disabled:opacity-50"
          >
            Annulla
          </button>
          <button
            onClick={handleSubmit}
            disabled={updating}
            className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {updating ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                Aggiornando...
              </>
            ) : (
              <>
                <FaEdit />
                <span>Aggiorna</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
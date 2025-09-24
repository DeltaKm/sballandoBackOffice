"use client";

import { useState } from "react";
import { useAuthStore } from "~/store/auth";

interface NewProductModalProps {
  show: boolean;
  eventId: number;
  onClose: () => void;
  onSuccess: (updatedEvent: any) => void;
}

export function NewProductModal({ show, eventId, onClose, onSuccess }: NewProductModalProps) {
  const [formData, setFormData] = useState({
    label: "",
    price: "",
    description: "",
    stock: "",
    category: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const user = useAuthStore((state) => state.user);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Rimuovi l'errore quando l'utente inizia a digitare
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.label.trim()) {
      newErrors.label = 'Il nome del prodotto è obbligatorio';
    }

    if (!formData.price.trim()) {
      newErrors.price = 'Il prezzo è obbligatorio';
    } else if (isNaN(Number(formData.price)) || Number(formData.price) < 0) {
      newErrors.price = 'Il prezzo deve essere un numero valido maggiore o uguale a 0';
    }

    if (formData.stock && (isNaN(Number(formData.stock)) || Number(formData.stock) < 0)) {
      newErrors.stock = 'Lo stock deve essere un numero valido maggiore o uguale a 0';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm() || !user?.token) return;

    setIsSubmitting(true);

    try {
      const res = await fetch('/api/products/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          event_id: eventId,
          label: formData.label.trim(),
          price: parseFloat(formData.price),
          description: formData.description.trim() || null,
          stock: formData.stock ? parseInt(formData.stock) : null,
          category: formData.category.trim() || null,
          user_token: user.token
        }),
      });

      if (res.ok) {
        const updatedEvent = await res.json();
        onSuccess(updatedEvent);
        handleClose();
      } else {
        const errorData = await res.json();
        alert(`Errore durante la creazione: ${errorData.error || 'Errore sconosciuto'}`);
      }
    } catch (err) {
      console.error('Error creating product:', err);
      alert('Errore durante la connessione al server');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setFormData({
      label: "",
      price: "",
      description: "",
      stock: "",
      category: "",
    });
    setErrors({});
    onClose();
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-gray-900 border border-white/20 rounded-2xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#FC0045]/20 rounded-lg flex items-center justify-center">
              <span className="text-[#FC0045] text-xl">🛍️</span>
            </div>
            <div>
              <h2 className="text-white font-bold text-xl">Nuovo Prodotto</h2>
              <p className="text-white/60 text-sm">Crea un nuovo prodotto per l'evento</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className="w-8 h-8 bg-white/10 hover:bg-white/20 rounded-lg flex items-center justify-center text-white/70 hover:text-white transition-colors disabled:opacity-50"
          >
            <span className="text-lg">✕</span>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {errors.general && (
            <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg">
              <p className="text-red-400 text-sm">{errors.general}</p>
            </div>
          )}

          {/* Nome Prodotto */}
          <div>
            <label htmlFor="label" className="block text-white/80 text-sm mb-2">Nome Prodotto *</label>
            <input
              type="text"
              id="label"
              name="label"
              value={formData.label}
              onChange={handleChange}
              className={`w-full px-3 py-2 bg-white/10 border rounded-lg text-white placeholder-white/60 focus:outline-none focus:ring-2 ${
                errors.label 
                  ? 'border-red-500 focus:ring-red-500' 
                  : 'border-white/20 focus:ring-[#FC0045]'
              }`}
              placeholder="es. T-shirt, Gadget, Drink..."
              disabled={isSubmitting}
            />
            {errors.label && (
              <p className="text-red-400 text-sm mt-1">{errors.label}</p>
            )}
          </div>

          {/* Prezzo */}
          <div>
            <label htmlFor="price" className="block text-white/80 text-sm mb-2">Prezzo (€) *</label>
            <input
              type="number"
              id="price"
              name="price"
              value={formData.price}
              onChange={handleChange}
              step="0.01"
              min="0"
              className={`w-full px-3 py-2 bg-white/10 border rounded-lg text-white placeholder-white/60 focus:outline-none focus:ring-2 ${
                errors.price 
                  ? 'border-red-500 focus:ring-red-500' 
                  : 'border-white/20 focus:ring-[#FC0045]'
              }`}
              placeholder="0.00"
              disabled={isSubmitting}
            />
            {errors.price && (
              <p className="text-red-400 text-sm mt-1">{errors.price}</p>
            )}
          </div>

          {/* Categoria */}
          <div>
            <label htmlFor="category" className="block text-white/80 text-sm mb-2">Categoria</label>
            <input
              type="text"
              id="category"
              name="category"
              value={formData.category}
              onChange={handleChange}
              className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-[#FC0045]"
              placeholder="es. Merchandise, Food, Bevande..."
              disabled={isSubmitting}
            />
          </div>

          {/* Stock */}
          <div>
            <label htmlFor="stock" className="block text-white/80 text-sm mb-2">Quantità Stock</label>
            <input
              type="number"
              id="stock"
              name="stock"
              value={formData.stock}
              onChange={handleChange}
              min="0"
              className={`w-full px-3 py-2 bg-white/10 border rounded-lg text-white placeholder-white/60 focus:outline-none focus:ring-2 ${
                errors.stock 
                  ? 'border-red-500 focus:ring-red-500' 
                  : 'border-white/20 focus:ring-[#FC0045]'
              }`}
              placeholder="Lascia vuoto per illimitato"
              disabled={isSubmitting}
            />
            {errors.stock && (
              <p className="text-red-400 text-sm mt-1">{errors.stock}</p>
            )}
          </div>

          {/* Descrizione */}
          <div>
            <label htmlFor="description" className="block text-white/80 text-sm mb-2">Descrizione</label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={3}
              className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-[#FC0045] resize-none"
              placeholder="Descrizione opzionale del prodotto..."
              disabled={isSubmitting}
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors disabled:opacity-50 text-sm font-semibold"
            >
              Annulla
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 bg-[#FC0045] text-white rounded-lg hover:bg-[#FC0045]/80 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 text-sm font-semibold"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Creando...
                </>
              ) : (
                <>
                  <span>➕</span>
                  Crea Prodotto
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
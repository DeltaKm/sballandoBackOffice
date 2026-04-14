"use client";

import { useState } from "react";
import { useAuthStore } from "~/store/auth";
import type { IconType } from 'react-icons';
import {
  FaCocktail,
  FaBeer,
  FaGlassCheers,
  FaUtensils,
  FaPizzaSlice,
  FaBirthdayCake,
  FaShoppingBag,
  FaTimes,
  FaBolt,
  FaMagic,
} from 'react-icons/fa';

interface NewProductModalProps {
  show: boolean;
  eventId: number;
  onClose: () => void;
  onSuccess: (updatedEvent: any) => void;
}

// Template prodotti
const PRODUCT_TEMPLATES = [
  {
    id: 'cocktail',
    name: 'Cocktail Premium',
    icon: FaCocktail,
    color: 'from-pink-500 to-rose-500',
    data: {
      label: "Cocktail Premium",
      description: "Cocktail preparati con ingredienti di alta qualità",
      category: "Bevande",
      price: "12.00",
      stock: "50"
    }
  },
  {
    id: 'birra',
    name: 'Birra Artigianale',
    icon: FaBeer,
    color: 'from-amber-500 to-orange-500',
    data: {
      label: "Birra Artigianale",
      description: "Selezione di birre artigianali locali e internazionali",
      category: "Bevande",
      price: "6.00",
      stock: "100"
    }
  },
  {
    id: 'champagne',
    name: 'Champagne',
    icon: FaGlassCheers,
    color: 'from-yellow-500 to-amber-500',
    data: {
      label: "Champagne Premium",
      description: "Bottiglie di champagne per occasioni speciali",
      category: "Alcolici",
      price: "80.00",
      stock: "20"
    }
  },
  {
    id: 'finger_food',
    name: 'Finger Food',
    icon: FaUtensils,
    color: 'from-green-500 to-teal-500',
    data: {
      label: "Finger Food Gourmet",
      description: "Selezione di stuzzichini e antipasti gourmet",
      category: "Cibo",
      price: "8.00",
      stock: "80"
    }
  },
  {
    id: 'pizza',
    name: 'Pizza Napoletana',
    icon: FaPizzaSlice,
    color: 'from-red-500 to-orange-600',
    data: {
      label: "Pizza Napoletana",
      description: "Pizza tradizionale cotta nel forno a legna",
      category: "Cibo",
      price: "15.00",
      stock: "30"
    }
  },
  {
    id: 'dolci',
    name: 'Dolci Casa',
    icon: FaBirthdayCake,
    color: 'from-purple-500 to-pink-500',
    data: {
      label: "Dolci della Casa",
      description: "Tiramisù, cannoli e dolci tipici della tradizione",
      category: "Dolci",
      price: "7.00",
      stock: "40"
    }
  }
];

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
  const [showTemplates, setShowTemplates] = useState(true);

  const user = useAuthStore((state) => state.user);

  const applyTemplate = (template: typeof PRODUCT_TEMPLATES[0]) => {
    console.log('Applying product template:', template.name);
    setFormData({
      label: template.data.label,
      price: template.data.price,
      description: template.data.description,
      stock: template.data.stock,
      category: template.data.category
    });
    setErrors({});
    setShowTemplates(false);
    
    // Scroll to form
    setTimeout(() => {
      const formElement = document.querySelector('#product-form');
      if (formElement) {
        formElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };

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
    setShowTemplates(true);
    onClose();
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-gray-900 border border-white/20 rounded-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#FC0045]/20 rounded-lg flex items-center justify-center">
              <FaShoppingBag className="text-[#FC0045] text-xl" />
            </div>
            <div>
              <h2 className="text-white font-bold text-xl">Nuovo Prodotto</h2>
              <p className="text-white/60 text-sm">Usa i template veloci o personalizza completamente</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className="w-8 h-8 bg-white/10 hover:bg-white/20 rounded-lg flex items-center justify-center text-white/70 hover:text-white transition-colors disabled:opacity-50"
          >
            <FaTimes className="text-lg" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-100px)] scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
          
          {/* Quick Templates Section */}
          {showTemplates && (
            <div className="mb-8 p-6 bg-gradient-to-r from-gray-800/50 to-gray-700/50 border border-white/10 rounded-xl">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h4 className="text-xl font-bold text-white flex items-center gap-2">
                    <FaBolt />
                    <span>Template Prodotti Veloci</span>
                  </h4>
                  <p className="text-white/60 text-sm mt-1">
                    Scegli un template e personalizzalo secondo le tue esigenze
                  </p>
                </div>
                <button
                  onClick={() => setShowTemplates(false)}
                  className="text-white/60 hover:text-white transition-colors"
                  title="Nascondi template"
                >
                  <FaTimes />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {PRODUCT_TEMPLATES.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => applyTemplate(template)}
                    className={`group relative overflow-hidden rounded-lg border border-white/20 bg-gradient-to-r ${template.color} p-1 hover:scale-105 transition-all duration-300`}
                  >
                    <div className="relative bg-gray-900/80 backdrop-blur rounded-md p-4 h-full">
                      <div className="flex items-center gap-3 mb-3">
                        <template.icon className="text-2xl" />
                        <div className="text-left flex-1">
                          <h5 className="font-semibold text-white text-sm leading-tight">
                            {template.name}
                          </h5>
                          <p className="text-white/60 text-xs">
                            €{template.data.price} • Stock: {template.data.stock}
                          </p>
                        </div>
                      </div>
                      
                      <p className="text-white/70 text-xs mb-3 line-clamp-2">
                        {template.data.description}
                      </p>
                      
                      <div className="flex flex-wrap gap-1">
                        <span className="px-2 py-1 bg-white/10 rounded-full text-white/80 text-xs">
                          {template.data.category}
                        </span>
                      </div>

                      <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-md flex items-center justify-center">
                        <span className="text-white font-medium text-sm bg-black/50 px-3 py-1 rounded-full">
                          Clicca per usare
                        </span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              <div className="mt-4 text-center">
                <button
                  onClick={() => setShowTemplates(false)}
                  className="text-white/60 hover:text-white text-sm underline transition-colors"
                >
                  Oppure crea da zero senza template
                </button>
              </div>
            </div>
          )}

          {/* Show templates button when hidden */}
          {!showTemplates && (
            <div className="mb-6 text-center">
              <button
                onClick={() => setShowTemplates(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-white transition-colors"
              >
                <FaBolt />
                <span>Mostra Template Veloci</span>
              </button>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} id="product-form" className="space-y-4">
            {errors.general && (
              <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg">
                <p className="text-red-400 text-sm">{errors.general}</p>
              </div>
            )}

            {/* Applied Template Indicator */}
            {!showTemplates && formData.label && (
              <div className="p-3 bg-purple-500/20 border border-purple-500/30 rounded-lg">
                <p className="text-purple-300 text-sm flex items-center gap-2">
                  <FaBolt />
                  <span>Template applicato: <strong>{formData.label}</strong></span>
                  <button
                    type="button"
                    onClick={() => {
                      setFormData({
                        label: "",
                        price: "",
                        description: "",
                        stock: "",
                        category: "",
                      });
                      setErrors({});
                      setShowTemplates(true);
                    }}
                    className="text-purple-300 hover:text-purple-200 underline"
                  >
                    Resetta
                  </button>
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            <div className="flex gap-3 pt-4 border-t border-white/10">
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
                    <FaMagic />
                    <span>Crea Prodotto</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
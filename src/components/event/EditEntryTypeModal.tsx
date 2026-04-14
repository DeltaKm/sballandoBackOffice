"use client";

import { useState, useEffect } from "react";
import { FaEdit, FaTimes, FaPlus, FaSave } from "react-icons/fa";
import { useAuthStore } from "~/store/auth";
import { z } from "zod";
import type { EntryType } from "~/types";

const entryTypeSchema = z.object({
  label: z
    .string()
    .min(1, "Il nome dell'ingresso è obbligatorio")
    .min(2, "Il nome deve essere almeno di 2 caratteri")
    .max(50, "Il nome non può superare 50 caratteri"),

  description: z.string().optional().or(z.literal("")),
  
  category: z.string().min(1, "La categoria è obbligatoria")
    .max(50, "La categoria non può superare 50 caratteri"),

  type: z.enum(["free", "invite"], {
    errorMap: () => ({ message: "Seleziona un tipo valido" })
  }),
  
  quantity: z
    .string()
    .min(1, "La quantità deve essere un numero tra 1 e 10000")
    .refine((val) => {
      if (!val || val === "") return true;
      const num = parseInt(val);
      return !isNaN(num) && num > 0 && num <= 10000;
    }, "La quantità deve essere un numero tra 1 e 10000"),
  
  price: z
    .string()
    .optional()
    .or(z.literal("")),
  
  seats: z
    .number()
    .min(1, "Deve esserci almeno 1 posto")
    .max(20, "Non puoi superare 20 posti"),
  
  fairplay_min: z
    .string()
    .optional()
    .or(z.literal(""))
    .refine((val) => {
      if (!val || val === "") return true;
      const num = parseInt(val);
      return !isNaN(num); // Permette qualsiasi numero, anche negativi
    }, "Il fairplay deve essere un numero valido"),
  
  gender_min_enabled: z.boolean(),
  
  gender_min_type: z.string().optional().or(z.literal("")),
  
  gender_min_quantity: z.number().optional(),
  
  consumations: z
    .array(z.object({
      label: z.string().min(1, "Nome consumazione obbligatorio"),
      description: z.string(),
      category: z.string()
    }))
    .max(10, "Non puoi aggiungere più di 10 consumazioni")
}).refine((data) => {
  if (data.gender_min_enabled && (!data.gender_min_type || data.gender_min_type === "")) {
    return false;
  }
  return true;
}, {
  message: "Seleziona un genere valido quando abilitato",
  path: ["gender_min_type"]
}).refine((data) => {
  if (data.gender_min_enabled && data.gender_min_quantity && data.gender_min_quantity > data.seats) {
    return false;
  }
  return true;
}, {
  message: "La quantità minima genere non può superare i posti disponibili",
  path: ["gender_min_quantity"]
}).refine((data) => {
  if (data.gender_min_type && !["male", "female", "other"].includes(data.gender_min_type)) {
    return false;
  }
  return true;
}, {
  message: "Seleziona un genere valido",
  path: ["gender_min_type"]
});

type EntryTypeFormData = z.infer<typeof entryTypeSchema>;

interface EditEntryTypeModalProps {
  show: boolean;
  entry: EntryType | null;
  onClose: () => void;
  onSuccess: (updatedEvent: any) => void;
}

export function EditEntryTypeModal({ show, entry, onClose, onSuccess }: EditEntryTypeModalProps) {
  const [loading, setLoading] = useState(false);
  const user = useAuthStore((state) => state.user);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const [formData, setFormData] = useState<EntryTypeFormData>({
    label: "",
    description: "",
    category: "",
    type: "free",
    quantity: "",
    price: "",
    seats: 1,
    fairplay_min: "",
    gender_min_enabled: false,
    gender_min_type: "",
    gender_min_quantity: 1,
    consumations: []
  });

  const [showConsumationForm, setShowConsumationForm] = useState(false);
  const [consumationFormData, setConsumationFormData] = useState({
    label: "",
    description: "",
    category: ""
  });

  // Popola i dati quando si apre la modale
  useEffect(() => {
    if (show && entry) {
      setFormData({
        label: entry.label || '',
        description: entry.description || '',
        category: entry.category || '',
        type: (entry.type as "free" | "invite") || 'free',
        quantity: entry.stock?.toString() || '',
        price: entry.price?.toString() || '',
        seats: entry.seats || 1,
        fairplay_min: entry.fairplay_min?.toString() || '',
        gender_min_enabled: entry.gender_min_enabled || false,
        gender_min_type: entry.gender_min_type || '',
        gender_min_quantity: entry.gender_min_quantity || 1,
        consumations: (entry.products || []).map(p => ({
          label: p.label,
          description: p.description || '',
          category: p.category || ''
        }))
      });
      setErrors({});
      setShowConsumationForm(false);
      setConsumationFormData({ label: "", description: "", category: "" });
    }
  }, [show, entry]);

  const validateForm = () => {
    const dataToValidate = {
      ...formData,
      label: formData.label.trim()
    };
    
    try {
      entryTypeSchema.parse(dataToValidate);
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          const path = err.path.join('.');
          newErrors[path] = err.message;
        });
        setErrors(newErrors);
      }
      return false;
    }
  };

  const clearError = (fieldName: string) => {
    if (errors[fieldName]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[fieldName];
        return newErrors;
      });
    }
  };

  const handleAddConsumation = () => {
    if (!consumationFormData.label.trim()) {
      alert("Il nome della consumazione è obbligatorio");
      return;
    }
    
    if (formData.consumations.length >= 10) {
      setErrors(prev => ({ ...prev, consumations: "Non puoi aggiungere più di 10 consumazioni" }));
      return;
    }
    
    setFormData(prev => ({
      ...prev,
      consumations: [...prev.consumations, { ...consumationFormData }]
    }));
    
    setConsumationFormData({ label: "", description: "", category: "" });
    setShowConsumationForm(false);
    clearError('consumations');
  };

  const handleRemoveConsumation = (index: number) => {
    setFormData(prev => ({
      ...prev,
      consumations: prev.consumations.filter((_, i) => i !== index)
    }));
    clearError('consumations');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setErrors({});

    if (!formData.label || formData.label.trim() === "") {
      setErrors({ label: "Il nome dell'ingresso è obbligatorio" });
      return;
    }

    const isValid = validateForm();
    if (!isValid) return;

    if (!user || !user.token || !entry) {
      setErrors({ general: "Errore di autenticazione" });
      return;
    }

    setLoading(true);
    try {
      // Calcola il prezzo: se vuoto, "0", 0, o <= 0, usa null
      let finalPrice = null;
      if (formData.price && formData.price !== "" && formData.price !== "0") {
        const parsed = parseFloat(formData.price);
        if (!isNaN(parsed) && parsed > 0) {
          finalPrice = parsed;
        }
      }
      
      console.log("FRONTEND - formData.price:", formData.price, "finalPrice:", finalPrice);
      
      // Usa il tipo selezionato dall'utente
      const finalType = formData.type;
      
      const payload = {
        entry_type_id: entry.id,
        label: formData.label.trim(),
        description: formData.description || null,
        category: formData.category,
        type: finalType,
        quantity: formData.quantity ? parseInt(formData.quantity) : null,
        price: finalPrice,
        seats: formData.seats,
        // Se fairplay_min è vuoto, manda null (permetti qualsiasi valore numerico)
        fairplay_min: formData.fairplay_min !== '' && formData.fairplay_min !== null && formData.fairplay_min !== undefined
          ? parseInt(formData.fairplay_min) 
          : null,
        gender_min_enabled: formData.gender_min_enabled,
        gender_min_type: formData.gender_min_type,
        gender_min_quantity: formData.gender_min_quantity,
        consumations: formData.consumations,
        user_token: user.token
      };
      
      const res = await fetch('/api/entry_types/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const updatedEvent = await res.json();
        onSuccess(updatedEvent);
        onClose();
      } else {
        const errorData = await res.json();
        const errorMessage = errorData.error || "Errore durante la modifica";
        
        if (errorMessage.includes("label") || errorMessage.includes("nome")) {
          setErrors({ label: errorMessage });
        } else if (errorMessage.includes("prezzo") || errorMessage.includes("price")) {
          setErrors({ price: errorMessage });
        } else if (errorMessage.includes("quantità") || errorMessage.includes("quantity")) {
          setErrors({ quantity: errorMessage });
        } else if (errorMessage.includes("genere") || errorMessage.includes("gender")) {
          setErrors({ gender_min_type: errorMessage });
        } else if (errorMessage.includes("accesso") || errorMessage.includes("autorizzazione")) {
          setErrors({ general: errorMessage });
        } else {
          setErrors({ general: errorMessage });
        }
      }
    } catch (err) {
      setErrors({ general: "Errore durante la connessione al server" });
    } finally {
      setLoading(false);
    }
  };

  if (!show || !entry) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-gray-900 border border-white/20 rounded-2xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <FaEdit className="text-blue-400 text-xl" />
            </div>
            <div>
              <h2 className="text-white font-bold text-xl">Modifica Ingresso</h2>
              <p className="text-white/60 text-sm">Modifica le informazioni del tipo di ingresso</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="w-8 h-8 bg-white/10 hover:bg-white/20 rounded-lg flex items-center justify-center text-white/70 hover:text-white transition-colors disabled:opacity-50"
          >
            <FaTimes className="text-lg" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {errors.general && (
            <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg">
              <p className="text-red-400 text-sm">{errors.general}</p>
            </div>
          )}

          {/* Nome Ingresso */}
          <div>
            <label className="block text-white/80 text-sm mb-2">Nome Ingresso *</label>
            <input
              type="text"
              value={formData.label}
              onChange={(e) => {
                setFormData({ ...formData, label: e.target.value });
                clearError('label');
              }}
              placeholder="es. VIP, Standard, Early Bird..."
              className={`w-full px-3 py-2 bg-white/10 border rounded-lg text-white placeholder-white/60 focus:outline-none focus:ring-2 ${
                errors.label 
                  ? 'border-red-500 focus:ring-red-500' 
                  : 'border-white/20 focus:ring-blue-500'
              }`}
            />
            {errors.label && (
              <p className="text-red-400 text-sm mt-1">{errors.label}</p>
            )}
          </div>

          {/* Categoria */}
          <div>
            <label className="block text-white/80 text-sm mb-2">Categoria *</label>
            <input
              type="text"
              value={formData.category}
              onChange={(e) => {
                setFormData({ ...formData, category: e.target.value });
                clearError('category');
              }}
              placeholder="es. Premium, Standard..."
              className={`w-full px-3 py-2 bg-white/10 border rounded-lg text-white placeholder-white/60 focus:outline-none focus:ring-2 ${
                errors.category 
                  ? 'border-red-500 focus:ring-red-500' 
                  : 'border-white/20 focus:ring-blue-500'
              }`}
            />
            {errors.category && (
              <p className="text-red-400 text-sm mt-1">{errors.category}</p>
            )}
          </div>

          {/* Descrizione */}
          <div>
            <label className="block text-white/80 text-sm mb-2">Descrizione</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Descrizione dettagliata dell'ingresso..."
              rows={3}
              className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* Tipo */}
          <div>
            <label className="block text-white/80 text-sm mb-2">Tipo</label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as "free" | "invite" })}
              className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="free">Gratuito</option>
              <option value="invite">Solo Invito</option>
            </select>
          </div>

          {/* Quantità */}
          <div>
            <label className="block text-white/80 text-sm mb-2">Quantità</label>
            <input
              type="number"
              value={formData.quantity}
              onChange={(e) => {
                setFormData({ ...formData, quantity: e.target.value });
                clearError('quantity');
              }}
              placeholder="Illimitato se vuoto"
              className={`w-full px-3 py-2 bg-white/10 border rounded-lg text-white placeholder-white/60 focus:outline-none focus:ring-2 ${
                errors.quantity 
                  ? 'border-red-500 focus:ring-red-500' 
                  : 'border-white/20 focus:ring-blue-500'
              }`}
            />
            {errors.quantity && (
              <p className="text-red-400 text-sm mt-1">{errors.quantity}</p>
            )}
          </div>

          {/* Prezzo */}
          <div>
            <label className="block text-white/80 text-sm mb-2">Prezzo (€)</label>
            <input
              type="number"
              step="0.01"
              value={formData.price}
              onChange={(e) => {
                setFormData({ ...formData, price: e.target.value });
                clearError('price');
              }}
              placeholder="0.00"
              className={`w-full px-3 py-2 bg-white/10 border rounded-lg text-white placeholder-white/60 focus:outline-none focus:ring-2 ${
                errors.price 
                  ? 'border-red-500 focus:ring-red-500' 
                  : 'border-white/20 focus:ring-blue-500'
              }`}
            />
            {errors.price && (
              <p className="text-red-400 text-sm mt-1">{errors.price}</p>
            )}
          </div>

          {/* Posti a Sedere */}
          <div>
            <label className="block text-white/80 text-sm mb-2">Posti a Sedere *</label>
            <select
              value={formData.seats}
              onChange={(e) => {
                setFormData({ ...formData, seats: parseInt(e.target.value) });
                clearError('seats');
              }}
              className={`w-full px-3 py-2 bg-white/10 border rounded-lg text-white focus:outline-none focus:ring-2 ${
                errors.seats 
                  ? 'border-red-500 focus:ring-red-500' 
                  : 'border-white/20 focus:ring-blue-500'
              }`}
            >
              {Array.from({ length: 20 }, (_, i) => i + 1).map(num => (
                <option key={num} value={num}>{num}</option>
              ))}
            </select>
            {errors.seats && (
              <p className="text-red-400 text-sm mt-1">{errors.seats}</p>
            )}
          </div>

          {/* Fairplay Minimo */}
          <div>
            <label className="block text-white/80 text-sm mb-2">Fairplay Minimo</label>
            <input
              type="number"
              value={formData.fairplay_min}
              onChange={(e) => {
                setFormData({ ...formData, fairplay_min: e.target.value });
                clearError('fairplay_min');
              }}
              placeholder="0"
              className={`w-full px-3 py-2 bg-white/10 border rounded-lg text-white placeholder-white/60 focus:outline-none focus:ring-2 ${
                errors.fairplay_min 
                  ? 'border-red-500 focus:ring-red-500' 
                  : 'border-white/20 focus:ring-blue-500'
              }`}
            />
            {errors.fairplay_min && (
              <p className="text-red-400 text-sm mt-1">{errors.fairplay_min}</p>
            )}
          </div>

          {/* Genere Minimo - Toggle */}
          <div>
            <div className="flex items-center gap-3 mb-3">
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.gender_min_enabled}
                  onChange={(e) => {
                    setFormData({ ...formData, gender_min_enabled: e.target.checked });
                    if (!e.target.checked) {
                      clearError('gender_min_type');
                      clearError('gender_min_quantity');
                    }
                  }}
                  className="sr-only"
                />
                <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${formData.gender_min_enabled ? 'bg-blue-500' : 'bg-white/20'}`}>
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${formData.gender_min_enabled ? 'translate-x-6' : 'translate-x-1'}`} />
                </div>
              </label>
              <span className="text-white font-medium text-sm">Genere Minimo</span>
            </div>
            
            {formData.gender_min_enabled && (
              <div className="space-y-3 pl-4 border-l-2 border-blue-500/30">
                {/* Tipo Genere */}
                <div>
                  <label className="block text-white/80 text-sm mb-2">Tipo Genere *</label>
                  <select
                    value={formData.gender_min_type}
                    onChange={(e) => {
                      setFormData({ ...formData, gender_min_type: e.target.value });
                      clearError('gender_min_type');
                    }}
                    className={`w-full px-3 py-2 bg-white/10 border rounded-lg text-white focus:outline-none focus:ring-2 ${
                      errors.gender_min_type 
                        ? 'border-red-500 focus:ring-red-500' 
                        : 'border-white/20 focus:ring-blue-500'
                    }`}
                  >
                    <option value="">Seleziona genere</option>
                    <option value="male">Maschio</option>
                    <option value="female">Femmina</option>
                    <option value="other">Altro</option>
                  </select>
                  {errors.gender_min_type && (
                    <p className="text-red-400 text-sm mt-1">{errors.gender_min_type}</p>
                  )}
                </div>
                
                {/* Quantità Minima */}
                <div>
                  <label className="block text-white/80 text-sm mb-2">Quantità Minima</label>
                  <select
                    value={formData.gender_min_quantity}
                    onChange={(e) => {
                      setFormData({ ...formData, gender_min_quantity: parseInt(e.target.value) });
                      clearError('gender_min_quantity');
                    }}
                    className={`w-full px-3 py-2 bg-white/10 border rounded-lg text-white focus:outline-none focus:ring-2 ${
                      errors.gender_min_quantity 
                        ? 'border-red-500 focus:ring-red-500' 
                        : 'border-white/20 focus:ring-blue-500'
                    }`}
                  >
                    {Array.from({ length: formData.seats }, (_, i) => i + 1).map(num => (
                      <option key={num} value={num}>{num}</option>
                    ))}
                  </select>
                  {errors.gender_min_quantity && (
                    <p className="text-red-400 text-sm mt-1">{errors.gender_min_quantity}</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Consumazioni */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <label className="text-white font-medium text-sm">Consumazioni Incluse</label>
              <button
                type="button"
                onClick={() => setShowConsumationForm(true)}
                disabled={formData.consumations.length >= 10}
                className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1"
              >
                <FaPlus />
                <span>Aggiungi</span>
              </button>
            </div>

            {errors.consumations && (
              <p className="text-red-400 text-sm mb-2">{errors.consumations}</p>
            )}

            {formData.consumations.length > 0 && (
              <div className="space-y-2 mb-3">
                {formData.consumations.map((consumation, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                    <div>
                      <span className="text-white font-medium text-sm">{consumation.label}</span>
                      {consumation.category && (
                        <span className="ml-2 px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs">
                          {consumation.category}
                        </span>
                      )}
                      {consumation.description && (
                        <p className="text-white/60 text-xs mt-1">{consumation.description}</p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveConsumation(index)}
                      className="px-2 py-1 bg-red-500/20 text-red-400 rounded text-xs hover:bg-red-500/30 transition-colors"
                    >
                      Rimuovi
                    </button>
                  </div>
                ))}
              </div>
            )}

            {showConsumationForm && (
              <div className="p-4 bg-white/5 border border-white/10 rounded-lg space-y-3">
                <h5 className="text-white font-medium text-sm">Nuova Consumazione</h5>
                
                <div>
                  <label className="block text-white/80 text-xs mb-1">Nome *</label>
                  <input
                    type="text"
                    value={consumationFormData.label}
                    onChange={(e) => setConsumationFormData({ ...consumationFormData, label: e.target.value })}
                    placeholder="es. Drink, Appetizer..."
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>
                
                <div>
                  <label className="block text-white/80 text-xs mb-1">Categoria</label>
                  <input
                    type="text"
                    value={consumationFormData.category}
                    onChange={(e) => setConsumationFormData({ ...consumationFormData, category: e.target.value })}
                    placeholder="es. Bevande, Cibo..."
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>
                
                <div>
                  <label className="block text-white/80 text-xs mb-1">Descrizione</label>
                  <input
                    type="text"
                    value={consumationFormData.description}
                    onChange={(e) => setConsumationFormData({ ...consumationFormData, description: e.target.value })}
                    placeholder="Descrizione della consumazione..."
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>
                
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowConsumationForm(false)}
                    className="px-3 py-1 bg-white/10 text-white rounded text-sm hover:bg-white/20 transition-colors"
                  >
                    Annulla
                  </button>
                  <button
                    type="button"
                    onClick={handleAddConsumation}
                    className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 transition-colors"
                  >
                    Aggiungi
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors disabled:opacity-50 text-sm font-semibold"
            >
              Annulla
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 text-sm font-semibold"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Salvando...
                </>
              ) : (
                <>
                  <FaSave />
                  <span>Salva Modifiche</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
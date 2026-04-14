"use client";

import { useState } from "react";
import type { IconType } from "react-icons";
import {
  FaTicketAlt,
  FaCrown,
  FaStar,
  FaGlassCheers,
  FaUserGraduate,
  FaClipboardList,
  FaBolt,
  FaTimes,
  FaPlus,
} from "react-icons/fa";
import { useAuthStore } from "~/store/auth";
import { z } from "zod";

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
    .or(z.literal(""))
    .refine((val) => {
      if (!val || val === "") return true;
      const num = parseFloat(val);
      return !isNaN(num) && num >= 0;
    }, "Il prezzo deve essere un numero non negativo"),
  
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
      return !isNaN(num) && num >= 0 && num <= 100;
    }, "Il fairplay deve essere tra 0 e 100"),
  
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
  // Validazione condizionale per gender_min_type
  if (data.gender_min_enabled && (!data.gender_min_type || data.gender_min_type === "")) {
    return false;
  }
  return true;
}, {
  message: "Seleziona un genere valido quando abilitato",
  path: ["gender_min_type"]
}).refine((data) => {
  // Validazione condizionale per gender_min_quantity
  if (data.gender_min_enabled && data.gender_min_quantity && data.gender_min_quantity > data.seats) {
    return false;
  }
  return true;
}, {
  message: "La quantità minima genere non può superare i posti disponibili",
  path: ["gender_min_quantity"]
}).refine((data) => {
  // Validazione per gender_min_type values
  if (data.gender_min_type && !["male", "female", "other"].includes(data.gender_min_type)) {
    return false;
  }
  return true;
}, {
  message: "Seleziona un genere valido",
  path: ["gender_min_type"]
});

type EntryTypeFormData = z.infer<typeof entryTypeSchema>;

type QuickTemplate = {
  id: string;
  name: string;
  icon: IconType;
  color: string;
  data: EntryTypeFormData;
};

interface EntryTypeFormProps {
  eventId: number;
  onSuccess: (updatedEvent: any) => void;
  onCancel: () => void;
}

const QUICK_TEMPLATES: QuickTemplate[] = [
  {
    id: 'pista',
    name: 'Ingresso Pista',
    icon: FaTicketAlt,
    color: 'from-purple-500 to-pink-500',
    data: {
      label: "Ingresso Pista",
      description: "Accesso alla pista da ballo principale",
      category: "Standard",
      type: "free" as const,
      quantity: "100",
      price: "15.00",
      seats: 4,
      fairplay_min: "0",
      gender_min_enabled: false,
      gender_min_type: "",
      gender_min_quantity: 1,
      consumations: [
        { label: "Drink di Benvenuto", description: "Un cocktail a scelta", category: "Bevande" }
      ]
    }
  },
  {
    id: 'vip',
    name: 'Tavolo VIP',
    icon: FaCrown,
    color: 'from-yellow-500 to-orange-500',
    data: {
      label: "Tavolo VIP",
      description: "Tavolo riservato in zona premium con servizio dedicato",
      category: "VIP",
      type: "invite" as const,
      quantity: "10",
      price: "80.00",
      seats: 6,
      fairplay_min: "20",
      gender_min_enabled: true,
      gender_min_type: "female",
      gender_min_quantity: 2,
      consumations: [
        { label: "Bottiglia Premium", description: "Bottiglia di champagne o vodka", category: "Alcolici" },
        { label: "Mixers & Frutta", description: "Accompagnamento per cocktail", category: "Bevande" }
      ]
    }
  },
  {
    id: 'privee',
    name: 'Privée',
    icon: FaStar,
    color: 'from-red-500 to-purple-600',
    data: {
      label: "Privée Exclusive",
      description: "Area privata con servizio di lusso",
      category: "Luxury",
      type: "invite" as const,
      quantity: "3",
      price: "200.00",
      seats: 8,
      fairplay_min: "50",
      gender_min_enabled: true,
      gender_min_type: "female",
      gender_min_quantity: 3,
      consumations: [
        { label: "Champagne Dom Pérignon", description: "Bottiglia premium", category: "Champagne" },
        { label: "Selezione Sushi", description: "Piatto gourmet", category: "Cibo" },
        { label: "Hostess Dedicata", description: "Servizio personalizzato", category: "Servizi" }
      ]
    }
  },
  {
    id: 'aperitivo',
    name: 'Aperitivo',
    icon: FaGlassCheers,
    color: 'from-blue-500 to-teal-500',
    data: {
      label: "Aperitivo Pre-Serata",
      description: "Ingresso per l'aperitivo dalle 19:00 alle 23:00",
      category: "Aperitivo",
      type: "free" as const,
      quantity: "50",
      price: "25.00",
      seats: 2,
      fairplay_min: "0",
      gender_min_enabled: false,
      gender_min_type: "",
      gender_min_quantity: 1,
      consumations: [
        { label: "Cocktail", description: "2 cocktail a scelta", category: "Bevande" },
        { label: "Stuzzichini", description: "Selezione di finger food", category: "Cibo" }
      ]
    }
  },
  {
    id: 'student',
    name: 'Studenti',
    icon: FaUserGraduate,
    color: 'from-green-500 to-blue-500',
    data: {
      label: "Ingresso Studenti",
      description: "Tariffa agevolata per studenti universitari",
      category: "Student",
      type: "free" as const,
      quantity: "80",
      price: "10.00",
      seats: 2,
      fairplay_min: "0",
      gender_min_enabled: false,
      gender_min_type: "",
      gender_min_quantity: 1,
      consumations: [
        { label: "Shot di Benvenuto", description: "Shot della casa", category: "Bevande" }
      ]
    }
  },
  {
    id: 'liste',
    name: 'Lista',
    icon: FaClipboardList,
    color: 'from-indigo-500 to-purple-500',
    data: {
      label: "Ingresso in Lista",
      description: "Ingresso gratuito per chi è in lista fino alle 24:00",
      category: "Lista",
      type: "free" as const,
      quantity: "200",
      price: "0.00",
      seats: 1,
      fairplay_min: "0",
      gender_min_enabled: true,
      gender_min_type: "female",
      gender_min_quantity: 1,
      consumations: []
    }
  }
];

export function EntryTypeForm({ eventId, onSuccess, onCancel }: EntryTypeFormProps) {
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

  const [showTemplates, setShowTemplates] = useState(true);

  const applyTemplate = (template: typeof QUICK_TEMPLATES[0]) => {
    console.log('Applying template:', template.name);
    setFormData(template.data);
    setErrors({});
    setShowTemplates(false);
    
    // Scroll to form
    setTimeout(() => {
      const formElement = document.querySelector('form');
      if (formElement) {
        formElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };

  const validateForm = () => {
    console.log('Validating form data:', formData);
    
    // Preparazione dati per validazione
    const dataToValidate = {
      ...formData,
      label: formData.label.trim()
    };
    
    console.log('Data to validate:', dataToValidate);
    
    try {
      const result = entryTypeSchema.parse(dataToValidate);
      console.log('Validation passed:', result);
      setErrors({});
      return true;
    } catch (error) {
      console.log('Validation failed:', error);
      
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        
        error.errors.forEach((err) => {
          const path = err.path.join('.');
          newErrors[path] = err.message;
          console.log(`Error on field ${path}: ${err.message}`);
        });
        
        setErrors(newErrors);
        console.log('Setting errors:', newErrors);
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
    
    console.log('Form submitted');
    console.log('Raw form data:', formData);
    console.log('Label value:', `"${formData.label}"`);
    console.log('Label length:', formData.label.length);
    
    setErrors({});

    if (!formData.label || formData.label.trim() === "") {
      console.log('Quick check: Label is empty');
      setErrors({ label: "Il nome dell'ingresso è obbligatorio" });
      return;
    }

    const isValid = validateForm();
    console.log('Validation result:', isValid);
    
    if (!isValid) {
      console.log('Form validation failed, stopping submission');
      return;
    }

    if (!user || !user.token) {
      console.log('User not logged in');
      setErrors({ general: "Devi essere loggato per creare un ingresso" });
      return;
    }

    console.log('All checks passed, proceeding with API call');
    
    setLoading(true);
    try {
      const payload = {
        ...formData,
        label: formData.label.trim(),
        event_id: eventId,
        user_token: user.token,
        quantity: formData.quantity ? parseInt(formData.quantity) : null,
        price: formData.price ? parseFloat(formData.price) : 0,
        fairplay_min: formData.fairplay_min ? parseInt(formData.fairplay_min) : 0,
      };
      
      console.log('Sending payload:', payload);
      
      const res = await fetch('/api/entry_types/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      
      if (res.ok) {
        const updatedEvent = await res.json();
        console.log('Success:', updatedEvent);
        onSuccess(updatedEvent);
        
        setFormData({
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
        setErrors({});
      } else {
        const errorData = await res.json();
        console.error('API Error:', errorData);
        
        const errorMessage = errorData.error || "Errore durante la creazione";
        
        // Se c'è un messaggio dettagliato, mostralo
        if (errorData.message) {
          alert(`${errorMessage}\n\n${errorData.message}`);
        } else if (errorMessage.includes("label") || errorMessage.includes("nome")) {
          setErrors({ label: errorMessage });
        } else if (errorMessage.includes("prezzo") || errorMessage.includes("price") || errorMessage.includes("Stripe")) {
          setErrors({ price: errorMessage });
          if (errorData.message) {
            alert(`${errorMessage}\n\n${errorData.message}`);
          }
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
      console.error('Network error:', err);
      setErrors({ general: "Errore durante la connessione al server" });
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="mb-6 p-6 bg-white/5 border border-white/10 rounded-lg">
        <p className="text-white/60 text-center">Devi essere loggato per creare un nuovo ingresso.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Quick Templates Section */}
      {showTemplates && (
        <div className="mb-6 p-6 bg-gradient-to-r from-gray-800/50 to-gray-700/50 border border-white/10 rounded-xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-xl font-bold text-white flex items-center gap-2">
                <FaBolt />
                <span>Compilazione Veloce</span>
              </h4>
              <p className="text-white/60 text-sm mt-1">
                Scegli un template predefinito e personalizzalo secondo le tue esigenze
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
            {QUICK_TEMPLATES.map((template) => (
              <button
                key={template.id}
                onClick={() => applyTemplate(template)}
                className={`group relative overflow-hidden rounded-lg border border-white/20 bg-gradient-to-r ${template.color} p-1 hover:scale-105 transition-all duration-300`}
              >
                <div className="relative bg-gray-900/80 backdrop-blur rounded-md p-4 h-full">
                  <div className="flex items-center gap-3 mb-3">
                    <template.icon className="text-3xl" />
                    <div className="text-left">
                      <h5 className="font-semibold text-white text-sm leading-tight">
                        {template.name}
                      </h5>
                      <p className="text-white/60 text-xs">
                        {template.data.seats} posti • €{template.data.price}
                      </p>
                    </div>
                  </div>
                  
                  <p className="text-white/70 text-xs mb-3 line-clamp-2">
                    {template.data.description}
                  </p>
                  
                  <div className="flex flex-wrap gap-1 mb-3">
                    <span className="px-2 py-1 bg-white/10 rounded-full text-white/80 text-xs">
                      {template.data.category}
                    </span>
                    <span className="px-2 py-1 bg-white/10 rounded-full text-white/80 text-xs">
                      {template.data.type === 'free' ? 'Libero' : 'Solo Invito'}
                    </span>
                    {template.data.consumations.length > 0 && (
                      <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded-full text-xs">
                        {template.data.consumations.length} consumazioni
                      </span>
                    )}
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
        <div className="mb-4 text-center">
          <button
            onClick={() => setShowTemplates(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-white transition-colors"
          >
            <FaBolt />
            <span>Mostra Template Veloci</span>
          </button>
        </div>
      )}

      {/* Original Form */}
      <form onSubmit={handleSubmit} className="p-6 bg-white/5 border border-white/10 rounded-lg space-y-6">
        {/* Form content remains exactly the same */}
        {errors.general && (
          <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg">
            <p className="text-red-400 text-sm">{errors.general}</p>
          </div>
        )}

        {/* Applied Template Indicator */}
        {!showTemplates && formData.label && (
          <div className="p-3 bg-blue-500/20 border border-blue-500/30 rounded-lg">
            <p className="text-blue-300 text-sm flex items-center gap-2">
              <FaBolt />
              <span>Template applicato: <strong>{formData.label}</strong></span>
              <button
                type="button"
                onClick={() => {
                  setFormData({
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
                  setShowTemplates(true);
                }}
                className="text-blue-300 hover:text-blue-200 underline"
              >
                Resetta
              </button>
            </p>
          </div>
        )}

        {/* Rest of the form remains exactly the same */}
        <div>
          <h4 className="text-white font-medium mb-4">Informazioni Base</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    : 'border-white/20 focus:ring-[#FC0045]'
                }`}
              />
              {errors.label && (
                <p className="text-red-400 text-sm mt-1">{errors.label}</p>
              )}
            </div>
            
            <div>
              <label className="block text-white/80 text-sm mb-2">Categoria</label>
              <input
                type="text"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                placeholder="es. Premium, Standard..."
                className={`w-full px-3 py-2 bg-white/10 border rounded-lg text-white placeholder-white/60 focus:outline-none focus:ring-2 ${
                  errors.category 
                    ? 'border-red-500 focus:ring-red-500' 
                    : 'border-white/20 focus:ring-[#FC0045]'
                }`}
              />
              {errors.category && (
                <p className="text-red-400 text-sm mt-1">{errors.category}</p>
              )}
            </div>
            
            <div className="md:col-span-2">
              <label className="block text-white/80 text-sm mb-2">Descrizione</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descrizione dettagliata dell'ingresso..."
                rows={3}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-[#FC0045]"
              />
            </div>
          </div>
        </div>

        <div>
          <h4 className="text-white font-medium mb-4">Tipo e Prezzo</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-white/80 text-sm mb-2">Tipo</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as "free" | "invite" })}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#FC0045]"
              >
                <option value="free">Gratuito</option>
                <option value="invite">Solo Invito</option>
              </select>
            </div>
            
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
                    : 'border-white/20 focus:ring-[#FC0045]'
                }`}
              />
              {errors.quantity && (
                <p className="text-red-400 text-sm mt-1">{errors.quantity}</p>
              )}
            </div>
            
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
                    : 'border-white/20 focus:ring-[#FC0045]'
                }`}
              />
              {errors.price && (
                <p className="text-red-400 text-sm mt-1">{errors.price}</p>
              )}
            </div>
          </div>
        </div>

        <div>
          <h4 className="text-white font-medium mb-4">Configurazione</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    : 'border-white/20 focus:ring-[#FC0045]'
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
                    : 'border-white/20 focus:ring-[#FC0045]'
                }`}
              />
              {errors.fairplay_min && (
                <p className="text-red-400 text-sm mt-1">{errors.fairplay_min}</p>
              )}
            </div>
          </div>
        </div>

        <div>
          <div className="flex items-center gap-3 mb-4">
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
              <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${formData.gender_min_enabled ? 'bg-[#FC0045]' : 'bg-white/20'}`}>
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${formData.gender_min_enabled ? 'translate-x-6' : 'translate-x-1'}`} />
              </div>
            </label>
            <span className="text-white font-medium">Genere Minimo</span>
          </div>
          
          {formData.gender_min_enabled && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                      : 'border-white/20 focus:ring-[#FC0045]'
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
                      : 'border-white/20 focus:ring-[#FC0045]'
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

        <div>
          <div className="flex justify-between items-center mb-4">
            <h4 className="text-white font-medium">Consumazioni Incluse</h4>
            <button
              type="button"
              onClick={() => setShowConsumationForm(true)}
              disabled={formData.consumations.length >= 10}
              className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1"
            >
              <FaPlus />
              <span>Aggiungi Consumazione</span>
            </button>
          </div>

          {errors.consumations && (
            <p className="text-red-400 text-sm mb-2">{errors.consumations}</p>
          )}

          {formData.consumations.length > 0 && (
            <div className="space-y-2 mb-4">
              {formData.consumations.map((consumation, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                  <div>
                    <span className="text-white font-medium">{consumation.label}</span>
                    {consumation.category && (
                      <span className="ml-2 px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs">
                        {consumation.category}
                      </span>
                    )}
                    {consumation.description && (
                      <p className="text-white/60 text-sm mt-1">{consumation.description}</p>
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
            <div className="p-4 bg-white/5 border border-white/10 rounded-lg">
              <h5 className="text-white font-medium mb-3">Nuova Consumazione</h5>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-white/80 text-sm mb-1">Nome *</label>
                  <input
                    type="text"
                    value={consumationFormData.label}
                    onChange={(e) => setConsumationFormData({ ...consumationFormData, label: e.target.value })}
                    placeholder="es. Drink, Appetizer..."
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-[#FC0045]"
                  />
                </div>
                <div>
                  <label className="block text-white/80 text-sm mb-1">Categoria</label>
                  <input
                    type="text"
                    value={consumationFormData.category}
                    onChange={(e) => setConsumationFormData({ ...consumationFormData, category: e.target.value })}
                    placeholder="es. Bevande, Cibo..."
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-[#FC0045]"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-white/80 text-sm mb-1">Descrizione</label>
                  <input
                    type="text"
                    value={consumationFormData.description}
                    onChange={(e) => setConsumationFormData({ ...consumationFormData, description: e.target.value })}
                    placeholder="Descrizione della consumazione..."
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-[#FC0045]"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-3">
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

        <div className="flex justify-end gap-3 mt-6">
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors"
          >
            Annulla
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-[#FC0045] text-white rounded-lg hover:bg-[#FC0045]/80 transition-colors disabled:opacity-50"
          >
            {loading ? 'Aggiungendo...' : 'Aggiungi Ingresso'}
          </button>
        </div>
      </form>
    </div>
  );
}
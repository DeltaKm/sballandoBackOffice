'use client';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "~/store/auth";
import type { locationFormData } from "~/types";

interface Regione {
    nome: string;
}

interface Provincia {
    nome: string;
    sigla: string;
    regione: string;
}

interface Comune {
    nome: string;
    cap: string;
}

export default function CreatelocationPage() {
    const router = useRouter();
    const user = useAuthStore((state) => state.user);
    
    const [formData, setFormData] = useState<locationFormData>({
        name: "",
        description: "",
        address: "",
        city: "",
        regione: "",
        cap: "",
        comune: "",
        provincia: "",
        phone: "",
        logo: null,
        coordinates: null,
        email: "",
        logo_preview: "",
        user_id: 0,
    });
    
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
    
    // Stato per le select dinamiche
    const [regioni, setRegioni] = useState<Regione[]>([]);
    const [province, setProvince] = useState<Provincia[]>([]);
    const [comuni, setComuni] = useState<Comune[]>([]);
    const [caps, setCaps] = useState<string[]>([]);
    
    const [selectedRegione, setSelectedRegione] = useState("");
    const [selectedProvincia, setSelectedProvincia] = useState("");
    const [selectedComune, setSelectedComune] = useState("");
    const [selectedCap, setSelectedCap] = useState("");
    
    const [loadingRegioni, setLoadingRegioni] = useState(false);
    const [loadingProvince, setLoadingProvince] = useState(false);
    const [loadingComuni, setLoadingComuni] = useState(false);

    useEffect(() => {
        if (!user) {
            router.push("/");
            return;
        }
        
        setFormData(prev => ({
            ...prev,
            user_id: user.id
        }));
        
        loadRegioni();
    }, [user, router]);

    const loadRegioni = async () => {
        setLoadingRegioni(true);
        try {
            const response = await fetch('/api/regioni', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ only_regioni: true })
            });
            const data = await response.json();
            if (data.success) {
                setRegioni(data.data);
            }
        } catch (error) {
            console.error('Errore nel caricamento regioni:', error);
        } finally {
            setLoadingRegioni(false);
        }
    };

    const loadProvince = async (regione: string) => {
        setLoadingProvince(true);
        try {
            const response = await fetch('/api/regioni', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ regione, only_province: true })
            });
            const data = await response.json();
            if (data.success) {
                const provinceList: Provincia[] = data.data.map((prov: any) => ({
                    nome: prov.nome,
                    sigla: prov.sigla,
                    regione: prov.regione
                }));
                setProvince(provinceList);
            }
        } catch (error) {
            console.error('Errore nel caricamento province:', error);
        } finally {
            setLoadingProvince(false);
        }
    };

    const loadComuni = async (provincia: string) => {
        setLoadingComuni(true);
        try {
            const response = await fetch('/api/regioni', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ provincia })
            });
            const data = await response.json();
            if (data.success) {
                const comuniList: Comune[] = [];
                data.data.forEach((reg: any) => {
                    reg.province.forEach((prov: any) => {
                        prov.comuni.forEach((comune: any) => {
                            comuniList.push({
                                nome: comune.nome,
                                cap: comune.cap
                            });
                        });
                    });
                });
                setComuni(comuniList);
                
                const capsUnici = [...new Set(comuniList.map(c => c.cap))].filter(Boolean).sort();
                setCaps(capsUnici);
            }
        } catch (error) {
            console.error('Errore nel caricamento comuni:', error);
        } finally {
            setLoadingComuni(false);
        }
    };

    const handleRegioneChange = (regione: string) => {
        setSelectedRegione(regione);
        setSelectedProvincia("");
        setSelectedComune("");
        setSelectedCap("");
        setProvince([]);
        setComuni([]);
        setCaps([]);
        
        setFormData({
            ...formData,
            regione: regione,
            provincia: "",
            comune: "",
            cap: "",
        });
        
        if (fieldErrors.regione) {
            setFieldErrors(prev => ({ ...prev, regione: "" }));
        }
        if (fieldErrors.provincia) {
            setFieldErrors(prev => ({ ...prev, provincia: "" }));
        }
        if (fieldErrors.comune) {
            setFieldErrors(prev => ({ ...prev, comune: "" }));
        }
        
        if (regione) {
            loadProvince(regione);
        }
    };

    const handleProvinciaChange = (provincia: string) => {
        setSelectedProvincia(provincia);
        setSelectedComune("");
        setSelectedCap("");
        setComuni([]);
        setCaps([]);
        
        setFormData({
            ...formData,
            provincia: provincia,
            comune: "",
            cap: "",
        });
        
        if (fieldErrors.provincia) {
            setFieldErrors(prev => ({ ...prev, provincia: "" }));
        }
        if (fieldErrors.comune) {
            setFieldErrors(prev => ({ ...prev, comune: "" }));
        }
        
        if (provincia) {
            loadComuni(provincia);
        }
    };

    const handleComuneChange = (comune: string) => {
        setSelectedComune(comune);
        
        const comuneSelezionato = comuni.find(c => c.nome === comune);
        const cap = comuneSelezionato ? comuneSelezionato.cap : "";
        
        setSelectedCap(cap);
        
        setFormData({
            ...formData,
            comune: comune,
            cap: cap,
        });
        
        if (fieldErrors.comune) {
            setFieldErrors(prev => ({ ...prev, comune: "" }));
        }
    };

    const handleInputChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        
        if (fieldErrors[field]) {
            setFieldErrors(prev => ({ ...prev, [field]: "" }));
        }
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setFormData({
                ...formData,
                logo: file,
                logo_preview: URL.createObjectURL(file),
            });
            
            if (fieldErrors.logo) {
                setFieldErrors(prev => ({ ...prev, logo: "" }));
            }
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");
        setFieldErrors({});

        try {
            if (!user?.token) {
                throw new Error("Token utente mancante");
            }

            const formDataToSend = new FormData();
            
            formDataToSend.append('name', formData.name);
            formDataToSend.append('description', formData.description);
            formDataToSend.append('address', formData.address);
            formDataToSend.append('comune', formData.comune);
            formDataToSend.append('regione', formData.regione);
            formDataToSend.append('provincia', formData.provincia);
            formDataToSend.append('cap', formData.cap);
            formDataToSend.append('phone', formData.phone);
            formDataToSend.append('email', formData.email);
            formDataToSend.append('coordinates', formData.coordinates || '');
            formDataToSend.append('user_token', user.token);
            
            if (formData.logo) {
                formDataToSend.append('logo', formData.logo);
            }

            const res = await fetch('/api/locations/create', {
                method: 'POST',
                body: formDataToSend,
            });

            const data = await res.json();
            if (!res.ok) {
                if (data.validationErrors) {
                    const errors: Record<string, string> = {};
                    data.validationErrors.forEach((err: any) => {
                        errors[err.field] = err.message;
                    });
                    setFieldErrors(errors);
                    
                    setError(data.details || data.error);
                } else {
                    setError(data.details || data.error);
                }
                return;
            }

            router.push('/locations');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Errore durante la creazione del locale');
        } finally {
            setLoading(false);
        }
    };

    const getFieldClassName = (fieldName: string) => {
        const baseClass = "w-full bg-gray-800/50 border rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#FC0045] focus:border-[#FC0045] transition-all duration-200";
        const errorClass = fieldErrors[fieldName] ? "border-red-500 bg-red-500/10" : "border-gray-600";
        return `${baseClass} ${errorClass}`;
    };

    const getSelectClassName = (fieldName: string) => {
        const baseClass = "w-full bg-gray-800/50 border rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#FC0045] focus:border-[#FC0045] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed";
        const errorClass = fieldErrors[fieldName] ? "border-red-500 bg-red-500/10" : "border-gray-600";
        return `${baseClass} ${errorClass}`;
    };

    if (!user) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
                <div className="text-white text-lg">Caricamento...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 py-8 px-4">
            <div className="max-w-2xl mx-auto">
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-white mb-2">Crea Locale</h1>
                    <p className="text-gray-400">Aggiungi un nuovo locale alla piattaforma</p>
                </div>

                {/* Form Container */}
                <div className="bg-gray-800/30 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-6 shadow-2xl">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {error && (
                            <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-lg text-sm">
                                {error}
                            </div>
                        )}

                        {/* Informazioni di base */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                                <span className="w-6 h-6 bg-[#FC0045] rounded-full flex items-center justify-center text-xs font-bold text-white">1</span>
                                Informazioni Generali
                            </h3>

                            <div className="grid grid-cols-1 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                        Nome del locale *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.name}
                                        onChange={(e) => handleInputChange('name', e.target.value)}
                                        className={getFieldClassName('name')}
                                        placeholder="Es. Club Paradise"
                                    />
                                    {fieldErrors.name && (
                                        <p className="mt-1 text-xs text-red-400">{fieldErrors.name}</p>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                        Descrizione *
                                    </label>
                                    <textarea
                                        required
                                        value={formData.description}
                                        onChange={(e) => handleInputChange('description', e.target.value)}
                                        className={`${getFieldClassName('description')} h-24 resize-none`}
                                        placeholder="Descrivi il tuo locale..."
                                    />
                                    {fieldErrors.description && (
                                        <p className="mt-1 text-xs text-red-400">{fieldErrors.description}</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Ubicazione */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                                <span className="w-6 h-6 bg-[#FC0045] rounded-full flex items-center justify-center text-xs font-bold text-white">2</span>
                                Ubicazione
                            </h3>

                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Indirizzo *
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={formData.address}
                                    onChange={(e) => handleInputChange('address', e.target.value)}
                                    className={getFieldClassName('address')}
                                    placeholder="Via Roma 123"
                                />
                                {fieldErrors.address && (
                                    <p className="mt-1 text-xs text-red-400">{fieldErrors.address}</p>
                                )}
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                        Regione *
                                    </label>
                                    <select
                                        required
                                        value={selectedRegione}
                                        onChange={(e) => handleRegioneChange(e.target.value)}
                                        disabled={loadingRegioni}
                                        className={getSelectClassName('regione')}
                                    >
                                        <option value="">
                                            {loadingRegioni ? "Caricamento..." : "Seleziona regione"}
                                        </option>
                                        {regioni.map((regione) => (
                                            <option key={regione.nome} value={regione.nome} className="bg-gray-800">
                                                {regione.nome}
                                            </option>
                                        ))}
                                    </select>
                                    {fieldErrors.regione && (
                                        <p className="mt-1 text-xs text-red-400">{fieldErrors.regione}</p>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                        Provincia *
                                    </label>
                                    <select
                                        required
                                        value={selectedProvincia}
                                        onChange={(e) => handleProvinciaChange(e.target.value)}
                                        disabled={!selectedRegione || loadingProvince}
                                        className={getSelectClassName('provincia')}
                                    >
                                        <option value="">
                                            {loadingProvince ? "Caricamento..." : 
                                             !selectedRegione ? "Prima seleziona una regione" : 
                                             "Seleziona provincia"}
                                        </option>
                                        {province.map((provincia) => (
                                            <option key={provincia.nome} value={provincia.nome} className="bg-gray-800">
                                                {provincia.nome} ({provincia.sigla})
                                            </option>
                                        ))}
                                    </select>
                                    {fieldErrors.provincia && (
                                        <p className="mt-1 text-xs text-red-400">{fieldErrors.provincia}</p>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                        Città *
                                    </label>
                                    <select
                                        required
                                        value={selectedComune}
                                        onChange={(e) => handleComuneChange(e.target.value)}
                                        disabled={!selectedProvincia || loadingComuni}
                                        className={getSelectClassName('comune')}
                                    >
                                        <option value="">
                                            {loadingComuni ? "Caricamento..." : 
                                             !selectedProvincia ? "Prima seleziona una provincia" : 
                                             "Seleziona città"}
                                        </option>
                                        {comuni.map((comune, index) => (
                                            <option key={`${comune.nome}-${index}`} value={comune.nome} className="bg-gray-800">
                                                {comune.nome}
                                            </option>
                                        ))}
                                    </select>
                                    {fieldErrors.comune && (
                                        <p className="mt-1 text-xs text-red-400">{fieldErrors.comune}</p>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                        CAP
                                    </label>
                                    <input
                                        type="text"
                                        value={selectedCap}
                                        readOnly
                                        className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-2.5 text-gray-400 text-sm cursor-not-allowed"
                                        placeholder="Seleziona prima una città"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Coordinate GPS
                                </label>
                                <input
                                    type="text"
                                    value={formData.coordinates || ''}
                                    onChange={(e) => handleInputChange('coordinates', e.target.value)}
                                    className={getFieldClassName('coordinates')}
                                    placeholder="41.9028, 12.4964"
                                />
                                <p className="mt-1 text-xs text-gray-400">
                                    Opzionale: latitudine, longitudine (es. 41.9028, 12.4964)
                                </p>
                            </div>
                        </div>

                        {/* Contatti */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                                <span className="w-6 h-6 bg-[#FC0045] rounded-full flex items-center justify-center text-xs font-bold text-white">3</span>
                                Contatti
                            </h3>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                        Telefono *
                                    </label>
                                    <input
                                        type="tel"
                                        required
                                        value={formData.phone}
                                        onChange={(e) => handleInputChange('phone', e.target.value)}
                                        className={getFieldClassName('phone')}
                                        placeholder="+39 02 1234567"
                                    />
                                    {fieldErrors.phone && (
                                        <p className="mt-1 text-xs text-red-400">{fieldErrors.phone}</p>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                        Email *
                                    </label>
                                    <input
                                        type="email"
                                        required
                                        value={formData.email}
                                        onChange={(e) => handleInputChange('email', e.target.value)}
                                        className={getFieldClassName('email')}
                                        placeholder="info@clubparadise.it"
                                    />
                                    {fieldErrors.email && (
                                        <p className="mt-1 text-xs text-red-400">{fieldErrors.email}</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Logo */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                                <span className="w-6 h-6 bg-[#FC0045] rounded-full flex items-center justify-center text-xs font-bold text-white">4</span>
                                Logo del Locale
                            </h3>

                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Carica logo *
                                </label>
                                <input
                                    type="file"
                                    required
                                    accept="image/*"
                                    onChange={handleImageUpload}
                                    className={`w-full bg-gray-800/50 border rounded-lg px-4 py-3 text-gray-300 text-sm file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-[#FC0045] file:text-white file:cursor-pointer hover:file:bg-[#FC0045]/80 transition-all ${
                                        fieldErrors.logo ? 'border-red-500 bg-red-500/10' : 'border-gray-600'
                                    }`}
                                />
                                {fieldErrors.logo && (
                                    <p className="mt-1 text-xs text-red-400">{fieldErrors.logo}</p>
                                )}
                                {formData.logo_preview && (
                                    <div className="mt-4">
                                        <img
                                            src={formData.logo_preview}
                                            alt="Preview logo"
                                            className="rounded-lg max-h-32 w-auto object-cover border border-gray-600 mx-auto"
                                        />
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Bottoni */}
                        <div className="flex gap-3 pt-6 border-t border-gray-700">
                            <button
                                type="button"
                                onClick={() => router.back()}
                                className="flex-1 bg-gray-700 text-white py-3 rounded-lg hover:bg-gray-600 transition-colors font-medium"
                            >
                                Annulla
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="flex-1 bg-[#FC0045] text-white py-3 rounded-lg hover:bg-[#FC0045]/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                            >
                                {loading ? "Creazione in corso..." : "Crea Locale"}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
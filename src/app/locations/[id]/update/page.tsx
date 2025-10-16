"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuthStore } from "~/store/auth";
import { useAuthRedirect } from "~/lib/useAuth";
import { getLocationLogoUrl } from "~/lib/imageUtils";
import { FaSearch, FaTimes, FaMapMarkerAlt, FaPhone, FaEnvelope, FaGlobe, FaInstagram, FaFacebook, FaTwitter } from 'react-icons/fa';
import { Switch } from '@headlessui/react';

interface LocationFormData {
    name: string;
    description: string | null;
    address: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
    latitude: number | null;
    longitude: number | null;
    phone: string | null;
    email: string | null;
    website: string | null;
    instagram: string | null;
    facebook: string | null;
    twitter: string | null;
    is_active: boolean;
    cover: File | null;
    cover_preview: string;
    cover_path?: string;
}

interface Location {
    id: number;
    name: string;
    description: string | null;
    address: string;
    comune: string;  // invece di city
    provincia: string; // invece di state
    cap: string; // invece di postal_code
    phone: string | null;
    email: string | null;
    logo: string | null; // invece di cover
    created_at: string;
    updated_at: string;
}

export default function UpdateLocationPage() {
    const router = useRouter();
    const params = useParams();
    const locationId = params.id as string;
    const auth = useAuthRedirect();
    const user = auth.user;

    const [formData, setFormData] = useState<LocationFormData>({
        name: "",
        description: null,
        address: "",
        city: "",
        state: "",
        postal_code: "",
        country: "Italia",
        latitude: null,
        longitude: null,
        phone: null,
        email: null,
        website: null,
        instagram: null,
        facebook: null,
        twitter: null,
        is_active: true,
        cover: null,
        cover_preview: '',
        cover_path: undefined
    });

    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingLocation, setIsLoadingLocation] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    // ✅ CARICA I DATI DEL LOCALE
    useEffect(() => {
        if (!locationId) {
            setError("ID locale mancante");
            setIsLoadingLocation(false);
            return;
        }

        const fetchLocation = async () => {
            try {
                if (!user?.token) {
                    throw new Error('Token di autenticazione mancante');
                }

                const response = await fetch(`/api/locations/${locationId}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        user_token: user.token
                    }),
                });

                if (!response.ok) {
                    throw new Error('Errore nel caricamento del locale');
                }

                const location: Location = await response.json();

                setFormData({
                    name: location.name || "",
                    description: location.description || null,
                    address: location.address || "",
                    city: location.comune || "", // mappa comune -> city nel form
                    state: location.provincia || "", // mappa provincia -> state nel form
                    postal_code: location.cap || "", // mappa cap -> postal_code nel form
                    country: "Italia", // valore fisso
                    latitude: null, // non più supportato
                    longitude: null, // non più supportato
                    phone: location.phone || null,
                    email: location.email || null,
                    website: null, // non più supportato
                    instagram: null, // non più supportato
                    facebook: null, // non più supportato
                    twitter: null, // non più supportato
                    is_active: true, // valore di default
                    cover: null,
                    cover_preview: getLocationLogoUrl(location) || '', // usa logo invece di cover
                    cover_path: location.logo || undefined
                });

            } catch (err) {
                console.error('Errore nel caricamento:', err);
                setError('Errore nel caricamento del locale');
            } finally {
                setIsLoadingLocation(false);
            }
        };

        if (user?.token) {
            fetchLocation();
        }
    }, [locationId, auth.isAuthenticated, user?.token]);

    // ✅ GESTIONE UPLOAD IMMAGINE
    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const objectUrl = URL.createObjectURL(file);
            setFormData({
                ...formData,
                cover: file,
                cover_preview: objectUrl,
            });
        }
    };

    // ✅ RIMUOVI IMMAGINE
    const removeImage = () => {
        if (formData.cover_preview && formData.cover_preview.startsWith('blob:')) {
            URL.revokeObjectURL(formData.cover_preview);
        }
        setFormData({
            ...formData,
            cover: null,
            cover_preview: '',
            cover_path: undefined
        });
    };

    // ✅ GESTIONE INVIO FORM
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);
        setSuccess(null);

        try {
            if (!user?.token) {
                throw new Error('Token di autenticazione mancante');
            }

            const submitFormData = new FormData();
            
            // Aggiungi tutti i campi usando la struttura corretta per l'API
            submitFormData.append('user_token', user.token);
            submitFormData.append('name', formData.name);
            submitFormData.append('description', formData.description || '');
            submitFormData.append('address', formData.address);
            submitFormData.append('city', formData.city); // Sarà mappato su 'comune' nell'API
            submitFormData.append('province', formData.state); // Mappa state -> province
            submitFormData.append('postal_code', formData.postal_code);
            submitFormData.append('phone', formData.phone || '');
            submitFormData.append('email', formData.email || '');
            
            // Se c'è un'immagine, aggiungila come 'logo' invece di 'cover'
            if (formData.cover) {
                submitFormData.append('logo', formData.cover);
            }

            const response = await fetch(`/api/locations/${locationId}`, {
                method: 'PUT',
                body: submitFormData, // Rimuovo il header Authorization perché è nei FormData
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Errore nella modifica del locale');
            }

            const result = await response.json();
            setSuccess('Locale modificato con successo!');
            
            // Redirect dopo 2 secondi
            setTimeout(() => {
                router.push('/locations');
            }, 2000);

        } catch (err) {
            console.error('Errore nella modifica:', err);
            setError(err instanceof Error ? err.message : 'Errore nella modifica del locale');
        } finally {
            setIsLoading(false);
        }
    };

    // Se non è ancora inizializzato, mostra loading
    if (auth.isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-600">Caricamento autenticazione...</p>
                </div>
            </div>
        );
    }

    // Se non è autenticato, non mostrare nulla (verrà reindirizzato)
    if (!auth.isAuthenticated) {
        return null;
    }

    if (isLoadingLocation) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-600">Caricamento locale...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">Modifica Locale</h1>
                            <p className="text-gray-600 mt-2">Aggiorna le informazioni del locale</p>
                        </div>
                        <button
                            onClick={() => router.back()}
                            className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
                        >
                            ← Indietro
                        </button>
                    </div>
                </div>

                {/* Form */}
                <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                    <form onSubmit={handleSubmit} className="p-6 space-y-6">
                        
                        {/* Messaggi di errore/successo */}
                        {error && (
                            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                                <div className="flex">
                                    <div className="text-red-400">❌</div>
                                    <div className="ml-3">
                                        <p className="text-red-800">{error}</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {success && (
                            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                <div className="flex">
                                    <div className="text-green-400">✅</div>
                                    <div className="ml-3">
                                        <p className="text-green-800">{success}</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ✅ INFORMAZIONI BASE */}
                        <div className="space-y-6">
                            <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">
                                📍 Informazioni Base
                            </h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Nome Locale */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Nome Locale *
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        placeholder="Es. Club XYZ"
                                        required
                                    />
                                </div>

                               
                            </div>

                            {/* Descrizione */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Descrizione
                                </label>
                                <textarea
                                    value={formData.description || ''}
                                    onChange={(e) => setFormData({...formData, description: e.target.value || null})}
                                    rows={4}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="Descrizione del locale..."
                                />
                            </div>
                        </div>

                        {/* ✅ INDIRIZZO */}
                        <div className="space-y-6">
                            <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">
                                🗺️ Indirizzo
                            </h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Indirizzo */}
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        <FaMapMarkerAlt className="inline mr-2" />
                                        Indirizzo *
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.address}
                                        onChange={(e) => setFormData({...formData, address: e.target.value})}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        placeholder="Via/Piazza e numero civico"
                                        required
                                    />
                                </div>

                                {/* Città */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Città *
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.city}
                                        onChange={(e) => setFormData({...formData, city: e.target.value})}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        placeholder="Milano"
                                        required
                                    />
                                </div>

                                {/* Provincia */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Provincia *
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.state}
                                        onChange={(e) => setFormData({...formData, state: e.target.value})}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        placeholder="MI"
                                        required
                                    />
                                </div>

                                {/* CAP */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        CAP *
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.postal_code}
                                        onChange={(e) => setFormData({...formData, postal_code: e.target.value})}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        placeholder="20100"
                                        required
                                    />
                                </div>

                                {/* Paese */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Paese *
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.country}
                                        onChange={(e) => setFormData({...formData, country: e.target.value})}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        placeholder="Italia"
                                        required
                                    />
                                </div>
                            </div>

                            {/* Coordinate GPS */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Latitudine
                                    </label>
                                    <input
                                        type="number"
                                        step="any"
                                        value={formData.latitude || ''}
                                        onChange={(e) => setFormData({...formData, latitude: e.target.value ? parseFloat(e.target.value) : null})}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        placeholder="45.4642"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Longitudine
                                    </label>
                                    <input
                                        type="number"
                                        step="any"
                                        value={formData.longitude || ''}
                                        onChange={(e) => setFormData({...formData, longitude: e.target.value ? parseFloat(e.target.value) : null})}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        placeholder="9.1900"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* ✅ CONTATTI */}
                        <div className="space-y-6">
                            <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">
                                📞 Contatti
                            </h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Telefono */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        <FaPhone className="inline mr-2" />
                                        Telefono
                                    </label>
                                    <input
                                        type="tel"
                                        value={formData.phone || ''}
                                        onChange={(e) => setFormData({...formData, phone: e.target.value || null})}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        placeholder="+39 02 12345678"
                                    />
                                </div>

                                {/* Email */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        <FaEnvelope className="inline mr-2" />
                                        Email
                                    </label>
                                    <input
                                        type="email"
                                        value={formData.email || ''}
                                        onChange={(e) => setFormData({...formData, email: e.target.value || null})}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        placeholder="info@locale.it"
                                    />
                                </div>

                                {/* Website */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        <FaGlobe className="inline mr-2" />
                                        Sito Web
                                    </label>
                                    <input
                                        type="url"
                                        value={formData.website || ''}
                                        onChange={(e) => setFormData({...formData, website: e.target.value || null})}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        placeholder="https://www.locale.it"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* ✅ SOCIAL MEDIA */}
                        <div className="space-y-6">
                            <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">
                                📱 Social Media
                            </h3>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {/* Instagram */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        <FaInstagram className="inline mr-2 text-pink-500" />
                                        Instagram
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.instagram || ''}
                                        onChange={(e) => setFormData({...formData, instagram: e.target.value || null})}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        placeholder="@locale_instagram"
                                    />
                                </div>

                                {/* Facebook */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        <FaFacebook className="inline mr-2 text-blue-600" />
                                        Facebook
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.facebook || ''}
                                        onChange={(e) => setFormData({...formData, facebook: e.target.value || null})}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        placeholder="LocaleFacebook"
                                    />
                                </div>

                                {/* Twitter */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        <FaTwitter className="inline mr-2 text-blue-400" />
                                        Twitter
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.twitter || ''}
                                        onChange={(e) => setFormData({...formData, twitter: e.target.value || null})}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        placeholder="@locale_twitter"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* ✅ IMMAGINE DI COPERTINA */}
                        <div className="space-y-6">
                            <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">
                                🖼️ Immagine di Copertina
                            </h3>

                            <div className="flex items-start gap-6">
                                {/* Upload Area */}
                                <div className="flex-1">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Carica una nuova immagine
                                    </label>
                                    <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg hover:border-gray-400 transition-colors">
                                        <div className="space-y-1 text-center">
                                            <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                                                <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                            <div className="flex text-sm text-gray-600">
                                                <label htmlFor="cover-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500">
                                                    <span>Carica un file</span>
                                                    <input
                                                        id="cover-upload"
                                                        type="file"
                                                        accept="image/*"
                                                        onChange={handleImageUpload}
                                                        className="sr-only"
                                                    />
                                                </label>
                                                <p className="pl-1">o trascina qui</p>
                                            </div>
                                            <p className="text-xs text-gray-500">PNG, JPG, GIF fino a 10MB</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Preview */}
                                {formData.cover_preview && (
                                    <div className="relative">
                                        <div className="w-48 h-32 rounded-lg overflow-hidden border border-gray-200">
                                            <img
                                                src={formData.cover_preview}
                                                alt="Preview"
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                        <button
                                            type="button"
                                            onClick={removeImage}
                                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                                        >
                                            <FaTimes className="w-3 h-3" />
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* ✅ PULSANTI AZIONE */}
                        <div className="flex justify-end space-x-4 pt-6 border-t">
                            <button
                                type="button"
                                onClick={() => router.back()}
                                className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                            >
                                Annulla
                            </button>
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                            >
                                {isLoading ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                        Aggiornamento...
                                    </>
                                ) : (
                                    <>
                                        💾 Aggiorna Locale
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
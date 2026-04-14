"use client";

import { useState, useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "~/store/auth";
import Image from "next/image";
import { FaSearch, FaTimes, FaUserTie, FaExclamationTriangle } from 'react-icons/fa';
import { EventSchema } from "~/schemas/event";
import { Switch } from '@headlessui/react';
import { v4 as uuidv4 } from 'uuid';

interface MusicGenre {
    id: number;
    label: string;
}

interface EventFormData {
    title: string;
    description_extended: string | null;
    datetime_start: string;
    datetime_end: string;
    location_id: string;
    is_public: boolean;
    cover: File | null;
    cover_preview: string;
    subtitle: string;
    music_genres: number[];
    state: "draft" | "published";
    user_id: number;
    cover_path?: string;
    dress_code?: string;
    age_recommended?: string;
}

export default function CreateEventPage() {
    const router = useRouter();
    const user = useAuthStore((state) => state.user);

    // 1. Tutti gli useState
    const [formData, setFormData] = useState<EventFormData>(() => ({
        title: "",
        description_extended: null,
        datetime_start: "",
        datetime_end: "",
        location_id: "",
        is_public: true,
        cover: null,
        cover_preview: '',
        subtitle: '',
        music_genres: [],
        state: "published",
        user_id: typeof user?.id === "number" ? user.id : 0, // Assicura che sia sempre un numero
        dress_code: "",
        age_recommended: "",
    }));
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [searchQuery, setSearchQuery] = useState('');
    const [allMusicGenres, setAllMusicGenres] = useState<Array<{
        label: string; id: number; name: string
    }>>([]);
    const [filteredGenres, setFilteredGenres] = useState<Array<{
        label: ReactNode; id: number; name: string
    }>>([]);
    const [locations, setlocations] = useState<Array<{ id: number; name: string }>>([]);

    // 2. Tutti gli useEffect
    useEffect(() => {
        if (!user) {
            router.push('/');
            return;
        }
        setFormData(prev => ({
            ...prev,
            user_id: typeof user.id === "number" ? user.id : 0
        }));
    }, [user, router]);

    useEffect(() => {
        const fetchMusicGenres = async () => {
            try {
                const res = await fetch('/api/music-genres');
                if (res.ok) {
                    const data = await res.json();
                    setAllMusicGenres(data);
                    setFilteredGenres(data);
                }
            } catch (err) {
                console.error('Error fetching music genres:', err);
            }
        };

        const fetchlocations = async () => {
            try {
                const res = await fetch('/api/locations', {
                    method: "POST",
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ user_token: user?.token }),
                });
                if (res.ok) {
                    const data = await res.json();
                    setlocations(data);
                }
            } catch (err) {
                console.error('Error fetching locations:', err);
            }
        };

        fetchMusicGenres();
        fetchlocations();
    }, [user?.id]);

    useEffect(() => {
        const query = searchQuery.toLowerCase().trim();
        const filtered = allMusicGenres.filter(genre =>
            genre.label.toLowerCase().includes(query)
        );
        
        // Ordina i risultati per rilevanza:
        // 1. Corrispondenza esatta
        // 2. Inizia con il termine cercato
        // 3. Contiene il termine
        const sortedFiltered = filtered.sort((a, b) => {
            const aLower = a.label.toLowerCase();
            const bLower = b.label.toLowerCase();
            
            // Corrispondenza esatta ha priorità massima
            if (aLower === query && bLower !== query) return -1;
            if (bLower === query && aLower !== query) return 1;
            
            // Inizia con il termine ha priorità alta
            const aStarts = aLower.startsWith(query);
            const bStarts = bLower.startsWith(query);
            if (aStarts && !bStarts) return -1;
            if (bStarts && !aStarts) return 1;
            
            // Altrimenti ordina alfabeticamente
            return aLower.localeCompare(bLower);
        });
        
        setFilteredGenres(sortedFiltered);
    }, [searchQuery, allMusicGenres]);

    // 3. Loading check dopo tutti gli hooks
    if (!user) {
        return null;
    }

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            // Crea un nome file univoco
            const fileExt = file.name.split('.').pop();
            const fileName = `${uuidv4()}.${fileExt}`;
            const filePath = `/uploads/events/${fileName}`;

            // Crea l'anteprima
            const objectUrl = URL.createObjectURL(file);

            setFormData({
                ...formData,
                cover: file,
                cover_preview: objectUrl,
            });

            
        }
    };

    const handleGenreToggle = (genre: { id: number; label: string }) => {
        setFormData(prev => ({
            ...prev,
            music_genres: prev.music_genres.includes(genre.id)
                ? prev.music_genres.filter(id => id !== genre.id)
                : [...prev.music_genres, genre.id]
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            // Prepara i dati per la validazione
            const dataToValidate = {
                ...formData,
                description_extended: formData.description_extended || "", // Converte null in stringa vuota
                location_id: parseInt(formData.location_id), // Converte string in number
                music_genres: formData.music_genres || [], // Assicura che ci sia sempre un array
            };

            // Valida i dati
            // const validationResult = EventSchema.safeParse(dataToValidate);

            // if (!validationResult.success) {
            //     const errors = validationResult.error.errors;
            //     setError(errors[0].message);
            //     setLoading(false);
            //     return;
            // }

            // Se la validazione passa, prepara i dati per l'invio
            const formDataToSend = new FormData();
            formDataToSend.append('title', formData.title);
            formDataToSend.append('subtitle', formData.subtitle);
            formDataToSend.append('description_extended', formData.description_extended || '');
            formDataToSend.append('datetime_start', formData.datetime_start);
            formDataToSend.append('datetime_end', formData.datetime_end);
            formDataToSend.append('is_public', String(formData.is_public));

            // Assicurati che sia una stringa
            formDataToSend.append(
                "music_genres",
                JSON.stringify(formData.music_genres) // ora diventa una stringa JSON
            );


            formDataToSend.append('location_id', formData.location_id);
            formDataToSend.append('state', formData.state);
            formDataToSend.append('user_id', String(formData.user_id));

            // Aggiungi dress_code e age_recommended se presenti
            if (formData.dress_code) {
                formDataToSend.append('dress_code', formData.dress_code);
            }
            if (formData.age_recommended) {
                formDataToSend.append('age_recommended', formData.age_recommended);
            }


            if (formData.cover) {
                formDataToSend.append('cover', formData.cover);
            }

            // Invia i dati
            const res = await fetch('/api/events/create', {
                method: "POST",
                body: formDataToSend
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.message || "Errore durante la creazione dell'evento");
            }

            const data = await res.json();
            router.push(`/event/${data.event.id}`);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Errore durante la creazione dell'evento");
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="min-h-screen bg-[#212938] p-6">
            <div className="max-w-2xl mx-auto">
                <div className="flex items-center justify-between mb-6">
                    <h1 className="text-2xl font-bold text-white">Crea Nuovo Evento</h1>
                    <button
                        onClick={() => router.back()}
                        className="text-white/60 hover:text-white transition-colors"
                    >
                        ← Indietro
                    </button>
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-4">
                        {/* Cover Image Upload */}
                        <div>
                            <label className="block text-sm font-medium text-white/80 mb-2">
                                Immagine di Copertina
                            </label>
                            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-white/10 border-dashed rounded-lg">
                                <div className="space-y-1 text-center">
                                    {formData.cover_preview ? (
                                        <div className="relative w-full h-48">
                                            <img
                                                src={formData.cover_preview}
                                                alt="Preview"
                                                className="w-full h-full object-cover rounded-lg"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    URL.revokeObjectURL(formData.cover_preview); // Pulisci l'URL
                                                    setFormData({
                                                        ...formData,
                                                        cover: null,
                                                        cover_preview: '',
                                                        cover_path: undefined
                                                    });
                                                }}
                                                className="absolute top-2 right-2 p-1.5 bg-black/50 hover:bg-black/70 rounded-full text-white transition-colors"
                                            >
                                                <FaTimes size={14} />
                                            </button>
                                        </div>
                                    ) : (
                                        <>
                                            <svg className="mx-auto h-12 w-12 text-white/40" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                                                <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                            <div className="flex text-sm text-white/60">
                                                <label htmlFor="cover" className="relative cursor-pointer rounded-md font-medium text-[#FC0045] hover:text-[#FC0045]/80">
                                                    <span>Carica un file</span>
                                                    <input id="cover" name="cover" type="file" className="sr-only" onChange={handleImageUpload} accept="image/*" />
                                                </label>
                                                <p className="pl-1">o trascina e rilascia</p>
                                            </div>
                                            <p className="text-xs text-white/40">
                                                PNG, JPG, GIF fino a 10MB
                                            </p>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Basic Info */}
                        <div>
                            <label htmlFor="title" className="block text-sm font-medium text-white/80 mb-2">
                                Titolo Evento *
                            </label>
                            <input
                                type="text"
                                id="title"
                                required
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[#FC0045]/50"
                                placeholder="Inserisci il titolo dell'evento"
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="subtitle" className="block text-sm font-medium text-white/80 mb-2">
                                    Sottotitolo
                                </label>
                                <input
                                    type="text"
                                    id="subtitle"
                                    value={formData.subtitle}
                                    onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[#FC0045]/50"
                                    placeholder="Inserisci un sottotitolo"
                                />
                            </div>
                            
                            <div>
                                <label htmlFor="dress_code" className="block text-sm font-medium text-white/80 mb-2">
                                    <span className="inline-flex items-center gap-2">
                                        <FaUserTie />
                                        <span>Dress Code</span>
                                    </span>
                                </label>
                                <input
                                    type="text"
                                    id="dress_code"
                                    value={formData.dress_code || ''}
                                    onChange={(e) => setFormData({ ...formData, dress_code: e.target.value })}
                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[#FC0045]/50"
                                    placeholder="Es: Elegante, Casual, Black Tie"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="age_recommended" className="block text-sm font-medium text-white/80 mb-2">
                                    <span className="inline-flex items-center gap-2">
                                        <FaExclamationTriangle />
                                        <span>Età Consigliata</span>
                                    </span>
                                </label>
                                <input
                                    type="text"
                                    id="age_recommended"
                                    value={formData.age_recommended || ''}
                                    onChange={(e) => setFormData({ ...formData, age_recommended: e.target.value })}
                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[#FC0045]/50"
                                    placeholder="Es: 18+, 21+, Tutti"
                                />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="description" className="block text-sm font-medium text-white/80 mb-2">
                                Descrizione
                            </label>
                            <textarea
                                id="description"
                                value={formData.description_extended || ""}
                                onChange={(e) => {
                                    const value = e.target.value;
                                    if (value.length <= 400) {
                                        setFormData({ ...formData, description_extended: value });
                                    }
                                }}
                                rows={4}
                                maxLength={400}
                                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[#FC0045]/50"
                                placeholder="Descrivi il tuo evento..."
                            />
                            <div className="flex justify-end mt-1">
                                <span 
                                    className={`text-xs ${
                                        (formData.description_extended || "").length > 350 
                                            ? (formData.description_extended || "").length >= 400 
                                                ? "text-red-400" 
                                                : "text-yellow-400"
                                            : "text-white/60"
                                    }`}
                                >
                                    {(formData.description_extended || "").length}/400 caratteri
                                </span>
                            </div>
                        </div>

                        {/* Date and Time */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="datetime_start" className="block text-sm font-medium text-white/80 mb-2">
                                    Data e Ora Inizio *
                                </label>
                                <input
                                    type="datetime-local"
                                    id="datetime_start"
                                    required
                                    value={formData.datetime_start}
                                    onChange={(e) => setFormData({ ...formData, datetime_start: e.target.value })}
                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[#FC0045]/50"
                                />
                            </div>
                            <div>
                                <label htmlFor="datetime_end" className="block text-sm font-medium text-white/80 mb-2">
                                    Data e Ora Fine *
                                </label>
                                <input
                                    type="datetime-local"
                                    id="datetime_end"
                                    required
                                    value={formData.datetime_end}
                                    onChange={(e) => setFormData({ ...formData, datetime_end: e.target.value })}
                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[#FC0045]/50"
                                />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="location_" className="block text-sm font-medium text-white/80 mb-2">
                                Locale *
                            </label>
                            <select
                                id="location_"
                                required
                                value={formData.location_id}
                                onChange={(e) => setFormData({ ...formData, location_id: e.target.value })}
                                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[#FC0045]/50"
                            >
                                <option value="" className="bg-[#212938]">Seleziona un locale</option>
                                {locations.map((location_) => (
                                    <option
                                        key={location_.id}
                                        value={location_.id}
                                        className="bg-[#212938]"
                                    >
                                        {location_.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Music Genres */}
                        <div className="space-y-4">
                            <label className="block text-sm font-medium text-white/80">
                                Generi Musicali
                            </label>

                            {/* Search Bar */}
                            <div className="relative">
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Cerca generi musicali..."
                                    className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[#FC0045]/50"
                                />
                                <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
                            </div>

                            {/* Selected Genres Badges */}
                            {formData.music_genres.length > 0 && (
                                <div className="flex flex-wrap gap-2 mt-2">
                                    {formData.music_genres.map(genreId => {
                                        const genre = allMusicGenres.find(g => g.id === genreId);
                                        if (!genre) return null;
                                        return (
                                            <span
                                                key={genreId}
                                                className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm bg-[#FC0045]/20 text-[#FC0045] border border-[#FC0045]/20"
                                            >
                                                {genre.label}
                                                <button
                                                    type="button"
                                                    onClick={() => handleGenreToggle({ id: genre.id, label: genre.label })}
                                                    className="hover:text-white/80"
                                                >
                                                    <FaTimes size={12} />
                                                </button>
                                            </span>
                                        );
                                    })}
                                </div>
                            )}

                            {/* Search Results */}
                            {searchQuery && (
                                <div className="mt-2 bg-white/5 rounded-lg border border-white/10 max-h-48 overflow-y-auto">
                                    {filteredGenres.length > 0 ? (
                                        filteredGenres.map((genre) => (
                                            <button
                                                key={genre.id}
                                                type="button"
                                                onClick={() => {
                                                    handleGenreToggle({ id: genre.id, label: typeof genre.label === "string" ? genre.label : "" });
                                                    setSearchQuery(''); // Clear search after selection
                                                }}
                                                className={`w-full p-2 text-left hover:bg-white/10 transition-colors ${formData.music_genres.includes(genre.id)
                                                    ? 'text-[#FC0045] bg-[#FC0045]/10'
                                                    : 'text-white/60'
                                                    } ${filteredGenres.length > 1 ? 'border-b border-white/10 last:border-0' : ''}`}
                                            >
                                                {genre.label}
                                            </button>
                                        ))
                                    ) : (
                                        <div className="p-2 text-white/40 text-center">
                                            Nessun genere trovato
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="space-y-4">
                            {/* Privacy Setting */}
                            {/* <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
                                <div>
                                    <h3 className="text-sm font-medium text-white/80">Evento Pubblico</h3>
                                    <p className="text-sm text-white/60">
                                        Gli eventi pubblici saranno visibili a tutti gli utenti
                                    </p>
                                </div>
                                <Switch
                                    checked={formData.is_public}
                                    onChange={(checked) => setFormData({ ...formData, is_public: checked })}
                                    className={`${formData.is_public ? 'bg-[#FC0045]' : 'bg-white/10'
                                        } relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#FC0045]/50`}
                                >
                                    <span className="sr-only">Imposta come pubblico</span>
                                    <span
                                        className={`${formData.is_public ? 'translate-x-6' : 'translate-x-1'
                                            } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
                                    />
                                </Switch>
                            </div> */}

                            {/* Publication Status */}
                            <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
                                <div>
                                    <h3 className="text-sm font-medium text-white/80">Stato Pubblicazione</h3>
                                    <p className="text-sm text-white/60">
                                        {formData.state === "published"
                                            ? "L'evento sarà immediatamente visibile"
                                            : "Salva come bozza per pubblicare più tardi"}
                                    </p>
                                </div>
                                <Switch
                                    checked={formData.state === "published"}
                                    onChange={(checked) =>
                                        setFormData({ ...formData, state: checked ? "published" : "draft" })
                                    }
                                    className={`${formData.state === "published" ? 'bg-[#FC0045]' : 'bg-white/10'
                                        } relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#FC0045]/50`}
                                >
                                    <span className="sr-only">Stato pubblicazione</span>
                                    <span
                                        className={`${formData.state === "published" ? 'translate-x-6' : 'translate-x-1'
                                            } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
                                    />
                                </Switch>
                            </div>
                        </div>
                    </div>

                    {/* Submit Button */}
                    <div className="flex justify-end">
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-6 py-2 bg-[#FC0045] text-white rounded-lg hover:bg-[#FC0045]/90 transition-colors disabled:opacity-50"
                        >
                            {loading ? "Creazione in corso..." : "Crea Evento"}
                        </button>
                    </div>
                </form>
            </div>
        </main>
    );
}
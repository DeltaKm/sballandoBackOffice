'use client';

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuthStore } from "~/store/auth";
import { FaTimes } from "react-icons/fa";
import { Switch } from "@headlessui/react";

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
}

export default function EditEventPage() {
    const router = useRouter();
    const params = useParams();
    const user = useAuthStore((state) => state.user);
    
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
        user_id: typeof user?.id === 'number' ? user.id : 0,
    }));

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [searchQuery, setSearchQuery] = useState('');
    const [allMusicGenres, setAllMusicGenres] = useState<Array<{ id: number; label: string }>>([]);
    const [filteredGenres, setFilteredGenres] = useState<Array<{ id: number; label: string }>>([]);
    const [locations, setlocations] = useState<Array<{ id: number; name: string }>>([]);
    const [showGenres, setShowGenres] = useState(false);

    // Funzione separata per caricare i dati dell'evento
    const fetchEventData = async () => {
        try {
            const res = await fetch(`/api/events/${params.id}`);
            if (!res.ok) throw new Error('Evento non trovato');
            
            const event = await res.json();
            
            // Popola il form con i dati esistenti
            setFormData({
                title: event.title || "",
                subtitle: event.subtitle || "",
                description_extended: event.description_extended || null,
                datetime_start: event.datetime_start ? 
                    new Date(event.datetime_start).toISOString().slice(0, 16) : "",
                datetime_end: event.datetime_end ? 
                    new Date(event.datetime_end).toISOString().slice(0, 16) : "",
                location_id: event.location_id?.toString() || "",
                is_public: Boolean(event.is_public),
                cover: null,
                cover_preview: event.cover ? 
                    `/uploads/events/${event.token}/${event.cover}` : "",
                music_genres: event.event_music_genres?.map((item: any) => item.music_genre.id) || [],
                state: event.state as "draft" | "published" || "published",
                user_id: event.user_id || (typeof user?.id === 'number' ? user.id : 0),
            });
            
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Errore nel caricamento dell\'evento');
        }
    };

    // useEffect per caricare i dati dell'evento separatamente
    useEffect(() => {
        if (!user) {
            router.push('/');
            return;
        }

        fetchEventData();
    }, [user, params.id]);

    // useEffect separato per caricare generi musicali e locations
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
                    headers: { 'Content-Type': 'application/json' },
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

        const loadInitialData = async () => {
            setLoading(true);
            try {
                await Promise.all([
                    fetchMusicGenres(),
                    fetchlocations()
                ]);
            } catch (err) {
                console.error('Error loading initial data:', err);
            } finally {
                setLoading(false);
            }
        };

        if (user) {
            loadInitialData();
        }
    }, [user?.id]);

    // Gestione ricerca generi musicali
    useEffect(() => {
        const filtered = allMusicGenres.filter(genre =>
            genre.label.toLowerCase().includes(searchQuery.toLowerCase().trim())
        );
        setFilteredGenres(filtered);
    }, [searchQuery, allMusicGenres]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError("");

        try {
            const formDataToSend = new FormData();
            Object.entries(formData).forEach(([key, value]) => {
                if (key === 'music_genres') {
                    formDataToSend.append(key, JSON.stringify(value));
                } else if (value !== null) {
                    formDataToSend.append(key, value.toString());
                }
            });

            const res = await fetch(`/api/events/${params.id}/edit`, {
                method: 'POST',
                body: formDataToSend,
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Errore durante la modifica dell\'evento');

            router.push(`/event/${params.id}`);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Errore durante la modifica dell\'evento');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-black p-8 flex items-center justify-center">
                <div className="text-white">Caricamento...</div>
            </div>
        );
    }

    if (!user) {
        return null;
    }

    return (
        <div className="min-h-screen bg-[#212938] p-8">
            <div className="max-w-2xl mx-auto">
                <div className="bg-white/5 border border-white/10 rounded-xl p-8">
                    <h1 className="text-2xl font-bold text-white mb-8">Modifica evento</h1>
                    
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {error && (
                            <div className="bg-red-500/10 border border-red-500 text-red-500 p-4 rounded-lg">
                                {error}
                            </div>
                        )}

                        {/* Titolo */}
                        <div>
                            <label className="block text-sm font-medium text-white/80 mb-2">
                                Titolo *
                            </label>
                            <input
                                type="text"
                                required
                                value={formData.title}
                                onChange={(e) => setFormData({...formData, title: e.target.value})}
                                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white"
                            />
                        </div>

                        {/* Sottotitolo */}
                        <div>
                            <label className="block text-sm font-medium text-white/80 mb-2">
                                Sottotitolo *
                            </label>
                            <input
                                type="text"
                                required
                                value={formData.subtitle}
                                onChange={(e) => setFormData({...formData, subtitle: e.target.value})}
                                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white"
                            />
                        </div>

                        {/* Descrizione estesa */}
                        <div>
                            <label className="block text-sm font-medium text-white/80 mb-2">
                                Descrizione
                            </label>
                            <textarea
                                value={formData.description_extended || ''}
                                onChange={(e) => setFormData({...formData, description_extended: e.target.value})}
                                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white h-32"
                            />
                        </div>

                        {/* Date */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-white/80 mb-2">
                                    Data inizio *
                                </label>
                                <input
                                    type="datetime-local"
                                    required
                                    value={formData.datetime_start}
                                    onChange={(e) => setFormData({...formData, datetime_start: e.target.value})}
                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-white/80 mb-2">
                                    Data fine *
                                </label>
                                <input
                                    type="datetime-local"
                                    required
                                    value={formData.datetime_end}
                                    onChange={(e) => setFormData({...formData, datetime_end: e.target.value})}
                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white"
                                />
                            </div>
                        </div>

                        {/* location_ */}
                        <div>
                            <label className="block text-sm font-medium text-white/80 mb-2">
                                location_ *
                            </label>
                            <select
                                required
                                value={formData.location_id}
                                onChange={(e) => setFormData({...formData, location_id: e.target.value})}
                                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white"
                            >
                                <option value="">Seleziona una location_</option>
                                {locations.map((location_) => (
                                    <option key={location_.id} value={location_.id}>
                                        {location_.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Generi Musicali */}
                        <div>
                            <label className="block text-sm font-medium text-white/80 mb-2">
                                Generi musicali *
                            </label>
                            <div className="space-y-4">
                                {/* Searchbar */}
                                <div className="relative">
                                    <input
                                        type="text"
                                        placeholder="Cerca generi..."
                                        value={searchQuery}
                                        onChange={(e) => {
                                            setSearchQuery(e.target.value);
                                            setShowGenres(e.target.value.length > 0);
                                        }}
                                        onFocus={() => setShowGenres(searchQuery.length > 0)}
                                        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white"
                                    />
                                    
                                    {/* Lista generi filtrati */}
                                    {showGenres && filteredGenres.length > 0 && (
                                        <div className="absolute z-50 left-0 right-0 mt-2 max-h-60 overflow-y-auto bg-[#212938] border border-white/10 rounded-lg shadow-xl">
                                            {filteredGenres.map((genre) => (
                                                <div
                                                    key={genre.id}
                                                    onClick={() => {
                                                        setFormData(prev => ({
                                                            ...prev,
                                                            music_genres: prev.music_genres.includes(genre.id)
                                                                ? prev.music_genres.filter(id => id !== genre.id)
                                                                : [...prev.music_genres, genre.id]
                                                        }));
                                                        setSearchQuery('');
                                                        setShowGenres(false);
                                                    }}
                                                    className="px-4 py-2 hover:bg-white/5 cursor-pointer text-white"
                                                >
                                                    {genre.label}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Badge generi selezionati */}
                                <div className="flex flex-wrap gap-2">
                                    {formData.music_genres.map((genreId) => {
                                        const genre = allMusicGenres.find(g => g.id === genreId);
                                        if (!genre) return null;
                                        return (
                                            <span
                                                key={genreId}
                                                className="group inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm bg-[#FC0045]/20 text-[#FC0045]"
                                            >
                                                {genre.label}
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setFormData(prev => ({
                                                            ...prev,
                                                            music_genres: prev.music_genres.filter(id => id !== genreId)
                                                        }));
                                                    }}
                                                    className="hover:text-white/80"
                                                >
                                                    <FaTimes size={12} />
                                                </button>
                                            </span>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        {/* Stato e Visibilità */}
                        <div className="grid grid-cols-1 gap-4">
                            <div className="bg-white/5 p-4 rounded-lg border border-white/10">
                                <label className="block text-sm font-medium text-white/80 mb-4">
                                    Stato pubblicazione
                                </label>
                                <div className="flex items-center justify-between">
                                    <span className="text-white">
                                        {formData.state === "published" ? "Pubblicato" : "Bozza"}
                                    </span>
                                    <Switch
                                        checked={formData.state === "published"}
                                        onChange={(checked) => 
                                            setFormData({
                                                ...formData,
                                                state: checked ? "published" : "draft"
                                            })
                                        }
                                        className={`${
                                            formData.state === "published" ? 'bg-[#FC0045]' : 'bg-white/10'
                                        } relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none`}
                                    >
                                        <span
                                            className={`${
                                                formData.state === "published" ? 'translate-x-6' : 'translate-x-1'
                                            } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
                                        />
                                    </Switch>
                                </div>
                            </div>

                            <div className="bg-white/5 p-4 rounded-lg border border-white/10">
                                <label className="block text-sm font-medium text-white/80 mb-4">
                                    Visibilità evento
                                </label>
                                <div className="flex items-center justify-between">
                                    <span className="text-white">
                                        {formData.is_public ? "Pubblico" : "Privato"}
                                    </span>
                                    <Switch
                                        checked={formData.is_public}
                                        onChange={(checked) => 
                                            setFormData({...formData, is_public: checked})
                                        }
                                        className={`${
                                            formData.is_public ? 'bg-[#FC0045]' : 'bg-white/10'
                                        } relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none`}
                                    >
                                        <span
                                            className={`${
                                                formData.is_public ? 'translate-x-6' : 'translate-x-1'
                                            } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
                                        />
                                    </Switch>
                                </div>
                            </div>
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={saving}
                            className="w-full bg-[#FC0045] text-white py-3 rounded-lg hover:bg-[#FC0045]/80 transition-colors disabled:opacity-50"
                        >
                            {saving ? "Salvataggio in corso..." : "Salva modifiche"}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
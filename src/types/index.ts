export interface User {
  id: number;
  name: string | null;
  surname: string | null;
  email: string;
  picture?: string | null;
  nickname?: string | null;
  fairplay: number;
  followers_count: number;
  following_count: number;
  bio?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Location {
  id: number;
  name: string;
  address: string;
  city?: string;
  description?: string;
  phone?: string;
  email: string;
  cover?: string | null;
  token?: string;
  enable?: number;
  capacity?: number;
  events_count?: number;
  user_id: number;
  created_at: string;
  updated_at: string;
}

export interface MusicGenre {
  id: number;
  label: string;
  default: boolean | null;
}

export interface EventMusicGenre {
  id: number;
  event_id: number;
  music_genre_id: number;
  created_at: string;
  updated_at: string;
  music_genre: MusicGenre;
}

export interface Product {
  id: number;
  user_id: number;
  label: string;
  price: number;
  description?: string;
  transfer_qnt?: number | null;
  stock?: number | null;
  created_qnt?: number | null;
}

export interface EntryType {
  id: number;
  user_id: number;
  label: string;
  price: number;
  description?: string;
  stock?: number | null;
  created_qnt?: number | null;
  transfer_qnt?: number | null;
  event_id: number;
  created_at: string;
  updated_at: string;
}

export interface Collaborator {
  id: number;
  label: string;
  user_id: number | null;
  role?: string;
  user?: User | null;
}

export interface Event {
  id: number;
  user_id: number;
  title: string | null;
  subtitle?: string;
  datetime_start: string | null;
  datetime_end: string | null;
  location_id?: number;
  is_public?: boolean;
  created_at: string;
  updated_at: string | null;
  
  // Usa le interfacce già definite invece di ridefinirle inline
  products: Product[];
  entry_types: EntryType[];
  collaborators: Collaborator[];
  event_music_genres: EventMusicGenre[];
  music_genres: MusicGenre[];
  location?: Location;
  
  description_extended?: string;
  state?: "draft" | "published";
  subscribers?: number;
  cover: string | null;
  token: string;
}

// Tipi per i form
export interface EventFormData {
  title: string;
  subtitle: string;
  description_extended: string | null;
  datetime_start: string;
  datetime_end: string;
  location_id: string;
  is_public: boolean;
  cover: File | null;
  cover_preview: string;
  music_genres: number[];
  state: "draft" | "published";
  user_id: number;
}



// Tipi per le API response
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface LocationFormData {
  name: string;
  description: string;
  address: string;
  city: string;
  logo: File | null;
  regione: string;
  provincia: string;
  comune: string;
  cap: string;
  logo_preview: string;
  phone: string;
  coordinates: string | null;
  email: string;
  user_id: number;
}
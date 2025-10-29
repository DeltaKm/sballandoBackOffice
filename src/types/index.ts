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
  fcm_token?: string | null;
  role: string;
  token: string;
  created_at: string;
  updated_at: string;
}

export interface location_ {
  events: any;
  id: number;
  name: string;
  address: string;
  comune?: string; // Changed from city to comune
  provincia?: string; // Added provincia field
  regione?: string; // Added regione field
  cap?: string; // Added cap field
  coordinates?: string; // Added coordinates field
  description?: string;
  phone?: string;
  email: string;
  logo?: string | null; // Changed from cover to logo
  link_instagram?: string | null; // Social media link
  link_facebook?: string | null; // Social media link
  link_tiktok?: string | null; // Social media link
  token?: string; // Added token field
  stripe_account?: {
    active: boolean;
    id: string;
  };
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
  music_genre?: MusicGenre; // Vecchio nome per retrocompatibilità
  music_genres?: MusicGenre; // Nuovo nome corretto dalla relazione Prisma
}

export interface Product {
  burned: number;
  category: string;
  id: number;
  paid: string;
  event_id: number;
  old_user_id?: number | null;
  user_id: number;
  label: string;
  price: number;
  description?: string;
  transfer_qnt?: number | null;
  stock?: number | null;
  created_qnt?: number | null;
}

export interface EntryType {
  products: never[];
  gender_min_quantity: number;
  gender_min_type: string;
  gender_min_enabled: boolean;
  fairplay_min: any;
  seats: number;
  type: "free" | "invite";
  burned: number;
  category: string;
  id: number;
  user_id: number;
  label: string;
  old_user_id?: number | null;
  paid: string;

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
  guest_enabled: boolean;
  vidimate_enabled_product: boolean;
  vidimate_enabled_entry: boolean;
  id: number;
  label: string;
  user_id: number | null;
  role?: string;
  user?: User | null;         // Vecchio nome per retrocompatibilità
  users?: User | null;        // Nuovo nome dalla relazione Prisma
}

export interface Event {
  spotify_token_expires_at: any;
  spotify_access_token: any;
  id: number;
  user_id: number;
  title: string | null;
  qr_enter?: string | null;
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
  location_?: location_;
  locations?: location_; // Alias per compatibilità con il nome della relazione Prisma
  
  description_extended?: string;
  state?: "draft" | "published";
  subscribers?: number;
  cover: string | null;
  token: string;
  dress_code?: string | null;
  age_recommended?: string | null;
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

export interface locationFormData {
  name: string;
  description: string;
  address: string;
  // Remove city, using comune instead
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
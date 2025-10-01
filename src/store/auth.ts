import { create } from "zustand";

interface User {
  id: number;
  email: string;
  name: string;
  surname: string;
  role: string;
  is_super_admin: boolean;
  token: string;
}

interface AuthStore {
  user: User | null;
  isInitialized: boolean;
  setUser: (user: User | null) => void;
  logout: () => void;
  checkAuth: () => Promise<void>;
  initialize: () => void;
}

// Funzioni helper per localStorage
function saveUserToStorage(user: User) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('user_data', JSON.stringify(user));
  }
}

function removeUserFromStorage() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('user_data');
  }
}

export const useAuthStore = create<AuthStore>()((set, get) => ({
  user: null,
  isInitialized: false,
  
  setUser: (user) => {
    set({ user });
    if (user) {
      saveUserToStorage(user);
    } else {
      removeUserFromStorage();
    }
  },
  
  logout: () => {
    // Rimuovi il cookie
    if (typeof document !== 'undefined') {
      document.cookie = "user_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    }
    // Rimuovi dal localStorage
    removeUserFromStorage();
    set({ user: null });
  },

  initialize: () => {
    if (typeof window !== 'undefined') {
      // Carica l'utente dal localStorage
      const userData = localStorage.getItem('user_data');
      if (userData) {
        try {
          const user = JSON.parse(userData);
          set({ user, isInitialized: true });
        } catch (error) {
          console.error('Errore nel parsing dei dati utente:', error);
          localStorage.removeItem('user_data');
          set({ user: null, isInitialized: true });
        }
      } else {
        set({ user: null, isInitialized: true });
      }
    }
  },
  
  checkAuth: async () => {
    try {
      // Controlla se c'è un token nei cookies
      const token = document.cookie
        .split('; ')
        .find(row => row.startsWith('user_token='))
        ?.split('=')[1];
        
      if (!token) {
        set({ user: null });
        return;
      }

      // Verifica il token con il server
      const res = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_token: token }),
      });

      if (res.ok) {
        const userData = (await res.json()) as { user: User };
        set({ user: userData.user });
      } else {
        // Token non valido, rimuovi tutto
        get().logout();
      }
    } catch (error) {
      console.error('Errore durante la verifica auth:', error);
      get().logout();
    }
  },
}));
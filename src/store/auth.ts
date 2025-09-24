import { create } from "zustand";

interface User {
  id: number;
  email: string;
  name: string;
  surname: string;
  role: string;
  is_super_admin: boolean;
  token: string; // Assicurati che questo campo ci sia
}

interface AuthStore {
  user: User | null;
  setUser: (user: User | null) => void;
  logout: () => void;
  checkAuth: () => Promise<void>;
}

// Funzioni helper per localStorage
function saveUserToStorage(user: any) {
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
        const userData = await res.json();
        set({ user: userData });
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
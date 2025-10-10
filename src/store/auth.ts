import { create } from "zustand";
import type { User } from "~/types";

interface AuthStore {
  user: User | null;
  accessToken: string | null;
  isInitialized: boolean;
  setUser: (user: User | null, accessToken?: string | null) => void;
  logout: () => void;
  refreshToken: () => Promise<boolean>;
  initialize: () => void;
}

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
  accessToken: null,
  isInitialized: false,
  
  setUser: (user, accessToken = null) => {
    set({ user, accessToken });
    if (user) {
      saveUserToStorage(user);
    } else {
      removeUserFromStorage();
    }
  },
  
  logout: async () => {
    if (typeof document !== 'undefined') {
      document.cookie = "access_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
      document.cookie = "refresh_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    }
    removeUserFromStorage();
    set({ user: null, accessToken: null });
  },

  refreshToken: async () => {
    try {
      const res = await fetch('/api/auth/refresh', {
        method: 'POST',
        credentials: 'include',
      });

      if (res.ok) {
        const data = await res.json();
        set({ accessToken: data.accessToken });
        return true;
      } else {
        await get().logout();
        return false;
      }
    } catch (error) {
      console.error('Errore durante il refresh del token:', error);
      await get().logout();
      return false;
    }
  },

  initialize: () => {
    if (typeof window !== 'undefined') {
      const userData = localStorage.getItem('user_data');
      if (userData) {
        try {
          const user = JSON.parse(userData);
          set({ user, isInitialized: true });
          
          get().refreshToken();
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
}));
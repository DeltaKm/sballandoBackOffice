'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '~/store/auth';

export function useAuthRedirect() {
  const user = useAuthStore(state => state.user);
  const isInitialized = useAuthStore(state => state.isInitialized);
  const initialize = useAuthStore(state => state.initialize);
  const router = useRouter();

  useEffect(() => {
    // Inizializza l'auth store al primo mount
    if (!isInitialized) {
      initialize();
    }
  }, [isInitialized, initialize]);

  useEffect(() => {
    // Solo dopo l'inizializzazione, controlla se l'utente è autenticato
    if (isInitialized && !user) {
      router.push('/');
    }
  }, [isInitialized, user, router]);

  return {
    user,
    isInitialized,
    isAuthenticated: isInitialized && !!user,
    isLoading: !isInitialized
  };
}

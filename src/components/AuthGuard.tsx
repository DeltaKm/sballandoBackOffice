"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "~/store/auth";
import { useRouter } from "next/navigation";

interface AuthGuardProps {
  children: React.ReactNode;
}

// Funzione helper per salvare l'utente nel localStorage
function saveUserToStorage(user: any) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('user_data', JSON.stringify(user));
  }
}

// Funzione helper per caricare l'utente dal localStorage
function loadUserFromStorage() {
  if (typeof window !== 'undefined') {
    const userData = localStorage.getItem('user_data');
    return userData ? JSON.parse(userData) : null;
  }
  return null;
}

// Funzione helper per rimuovere l'utente dal localStorage
function removeUserFromStorage() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('user_data');
  }
}

export function AuthGuard({ children }: AuthGuardProps) {
  const [checking, setChecking] = useState(true);
  const [mounted, setMounted] = useState(false);
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const router = useRouter();

  // Assicurati che il componente sia montato
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const checkAuthentication = async () => {
      try {
        // Carica l'utente dal localStorage
        const savedUser = loadUserFromStorage();
        
        if (savedUser) {
          // Se c'è un utente salvato, mettilo nello store
          setUser(savedUser);
          setChecking(false);
          return;
        }

        // Se non c'è utente salvato, reindirizza al login
        setChecking(false);
        router.push('/');
        
      } catch (error) {
        console.error('Errore durante il caricamento auth:', error);
        removeUserFromStorage();
        setUser(null);
        setChecking(false);
        router.push('/');
      }
    };

    checkAuthentication();
  }, [mounted, setUser, router]);

  if (!mounted) {
    return null;
  }

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FC0045]">
        <div className="text-white text-lg">Caricamento...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
}

// Esporta le funzioni helper per usarle in altri componenti
export { saveUserToStorage, loadUserFromStorage, removeUserFromStorage };
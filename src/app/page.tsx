"use client";

import { useState, useEffect } from "react";
import { useAuthStore } from "~/store/auth";
import { useRouter } from "next/navigation";

// Funzione helper per caricare l'utente dal localStorage
function loadUserFromStorage() {
  if (typeof window !== 'undefined') {
    const userData = localStorage.getItem('user_data');
    return userData ? JSON.parse(userData) : null;
  }
  return null;
}

export default function HomePage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [shouldRedirect, setShouldRedirect] = useState(false);
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const router = useRouter();

  // Controlla se c'è già un utente salvato
  useEffect(() => {
    const savedUser = loadUserFromStorage();
    if (savedUser) {
      setUser(savedUser);
      setShouldRedirect(true);
    }
    setChecking(false);
  }, [setUser]);

  // Gestisci il redirect in un useEffect separato
  useEffect(() => {
    if (shouldRedirect || (user && !checking)) {
      router.push('/dashboard');
    }
  }, [shouldRedirect, user, checking, router]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Errore durante il login");
      } else {
        // Salva l'utente nello store (che automaticamente salva anche nel localStorage)
        setUser(data);
        setShouldRedirect(true);
      }
    } catch (err) {
      setError("Errore di rete");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Mostra loading durante il controllo auth
  if (checking) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-[#FC0045]">
        <div className="text-white text-lg">Verificando autenticazione...</div>
      </main>
    );
  }

  // Non mostrare il form se l'utente è già loggato o sta per essere reindirizzato
  if (user || shouldRedirect) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-[#FC0045]">
        <div className="text-white text-lg">Reindirizzamento...</div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#FC0045]">
      <div className="w-full max-w-md space-y-8 p-8 rounded-lg bg-white/10 backdrop-blur-sm">
        <div>
          <h1 className="text-4xl font-bold text-center text-white mb-2">
            Sballando
          </h1>
          <h2 className="text-xl text-center text-white/80">Backoffice</h2>
        </div>

        <form className="space-y-6" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-white">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full px-3 py-2 bg-white/5 border border-white/10 rounded-md text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/50"
              placeholder="admin@sballando.it"
            />
          </div>

          {error && <p className="text-white/90 text-sm text-center">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-[#FC0045] bg-white hover:bg-white/90 focus:outline-none focus:ring-2 focus:ring-white/50"
          >
            {loading ? "Caricamento..." : "Accedi"}
          </button>
        </form>
      </div>
    </main>
  );
}
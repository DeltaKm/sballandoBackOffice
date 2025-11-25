"use client";

import { useState, useEffect } from "react";
import { useAuthStore } from "~/store/auth";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

function loadUserFromStorage() {
  if (typeof window !== 'undefined') {
    const userData = localStorage.getItem('user_data');
    return userData ? JSON.parse(userData) : null;
  }
  return null;
}

export default function HomePage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [shouldRedirect, setShouldRedirect] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [sendingReset, setSendingReset] = useState(false);
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const router = useRouter();

  useEffect(() => {
    const savedUser = loadUserFromStorage();
    if (savedUser) {
      setUser(savedUser);
      setShouldRedirect(true);
    }
    setChecking(false);
  }, [setUser]);

  useEffect(() => {
    if (shouldRedirect ?? (user && !checking)) {
      router.push('/event');
    }
  }, [shouldRedirect, user, checking, router]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
        credentials: 'include', 
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.message ?? "Errore durante il login");
      } else {
        toast.success("Login effettuato con successo!");
        setUser(data.user, data.accessToken);
        setShouldRedirect(true);
      }
    } catch (err) {
      toast.error("Errore di connessione al server");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSendingReset(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: resetEmail }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Errore durante l'invio dell'email");
      } else {
        toast.success("Email di recupero inviata! Controlla la tua casella di posta.");
        setShowForgotPassword(false);
        setResetEmail("");
      }
    } catch (err) {
      toast.error("Errore di connessione al server");
      console.error(err);
    } finally {
      setSendingReset(false);
    }
  };

  if (checking) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-[#212939]">
        <div className="text-white text-lg">Verificando autenticazione...</div>
      </main>
    );
  }

  if (user ?? shouldRedirect) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-[#212939]">
        <div className="text-white text-lg">Reindirizzamento...</div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#212939]">
      <div className="w-full max-w-md space-y-8 p-8 rounded-lg bg-[#FC0045] shadow-2xl">
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
              className="mt-1 block w-full px-3 py-2 bg-[#212939] border border-[#212939] rounded-md text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/30"
              placeholder="admin@sballando.it"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-white">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full px-3 py-2 bg-[#212939] border border-[#212939] rounded-md text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/30"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-[#FC0045] bg-white hover:bg-white/90 focus:outline-none focus:ring-2 focus:ring-white/50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Caricamento..." : "Accedi"}
          </button>

          <div className="text-center">
            <button
              type="button"
              onClick={() => setShowForgotPassword(true)}
              className="text-white/80 hover:text-white text-sm underline"
            >
              Password dimenticata?
            </button>
          </div>
        </form>
      </div>

      {/* Modal Password Dimenticata */}
      {showForgotPassword && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-[#FC0045] rounded-lg p-8 max-w-md w-full shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-white">
                🔑 Recupera Password
              </h2>
              <button
                onClick={() => {
                  setShowForgotPassword(false);
                  setResetEmail("");
                }}
                className="text-white/80 hover:text-white text-2xl"
              >
                ✕
              </button>
            </div>

            <p className="text-white/80 text-sm mb-6">
              Inserisci la tua email e ti invieremo un link per reimpostare la password.
            </p>

            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div>
                <label htmlFor="resetEmail" className="block text-sm font-medium text-white mb-2">
                  Email
                </label>
                <input
                  id="resetEmail"
                  type="email"
                  required
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  className="block w-full px-3 py-2 bg-[#212939] border border-[#212939] rounded-md text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/30"
                  placeholder="admin@sballando.it"
                />
              </div>

              <button
                type="submit"
                disabled={sendingReset}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-[#FC0045] bg-white hover:bg-white/90 focus:outline-none focus:ring-2 focus:ring-white/50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {sendingReset ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-[#FC0045]/30 border-t-[#FC0045] rounded-full animate-spin"></div>
                    Invio in corso...
                  </div>
                ) : (
                  "Invia Link di Recupero"
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
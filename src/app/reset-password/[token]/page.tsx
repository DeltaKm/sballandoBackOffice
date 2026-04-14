"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import toast from "react-hot-toast";
import { FaLock, FaEye, FaEyeSlash } from "react-icons/fa";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
  const params = useParams();
  const token = params.token as string;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    console.log("[Client] Form submit iniziato");
    console.log("[Client] Token:", token);
    console.log("[Client] Password length:", password.length);

    // Validazione
    if (password !== confirmPassword) {
      console.log("[Client] Password non corrispondono");
      toast.error("Le password non corrispondono");
      return;
    }

    if (password.length < 8) {
      console.log("[Client] Password troppo corta");
      toast.error("La password deve essere di almeno 8 caratteri");
      return;
    }

    setLoading(true);

    try {
      console.log("[Client] Invio richiesta POST a /api/auth/reset-password");
      
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token, password }),
      });

      console.log("[Client] Response status:", res.status);
      console.log("[Client] Response headers:", Object.fromEntries(res.headers.entries()));

      // Verifica se la risposta ha contenuto
      const contentType = res.headers.get("content-type");
      console.log("[Client] Content-Type:", contentType);
      
      if (!contentType || !contentType.includes("application/json")) {
        const text = await res.text();
        console.error("[Client] Non-JSON response:", text);
        toast.error("Errore nel server. Riprova più tardi.");
        return;
      }

      const data = await res.json();
      console.log("[Client] Response data:", data);

      if (!res.ok) {
        console.error("[Client] Request failed:", data.error);
        toast.error(data.error || "Errore durante il reset della password");
      } else {
        console.log("[Client] Password reset successful!");
        toast.success("Password reimpostata con successo!");
        setTimeout(() => {
          router.push("/");
        }, 2000);
      }
    } catch (err) {
      console.error("[Client] Fetch error:", err);
      toast.error("Errore di connessione al server");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#212939] px-4">
      <div className="w-full max-w-md space-y-8 p-8 rounded-lg bg-[#FC0045] shadow-2xl">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white mb-2 inline-flex items-center gap-2">
            <FaLock />
            <span>Reimposta Password</span>
          </h1>
          <p className="text-white/80 text-sm">
            Inserisci la tua nuova password
          </p>
        </div>

        <form className="space-y-6" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-white mb-2">
              Nuova Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full px-3 py-2 bg-[#212939] border border-[#212939] rounded-md text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/30"
                placeholder="Almeno 8 caratteri"
                minLength={8}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 hover:text-white"
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-white mb-2">
              Conferma Password
            </label>
            <input
              id="confirmPassword"
              type={showPassword ? "text" : "password"}
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="mt-1 block w-full px-3 py-2 bg-[#212939] border border-[#212939] rounded-md text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/30"
              placeholder="Conferma la password"
              minLength={8}
            />
          </div>

          {/* Indicatore forza password */}
          {password && (
            <div className="space-y-2">
              <div className="text-xs text-white/80">Forza password:</div>
              <div className="flex gap-1">
                <div
                  className={`h-1 flex-1 rounded ${
                    password.length >= 8 ? "bg-green-400" : "bg-white/20"
                  }`}
                />
                <div
                  className={`h-1 flex-1 rounded ${
                    password.length >= 10 && /[A-Z]/.test(password)
                      ? "bg-green-400"
                      : "bg-white/20"
                  }`}
                />
                <div
                  className={`h-1 flex-1 rounded ${
                    password.length >= 12 &&
                    /[A-Z]/.test(password) &&
                    /[0-9]/.test(password)
                      ? "bg-green-400"
                      : "bg-white/20"
                  }`}
                />
              </div>
              <div className="text-xs text-white/60">
                {password.length < 8 && "Minimo 8 caratteri"}
                {password.length >= 8 && password.length < 10 && "Password accettabile"}
                {password.length >= 10 &&
                  /[A-Z]/.test(password) &&
                  "Password buona"}
                {password.length >= 12 &&
                  /[A-Z]/.test(password) &&
                  /[0-9]/.test(password) &&
                  "Password forte"}
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || password !== confirmPassword}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-[#FC0045] bg-white hover:bg-white/90 focus:outline-none focus:ring-2 focus:ring-white/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-[#FC0045]/30 border-t-[#FC0045] rounded-full animate-spin"></div>
                Reimpostazione...
              </div>
            ) : (
              "Reimposta Password"
            )}
          </button>

          <div className="text-center">
            <button
              type="button"
              onClick={() => router.push("/")}
              className="text-white/80 hover:text-white text-sm underline"
            >
              Torna al login
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}

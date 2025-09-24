"use client";

import { useAuthStore } from "~/store/auth";
import { useRouter } from "next/navigation";
import { Sidebar } from "~/components/Sidebar";

export default function DashboardPage() {
  const user = useAuthStore((state) => state.user);
  const router = useRouter();

  // Redirect if not logged in
  if (!user) {
    router.push("/");
    return null;
  }

  return (
    <main className="min-h-screen bg-[#212938] flex">
      <Sidebar />
      
      {/* Main Content */}
      <div className="flex-1 ml-64">
        <div className="p-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 bg-white/5 rounded-xl border border-white/10">
              <h3 className="text-lg font-medium text-white/80">Eventi Totali</h3>
              <p className="text-3xl font-bold text-white mt-2">0</p>
            </div>
            <div className="p-6 bg-white/5 rounded-xl border border-white/10">
              <h3 className="text-lg font-medium text-white/80">Locali Attivi</h3>
              <p className="text-3xl font-bold text-white mt-2">0</p>
            </div>
            <div className="p-6 bg-white/5 rounded-xl border border-white/10">
              <h3 className="text-lg font-medium text-white/80">Utenti Registrati</h3>
              <p className="text-3xl font-bold text-white mt-2">0</p>
            </div>
          </div>

          {/* Quick Actions Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            <div className="p-6 bg-white/5 rounded-xl border border-white/10">
              <h3 className="text-lg font-medium text-white/80">Azioni Rapide</h3>
              <div className="mt-4 space-y-2">
                <button className="w-full p-3 bg-[#FC0045] text-white rounded-lg hover:bg-[#FC0045]/90 transition-colors">
                  Crea Nuovo Evento
                </button>
                <button className="w-full p-3 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors">
                  Aggiungi Locale
                </button>
              </div>
            </div>
            
            <div className="p-6 bg-white/5 rounded-xl border border-white/10">
              <h3 className="text-lg font-medium text-white/80">Eventi Recenti</h3>
              <div className="mt-4 text-white/60">
                Nessun evento recente
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
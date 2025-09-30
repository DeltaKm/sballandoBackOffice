"use client";

interface Collaborator {
  id: string;
  name: string;
  userId: string;
}

interface CollaboratorFilterProps {
  collaborators: Collaborator[];
  selectedCollaborator: string;
  onCollaboratorChange: (collaboratorId: string) => void;
  generalStats: {
    totalRevenue: number;
    productRevenue: number;
    entryRevenue: number;
    productsSold: number;
    entriesSold: number;
  };
}

export function CollaboratorFilter({
  collaborators,
  selectedCollaborator,
  onCollaboratorChange,
  generalStats
}: CollaboratorFilterProps) {
  const formatPrice = (price: number) => price.toFixed(2);

  return (
    <div className="bg-white/10 border border-white/20 rounded-xl p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-semibold">Filtra per Collaboratore</h3>
        <select
          value={selectedCollaborator}
          onChange={(e) => onCollaboratorChange(e.target.value)}
          className="bg-white/10 border border-white/30 text-white rounded-lg px-4 py-2 focus:outline-none focus:border-blue-400"
        >
          {collaborators.map(collab => (
            <option key={collab.id} value={collab.id} className="bg-gray-800">
              {collab.name}
            </option>
          ))}
        </select>
      </div>

      {/* Stats del collaboratore selezionato */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-green-500/20 rounded-lg p-3 text-center border border-green-500/30">
          <div className="text-green-300 font-bold text-xl">€{formatPrice(generalStats.totalRevenue)}</div>
          <div className="text-green-400/80 text-xs">Ricavi Totali</div>
        </div>
        <div className="bg-orange-500/20 rounded-lg p-3 text-center border border-orange-500/30">
          <div className="text-orange-300 font-bold text-xl">€{formatPrice(generalStats.productRevenue)}</div>
          <div className="text-orange-400/80 text-xs">Ricavi Prodotti</div>
        </div>
        <div className="bg-cyan-500/20 rounded-lg p-3 text-center border border-cyan-500/30">
          <div className="text-cyan-300 font-bold text-xl">€{formatPrice(generalStats.entryRevenue)}</div>
          <div className="text-cyan-400/80 text-xs">Ricavi Ingressi</div>
        </div>
        <div className="bg-purple-500/20 rounded-lg p-3 text-center border border-purple-500/30">
          <div className="text-purple-300 font-bold text-xl">{generalStats.productsSold}</div>
          <div className="text-purple-400/80 text-xs">Prodotti Venduti</div>
        </div>
        <div className="bg-pink-500/20 rounded-lg p-3 text-center border border-pink-500/30">
          <div className="text-pink-300 font-bold text-xl">{generalStats.entriesSold}</div>
          <div className="text-pink-400/80 text-xs">Ingressi Venduti</div>
        </div>
      </div>
    </div>
  );
}
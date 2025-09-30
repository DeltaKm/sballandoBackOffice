"use client";

interface StatisticsHeaderProps {
  eventName?: string;
}

export function StatisticsHeader({ eventName }: StatisticsHeaderProps) {
  return (
    <div className="flex items-center gap-4 mb-8">
      <div className="w-16 h-16 bg-blue-500/30 rounded-2xl flex items-center justify-center">
        <span className="text-blue-400 text-3xl">📊</span>
      </div>
      <div className="flex-1">
        <h2 className="text-blue-300 font-bold text-3xl">Statistiche Evento</h2>
        <p className="text-blue-400/80 text-lg mt-2">
          {eventName ? `Dashboard vendite e performance - ${eventName}` : 'Dashboard vendite e performance'}
        </p>
      </div>
    </div>
  );
}
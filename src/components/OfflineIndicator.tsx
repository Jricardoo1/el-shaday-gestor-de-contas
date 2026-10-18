import React from 'react';
import { WifiOff, Wifi } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) {
    return null;
  }

  return (
    <div className="fixed top-2 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-full bg-amber-600/95 text-white px-4 py-1.5 text-xs font-semibold shadow-lg backdrop-blur-xs animate-bounce border border-amber-400">
      <WifiOff className="w-3.5 h-3.5" />
      <span>Modo Offline — Todos os dados continuam salvos no seu aparelho</span>
    </div>
  );
};

export const NetworkStatusBadge: React.FC = () => {
  const isOnline = useOnlineStatus();

  return (
    <div
      title={isOnline ? 'Conexão com a internet ativa' : 'Modo Offline: dados salvos localmente'}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition ${
        isOnline
          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
          : 'bg-amber-100 text-amber-800 border border-amber-300'
      }`}
    >
      {isOnline ? (
        <>
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <Wifi className="w-3 h-3" />
          <span className="hidden sm:inline">Online</span>
        </>
      ) : (
        <>
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
          <WifiOff className="w-3 h-3 text-amber-600" />
          <span>Offline</span>
        </>
      )}
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { Database, Cloud, RefreshCw, CheckCircle2 } from 'lucide-react';
import { FirebaseService, SyncStatus } from '../services/firebase';

interface CloudDatabaseBadgeProps {
  onClick: () => void;
}

export const CloudDatabaseBadge: React.FC<CloudDatabaseBadgeProps> = ({ onClick }) => {
  const [status, setStatus] = useState<SyncStatus>(FirebaseService.getStatus());

  useEffect(() => {
    const unsub = FirebaseService.onStatusChange((s) => setStatus(s));
    return unsub;
  }, []);

  const isOnline = status === 'online';
  const isSyncing = status === 'syncing';

  return (
    <button
      type="button"
      onClick={onClick}
      title="Banco de dados gratuito Google Firestore conectado. Clique para ver detalhes e sincronizar."
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition cursor-pointer active:scale-95 border ${
        isOnline
          ? 'bg-emerald-900/60 hover:bg-emerald-900 text-emerald-100 border-emerald-400/40 shadow-xs'
          : isSyncing || status === 'connecting'
          ? 'bg-teal-900/60 hover:bg-teal-900 text-teal-100 border-teal-400/40'
          : 'bg-amber-900/60 hover:bg-amber-900 text-amber-100 border-amber-400/40'
      }`}
    >
      <span
        className={`w-2 h-2 rounded-full ${
          isOnline
            ? 'bg-emerald-400 animate-pulse'
            : isSyncing || status === 'connecting'
            ? 'bg-teal-300 animate-ping'
            : 'bg-amber-400'
        }`}
      />
      <Database className="w-3 h-3 text-emerald-300" />
      <span className="hidden sm:inline">
        {isOnline
          ? 'Banco Nuvem Ativo'
          : isSyncing
          ? 'Sincronizando...'
          : status === 'connecting'
          ? 'Conectando Nuvem...'
          : 'Nuvem Offline'}
      </span>
      <span className="sm:hidden">
        {isOnline ? 'Nuvem' : isSyncing ? 'Sinc...' : 'Nuvem'}
      </span>
    </button>
  );
};

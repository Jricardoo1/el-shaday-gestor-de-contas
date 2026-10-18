import React, { useState, useEffect } from 'react';
import {
  X,
  Database,
  Cloud,
  CheckCircle2,
  RefreshCw,
  ShieldCheck,
  Server,
  Zap,
  ArrowUp,
  ArrowDown,
  HardDrive,
  Globe,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { StorageService } from '../services/storage';
import { FirebaseService, SyncStatus } from '../services/firebase';
import { AuthService } from '../services/auth';
import { User } from 'lucide-react';

interface CloudDatabaseModalProps {
  onClose: () => void;
  onDataReload: () => void;
}

export const CloudDatabaseModal: React.FC<CloudDatabaseModalProps> = ({
  onClose,
  onDataReload,
}) => {
  const [status, setStatus] = useState<SyncStatus>(FirebaseService.getStatus());
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);
  const [verticalPosition, setVerticalPosition] = useState<'top' | 'center' | 'bottom'>('center');
  const [lastSync, setLastSync] = useState<Date | null>(FirebaseService.getLastSyncedAt());
  const currentUser = AuthService.getCurrentUser();

  useEffect(() => {
    // Proactively test connection when opening modal
    FirebaseService.testConnection().then((isOnline) => {
      if (isOnline) setStatus('online');
    });

    const unsub = FirebaseService.onStatusChange((s) => {
      setStatus(s);
      setLastSync(FirebaseService.getLastSyncedAt());
    });
    return unsub;
  }, []);

  const handleManualSync = async () => {
    try {
      setIsSyncing(true);
      setSyncFeedback(null);
      const res = await StorageService.syncWithCloud();
      setSyncFeedback(
        `Sincronização concluída com sucesso! ${res.syncedCount} registros atualizados no banco de dados.`
      );
      setLastSync(new Date());
      onDataReload();
      setTimeout(() => setSyncFeedback(null), 6000);
    } catch (err) {
      console.error(err);
      setSyncFeedback('Erro ao sincronizar. Verifique sua conexão com a internet.');
    } finally {
      setIsSyncing(false);
    }
  };

  const customersCount = StorageService.getCustomers().length;
  const entriesCount = StorageService.getFiadoEntries().length;
  const paymentsCount = StorageService.getPayments().length;
  const totalRecords = customersCount + entriesCount + paymentsCount;

  const positionClass =
    verticalPosition === 'top'
      ? 'items-start pt-3 sm:pt-6'
      : verticalPosition === 'bottom'
      ? 'items-end pb-3 sm:pb-6'
      : 'items-center';

  return (
    <div
      className={`fixed inset-0 z-50 flex justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto transition-all duration-300 ${positionClass}`}
    >
      <div className="w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 px-5 sm:px-6 py-4 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-600/80 border border-teal-400/40 flex items-center justify-center text-teal-100 shadow-inner">
              <Database className="w-5 h-5 text-teal-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight">
                  Banco de Dados na Nuvem
                </h2>
                <span className="text-[10px] bg-emerald-400 text-slate-950 font-black px-2 py-0.5 rounded-full uppercase">
                  Gratuito
                </span>
              </div>
              <p className="text-xs text-teal-200/90 mt-0.5">
                Google Cloud Firestore com persistência e sincronização em tempo real
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Opções de Subir ou Descer a Janela para organização do layout */}
            <div className="hidden sm:flex items-center bg-black/25 rounded-xl p-0.5 border border-white/10 text-xs">
              <button
                type="button"
                onClick={() => setVerticalPosition('top')}
                title="Subir Janela para o Topo"
                className={`p-1.5 rounded-lg transition ${
                  verticalPosition === 'top'
                    ? 'bg-white/20 text-white font-bold'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                <ArrowUp className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setVerticalPosition('center')}
                title="Centralizar Janela"
                className={`px-1.5 py-0.5 text-[10px] rounded-lg transition ${
                  verticalPosition === 'center'
                    ? 'bg-white/20 text-white font-bold'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                Centro
              </button>
              <button
                type="button"
                onClick={() => setVerticalPosition('bottom')}
                title="Descer Janela para a Base"
                className={`p-1.5 rounded-lg transition ${
                  verticalPosition === 'bottom'
                    ? 'bg-white/20 text-white font-bold'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                <ArrowDown className="w-3.5 h-3.5" />
              </button>
            </div>

            <button
              onClick={onClose}
              className="text-white/80 hover:text-white p-1.5 rounded-xl hover:bg-white/10 transition"
              title="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1">
          {/* Status Banner */}
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black shrink-0 shadow-xs">
                {status === 'online' ? (
                  <CheckCircle2 className="w-5 h-5 text-white" />
                ) : (
                  <WifiOff className="w-5 h-5 text-amber-200" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Status da Conexão
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-black ${
                      status === 'online'
                        ? 'bg-emerald-100 text-emerald-800'
                        : status === 'syncing'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${
                        status === 'online'
                          ? 'bg-emerald-600 animate-pulse'
                          : status === 'syncing'
                          ? 'bg-blue-600 animate-spin'
                          : 'bg-amber-600'
                      }`}
                    />
                    {status === 'online'
                      ? 'Nuvem Conectada e Ativa'
                      : status === 'syncing'
                      ? 'Sincronizando Dados...'
                      : 'Modo Offline (Cache Local)'}
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-0.5 font-medium">
                  {status === 'online'
                    ? 'Todas as alterações são salvas automaticamente no banco na nuvem e no dispositivo.'
                    : 'Suas alterações continuam salvas no aparelho e sincronizarão assim que a internet voltar.'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleManualSync}
              disabled={isSyncing}
              className="px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 text-white font-bold text-xs shadow-xs transition flex items-center justify-center gap-2 shrink-0 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Sincronizando...' : 'Sincronizar Agora'}</span>
            </button>
          </div>

          {/* Sync Feedback Alert */}
          {syncFeedback && (
            <div className="p-3 bg-emerald-100/80 border border-emerald-300 rounded-2xl text-emerald-950 text-xs font-bold flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>{syncFeedback}</span>
            </div>
          )}

          {/* Cloud Specs Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
              <div className="flex items-center gap-2 text-slate-500 text-xs font-bold mb-1">
                <Cloud className="w-4 h-4 text-teal-600" />
                <span>Provedor de Nuvem</span>
              </div>
              <div className="text-sm font-black text-slate-900">Google Firestore</div>
              <span className="text-[10px] text-emerald-700 font-bold block mt-0.5">
                Plano Gratuito Spark Permanente
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
              <div className="flex items-center gap-2 text-slate-500 text-xs font-bold mb-1">
                <HardDrive className="w-4 h-4 text-emerald-600" />
                <span>Registros Sincronizados</span>
              </div>
              <div className="text-sm font-black text-slate-900">
                {totalRecords} itens
              </div>
              <span className="text-[10px] text-slate-500 block mt-0.5">
                {customersCount} clientes, {entriesCount} fiados, {paymentsCount} pagamentos
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
              <div className="flex items-center gap-2 text-slate-500 text-xs font-bold mb-1">
                <Zap className="w-4 h-4 text-amber-600" />
                <span>Última Sincronização</span>
              </div>
              <div className="text-sm font-black text-slate-900">
                {lastSync ? lastSync.toLocaleTimeString('pt-BR') : 'Ao inicializar'}
              </div>
              <span className="text-[10px] text-slate-500 block mt-0.5">
                {lastSync ? lastSync.toLocaleDateString('pt-BR') : 'Hoje'}
              </span>
            </div>
          </div>

          {/* Destaque das Vantagens do Banco de Dados Gratuito */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-700" />
              <span>Vantagens do Banco de Dados Gratuito Ativo</span>
            </h3>

            <ul className="space-y-2 text-xs text-slate-600">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Custo Zero Permanente:</strong> O Firestore oferece 50.000 leituras/dia, 20.000 gravações/dia e 1 GB de armazenamento grátis para sempre (sem necessidade de cartão de crédito).
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Multi-Dispositivo:</strong> Seus dados de fiado e clientes ficam protegidos na nuvem da Google, podendo ser acessados de outros aparelhos celulares ou computadores.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Resiliência 100% Offline:</strong> Se a internet do comércio cair, o app continua salvando localmente e sincroniza tudo com o banco de dados assim que a conexão retornar.
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 sm:px-6 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-500 space-y-0.5 text-center sm:text-left">
            <div>
              Usuário: <strong className="text-slate-800">{currentUser ? currentUser.name : 'Loja Padrão'}</strong>
              {currentUser && <span className="text-[11px] text-slate-400"> ({currentUser.email})</span>}
            </div>
            <div className="text-[11px]">
              Partição Nuvem: <code className="bg-slate-200/80 px-1.5 py-0.5 rounded font-mono text-emerald-800">/stores/{currentUser ? currentUser.id : FirebaseService.getStoreId()}</code>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs transition cursor-pointer"
          >
            Entendido / Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import {
  X,
  User,
  Store,
  Mail,
  Phone,
  MapPin,
  Calendar,
  LogOut,
  UserPlus,
  RefreshCw,
  ArrowUp,
  ArrowDown,
  ShieldCheck,
  CheckCircle2,
  Users,
} from 'lucide-react';
import { UserAccount } from '../types';
import { AuthService } from '../services/auth';
import { StorageService } from '../services/storage';

interface UserAccountModalProps {
  user: UserAccount | null;
  onClose: () => void;
  onOpenLogin: () => void;
  onOpenRegister: () => void;
  onLogout: () => void;
  onDataReload: () => void;
}

export const UserAccountModal: React.FC<UserAccountModalProps> = ({
  user,
  onClose,
  onOpenLogin,
  onOpenRegister,
  onLogout,
  onDataReload,
}) => {
  const [verticalPosition, setVerticalPosition] = useState<'top' | 'center' | 'bottom'>('center');
  const [isSyncing, setIsSyncing] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  if (!user) return null;

  const customersCount = StorageService.getCustomers().length;
  const entriesCount = StorageService.getFiadoEntries().length;
  const paymentsCount = StorageService.getPayments().length;

  const handleSyncMyData = async () => {
    setIsSyncing(true);
    setFeedback(null);
    try {
      const res = await StorageService.syncWithCloud();
      setFeedback(`Seus dados foram sincronizados na nuvem (${res.syncedCount} itens salvos na sua conta)!`);
      onDataReload();
      setTimeout(() => setFeedback(null), 5000);
    } catch (e) {
      setFeedback('Erro ao sincronizar. Seus dados continuam salvos no aparelho.');
    } finally {
      setIsSyncing(false);
    }
  };

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
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 px-6 py-4 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-emerald-300 shadow-inner">
              <User className="w-5 h-5 text-emerald-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black tracking-tight">Perfil do Usuário</h2>
                <span className="text-[10px] bg-emerald-400 text-slate-950 font-black px-2 py-0.5 rounded-full uppercase">
                  Conectado
                </span>
              </div>
              <p className="text-xs text-emerald-200/90 mt-0.5">Conta e ambiente individual</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Opções de Subir ou Descer a Janela */}
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
        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          {/* User ID card */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-700 text-white font-black flex items-center justify-center text-lg shadow-sm">
                {user.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-base font-black text-slate-900 truncate">{user.name}</h3>
                <span className="text-xs text-emerald-800 font-bold block truncate">
                  {user.storeName}
                </span>
                <span className="text-[11px] text-slate-500 block truncate">{user.email}</span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-200/80 grid grid-cols-3 gap-2 text-center">
              <div className="bg-white p-2 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-500 font-bold block">Clientes</span>
                <span className="text-sm font-black text-slate-900">{customersCount}</span>
              </div>
              <div className="bg-white p-2 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-500 font-bold block">Fiados</span>
                <span className="text-sm font-black text-slate-900">{entriesCount}</span>
              </div>
              <div className="bg-white p-2 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-500 font-bold block">Pagamentos</span>
                <span className="text-sm font-black text-slate-900">{paymentsCount}</span>
              </div>
            </div>
          </div>

          {/* Individual Data Privacy Info */}
          <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-2xl flex items-start gap-2.5 text-xs text-emerald-950">
            <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
            <div>
              <span className="font-black block">Ambiente 100% Individual e Seguro</span>
              <span className="text-[11px] text-emerald-800">
                Seus clientes, vendas a prazo e pagamentos estão isolados no ID desta conta. Ao trocar de usuário, o sistema carrega exclusivamente os dados do novo login.
              </span>
            </div>
          </div>

          {/* Feedback */}
          {feedback && (
            <div className="p-3 rounded-2xl bg-emerald-100 border border-emerald-300 text-emerald-950 text-xs font-bold flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>{feedback}</span>
            </div>
          )}

          {/* Sincronizar meus dados */}
          <button
            type="button"
            onClick={handleSyncMyData}
            disabled={isSyncing}
            className="w-full py-2.5 px-3 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs shadow-sm transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Sincronizando meus dados...' : 'Sincronizar Meus Dados na Nuvem'}</span>
          </button>

          {/* Ações de alternância de conta */}
          <div className="pt-3 border-t border-slate-200 space-y-2">
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenLogin();
              }}
              className="w-full py-2.5 px-3 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-800 font-bold text-xs transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <Users className="w-4 h-4 text-slate-600" />
              <span>Trocar de Conta / Novo Login</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenRegister();
              }}
              className="w-full py-2.5 px-3 rounded-xl border border-emerald-300 bg-emerald-50/70 hover:bg-emerald-100 text-emerald-900 font-bold text-xs transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <UserPlus className="w-4 h-4 text-emerald-700" />
              <span>Cadastrar Outro Usuário / Loja</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onLogout();
                onClose();
              }}
              className="w-full py-2.5 px-3 rounded-xl border border-rose-200 bg-rose-50/60 hover:bg-rose-100 text-rose-800 font-bold text-xs transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <LogOut className="w-4 h-4 text-rose-600" />
              <span>Sair da Minha Conta (Logout)</span>
            </button>
          </div>

          <div className="text-center pt-1">
            <span className="text-[11px] text-slate-400">
              ID da Conta: <code className="font-mono text-slate-600">{user.id}</code>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

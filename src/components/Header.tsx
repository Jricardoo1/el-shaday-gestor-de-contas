import React from 'react';
import {
  BookOpen,
  Plus,
  DollarSign,
  Settings,
  ShieldCheck,
  PauseCircle,
  AlertCircle,
  Smartphone,
  Wallet,
  Send,
  User,
} from 'lucide-react';
import { StoreSettings, LicenseState, UserAccount } from '../types';
import { NetworkStatusBadge } from './OfflineIndicator';
import { PWAInstallButton } from './PWAInstallButton';
import { CloudDatabaseBadge } from './CloudDatabaseBadge';

interface HeaderProps {
  settings: StoreSettings;
  license: LicenseState;
  user?: UserAccount | null;
  onOpenNewFiado: () => void;
  onOpenNewPayment: () => void;
  onOpenPrepaidCredit: () => void;
  onOpenSettings: () => void;
  onOpenLicense: () => void;
  onOpenAdmin: () => void;
  onOpenBroadcast?: () => void;
  onOpenCloudDatabase?: () => void;
  onOpenUserAccount?: () => void;
  onOpenLogin?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  settings,
  license,
  user,
  onOpenNewFiado,
  onOpenNewPayment,
  onOpenPrepaidCredit,
  onOpenSettings,
  onOpenLicense,
  onOpenAdmin,
  onOpenBroadcast,
  onOpenCloudDatabase,
  onOpenUserAccount,
  onOpenLogin,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-emerald-800 text-white shadow-md border-b border-emerald-900">
      {/* License Paused Global Warning Banner if paused */}
      {license.status === 'paused' && (
        <div className="bg-amber-500 text-amber-950 px-4 py-1.5 text-xs font-bold text-center flex items-center justify-center gap-2">
          <PauseCircle className="w-4 h-4 shrink-0" />
          <span>
            Licença Pausada — Seus fiados e clientes continuam salvos com segurança.
          </span>
          <button
            onClick={onOpenLicense}
            className="underline hover:text-white font-extrabold ml-1 cursor-pointer"
          >
            Reativar
          </button>
        </div>
      )}

      {license.status === 'expired' && (
        <div className="bg-rose-600 text-white px-4 py-1.5 text-xs font-bold text-center flex items-center justify-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 animate-pulse" />
          <span>Sua licença mensal venceu. Libere +30 dias via PIX (R$ 9,90).</span>
          <button
            onClick={onOpenLicense}
            className="underline font-extrabold ml-1 cursor-pointer bg-white text-rose-700 px-2 py-0.5 rounded-sm"
          >
            Pagar PIX
          </button>
        </div>
      )}

      <div className="max-w-6xl mx-auto px-3 sm:px-4 py-2 sm:py-2.5 flex items-center justify-between gap-2 sm:gap-3">
        {/* Left: Store identity & book logo */}
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-emerald-700/90 border border-emerald-500/50 flex items-center justify-center text-white shadow-xs shrink-0">
            <BookOpen className="w-5 h-5 text-emerald-200" />
          </div>
          <div className="min-w-0">
            <h1 className="text-sm sm:text-base md:text-lg font-black tracking-tight text-white truncate leading-tight">
              {settings.storeName || 'Controle de Fiado'}
            </h1>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <p className="text-[11px] sm:text-xs text-emerald-200/90 font-medium truncate hidden xs:block">
                Conta Cliente & Fiados
              </p>
              {onOpenCloudDatabase && (
                <CloudDatabaseBadge onClick={onOpenCloudDatabase} />
              )}
            </div>
          </div>
        </div>

        {/* Right action group */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Quick PWA install button */}
          <PWAInstallButton compact />

          {/* 1. WhatsApp Broadcast button */}
          {onOpenBroadcast && (
            <button
              type="button"
              onClick={onOpenBroadcast}
              title="Disparar mensagem ou cardápio diário no WhatsApp"
              className="h-10 px-3 inline-flex items-center justify-center gap-2 bg-emerald-700/80 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold transition shadow-2xs border border-emerald-600/60 active:scale-95 cursor-pointer"
            >
              <Send className="w-4.5 h-4.5 shrink-0 text-emerald-200" />
              <span className="hidden lg:inline whitespace-nowrap">WhatsApp</span>
            </button>
          )}

          {/* 2. Crédito Antecipado (Ícone ampliado a pedido do usuário) */}
          <button
            type="button"
            onClick={onOpenPrepaidCredit}
            title="Lançar Crédito Antecipado / Marmitas Pré-Pagas"
            className="h-10 px-3 sm:px-3.5 inline-flex items-center justify-center gap-2 bg-blue-700/85 hover:bg-blue-600 text-white rounded-xl text-xs sm:text-sm font-bold transition shadow-xs border border-blue-400/50 active:scale-95 cursor-pointer"
          >
            <Wallet className="w-5 h-5 shrink-0 text-blue-200" />
            <span className="whitespace-nowrap">Crédito</span>
          </button>

          {/* 3. Receber Pagamento */}
          <button
            type="button"
            onClick={onOpenNewPayment}
            title="Receber Pagamento / Abater saldo devedor"
            className="h-10 px-3 sm:px-3.5 inline-flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs sm:text-sm font-bold transition shadow-2xs hover:shadow-xs border border-teal-400/50 active:scale-95 cursor-pointer"
          >
            <DollarSign className="w-5 h-5 shrink-0 text-teal-200" />
            <span className="whitespace-nowrap">Receber</span>
          </button>

          {/* 4. Lançar a Prazo (Destaque Principal) */}
          <button
            type="button"
            onClick={onOpenNewFiado}
            title="Lançar Consumo a Prazo / Novo Fiado"
            className="h-10 px-3.5 sm:px-4 inline-flex items-center justify-center gap-2 bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-xl text-xs sm:text-sm font-black transition shadow-xs hover:shadow-sm border border-amber-300 active:scale-95 cursor-pointer"
          >
            <Plus className="w-5 h-5 stroke-[3] shrink-0 text-slate-950" />
            <span className="whitespace-nowrap">+ Lançar</span>
          </button>

          {/* Divisória sutil */}
          <div className="hidden sm:block h-7 w-px bg-emerald-700/80 my-auto" />

          {/* Usuário / Conta Logada (Ampliado para visualização clara de quem está logado) */}
          {user ? (
            <button
              type="button"
              onClick={onOpenUserAccount}
              title={`Usuário logado: ${user.name} (${user.storeName}) • Clique para ver dados, trocar de conta ou sair`}
              className={`h-10 px-2.5 sm:px-3.5 inline-flex items-center gap-2 rounded-xl border-2 transition shrink-0 active:scale-95 cursor-pointer shadow-xs ${
                user.id === 'usr_demo_principal'
                  ? 'bg-amber-950/60 hover:bg-amber-950/80 text-amber-100 border-amber-400/70'
                  : 'bg-emerald-950/85 hover:bg-emerald-950 text-white border-emerald-400/80'
              }`}
            >
              <div className="relative">
                <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-emerald-400 text-emerald-950 font-black text-xs flex items-center justify-center shrink-0 shadow-inner">
                  {user.name.slice(0, 1).toUpperCase()}
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-300 ring-1 ring-emerald-950" />
              </div>
              <div className="flex flex-col text-left leading-tight min-w-0">
                <span className="text-[9px] uppercase font-bold text-emerald-300 tracking-wider">
                  {user.id === 'usr_demo_principal' ? 'Modo Demo' : 'Logado:'}
                </span>
                <span className="text-xs sm:text-sm font-black text-white truncate max-w-[100px] sm:max-w-[160px]">
                  {user.name}
                </span>
              </div>
            </button>
          ) : (
            onOpenLogin && (
              <button
                type="button"
                onClick={onOpenLogin}
                title="Entrar com Minha Conta ou Cadastrar Novo Usuário"
                className="h-10 px-3 sm:px-4 inline-flex items-center gap-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs sm:text-sm transition shadow-sm active:scale-95 shrink-0 cursor-pointer"
              >
                <User className="w-4 h-4 text-slate-950" />
                <span>Entrar / Cadastrar</span>
              </button>
            )
          )}

          {/* Master Admin / SaaS Owner button */}
          <button
            type="button"
            onClick={onOpenAdmin}
            title="Painel Master do Dono / Acompanhamento Geral"
            className="h-9 w-9 hidden md:inline-flex items-center justify-center rounded-xl bg-slate-900/60 hover:bg-slate-950 text-amber-300 border border-amber-500/30 transition active:scale-95 cursor-pointer shrink-0"
          >
            <ShieldCheck className="w-4 h-4 text-amber-400" />
          </button>

          {/* Configurações */}
          <button
            type="button"
            onClick={onOpenSettings}
            title="Configurações da Loja, Cardápio e Backup"
            className="h-9 w-9 inline-flex items-center justify-center rounded-xl text-emerald-200 hover:text-white hover:bg-emerald-700/80 transition active:scale-95 shrink-0 cursor-pointer"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};

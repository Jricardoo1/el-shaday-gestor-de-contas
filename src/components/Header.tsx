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
} from 'lucide-react';
import { StoreSettings, LicenseState } from '../types';
import { NetworkStatusBadge } from './OfflineIndicator';
import { PWAInstallButton } from './PWAInstallButton';
import { CloudDatabaseBadge } from './CloudDatabaseBadge';

interface HeaderProps {
  settings: StoreSettings;
  license: LicenseState;
  onOpenNewFiado: () => void;
  onOpenNewPayment: () => void;
  onOpenPrepaidCredit: () => void;
  onOpenSettings: () => void;
  onOpenLicense: () => void;
  onOpenAdmin: () => void;
  onOpenBroadcast?: () => void;
  onOpenCloudDatabase?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  settings,
  license,
  onOpenNewFiado,
  onOpenNewPayment,
  onOpenPrepaidCredit,
  onOpenSettings,
  onOpenLicense,
  onOpenAdmin,
  onOpenBroadcast,
  onOpenCloudDatabase,
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

      <div className="max-w-6xl mx-auto px-3 sm:px-4 py-2 sm:py-2.5 flex items-center justify-between gap-1.5 sm:gap-2">
        {/* Left: Store identity & book logo (Target selector) */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-emerald-700 border border-emerald-600/80 flex items-center justify-center text-white shadow-xs shrink-0">
            <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-200" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <h1 className="text-sm sm:text-base md:text-lg font-black tracking-tight truncate leading-tight">
                {settings.storeName || 'Controle de Fiado'}
              </h1>
              <span className="hidden md:inline-flex items-center gap-1.5">
                <NetworkStatusBadge />
                {onOpenCloudDatabase && <CloudDatabaseBadge onClick={onOpenCloudDatabase} />}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <p className="text-[10px] sm:text-xs text-emerald-200 truncate font-medium">
                Conta Cliente & Gestão de Fiados
              </p>
              <span className="md:hidden">
                {onOpenCloudDatabase && <CloudDatabaseBadge onClick={onOpenCloudDatabase} />}
              </span>
            </div>
          </div>
        </div>

        {/* Right action group */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          {/* Quick PWA install button */}
          <PWAInstallButton compact />

          {/* 1. WhatsApp Broadcast button */}
          {onOpenBroadcast && (
            <button
              onClick={onOpenBroadcast}
              title="Disparar mensagem / cardápio diário no WhatsApp"
              className="h-9 sm:h-9.5 px-2.5 sm:px-3 inline-flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition shadow-xs hover:shadow-sm border border-emerald-500/40 active:scale-95 shrink-0"
            >
              <Send className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline whitespace-nowrap">Disparar WhatsApp</span>
              <span className="sm:hidden">WhatsApp</span>
            </button>
          )}

          {/* 2. Receber Pagamento */}
          <button
            onClick={onOpenNewPayment}
            title="Receber Pagamento / Abater saldo"
            className="h-9 sm:h-9.5 px-2.5 sm:px-3 inline-flex items-center justify-center gap-1.5 bg-teal-700 hover:bg-teal-600 text-white rounded-xl text-xs font-bold transition shadow-xs hover:shadow-sm border border-teal-500/40 active:scale-95 shrink-0"
          >
            <DollarSign className="w-3.5 h-3.5 text-teal-200 shrink-0" />
            <span className="whitespace-nowrap">Receber</span>
          </button>

          {/* 3. Crédito Antecipado */}
          <button
            onClick={onOpenPrepaidCredit}
            title="Inserir Crédito Antecipado (Marmitas Pré-Pagas)"
            className="h-9 sm:h-9.5 px-2.5 sm:px-3 inline-flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition shadow-xs hover:shadow-sm border border-blue-400/40 active:scale-95 shrink-0"
          >
            <Wallet className="w-3.5 h-3.5 text-blue-100 shrink-0" />
            <span className="hidden sm:inline whitespace-nowrap">Crédito Antecipado</span>
            <span className="sm:hidden">Crédito</span>
          </button>

          {/* 4. Lançar a Prazo */}
          <button
            onClick={onOpenNewFiado}
            title="Lançar Consumo a Prazo"
            className="h-9 sm:h-9.5 px-2.5 sm:px-3 inline-flex items-center justify-center gap-1.5 bg-emerald-400 hover:bg-emerald-300 text-emerald-950 rounded-xl text-xs font-black transition shadow-xs hover:shadow-sm border border-emerald-300/80 active:scale-95 shrink-0"
          >
            <Plus className="w-3.5 h-3.5 stroke-[3] shrink-0" />
            <span className="hidden sm:inline whitespace-nowrap">Lançar a Prazo</span>
            <span className="sm:hidden">Lançar</span>
          </button>

          {/* Master Admin / SaaS Owner button */}
          <button
            onClick={onOpenAdmin}
            title="Painel Master do Dono (Acompanhar Lojas e Chaves)"
            className="h-9 sm:h-9.5 hidden lg:inline-flex items-center justify-center gap-1.5 bg-slate-900/85 hover:bg-slate-950 text-amber-300 hover:text-amber-200 text-xs font-bold px-2.5 rounded-xl border border-amber-500/30 transition shadow-xs active:scale-95 shrink-0"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>Master</span>
          </button>

          <button
            onClick={onOpenSettings}
            title="Configurações e Backup"
            className="h-9 sm:h-9.5 w-9 sm:w-9.5 inline-flex items-center justify-center rounded-xl text-emerald-200 hover:text-white hover:bg-emerald-700/80 transition active:scale-95 shrink-0"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};

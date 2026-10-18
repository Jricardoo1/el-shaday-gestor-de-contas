import React from 'react';
import { Home, Users, ShoppingBag, DollarSign, BarChart3, ShieldCheck, AlertCircle, PauseCircle } from 'lucide-react';
import { LicenseState } from '../types';

export type NavTab = 'inicio' | 'clientes' | 'fiados' | 'pagamentos' | 'relatorio' | 'licenca';

interface NavigationProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  pendingCount: number;
  overdueCount: number;
  license?: LicenseState;
}

export const Navigation: React.FC<NavigationProps> = ({
  currentTab,
  onSelectTab,
  pendingCount,
  overdueCount,
  license,
}) => {
  const daysRemaining = license?.nextBillingDate
    ? Math.max(
        0,
        Math.ceil(
          (new Date(license.nextBillingDate).getTime() - new Date().getTime()) /
            (1000 * 60 * 60 * 24)
        )
      )
    : 27;
  return (
    <>
      {/* Desktop & Tablet Top Navigation Bar */}
      <nav className="hidden sm:block bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 flex space-x-1">
          <button
            onClick={() => onSelectTab('inicio')}
            className={`py-3.5 px-4 text-xs font-bold transition border-b-2 flex items-center gap-2 ${
              currentTab === 'inicio'
                ? 'border-emerald-600 text-emerald-800 bg-emerald-50/50'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Home className="w-4 h-4 text-emerald-700" />
            <span>Início</span>
          </button>

          <button
            onClick={() => onSelectTab('clientes')}
            className={`py-3.5 px-4 text-xs font-bold transition border-b-2 flex items-center gap-2 ${
              currentTab === 'clientes'
                ? 'border-emerald-600 text-emerald-800 bg-emerald-50/50'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-4 h-4 text-emerald-700" />
            <span>Clientes & Saldos</span>
          </button>

          <button
            onClick={() => onSelectTab('fiados')}
            className={`py-3.5 px-4 text-xs font-bold transition border-b-2 flex items-center gap-2 relative ${
              currentTab === 'fiados'
                ? 'border-emerald-600 text-emerald-800 bg-emerald-50/50'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShoppingBag className="w-4 h-4 text-emerald-700" />
            <span>Contas a Prazo</span>
            {overdueCount > 0 && (
              <span className="bg-rose-500 text-white text-[10px] font-extrabold px-1.5 py-0.2 rounded-full">
                {overdueCount} vencidos
              </span>
            )}
          </button>

          <button
            onClick={() => onSelectTab('pagamentos')}
            className={`py-3.5 px-4 text-xs font-bold transition border-b-2 flex items-center gap-2 ${
              currentTab === 'pagamentos'
                ? 'border-emerald-600 text-emerald-800 bg-emerald-50/50'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <DollarSign className="w-4 h-4 text-emerald-700" />
            <span>Histórico de Pagamentos</span>
          </button>

          <button
            onClick={() => onSelectTab('relatorio')}
            className={`py-3.5 px-4 text-xs font-bold transition border-b-2 flex items-center gap-2 ${
              currentTab === 'relatorio'
                ? 'border-emerald-600 text-emerald-800 bg-emerald-50/50'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <BarChart3 className="w-4 h-4 text-emerald-700" />
            <span>Resumo do Balcão</span>
          </button>

          <button
            onClick={() => onSelectTab('licenca')}
            title={`Licença do Sistema: ${daysRemaining} dias restantes até a renovação`}
            className={`py-3.5 px-4 text-xs font-bold transition border-b-2 flex items-center gap-2 ml-auto ${
              currentTab === 'licenca'
                ? 'border-emerald-600 text-emerald-800 bg-emerald-50/50'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-emerald-700" />
            <span>Licença: {daysRemaining} dias restantes</span>
            <span className="text-[10px] bg-emerald-100 text-emerald-800 font-extrabold px-1.5 py-0.2 rounded-full">
              Ativa
            </span>
          </button>
        </div>
      </nav>

      {/* Mobile Bottom Navigation Bar (App Experience) */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200/90 shadow-lg px-1 py-1 flex items-center justify-around">
        <button
          onClick={() => onSelectTab('inicio')}
          className={`flex flex-col items-center justify-center py-1 px-1 rounded-xl transition ${
            currentTab === 'inicio'
              ? 'text-emerald-700 font-extrabold'
              : 'text-slate-500 font-medium'
          }`}
        >
          <Home className={`w-5 h-5 ${currentTab === 'inicio' ? 'scale-110' : ''}`} />
          <span className="text-[10px] mt-0.5">Início</span>
        </button>

        <button
          onClick={() => onSelectTab('clientes')}
          className={`flex flex-col items-center justify-center py-1 px-1 rounded-xl transition ${
            currentTab === 'clientes'
              ? 'text-emerald-700 font-extrabold'
              : 'text-slate-500 font-medium'
          }`}
        >
          <Users className={`w-5 h-5 ${currentTab === 'clientes' ? 'scale-110' : ''}`} />
          <span className="text-[10px] mt-0.5">Clientes</span>
        </button>

        <button
          onClick={() => onSelectTab('fiados')}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition relative ${
            currentTab === 'fiados'
              ? 'text-emerald-700 font-extrabold'
              : 'text-slate-500 font-medium'
          }`}
        >
          <div className="relative">
            <ShoppingBag className={`w-5 h-5 ${currentTab === 'fiados' ? 'scale-110' : ''}`} />
            {overdueCount > 0 && (
              <span className="absolute -top-1 -right-2 bg-rose-500 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center">
                {overdueCount}
              </span>
            )}
          </div>
          <span className="text-[10px] mt-0.5">A Prazo</span>
        </button>

        <button
          onClick={() => onSelectTab('pagamentos')}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition ${
            currentTab === 'pagamentos'
              ? 'text-emerald-700 font-extrabold'
              : 'text-slate-500 font-medium'
          }`}
        >
          <DollarSign className={`w-5 h-5 ${currentTab === 'pagamentos' ? 'scale-110' : ''}`} />
          <span className="text-[10px] mt-0.5">Pagamentos</span>
        </button>

        <button
          onClick={() => onSelectTab('relatorio')}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition ${
            currentTab === 'relatorio'
              ? 'text-emerald-700 font-extrabold'
              : 'text-slate-500 font-medium'
          }`}
        >
          <BarChart3 className={`w-5 h-5 ${currentTab === 'relatorio' ? 'scale-110' : ''}`} />
          <span className="text-[10px] mt-0.5">Resumo</span>
        </button>

        <button
          onClick={() => onSelectTab('licenca')}
          className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition ${
            currentTab === 'licenca'
              ? 'text-emerald-700 font-extrabold'
              : 'text-slate-500 font-medium'
          }`}
        >
          <ShieldCheck className={`w-5 h-5 ${currentTab === 'licenca' ? 'scale-110' : ''}`} />
          <span className="text-[10px] mt-0.5 font-bold">{daysRemaining}d resta</span>
        </button>
      </nav>
    </>
  );
};

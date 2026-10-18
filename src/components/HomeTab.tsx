import React from 'react';
import {
  DollarSign,
  AlertTriangle,
  Clock,
  TrendingUp,
  Plus,
  Wallet,
  UserPlus,
  Send,
  BarChart3,
  Calendar,
  CheckCircle2,
  Users,
  ChevronRight,
  ShoppingBag,
  Sparkles,
  ArrowUpRight,
  ShieldAlert,
  BellRing,
  MessageSquare,
} from 'lucide-react';
import { Customer, FiadoEntry, PaymentRecord, StoreSettings } from '../types';
import { StorageService, getRelativeDateString } from '../services/storage';
import { NavTab } from './Navigation';

interface HomeTabProps {
  customers: Customer[];
  entries: FiadoEntry[];
  payments: PaymentRecord[];
  settings: StoreSettings;
  onNewFiado: () => void;
  onNewPayment: () => void;
  onNewPrepaidCredit: () => void;
  onNewCustomer: () => void;
  onOpenBroadcast: () => void;
  onSelectCustomer: (customer: Customer) => void;
  onSelectTab: (tab: NavTab) => void;
  onOpenWhatsApp: (customer: Customer, entry?: FiadoEntry) => void;
  onOpenCollectionSuggestions?: (customer?: Customer) => void;
}

export const HomeTab: React.FC<HomeTabProps> = ({
  customers,
  entries,
  payments,
  settings,
  onNewFiado,
  onNewPayment,
  onNewPrepaidCredit,
  onNewCustomer,
  onOpenBroadcast,
  onSelectCustomer,
  onSelectTab,
  onOpenWhatsApp,
  onOpenCollectionSuggestions,
}) => {
  const todayStr = getRelativeDateString(0);
  const tomorrowStr = getRelativeDateString(1);

  // Financial calculations
  let totalFiadoEmAberto = 0;
  let totalVencido = 0;
  let totalVencendoHoje = 0;
  let countVencidos = 0;
  let countVencendoHoje = 0;

  // Verificação de Vencimentos Proativos: Hoje e Amanhã
  const entriesDueToday: FiadoEntry[] = [];
  const entriesDueTomorrow: FiadoEntry[] = [];
  let totalDueToday = 0;
  let totalDueTomorrow = 0;

  entries.forEach((e) => {
    const remaining = Math.max(0, e.amount - (e.paidAmount || 0));
    if (remaining > 0) {
      totalFiadoEmAberto += remaining;
      if (e.status === 'overdue') {
        totalVencido += remaining;
        countVencidos++;
      } else if (e.dueDate === todayStr) {
        totalVencendoHoje += remaining;
        countVencendoHoje++;
      }

      // Proactive check
      if (e.dueDate === todayStr) {
        entriesDueToday.push(e);
        totalDueToday += remaining;
      } else if (e.dueDate === tomorrowStr) {
        entriesDueTomorrow.push(e);
        totalDueTomorrow += remaining;
      }
    }
  });

  // Clientes com vencimentos Hoje ou Amanhã
  const proactiveDueCustomers = customers
    .map((c) => {
      const debt = StorageService.getCustomerDebt(c.id);
      const cDueToday = debt.entries.filter((e) => e.dueDate === todayStr && e.status !== 'paid');
      const cDueTomorrow = debt.entries.filter((e) => e.dueDate === tomorrowStr && e.status !== 'paid');
      const dueTodayVal = cDueToday.reduce((sum, e) => sum + Math.max(0, e.amount - (e.paidAmount || 0)), 0);
      const dueTomorrowVal = cDueTomorrow.reduce((sum, e) => sum + Math.max(0, e.amount - (e.paidAmount || 0)), 0);

      return {
        customer: c,
        dueTodayEntries: cDueToday,
        dueTomorrowEntries: cDueTomorrow,
        dueTodayVal,
        dueTomorrowVal,
        totalRelevantVal: dueTodayVal + dueTomorrowVal,
        totalDebt: debt.totalDebt,
      };
    })
    .filter((item) => item.dueTodayEntries.length > 0 || item.dueTomorrowEntries.length > 0)
    .sort((a, b) => b.totalRelevantVal - a.totalRelevantVal);

  // Daily figures (Hoje)
  const paymentsToday = payments.filter((p) => p.date === todayStr);
  const totalRecebidoHoje = paymentsToday.reduce((acc, p) => acc + p.amount, 0);

  const entriesToday = entries.filter((e) => e.date === todayStr);
  const totalVendidoHoje = entriesToday.reduce((acc, e) => acc + e.amount, 0);

  // Total prepaid credit currently active in store
  const totalCreditoAntecipado = customers.reduce((acc, c) => {
    const debt = StorageService.getCustomerDebt(c.id);
    return acc + (debt.creditBalance || 0);
  }, 0);

  // Customers with immediate attention needed (due today or overdue)
  const urgentCustomers = customers
    .map((c) => {
      const debt = StorageService.getCustomerDebt(c.id);
      return { customer: c, ...debt };
    })
    .filter((c) => c.overdueCount > 0 || c.entries.some((e) => e.dueDate === todayStr && e.status !== 'paid'))
    .sort((a, b) => b.totalDebt - a.totalDebt)
    .slice(0, 4);

  const formattedDate = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
  });

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* 1. Welcome Greeting & Daily Date Banner */}
      <div className="bg-gradient-to-r from-emerald-900 via-emerald-800 to-teal-900 rounded-3xl p-5 sm:p-6 text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-emerald-700/60 text-emerald-200 text-xs font-bold px-3 py-1 rounded-full border border-emerald-500/30 capitalize flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              {formattedDate}
            </span>
            <span className="bg-emerald-500/20 text-emerald-300 text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-emerald-400/20">
              Hoje
            </span>
          </div>

          <h2 className="text-xl sm:text-2xl font-black mt-2 tracking-tight">
            Painel Diário — {settings.storeName || 'Controle de Fiados'}
          </h2>
          <p className="text-xs sm:text-sm text-emerald-200 mt-1 max-w-xl">
            Resumo financeiro em tempo real com saldos a receber, contas vencidas e atalhos rápidos de atendimento.
          </p>
        </div>

        {/* Quick balance indicator */}
        <div className="bg-white/10 backdrop-blur-xs p-3.5 sm:p-4 rounded-2xl border border-white/15 flex items-center gap-3 self-start md:self-auto">
          <div className="w-10 h-10 rounded-xl bg-emerald-400 text-emerald-950 flex items-center justify-center font-black shrink-0 shadow-xs">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] text-emerald-200 uppercase font-bold block">
              Recebido Hoje no Caixa
            </span>
            <span className="text-lg sm:text-xl font-black text-white">
              R$ {totalRecebidoHoje.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* AVISO VISUAL PROATIVO: COBRANÇAS QUE VENCEM HOJE OU AMANHÃ */}
      {(entriesDueToday.length > 0 || entriesDueTomorrow.length > 0) ? (
        <div className="bg-gradient-to-br from-amber-500/10 via-orange-500/10 to-amber-500/5 border-2 border-amber-400/80 rounded-3xl p-4 sm:p-5 shadow-xs space-y-3.5 animate-in fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-amber-200/60">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center font-black shadow-xs shrink-0">
                <BellRing className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm sm:text-base font-black text-amber-950 tracking-tight">
                    Aviso Visual de Cobranças Proativas
                  </h3>
                  <span className="text-[10px] font-black uppercase bg-amber-500 text-white px-2 py-0.5 rounded-full shadow-2xs">
                    Vencem Hoje ou Amanhã
                  </span>
                </div>
                <p className="text-xs text-amber-900/80 mt-0.5">
                  Acompanhamento preventivo: envie um lembrete cordial no dia ou na véspera para manter o fluxo de caixa sem atrito.
                </p>
              </div>
            </div>

            {onOpenCollectionSuggestions && (
              <button
                type="button"
                onClick={() => onOpenCollectionSuggestions()}
                className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex items-center gap-1.5 transition shadow-2xs active:scale-95 shrink-0 self-start sm:self-auto cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-200" />
                <span>3 Modelos de Mensagens</span>
              </button>
            )}
          </div>

          {/* Badges de Totais Vencendo Hoje vs Amanhã */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div className="bg-white/90 p-3 rounded-2xl border border-amber-300 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" />
                <div>
                  <span className="text-xs font-bold text-amber-950 block">Vencem HOJE</span>
                  <span className="text-[11px] text-amber-800">
                    {entriesDueToday.length} {entriesDueToday.length === 1 ? 'conta com vencimento hoje' : 'contas com vencimento hoje'}
                  </span>
                </div>
              </div>
              <span className="text-base font-black text-amber-900">
                R$ {totalDueToday.toFixed(2)}
              </span>
            </div>

            <div className="bg-white/90 p-3 rounded-2xl border border-orange-300 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-orange-400" />
                <div>
                  <span className="text-xs font-bold text-orange-950 block">Vencem AMANHÃ</span>
                  <span className="text-[11px] text-orange-800">
                    {entriesDueTomorrow.length} {entriesDueTomorrow.length === 1 ? 'conta com vencimento amanhã' : 'contas com vencimento amanhã'}
                  </span>
                </div>
              </div>
              <span className="text-base font-black text-orange-900">
                R$ {totalDueTomorrow.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Cards de Clientes com Vencimento Hoje ou Amanhã */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-1">
            {proactiveDueCustomers.map((item) => (
              <div
                key={item.customer.id}
                className="p-3 rounded-2xl bg-white border border-amber-200/90 hover:border-amber-400 flex items-center justify-between gap-3 transition shadow-2xs"
              >
                <div className="min-w-0">
                  <button
                    onClick={() => onSelectCustomer(item.customer)}
                    className="text-xs sm:text-sm font-black text-slate-900 hover:text-emerald-700 transition truncate text-left block"
                  >
                    {item.customer.name}
                    {item.customer.nickname && (
                      <span className="text-slate-500 font-normal ml-1">
                        ({item.customer.nickname})
                      </span>
                    )}
                  </button>

                  <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                    {item.dueTodayEntries.length > 0 && (
                      <span className="text-[10px] font-black text-amber-900 bg-amber-100 border border-amber-300 px-1.5 py-0.5 rounded-md">
                        {item.dueTodayEntries.length} vence hoje (R$ {item.dueTodayVal.toFixed(2)})
                      </span>
                    )}
                    {item.dueTomorrowEntries.length > 0 && (
                      <span className="text-[10px] font-black text-orange-900 bg-orange-100 border border-orange-300 px-1.5 py-0.5 rounded-md">
                        {item.dueTomorrowEntries.length} vence amanhã (R$ {item.dueTomorrowVal.toFixed(2)})
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {onOpenCollectionSuggestions && (
                    <button
                      type="button"
                      onClick={() => onOpenCollectionSuggestions(item.customer)}
                      title="Ver modelo de mensagem amigável para este cliente"
                      className="p-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-bold border border-amber-200 transition"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => onOpenWhatsApp(item.customer)}
                    title="Cobrar via WhatsApp"
                    className="px-2.5 py-1.5 rounded-xl bg-green-600 hover:bg-green-700 text-white text-xs font-bold transition flex items-center gap-1 shadow-2xs"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span className="hidden xs:inline">WhatsApp</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Card informativo caso não haja contas vencendo hoje ou amanhã */
        <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-3.5 px-4 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5 text-emerald-950 font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
            <span>
              <strong>Acompanhamento de Vencimentos:</strong> Nenhuma cobrança vence hoje ou amanhã. Todos os prazos em dia!
            </span>
          </div>
          {onOpenCollectionSuggestions && (
            <button
              type="button"
              onClick={() => onOpenCollectionSuggestions()}
              className="text-xs font-bold text-emerald-800 hover:text-emerald-950 underline shrink-0 cursor-pointer flex items-center gap-1"
            >
              <Sparkles className="w-3 h-3 text-amber-500" />
              <span>Modelos de Cobrança</span>
            </button>
          )}
        </div>
      )}

      {/* 2. Daily Financial Summary Grid (Métricas Principais) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Total a Receber */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs hover:border-emerald-300 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Total a Receber
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">
            R$ {totalFiadoEmAberto.toFixed(2)}
          </div>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 text-xs">
            <span className="text-slate-500">Saldo em aberto</span>
            <button
              onClick={() => onSelectTab('fiados')}
              className="text-emerald-700 hover:text-emerald-900 font-bold flex items-center gap-0.5"
            >
              <span>Ver fiados</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Valores Vencidos (Em Atraso) */}
        <div className="bg-white p-4 rounded-2xl border border-rose-200 shadow-xs bg-rose-50/20 hover:border-rose-300 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-rose-700 uppercase tracking-wider">
              Valores Vencidos
            </span>
            <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-rose-600">
            R$ {totalVencido.toFixed(2)}
          </div>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-rose-100 text-xs">
            <span className="text-rose-700 font-semibold">
              {countVencidos} {countVencidos === 1 ? 'compra atrasada' : 'compras atrasadas'}
            </span>
            <button
              onClick={() => onSelectTab('fiados')}
              className="text-rose-700 hover:text-rose-900 font-bold flex items-center gap-0.5"
            >
              <span>Cobrar</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Vencendo Hoje */}
        <div className="bg-white p-4 rounded-2xl border border-amber-200 shadow-xs bg-amber-50/20 hover:border-amber-300 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-amber-800 uppercase tracking-wider">
              Vencendo Hoje
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-700">
            R$ {totalVencendoHoje.toFixed(2)}
          </div>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-amber-100 text-xs">
            <span className="text-amber-800 font-medium">
              {countVencendoHoje} {countVencendoHoje === 1 ? 'vencimento hoje' : 'vencimentos hoje'}
            </span>
            <span className="text-amber-700 font-bold">Lembrete amigável</span>
          </div>
        </div>

        {/* Vendas & Crédito Antecipado */}
        <div className="bg-white p-4 rounded-2xl border border-blue-200 shadow-xs bg-blue-50/15 hover:border-blue-300 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-blue-800 uppercase tracking-wider">
              Crédito Antecipado
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-blue-700">
            R$ {totalCreditoAntecipado.toFixed(2)}
          </div>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-blue-100 text-xs">
            <span className="text-blue-800 font-medium">Marmitas pré-pagas</span>
            <button
              onClick={onNewPrepaidCredit}
              className="text-blue-700 hover:text-blue-900 font-bold flex items-center gap-0.5"
            >
              <span>+ Crédito</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 3. Atalhos Rápidos para Ações Comuns (Acesso Imediato) */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-700" />
              <span>Atalhos Rápidos de Ações Comuns</span>
            </h3>
            <p className="text-xs text-slate-500">
              Operações mais utilizadas para o dia a dia no balcão e no atendimento
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {/* 1. Lançar a Prazo */}
          <button
            type="button"
            onClick={onNewFiado}
            className="p-3.5 rounded-2xl bg-gradient-to-br from-emerald-50 to-emerald-100/70 hover:from-emerald-100 hover:to-emerald-200 text-emerald-950 border border-emerald-200 flex flex-col items-center justify-center text-center gap-2 transition-all shadow-2xs hover:shadow-xs active:scale-95 group cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition">
              <Plus className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <span className="text-xs font-black block text-emerald-950">Lançar a Prazo</span>
              <span className="text-[10px] text-emerald-700">Nova marmita</span>
            </div>
          </button>

          {/* 2. Receber Pagamento */}
          <button
            type="button"
            onClick={onNewPayment}
            className="p-3.5 rounded-2xl bg-gradient-to-br from-teal-50 to-teal-100/70 hover:from-teal-100 hover:to-teal-200 text-teal-950 border border-teal-200 flex flex-col items-center justify-center text-center gap-2 transition-all shadow-2xs hover:shadow-xs active:scale-95 group cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-teal-700 text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-black block text-teal-950">Receber Conta</span>
              <span className="text-[10px] text-teal-700">Abater saldo</span>
            </div>
          </button>

          {/* 3. Crédito Antecipado */}
          <button
            type="button"
            onClick={onNewPrepaidCredit}
            className="p-3.5 rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100/70 hover:from-blue-100 hover:to-blue-200 text-blue-950 border border-blue-200 flex flex-col items-center justify-center text-center gap-2 transition-all shadow-2xs hover:shadow-xs active:scale-95 group cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-black block text-blue-950">Crédito Antecipado</span>
              <span className="text-[10px] text-blue-700">Pré-pagar mês</span>
            </div>
          </button>

          {/* 4. Cadastrar Cliente */}
          <button
            type="button"
            onClick={onNewCustomer}
            className="p-3.5 rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 hover:from-slate-100 hover:to-slate-200 text-slate-800 border border-slate-200 flex flex-col items-center justify-center text-center gap-2 transition-all shadow-2xs hover:shadow-xs active:scale-95 group cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-slate-800 text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-black block text-slate-900">Novo Cliente</span>
              <span className="text-[10px] text-slate-600">Adicionar ficha</span>
            </div>
          </button>

          {/* 5. Disparar WhatsApp */}
          <button
            type="button"
            onClick={onOpenBroadcast}
            className="p-3.5 rounded-2xl bg-gradient-to-br from-green-50 to-green-100/70 hover:from-green-100 hover:to-green-200 text-green-950 border border-green-200 flex flex-col items-center justify-center text-center gap-2 transition-all shadow-2xs hover:shadow-xs active:scale-95 group cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-green-600 text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-black block text-green-950">Disparar WhatsApp</span>
              <span className="text-[10px] text-green-700">Cardápio & avisos</span>
            </div>
          </button>

          {/* 6. Ver Relatórios */}
          <button
            type="button"
            onClick={() => onSelectTab('relatorio')}
            className="p-3.5 rounded-2xl bg-gradient-to-br from-purple-50 to-purple-100/70 hover:from-purple-100 hover:to-purple-200 text-purple-950 border border-purple-200 flex flex-col items-center justify-center text-center gap-2 transition-all shadow-2xs hover:shadow-xs active:scale-95 group cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-black block text-purple-950">Relatórios</span>
              <span className="text-[10px] text-purple-700">Gráficos & PDF</span>
            </div>
          </button>
        </div>
      </div>

      {/* 4. Clientes que Exigem Atenção Hoje (Vencendo ou em Atraso) */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-600" />
              <span>Cobranças & Vencimentos Prioritários</span>
            </h3>
            <p className="text-xs text-slate-500">
              Clientes com valores vencidos ou com vencimento programado para hoje
            </p>
          </div>
          <button
            onClick={() => onSelectTab('clientes')}
            className="text-xs font-bold text-emerald-700 hover:text-emerald-900 flex items-center gap-1"
          >
            <span>Ver todos</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {urgentCustomers.length === 0 ? (
          <div className="p-6 text-center text-slate-400 space-y-1 bg-slate-50 rounded-xl">
            <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500" />
            <p className="text-xs sm:text-sm font-bold text-slate-700">
              Nenhuma cobrança urgente pendente hoje!
            </p>
            <p className="text-[11px]">Todos os clientes estão com os prazos rigorosamente em dia.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {urgentCustomers.map((item) => (
              <div
                key={item.customer.id}
                className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-white flex items-center justify-between gap-3 transition"
              >
                <div className="min-w-0">
                  <button
                    onClick={() => onSelectCustomer(item.customer)}
                    className="text-xs sm:text-sm font-bold text-slate-900 hover:text-emerald-700 transition truncate text-left block"
                  >
                    {item.customer.name}
                    {item.customer.nickname && (
                      <span className="text-slate-500 font-normal ml-1">
                        ({item.customer.nickname})
                      </span>
                    )}
                  </button>

                  <div className="flex items-center gap-2 mt-1 text-[11px]">
                    {item.overdueCount > 0 ? (
                      <span className="text-rose-600 font-bold bg-rose-50 px-1.5 py-0.5 rounded-md border border-rose-200">
                        {item.overdueCount} compra(s) vencida(s)
                      </span>
                    ) : (
                      <span className="text-amber-700 font-semibold bg-amber-50 px-1.5 py-0.5 rounded-md border border-amber-200">
                        Vencendo Hoje
                      </span>
                    )}
                    <span className="text-slate-500 font-black">
                      Total: R$ {item.totalDebt.toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => onSelectCustomer(item.customer)}
                    className="p-2 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-bold transition"
                    title="Ver ficha"
                  >
                    Ficha
                  </button>

                  <button
                    onClick={() => onOpenWhatsApp(item.customer)}
                    className="p-2 rounded-xl bg-green-600 hover:bg-green-500 text-white text-xs font-bold transition flex items-center gap-1 shadow-2xs"
                    title="Cobrar via WhatsApp"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span className="hidden xs:inline">Cobrar</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 5. Resumo das Atividades de Hoje (Vendas vs Recebidos) */}
      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-black">
            <ShoppingBag className="w-4 h-4" />
          </div>
          <div>
            <span className="text-slate-500 font-medium">Movimento de Hoje:</span>
            <div className="font-bold text-slate-800">
              {entriesToday.length} compras a prazo registradas (R$ {totalVendidoHoje.toFixed(2)}) •{' '}
              {paymentsToday.length} pagamentos recebidos (R$ {totalRecebidoHoje.toFixed(2)})
            </div>
          </div>
        </div>

        <button
          onClick={() => onSelectTab('relatorio')}
          className="text-xs font-extrabold text-emerald-700 hover:text-emerald-900 flex items-center gap-1 self-start sm:self-auto"
        >
          <span>Abrir Resumo Completo</span>
          <ArrowUpRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

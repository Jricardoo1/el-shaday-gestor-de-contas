import React, { useState } from 'react';
import {
  BellRing,
  Clock,
  Send,
  DollarSign,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  UtensilsCrossed,
  CheckCircle2,
  Calendar,
  Sparkles,
} from 'lucide-react';
import { Customer, FiadoEntry, StoreSettings, UpcomingDueCustomer } from '../types';

interface UpcomingDueAlertBannerProps {
  upcomingCustomers: UpcomingDueCustomer[];
  settings: StoreSettings;
  onSelectCustomer: (customer: Customer) => void;
  onNewPayment: (customerId: string) => void;
  onOpenWhatsApp: (customer: Customer, entry?: FiadoEntry) => void;
}

export const UpcomingDueAlertBanner: React.FC<UpcomingDueAlertBannerProps> = ({
  upcomingCustomers,
  settings,
  onSelectCustomer,
  onNewPayment,
  onOpenWhatsApp,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  if (upcomingCustomers.length === 0) {
    return null;
  }

  const totalSumDueSoon = upcomingCustomers.reduce((acc, c) => acc + c.totalDueSoon, 0);
  const dueTodayCount = upcomingCustomers.filter((c) => c.daysRemaining === 0).length;
  const dueTomorrowCount = upcomingCustomers.filter((c) => c.daysRemaining === 1).length;

  return (
    <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-emerald-500/10 border-2 border-amber-400/80 rounded-2xl p-4 shadow-sm space-y-3 animate-in fade-in duration-300">
      {/* Banner Header */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-black shadow-xs shrink-0 animate-pulse">
            <BellRing className="w-5 h-5 text-slate-950" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-black text-slate-900 tracking-tight flex items-center gap-1.5">
                <span>Radar de Vencimentos (Próximos 3 Dias)</span>
                <span className="bg-amber-500 text-slate-950 font-black text-[10px] px-2 py-0.5 rounded-full">
                  {upcomingCustomers.length} {upcomingCustomers.length === 1 ? 'cliente' : 'clientes'}
                </span>
              </h3>
            </div>
            <p className="text-xs text-slate-600 mt-0.5">
              Aja com antecedência: envie lembretes amigáveis e aumente o recebimento em até 3x!
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Total Sum to receive */}
          <div className="bg-white/90 border border-amber-300/80 px-3 py-1 rounded-xl text-right shadow-xs">
            <span className="text-[10px] uppercase font-bold text-slate-500 block leading-tight">
              A Receber em até 3d
            </span>
            <span className="text-sm font-black text-amber-900">
              R$ {totalSumDueSoon.toFixed(2)}
            </span>
          </div>

          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-white/80 transition"
            title={isCollapsed ? 'Expandir radar' : 'Recolher radar'}
          >
            {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Quick summary badges */}
      {!isCollapsed && (
        <>
          <div className="flex items-center gap-2 text-[11px] font-bold text-slate-600 flex-wrap">
            {dueTodayCount > 0 && (
              <span className="bg-rose-500 text-white px-2.5 py-0.5 rounded-full flex items-center gap-1 font-extrabold shadow-2xs">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                {dueTodayCount} {dueTodayCount === 1 ? 'vence hoje' : 'vencem hoje'}
              </span>
            )}
            {dueTomorrowCount > 0 && (
              <span className="bg-amber-500 text-slate-950 px-2.5 py-0.5 rounded-full font-bold">
                {dueTomorrowCount} {dueTomorrowCount === 1 ? 'vence amanhã' : 'vencem amanhã'}
              </span>
            )}
            <span className="text-slate-500">
              {upcomingCustomers.length - dueTodayCount - dueTomorrowCount > 0
                ? `+${upcomingCustomers.length - dueTodayCount - dueTomorrowCount} vencem em 2 ou 3 dias`
                : ''}
            </span>
          </div>

          {/* Cards of Customers Expiring in <= 3 days */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-1">
            {upcomingCustomers.map((item) => {
              const isToday = item.daysRemaining === 0;
              const isTomorrow = item.daysRemaining === 1;

              // Summary of items (marmitas, bebidas)
              const itemsSummary = item.entries.map((e) => e.description).join('; ');

              return (
                <div
                  key={item.customer.id}
                  className={`bg-white rounded-xl p-3.5 border transition shadow-xs flex flex-col justify-between gap-2.5 ${
                    isToday
                      ? 'border-rose-300 ring-2 ring-rose-400/20'
                      : isTomorrow
                      ? 'border-amber-300 ring-1 ring-amber-400/20'
                      : 'border-slate-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {/* Urgency Badge */}
                        <span
                          className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md flex items-center gap-1 ${
                            isToday
                              ? 'bg-rose-100 text-rose-800 animate-pulse'
                              : isTomorrow
                              ? 'bg-amber-100 text-amber-900'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          <Clock className="w-3 h-3" />
                          {item.urgencyLabel}
                        </span>

                        <span className="text-[11px] text-slate-500 font-semibold">
                          {new Date(item.nearestDueDate + 'T12:00:00').toLocaleDateString('pt-BR')}
                        </span>
                      </div>

                      {/* Customer Name */}
                      <button
                        onClick={() => onSelectCustomer(item.customer)}
                        className="text-xs sm:text-sm font-bold text-slate-900 hover:text-emerald-700 transition text-left mt-1 block truncate"
                      >
                        {item.customer.name}
                        {item.customer.nickname && (
                          <span className="text-slate-500 font-normal ml-1">
                            ({item.customer.nickname})
                          </span>
                        )}
                      </button>

                      {/* Items details */}
                      <p className="text-[11px] text-slate-500 truncate max-w-[280px] mt-0.5 flex items-center gap-1">
                        <UtensilsCrossed className="w-3 h-3 text-emerald-600 shrink-0" />
                        <span className="truncate">{itemsSummary || 'Marmitex e Bebidas'}</span>
                      </p>
                    </div>

                    {/* Amount Due Soon */}
                    <div className="text-right shrink-0">
                      <span className="text-[10px] text-slate-400 font-semibold block uppercase">
                        A Vencer
                      </span>
                      <span className="text-base font-black text-rose-600 block leading-tight">
                        R$ {item.totalDueSoon.toFixed(2)}
                      </span>
                      {item.totalOverallDebt > item.totalDueSoon && (
                        <span className="text-[10px] text-slate-400 font-semibold">
                          (Total: R$ {item.totalOverallDebt.toFixed(2)})
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Quick Action Buttons */}
                  <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                    <button
                      onClick={() => onOpenWhatsApp(item.customer, item.entries[0])}
                      className="flex-1 py-1.5 px-2.5 rounded-lg bg-green-600 hover:bg-green-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition shadow-2xs"
                    >
                      <Send className="w-3 h-3" />
                      <span>Lembrete Amigável WhatsApp</span>
                    </button>

                    <button
                      onClick={() => onNewPayment(item.customer.id)}
                      className="py-1.5 px-3 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-900 font-bold text-xs flex items-center justify-center gap-1 transition"
                      title="Registrar pagamento ou abatimento"
                    >
                      <DollarSign className="w-3.5 h-3.5" />
                      <span>Receber</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

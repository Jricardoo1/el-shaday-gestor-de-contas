import React from 'react';
import {
  Users,
  ShieldAlert,
  Send,
  AlertTriangle,
  Building2,
  Phone,
  ChevronRight,
  TrendingDown,
  CheckCircle2,
  FileText,
} from 'lucide-react';
import { Customer, FiadoEntry } from '../types';
import { StorageService } from '../services/storage';

interface TopDebtorsSectionProps {
  customers: Customer[];
  entries: FiadoEntry[];
  totalFiadoEmAberto: number;
  onSelectCustomer: (customer: Customer) => void;
  onOpenWhatsApp: (customer: Customer) => void;
}

export const TopDebtorsSection: React.FC<TopDebtorsSectionProps> = ({
  customers,
  entries,
  totalFiadoEmAberto,
  onSelectCustomer,
  onOpenWhatsApp,
}) => {
  // Query debt for each customer and sort descending
  const debtorsList = customers
    .map((c) => {
      const debt = StorageService.getCustomerDebt(c.id);
      const overdueEntries = debt.entries.filter((e) => e.status === 'overdue');
      const overdueAmount = overdueEntries.reduce(
        (acc, e) => acc + Math.max(0, e.amount - (e.paidAmount || 0)),
        0
      );

      return {
        customer: c,
        totalDebt: debt.totalDebt,
        overdueCount: debt.overdueCount,
        pendingCount: debt.pendingCount,
        overdueAmount,
        entriesCount: debt.entries.length,
      };
    })
    .filter((d) => d.totalDebt > 0)
    .sort((a, b) => b.totalDebt - a.totalDebt);

  // Take exactly Top 5
  const top5Debtors = debtorsList.slice(0, 5);

  const top5Total = top5Debtors.reduce((acc, d) => acc + d.totalDebt, 0);
  const top5Share =
    totalFiadoEmAberto > 0 ? Math.round((top5Total / totalFiadoEmAberto) * 100) : 0;

  return (
    <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900">
                Top 5 Maiores Saldos Devedores Acumulados
              </h3>
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-0.5 pl-10 sm:pl-0">
            Identificação prioritária dos clientes com maior concentração de crédito em aberto
          </p>
        </div>

        {top5Debtors.length > 0 && (
          <span className="text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 px-3 py-1 rounded-full self-start sm:self-auto shrink-0">
            {top5Debtors.length} de {debtorsList.length} clientes com débito
          </span>
        )}
      </div>

      {top5Debtors.length === 0 ? (
        <div className="text-center py-10 text-slate-400 space-y-2">
          <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-500" />
          <p className="text-sm font-bold text-slate-700">
            Parabéns! Nenhuma conta a prazo em aberto no momento.
          </p>
          <p className="text-xs">
            Todos os clientes estão com as contas totalmente quitadas e em dia.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Top 5 Debtor Cards */}
          {top5Debtors.map((item, index) => {
            const share =
              totalFiadoEmAberto > 0
                ? Math.round((item.totalDebt / totalFiadoEmAberto) * 100)
                : 0;

            const rankBadgeStyles = [
              'bg-gradient-to-br from-amber-400 to-amber-500 text-amber-950 ring-2 ring-amber-300 shadow-xs',
              'bg-gradient-to-br from-slate-200 to-slate-400 text-slate-900 ring-2 ring-slate-200 shadow-xs',
              'bg-gradient-to-br from-amber-600 to-amber-800 text-white ring-2 ring-amber-500 shadow-xs',
              'bg-slate-100 text-slate-700 border border-slate-300',
              'bg-slate-100 text-slate-700 border border-slate-300',
            ];

            return (
              <div
                key={item.customer.id}
                className="p-3.5 sm:p-4 rounded-xl border border-slate-200 hover:border-slate-300 bg-slate-50/50 hover:bg-white transition-all duration-200 space-y-2.5 shadow-2xs"
              >
                <div className="flex items-start justify-between gap-3 flex-wrap sm:flex-nowrap">
                  {/* Left: Position Rank & Customer Details */}
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div
                      className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${
                        rankBadgeStyles[index] || rankBadgeStyles[4]
                      }`}
                    >
                      {index + 1}º
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          type="button"
                          onClick={() => onSelectCustomer(item.customer)}
                          className="text-xs sm:text-sm font-bold text-slate-900 hover:text-emerald-700 transition truncate text-left cursor-pointer flex items-center gap-1 group"
                        >
                          <span className="group-hover:underline">{item.customer.name}</span>
                          <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-700 shrink-0" />
                        </button>

                        {item.customer.nickname && (
                          <span className="text-xs text-slate-500 font-medium">
                            ({item.customer.nickname})
                          </span>
                        )}

                        {item.customer.customerType === 'empresa' && (
                          <span className="inline-flex items-center gap-1 text-[10px] bg-amber-100 text-amber-900 font-bold px-1.5 py-0.5 rounded-md">
                            <Building2 className="w-3 h-3" />
                            Empresa
                          </span>
                        )}
                      </div>

                      {/* Phone & Overdue Alert */}
                      <div className="flex items-center gap-3 mt-1 text-[11px] text-slate-500 flex-wrap">
                        {item.customer.phone && (
                          <span className="flex items-center gap-1 font-medium">
                            <Phone className="w-3 h-3 text-slate-400" />
                            {item.customer.phone}
                          </span>
                        )}

                        {item.overdueCount > 0 ? (
                          <span className="inline-flex items-center gap-1 font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                            <AlertTriangle className="w-3 h-3 text-rose-600" />
                            {item.overdueCount} compra(s) vencida(s) (R$ {item.overdueAmount.toFixed(2)})
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            Em dia ({item.pendingCount} a vencer)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Balance & Actions */}
                  <div className="flex items-center gap-3 sm:gap-4 shrink-0 w-full sm:w-auto justify-between sm:justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                    <div className="text-left sm:text-right">
                      <div className="text-base sm:text-lg font-black text-slate-900 leading-tight">
                        R$ {item.totalDebt.toFixed(2)}
                      </div>
                      <span className="text-[11px] text-slate-500 font-medium">
                        {share}% do fiado da loja
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => onSelectCustomer(item.customer)}
                        className="px-2.5 py-1.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-bold transition flex items-center gap-1"
                        title="Ver ficha e extrato completo"
                      >
                        <FileText className="w-3.5 h-3.5 text-slate-500" />
                        <span className="hidden sm:inline">Ficha</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onOpenWhatsApp(item.customer)}
                        title="Enviar extrato ou cobrar via WhatsApp"
                        className="px-2.5 py-1.5 rounded-xl bg-green-600 hover:bg-green-500 text-white text-xs font-bold transition flex items-center gap-1 shadow-2xs active:scale-95"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Cobrar</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Progress bar showing proportion of store debt */}
                <div className="space-y-1 pt-1">
                  <div className="w-full bg-slate-200/80 rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        index === 0
                          ? 'bg-rose-600'
                          : index === 1
                          ? 'bg-rose-500'
                          : index === 2
                          ? 'bg-amber-500'
                          : 'bg-emerald-600'
                      }`}
                      style={{ width: `${Math.min(100, Math.max(4, share))}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}

          {/* Risk Concentration Insight Card */}
          <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-amber-700 shrink-0" />
              <span className="text-amber-950 font-medium">
                Concentração de Risco: Os 5 maiores devedores concentram{' '}
                <strong className="text-amber-900 font-extrabold">{top5Share}%</strong> de todo o saldo em aberto da loja.
              </span>
            </div>
            <div className="font-black text-amber-950 sm:text-right shrink-0">
              Subtotal Top 5: <span className="text-sm font-black">R$ {top5Total.toFixed(2)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

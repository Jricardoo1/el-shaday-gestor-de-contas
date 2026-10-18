import React, { useState } from 'react';
import {
  Search,
  Plus,
  ShoppingBag,
  Send,
  Clock,
  AlertCircle,
  CheckCircle2,
  DollarSign,
  Trash2,
  Calendar,
} from 'lucide-react';
import { Customer, FiadoEntry, StoreSettings } from '../types';
import { getRelativeDateString } from '../services/storage';
import { ConfirmModal } from './ConfirmModal';

interface FiadosTabProps {
  entries: FiadoEntry[];
  customers: Customer[];
  settings: StoreSettings;
  onNewFiado: () => void;
  onNewPayment: (customerId: string, entryId?: string) => void;
  onOpenWhatsApp: (customer: Customer, entry: FiadoEntry) => void;
  onDeleteEntry: (id: string) => void;
  onSelectCustomer: (customer: Customer) => void;
}

export const FiadosTab: React.FC<FiadosTabProps> = ({
  entries,
  customers,
  settings,
  onNewFiado,
  onNewPayment,
  onOpenWhatsApp,
  onDeleteEntry,
  onSelectCustomer,
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'overdue' | 'today' | 'pending' | 'paid'>('all');
  const [entryToDeleteId, setEntryToDeleteId] = useState<string | null>(null);

  const todayStr = getRelativeDateString(0);

  // Filter entries
  const filteredEntries = entries.filter((entry) => {
    const customer = customers.find((c) => c.id === entry.customerId);
    const customerName = customer ? customer.name.toLowerCase() : '';
    const customerNick = customer?.nickname ? customer.nickname.toLowerCase() : '';
    const q = search.toLowerCase();

    const matchesSearch =
      entry.description.toLowerCase().includes(q) ||
      customerName.includes(q) ||
      customerNick.includes(q);

    if (!matchesSearch) return false;

    if (statusFilter === 'overdue') return entry.status === 'overdue';
    if (statusFilter === 'today') return entry.dueDate === todayStr && entry.status !== 'paid';
    if (statusFilter === 'pending') return (entry.status === 'pending' || entry.status === 'partially_paid') && entry.dueDate >= todayStr;
    if (statusFilter === 'paid') return entry.status === 'paid';

    return true;
  });

  // Calculate counters
  const overdueCount = entries.filter((e) => e.status === 'overdue').length;
  const todayCount = entries.filter((e) => e.dueDate === todayStr && e.status !== 'paid').length;

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Buscar compra por produto ou nome do cliente..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 bg-slate-50/50"
            />
          </div>
          <button
            onClick={onNewFiado}
            className="flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs sm:text-sm font-bold px-3.5 py-2.5 rounded-xl shadow-xs transition active:scale-95 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Novo Consumo a Prazo</span>
            <span className="sm:hidden">Novo</span>
          </button>
        </div>

        {/* Filter Badges */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-lg font-bold transition whitespace-nowrap ${
              statusFilter === 'all'
                ? 'bg-slate-800 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Todos ({entries.length})
          </button>

          <button
            onClick={() => setStatusFilter('overdue')}
            className={`px-3 py-1.5 rounded-lg font-bold transition whitespace-nowrap flex items-center gap-1 ${
              statusFilter === 'overdue'
                ? 'bg-rose-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <span>Vencidos</span>
            {overdueCount > 0 && (
              <span className="bg-rose-200 text-rose-900 text-[10px] px-1.5 rounded-full font-black">
                {overdueCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setStatusFilter('today')}
            className={`px-3 py-1.5 rounded-lg font-bold transition whitespace-nowrap flex items-center gap-1 ${
              statusFilter === 'today'
                ? 'bg-amber-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <span>Vencem Hoje</span>
            {todayCount > 0 && (
              <span className="bg-amber-200 text-amber-900 text-[10px] px-1.5 rounded-full font-black">
                {todayCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setStatusFilter('pending')}
            className={`px-3 py-1.5 rounded-lg font-bold transition whitespace-nowrap ${
              statusFilter === 'pending'
                ? 'bg-emerald-700 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Em Dia / A Vencer
          </button>

          <button
            onClick={() => setStatusFilter('paid')}
            className={`px-3 py-1.5 rounded-lg font-bold transition whitespace-nowrap ${
              statusFilter === 'paid'
                ? 'bg-teal-700 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Quitados
          </button>
        </div>
      </div>

      {/* Fiados List */}
      <div className="space-y-3">
        {filteredEntries.length === 0 ? (
          <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-400 space-y-3">
            <ShoppingBag className="w-12 h-12 mx-auto text-slate-300" />
            <p className="text-sm font-bold text-slate-700">Nenhum lançamento encontrado</p>
            <p className="text-xs text-slate-500">
              Não há lançamentos de contas com o filtro selecionado.
            </p>
          </div>
        ) : (
          filteredEntries.map((entry) => {
            const customer = customers.find((c) => c.id === entry.customerId);
            const remaining = Math.max(0, entry.amount - entry.paidAmount);
            const isPaid = entry.status === 'paid';
            const isOverdue = entry.status === 'overdue';
            const isDueToday = entry.dueDate === todayStr && !isPaid;

            return (
              <div
                key={entry.id}
                className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs hover:border-emerald-300 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    {/* Status badge */}
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase flex items-center gap-1 ${
                        isPaid
                          ? 'bg-slate-100 text-slate-600'
                          : isOverdue
                          ? 'bg-rose-100 text-rose-800'
                          : isDueToday
                          ? 'bg-amber-100 text-amber-800 animate-pulse'
                          : entry.paidAmount > 0
                          ? 'bg-amber-50 text-amber-800 border border-amber-200'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {isPaid ? (
                        <>
                          <CheckCircle2 className="w-3 h-3" /> Quitado
                        </>
                      ) : isOverdue ? (
                        <>
                          <AlertCircle className="w-3 h-3" /> Vencido
                        </>
                      ) : isDueToday ? (
                        <>
                          <Clock className="w-3 h-3" /> Vence Hoje!
                        </>
                      ) : entry.paidAmount > 0 ? (
                        'Parcial'
                      ) : (
                        'Em Aberto'
                      )}
                    </span>

                    {/* Customer Name button */}
                    {customer && (
                      <button
                        onClick={() => onSelectCustomer(customer)}
                        className="text-xs font-bold text-emerald-800 hover:underline flex items-center gap-1"
                      >
                        <span>{customer.name}</span>
                        {customer.nickname && (
                          <span className="text-slate-500 font-normal">
                            ({customer.nickname})
                          </span>
                        )}
                      </button>
                    )}
                  </div>

                  {/* Items description */}
                  <h4 className="text-sm font-bold text-slate-900 leading-snug">
                    {entry.description}
                  </h4>

                  {/* Date details */}
                  <div className="flex items-center gap-3 text-xs text-slate-500 mt-1.5 flex-wrap">
                    <span>
                      Comprado em:{' '}
                      <strong>
                        {new Date(entry.date + 'T12:00:00').toLocaleDateString('pt-BR')}
                      </strong>
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Vencimento:{' '}
                      <strong
                        className={
                          isOverdue
                            ? 'text-rose-600 font-bold'
                            : isDueToday
                            ? 'text-amber-700 font-bold'
                            : 'text-slate-700 font-bold'
                        }
                      >
                        {new Date(entry.dueDate + 'T12:00:00').toLocaleDateString('pt-BR')}
                      </strong>
                    </span>
                  </div>
                </div>

                {/* Values & Actions */}
                <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                  <div className="text-left sm:text-right">
                    <span className="text-[11px] text-slate-400 block font-medium">Valor Total</span>
                    <span className="text-sm font-bold text-slate-700">
                      R$ {entry.amount.toFixed(2)}
                    </span>
                    {!isPaid && (
                      <span className="block text-base font-black text-rose-600">
                        Resta: R$ {remaining.toFixed(2)}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* Abater pagamento */}
                    {!isPaid && (
                      <button
                        onClick={() => onNewPayment(entry.customerId, entry.id)}
                        title="Receber pagamento deste lançamento"
                        className="p-2 rounded-xl bg-emerald-700 text-white hover:bg-emerald-800 transition"
                      >
                        <DollarSign className="w-4 h-4" />
                      </button>
                    )}

                    {/* WhatsApp */}
                    {customer && (
                      <button
                        onClick={() => onOpenWhatsApp(customer, entry)}
                        title="Cobrar ou enviar comprovante no WhatsApp"
                        className="p-2 rounded-xl bg-green-500 text-white hover:bg-green-600 transition"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    )}

                    {/* Delete */}
                    <button
                      onClick={() => setEntryToDeleteId(entry.id)}
                      title="Excluir lançamento"
                      className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal de Confirmação para Excluir Lançamento */}
      <ConfirmModal
        isOpen={!!entryToDeleteId}
        title="Excluir Lançamento"
        message="Tem certeza que deseja apagar este lançamento de marmitex? Esta ação é definitiva e atualizará o saldo da conta."
        confirmLabel="Sim, Excluir"
        onConfirm={() => {
          if (entryToDeleteId) {
            onDeleteEntry(entryToDeleteId);
            setEntryToDeleteId(null);
          }
        }}
        onCancel={() => setEntryToDeleteId(null)}
      />
    </div>
  );
};

import React, { useState, useMemo } from 'react';
import {
  DollarSign,
  Search,
  Plus,
  Send,
  Calendar,
  Banknote,
  QrCode,
  CreditCard,
  CheckCircle2,
  FileText,
  Edit2,
  Trash2,
  Filter,
} from 'lucide-react';
import { Customer, PaymentRecord, StoreSettings } from '../types';
import { getRelativeDateString, formatCurrency } from '../services/storage';
import { ConfirmModal } from './ConfirmModal';

interface PaymentsTabProps {
  payments: PaymentRecord[];
  customers: Customer[];
  settings: StoreSettings;
  onNewPayment: (initialMode?: 'free' | 'monthly') => void;
  onEditPayment: (payment: PaymentRecord) => void;
  onDeletePayment?: (paymentId: string) => void;
  onOpenWhatsAppReceipt: (customer: Customer, payment: PaymentRecord) => void;
  onOpenReceipt: (customer: Customer, payment: PaymentRecord) => void;
  onSelectCustomer: (customer: Customer) => void;
}

export const PaymentsTab: React.FC<PaymentsTabProps> = ({
  payments,
  customers,
  settings,
  onNewPayment,
  onEditPayment,
  onDeletePayment,
  onOpenWhatsAppReceipt,
  onOpenReceipt,
  onSelectCustomer,
}) => {
  const [search, setSearch] = useState('');
  const [selectedMonthFilter, setSelectedMonthFilter] = useState<string>('all');
  const [paymentToDelete, setPaymentToDelete] = useState<PaymentRecord | null>(null);
  const todayStr = getRelativeDateString(0);

  // Helper to format month label (e.g. 2026-11 -> Novembro de 2026)
  const formatMonthLabel = (mKey: string) => {
    if (!mKey || mKey === 'all' || mKey.length < 7) return 'Todos os Meses';
    const [year, month] = mKey.split('-');
    const months = [
      'Janeiro',
      'Fevereiro',
      'Março',
      'Abril',
      'Maio',
      'Junho',
      'Julho',
      'Agosto',
      'Setembro',
      'Outubro',
      'Novembro',
      'Dezembro',
    ];
    const idx = parseInt(month, 10) - 1;
    return `${months[idx] || month} de ${year}`;
  };

  // Unique months present in payment records
  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    payments.forEach((p) => {
      if (p.date && p.date.length >= 7) {
        set.add(p.date.slice(0, 7));
      }
    });
    // Ensure current month is always present
    set.add(todayStr.slice(0, 7));
    return Array.from(set).sort().reverse();
  }, [payments, todayStr]);

  // Search and month filter
  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      // Month filter
      if (selectedMonthFilter !== 'all') {
        const pMonth = p.date ? p.date.slice(0, 7) : '';
        if (pMonth !== selectedMonthFilter) return false;
      }

      // Search query
      const customer = customers.find((c) => c.id === p.customerId);
      const q = search.toLowerCase().trim();
      if (!q) return true;

      return (
        (customer && customer.name.toLowerCase().includes(q)) ||
        (customer?.nickname && customer.nickname.toLowerCase().includes(q)) ||
        (p.receiptNumber && p.receiptNumber.toLowerCase().includes(q)) ||
        (p.notes && p.notes.toLowerCase().includes(q)) ||
        (p.targetMonthLabel && p.targetMonthLabel.toLowerCase().includes(q))
      );
    });
  }, [payments, customers, search, selectedMonthFilter]);

  // Metrics
  const totalReceivedAllTime = payments.reduce((acc, p) => acc + p.amount, 0);
  const totalReceivedToday = payments
    .filter((p) => p.date === todayStr)
    .reduce((acc, p) => acc + p.amount, 0);
  const totalReceivedFilteredMonth = useMemo(() => {
    if (selectedMonthFilter === 'all') return totalReceivedAllTime;
    return payments
      .filter((p) => p.date && p.date.slice(0, 7) === selectedMonthFilter)
      .reduce((acc, p) => acc + p.amount, 0);
  }, [payments, selectedMonthFilter, totalReceivedAllTime]);

  return (
    <div className="space-y-4">
      {/* Top summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] text-slate-500 font-bold uppercase tracking-wider block">
              Recebido Hoje
            </span>
            <span className="text-2xl font-black text-emerald-700">
              R$ {formatCurrency(totalReceivedToday)}
            </span>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] text-slate-500 font-bold uppercase tracking-wider block">
              {selectedMonthFilter === 'all'
                ? 'Total Histórico'
                : `Recebido em ${formatMonthLabel(selectedMonthFilter)}`}
            </span>
            <span className="text-2xl font-black text-teal-800">
              R$ {formatCurrency(totalReceivedFilteredMonth)}
            </span>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-teal-100 text-teal-800 flex items-center justify-center font-bold">
            <Calendar className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] text-slate-500 font-bold uppercase tracking-wider block">
              Total Geral Recebido
            </span>
            <span className="text-2xl font-black text-slate-800">
              R$ {formatCurrency(totalReceivedAllTime)}
            </span>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Search, Month Filter and Action Buttons */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Buscar por cliente, recibo ou notas..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 bg-slate-50/50 font-medium"
          />
        </div>

        {/* Filtro por Mês */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={selectedMonthFilter}
              onChange={(e) => setSelectedMonthFilter(e.target.value)}
              className="bg-transparent font-bold text-slate-800 focus:outline-hidden text-xs cursor-pointer"
            >
              <option value="all">Todos os Meses</option>
              {availableMonths.map((m) => (
                <option key={m} value={m}>
                  {formatMonthLabel(m)}
                </option>
              ))}
            </select>
          </div>

          {/* Botão: Receber por Mês */}
          <button
            type="button"
            onClick={() => onNewPayment('monthly')}
            className="flex items-center gap-1.5 bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold px-3 py-2.5 rounded-xl shadow-xs transition active:scale-95 shrink-0 cursor-pointer"
            title="Receber pagamento referente a um mês específico de consumo"
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Receber por Mês</span>
          </button>

          {/* Botão: Receber Pagamento Livre */}
          <button
            type="button"
            onClick={() => onNewPayment('free')}
            className="flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold px-3.5 py-2.5 rounded-xl shadow-xs transition active:scale-95 shrink-0 cursor-pointer"
            title="Registrar pagamento avulso ou quitar conta total"
          >
            <Plus className="w-4 h-4" />
            <span>Receber Avulso</span>
          </button>
        </div>
      </div>

      {/* Payment items list */}
      <div className="space-y-2.5">
        {filteredPayments.length === 0 ? (
          <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-400 space-y-3">
            <DollarSign className="w-12 h-12 mx-auto text-slate-300" />
            <p className="text-sm font-bold text-slate-700">Nenhum pagamento encontrado</p>
            <p className="text-xs text-slate-500">
              {selectedMonthFilter !== 'all'
                ? `Não foram encontrados pagamentos registrados no mês de ${formatMonthLabel(selectedMonthFilter)}.`
                : 'Quando seus clientes pagarem ou abaterem dívidas, elas aparecerão aqui.'}
            </p>
          </div>
        ) : (
          filteredPayments.map((p) => {
            const customer = customers.find((c) => c.id === p.customerId);

            return (
              <div
                key={p.id}
                onClick={() => customer && onOpenReceipt(customer, p)}
                title="Clique para abrir o comprovante e extrato detalhado deste pagamento"
                className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-emerald-500 hover:shadow-md transition cursor-pointer active:scale-99"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center justify-center font-bold text-xs shrink-0">
                    {p.method === 'pix' ? (
                      <QrCode className="w-5 h-5 text-emerald-700" />
                    ) : p.method === 'cash' ? (
                      <Banknote className="w-5 h-5 text-emerald-700" />
                    ) : (
                      <CreditCard className="w-5 h-5 text-emerald-700" />
                    )}
                  </div>

                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {customer ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectCustomer(customer);
                          }}
                          title="Ver ficha completa do cliente"
                          className="text-sm font-black text-slate-900 hover:text-emerald-700 transition underline-offset-2 hover:underline cursor-pointer"
                        >
                          {customer.name}
                        </button>
                      ) : (
                        <span className="text-sm font-black text-slate-900">Cliente</span>
                      )}

                      <span className="text-[10px] font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-bold">
                        #{p.receiptNumber}
                      </span>

                      {p.targetMonthLabel && (
                        <span className="text-[10px] font-bold bg-teal-100 text-teal-900 border border-teal-200 px-2 py-0.5 rounded-md">
                          📅 Mês: {p.targetMonthLabel}
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-500 mt-0.5">
                      {new Date(p.date + 'T12:00:00').toLocaleDateString('pt-BR')} via{' '}
                      <strong>
                        {p.method === 'pix'
                          ? 'PIX'
                          : p.method === 'cash'
                          ? 'Dinheiro em espécie'
                          : p.method === 'card_debit'
                          ? 'Cartão de Débito'
                          : p.method === 'card_credit'
                          ? 'Cartão de Crédito'
                          : 'Outro'}
                      </strong>
                      {p.notes ? ` • ${p.notes}` : ''}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                  <div className="text-left sm:text-right">
                    <span className="text-base font-black text-emerald-700 block">
                      + R$ {formatCurrency(p.amount)}
                    </span>
                    <span className="text-[10px] text-emerald-600 font-bold uppercase block">
                      Confirmado
                    </span>
                  </div>

                  {/* Botão: EDITAR RECEBIMENTO */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditPayment(p);
                    }}
                    title="Editar recebimento (valor, data, forma de pagamento ou recibo)"
                    className="py-1.5 px-2.5 rounded-xl bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-900 border border-slate-200 text-xs font-bold flex items-center gap-1 transition cursor-pointer active:scale-95"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-slate-600" />
                    <span>Editar</span>
                  </button>

                  {/* Botão: EXCLUIR RECEBIMENTO */}
                  {onDeletePayment && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPaymentToDelete(p);
                      }}
                      title="Excluir recebimento e voltar o valor para a ficha do cliente"
                      className="py-1.5 px-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 hover:text-rose-900 border border-rose-200 text-xs font-bold flex items-center gap-1 transition cursor-pointer active:scale-95"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                      <span className="hidden sm:inline">Excluir</span>
                    </button>
                  )}

                  {customer && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenReceipt(customer, p);
                      }}
                      title="Abrir comprovante / extrato detalhado para impressão"
                      className="py-1.5 px-2.5 rounded-xl bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200 text-xs font-bold flex items-center gap-1 transition cursor-pointer"
                    >
                      <FileText className="w-3.5 h-3.5 text-emerald-700" />
                      <span className="hidden sm:inline">Extrato</span>
                    </button>
                  )}

                  {customer && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenWhatsAppReceipt(customer, p);
                      }}
                      title="Reenviar recibo por WhatsApp"
                      className="p-2 rounded-xl bg-green-50 text-green-700 hover:bg-green-100 transition cursor-pointer active:scale-95"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal de Confirmação de Exclusão de Pagamento */}
      <ConfirmModal
        isOpen={!!paymentToDelete}
        title="Excluir Recebimento / Estorno"
        message={
          paymentToDelete
            ? `Deseja realmente excluir este recebimento de R$ ${formatCurrency(
                paymentToDelete.amount
              )} (${paymentToDelete.receiptNumber || 'Comprovante'})? O valor será estornado e voltará para a ficha e saldo devedor do cliente.`
            : ''
        }
        confirmLabel="Sim, Excluir e Voltar Valor"
        isDestructive={true}
        onConfirm={() => {
          if (paymentToDelete && onDeletePayment) {
            onDeletePayment(paymentToDelete.id);
            setPaymentToDelete(null);
          }
        }}
        onCancel={() => setPaymentToDelete(null)}
      />
    </div>
  );
};

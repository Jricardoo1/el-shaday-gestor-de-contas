import React, { useState, useMemo } from 'react';
import {
  X,
  DollarSign,
  CheckCircle2,
  CreditCard,
  Banknote,
  QrCode,
  AlertTriangle,
  Plus,
  ArrowUp,
  ArrowDown,
  Calendar,
  Check,
  ChevronRight,
  Sparkles,
  ShoppingBag,
} from 'lucide-react';
import { Customer, PaymentRecord, FiadoEntry } from '../types';
import { StorageService, getRelativeDateString, formatCurrency } from '../services/storage';

interface NewPaymentModalProps {
  customers: Customer[];
  selectedCustomerId?: string;
  initialMode?: 'free' | 'monthly';
  initialMonth?: string;
  onClose: () => void;
  onSavePayment: (payment: PaymentRecord, openWhatsAppReceipt?: boolean) => void;
  onOpenNewCustomer?: () => void;
}

export const NewPaymentModal: React.FC<NewPaymentModalProps> = ({
  customers,
  selectedCustomerId,
  initialMode = 'free',
  initialMonth,
  onClose,
  onSavePayment,
  onOpenNewCustomer,
}) => {
  const [customerId, setCustomerId] = useState(selectedCustomerId || (customers[0]?.id || ''));
  const [paymentMode, setPaymentMode] = useState<'free' | 'monthly'>(initialMode);
  const [amount, setAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(getRelativeDateString(0));
  const [method, setMethod] = useState<'pix' | 'cash' | 'card_debit' | 'card_credit' | 'other'>('cash');
  const [notes, setNotes] = useState('');
  const [sendWhatsApp, setSendWhatsApp] = useState(false);
  const [error, setError] = useState('');
  const [selectedMonthKey, setSelectedMonthKey] = useState<string>(initialMonth || '');
  const [selectedMonthLabel, setSelectedMonthLabel] = useState<string>('');

  const [verticalPosition, setVerticalPosition] = useState<'top' | 'center' | 'bottom'>('center');

  const debtInfo = customerId ? StorageService.getCustomerDebt(customerId) : null;
  const totalDebt = debtInfo?.totalDebt || 0;

  // Month label helper
  const getMonthName = (mKey: string) => {
    if (!mKey || mKey.length < 7) return mKey;
    const [year, month] = mKey.split('-');
    const monthNames = [
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
    return `${monthNames[idx] || month} de ${year}`;
  };

  // Groups customer's purchases by month
  const monthlyGroups = useMemo(() => {
    if (!debtInfo) return [];
    const groupsMap = new Map<
      string,
      {
        monthKey: string;
        label: string;
        entries: FiadoEntry[];
        totalAmount: number;
        paidAmount: number;
        remainingAmount: number;
        isFullyPaid: boolean;
      }
    >();

    debtInfo.entries.forEach((entry) => {
      const monthKey = entry.date && entry.date.length >= 7 ? entry.date.slice(0, 7) : 'Sem Data';
      if (!groupsMap.has(monthKey)) {
        groupsMap.set(monthKey, {
          monthKey,
          label: getMonthName(monthKey),
          entries: [],
          totalAmount: 0,
          paidAmount: 0,
          remainingAmount: 0,
          isFullyPaid: true,
        });
      }
      const grp = groupsMap.get(monthKey)!;
      grp.entries.push(entry);
      grp.totalAmount += entry.amount;
      grp.paidAmount += entry.paidAmount || 0;
      const remaining = Math.max(0, entry.amount - (entry.paidAmount || 0));
      grp.remainingAmount += remaining;
      if (remaining > 0) {
        grp.isFullyPaid = false;
      }
    });

    const list = Array.from(groupsMap.values());
    // Sort descending by month
    list.sort((a, b) => b.monthKey.localeCompare(a.monthKey));
    return list;
  }, [debtInfo]);

  // When customer changes, if initialMonth is not found, clear selectedMonthKey
  const handleSelectMonth = (grp: { monthKey: string; label: string; remainingAmount: number; entries: FiadoEntry[] }) => {
    setSelectedMonthKey(grp.monthKey);
    setSelectedMonthLabel(grp.label);
    const targetVal = grp.remainingAmount > 0 ? grp.remainingAmount : grp.entries.reduce((a, e) => a + e.amount, 0);
    setAmount(targetVal.toFixed(2));
    setNotes(`Pagamento referente ao mês de ${grp.label} (${grp.entries.length} compras de marmitas)`);
  };

  const handleSelectQuickAmount = (val: number) => {
    setAmount(val.toFixed(2));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!customerId) {
      setError('Selecione um cliente.');
      return;
    }

    const val = parseFloat(amount.replace(',', '.'));
    if (isNaN(val) || val <= 0) {
      setError('Informe um valor de pagamento válido maior que zero.');
      return;
    }

    // Se estiver no modo de pagamento por mês e um mês foi selecionado com compras pendentes
    if (paymentMode === 'monthly' && selectedMonthKey) {
      const matchedGroup = monthlyGroups.find((g) => g.monthKey === selectedMonthKey);
      if (matchedGroup && matchedGroup.entries.length > 0) {
        const entryIds = matchedGroup.entries.map((e) => e.id);
        const res = StorageService.settleMonthlyEntries({
          customerId,
          entryIds,
          paymentMethod: method,
          notes: notes.trim() || undefined,
          targetMonth: selectedMonthKey,
          targetMonthLabel: selectedMonthLabel || matchedGroup.label,
          date: paymentDate,
          customAmount: val,
        });

        onSavePayment(res.payment, sendWhatsApp);
        onClose();
        return;
      }
    }

    // Pagamento avulso / padrão
    const payment: PaymentRecord = {
      id: 'pay_' + Date.now(),
      customerId,
      amount: val,
      date: paymentDate || getRelativeDateString(0),
      method,
      receiptNumber: 'REC-' + Math.floor(1000 + Math.random() * 9000),
      notes: notes.trim() || undefined,
      targetMonth: selectedMonthKey || undefined,
      targetMonthLabel: selectedMonthLabel || undefined,
      createdAt: new Date().toISOString(),
    };

    onSavePayment(payment, sendWhatsApp);
    onClose();
  };

  const positionClass =
    verticalPosition === 'top'
      ? 'items-start pt-3 sm:pt-6'
      : verticalPosition === 'bottom'
      ? 'items-end pb-3 sm:pb-6'
      : 'items-center';

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className={`fixed inset-0 z-50 flex justify-center bg-black/65 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto transition-all duration-300 ${positionClass}`}
    >
      <div className="w-full max-w-xl rounded-3xl bg-white shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]">
        {/* Header do Modal com Controles de Posição */}
        <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 px-5 sm:px-6 py-4 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-emerald-300 shadow-inner">
              <DollarSign className="w-5 h-5 text-emerald-200" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-black tracking-tight">Registrar Pagamento / Acerto</h2>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 px-2 py-0.5 rounded-full font-bold">
                  {paymentMode === 'monthly' ? '📅 Por Mês' : '💵 Valor Livre'}
                </span>
              </div>
              <p className="text-xs text-emerald-200/90 mt-0.5">
                Receba pagamentos avulsos ou quite o consumo de um mês específico
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Controles de Subir/Descer Janela */}
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
              type="button"
              onClick={onClose}
              className="text-white/80 hover:text-white p-1.5 rounded-xl hover:bg-white/15 transition cursor-pointer"
              title="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 overflow-y-auto">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-300 rounded-xl text-rose-900 text-xs font-bold flex items-center gap-2 animate-in fade-in">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Seleção do Cliente */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-700">
                Cliente que está pagando *
              </label>
              {onOpenNewCustomer && (
                <button
                  type="button"
                  onClick={onOpenNewCustomer}
                  className="text-xs font-bold text-emerald-700 hover:text-emerald-900 flex items-center gap-1 transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Cadastrar Novo</span>
                </button>
              )}
            </div>
            <select
              value={customerId}
              onChange={(e) => {
                setCustomerId(e.target.value);
                setSelectedMonthKey('');
                setSelectedMonthLabel('');
                setAmount('');
              }}
              required
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-800 bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-bold"
            >
              {customers.map((c) => {
                const cDebt = StorageService.getCustomerDebt(c.id).totalDebt;
                return (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.nickname ? `(${c.nickname})` : ''} — Saldo Devedor: R$ {formatCurrency(cDebt)}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Abas de Modo: "Valor Livre / Avulso" vs "Receber por Mês" */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-2xl border border-slate-200">
            <button
              type="button"
              onClick={() => setPaymentMode('free')}
              className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                paymentMode === 'free'
                  ? 'bg-white text-emerald-900 shadow-sm font-black'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <DollarSign className="w-4 h-4 text-emerald-700" />
              <span>Valor Livre / Avulso</span>
            </button>
            <button
              type="button"
              onClick={() => setPaymentMode('monthly')}
              className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                paymentMode === 'monthly'
                  ? 'bg-emerald-700 text-white shadow-sm font-black'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span>Receber por Mês</span>
            </button>
          </div>

          {/* MODO 1: RECEBER POR MÊS (SELEÇÃO DO MÊS) */}
          {paymentMode === 'monthly' && (
            <div className="p-4 bg-teal-50/70 border-2 border-teal-300/80 rounded-2xl space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-teal-950 flex items-center gap-1.5 uppercase tracking-wider">
                  <Calendar className="w-4 h-4 text-teal-700" />
                  Escolha o Mês para Fechamento
                </span>
                <span className="text-[10px] bg-teal-200 text-teal-900 font-black px-2 py-0.5 rounded-full">
                  {monthlyGroups.filter((g) => g.remainingAmount > 0).length} Mês(es) com Débito
                </span>
              </div>

              {monthlyGroups.length === 0 ? (
                <div className="p-4 bg-white rounded-xl text-center text-slate-500 text-xs">
                  Este cliente não possui nenhum lançamento de consumo registrado.
                </div>
              ) : (
                <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                  {monthlyGroups.map((grp) => {
                    const isSelected = selectedMonthKey === grp.monthKey;
                    return (
                      <div
                        key={grp.monthKey}
                        onClick={() => handleSelectMonth(grp)}
                        className={`p-3 rounded-xl border-2 transition cursor-pointer flex items-center justify-between gap-3 ${
                          isSelected
                            ? 'bg-white border-emerald-600 shadow-sm'
                            : grp.remainingAmount > 0
                            ? 'bg-white/90 border-teal-200 hover:border-teal-400'
                            : 'bg-slate-50/80 border-slate-200 opacity-70'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                              isSelected
                                ? 'bg-emerald-600 text-white'
                                : grp.remainingAmount > 0
                                ? 'bg-teal-100 text-teal-800'
                                : 'bg-slate-200 text-slate-600'
                            }`}
                          >
                            {isSelected ? (
                              <Check className="w-4 h-4 stroke-[3]" />
                            ) : (
                              <Calendar className="w-3.5 h-3.5" />
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-black text-slate-900">
                                {grp.label}
                              </span>
                              <span className="text-[10px] text-slate-500">
                                ({grp.entries.length} compras)
                              </span>
                            </div>
                            <span className="text-[11px] text-slate-500 block">
                              Total consumido: R$ {formatCurrency(grp.totalAmount)}
                            </span>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-[10px] text-slate-500 block uppercase font-bold">
                            {grp.remainingAmount > 0 ? 'Em Aberto' : 'Quitado'}
                          </span>
                          <span
                            className={`text-sm font-black ${
                              grp.remainingAmount > 0 ? 'text-rose-600' : 'text-emerald-700'
                            }`}
                          >
                            R$ {formatCurrency(grp.remainingAmount)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Saldo Geral Atual do Cliente */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-500 block font-medium">
                {debtInfo?.creditBalance && debtInfo.creditBalance > 0
                  ? 'Crédito Antecipado a Favor'
                  : 'Saldo Devedor Total do Cliente'}
              </span>
              <span
                className={`text-lg font-black ${
                  debtInfo?.creditBalance && debtInfo.creditBalance > 0
                    ? 'text-emerald-700'
                    : totalDebt > 0
                    ? 'text-rose-600'
                    : 'text-slate-700'
                }`}
              >
                {debtInfo?.creditBalance && debtInfo.creditBalance > 0
                  ? `+ R$ ${formatCurrency(debtInfo.creditBalance)}`
                  : `R$ ${formatCurrency(totalDebt)}`}
              </span>
            </div>
            {totalDebt > 0 ? (
              <button
                type="button"
                onClick={() => handleSelectQuickAmount(totalDebt)}
                className="px-3 py-1.5 rounded-xl bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-xs font-bold transition cursor-pointer shadow-2xs active:scale-95"
              >
                Quitar Conta Toda
              </button>
            ) : (
              <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-xl">
                Pagamento Antecipado
              </span>
            )}
          </div>

          {/* Atalhos de Meses em Aberto quando no modo livre */}
          {paymentMode === 'free' && monthlyGroups.filter((g) => g.remainingAmount > 0).length > 0 && (
            <div className="space-y-1">
              <span className="text-[11px] font-bold text-slate-600 block">
                Atalhos rápidos por mês em aberto:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {monthlyGroups
                  .filter((g) => g.remainingAmount > 0)
                  .map((grp) => (
                    <button
                      key={grp.monthKey}
                      type="button"
                      onClick={() => {
                        handleSelectMonth(grp);
                        setPaymentMode('monthly');
                      }}
                      className="px-2.5 py-1 rounded-xl border border-teal-300 bg-teal-50 hover:bg-teal-100 text-teal-900 text-xs font-bold transition flex items-center gap-1 cursor-pointer active:scale-95"
                    >
                      <Calendar className="w-3 h-3 text-teal-700" />
                      <span>
                        Pagar {grp.label}: <strong>R$ {formatCurrency(grp.remainingAmount)}</strong>
                      </span>
                    </button>
                  ))}
              </div>
            </div>
          )}

          {/* Valor Recebido */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Valor Recebido (R$) *
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-2.5 text-base font-black text-emerald-700">
                R$
              </span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                placeholder="0,00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full rounded-xl border border-slate-300 pl-11 pr-3.5 py-2.5 text-lg font-black text-slate-900 placeholder-slate-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 bg-white"
              />
            </div>

            {/* Aviso de Crédito Antecipado */}
            {parseFloat(amount.replace(',', '.')) > totalDebt && (
              <div className="mt-2 p-2.5 rounded-xl bg-emerald-50 border border-emerald-300 text-[11px] text-emerald-900 font-medium">
                💡 O valor informado quitará toda a dívida e deixará{' '}
                <strong>
                  R${' '}
                  {formatCurrency(
                    parseFloat(amount.replace(',', '.')) -
                      totalDebt +
                      (debtInfo?.creditBalance || 0)
                  )}
                </strong>{' '}
                em <strong>Crédito Antecipado</strong> para as próximas marmitas deste cliente!
              </div>
            )}
          </div>

          {/* Data do Pagamento */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-emerald-700" />
              Data em que foi Recebido *
            </label>
            <input
              type="date"
              required
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold text-slate-800 bg-white focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Atalhos de valor rápido (Modo Livre) */}
          {paymentMode === 'free' && totalDebt > 0 && (
            <div className="flex flex-wrap gap-2">
              {totalDebt > 10 && (
                <button
                  type="button"
                  onClick={() => handleSelectQuickAmount(totalDebt / 2)}
                  className="px-2.5 py-1 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200 transition cursor-pointer"
                >
                  Metade (50%)
                </button>
              )}
              <button
                type="button"
                onClick={() => handleSelectQuickAmount(20)}
                className="px-2.5 py-1 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200 transition cursor-pointer"
              >
                R$ 20
              </button>
              <button
                type="button"
                onClick={() => handleSelectQuickAmount(50)}
                className="px-2.5 py-1 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200 transition cursor-pointer"
              >
                R$ 50
              </button>
              <button
                type="button"
                onClick={() => handleSelectQuickAmount(100)}
                className="px-2.5 py-1 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200 transition cursor-pointer"
              >
                R$ 100
              </button>
            </div>
          )}

          {/* Forma de Pagamento */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">
              Forma de Pagamento
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setMethod('cash')}
                className={`py-2 px-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition cursor-pointer ${
                  method === 'cash'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-900 shadow-2xs'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Banknote className="w-4 h-4 text-emerald-600" />
                <span>Dinheiro</span>
              </button>

              <button
                type="button"
                onClick={() => setMethod('pix')}
                className={`py-2 px-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition cursor-pointer ${
                  method === 'pix'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-900 shadow-2xs'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <QrCode className="w-4 h-4 text-emerald-600" />
                <span>PIX</span>
              </button>

              <button
                type="button"
                onClick={() => setMethod('card_debit')}
                className={`py-2 px-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition cursor-pointer ${
                  method === 'card_debit'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-900 shadow-2xs'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <CreditCard className="w-4 h-4 text-emerald-600" />
                <span>Cartão</span>
              </button>
            </div>
          </div>

          {/* Observação */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Observação / Recibo (opcional)
            </label>
            <input
              type="text"
              placeholder="Ex: Acerto referente ao mês de Outubro ou Deixou com a atendente"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 bg-white"
            />
          </div>

          {/* Enviar comprovante por WhatsApp */}
          <div className="pt-2 border-t border-slate-100">
            <label className="flex items-center gap-3 p-3 bg-emerald-50 rounded-2xl border border-emerald-200 cursor-pointer">
              <input
                type="checkbox"
                checked={sendWhatsApp}
                onChange={(e) => setSendWhatsApp(e.target.checked)}
                className="w-4 h-4 text-emerald-600 rounded-sm focus:ring-emerald-500"
              />
              <div className="text-xs">
                <span className="font-bold text-emerald-900 block">
                  Enviar Recibo por WhatsApp com saldo atualizado
                </span>
                <span className="text-emerald-700">
                  O cliente recebe a confirmação do pagamento e o saldo restante
                </span>
              </div>
            </label>
          </div>

          <div className="pt-2 flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 text-xs transition cursor-pointer active:scale-95"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 rounded-xl bg-emerald-700 hover:bg-emerald-800 active:scale-95 text-white font-black py-2.5 text-xs shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
              {paymentMode === 'monthly' && selectedMonthKey
                ? `Confirmar Pagamento (${selectedMonthLabel || selectedMonthKey})`
                : 'Confirmar Pagamento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

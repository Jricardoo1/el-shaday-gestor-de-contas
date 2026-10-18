import React, { useState } from 'react';
import {
  X,
  CreditCard,
  DollarSign,
  Check,
  AlertTriangle,
  Send,
  Calendar,
  Sparkles,
  UtensilsCrossed,
  Wallet,
  Plus,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { Customer, PaymentRecord, StoreSettings } from '../types';
import { StorageService, getRelativeDateString } from '../services/storage';

interface PrepaidCreditModalProps {
  customers: Customer[];
  selectedCustomerId?: string;
  settings: StoreSettings;
  onClose: () => void;
  onSaveCredit: (payment: PaymentRecord, openWhatsAppReceipt?: boolean) => void;
  onOpenNewCustomer?: () => void;
}

export const PrepaidCreditModal: React.FC<PrepaidCreditModalProps> = ({
  customers,
  selectedCustomerId,
  settings,
  onClose,
  onSaveCredit,
  onOpenNewCustomer,
}) => {
  const [customerId, setCustomerId] = useState(selectedCustomerId || (customers[0]?.id || ''));
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<'pix' | 'cash' | 'card_debit' | 'card_credit' | 'other'>('pix');
  const [date, setDate] = useState(getRelativeDateString(0));
  const [notes, setNotes] = useState('Crédito antecipado para consumo de marmitas');
  const [sendWhatsApp, setSendWhatsApp] = useState(true);
  const [error, setError] = useState('');

  const selectedCustomer = customers.find((c) => c.id === customerId);
  const debtInfo = customerId ? StorageService.getCustomerDebt(customerId) : null;
  const currentCredit = debtInfo?.creditBalance || 0;
  const currentDebt = debtInfo?.totalDebt || 0;

  // Preço base da marmitex configurada para calcular planos rápidos
  const defaultMarmita = settings.products?.find((p) => p.category === 'marmitex') || { price: 25 };
  const unitPrice = defaultMarmita.price || 25;

  const handleSelectPlan = (marmitaCount: number, label: string) => {
    const total = marmitaCount * unitPrice;
    setAmount(total.toFixed(2));
    setNotes(`Crédito antecipado de ${marmitaCount} marmitas (${label})`);
  };

  const handleSelectQuickMoney = (val: number) => {
    setAmount(val.toFixed(2));
  };

  const numAmount = parseFloat(amount.replace(',', '.')) || 0;
  const simulatedNewCredit = currentCredit + numAmount;
  const simulatedMarmitas = Math.floor(simulatedNewCredit / (unitPrice || 25));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!customerId) {
      setError('Por favor selecione um cliente.');
      return;
    }

    if (numAmount <= 0) {
      setError('Informe um valor de crédito válido maior que zero.');
      return;
    }

    const payment: PaymentRecord = {
      id: 'pay_cred_' + Date.now(),
      customerId,
      amount: numAmount,
      date,
      method,
      receiptNumber: 'CRED-' + Math.floor(1000 + Math.random() * 9000),
      notes: notes.trim() || 'Crédito antecipado para consumo de marmitas',
      createdAt: new Date().toISOString(),
      isPrepaidCredit: true,
    };

    onSaveCredit(payment, sendWhatsApp);
    onClose();
  };

  const [verticalPosition, setVerticalPosition] = useState<'top' | 'center' | 'bottom'>('center');
  const positionClass =
    verticalPosition === 'top'
      ? 'items-start pt-3 sm:pt-6'
      : verticalPosition === 'bottom'
      ? 'items-end pb-3 sm:pb-6'
      : 'items-center';

  return (
    <div className={`fixed inset-0 z-60 flex justify-center bg-black/65 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto transition-all duration-300 ${positionClass}`}>
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-emerald-800 p-5 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-700 border border-emerald-500 flex items-center justify-center text-amber-300 font-bold shrink-0">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold">Lançar Crédito Antecipado</h2>
                <span className="text-[10px] bg-amber-400 text-slate-950 font-black px-2 py-0.5 rounded-full uppercase">
                  Pré-Pago
                </span>
              </div>
              <p className="text-xs text-emerald-200">
                Receba o pagamento adiantado e abata marmitas automaticamente
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {/* Opções de Subir ou Descer a Janela para organização do layout */}
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
              className="text-white/80 hover:text-white p-1.5 rounded-lg hover:bg-white/10"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Seleção do Cliente */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-700">
                Cliente que está pagando antecipadamente *
              </label>
              {onOpenNewCustomer && (
                <button
                  type="button"
                  onClick={onOpenNewCustomer}
                  className="text-xs font-bold text-emerald-700 hover:text-emerald-900 flex items-center gap-1 transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Cadastrar Novo</span>
                </button>
              )}
            </div>
            <select
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              required
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm font-semibold text-slate-900 bg-white focus:ring-2 focus:ring-emerald-500"
            >
              {customers.map((c) => {
                const cDebt = StorageService.getCustomerDebt(c.id);
                return (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.nickname ? `(${c.nickname})` : ''} —{' '}
                    {cDebt.creditBalance > 0
                      ? `[Crédito: R$ ${cDebt.creditBalance.toFixed(2)}]`
                      : cDebt.totalDebt > 0
                      ? `[Débito: R$ ${cDebt.totalDebt.toFixed(2)}]`
                      : '[Saldo Zerado]'}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Status Atual do Cliente */}
          <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs">
            <div>
              <span className="text-slate-500 text-[11px] block">Crédito Atual Disponível:</span>
              <span className="text-base font-black text-emerald-700">
                R$ {currentCredit.toFixed(2)}
              </span>
            </div>
            <div>
              <span className="text-slate-500 text-[11px] block">Débitos em Aberto:</span>
              <span
                className={`text-base font-black ${
                  currentDebt > 0 ? 'text-rose-600' : 'text-slate-700'
                }`}
              >
                R$ {currentDebt.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Planos Rápidos de Marmitas Antecipadas */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <UtensilsCrossed className="w-3.5 h-3.5 text-emerald-700" />
                Planos Rápidos de Marmitex Pré-paga:
              </label>
              <span className="text-[10px] text-slate-500">
                Base: R$ {unitPrice.toFixed(2)} / marmita
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleSelectPlan(22, 'Mês Completo')}
                className="p-2.5 rounded-xl border border-emerald-300 bg-emerald-50/70 hover:bg-emerald-100 text-emerald-950 text-left transition flex flex-col justify-between"
              >
                <span className="text-[10px] font-bold text-emerald-700 uppercase">1 Mês</span>
                <span className="text-xs font-black text-slate-900 mt-0.5">22 Marmitas</span>
                <span className="text-[11px] font-black text-emerald-800">
                  R$ {(22 * unitPrice).toFixed(2)}
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleSelectPlan(11, 'Quinzena')}
                className="p-2.5 rounded-xl border border-emerald-300 bg-emerald-50/70 hover:bg-emerald-100 text-emerald-950 text-left transition flex flex-col justify-between"
              >
                <span className="text-[10px] font-bold text-emerald-700 uppercase">Quinzena</span>
                <span className="text-xs font-black text-slate-900 mt-0.5">11 Marmitas</span>
                <span className="text-[11px] font-black text-emerald-800">
                  R$ {(11 * unitPrice).toFixed(2)}
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleSelectPlan(5, '1 Semana')}
                className="p-2.5 rounded-xl border border-emerald-300 bg-emerald-50/70 hover:bg-emerald-100 text-emerald-950 text-left transition flex flex-col justify-between"
              >
                <span className="text-[10px] font-bold text-emerald-700 uppercase">1 Semana</span>
                <span className="text-xs font-black text-slate-900 mt-0.5">5 Marmitas</span>
                <span className="text-[11px] font-black text-emerald-800">
                  R$ {(5 * unitPrice).toFixed(2)}
                </span>
              </button>
            </div>
          </div>

          {/* Atalhos de Valores em Dinheiro */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-bold text-slate-500 mr-1">Valores livres:</span>
            {[100, 200, 300, 500, 1000].map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => handleSelectQuickMoney(v)}
                className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 hover:bg-emerald-50 hover:text-emerald-800 text-slate-700 border border-slate-200 transition"
              >
                R$ {v}
              </button>
            ))}
          </div>

          {/* Valor Recebido */}
          <div>
            <label className="text-xs font-bold text-slate-800 block mb-1">
              Valor Recebido do Cliente (R$) *
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-2.5 text-base font-bold text-emerald-700">
                R$
              </span>
              <input
                type="number"
                step="0.01"
                required
                autoFocus
                placeholder="0,00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full rounded-xl border border-slate-300 pl-11 pr-3.5 py-2.5 text-xl font-black text-slate-900 placeholder-slate-300 focus:ring-2 focus:ring-emerald-500 bg-white"
              />
            </div>
          </div>

          {/* Resumo visual do Novo Saldo */}
          {numAmount > 0 && (
            <div className="p-3 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl text-white shadow-md space-y-1">
              <div className="flex items-center justify-between text-xs opacity-90">
                <span>Novo Saldo Total de Crédito:</span>
                <span>Equivalente aprox.</span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-black">
                  R$ {simulatedNewCredit.toFixed(2)}
                </span>
                <span className="text-sm font-bold bg-white/20 px-2 py-0.5 rounded-lg">
                  ~ {simulatedMarmitas} marmitas
                </span>
              </div>
              <p className="text-[11px] text-emerald-100 pt-0.5">
                Cada marmita que o cliente pegar será abatida automaticamente deste saldo até zerar.
              </p>
            </div>
          )}

          {/* Forma de Pagamento */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Como o cliente pagou o adiantamento? *
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {[
                { id: 'pix', label: 'PIX', icon: '⚡' },
                { id: 'cash', label: 'Dinheiro', icon: '💵' },
                { id: 'card_debit', label: 'Débito', icon: '💳' },
                { id: 'card_credit', label: 'Crédito', icon: '💳' },
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMethod(m.id as any)}
                  className={`py-2 px-2 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                    method === m.id
                      ? 'bg-emerald-700 text-white border-emerald-700 shadow-2xs'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <span>{m.icon}</span>
                  <span>{m.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Data e Observações */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Data do Recebimento
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 bg-white focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Observação / Detalhe
              </label>
              <input
                type="text"
                placeholder="Ex: Marmitas do mês de Outubro"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-300 text-xs text-slate-800 bg-white focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Enviar comprovante via WhatsApp */}
          <div className="pt-1">
            <label className="flex items-center gap-3 p-3 bg-emerald-50 rounded-xl border border-emerald-200 cursor-pointer">
              <input
                type="checkbox"
                checked={sendWhatsApp}
                onChange={(e) => setSendWhatsApp(e.target.checked)}
                className="w-4 h-4 text-emerald-600 rounded-sm focus:ring-emerald-500"
              />
              <div className="text-xs">
                <span className="font-bold text-emerald-900 block">
                  Enviar Comprovante de Crédito Antecipado no WhatsApp
                </span>
                <span className="text-emerald-700">
                  O cliente recebe a confirmação com o valor pago e o saldo credor disponível
                </span>
              </div>
            </label>
          </div>

          {/* Botões de Ação */}
          <div className="pt-2 flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-3 text-sm transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-3 text-sm shadow-md transition flex items-center justify-center gap-2 active:scale-95"
            >
              <Check className="w-4 h-4" />
              Confirmar Crédito
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { X, DollarSign, CheckCircle2, CreditCard, Banknote, QrCode, AlertTriangle, Plus, ArrowUp, ArrowDown } from 'lucide-react';
import { Customer, PaymentRecord } from '../types';
import { StorageService, getRelativeDateString } from '../services/storage';

interface NewPaymentModalProps {
  customers: Customer[];
  selectedCustomerId?: string;
  onClose: () => void;
  onSavePayment: (payment: PaymentRecord, openWhatsAppReceipt?: boolean) => void;
  onOpenNewCustomer?: () => void;
}

export const NewPaymentModal: React.FC<NewPaymentModalProps> = ({
  customers,
  selectedCustomerId,
  onClose,
  onSavePayment,
  onOpenNewCustomer,
}) => {
  const [customerId, setCustomerId] = useState(selectedCustomerId || (customers[0]?.id || ''));
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<'pix' | 'cash' | 'card_debit' | 'card_credit' | 'other'>('cash');
  const [notes, setNotes] = useState('');
  const [sendWhatsApp, setSendWhatsApp] = useState(true);
  const [error, setError] = useState('');

  const debtInfo = customerId ? StorageService.getCustomerDebt(customerId) : null;
  const totalDebt = debtInfo?.totalDebt || 0;

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
      setError('Informe um valor de pagamento válido.');
      return;
    }

    const payment: PaymentRecord = {
      id: 'pay_' + Date.now(),
      customerId,
      amount: val,
      date: getRelativeDateString(0),
      method,
      receiptNumber: 'REC-' + Math.floor(1000 + Math.random() * 9000),
      notes: notes.trim() || undefined,
      createdAt: new Date().toISOString(),
    };

    onSavePayment(payment, sendWhatsApp);
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
    <div className={`fixed inset-0 z-50 flex justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto transition-all duration-300 ${positionClass}`}>
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="bg-emerald-800 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-emerald-300" />
            <div>
              <h2 className="text-base font-bold">Registrar Pagamento / Acerto</h2>
              <p className="text-xs text-emerald-200">Abatimento ou quitação da conta cliente</p>
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
              onClick={onClose}
              className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Selecionar Cliente */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-700">
                Cliente que está pagando *
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
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-800 bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-medium"
            >
              {customers.map((c) => {
                const cDebt = StorageService.getCustomerDebt(c.id).totalDebt;
                return (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.nickname ? `(${c.nickname})` : ''} — Saldo: R$ {cDebt.toFixed(2)}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Saldo em aberto atual */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-500 block">
                {debtInfo?.creditBalance && debtInfo.creditBalance > 0
                  ? 'Crédito Antecipado Atual'
                  : 'Saldo Total em Aberto'}
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
                  ? `+ R$ ${debtInfo.creditBalance.toFixed(2)} (A favor)`
                  : `R$ ${totalDebt.toFixed(2)}`}
              </span>
            </div>
            {totalDebt > 0 ? (
              <button
                type="button"
                onClick={() => handleSelectQuickAmount(totalDebt)}
                className="px-3 py-1.5 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-xs font-bold transition"
              >
                Quitar Total
              </button>
            ) : (
              <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-lg">
                Pagamento Antecipado
              </span>
            )}
          </div>

          {/* Valor do Pagamento */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Valor Recebido (R$) *
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
                className="w-full rounded-xl border border-slate-300 pl-11 pr-3.5 py-2.5 text-lg font-black text-slate-900 placeholder-slate-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Aviso de Crédito Antecipado Gerado */}
            {parseFloat(amount.replace(',', '.')) > totalDebt && (
              <div className="mt-2 p-2 rounded-xl bg-emerald-50 border border-emerald-300 text-[11px] text-emerald-900 font-medium">
                💡 O valor informado quitará toda a conta e deixará{' '}
                <strong>
                  R${' '}
                  {(
                    parseFloat(amount.replace(',', '.')) -
                    totalDebt +
                    (debtInfo?.creditBalance || 0)
                  ).toFixed(2)}
                </strong>{' '}
                em <strong>Crédito Antecipado</strong> para as próximas marmitas deste cliente!
              </div>
            )}
          </div>

          {/* Atalhos de valor rápido */}
          {totalDebt > 0 && (
            <div className="flex flex-wrap gap-2">
              {totalDebt > 10 && (
                <button
                  type="button"
                  onClick={() => handleSelectQuickAmount(totalDebt / 2)}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200"
                >
                  Metade (50%)
                </button>
              )}
              <button
                type="button"
                onClick={() => handleSelectQuickAmount(20)}
                className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200"
              >
                R$ 20
              </button>
              <button
                type="button"
                onClick={() => handleSelectQuickAmount(50)}
                className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200"
              >
                R$ 50
              </button>
              <button
                type="button"
                onClick={() => handleSelectQuickAmount(100)}
                className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200"
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
                className={`py-2 px-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition ${
                  method === 'cash'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-800'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Banknote className="w-4 h-4 text-emerald-600" />
                <span>Dinheiro</span>
              </button>

              <button
                type="button"
                onClick={() => setMethod('pix')}
                className={`py-2 px-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition ${
                  method === 'pix'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-800'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <QrCode className="w-4 h-4 text-emerald-600" />
                <span>PIX</span>
              </button>

              <button
                type="button"
                onClick={() => setMethod('card_debit')}
                className={`py-2 px-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition ${
                  method === 'card_debit'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-800'
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
              placeholder="Ex: Deixou com a atendente do caixa"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Enviar comprovante por WhatsApp */}
          <div className="pt-2 border-t border-slate-100">
            <label className="flex items-center gap-3 p-3 bg-emerald-50 rounded-xl border border-emerald-200 cursor-pointer">
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
              className="flex-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2.5 text-sm transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-2.5 text-sm shadow-md transition flex items-center justify-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              Confirmar Pagamento
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

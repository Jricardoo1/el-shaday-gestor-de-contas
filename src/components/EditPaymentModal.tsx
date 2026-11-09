import React, { useState } from 'react';
import {
  X,
  DollarSign,
  CheckCircle2,
  CreditCard,
  Banknote,
  QrCode,
  AlertTriangle,
  Calendar,
  Trash2,
  FileText,
  ArrowUp,
  ArrowDown,
  User,
  Clock,
} from 'lucide-react';
import { Customer, PaymentRecord } from '../types';
import { formatCurrency, getRelativeDateString } from '../services/storage';
import { ConfirmModal } from './ConfirmModal';

interface EditPaymentModalProps {
  payment: PaymentRecord;
  customer?: Customer;
  onClose: () => void;
  onSavePayment: (payment: PaymentRecord) => void;
  onDeletePayment: (paymentId: string) => void;
}

export const EditPaymentModal: React.FC<EditPaymentModalProps> = ({
  payment,
  customer,
  onClose,
  onSavePayment,
  onDeletePayment,
}) => {
  const [amount, setAmount] = useState(payment.amount.toFixed(2));
  const [date, setDate] = useState(payment.date || getRelativeDateString(0));
  const [method, setMethod] = useState<PaymentRecord['method']>(payment.method || 'cash');
  const [receiptNumber, setReceiptNumber] = useState(payment.receiptNumber || '');
  const [notes, setNotes] = useState(payment.notes || '');
  const [targetMonth, setTargetMonth] = useState(payment.targetMonth || '');
  const [targetMonthLabel, setTargetMonthLabel] = useState(payment.targetMonthLabel || '');
  const [error, setError] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [verticalPosition, setVerticalPosition] = useState<'top' | 'center' | 'bottom'>('center');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const val = parseFloat(amount.replace(',', '.'));
    if (isNaN(val) || val <= 0) {
      setError('Informe um valor de pagamento válido maior que zero.');
      return;
    }

    if (!date) {
      setError('Informe a data do recebimento.');
      return;
    }

    const updated: PaymentRecord = {
      ...payment,
      amount: val,
      date,
      method,
      receiptNumber: receiptNumber.trim() || payment.receiptNumber,
      notes: notes.trim() || undefined,
      targetMonth: targetMonth || undefined,
      targetMonthLabel: targetMonthLabel || undefined,
      updatedAt: new Date().toISOString(),
    };

    onSavePayment(updated);
    onClose();
  };

  const handleConfirmDelete = () => {
    onDeletePayment(payment.id);
    setShowDeleteConfirm(false);
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
      <div className="w-full max-w-lg rounded-3xl bg-white shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header do Modal com Controles de Posição */}
        <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 px-5 sm:px-6 py-4 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-emerald-300 shadow-inner">
              <DollarSign className="w-5 h-5 text-emerald-200" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-black tracking-tight">Editar Recebimento</h2>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 px-2 py-0.5 rounded-full font-bold">
                  {payment.receiptNumber || 'Comprovante'}
                </span>
              </div>
              <p className="text-xs text-emerald-200/90 mt-0.5">
                Altere valor, data, forma de pagamento ou corrija o lançamento
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

        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 max-h-[82vh] overflow-y-auto">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-300 rounded-xl text-rose-900 text-xs font-bold flex items-center gap-2 animate-in fade-in">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Dados do Cliente */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-black text-xs">
                <User className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">
                  Cliente Associado
                </span>
                <span className="text-sm font-black text-slate-900">
                  {customer?.name || 'Cliente'} {customer?.nickname ? `(${customer.nickname})` : ''}
                </span>
              </div>
            </div>

            {payment.targetMonthLabel && (
              <span className="text-[11px] font-black px-2.5 py-1 rounded-xl bg-teal-100 text-teal-900 border border-teal-200">
                📅 Mês: {payment.targetMonthLabel}
              </span>
            )}
          </div>

          {/* Campo: Valor Recebido */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Valor do Pagamento Recebido (R$) *
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
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full rounded-xl border border-slate-300 pl-11 pr-3.5 py-2.5 text-lg font-black text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 bg-white"
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              💡 Ao salvar um novo valor, o saldo do cliente e os fiados pendentes são recalculados automaticamente.
            </p>
          </div>

          {/* Grid: Data do Pagamento e Número do Recibo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-emerald-700" />
                Data em que foi Recebido *
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold text-slate-800 bg-white focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-emerald-700" />
                Número do Recibo / Comprovante
              </label>
              <input
                type="text"
                placeholder="Ex: REC-1049"
                value={receiptNumber}
                onChange={(e) => setReceiptNumber(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-mono font-bold text-slate-800 bg-white focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Forma de Pagamento */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">
              Forma de Pagamento
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
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
                <span>Débito</span>
              </button>

              <button
                type="button"
                onClick={() => setMethod('card_credit')}
                className={`py-2 px-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition cursor-pointer ${
                  method === 'card_credit'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-900 shadow-2xs'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <CreditCard className="w-4 h-4 text-purple-600" />
                <span>Crédito</span>
              </button>
            </div>
          </div>

          {/* Observação / Notas */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Observações / Notas do Recebimento (opcional)
            </label>
            <input
              type="text"
              placeholder="Ex: Acerto referente ao mês de Outubro ou Deixou com a atendente"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 bg-white"
            />
          </div>

          {/* Botões de Ação */}
          <div className="pt-3 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
              title="Excluir este recebimento e devolver o débito à conta do cliente"
            >
              <Trash2 className="w-4 h-4 text-rose-600" />
              <span>Excluir Recebimento</span>
            </button>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-bold transition cursor-pointer active:scale-95"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 active:scale-95 text-white text-xs font-black shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                Salvar Alterações
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Modal de Confirmação para Excluir Pagamento */}
      <ConfirmModal
        isOpen={showDeleteConfirm}
        title="Excluir Pagamento e Estornar Saldo"
        message={`Deseja realmente excluir este pagamento de R$ ${formatCurrency(payment.amount)} (${payment.receiptNumber})? O valor será estornado e voltará integralmente para a ficha e saldo devedor do cliente.`}
        confirmLabel="Sim, Excluir e Voltar Saldo"
        isDestructive={true}
        onConfirm={handleConfirmDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </div>
  );
};

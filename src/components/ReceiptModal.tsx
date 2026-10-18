import React, { useState } from 'react';
import { X, Printer, Send, CheckCircle2, Store, ArrowUp, ArrowDown } from 'lucide-react';
import jsPDF from 'jspdf';
import { Customer, FiadoEntry, PaymentRecord, StoreSettings } from '../types';
import { StorageService } from '../services/storage';

interface ReceiptModalProps {
  customer: Customer;
  settings: StoreSettings;
  entry?: FiadoEntry | null;
  payment?: PaymentRecord | null;
  onClose: () => void;
  onSendWhatsApp: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  customer,
  settings,
  entry,
  payment,
  onClose,
  onSendWhatsApp,
}) => {
  const debtInfo = StorageService.getCustomerDebt(customer.id);
  const now = new Date();
  const [isPrinting, setIsPrinting] = useState(false);
  const [verticalPosition, setVerticalPosition] = useState<'top' | 'center' | 'bottom'>('center');

  const handlePrintReceipt = () => {
    try {
      setIsPrinting(true);
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [80, 140],
      });

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text(settings.storeName || 'ESTABELECIMENTO', 40, 8, { align: 'center' });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.text(settings.phone ? `Whats: ${settings.phone}` : 'Controle de Fiados', 40, 13, { align: 'center' });
      doc.text(`Data: ${now.toLocaleDateString('pt-BR')} ${now.toLocaleTimeString('pt-BR')}`, 40, 17, { align: 'center' });
      doc.line(5, 20, 75, 20);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.text(`CLIENTE: ${customer.name}`, 6, 25);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      if (entry) {
        doc.text(`Consumo: ${entry.description}`, 6, 30);
        doc.text(`Vencimento: ${entry.dueDate || '-'}`, 6, 35);
        doc.line(5, 38, 75, 38);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.text(`VALOR: R$ ${entry.amount.toFixed(2)}`, 40, 46, { align: 'center' });
      } else if (payment) {
        doc.text(`Recibo: #${payment.receiptNumber}`, 6, 30);
        doc.text(`Forma: ${payment.method.toUpperCase()}`, 6, 35);
        doc.line(5, 38, 75, 38);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.text(`VALOR PAGO: R$ ${payment.amount.toFixed(2)}`, 40, 46, { align: 'center' });
      }

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text(`Saldo em Aberto: R$ ${debtInfo.totalDebt.toFixed(2)}`, 40, 53, { align: 'center' });

      doc.setFontSize(7);
      doc.text('Obrigado pela preferência!', 40, 62, { align: 'center' });

      doc.save(`comprovante_${customer.name.slice(0, 10)}_${now.getTime()}.pdf`);

      try {
        if (typeof window !== 'undefined' && window.print) {
          window.print();
        }
      } catch {}
    } catch (e) {
      console.error('Erro na impressão do recibo:', e);
      try {
        window.print();
      } catch {}
    } finally {
      setIsPrinting(false);
    }
  };

  const positionClass =
    verticalPosition === 'top'
      ? 'items-start pt-3 sm:pt-6'
      : verticalPosition === 'bottom'
      ? 'items-end pb-3 sm:pb-6'
      : 'items-center';

  return (
    <div className={`fixed inset-0 z-50 flex justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto transition-all duration-300 ${positionClass}`}>
      <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="bg-slate-900 px-4 py-3 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Store className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-bold uppercase tracking-wider">
              {payment ? 'Comprovante / Extrato de Quitação' : 'Comprovante de Consumo'}
            </span>
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
            <button onClick={onClose} className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Paper Thermal Receipt Container */}
        <div className="p-6 bg-slate-50">
          <div
            id="printable-receipt"
            className="bg-white p-6 rounded-xl border border-dashed border-slate-300 shadow-sm font-mono text-xs text-slate-800 space-y-4"
          >
            {/* Header */}
            <div className="text-center pb-3 border-b border-dashed border-slate-300">
              <h3 className="font-bold text-sm tracking-wider uppercase text-slate-900">
                {settings.storeName || 'CONTROLE DE FIADO'}
              </h3>
              <p className="text-[10px] text-slate-500">{settings.city || 'BRASIL'}</p>
              <p className="text-[10px] text-slate-500 mt-1">
                Data/Hora: {now.toLocaleDateString('pt-BR')} {now.toLocaleTimeString('pt-BR')}
              </p>
            </div>

            {/* Customer Details */}
            <div className="space-y-0.5 pb-3 border-b border-dashed border-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-500">CLIENTE:</span>
                <span className="font-bold text-right truncate max-w-[170px]">
                  {customer.name}
                </span>
              </div>
              {customer.nickname && (
                <div className="flex justify-between">
                  <span className="text-slate-500">APELIDO:</span>
                  <span>{customer.nickname}</span>
                </div>
              )}
              {customer.phone && (
                <div className="flex justify-between">
                  <span className="text-slate-500">WHATSAPP:</span>
                  <span>{customer.phone}</span>
                </div>
              )}
            </div>

            {/* Specific Transaction */}
            {payment && (
              <div className="space-y-1 pb-3 border-b border-dashed border-slate-300 bg-emerald-50/50 p-2 rounded-lg">
                <div className="text-[11px] font-bold text-emerald-800 text-center uppercase">
                  RECIBO DE PAGAMENTO #{payment.receiptNumber}
                </div>
                <div className="flex justify-between pt-1">
                  <span>FORMA:</span>
                  <span className="font-bold uppercase">{payment.method}</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-emerald-700">
                  <span>VALOR PAGO:</span>
                  <span>R$ {payment.amount.toFixed(2)}</span>
                </div>
              </div>
            )}

            {entry && (
              <div className="space-y-1 pb-3 border-b border-dashed border-slate-300 bg-slate-50 p-2 rounded-lg">
                <div className="text-[11px] font-bold text-slate-800 text-center uppercase">
                  CONSUMO A PRAZO / CONTA CLIENTE
                </div>
                <div className="text-[11px] pt-1 text-slate-700">
                  <strong>ITENS:</strong> {entry.description}
                </div>
                <div className="flex justify-between text-[11px]">
                  <span>VENCIMENTO:</span>
                  <span className="font-bold">
                    {new Date(entry.dueDate + 'T12:00:00').toLocaleDateString('pt-BR')}
                  </span>
                </div>
                <div className="flex justify-between text-sm font-bold text-slate-900 pt-1">
                  <span>VALOR:</span>
                  <span>R$ {entry.amount.toFixed(2)}</span>
                </div>
              </div>
            )}

            {/* Total Balance */}
            <div className="pt-1 text-right space-y-1">
              <div className="flex justify-between text-xs font-semibold text-slate-600">
                <span>SALDO ATUAL:</span>
                <span
                  className={
                    debtInfo.totalDebt > 0 ? 'text-rose-600 font-bold' : 'text-emerald-700 font-bold'
                  }
                >
                  R$ {debtInfo.totalDebt.toFixed(2)}
                </span>
              </div>
              {settings.pixKey && (
                <p className="text-[10px] text-slate-400 text-center pt-2">
                  PIX para pagamento: {settings.pixKey}
                </p>
              )}
            </div>

            <div className="text-center text-[10px] text-slate-400 pt-2 border-t border-dashed border-slate-300">
              Obrigado pela preferência e confiança!
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="bg-white p-4 border-t border-slate-200 flex items-center justify-between gap-2">
          <button
            onClick={handlePrintReceipt}
            disabled={isPrinting}
            className="flex-1 py-2 px-3 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center justify-center gap-1.5 transition active:scale-95"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>{isPrinting ? 'Gerando...' : 'Imprimir'}</span>
          </button>

          <button
            onClick={onSendWhatsApp}
            className="flex-1 py-2 px-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition shadow-sm"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Enviar no Whats</span>
          </button>
        </div>
      </div>
    </div>
  );
};

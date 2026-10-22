import React, { useState } from 'react';
import {
  X,
  FileText,
  Send,
  CheckCircle2,
  Calendar,
  PackageCheck,
} from 'lucide-react';
import { Customer, FiadoEntry, StoreSettings } from '../types';
import { formatDateWithWeekday } from '../services/storage';
import {
  MonthlyClosingBreakdownService,
  ClosingBreakdownData,
} from '../services/monthlyClosingBreakdown';

interface MonthlyBreakdownModalProps {
  customer: Customer;
  settings: StoreSettings;
  entries: FiadoEntry[];
  periodLabel: string;
  onClose: () => void;
}

export const MonthlyBreakdownModal: React.FC<MonthlyBreakdownModalProps> = ({
  customer,
  settings,
  entries,
  periodLabel,
  onClose,
}) => {
  const breakdown: ClosingBreakdownData = MonthlyClosingBreakdownService.parseEntries(
    entries,
    settings.products || []
  );

  const [pdfSuccess, setPdfSuccess] = useState('');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const handleDownloadPdf = () => {
    try {
      setIsGeneratingPdf(true);
      const filename = MonthlyClosingBreakdownService.generatePdfReport(
        customer,
        settings,
        entries,
        periodLabel
      );
      setPdfSuccess(`Extrato gerado em PDF: ${filename}`);
      setTimeout(() => setPdfSuccess(''), 5000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleSendWhatsApp = () => {
    const text = MonthlyClosingBreakdownService.formatWhatsAppText(
      customer,
      settings,
      entries,
      periodLabel
    );
    const cleanPhone = (customer.phone || '').replace(/\D/g, '');
    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const sortedEntries = [...entries].sort((a, b) => (a.date || '').localeCompare(b.date || ''));

  return (
    <div className="fixed inset-0 z-70 flex items-center justify-center bg-black/75 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 flex flex-col max-h-[92vh]">
        {/* Top Header */}
        <div className="bg-emerald-900 p-5 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-emerald-800 border border-emerald-600 flex items-center justify-center text-amber-300 font-bold shrink-0">
              <PackageCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">Extrato de Fechamento</h3>
                <span className="text-[10px] bg-emerald-800 text-emerald-200 px-2 py-0.5 rounded-full font-bold">
                  {periodLabel}
                </span>
              </div>
              <p className="text-xs text-emerald-200 mt-0.5">
                Cliente: <strong>{customer.name}</strong> • Total:{' '}
                <strong className="text-white">R$ {breakdown.totalAmount.toFixed(2)}</strong>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success Alert if PDF generated */}
        {pdfSuccess && (
          <div className="bg-emerald-50 border-b border-emerald-200 px-5 py-2.5 text-xs text-emerald-900 font-bold flex items-center justify-between animate-in fade-in shrink-0">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>{pdfSuccess}</span>
            </div>
            <span className="text-[10px] bg-emerald-200 text-emerald-950 font-bold px-2 py-0.5 rounded-md">
              Download Concluído
            </span>
          </div>
        )}

        {/* Scrollable Content */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1">
          {/* 1. Metric Badges: How many marmitex? How many drinks? Total items */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="bg-emerald-50/80 border border-emerald-200 p-3.5 rounded-2xl text-center">
              <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">
                Total de Marmitas
              </span>
              <div className="text-2xl font-black text-emerald-950 my-0.5">
                {breakdown.categoryTotals.marmitex}
              </div>
              <span className="text-[11px] text-emerald-600 font-medium">unidades de almoço</span>
            </div>

            <div className="bg-blue-50/80 border border-blue-200 p-3.5 rounded-2xl text-center">
              <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider block">
                Total de Bebidas
              </span>
              <div className="text-2xl font-black text-blue-950 my-0.5">
                {breakdown.categoryTotals.bebidas}
              </div>
              <span className="text-[11px] text-blue-600 font-medium">refris, sucos e águas</span>
            </div>

            <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-2xl text-center">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                Total de Produtos
              </span>
              <div className="text-2xl font-black text-slate-800 my-0.5">
                {breakdown.categoryTotals.totalItems}
              </div>
              <span className="text-[11px] text-slate-500 font-medium">itens consumidos</span>
            </div>

            <div className="bg-rose-50/80 border border-rose-200 p-3.5 rounded-2xl text-center">
              <span className="text-[10px] font-bold text-rose-700 uppercase tracking-wider block">
                Valor Total
              </span>
              <div className="text-2xl font-black text-rose-600 my-0.5">
                R$ {breakdown.totalAmount.toFixed(2)}
              </div>
              <span className="text-[11px] text-rose-500 font-medium">
                {entries.length} compras no período
              </span>
            </div>
          </div>

          {/* 2. Chronological Day-by-Day Purchases */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3 shadow-2xs">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-emerald-700" />
                Espelho Cronológico de Compras e Datas ({entries.length} lançamentos)
              </h4>
            </div>

            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {sortedEntries.map((e) => (
                <div
                  key={e.id}
                  className="p-2.5 rounded-xl border border-slate-100 bg-slate-50/60 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="font-mono font-bold text-slate-800 bg-white px-2.5 py-1 rounded-md border border-slate-200 shrink-0 shadow-2xs">
                      {formatDateWithWeekday(e.date)}
                    </span>
                    <span className="text-slate-800 truncate">{e.description}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                        e.status === 'paid'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {e.status === 'paid' ? 'Quitado' : 'Aberto'}
                    </span>
                    <span className="font-bold text-slate-900">R$ {e.amount.toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
              className="py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-2 transition shadow-xs active:scale-95 disabled:opacity-70"
            >
              <FileText className="w-4 h-4 text-amber-400" />
              <span>{isGeneratingPdf ? 'Gerando PDF...' : 'Emitir Extrato em PDF'}</span>
            </button>

            <button
              type="button"
              onClick={handleSendWhatsApp}
              className="py-2.5 px-4 rounded-xl bg-green-600 hover:bg-green-700 text-white text-xs font-bold flex items-center gap-2 transition shadow-xs active:scale-95"
            >
              <Send className="w-4 h-4" />
              <span>Enviar no WhatsApp</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="py-2 px-5 rounded-xl bg-white hover:bg-slate-200 text-slate-700 text-xs font-bold border border-slate-200 transition"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

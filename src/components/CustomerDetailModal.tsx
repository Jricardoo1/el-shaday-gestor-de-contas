import React, { useState, useMemo } from 'react';
import {
  X,
  User,
  Phone,
  MapPin,
  Calendar,
  DollarSign,
  Plus,
  Send,
  Trash2,
  Edit2,
  FileText,
  FileSpreadsheet,
  Share2,
  Download,
  AlertCircle,
  CheckCircle2,
  Check,
  Clock,
  Printer,
  ShoppingBag,
  Building2,
  CheckSquare,
  Square,
  Receipt,
  Sparkles,
  ArrowRight,
  PackageCheck,
  Wallet,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { Customer, FiadoEntry, PaymentRecord, StoreSettings } from '../types';
import { StorageService, getRelativeDateString } from '../services/storage';
import { CustomerPdfGenerator } from '../services/customerPdfGenerator';
import { CustomerExportService } from '../services/customerExportService';
import { ConfirmModal } from './ConfirmModal';
import { MonthlyBreakdownModal } from './MonthlyBreakdownModal';
import { EditFiadoModal } from './EditFiadoModal';
import { getCategoryMeta } from '../constants/categories';

interface CustomerDetailModalProps {
  customer: Customer;
  settings: StoreSettings;
  onClose: () => void;
  onEditCustomer: (customer: Customer) => void;
  onDeleteCustomer: (id: string) => void;
  onNewFiado: (customerId: string) => void;
  onNewPayment: (customerId: string) => void;
  onOpenWhatsApp: (customer: Customer, entry?: FiadoEntry) => void;
  onDeleteEntry: (entryId: string) => void;
  onUpdateEntry?: (entry: FiadoEntry) => void;
  onNewPrepaidCredit?: (customerId: string) => void;
  onOpenCollectionSuggestions?: (customer?: Customer) => void;
}

export const CustomerDetailModal: React.FC<CustomerDetailModalProps> = ({
  customer,
  settings,
  onClose,
  onEditCustomer,
  onDeleteCustomer,
  onNewFiado,
  onNewPayment,
  onOpenWhatsApp,
  onDeleteEntry,
  onUpdateEntry,
  onNewPrepaidCredit,
  onOpenCollectionSuggestions,
}) => {
  const [activeTab, setActiveTab] = useState<'fiados' | 'fechamento_mensal' | 'pagamentos'>('fechamento_mensal');
  const [refreshKey, setRefreshKey] = useState(0);

  const debtInfo = StorageService.getCustomerDebt(customer.id);
  const payments = StorageService.getPayments().filter((p) => p.customerId === customer.id);

  // Fechamento Mensal states
  const availableMonths = useMemo(() => {
    const monthsSet = new Set<string>();
    debtInfo.entries.forEach((e) => {
      if (e.date && e.date.length >= 7) {
        monthsSet.add(e.date.slice(0, 7)); // 'YYYY-MM'
      }
    });
    const arr = Array.from(monthsSet).sort().reverse();
    return arr.length > 0 ? arr : [getRelativeDateString(0).slice(0, 7)];
  }, [debtInfo.entries, refreshKey]);

  const [selectedMonth, setSelectedMonth] = useState<string>(availableMonths[0] || '');
  const [selectedEntryIds, setSelectedEntryIds] = useState<string[]>([]);
  const [showClosingModal, setShowClosingModal] = useState(false);
  const [closingPaymentMethod, setClosingPaymentMethod] = useState<PaymentRecord['method']>('pix');
  const [closingNotes, setClosingNotes] = useState('');
  const [lastClosedPayment, setLastClosedPayment] = useState<PaymentRecord | null>(null);

  // In-app delete confirmation states (replaces window.confirm)
  const [confirmDeleteCustomer, setConfirmDeleteCustomer] = useState(false);
  const [entryToDeleteId, setEntryToDeleteId] = useState<string | null>(null);

  // Breakdown by item modal state
  const [showBreakdownModal, setShowBreakdownModal] = useState(false);

  // Edit fiado entry state
  const [entryToEdit, setEntryToEdit] = useState<FiadoEntry | null>(null);

  const handleSaveEditedEntry = (updated: FiadoEntry) => {
    StorageService.saveFiadoEntry(updated);
    if (onUpdateEntry) {
      onUpdateEntry(updated);
    }
    setRefreshKey((k) => k + 1);
    setEntryToEdit(null);
  };

  // PDF and CSV export generation state
  const [exportSuccessMessage, setExportSuccessMessage] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [verticalPosition, setVerticalPosition] = useState<'top' | 'center' | 'bottom'>('center');
  const canShare = useMemo(() => CustomerExportService.canShareFiles(), []);

  // Inteligência de hábitos de consumo e o que este cliente mais compra
  const categoryAnalytics = useMemo(() => {
    return StorageService.getCustomerCategoryAnalytics(customer.id);
  }, [customer.id, debtInfo.entries, refreshKey]);

  const handleExportPdf = () => {
    try {
      setIsExporting(true);
      const filename = CustomerExportService.downloadCustomerPdf(customer, settings);
      setExportSuccessMessage(`Extrato completo em PDF gerado: ${filename}`);
      setTimeout(() => setExportSuccessMessage(''), 4500);
    } catch (err) {
      console.error('Erro ao gerar relatório em PDF:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportCsv = () => {
    try {
      setIsExporting(true);
      const filename = CustomerExportService.downloadCustomerCsv(customer, settings);
      setExportSuccessMessage(`Planilha CSV exportada com sucesso: ${filename}`);
      setTimeout(() => setExportSuccessMessage(''), 4500);
    } catch (err) {
      console.error('Erro ao exportar CSV:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleShareReport = async (format: 'pdf' | 'csv') => {
    try {
      setIsExporting(true);
      const res = await CustomerExportService.shareOrDownload(customer, settings, format);
      if (res.action === 'shared') {
        setExportSuccessMessage(`Histórico em ${format.toUpperCase()} compartilhado com sucesso!`);
      } else {
        setExportSuccessMessage(`Arquivo ${format.toUpperCase()} baixado: ${res.filename}`);
      }
      setTimeout(() => setExportSuccessMessage(''), 4500);
    } catch (err) {
      console.error('Erro ao compartilhar:', err);
    } finally {
      setIsExporting(false);
    }
  };

  // Month entries
  const monthEntries = useMemo(() => {
    if (selectedMonth === 'all') return debtInfo.entries;
    return debtInfo.entries.filter((e) => e.date.startsWith(selectedMonth));
  }, [debtInfo.entries, selectedMonth, refreshKey]);

  // Unpaid entries of the selected month
  const unpaidMonthEntries = useMemo(() => {
    return monthEntries.filter((e) => e.status !== 'paid');
  }, [monthEntries]);

  // Auto-select unpaid entries when month changes
  const handleSelectAllUnpaidOfMonth = () => {
    const ids = unpaidMonthEntries.map((e) => e.id);
    setSelectedEntryIds(ids);
  };

  const handleDeselectAll = () => {
    setSelectedEntryIds([]);
  };

  const toggleSelectEntry = (id: string) => {
    setSelectedEntryIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Calculate sum of selected entries
  const selectedTotal = useMemo(() => {
    return debtInfo.entries
      .filter((e) => selectedEntryIds.includes(e.id))
      .reduce((acc, e) => acc + Math.max(0, e.amount - e.paidAmount), 0);
  }, [debtInfo.entries, selectedEntryIds, refreshKey]);

  // Entries for the item breakdown modal
  const entriesForBreakdown = useMemo(() => {
    if (selectedEntryIds.length > 0) {
      return debtInfo.entries.filter((e) => selectedEntryIds.includes(e.id));
    }
    return monthEntries;
  }, [selectedEntryIds, debtInfo.entries, monthEntries]);

  const handleExecuteDeleteClient = () => {
    onDeleteCustomer(customer.id);
    setConfirmDeleteCustomer(false);
    onClose();
  };

  const handleExecuteDeleteEntry = () => {
    if (entryToDeleteId) {
      onDeleteEntry(entryToDeleteId);
      setEntryToDeleteId(null);
      setRefreshKey((k) => k + 1);
    }
  };

  const handleConfirmMonthlyClosing = () => {
    if (selectedEntryIds.length === 0) return;

    const result = StorageService.settleMonthlyEntries({
      customerId: customer.id,
      entryIds: selectedEntryIds,
      paymentMethod: closingPaymentMethod,
      notes:
        closingNotes.trim() ||
        `Fechamento mensal (${formatMonthLabel(selectedMonth)}) - ${selectedEntryIds.length} compras de marmitas`,
    });

    setLastClosedPayment(result.payment);
    setShowClosingModal(false);
    setSelectedEntryIds([]);
    setRefreshKey((k) => k + 1);
  };

  const formatMonthLabel = (mStr: string) => {
    if (mStr === 'all') return 'Todas as Compras em Aberto';
    const [year, month] = mStr.split('-');
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
    const mIndex = parseInt(month, 10) - 1;
    return `${months[mIndex] || month} de ${year}`;
  };

  // Send WhatsApp Monthly statement
  const handleSendMonthlyWhatsApp = () => {
    const entriesToReport =
      monthEntries.length > 0 ? monthEntries : debtInfo.entries.slice(0, 10);
    const lines = entriesToReport
      .map((e) => {
        const d = new Date(e.date + 'T12:00:00').toLocaleDateString('pt-BR');
        return `• ${d}: ${e.description} - R$ ${e.amount.toFixed(2)}`;
      })
      .join('\n');

    const totalPeriod = entriesToReport.reduce((acc, e) => acc + e.amount, 0);
    const balanceRemaining = debtInfo.totalDebt;

    const msg = `🍱 *FECHAMENTO MENSAL DE MARMITEX - ${settings.storeName || 'RESTAURANTE'}*\nCliente: *${customer.name}*\nPeríodo: *${formatMonthLabel(selectedMonth)}*\n\n📋 *Detalhamento dos Pedidos por Dia:*\n${lines}\n\n━━━━━━━━━━━━━━━━━━━━\n💰 *Total do Período: R$ ${totalPeriod.toFixed(2)}*\n📊 *Saldo em Aberto a Pagar: R$ ${balanceRemaining.toFixed(2)}*\n\n${
      settings.pixKey ? `🔑 *Chave PIX para Acerto:* ${settings.pixKey}\n\n` : ''
    }Muito obrigado pela parceria e preferência! Bom apetite.`;

    const cleanPhone = (customer.phone || '').replace(/\D/g, '');
    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  const handlePrint = () => {
    handleExportPdf();
  };

  if (entryToEdit) {
    return (
      <EditFiadoModal
        entry={entryToEdit}
        customer={customer}
        products={settings.products}
        onClose={() => setEntryToEdit(null)}
        onSave={handleSaveEditedEntry}
      />
    );
  }

  if (showBreakdownModal) {
    return (
      <MonthlyBreakdownModal
        customer={customer}
        settings={settings}
        entries={entriesForBreakdown}
        periodLabel={
          selectedMonth === 'all'
            ? 'Todas as Compras em Aberto'
            : formatMonthLabel(selectedMonth)
        }
        onClose={() => setShowBreakdownModal(false)}
      />
    );
  }

  const positionClass =
    verticalPosition === 'top'
      ? 'items-start pt-3 sm:pt-6'
      : verticalPosition === 'bottom'
      ? 'items-end pb-3 sm:pb-6'
      : 'items-center';

  return (
    <div
      className={`fixed inset-0 z-50 flex justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto transition-all duration-300 ${positionClass}`}
    >
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-emerald-900 px-6 py-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-800 border border-emerald-600 flex items-center justify-center text-emerald-200 font-bold text-xl shadow-inner shrink-0">
              {customer.customerType === 'empresa' ? (
                <Building2 className="w-6 h-6 text-amber-300" />
              ) : (
                customer.name.slice(0, 2).toUpperCase()
              )}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-bold">{customer.name}</h2>
                {customer.customerType === 'empresa' && (
                  <span className="text-[10px] bg-amber-400 text-slate-950 font-black px-2 py-0.5 rounded-full uppercase">
                    Empresa / Convênio
                  </span>
                )}
                {customer.nickname && (
                  <span className="text-xs bg-emerald-800 text-emerald-200 px-2 py-0.5 rounded-full font-medium">
                    {customer.nickname}
                  </span>
                )}
              </div>
              <p className="text-xs text-emerald-300 flex items-center gap-1.5 mt-0.5 flex-wrap">
                <Phone className="w-3.5 h-3.5" />
                <span>{customer.phone || 'Sem telefone'}</span>
                {customer.cnpj && <span>• CNPJ: {customer.cnpj}</span>}
                {customer.address && (
                  <>
                    <span>•</span>
                    <MapPin className="w-3.5 h-3.5" />
                    <span className="truncate max-w-[200px]">{customer.address}</span>
                  </>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {/* Opções para Subir ou Descer a Janela para organização do layout */}
            <div className="hidden sm:flex items-center bg-black/25 rounded-xl p-0.5 border border-white/10 text-xs mr-1">
              <button
                type="button"
                onClick={() => setVerticalPosition('top')}
                title="Subir Janela para o Topo da tela"
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
                title="Descer Janela para a Base da tela"
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
              onClick={handleExportPdf}
              disabled={isExporting}
              title="Gerar e Baixar Extrato em PDF"
              className="text-white/80 hover:text-white p-2 rounded-lg hover:bg-white/10 transition"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button
              onClick={handleExportCsv}
              disabled={isExporting}
              title="Exportar Histórico em Planilha CSV / Excel"
              className="text-white/80 hover:text-white p-2 rounded-lg hover:bg-white/10 transition"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-300" />
            </button>
            {canShare && (
              <button
                onClick={() => handleShareReport('pdf')}
                disabled={isExporting}
                title="Compartilhar Extrato (WhatsApp / Arquivos)"
                className="text-white/80 hover:text-white p-2 rounded-lg hover:bg-white/10 transition"
              >
                <Share2 className="w-4 h-4 text-teal-300" />
              </button>
            )}
            <button
              onClick={() => onEditCustomer(customer)}
              title="Editar cadastro e preços especiais"
              className="text-white/80 hover:text-white p-2 rounded-lg hover:bg-white/10"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setConfirmDeleteCustomer(true)}
              title="Excluir cliente"
              className="text-rose-300 hover:text-rose-100 p-2 rounded-lg hover:bg-rose-500/20"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white p-2 rounded-lg hover:bg-white/10 ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Debt Summary Banner */}
        <div className="bg-slate-50 border-b border-slate-200 p-4 sm:px-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-6 flex-wrap">
            {debtInfo.creditBalance > 0 && (
              <div>
                <span className="text-xs text-emerald-800 font-bold uppercase tracking-wider flex items-center gap-1">
                  <Wallet className="w-3.5 h-3.5 text-emerald-600" />
                  Crédito Antecipado Disponível
                </span>
                <span className="text-2xl font-black text-emerald-600">
                  + R$ {debtInfo.creditBalance.toFixed(2)}
                </span>
              </div>
            )}

            <div>
              <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider block">
                Saldo em Aberto a Pagar
              </span>
              <div className="flex items-baseline gap-2">
                <span
                  className={`text-2xl font-black ${
                    debtInfo.totalDebt > 0 ? 'text-rose-600' : 'text-slate-700'
                  }`}
                >
                  R$ {debtInfo.totalDebt.toFixed(2)}
                </span>
                {customer.creditLimit && (
                  <span className="text-xs text-slate-400">
                    (Limite: R$ {customer.creditLimit.toFixed(2)})
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Action shortcuts */}
          <div className="flex flex-wrap items-center gap-2">
            {onNewPrepaidCredit && (
              <button
                onClick={() => onNewPrepaidCredit(customer.id)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-sm transition active:scale-95"
              >
                <Wallet className="w-3.5 h-3.5" />
                <span>+ Crédito Antecipado</span>
              </button>
            )}

            <button
              onClick={() => onNewFiado(customer.id)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-sm transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Novo Consumo</span>
            </button>

            <button
              onClick={() => onNewPayment(customer.id)}
              disabled={debtInfo.totalDebt <= 0}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold shadow-sm transition ${
                debtInfo.totalDebt > 0
                  ? 'bg-emerald-100 hover:bg-emerald-200 text-emerald-900'
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed'
              }`}
            >
              <DollarSign className="w-3.5 h-3.5" />
              <span>Abater / Quitar</span>
            </button>

            <button
              onClick={handleExportPdf}
              disabled={isExporting}
              title="Gerar e salvar relatório em PDF com histórico completo para imprimir ou arquivar"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-sm transition active:scale-95 cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5 text-amber-400" />
              <span>{isExporting ? 'Exportando...' : 'Exportar PDF'}</span>
            </button>

            <button
              onClick={handleExportCsv}
              disabled={isExporting}
              title="Exportar histórico completo de fiados e pagamentos em planilha CSV compatível com Excel"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold shadow-sm transition active:scale-95 cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-300" />
              <span>Exportar CSV</span>
            </button>

            {canShare && (
              <button
                onClick={() => handleShareReport('pdf')}
                disabled={isExporting}
                title="Compartilhar arquivo de extrato diretamente pelo WhatsApp ou outros aplicativos"
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold shadow-sm transition active:scale-95 cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5 text-teal-200" />
                <span>Compartilhar</span>
              </button>
            )}

            <button
              onClick={handleSendMonthlyWhatsApp}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-green-600 hover:bg-green-700 text-white text-xs font-bold shadow-sm transition"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Enviar Espelho WhatsApp</span>
            </button>

            {onOpenCollectionSuggestions && (
              <button
                type="button"
                onClick={() => onOpenCollectionSuggestions(customer)}
                title="Abrir 3 modelos amigáveis de cobrança prontos para WhatsApp"
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-sm transition active:scale-95 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-200" />
                <span>Modelos de Cobrança</span>
              </button>
            )}
          </div>
        </div>

        {/* Feedback de sucesso de exportação (PDF ou CSV) */}
        {exportSuccessMessage && (
          <div className="bg-emerald-50 border-b border-emerald-200 px-6 py-2.5 text-emerald-900 text-xs font-bold flex items-center justify-between animate-in fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>{exportSuccessMessage}</span>
            </div>
            <span className="text-[10px] text-emerald-700 uppercase tracking-wider font-extrabold bg-emerald-100 px-2 py-0.5 rounded-full">
              Pronto para Compartilhar ou Arquivar
            </span>
          </div>
        )}

        {/* Inteligência de Consumo: O que este cliente mais compra */}
        {categoryAnalytics && categoryAnalytics.categories.length > 0 && (
          <div className="bg-gradient-to-r from-emerald-50/80 via-white to-amber-50/70 border-b border-slate-200 px-5 sm:px-6 py-2.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-base shrink-0">📊</span>
                <div className="text-xs min-w-0">
                  <span className="font-bold text-slate-800">
                    O que mais vende para {customer.name}:
                  </span>
                  {categoryAnalytics.topCategory && (
                    <span className="font-extrabold text-emerald-800 ml-1.5 inline-block">
                      {categoryAnalytics.topCategory.icon} {categoryAnalytics.topCategory.label} ({categoryAnalytics.topCategory.percentage}% dos pedidos)
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1.5 flex-wrap shrink-0">
                {categoryAnalytics.categories.map((c) => (
                  <span
                    key={c.category}
                    className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-white border border-slate-200 text-slate-700 shadow-2xs flex items-center gap-1"
                  >
                    <span>{c.icon}</span>
                    <span>{c.label.split('&')[0].trim()}:</span>
                    <span className="text-emerald-700 font-extrabold">{c.percentage}% ({c.count}x)</span>
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 bg-white px-6 overflow-x-auto text-xs font-bold">
          <button
            onClick={() => setActiveTab('fechamento_mensal')}
            className={`py-3 px-4 border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'fechamento_mensal'
                ? 'border-emerald-600 text-emerald-900 bg-emerald-50/40'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Calendar className="w-4 h-4 text-emerald-700" />
            <span>Fechamento Mensal no Caixa</span>
            <span className="bg-amber-400 text-slate-950 text-[10px] px-1.5 py-0.2 rounded-full font-black">
              NOVO
            </span>
          </button>

          <button
            onClick={() => setActiveTab('fiados')}
            className={`py-3 px-4 border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'fiados'
                ? 'border-emerald-600 text-emerald-900 bg-emerald-50/40'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Todos os Lançamentos ({debtInfo.entries.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('pagamentos')}
            className={`py-3 px-4 border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'pagamentos'
                ? 'border-emerald-600 text-emerald-900 bg-emerald-50/40'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <DollarSign className="w-4 h-4" />
            <span>Histórico de Pagamentos ({payments.length})</span>
          </button>
        </div>

        {/* Tab 1: FECHAMENTO MENSAL PADRONIZADO */}
        {activeTab === 'fechamento_mensal' && (
          <div className="p-5 max-h-[55vh] overflow-y-auto bg-slate-50/60 space-y-4">
            {/* Aviso de pagamento recém efetuado */}
            {lastClosedPayment && (
              <div className="p-3 bg-emerald-100 text-emerald-900 rounded-xl border border-emerald-300 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span>
                    Fechamento de <strong>R$ {lastClosedPayment.amount.toFixed(2)}</strong> baixado
                    com sucesso no caixa! Recibo: {lastClosedPayment.receiptNumber}
                  </span>
                </div>
                <button
                  onClick={handleSendMonthlyWhatsApp}
                  className="font-bold underline text-emerald-800 shrink-0 ml-2"
                >
                  Enviar Comprovante
                </button>
              </div>
            )}

            {/* Filtro de Mês e Ações em Lote */}
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
                  <Calendar className="w-4 h-4 text-emerald-600" />
                  Mês de Fechamento:
                </span>
                <select
                  value={selectedMonth}
                  onChange={(e) => {
                    setSelectedMonth(e.target.value);
                    setSelectedEntryIds([]);
                  }}
                  className="text-xs font-bold text-slate-800 rounded-lg border border-slate-300 px-3 py-1.5 bg-slate-50"
                >
                  {availableMonths.map((m) => (
                    <option key={m} value={m}>
                      {formatMonthLabel(m)}
                    </option>
                  ))}
                  <option value="all">Todas as Compras em Aberto</option>
                </select>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setShowBreakdownModal(true)}
                  disabled={monthEntries.length === 0}
                  title="Conferir quantas marmitex, bebidas e produtos foram consumidos no período"
                  className="py-1 px-2.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold transition disabled:opacity-50 flex items-center gap-1 shadow-2xs"
                >
                  <PackageCheck className="w-3.5 h-3.5 text-amber-300" />
                  <span>Extrato por Item</span>
                </button>
                <button
                  type="button"
                  onClick={handleSelectAllUnpaidOfMonth}
                  disabled={unpaidMonthEntries.length === 0}
                  className="py-1 px-2.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold border border-emerald-200 transition disabled:opacity-50"
                >
                  Marcar Todas do Mês ({unpaidMonthEntries.length})
                </button>
                {selectedEntryIds.length > 0 && (
                  <button
                    type="button"
                    onClick={handleDeselectAll}
                    className="py-1 px-2 rounded-lg text-slate-500 hover:text-slate-800 transition"
                  >
                    Desmarcar
                  </button>
                )}
              </div>
            </div>

            {/* Lista de compras com Checkbox */}
            <div className="space-y-2">
              {monthEntries.length === 0 ? (
                <div className="text-center py-8 text-slate-400 bg-white rounded-xl border border-slate-200">
                  <ShoppingBag className="w-8 h-8 mx-auto mb-1 text-slate-300" />
                  <p className="text-xs font-bold text-slate-700">
                    Nenhuma compra de marmitex registrada para este mês
                  </p>
                </div>
              ) : (
                monthEntries.map((entry) => {
                  const isChecked = selectedEntryIds.includes(entry.id);
                  const isPaid = entry.status === 'paid';
                  const remaining = Math.max(0, entry.amount - entry.paidAmount);

                  return (
                    <div
                      key={entry.id}
                      onClick={() => !isPaid && toggleSelectEntry(entry.id)}
                      className={`p-3 rounded-xl border transition flex items-center justify-between gap-3 ${
                        isPaid
                          ? 'bg-slate-100/70 border-slate-200 opacity-60 cursor-default'
                          : isChecked
                          ? 'bg-emerald-50/90 border-emerald-500 ring-1 ring-emerald-500 cursor-pointer shadow-xs'
                          : 'bg-white border-slate-200 hover:border-emerald-300 cursor-pointer'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {!isPaid ? (
                          <div className="shrink-0 text-emerald-700">
                            {isChecked ? (
                              <CheckSquare className="w-5 h-5 fill-emerald-600 text-white" />
                            ) : (
                              <Square className="w-5 h-5 text-slate-400" />
                            )}
                          </div>
                        ) : (
                          <CheckCircle2 className="w-5 h-5 text-slate-400 shrink-0" />
                        )}

                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-slate-900">
                              {new Date(entry.date + 'T12:00:00').toLocaleDateString('pt-BR')}
                            </span>
                            {isPaid && (
                              <span className="text-[10px] bg-slate-200 text-slate-600 px-1.5 py-0.2 rounded-md font-bold uppercase">
                                Quitado no Caixa
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-600 truncate mt-0.5">
                            {entry.description}
                          </p>
                          {entry.paidFromCredit && entry.paidFromCredit > 0 && (
                            <span className="text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300 px-1.5 py-0.2 rounded-md inline-flex items-center gap-1 mt-1">
                              💳 Abatido do Crédito (R$ {entry.paidFromCredit.toFixed(2)})
                            </span>
                          )}
                          {entry.categories && entry.categories.length > 0 && (
                            <div className="flex items-center gap-1 mt-1 flex-wrap">
                              {entry.categories.map((catId) => {
                                const meta = getCategoryMeta(catId);
                                return (
                                  <span
                                    key={catId}
                                    className={`text-[9px] font-bold px-1.5 py-0.2 rounded-md border flex items-center gap-0.5 ${meta.badgeClass}`}
                                  >
                                    <span>{meta.icon}</span>
                                    <span>{meta.shortLabel}</span>
                                  </span>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <div className="text-right">
                          <span className="text-xs font-bold text-slate-800 block">
                            R$ {entry.amount.toFixed(2)}
                          </span>
                          {entry.discountType && entry.discountType !== 'none' && entry.discountValue !== undefined && entry.discountValue > 0 && (
                            <span className="text-[10px] text-amber-700 font-bold block">
                              Desc: {entry.discountType === 'percent' ? `${entry.discountValue}%` : `R$ ${Number(entry.discountValue).toFixed(2)}`}
                            </span>
                          )}
                          {!isPaid && (
                            <span className="text-[11px] font-black text-rose-600">
                              A Pagar: R$ {remaining.toFixed(2)}
                            </span>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEntryToEdit(entry);
                          }}
                          title="Entrar e editar itens, valor, dia ou aplicar desconto"
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-emerald-100 text-slate-600 hover:text-emerald-900 border border-slate-200 transition"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Barra Fixa de Fechamento do Caixa */}
            {selectedEntryIds.length > 0 && (
              <div className="sticky bottom-0 bg-slate-900 text-white p-4 rounded-2xl shadow-xl flex flex-col sm:flex-row items-center justify-between gap-3 animate-in slide-in-from-bottom-2">
                <div>
                  <span className="text-[11px] text-emerald-300 font-bold block uppercase tracking-wider">
                    {selectedEntryIds.length} compras marcadas para fechamento
                  </span>
                  <div className="text-lg font-black text-white">
                    Total a Baixar: R$ {selectedTotal.toFixed(2)}
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => setShowBreakdownModal(true)}
                    className="py-2.5 px-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-emerald-500/40 text-xs font-bold flex items-center justify-center gap-1.5 transition active:scale-95"
                    title="Conferir quantas marmitas e bebidas compõem este fechamento"
                  >
                    <PackageCheck className="w-4 h-4" />
                    <span>Extrato por Item</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowClosingModal(true)}
                    className="flex-1 sm:flex-initial py-2.5 px-5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition shadow-md active:scale-95"
                  >
                    <DollarSign className="w-4 h-4 stroke-[3]" />
                    <span>Fazer Fechamento no Caixa</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: LISTA TRADICIONAL DE LANÇAMENTOS */}
        {activeTab === 'fiados' && (
          <div className="p-6 max-h-[50vh] overflow-y-auto bg-slate-50/50 space-y-3">
            {debtInfo.entries.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <ShoppingBag className="w-10 h-10 mx-auto mb-2 opacity-40" />
                <p className="text-sm font-semibold">Nenhum consumo anotado</p>
                <p className="text-xs mt-1">Clique no botão "Novo Consumo" acima para registrar</p>
              </div>
            ) : (
              debtInfo.entries.map((entry) => {
                const remaining = Math.max(0, entry.amount - entry.paidAmount);
                const isPaid = entry.status === 'paid';
                const isOverdue = entry.status === 'overdue';

                return (
                  <div
                    key={entry.id}
                    className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={`text-[11px] font-bold px-2 py-0.5 rounded-full uppercase ${
                            isPaid
                              ? 'bg-slate-100 text-slate-600'
                              : isOverdue
                              ? 'bg-rose-100 text-rose-800 font-extrabold'
                              : entry.paidAmount > 0
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {isPaid
                            ? 'Quitado'
                            : isOverdue
                            ? 'Vencido'
                            : entry.paidAmount > 0
                            ? 'Parcial'
                            : 'Em Aberto'}
                        </span>
                        <span className="text-xs text-slate-400">
                          {new Date(entry.date + 'T12:00:00').toLocaleDateString('pt-BR')}
                        </span>
                        <span className="text-xs text-slate-400">• Vence:</span>
                        <span
                          className={`text-xs font-bold ${
                            isOverdue ? 'text-rose-600' : 'text-slate-700'
                          }`}
                        >
                          {new Date(entry.dueDate + 'T12:00:00').toLocaleDateString('pt-BR')}
                        </span>
                      </div>

                      <p className="text-sm font-semibold text-slate-800">{entry.description}</p>
                      {entry.paidFromCredit && entry.paidFromCredit > 0 && (
                        <span className="text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300 px-2 py-0.5 rounded-md inline-flex items-center gap-1 mt-1">
                          💳 Abatido do Crédito (R$ {entry.paidFromCredit.toFixed(2)})
                        </span>
                      )}
                      {entry.categories && entry.categories.length > 0 && (
                        <div className="flex items-center gap-1 mt-1 flex-wrap">
                          {entry.categories.map((catId) => {
                            const meta = getCategoryMeta(catId);
                            return (
                              <span
                                key={catId}
                                className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md border flex items-center gap-1 ${meta.badgeClass}`}
                              >
                                <span>{meta.icon}</span>
                                <span>{meta.shortLabel}</span>
                              </span>
                            );
                          })}
                        </div>
                      )}
                      {entry.discountType && entry.discountType !== 'none' && entry.discountValue !== undefined && entry.discountValue > 0 && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-amber-50 text-amber-900 border border-amber-200 px-2 py-0.5 rounded-md mt-1">
                          🏷️ Desconto: {entry.discountType === 'percent' ? `${entry.discountValue}%` : `R$ ${Number(entry.discountValue).toFixed(2)}`}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                      <div className="text-left sm:text-right">
                        <span className="text-[11px] text-slate-400 block">Total: R$ {entry.amount.toFixed(2)}</span>
                        {!isPaid && (
                          <span className="text-sm font-black text-rose-600">
                            Resta: R$ {remaining.toFixed(2)}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setEntryToEdit(entry)}
                          title="Entrar e editar itens, valor, dia ou aplicar desconto"
                          className="p-2 rounded-lg bg-slate-100 text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 transition"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        {!isPaid && (
                          <button
                            onClick={() => onNewPayment(customer.id)}
                            title="Abater valor deste lançamento"
                            className="p-2 rounded-lg bg-emerald-700 text-white hover:bg-emerald-800 transition"
                          >
                            <DollarSign className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => onOpenWhatsApp(customer, entry)}
                          title="Enviar comprovante no WhatsApp"
                          className="p-2 rounded-lg bg-green-500 text-white hover:bg-green-600 transition"
                        >
                          <Send className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setEntryToDeleteId(entry.id)}
                          title="Excluir lançamento"
                          className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
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
        )}

        {/* Tab 3: HISTÓRICO DE PAGAMENTOS */}
        {activeTab === 'pagamentos' && (
          <div className="p-6 max-h-[50vh] overflow-y-auto bg-slate-50/50 space-y-3">
            {payments.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <DollarSign className="w-10 h-10 mx-auto mb-2 opacity-40" />
                <p className="text-sm font-semibold">Nenhum pagamento registrado</p>
                <p className="text-xs mt-1">Os abatimentos e acertos do cliente aparecerão aqui</p>
              </div>
            ) : (
              payments.map((payment) => (
                <div
                  key={payment.id}
                  className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs flex items-center justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md uppercase">
                        {payment.method === 'pix'
                          ? 'PIX'
                          : payment.method === 'cash'
                          ? 'Dinheiro'
                          : payment.method === 'card_debit'
                          ? 'Débito'
                          : 'Crédito'}
                      </span>
                      <span className="text-xs text-slate-400">
                        {new Date(payment.date + 'T12:00:00').toLocaleDateString('pt-BR')}
                      </span>
                      {payment.receiptNumber && (
                        <span className="text-[11px] text-slate-400 font-mono">
                          #{payment.receiptNumber}
                        </span>
                      )}
                    </div>
                    {payment.notes && (
                      <p className="text-xs text-slate-600 mt-1">{payment.notes}</p>
                    )}
                  </div>

                  <span className="text-base font-black text-emerald-600">
                    + R$ {payment.amount.toFixed(2)}
                  </span>
                </div>
              ))
            )}
          </div>
        )}

        {/* Footer */}
        <div className="p-4 bg-white border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={handleExportPdf}
              disabled={isExporting}
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-emerald-800 transition"
              title="Baixar extrato completo em PDF com cabeçalho e tabelas"
            >
              <Printer className="w-4 h-4 text-emerald-700" />
              <span>Imprimir / PDF</span>
            </button>
            <span className="text-slate-300">|</span>
            <button
              onClick={handleExportCsv}
              disabled={isExporting}
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-emerald-800 transition"
              title="Baixar planilha CSV com histórico completo para Excel ou Google Planilhas"
            >
              <FileSpreadsheet className="w-4 h-4 text-teal-700" />
              <span>Exportar Planilha (CSV)</span>
            </button>
          </div>
          <button
            onClick={onClose}
            className="py-2 px-5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition"
          >
            Fechar
          </button>
        </div>
      </div>

      {/* MODAL DE CONFIRMAÇÃO DE FECHAMENTO NO CAIXA */}
      {showClosingModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95">
            <div className="bg-emerald-800 p-4 text-white flex items-center justify-between">
              <span className="text-sm font-bold flex items-center gap-2">
                <Receipt className="w-4 h-4 text-emerald-300" />
                Baixar Fechamento Mensal no Caixa
              </span>
              <button
                onClick={() => setShowClosingModal(false)}
                className="text-white/80 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 text-center">
                <span className="text-xs text-emerald-800 font-bold block uppercase">
                  Valor Total do Fechamento
                </span>
                <span className="text-2xl font-black text-emerald-900">
                  R$ {selectedTotal.toFixed(2)}
                </span>
                <span className="text-xs text-emerald-700 block mt-0.5">
                  ({selectedEntryIds.length} compras de marmitas serão quitadas)
                </span>
              </div>

              {/* Botão de Extrato Descritivo por Item e Datas para Conferência */}
              <button
                type="button"
                onClick={() => {
                  setShowClosingModal(false);
                  setShowBreakdownModal(true);
                }}
                className="w-full py-2.5 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-950 text-xs font-bold flex items-center justify-center gap-2 transition shadow-2xs active:scale-98"
              >
                <PackageCheck className="w-4 h-4 text-emerald-700" />
                <span>Emitir Extrato por Item (Marmitex, Bebidas...)</span>
              </button>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Forma de Pagamento Recebida *
                </label>
                <select
                  value={closingPaymentMethod}
                  onChange={(e) => setClosingPaymentMethod(e.target.value as any)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-800 bg-white"
                >
                  <option value="pix">PIX (Transferência Instantânea)</option>
                  <option value="cash">Dinheiro em Espécie</option>
                  <option value="other">Boleto / Transferência Bancária / TED</option>
                  <option value="card_debit">Cartão de Débito</option>
                  <option value="card_credit">Cartão de Crédito</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Observações / NF (opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ex: Pago pelo encarregado Carlos com NF 104"
                  value={closingNotes}
                  onChange={(e) => setClosingNotes(e.target.value)}
                  className="w-full p-2 rounded-xl border border-slate-300 text-xs"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowClosingModal(false)}
                  className="flex-1 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmMonthlyClosing}
                  className="flex-1 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-black shadow-md flex items-center justify-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  Confirmar Baixa
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação para Excluir Cliente */}
      <ConfirmModal
        isOpen={confirmDeleteCustomer}
        title="Excluir Cliente / Empresa"
        message={`Tem certeza que deseja apagar o cadastro de "${customer.name}" e todo o histórico de compras e pagamentos? Esta ação não pode ser desfeita.`}
        confirmLabel="Sim, Excluir Cadastro"
        onConfirm={handleExecuteDeleteClient}
        onCancel={() => setConfirmDeleteCustomer(false)}
      />

      {/* Modal de Confirmação para Excluir Lançamento de Marmita */}
      <ConfirmModal
        isOpen={!!entryToDeleteId}
        title="Excluir Lançamento"
        message="Tem certeza que deseja apagar este lançamento de marmitex? O saldo da conta será recalculado imediatamente."
        confirmLabel="Sim, Excluir"
        onConfirm={handleExecuteDeleteEntry}
        onCancel={() => setEntryToDeleteId(null)}
      />
    </div>
  );
};

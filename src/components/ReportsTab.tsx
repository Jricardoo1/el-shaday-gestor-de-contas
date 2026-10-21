import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Printer,
  Users,
  Send,
  Sparkles,
  ShieldAlert,
  DollarSign,
  BarChart3,
  Calendar,
  FileSpreadsheet,
  Filter,
  Download,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { Customer, FiadoEntry, PaymentRecord, StoreSettings } from '../types';
import { StorageService, getRelativeDateString } from '../services/storage';
import { StoreReportsPdfGenerator } from '../services/storeReportsPdfGenerator';
import { ConsolidatedExportService } from '../services/consolidatedExportService';
import { AccountsPieChart } from './AccountsPieChart';
import { TopDebtorsSection } from './TopDebtorsSection';

interface ReportsTabProps {
  customers: Customer[];
  entries: FiadoEntry[];
  payments: PaymentRecord[];
  settings: StoreSettings;
  onOpenWhatsApp: (customer: Customer) => void;
  onSelectCustomer: (customer: Customer) => void;
}

export const ReportsTab: React.FC<ReportsTabProps> = ({
  customers,
  entries,
  payments,
  settings,
  onOpenWhatsApp,
  onSelectCustomer,
}) => {
  const todayStr = getRelativeDateString(0);

  // Financial calculations
  let totalFiadoEmAberto = 0;
  let totalVencido = 0;
  let totalVencendoHoje = 0;
  let totalEmDia = 0;

  entries.forEach((e) => {
    const remaining = Math.max(0, e.amount - e.paidAmount);
    if (remaining > 0) {
      totalFiadoEmAberto += remaining;
      if (e.status === 'overdue') {
        totalVencido += remaining;
      } else if (e.dueDate === todayStr) {
        totalVencendoHoje += remaining;
      } else {
        totalEmDia += remaining;
      }
    }
  });

  // Calculate payments in current month
  const currentMonth = todayStr.slice(0, 7); // YYYY-MM
  const totalReceivedThisMonth = payments
    .filter((p) => p.date.startsWith(currentMonth))
    .reduce((acc, p) => acc + p.amount, 0);

  // Customers with debt ranking (Top 5)
  const customersWithDebt = customers
    .map((c) => {
      const debt = StorageService.getCustomerDebt(c.id);
      return { customer: c, ...debt };
    })
    .filter((c) => c.totalDebt > 0)
    .sort((a, b) => b.totalDebt - a.totalDebt);

  const [printStatus, setPrintStatus] = useState('');
  const [isPrinting, setIsPrinting] = useState(false);

  // Consolidated CSV Export Filters State
  const [csvCustomerFilter, setCsvCustomerFilter] = useState<string>('all');
  const [csvDateFilterType, setCsvDateFilterType] = useState<
    'all' | 'this_month' | 'last_month' | 'last_30_days' | 'custom'
  >('all');
  const [csvStartDate, setCsvStartDate] = useState<string>('');
  const [csvEndDate, setCsvEndDate] = useState<string>('');
  const [csvTypeFilter, setCsvTypeFilter] = useState<'all' | 'fiados' | 'payments'>('all');
  const [csvDownloadStatus, setCsvDownloadStatus] = useState<string | null>(null);

  const handleDownloadConsolidatedCsv = () => {
    let start = '';
    let end = '';
    const now = new Date();
    const todayIso = now.toISOString().split('T')[0];

    if (csvDateFilterType === 'this_month') {
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      start = `${year}-${month}-01`;
      end = todayIso;
    } else if (csvDateFilterType === 'last_month') {
      const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const year = prevDate.getFullYear();
      const month = String(prevDate.getMonth() + 1).padStart(2, '0');
      const lastDay = new Date(year, prevDate.getMonth() + 1, 0).getDate();
      start = `${year}-${month}-01`;
      end = `${year}-${month}-${String(lastDay).padStart(2, '0')}`;
    } else if (csvDateFilterType === 'last_30_days') {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      start = d.toISOString().split('T')[0];
      end = todayIso;
    } else if (csvDateFilterType === 'custom') {
      start = csvStartDate;
      end = csvEndDate;
    }

    const result = ConsolidatedExportService.downloadConsolidatedCsv(
      entries,
      payments,
      customers,
      settings,
      {
        customerId: csvCustomerFilter,
        startDate: start || undefined,
        endDate: end || undefined,
        type: csvTypeFilter,
      }
    );

    setCsvDownloadStatus(`Arquivo baixado: ${result.filename} (${result.totalItems} transações)`);
    setTimeout(() => setCsvDownloadStatus(null), 5000);
  };

  // Chart period state and calculations
  type ChartPeriod = '7days' | 'monthly' | 'yearly';
  const [chartPeriod, setChartPeriod] = useState<ChartPeriod>('7days');

  const chartData = useMemo(() => {
    if (chartPeriod === '7days') {
      // Last 7 days including today
      const days: Array<{ key: string; label: string; vendas: number; recebidos: number }> = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const iso = d.toISOString().split('T')[0];
        const dayLabel = d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit' });

        const dayVendas = entries
          .filter((e) => e.date === iso)
          .reduce((sum, e) => sum + e.amount, 0);

        const dayRecebidos = payments
          .filter((p) => p.date === iso)
          .reduce((sum, p) => sum + p.amount, 0);

        days.push({
          key: iso,
          label: dayLabel,
          vendas: Number(dayVendas.toFixed(2)),
          recebidos: Number(dayRecebidos.toFixed(2)),
        });
      }
      return days;
    }

    if (chartPeriod === 'monthly') {
      // Current year months
      const months: Array<{ key: string; label: string; vendas: number; recebidos: number }> = [];
      const currentYear = new Date().getFullYear();
      const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

      for (let m = 0; m < 12; m++) {
        const monthStr = `${currentYear}-${String(m + 1).padStart(2, '0')}`;
        const label = monthNames[m];

        const monthVendas = entries
          .filter((e) => e.date.startsWith(monthStr))
          .reduce((sum, e) => sum + e.amount, 0);

        const monthRecebidos = payments
          .filter((p) => p.date.startsWith(monthStr))
          .reduce((sum, p) => sum + p.amount, 0);

        months.push({
          key: monthStr,
          label,
          vendas: Number(monthVendas.toFixed(2)),
          recebidos: Number(monthRecebidos.toFixed(2)),
        });
      }
      return months;
    }

    // Yearly
    const years: Array<{ key: string; label: string; vendas: number; recebidos: number }> = [];
    const currentYear = new Date().getFullYear();
    for (let y = currentYear - 2; y <= currentYear; y++) {
      const yearStr = String(y);

      const yearVendas = entries
        .filter((e) => e.date.startsWith(yearStr))
        .reduce((sum, e) => sum + e.amount, 0);

      const yearRecebidos = payments
        .filter((p) => p.date.startsWith(yearStr))
        .reduce((sum, p) => sum + p.amount, 0);

      years.push({
        key: yearStr,
        label: yearStr,
        vendas: Number(yearVendas.toFixed(2)),
        recebidos: Number(yearRecebidos.toFixed(2)),
      });
    }
    return years;
  }, [entries, payments, chartPeriod]);

  const totalVendasPeriodo = chartData.reduce((acc, d) => acc + d.vendas, 0);
  const totalRecebidosPeriodo = chartData.reduce((acc, d) => acc + d.recebidos, 0);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900 text-white p-3 rounded-xl shadow-xl text-xs space-y-1 border border-slate-700 font-sans">
          <p className="font-bold text-slate-300 border-b border-slate-800 pb-1">{label}</p>
          <p className="text-rose-400 font-black flex items-center justify-between gap-4">
            <span>Vendas / Fiados:</span>
            <span>R$ {Number(payload[0]?.value || 0).toFixed(2)}</span>
          </p>
          <p className="text-emerald-400 font-black flex items-center justify-between gap-4">
            <span>Recebido no Caixa:</span>
            <span>R$ {Number(payload[1]?.value || 0).toFixed(2)}</span>
          </p>
        </div>
      );
    }
    return null;
  };

  const handlePrint = () => {
    try {
      setIsPrinting(true);
      const filename = StoreReportsPdfGenerator.printOrSaveReport(
        settings,
        customers,
        entries,
        payments
      );
      setPrintStatus(`Relatório gerado em PDF com sucesso: ${filename}`);
      setTimeout(() => setPrintStatus(''), 5000);
    } catch (err) {
      console.error('Erro ao gerar relatório:', err);
    } finally {
      setIsPrinting(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Top Banner with Print */}
      <div className="bg-emerald-900 rounded-2xl p-5 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-md">
        <div>
          <span className="text-xs uppercase tracking-wider text-emerald-300 font-bold block">
            Fechamento do Caixa & Contas a Prazo
          </span>
          <h2 className="text-xl font-black">{settings.storeName || 'Controle de Contas'}</h2>
          <p className="text-xs text-emerald-200 mt-0.5">
            Relatório consolidado de consumo a prazo e recebimentos
          </p>
        </div>

        <button
          onClick={handlePrint}
          disabled={isPrinting}
          className="flex items-center gap-2 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xs transition self-start sm:self-auto active:scale-95 disabled:opacity-75"
        >
          <Printer className="w-4 h-4" />
          <span>{isPrinting ? 'Gerando Relatório...' : 'Imprimir Relatório'}</span>
        </button>
      </div>

      {/* Alerta de Relatório Gerado / Baixado com Sucesso */}
      {printStatus && (
        <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-900 text-xs font-bold flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
            <span>{printStatus}</span>
          </div>
          <span className="text-[10px] bg-emerald-200 text-emerald-950 font-extrabold px-2 py-0.5 rounded-md shrink-0">
            PDF Pronto para Salvar ou Imprimir
          </span>
        </div>
      )}

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Total a Receber */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Total a Receber a Prazo
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">
            R$ {totalFiadoEmAberto.toFixed(2)}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            {customersWithDebt.length} clientes com saldo em aberto
          </p>
        </div>

        {/* Total Vencido */}
        <div className="bg-white p-4 rounded-2xl border border-rose-200 shadow-xs bg-rose-50/20">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-rose-600 uppercase tracking-wider">
              Contas Vencidas / Atrasadas
            </span>
            <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-rose-600">
            R$ {totalVencido.toFixed(2)}
          </div>
          <p className="text-[11px] text-rose-700 font-semibold mt-1">
            {totalFiadoEmAberto > 0
              ? `${Math.round((totalVencido / totalFiadoEmAberto) * 100)}% do total está em atraso`
              : 'Nenhum atraso'}
          </p>
        </div>

        {/* Vencendo Hoje */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">
              Vencendo Hoje
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-700">
            R$ {totalVencendoHoje.toFixed(2)}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Bom momento para mandar lembrete</p>
        </div>

        {/* Recebido no Mês */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">
              Recebido no Mês
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-700">
            R$ {totalReceivedThisMonth.toFixed(2)}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Total recuperado e pago no caixa</p>
        </div>
      </div>

      {/* Gráfico de Barras Recharts: Vendas vs Pagamentos Recebidos */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-emerald-700" />
              <h3 className="text-sm font-bold text-slate-900">
                Gráfico de Vendas vs Pagamentos Recebidos
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Comparativo de quanto foi vendido no fiado e quanto foi recebido no caixa
            </p>
          </div>

          {/* Filtros: 7 dias, Mensal, Anual */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl self-start sm:self-auto text-xs font-bold">
            <button
              type="button"
              onClick={() => setChartPeriod('7days')}
              className={`px-3 py-1.5 rounded-lg transition ${
                chartPeriod === '7days'
                  ? 'bg-white text-emerald-900 shadow-2xs font-black'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Últimos 7 Dias
            </button>
            <button
              type="button"
              onClick={() => setChartPeriod('monthly')}
              className={`px-3 py-1.5 rounded-lg transition ${
                chartPeriod === 'monthly'
                  ? 'bg-white text-emerald-900 shadow-2xs font-black'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Mensal
            </button>
            <button
              type="button"
              onClick={() => setChartPeriod('yearly')}
              className={`px-3 py-1.5 rounded-lg transition ${
                chartPeriod === 'yearly'
                  ? 'bg-white text-emerald-900 shadow-2xs font-black'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Anual
            </button>
          </div>
        </div>

        {/* Resumo Rápido dos Valores no Período Selecionado */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
          <div>
            <span className="text-slate-500 block font-medium">Vendas no Período:</span>
            <span className="text-sm sm:text-base font-black text-rose-600">
              R$ {totalVendasPeriodo.toFixed(2)}
            </span>
          </div>
          <div>
            <span className="text-slate-500 block font-medium">Recebido no Caixa:</span>
            <span className="text-sm sm:text-base font-black text-emerald-600">
              R$ {totalRecebidosPeriodo.toFixed(2)}
            </span>
          </div>
          <div className="col-span-2 sm:col-span-1">
            <span className="text-slate-500 block font-medium">Balanço / Recuperação:</span>
            <span
              className={`text-sm sm:text-base font-black ${
                totalRecebidosPeriodo >= totalVendasPeriodo ? 'text-emerald-700' : 'text-slate-800'
              }`}
            >
              {totalRecebidosPeriodo >= totalVendasPeriodo ? '+' : ''} R${' '}
              {(totalRecebidosPeriodo - totalVendasPeriodo).toFixed(2)}
            </span>
          </div>
        </div>

        {/* Área do Gráfico Recharts */}
        <div className="h-64 sm:h-72 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: '#64748b' }}
                axisLine={{ stroke: '#e2e8f0' }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#64748b' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(val) => `R$${val}`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                verticalAlign="top"
                align="right"
                wrapperStyle={{ paddingBottom: 10, fontSize: 12 }}
                formatter={(value) => (
                  <span className="text-xs font-semibold text-slate-700">
                    {value === 'vendas' ? 'Vendas / Fiados (R$)' : 'Pagamentos Recebidos (R$)'}
                  </span>
                )}
              />
              <Bar
                dataKey="vendas"
                name="vendas"
                fill="#dc2626"
                radius={[4, 4, 0, 0]}
                maxBarSize={40}
              />
              <Bar
                dataKey="recebidos"
                name="recebidos"
                fill="#16a34a"
                radius={[4, 4, 0, 0]}
                maxBarSize={40}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Gráfico de Pizza Recharts: Proporção de Contas Pagas vs Pendentes e Vencidas */}
      <AccountsPieChart entries={entries} payments={payments} />

      {/* Top 5 Maiores Saldos Devedores Acumulados */}
      <TopDebtorsSection
        customers={customers}
        entries={entries}
        totalFiadoEmAberto={totalFiadoEmAberto}
        onSelectCustomer={onSelectCustomer}
        onOpenWhatsApp={onOpenWhatsApp}
      />

      {/* Exportação Consolidada de Transações em CSV com Filtros por Data e Cliente */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-black">
              <FileSpreadsheet className="w-5 h-5 text-emerald-700" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
                <span>Exportar Histórico Consolidado de Transações (CSV)</span>
              </h3>
              <p className="text-xs text-slate-500">
                Baixe um arquivo compatível com Excel e Google Planilhas filtrado por cliente e período
              </p>
            </div>
          </div>
        </div>

        {/* Feedback de Download */}
        {csvDownloadStatus && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{csvDownloadStatus}</span>
          </div>
        )}

        {/* Filtros Interativos */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 pt-1">
          {/* 1. Filtro por Cliente */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1.5 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-emerald-700" />
              <span>Filtrar por Cliente:</span>
            </label>
            <select
              value={csvCustomerFilter}
              onChange={(e) => setCsvCustomerFilter(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-xs font-bold text-slate-800 bg-white focus:ring-2 focus:ring-emerald-500 shadow-2xs"
            >
              <option value="all">Todos os Clientes ({customers.length} cadastros)</option>
              {customers.map((c) => {
                const debt = StorageService.getCustomerDebt(c.id).totalDebt;
                return (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.nickname ? `(${c.nickname})` : ''} — Saldo: R$ {debt.toFixed(2)}
                  </option>
                );
              })}
            </select>
          </div>

          {/* 2. Filtro por Tipo de Transação */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1.5 flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-emerald-700" />
              <span>Tipo de Transação:</span>
            </label>
            <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-xl text-xs font-bold">
              <button
                type="button"
                onClick={() => setCsvTypeFilter('all')}
                className={`py-1.5 px-2 rounded-lg text-center transition ${
                  csvTypeFilter === 'all'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Todas
              </button>
              <button
                type="button"
                onClick={() => setCsvTypeFilter('fiados')}
                className={`py-1.5 px-2 rounded-lg text-center transition ${
                  csvTypeFilter === 'fiados'
                    ? 'bg-white text-emerald-800 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Fiados
              </button>
              <button
                type="button"
                onClick={() => setCsvTypeFilter('payments')}
                className={`py-1.5 px-2 rounded-lg text-center transition ${
                  csvTypeFilter === 'payments'
                    ? 'bg-white text-amber-800 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Pagamentos
              </button>
            </div>
          </div>

          {/* 3. Filtro por Período */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1.5 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-emerald-700" />
              <span>Período das Datas:</span>
            </label>
            <select
              value={csvDateFilterType}
              onChange={(e) =>
                setCsvDateFilterType(
                  e.target.value as 'all' | 'this_month' | 'last_month' | 'last_30_days' | 'custom'
                )
              }
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-xs font-bold text-slate-800 bg-white focus:ring-2 focus:ring-emerald-500 shadow-2xs"
            >
              <option value="all">Todo o Histórico (Sem restrição)</option>
              <option value="this_month">Este Mês Atual</option>
              <option value="last_month">Mês Anterior</option>
              <option value="last_30_days">Últimos 30 Dias</option>
              <option value="custom">Personalizado (Data Início / Fim)</option>
            </select>
          </div>
        </div>

        {/* Inputs de Data Personalizada se selecionado */}
        {csvDateFilterType === 'custom' && (
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-center gap-3 text-xs">
            <div className="w-full sm:w-1/2">
              <label className="font-bold text-slate-700 block mb-1">Data Inicial:</label>
              <input
                type="date"
                value={csvStartDate}
                onChange={(e) => setCsvStartDate(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold text-slate-800 bg-white"
              />
            </div>
            <div className="w-full sm:w-1/2">
              <label className="font-bold text-slate-700 block mb-1">Data Final:</label>
              <input
                type="date"
                value={csvEndDate}
                onChange={(e) => setCsvEndDate(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold text-slate-800 bg-white"
              />
            </div>
          </div>
        )}

        {/* Botão de Ação de Download */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
          <span className="text-xs text-slate-500">
            Exporta com padrão brasileiro (BOM UTF-8 e separador ponto-e-vírgula) para abrir direto no Excel.
          </span>
          <button
            type="button"
            onClick={handleDownloadConsolidatedCsv}
            className="px-5 py-3 rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-black flex items-center justify-center gap-2 transition shadow-md hover:shadow-lg active:scale-95 cursor-pointer shrink-0"
          >
            <Download className="w-4 h-4" />
            <span>Baixar Arquivo Consolidado em CSV</span>
          </button>
        </div>
      </div>

      {/* Merchant Best Practices */}
      <div className="bg-emerald-50 rounded-2xl border border-emerald-200 p-5 space-y-2">
        <h4 className="text-xs font-bold text-emerald-950 uppercase tracking-wider flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-emerald-700" />
          Boas Práticas para Gestão de Contas a Prazo
        </h4>
        <ul className="text-xs text-emerald-900 space-y-1.5 leading-relaxed list-disc list-inside">
          <li>
            <strong>Envie o comprovante na hora do almoço:</strong> Quando o cliente recebe o resumo no WhatsApp logo que pede a marmita, a transparência evita qualquer dúvida no acerto.
          </li>
          <li>
            <strong>Defina um limite de crédito a prazo:</strong> Fixe um valor máximo (ex: R$ 200 a R$ 300) por cliente e não libere novos pedidos sem abater o anterior.
          </li>
          <li>
            <strong>Use o PIX para facilitar:</strong> Disponibilize sua chave PIX para que o cliente pague assim que cair o pagamento sem precisar ir até o balcão.
          </li>
          <li>
            <strong>Lembretes preventivos funcionam melhor:</strong> Mandar um lembrete educado 1 ou 2 dias antes do vencimento tem taxa de recebimento 3x maior do que cobrar depois de muito atrasado.
          </li>
        </ul>
      </div>
    </div>
  );
};

import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from 'recharts';
import { PieChart as PieChartIcon, CheckCircle2, Clock, AlertTriangle, DollarSign, Layers } from 'lucide-react';
import { FiadoEntry, PaymentRecord } from '../types';

interface AccountsPieChartProps {
  entries: FiadoEntry[];
  payments: PaymentRecord[];
}

interface SliceData {
  name: string;
  value: number;
  formattedValue: string;
  count: number;
  color: string;
  bgLight: string;
  borderColor: string;
  percentage: number;
  statusKey: 'paid' | 'pending' | 'overdue';
}

export const AccountsPieChart: React.FC<AccountsPieChartProps> = ({
  entries,
  payments,
}) => {
  type ViewMode = 'value' | 'count';
  const [viewMode, setViewMode] = useState<ViewMode>('value');
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const { data, totalValue, totalCount } = useMemo(() => {
    let valorPago = 0;
    let valorPendente = 0;
    let valorVencido = 0;

    let countPago = 0;
    let countPendente = 0;
    let countVencido = 0;

    entries.forEach((e) => {
      const remaining = Math.max(0, e.amount - (e.paidAmount || 0));
      valorPago += e.paidAmount || 0;

      if (e.status === 'paid' || remaining <= 0) {
        countPago++;
      } else if (e.status === 'overdue') {
        valorVencido += remaining;
        countVencido++;
      } else {
        // Pending or partially paid but not yet overdue
        valorPendente += remaining;
        countPendente++;
      }
    });

    const totalVal = valorPago + valorPendente + valorVencido;
    const totalCnt = countPago + countPendente + countVencido;

    const calcPct = (val: number, total: number) =>
      total > 0 ? Math.round((val / total) * 100) : 0;

    const slices: SliceData[] = [
      {
        name: 'Pagas / Quitadas',
        value: viewMode === 'value' ? valorPago : countPago,
        formattedValue: `R$ ${valorPago.toFixed(2)}`,
        count: countPago,
        color: '#10b981', // Emerald-500
        bgLight: 'bg-emerald-50 text-emerald-800 border-emerald-200',
        borderColor: '#059669',
        percentage: calcPct(viewMode === 'value' ? valorPago : countPago, viewMode === 'value' ? totalVal : totalCnt),
        statusKey: 'paid',
      },
      {
        name: 'Pendentes (Em dia)',
        value: viewMode === 'value' ? valorPendente : countPendente,
        formattedValue: `R$ ${valorPendente.toFixed(2)}`,
        count: countPendente,
        color: '#f59e0b', // Amber-500
        bgLight: 'bg-amber-50 text-amber-800 border-amber-200',
        borderColor: '#d97706',
        percentage: calcPct(viewMode === 'value' ? valorPendente : countPendente, viewMode === 'value' ? totalVal : totalCnt),
        statusKey: 'pending',
      },
      {
        name: 'Vencidas (Em atraso)',
        value: viewMode === 'value' ? valorVencido : countVencido,
        formattedValue: `R$ ${valorVencido.toFixed(2)}`,
        count: countVencido,
        color: '#ef4444', // Rose-500
        bgLight: 'bg-rose-50 text-rose-800 border-rose-200',
        borderColor: '#dc2626',
        percentage: calcPct(viewMode === 'value' ? valorVencido : countVencido, viewMode === 'value' ? totalVal : totalCnt),
        statusKey: 'overdue',
      },
    ];

    return {
      data: slices,
      totalValue: totalVal,
      totalCount: totalCnt,
    };
  }, [entries, viewMode]);

  // Custom stylish Tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item: SliceData = payload[0].payload;
      return (
        <div className="bg-slate-900 text-white p-3 rounded-xl shadow-xl border border-slate-700 text-xs space-y-1">
          <div className="flex items-center gap-2">
            <span
              className="w-3 h-3 rounded-full shrink-0"
              style={{ backgroundColor: item.color }}
            />
            <span className="font-bold text-slate-100">{item.name}</span>
          </div>
          <div className="text-sm font-black text-white pl-5">
            {viewMode === 'value' ? item.formattedValue : `${item.count} contas`}
          </div>
          <div className="text-[11px] text-slate-300 pl-5">
            Participação: <strong className="text-amber-400">{item.percentage}%</strong> do total
          </div>
        </div>
      );
    }
    return null;
  };

  const hasData = totalValue > 0 || totalCount > 0;

  return (
    <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
      {/* Header and Filter Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <PieChartIcon className="w-4 h-4" />
            </div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900">
              Proporção de Contas: Pagas vs. Pendentes e Vencidas
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-0.5 pl-10 sm:pl-0">
            Distribuição percentual do volume fiado e recebimentos do comércio
          </p>
        </div>

        {/* View mode toggle: Valor (R$) vs Quantidade */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl self-start sm:self-auto text-xs font-bold">
          <button
            type="button"
            onClick={() => setViewMode('value')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
              viewMode === 'value'
                ? 'bg-white text-emerald-900 shadow-2xs font-black'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <DollarSign className="w-3.5 h-3.5" />
            <span>Por Valor (R$)</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('count')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
              viewMode === 'count'
                ? 'bg-white text-emerald-900 shadow-2xs font-black'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Por Contas (Qtd)</span>
          </button>
        </div>
      </div>

      {!hasData ? (
        <div className="py-12 text-center text-slate-400 space-y-2">
          <PieChartIcon className="w-10 h-10 mx-auto text-slate-300" />
          <p className="text-sm font-bold text-slate-600">Nenhuma conta cadastrada para exibir o gráfico</p>
          <p className="text-xs">Lance compras a prazo ou pagamentos para visualizar as proporções.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
          {/* Recharts Pie / Donut Chart */}
          <div className="lg:col-span-7 h-64 sm:h-72 w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={95}
                  paddingAngle={3}
                  dataKey="value"
                  onMouseEnter={(_, index) => setActiveIndex(index)}
                  onMouseLeave={() => setActiveIndex(null)}
                >
                  {data.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.color}
                      stroke={activeIndex === index ? '#0f172a' : '#ffffff'}
                      strokeWidth={activeIndex === index ? 3 : 2}
                      className="cursor-pointer transition-all duration-200"
                    />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>

            {/* Donut Center Label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                {viewMode === 'value' ? 'Total Movimentado' : 'Total de Contas'}
              </span>
              <span className="text-sm sm:text-base font-black text-slate-900">
                {viewMode === 'value' ? `R$ ${totalValue.toFixed(2)}` : `${totalCount} contas`}
              </span>
            </div>
          </div>

          {/* Interactive Legend & Summary Cards */}
          <div className="lg:col-span-5 space-y-2.5">
            {data.map((item, index) => {
              const isSelected = activeIndex === index;
              return (
                <div
                  key={item.name}
                  onMouseEnter={() => setActiveIndex(index)}
                  onMouseLeave={() => setActiveIndex(null)}
                  className={`p-3 rounded-xl border transition-all duration-200 cursor-pointer ${
                    isSelected
                      ? 'ring-2 ring-slate-800 shadow-sm scale-[1.01]'
                      : 'border-slate-200 hover:border-slate-300'
                  } bg-slate-50/70`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-xs font-bold text-slate-800 truncate">
                        {item.name}
                      </span>
                    </div>

                    <span
                      className="text-xs font-black px-2 py-0.5 rounded-full shrink-0"
                      style={{
                        backgroundColor: `${item.color}20`,
                        color: item.color,
                      }}
                    >
                      {item.percentage}%
                    </span>
                  </div>

                  <div className="flex items-center justify-between mt-1 text-xs pl-5">
                    <span className="text-slate-500 font-medium">
                      {item.count} {item.count === 1 ? 'conta' : 'contas'}
                    </span>
                    <span className="font-extrabold text-slate-900">
                      {item.formattedValue}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Summary Footer Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-slate-100 text-xs">
        <div className="flex items-center gap-2 p-2 rounded-xl bg-emerald-50/60 border border-emerald-100">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <div className="min-w-0">
            <span className="text-[10px] text-emerald-700 uppercase font-bold block">Contas Pagas</span>
            <span className="font-bold text-emerald-950 truncate">
              {data[0]?.percentage || 0}% do total recebido
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 p-2 rounded-xl bg-amber-50/60 border border-amber-100">
          <Clock className="w-4 h-4 text-amber-600 shrink-0" />
          <div className="min-w-0">
            <span className="text-[10px] text-amber-700 uppercase font-bold block">Pendentes (Em dia)</span>
            <span className="font-bold text-amber-950 truncate">
              {data[1]?.percentage || 0}% a receber no prazo
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 p-2 rounded-xl bg-rose-50/60 border border-rose-100">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          <div className="min-w-0">
            <span className="text-[10px] text-rose-700 uppercase font-bold block">Vencidas (Atrasadas)</span>
            <span className="font-bold text-rose-950 truncate">
              {data[2]?.percentage || 0}% com cobrança urgente
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

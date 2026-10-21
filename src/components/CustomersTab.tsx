import React, { useState } from 'react';
import {
  Search,
  Plus,
  Phone,
  Send,
  UserPlus,
  AlertCircle,
  CheckCircle2,
  DollarSign,
  ChevronRight,
  ShoppingBag,
  BellRing,
  Clock,
  Building2,
  X,
  Wallet,
  FileSpreadsheet,
  FileText,
  ArrowDownAZ,
  ArrowUpZA,
} from 'lucide-react';
import { Customer, StoreSettings } from '../types';
import { StorageService } from '../services/storage';
import { CustomerExportService } from '../services/customerExportService';
import { UpcomingDueAlertBanner } from './UpcomingDueAlertBanner';

interface CustomersTabProps {
  customers: Customer[];
  settings: StoreSettings;
  onSelectCustomer: (customer: Customer) => void;
  onNewCustomer: () => void;
  onNewFiado: (customerId: string) => void;
  onNewPayment: (customerId: string) => void;
  onOpenWhatsApp: (customer: Customer) => void;
  onOpenBroadcast?: () => void;
  onNewPrepaidCredit?: (customerId?: string) => void;
}

export const CustomersTab: React.FC<CustomersTabProps> = ({
  customers,
  settings,
  onSelectCustomer,
  onNewCustomer,
  onNewFiado,
  onNewPayment,
  onOpenWhatsApp,
  onOpenBroadcast,
  onNewPrepaidCredit,
}) => {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<
    'all' | 'due_soon_3d' | 'empresas' | 'with_debt' | 'overdue' | 'settled' | 'with_credit'
  >('all');
  const [sortOrder, setSortOrder] = useState<
    'alpha_asc' | 'alpha_desc' | 'debt_desc' | 'debt_asc'
  >('alpha_asc');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleExportCsv = (customer: Customer) => {
    const filename = CustomerExportService.downloadCustomerCsv(customer, settings);
    setToastMessage(`Planilha CSV exportada com sucesso: ${filename}`);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Query customers maturing in the next 3 days
  const upcomingCustomers = StorageService.getUpcomingDueCustomers(3);
  const companyCount = customers.filter((c) => c.customerType === 'empresa').length;
  const creditCount = customers.filter((c) => StorageService.getCustomerDebt(c.id).creditBalance > 0).length;

  // Fast accent-insensitive search normalization
  const normalize = (str: string) =>
    (str || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

  // Filter logic
  const filteredCustomers = customers.filter((customer) => {
    const q = normalize(search);
    const matchesSearch =
      !q ||
      normalize(customer.name).includes(q) ||
      normalize(customer.nickname || '').includes(q) ||
      (customer.phone && customer.phone.includes(q)) ||
      (customer.cnpj && customer.cnpj.includes(q));

    if (!matchesSearch) return false;

    const debt = StorageService.getCustomerDebt(customer.id);
    if (filter === 'due_soon_3d') {
      return upcomingCustomers.some((u) => u.customer.id === customer.id);
    }
    if (filter === 'empresas') return customer.customerType === 'empresa';
    if (filter === 'with_debt') return debt.totalDebt > 0;
    if (filter === 'overdue') return debt.overdueCount > 0;
    if (filter === 'settled') return debt.totalDebt <= 0 && debt.creditBalance <= 0;
    if (filter === 'with_credit') return debt.creditBalance > 0;

    return true;
  });

  // Sorting logic (Clientes sempre em ordem alfabética A-Z por padrão)
  const sortedAndFilteredCustomers = [...filteredCustomers].sort((a, b) => {
    if (sortOrder === 'alpha_asc') {
      return (a.name || '').localeCompare(b.name || '', 'pt-BR', { sensitivity: 'base' });
    }
    if (sortOrder === 'alpha_desc') {
      return (b.name || '').localeCompare(a.name || '', 'pt-BR', { sensitivity: 'base' });
    }
    if (sortOrder === 'debt_desc') {
      const debtA = StorageService.getCustomerDebt(a.id).totalDebt;
      const debtB = StorageService.getCustomerDebt(b.id).totalDebt;
      return debtB - debtA;
    }
    if (sortOrder === 'debt_asc') {
      const debtA = StorageService.getCustomerDebt(a.id).totalDebt;
      const debtB = StorageService.getCustomerDebt(b.id).totalDebt;
      return debtA - debtB;
    }
    return (a.name || '').localeCompare(b.name || '', 'pt-BR', { sensitivity: 'base' });
  });

  return (
    <div className="space-y-4">
      {/* Toast Feedback */}
      {toastMessage && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center justify-between shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{toastMessage}</span>
          </div>
          <button
            onClick={() => setToastMessage(null)}
            className="text-emerald-700 hover:text-emerald-900 p-1"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 1. Radar Proativo de Vencimentos nos Próximos 3 Dias (Destaque Automático) */}
      <UpcomingDueAlertBanner
        upcomingCustomers={upcomingCustomers}
        settings={settings}
        onSelectCustomer={onSelectCustomer}
        onNewPayment={onNewPayment}
        onOpenWhatsApp={(c, e) => onOpenWhatsApp(c)}
      />

      {/* 2. Campo de Busca por Nome e Filtros Rápidos */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-emerald-700 absolute left-3.5 top-3.5" />
            <input
              type="text"
              placeholder="Buscar cliente por nome, apelido ou telefone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-9 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 bg-slate-50/70 font-medium"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                title="Limpar busca"
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-200 transition"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Botão de Ordenação Alfabética A-Z / Z-A */}
          <button
            type="button"
            onClick={() => setSortOrder((prev) => (prev === 'alpha_asc' ? 'alpha_desc' : 'alpha_asc'))}
            title={`Ordem dos clientes: ${
              sortOrder === 'alpha_asc'
                ? 'Ordem Alfabética (A → Z) [Ativo]'
                : 'Ordem Alfabética (Z → A) [Ativo]'
            }. Clique para inverter a ordem.`}
            className={`flex items-center gap-1.5 text-xs font-bold px-3 py-2.5 rounded-xl border transition active:scale-95 cursor-pointer shrink-0 ${
              sortOrder === 'alpha_asc' || sortOrder === 'alpha_desc'
                ? 'bg-emerald-50 border-emerald-300 text-emerald-900 shadow-2xs hover:bg-emerald-100'
                : 'bg-slate-50 border-slate-300 text-slate-700 hover:bg-slate-100'
            }`}
          >
            {sortOrder === 'alpha_desc' ? (
              <ArrowUpZA className="w-4 h-4 text-emerald-700 shrink-0" />
            ) : (
              <ArrowDownAZ className="w-4 h-4 text-emerald-700 shrink-0" />
            )}
            <span className="hidden sm:inline">
              {sortOrder === 'alpha_asc' ? 'Ordem A-Z' : 'Ordem Z-A'}
            </span>
            <span className="sm:hidden">
              {sortOrder === 'alpha_asc' ? 'A-Z' : 'Z-A'}
            </span>
          </button>

          <button
            onClick={onNewCustomer}
            className="flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs sm:text-sm font-bold px-3.5 py-2.5 rounded-xl shadow-xs transition active:scale-95 shrink-0"
          >
            <UserPlus className="w-4 h-4" />
            <span className="hidden sm:inline">Cadastrar Cliente</span>
            <span className="sm:hidden">Novo</span>
          </button>
        </div>

        {/* Indicador de resultados da busca */}
        {search && (
          <div className="flex items-center justify-between text-xs bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 animate-in fade-in">
            <span className="text-emerald-950 font-medium">
              Filtrando clientes por: <strong className="font-bold text-emerald-800">"{search}"</strong> ({sortedAndFilteredCustomers.length} de {customers.length} cadastros)
            </span>
            <button
              type="button"
              onClick={() => setSearch('')}
              className="text-emerald-700 hover:text-emerald-900 font-bold underline"
            >
              Limpar busca
            </button>
          </div>
        )}

        {/* Barra de Status e Ordenação Alfabética Ativa */}
        <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
              <ArrowDownAZ className="w-3.5 h-3.5 text-emerald-600" />
              <span>Ordem Alfabética: {sortOrder === 'alpha_asc' ? 'A a Z' : 'Z a A'}</span>
            </span>
            {sortOrder === 'alpha_asc' && (
              <span className="text-[11px] text-slate-400 hidden sm:inline">
                (Clientes organizados por nome em ordem alfabética)
              </span>
            )}
          </div>
          <span className="text-[11px] font-medium text-slate-400">
            {sortedAndFilteredCustomers.length} {sortedAndFilteredCustomers.length === 1 ? 'cliente' : 'clientes'}
          </span>
        </div>

        {/* Filter Badges */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-lg font-bold transition whitespace-nowrap ${
              filter === 'all'
                ? 'bg-slate-800 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Todos ({customers.length})
          </button>

          {/* Destaque 3 Dias Filter Chip */}
          <button
            onClick={() => setFilter('due_soon_3d')}
            className={`px-3 py-1.5 rounded-lg font-bold transition whitespace-nowrap flex items-center gap-1.5 ${
              filter === 'due_soon_3d'
                ? 'bg-amber-500 text-slate-950 font-black ring-2 ring-amber-300'
                : 'bg-amber-100 text-amber-900 hover:bg-amber-200 border border-amber-300/80'
            }`}
          >
            <BellRing className="w-3.5 h-3.5" />
            <span>Vencem em até 3 dias</span>
            {upcomingCustomers.length > 0 && (
              <span className="bg-amber-600 text-white text-[10px] font-black px-1.5 py-0.2 rounded-full">
                {upcomingCustomers.length}
              </span>
            )}
          </button>

          {/* Empresas / Convênios Filter Chip */}
          <button
            onClick={() => setFilter('empresas')}
            className={`px-3 py-1.5 rounded-lg font-bold transition whitespace-nowrap flex items-center gap-1.5 ${
              filter === 'empresas'
                ? 'bg-amber-700 text-white font-black'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Building2 className="w-3.5 h-3.5 text-amber-600" />
            <span>Empresas / Convênios ({companyCount})</span>
          </button>

          <button
            onClick={() => setFilter('with_debt')}
            className={`px-3 py-1.5 rounded-lg font-bold transition whitespace-nowrap ${
              filter === 'with_debt'
                ? 'bg-emerald-700 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Com Saldo Aberto
          </button>

          <button
            onClick={() => setFilter('overdue')}
            className={`px-3 py-1.5 rounded-lg font-bold transition whitespace-nowrap ${
              filter === 'overdue'
                ? 'bg-rose-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Em Atraso / Vencidos
          </button>

          <button
            onClick={() => setFilter('settled')}
            className={`px-3 py-1.5 rounded-lg font-bold transition whitespace-nowrap ${
              filter === 'settled'
                ? 'bg-teal-700 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Quitados (Zerados)
          </button>

          <button
            onClick={() => setFilter('with_credit')}
            className={`px-3 py-1.5 rounded-lg font-bold transition whitespace-nowrap flex items-center gap-1.5 ${
              filter === 'with_credit'
                ? 'bg-emerald-700 text-white font-black'
                : 'bg-emerald-50 text-emerald-900 border border-emerald-300/80 hover:bg-emerald-100'
            }`}
          >
            <Wallet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Com Crédito Antecipado ({creditCount})</span>
          </button>
        </div>
      </div>

      {/* 3. Customer List */}
      <div className="space-y-2.5">
        {sortedAndFilteredCustomers.length === 0 ? (
          <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-400 space-y-3">
            <Search className="w-12 h-12 mx-auto text-slate-300" />
            <p className="text-sm font-bold text-slate-700">
              {search
                ? `Nenhum cliente encontrado para "${search}"`
                : 'Nenhum cliente encontrado'}
            </p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {search
                ? 'Verifique se o nome foi digitado corretamente ou clique abaixo para limpar o campo de busca.'
                : 'Não encontramos clientes com esse filtro. Cadastre um novo cliente para começar a controlar os fiados.'}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="inline-flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold px-4 py-2 rounded-xl transition"
                >
                  <X className="w-4 h-4" />
                  Limpar Busca
                </button>
              )}
              <button
                onClick={onNewCustomer}
                className="inline-flex items-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold px-4 py-2 rounded-xl transition"
              >
                <Plus className="w-4 h-4" />
                Cadastrar Novo Cliente
              </button>
            </div>
          </div>
        ) : (
          sortedAndFilteredCustomers.map((customer, index) => {
            const debt = StorageService.getCustomerDebt(customer.id);
            const isOverdue = debt.overdueCount > 0;
            const hasDebt = debt.totalDebt > 0;

            // Check if customer is maturing in the next 3 days
            const upcomingInfo = upcomingCustomers.find((u) => u.customer.id === customer.id);

            // Letra inicial para agrupador visual alfabético
            const firstChar = (customer.name || '').trim().charAt(0).toUpperCase();
            const prevChar =
              index > 0
                ? (sortedAndFilteredCustomers[index - 1].name || '').trim().charAt(0).toUpperCase()
                : null;
            const showLetterHeader =
              (sortOrder === 'alpha_asc' || sortOrder === 'alpha_desc') &&
              !search &&
              (index === 0 || firstChar !== prevChar);

            return (
              <React.Fragment key={customer.id}>
                {showLetterHeader && (
                  <div className="flex items-center gap-2 pt-2.5 pb-0.5 px-1">
                    <span className="w-7 h-7 rounded-lg bg-emerald-700 text-white font-black text-xs flex items-center justify-center shadow-2xs">
                      {firstChar || '#'}
                    </span>
                    <span className="text-xs font-black text-slate-600 uppercase tracking-wider">
                      Letra {firstChar}
                    </span>
                    <div className="h-px bg-slate-200 flex-1"></div>
                  </div>
                )}
                <div
                  className={`bg-white rounded-2xl border p-4 shadow-xs transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    upcomingInfo
                      ? 'border-amber-300 bg-amber-50/20 ring-1 ring-amber-300/40'
                      : isOverdue
                      ? 'border-rose-200 hover:border-rose-300'
                      : 'border-slate-200 hover:border-emerald-300'
                  }`}
                >
                {/* Customer info */}
                <div
                  onClick={() => onSelectCustomer(customer)}
                  className="flex items-start gap-3 cursor-pointer flex-1"
                >
                  <div
                    className={`w-11 h-11 rounded-xl flex items-center justify-center font-black text-sm shrink-0 shadow-xs ${
                      customer.customerType === 'empresa'
                        ? 'bg-amber-100 text-amber-900 border border-amber-300'
                        : upcomingInfo
                        ? 'bg-amber-100 text-amber-900 border border-amber-300'
                        : isOverdue
                        ? 'bg-rose-100 text-rose-700 border border-rose-200'
                        : hasDebt
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {customer.customerType === 'empresa' ? (
                      <Building2 className="w-5 h-5 text-amber-800" />
                    ) : (
                      customer.name.slice(0, 2).toUpperCase()
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h3 className="text-sm font-bold text-slate-900 hover:text-emerald-700 transition truncate">
                        {customer.name}
                      </h3>
                      {customer.customerType === 'empresa' && (
                        <span className="text-[10px] bg-amber-400 text-slate-950 font-black px-1.5 py-0.2 rounded-md uppercase">
                          Empresa
                        </span>
                      )}
                      {customer.nickname && (
                        <span className="text-[11px] font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full truncate">
                          {customer.nickname}
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                      {customer.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3 text-slate-400" />
                          {customer.phone}
                        </span>
                      )}
                      {customer.creditLimit && (
                        <span>• Limite: R$ {customer.creditLimit.toFixed(2)}</span>
                      )}
                    </p>

                    {/* Status and 3-Day Radar Badges */}
                    <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                      {/* Highlight if due in <= 3 days */}
                      {upcomingInfo && (
                        <span
                          className={`text-[10px] font-black px-2 py-0.5 rounded-md flex items-center gap-1 shadow-2xs ${
                            upcomingInfo.daysRemaining === 0
                              ? 'bg-rose-500 text-white animate-pulse'
                              : upcomingInfo.daysRemaining === 1
                              ? 'bg-amber-500 text-slate-950'
                              : 'bg-amber-200 text-amber-950 border border-amber-300'
                          }`}
                        >
                          <Clock className="w-3 h-3" />
                          {upcomingInfo.urgencyLabel} (R$ {upcomingInfo.totalDueSoon.toFixed(2)})
                        </span>
                      )}

                      {isOverdue && (
                        <span className="text-[10px] font-bold bg-rose-100 text-rose-800 px-2 py-0.5 rounded-md flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          {debt.overdueCount} parcela(s) em atraso
                        </span>
                      )}

                      {hasDebt && !isOverdue && !upcomingInfo && (
                        <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          Conta em dia ({debt.pendingCount})
                        </span>
                      )}

                      {!hasDebt && debt.creditBalance <= 0 && (
                        <span className="text-[10px] font-semibold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md">
                          Conta quitada
                        </span>
                      )}

                      {debt.creditBalance > 0 && (
                        <span className="text-[10px] font-black bg-emerald-100 text-emerald-900 border border-emerald-300 px-2 py-0.5 rounded-md flex items-center gap-1 shadow-2xs">
                          <Wallet className="w-3 h-3 text-emerald-700" />
                          Crédito Pré-Pago: R$ {debt.creditBalance.toFixed(2)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Balance & Actions */}
                <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                  <div
                    onClick={() => onSelectCustomer(customer)}
                    className="text-left sm:text-right cursor-pointer"
                  >
                    {debt.creditBalance > 0 ? (
                      <>
                        <span className="text-[11px] text-emerald-700 font-bold block">
                          Crédito Disponível
                        </span>
                        <span className="text-base font-black text-emerald-700">
                          + R$ {debt.creditBalance.toFixed(2)}
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="text-[11px] text-slate-400 block font-medium">
                          Saldo em Aberto
                        </span>
                        <span
                          className={`text-base font-black ${
                            isOverdue
                              ? 'text-rose-600'
                              : upcomingInfo
                              ? 'text-amber-700'
                              : hasDebt
                              ? 'text-slate-900'
                              : 'text-emerald-600'
                          }`}
                        >
                          R$ {debt.totalDebt.toFixed(2)}
                        </span>
                      </>
                    )}
                  </div>

                  {/* Fast action buttons */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onNewFiado(customer.id)}
                      title="Lançar novo consumo a prazo"
                      className="p-2 rounded-xl bg-emerald-50 text-emerald-800 hover:bg-emerald-100 transition"
                    >
                      <Plus className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => onNewPayment(customer.id)}
                      title="Registrar pagamento / abatimento"
                      disabled={!hasDebt}
                      className={`p-2 rounded-xl transition ${
                        hasDebt
                          ? 'bg-emerald-700 text-white hover:bg-emerald-800'
                          : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                      }`}
                    >
                      <DollarSign className="w-4 h-4" />
                    </button>

                    {onNewPrepaidCredit && (
                      <button
                        type="button"
                        onClick={() => onNewPrepaidCredit(customer.id)}
                        title="Lançar crédito antecipado para este cliente"
                        className="p-2 rounded-xl bg-amber-50 text-amber-800 hover:bg-amber-100 transition"
                      >
                        <Wallet className="w-4 h-4" />
                      </button>
                    )}

                    <button
                      onClick={() => onOpenWhatsApp(customer)}
                      title="Cobrar ou enviar mensagem no WhatsApp"
                      className="p-2 rounded-xl bg-green-500 text-white hover:bg-green-600 transition"
                    >
                      <Send className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleExportCsv(customer)}
                      title="Exportar Histórico em Planilha CSV / Excel"
                      className="p-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition"
                    >
                      <FileSpreadsheet className="w-4 h-4 text-emerald-800" />
                    </button>

                    <button
                      onClick={() => onSelectCustomer(customer)}
                      title="Ver caderneta completa"
                      className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            </React.Fragment>
          );
        })
        )}
      </div>
    </div>
  );
};

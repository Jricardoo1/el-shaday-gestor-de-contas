import { Customer, FiadoEntry, PaymentRecord, StoreSettings } from '../types';

export interface ConsolidatedFilters {
  customerId?: string; // 'all' or customer id
  startDate?: string;  // 'YYYY-MM-DD'
  endDate?: string;    // 'YYYY-MM-DD'
  type?: 'all' | 'fiados' | 'payments';
}

export const ConsolidatedExportService = {
  /**
   * Generates and downloads a consolidated CSV file with all transactions matching the filters.
   */
  downloadConsolidatedCsv(
    entries: FiadoEntry[],
    payments: PaymentRecord[],
    customers: Customer[],
    settings: StoreSettings,
    filters: ConsolidatedFilters
  ): { filename: string; totalItems: number; totalFiados: number; totalPayments: number } {
    const customerMap = new Map<string, Customer>();
    customers.forEach((c) => customerMap.set(c.id, c));

    const selectedCustomer = filters.customerId && filters.customerId !== 'all'
      ? customerMap.get(filters.customerId)
      : null;

    // Filter Fiados
    let filteredEntries = entries;
    if (selectedCustomer) {
      filteredEntries = filteredEntries.filter((e) => e.customerId === selectedCustomer.id);
    }
    if (filters.startDate) {
      filteredEntries = filteredEntries.filter((e) => (e.date || '') >= filters.startDate!);
    }
    if (filters.endDate) {
      filteredEntries = filteredEntries.filter((e) => (e.date || '') <= filters.endDate!);
    }

    // Filter Payments
    let filteredPayments = payments;
    if (selectedCustomer) {
      filteredPayments = filteredPayments.filter((p) => p.customerId === selectedCustomer.id);
    }
    if (filters.startDate) {
      filteredPayments = filteredPayments.filter((p) => (p.date || '') >= filters.startDate!);
    }
    if (filters.endDate) {
      filteredPayments = filteredPayments.filter((p) => (p.date || '') <= filters.endDate!);
    }

    const includeFiados = filters.type !== 'payments';
    const includePayments = filters.type !== 'fiados';

    type UnifiedRow = {
      date: string;
      dueDate: string;
      type: string;
      customerName: string;
      customerNickname: string;
      customerPhone: string;
      description: string;
      paymentMethod: string;
      amount: number;
      paidAmount: number;
      remainingBalance: number;
      status: string;
      receiptNumber: string;
    };

    const unifiedRows: UnifiedRow[] = [];

    if (includeFiados) {
      filteredEntries.forEach((e) => {
        const cust = customerMap.get(e.customerId);
        const remaining = Math.max(0, e.amount - (e.paidAmount || 0));
        const statusLabel =
          e.status === 'paid'
            ? 'PAGO'
            : e.status === 'overdue'
            ? 'EM ATRASO'
            : 'ABERTO';

        unifiedRows.push({
          date: e.date || '-',
          dueDate: e.dueDate || '-',
          type: 'VENDA A PRAZO / FIADO',
          customerName: cust?.name || 'Cliente Não Localizado',
          customerNickname: cust?.nickname || '',
          customerPhone: cust?.phone || '',
          description: e.description || 'Marmitex / Consumo',
          paymentMethod: '-',
          amount: e.amount,
          paidAmount: e.paidAmount || 0,
          remainingBalance: remaining,
          status: statusLabel,
          receiptNumber: e.id,
        });
      });
    }

    if (includePayments) {
      filteredPayments.forEach((p) => {
        const cust = customerMap.get(p.customerId);
        const methodMap: Record<string, string> = {
          pix: 'PIX',
          cash: 'Dinheiro',
          card_debit: 'Cartão de Débito',
          card_credit: 'Cartão de Crédito',
          other: 'Outro',
        };
        const methodLabel = methodMap[p.method] || p.method.toUpperCase();

        unifiedRows.push({
          date: p.date || '-',
          dueDate: '-',
          type: 'PAGAMENTO / RECEBIDO',
          customerName: cust?.name || 'Cliente Não Localizado',
          customerNickname: cust?.nickname || '',
          customerPhone: cust?.phone || '',
          description: p.notes || 'Abatimento / Quitação de Conta',
          paymentMethod: methodLabel,
          amount: p.amount,
          paidAmount: p.amount,
          remainingBalance: 0,
          status: 'RECEBIDO NO CAIXA',
          receiptNumber: p.receiptNumber || p.id,
        });
      });
    }

    // Sort by date descending
    unifiedRows.sort((a, b) => (b.date > a.date ? 1 : b.date < a.date ? -1 : 0));

    const totalFiadosVal = includeFiados
      ? filteredEntries.reduce((sum, e) => sum + e.amount, 0)
      : 0;
    const totalPaymentsVal = includePayments
      ? filteredPayments.reduce((sum, p) => sum + p.amount, 0)
      : 0;

    const escapeCsv = (val: unknown): string => {
      if (val === null || val === undefined) return '';
      const str = String(val).trim();
      if (str.includes(';') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const formatMoney = (val: number): string => {
      return val.toFixed(2).replace('.', ',');
    };

    const now = new Date();
    const dateNowStr = now.toLocaleDateString('pt-BR');
    const timeNowStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    const lines: string[] = [];

    // Header Metadata
    lines.push(`RELATÓRIO CONSOLIDADO DE TRANSAÇÕES;${escapeCsv(settings.storeName || 'ESTABELECIMENTO')}`);
    lines.push(`Emissão;${dateNowStr} às ${timeNowStr}`);
    if (settings.phone) lines.push(`Telefone da Loja;${escapeCsv(settings.phone)}`);
    if (settings.pixKey) lines.push(`Chave PIX;${escapeCsv(settings.pixKey)}`);
    lines.push('');

    // Active Filters Summary
    lines.push('PARÂMETROS DO FILTRO APLICADO;');
    lines.push(`Cliente Filtrado;${selectedCustomer ? escapeCsv(selectedCustomer.name) : 'Todos os Clientes'}`);
    lines.push(`Período Inicial;${filters.startDate ? filters.startDate : 'Início dos registros'}`);
    lines.push(`Período Final;${filters.endDate ? filters.endDate : 'Até a data atual'}`);
    lines.push(
      `Tipo de Lançamento;${
        filters.type === 'fiados'
          ? 'Apenas Vendas a Prazo'
          : filters.type === 'payments'
          ? 'Apenas Pagamentos Recebidos'
          : 'Todas as Transações (Fiados e Pagamentos)'
      }`
    );
    lines.push('');

    // Summary Totals
    lines.push('TOTAIS CONSOLIDADOS NO PERÍODO;');
    lines.push(`Total de Vendas a Prazo;R$ ${formatMoney(totalFiadosVal)};Quantidade;${filteredEntries.length}`);
    lines.push(`Total Recebido no Caixa;R$ ${formatMoney(totalPaymentsVal)};Quantidade;${filteredPayments.length}`);
    lines.push(`Saldo Líquido / Diferença;R$ ${formatMoney(totalFiadosVal - totalPaymentsVal)}`);
    lines.push(`Total de Transações Listadas;${unifiedRows.length}`);
    lines.push('');

    // Transactions Table
    lines.push('--- DETALHAMENTO DE TRANSAÇÕES ---;;;;;;;;;;;;');
    lines.push(
      [
        'Tipo de Transação',
        'Data da Transação',
        'Data de Vencimento',
        'Nome do Cliente',
        'Apelido',
        'Telefone / WhatsApp',
        'Discriminação / Itens / Notas',
        'Forma de Pagamento',
        'Valor Bruto (R$)',
        'Valor Baixado (R$)',
        'Saldo Restante (R$)',
        'Status',
        'Identificador / Recibo',
      ].join(';')
    );

    if (unifiedRows.length === 0) {
      lines.push('Nenhuma transação encontrada com os filtros selecionados;;;;;;;;;;;;');
    } else {
      unifiedRows.forEach((r) => {
        lines.push(
          [
            escapeCsv(r.type),
            escapeCsv(r.date),
            escapeCsv(r.dueDate),
            escapeCsv(r.customerName),
            escapeCsv(r.customerNickname),
            escapeCsv(r.customerPhone),
            escapeCsv(r.description),
            escapeCsv(r.paymentMethod),
            formatMoney(r.amount),
            formatMoney(r.paidAmount),
            formatMoney(r.remainingBalance),
            escapeCsv(r.status),
            escapeCsv(r.receiptNumber),
          ].join(';')
        );
      });
    }

    const content = '\uFEFF' + lines.join('\r\n');
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });

    const custSlug = selectedCustomer
      ? selectedCustomer.name.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 15)
      : 'todos_clientes';
    const filename = `relatorio_consolidado_${custSlug}_${now.toISOString().split('T')[0]}.csv`;

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);

    return {
      filename,
      totalItems: unifiedRows.length,
      totalFiados: totalFiadosVal,
      totalPayments: totalPaymentsVal,
    };
  },
};

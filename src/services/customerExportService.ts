import { Customer, StoreSettings, FiadoEntry, PaymentRecord } from '../types';
import { StorageService } from './storage';
import { CustomerPdfGenerator } from './customerPdfGenerator';

/**
 * Service to export and share customer fiado and payment history in CSV and PDF formats.
 */
export const CustomerExportService = {
  /**
   * Generates a Brazilian Portuguese formatted CSV with BOM for full Excel/Sheets compatibility.
   */
  generateCustomerCsv(customer: Customer, settings: StoreSettings): { filename: string; content: string; blob: Blob } {
    const debtInfo = StorageService.getCustomerDebt(customer.id);
    const payments = StorageService.getPayments().filter((p) => p.customerId === customer.id);
    const now = new Date();
    const dateStr = now.toLocaleDateString('pt-BR');
    const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    const totalComprado = debtInfo.entries.reduce((acc, e) => acc + e.amount, 0);
    const totalPago = payments.reduce((acc, p) => acc + p.amount, 0);
    const saldoDevedor = debtInfo.totalDebt;
    const creditoAntecipado = debtInfo.creditBalance || 0;

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

    const lines: string[] = [];

    // Header Info
    lines.push(`EXTRATO DE HISTÓRICO DE FIADOS E PAGAMENTOS;${escapeCsv(settings.storeName || 'ESTABELECIMENTO')}`);
    lines.push(`Data de Emissão;${dateStr} às ${timeStr}`);
    if (settings.phone) lines.push(`Telefone da Loja;${escapeCsv(settings.phone)}`);
    if (settings.pixKey) lines.push(`Chave PIX;${escapeCsv(settings.pixKey)}`);
    lines.push('');

    // Customer Identity
    lines.push('DADOS DO CLIENTE;');
    lines.push(`Nome;${escapeCsv(customer.name)}`);
    if (customer.nickname) lines.push(`Apelido;${escapeCsv(customer.nickname)}`);
    lines.push(`Tipo de Cadastro;${customer.customerType === 'empresa' ? 'Empresa / Convênio' : 'Pessoa Física'}`);
    if (customer.cnpj || customer.cpf) lines.push(`CPF / CNPJ;${escapeCsv(customer.cnpj || customer.cpf)}`);
    if (customer.phone) lines.push(`Telefone / WhatsApp;${escapeCsv(customer.phone)}`);
    if (customer.address) lines.push(`Endereço / Setor;${escapeCsv(customer.address)}`);
    if (customer.creditLimit) lines.push(`Limite de Crédito;R$ ${formatMoney(customer.creditLimit)}`);
    if (customer.notes) lines.push(`Observações do Cliente;${escapeCsv(customer.notes)}`);
    lines.push('');

    // Financial Summary
    lines.push('RESUMO FINANCEIRO CONSOLIDADO;');
    lines.push(`Total de Compras a Prazo;R$ ${formatMoney(totalComprado)};Qtd Compras;${debtInfo.entries.length}`);
    lines.push(`Total Pago / Abatido;R$ ${formatMoney(totalPago)};Qtd Pagamentos;${payments.length}`);
    lines.push(`Saldo Devedor em Aberto;R$ ${formatMoney(saldoDevedor)}`);
    if (creditoAntecipado > 0) {
      lines.push(`Crédito Antecipado Disponível;R$ ${formatMoney(creditoAntecipado)}`);
    }
    lines.push('');

    // Section 1: Purchases / Fiados
    lines.push('--- HISTÓRICO DE COMPRAS A PRAZO E CONSUMO (FIADOS) ---;;;;;;;;');
    lines.push(
      [
        'Data da Compra',
        'Data de Vencimento',
        'Discriminação / Itens',
        'Categorias',
        'Valor Total (R$)',
        'Valor Pago (R$)',
        'Saldo em Aberto (R$)',
        'Status',
        'Observações',
      ].join(';')
    );

    if (debtInfo.entries.length === 0) {
      lines.push('Nenhum fiado registrado;;;;;;;;');
    } else {
      debtInfo.entries.forEach((entry: FiadoEntry) => {
        const remaining = Math.max(0, entry.amount - (entry.paidAmount || 0));
        const statusLabel =
          entry.status === 'paid'
            ? 'PAGO'
            : entry.status === 'overdue'
            ? 'EM ATRASO'
            : 'PENDENTE';

        const cats = entry.categories && entry.categories.length > 0 ? entry.categories.join(', ') : 'Geral';

        lines.push(
          [
            escapeCsv(entry.date || '-'),
            escapeCsv(entry.dueDate || '-'),
            escapeCsv(entry.description || 'Marmitex / Consumo'),
            escapeCsv(cats),
            formatMoney(entry.amount),
            formatMoney(entry.paidAmount || 0),
            formatMoney(remaining),
            statusLabel,
            escapeCsv(entry.notes || ''),
          ].join(';')
        );
      });
    }

    lines.push('');

    // Section 2: Payments History
    lines.push('--- HISTÓRICO DE PAGAMENTOS E ABATIMENTOS ---;;;;;');
    lines.push(
      [
        'Data do Pagamento',
        'Número do Recibo',
        'Forma de Pagamento',
        'Valor Pago (R$)',
        'Observações / Notas',
      ].join(';')
    );

    if (payments.length === 0) {
      lines.push('Nenhum pagamento registrado;;;;;');
    } else {
      payments.forEach((payment: PaymentRecord) => {
        const methodMap: Record<string, string> = {
          pix: 'PIX',
          cash: 'Dinheiro',
          card_debit: 'Cartão de Débito',
          card_credit: 'Cartão de Crédito',
          other: 'Outro',
        };
        const methodLabel = methodMap[payment.method] || payment.method.toUpperCase();

        lines.push(
          [
            escapeCsv(payment.date || '-'),
            escapeCsv(payment.receiptNumber || '-'),
            escapeCsv(methodLabel),
            formatMoney(payment.amount),
            escapeCsv(payment.notes || ''),
          ].join(';')
        );
      });
    }

    // Prepend UTF-8 BOM (\uFEFF) for immediate correct display in Excel
    const content = '\uFEFF' + lines.join('\r\n');
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });

    const cleanName = customer.name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '_')
      .slice(0, 25);
    const filename = `extrato_fiados_${cleanName}_${now.toISOString().split('T')[0]}.csv`;

    return { filename, content, blob };
  },

  /**
   * Triggers download of the customer CSV report.
   */
  downloadCustomerCsv(customer: Customer, settings: StoreSettings): string {
    const { filename, blob } = this.generateCustomerCsv(customer, settings);
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return filename;
  },

  /**
   * Generates and downloads the customer PDF report.
   */
  downloadCustomerPdf(customer: Customer, settings: StoreSettings): string {
    return CustomerPdfGenerator.generateCustomerReport(customer, settings);
  },

  /**
   * Checks if native file sharing is available on current device/browser.
   */
  canShareFiles(): boolean {
    if (typeof navigator === 'undefined' || !navigator.canShare) return false;
    try {
      const testFile = new File(['test'], 'test.txt', { type: 'text/plain' });
      return navigator.canShare({ files: [testFile] });
    } catch {
      return false;
    }
  },

  /**
   * Shares the PDF or CSV report using Web Share API (mobile/WhatsApp/Drive/email) with download fallback.
   */
  async shareOrDownload(
    customer: Customer,
    settings: StoreSettings,
    format: 'pdf' | 'csv'
  ): Promise<{ action: 'shared' | 'downloaded'; filename: string }> {
    if (format === 'csv') {
      const { filename, blob } = this.generateCustomerCsv(customer, settings);
      const file = new File([blob], filename, { type: 'text/csv;charset=utf-8;' });

      if (this.canShareFiles()) {
        try {
          await navigator.share({
            title: `Extrato Financeiro - ${customer.name}`,
            text: `Segue o extrato financeiro detalhado de compras a prazo e pagamentos de ${customer.name}.`,
            files: [file],
          });
          return { action: 'shared', filename };
        } catch (err: unknown) {
          // If user cancelled sharing, don't force download
          if ((err as Error)?.name === 'AbortError') {
            return { action: 'shared', filename };
          }
        }
      }

      // Fallback: direct download
      this.downloadCustomerCsv(customer, settings);
      return { action: 'downloaded', filename };
    } else {
      // PDF format
      const { filename, blob } = CustomerPdfGenerator.generateCustomerReportBlob(customer, settings);
      const file = new File([blob], filename, { type: 'application/pdf' });

      if (this.canShareFiles()) {
        try {
          await navigator.share({
            title: `Extrato Financeiro PDF - ${customer.name}`,
            text: `Segue o extrato financeiro em PDF com histórico de fiados e pagamentos de ${customer.name}.`,
            files: [file],
          });
          return { action: 'shared', filename };
        } catch (err: unknown) {
          if ((err as Error)?.name === 'AbortError') {
            return { action: 'shared', filename };
          }
        }
      }

      // Fallback: direct download
      const downloadedName = this.downloadCustomerPdf(customer, settings);
      return { action: 'downloaded', filename: downloadedName };
    }
  },
};

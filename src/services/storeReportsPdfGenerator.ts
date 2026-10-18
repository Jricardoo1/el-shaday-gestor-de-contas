import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Customer, FiadoEntry, PaymentRecord, StoreSettings } from '../types';
import { StorageService } from './storage';

export const StoreReportsPdfGenerator = {
  /**
   * Generates and downloads the General Store Financial & Debt Report.
   */
  generateGeneralReport(
    settings: StoreSettings,
    customers: Customer[],
    entries: FiadoEntry[],
    payments: PaymentRecord[]
  ): string {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const now = new Date();
    const dateFormatted = now.toLocaleDateString('pt-BR');
    const timeFormatted = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const todayStr = now.toISOString().split('T')[0];

    // Colors
    const primaryColor: [number, number, number] = [6, 95, 70]; // Emerald 800
    const darkSlate: [number, number, number] = [30, 41, 59]; // Slate 800
    const lightGray: [number, number, number] = [241, 245, 249]; // Slate 100
    const dangerColor: [number, number, number] = [225, 29, 72]; // Rose 600

    const pageWidth = doc.internal.pageSize.getWidth();
    let currentY = 15;

    // 1. Top Header Banner
    doc.setFillColor(...primaryColor);
    doc.rect(0, 0, pageWidth, 28, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text(settings.storeName || 'ESTABELECIMENTO COMERCIAL', 14, 12);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const storeSub = [
      settings.ownerName ? `Proprietário: ${settings.ownerName}` : '',
      settings.phone ? `WhatsApp: ${settings.phone}` : '',
      settings.city ? `Cidade: ${settings.city}` : '',
    ]
      .filter(Boolean)
      .join('   |   ');
    doc.text(storeSub || 'Gestão de Marmitex e Contas a Prazo', 14, 18);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('RELATÓRIO GERAL DO CAIXA', pageWidth - 14, 12, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(`Emissão: ${dateFormatted} às ${timeFormatted}`, pageWidth - 14, 18, { align: 'right' });

    currentY = 34;

    // Financial calculations
    let totalFiadoEmAberto = 0;
    let totalVencido = 0;
    let totalVencendoHoje = 0;

    entries.forEach((e) => {
      const remaining = Math.max(0, e.amount - e.paidAmount);
      if (remaining > 0) {
        totalFiadoEmAberto += remaining;
        if (e.status === 'overdue' || (e.dueDate && e.dueDate < todayStr)) {
          totalVencido += remaining;
        } else if (e.dueDate === todayStr) {
          totalVencendoHoje += remaining;
        }
      }
    });

    const currentMonth = todayStr.slice(0, 7);
    const totalReceivedThisMonth = payments
      .filter((p) => p.date && p.date.startsWith(currentMonth))
      .reduce((acc, p) => acc + p.amount, 0);

    const customersWithDebt = customers
      .map((c) => {
        const debt = StorageService.getCustomerDebt(c.id);
        return { customer: c, ...debt };
      })
      .filter((c) => c.totalDebt > 0)
      .sort((a, b) => b.totalDebt - a.totalDebt);

    // 2. Summary Grid (4 Cards)
    const cardWidth = (pageWidth - 28 - 9) / 4;

    // Card 1: Total a Receber
    doc.setFillColor(...lightGray);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(14, currentY, cardWidth, 18, 2, 2, 'FD');
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 116, 139);
    doc.text('TOTAL A RECEBER', 14 + cardWidth / 2, currentY + 5.5, { align: 'center' });
    doc.setFontSize(11);
    doc.setTextColor(...darkSlate);
    doc.text(`R$ ${totalFiadoEmAberto.toFixed(2)}`, 14 + cardWidth / 2, currentY + 13.5, { align: 'center' });

    // Card 2: Total Vencido
    doc.setFillColor(255, 241, 242);
    doc.setDrawColor(254, 205, 211);
    doc.roundedRect(14 + (cardWidth + 3), currentY, cardWidth, 18, 2, 2, 'FD');
    doc.setFontSize(7);
    doc.setTextColor(159, 18, 57);
    doc.text('CONTAS VENCIDAS', 14 + (cardWidth + 3) + cardWidth / 2, currentY + 5.5, { align: 'center' });
    doc.setFontSize(11);
    doc.setTextColor(...dangerColor);
    doc.text(`R$ ${totalVencido.toFixed(2)}`, 14 + (cardWidth + 3) + cardWidth / 2, currentY + 13.5, { align: 'center' });

    // Card 3: Vencendo Hoje
    doc.setFillColor(254, 243, 199);
    doc.setDrawColor(253, 230, 138);
    doc.roundedRect(14 + (cardWidth + 3) * 2, currentY, cardWidth, 18, 2, 2, 'FD');
    doc.setFontSize(7);
    doc.setTextColor(146, 64, 14);
    doc.text('VENCENDO HOJE', 14 + (cardWidth + 3) * 2 + cardWidth / 2, currentY + 5.5, { align: 'center' });
    doc.setFontSize(11);
    doc.setTextColor(180, 83, 9);
    doc.text(`R$ ${totalVencendoHoje.toFixed(2)}`, 14 + (cardWidth + 3) * 2 + cardWidth / 2, currentY + 13.5, { align: 'center' });

    // Card 4: Recebido no Mês
    doc.setFillColor(236, 253, 245);
    doc.setDrawColor(167, 243, 208);
    doc.roundedRect(14 + (cardWidth + 3) * 3, currentY, cardWidth, 18, 2, 2, 'FD');
    doc.setFontSize(7);
    doc.setTextColor(6, 95, 70);
    doc.text('RECEBIDO NO MÊS', 14 + (cardWidth + 3) * 3 + cardWidth / 2, currentY + 5.5, { align: 'center' });
    doc.setFontSize(11);
    doc.setTextColor(5, 150, 105);
    doc.text(`R$ ${totalReceivedThisMonth.toFixed(2)}`, 14 + (cardWidth + 3) * 3 + cardWidth / 2, currentY + 13.5, { align: 'center' });

    currentY += 24;

    // 3. Ranking Table of Debtors
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...darkSlate);
    doc.text(`Lista de Clientes com Saldo em Aberto (${customersWithDebt.length} clientes)`, 14, currentY);
    currentY += 3;

    const rankingRows = customersWithDebt.map((item, index) => {
      const type = item.customer.customerType === 'empresa' ? '[EMPRESA]' : '[FÍSICA]';
      const name = `${item.customer.name} ${item.customer.nickname ? `(${item.customer.nickname})` : ''} ${type}`;
      const phone = item.customer.phone || '-';
      const overdueStatus = item.overdueCount > 0 ? `${item.overdueCount} vencida(s)` : 'Em dia';
      const limit = item.customer.creditLimit ? `R$ ${item.customer.creditLimit.toFixed(2)}` : 'Livre';

      return [
        `${index + 1}º`,
        name,
        phone,
        limit,
        overdueStatus,
        `R$ ${item.totalDebt.toFixed(2)}`,
      ];
    });

    if (rankingRows.length === 0) {
      rankingRows.push(['-', 'Nenhum cliente com contas em aberto no momento.', '-', '-', '-', 'R$ 0,00']);
    }

    autoTable(doc, {
      startY: currentY,
      head: [['#', 'Cliente / Razão Social', 'WhatsApp / Tel', 'Limite', 'Situação', 'Saldo Devedor']],
      body: rankingRows,
      margin: { left: 14, right: 14 },
      headStyles: {
        fillColor: primaryColor,
        textColor: 255,
        fontStyle: 'bold',
        fontSize: 8,
      },
      bodyStyles: {
        fontSize: 7.5,
        textColor: darkSlate,
      },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center', fontStyle: 'bold' },
        1: { cellWidth: 'auto' },
        2: { cellWidth: 28 },
        3: { cellWidth: 22, halign: 'center' },
        4: { cellWidth: 24, halign: 'center', fontStyle: 'bold' },
        5: { cellWidth: 26, halign: 'right', fontStyle: 'bold' },
      },
      didParseCell: (data) => {
        if (data.section === 'body') {
          if (data.column.index === 4) {
            const val = String(data.cell.raw);
            if (val.includes('vencida')) {
              data.cell.styles.textColor = [225, 29, 72];
            } else {
              data.cell.styles.textColor = [5, 150, 105];
            }
          }
          if (data.column.index === 5) {
            data.cell.styles.textColor = [30, 41, 59];
          }
        }
      },
    });

    // @ts-expect-error autoTable adds lastAutoTable to doc
    currentY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 8 : currentY + 30;

    // Check if space is left for recent payments
    if (currentY > 220) {
      doc.addPage();
      currentY = 15;
    }

    // 4. Recent Payments Table
    const recentPayments = [...payments]
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
      .slice(0, 10);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...darkSlate);
    doc.text(`Últimos Pagamentos Recebidos no Caixa (${recentPayments.length} recentes)`, 14, currentY);
    currentY += 3;

    const paymentRows = recentPayments.map((p) => {
      const customer = customers.find((c) => c.id === p.customerId);
      const customerName = customer ? customer.name : 'Cliente';
      const dateStr = p.date ? new Date(p.date + 'T12:00:00').toLocaleDateString('pt-BR') : '-';
      const methodLabel =
        p.method === 'pix'
          ? 'PIX'
          : p.method === 'cash'
          ? 'DINHEIRO'
          : p.method === 'card_debit'
          ? 'DÉBITO'
          : p.method === 'card_credit'
          ? 'CRÉDITO'
          : 'OUTRO';

      return [
        dateStr,
        customerName,
        methodLabel,
        p.notes || `Recibo #${p.receiptNumber || 'OK'}`,
        `R$ ${p.amount.toFixed(2)}`,
      ];
    });

    if (paymentRows.length === 0) {
      paymentRows.push(['-', 'Nenhum pagamento registrado recentemente.', '-', '-', 'R$ 0,00']);
    }

    autoTable(doc, {
      startY: currentY,
      head: [['Data', 'Cliente', 'Forma', 'Observação / Recibo', 'Valor Pago']],
      body: paymentRows,
      margin: { left: 14, right: 14 },
      headStyles: {
        fillColor: [30, 41, 59],
        textColor: 255,
        fontStyle: 'bold',
        fontSize: 8,
      },
      bodyStyles: {
        fontSize: 7.5,
        textColor: darkSlate,
      },
      columnStyles: {
        0: { cellWidth: 20 },
        1: { cellWidth: 50 },
        2: { cellWidth: 24, halign: 'center', fontStyle: 'bold' },
        3: { cellWidth: 'auto' },
        4: { cellWidth: 26, halign: 'right', fontStyle: 'bold', textColor: [5, 150, 105] },
      },
    });

    // @ts-expect-error autoTable adds lastAutoTable to doc
    currentY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 8 : currentY + 30;

    // Check space for footer
    if (currentY > 255) {
      doc.addPage();
      currentY = 20;
    }

    // 5. Store PIX & Signature Footer
    if (settings.pixKey) {
      doc.setFillColor(240, 253, 244);
      doc.setDrawColor(187, 247, 208);
      doc.roundedRect(14, currentY, pageWidth - 28, 14, 2, 2, 'FD');

      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(20, 83, 45);
      doc.text(
        `CHAVE PIX PARA RECEBIMENTOS: ${settings.pixKey} (${settings.pixKeyType?.toUpperCase() || 'CHAVE'})   |   TITULAR: ${settings.storeName}`,
        pageWidth / 2,
        currentY + 8,
        { align: 'center' }
      );
      currentY += 18;
    }

    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Relatório confidencial gerado pelo sistema de gestão de contas a prazo - ${settings.storeName || 'App'}`,
      pageWidth / 2,
      currentY + 5,
      { align: 'center' }
    );

    // Save PDF directly to user's device
    const cleanStoreName = (settings.storeName || 'loja')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '_')
      .slice(0, 20);
    const filename = `relatorio_geral_${cleanStoreName}_${todayStr}.pdf`;

    doc.save(filename);

    return filename;
  },

  /**
   * Safe print trigger that handles iframes and mobile web browsers gracefully.
   */
  printOrSaveReport(
    settings: StoreSettings,
    customers: Customer[],
    entries: FiadoEntry[],
    payments: PaymentRecord[]
  ): string {
    const filename = this.generateGeneralReport(settings, customers, entries, payments);

    // Try window.print if not blocked by iframe sandbox
    try {
      if (typeof window !== 'undefined' && window.print) {
        window.print();
      }
    } catch {
      // Ignored if window.print is blocked in iframe sandbox
    }

    return filename;
  },
};

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Customer, StoreSettings } from '../types';
import { StorageService } from './storage';

export const CustomerPdfGenerator = {
  /**
   * Builds the jsPDF instance and calculated filename.
   */
  buildCustomerReportDoc(customer: Customer, settings: StoreSettings): { doc: jsPDF; filename: string } {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const debtInfo = StorageService.getCustomerDebt(customer.id);
    const payments = StorageService.getPayments().filter((p) => p.customerId === customer.id);

    const now = new Date();
    const dateFormatted = now.toLocaleDateString('pt-BR');
    const timeFormatted = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    // Colors
    const primaryColor: [number, number, number] = [6, 95, 70]; // Emerald 800
    const darkSlate: [number, number, number] = [30, 41, 59]; // Slate 800
    const lightGray: [number, number, number] = [241, 245, 249]; // Slate 100
    const dangerColor: [number, number, number] = [225, 29, 72]; // Rose 600

    // Page boundaries
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
      settings.ownerName ? `Resp: ${settings.ownerName}` : '',
      settings.phone ? `Whats/Tel: ${settings.phone}` : '',
      settings.city ? `Cidade: ${settings.city}` : '',
    ]
      .filter(Boolean)
      .join('  |  ');
    doc.text(storeSub || 'Controle de Fiados e Marmitex', 14, 18);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('EXTRATO DE FIADOS & DÉBITOS', pageWidth - 14, 12, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(`Emissão: ${dateFormatted} às ${timeFormatted}`, pageWidth - 14, 18, { align: 'right' });

    currentY = 34;

    // 2. Customer Identification Box
    doc.setFillColor(...lightGray);
    doc.roundedRect(14, currentY, pageWidth - 28, 26, 3, 3, 'F');

    doc.setTextColor(...darkSlate);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    const typeLabel = customer.customerType === 'empresa' ? '[EMPRESA / CONVÊNIO]' : '[PESSOA FÍSICA]';
    doc.text(`${customer.name} ${customer.nickname ? `(${customer.nickname})` : ''} ${typeLabel}`, 18, currentY + 6);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);

    const docNumber = customer.cnpj || customer.cpf || 'Não cadastrado';
    const phone = customer.phone || 'Não informado';
    doc.text(`CPF / CNPJ: ${docNumber}     |     WhatsApp / Telefone: ${phone}`, 18, currentY + 13);

    const address = customer.address || 'Não informado';
    const limit = customer.creditLimit ? `R$ ${customer.creditLimit.toFixed(2)}` : 'Sem limite definido';
    doc.text(`Endereço / Setor: ${address}     |     Limite de Crédito: ${limit}`, 18, currentY + 19);

    currentY += 31;

    // 3. Financial Summary Cards
    const totalPurchased = debtInfo.entries.reduce((acc, e) => acc + e.amount, 0);
    const totalPaid = payments.reduce((acc, p) => acc + p.amount, 0);
    const totalRemaining = debtInfo.totalDebt;

    const cardWidth = (pageWidth - 28 - 6) / 3;

    // Card 1: Total Comprado
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(14, currentY, cardWidth, 18, 2, 2, 'FD');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.setFont('helvetica', 'bold');
    doc.text('TOTAL CONSUMIDO NO FIADO', 14 + cardWidth / 2, currentY + 5.5, { align: 'center' });
    doc.setFontSize(12);
    doc.setTextColor(...darkSlate);
    doc.text(`R$ ${totalPurchased.toFixed(2)}`, 14 + cardWidth / 2, currentY + 13.5, { align: 'center' });

    // Card 2: Total Abatido/Pago
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(14 + cardWidth + 3, currentY, cardWidth, 18, 2, 2, 'FD');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text('TOTAL PAGO / ABATIDO', 14 + cardWidth + 3 + cardWidth / 2, currentY + 5.5, { align: 'center' });
    doc.setFontSize(12);
    doc.setTextColor(5, 150, 105);
    doc.text(`R$ ${totalPaid.toFixed(2)}`, 14 + cardWidth + 3 + cardWidth / 2, currentY + 13.5, { align: 'center' });

    // Card 3: Saldo Devedor Atual
    if (totalRemaining > 0) {
      doc.setFillColor(255, 241, 242);
      doc.setDrawColor(254, 205, 211);
    } else {
      doc.setFillColor(236, 253, 245);
      doc.setDrawColor(167, 243, 208);
    }
    doc.roundedRect(14 + (cardWidth + 3) * 2, currentY, cardWidth, 18, 2, 2, 'FD');
    doc.setFontSize(7.5);
    doc.setTextColor(totalRemaining > 0 ? 159 : 6, totalRemaining > 0 ? 18 : 95, totalRemaining > 0 ? 57 : 70);
    doc.text('SALDO DEVEDOR ATUAL', 14 + (cardWidth + 3) * 2 + cardWidth / 2, currentY + 5.5, { align: 'center' });
    doc.setFontSize(13);
    doc.setTextColor(
      totalRemaining > 0 ? dangerColor[0] : primaryColor[0],
      totalRemaining > 0 ? dangerColor[1] : primaryColor[1],
      totalRemaining > 0 ? dangerColor[2] : primaryColor[2]
    );
    doc.text(`R$ ${totalRemaining.toFixed(2)}`, 14 + (cardWidth + 3) * 2 + cardWidth / 2, currentY + 13.5, { align: 'center' });

    currentY += 24;

    // 4. Table: Consumos e Compras a Prazo (Marmitex / Bebidas / Pratos)
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...darkSlate);
    doc.text(`Histórico de Compras Fiadas (${debtInfo.entries.length} registros)`, 14, currentY);
    currentY += 3;

    const entriesRows = debtInfo.entries.map((entry) => {
      const dateStr = entry.date ? new Date(entry.date + 'T12:00:00').toLocaleDateString('pt-BR') : '-';
      const dueDateStr = entry.dueDate ? new Date(entry.dueDate + 'T12:00:00').toLocaleDateString('pt-BR') : '-';
      
      const fullDesc = entry.notes ? `${entry.description} (${entry.notes})` : entry.description;

      const isPaid = entry.status === 'paid';
      const isOverdue = !isPaid && entry.dueDate && entry.dueDate < now.toISOString().split('T')[0];
      const statusText = isPaid ? 'PAGO' : isOverdue ? 'EM ATRASO' : 'ABERTO';

      return [
        dateStr,
        fullDesc || 'Consumo no fiado',
        dueDateStr,
        `R$ ${entry.amount.toFixed(2)}`,
        statusText,
      ];
    });

    if (entriesRows.length === 0) {
      entriesRows.push(['-', 'Nenhum consumo fiado registrado até o momento.', '-', 'R$ 0,00', '-']);
    }

    autoTable(doc, {
      startY: currentY,
      head: [['Data', 'Discriminação do Consumo / Marmitas', 'Vencimento', 'Valor', 'Status']],
      body: entriesRows,
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
        0: { cellWidth: 20 },
        1: { cellWidth: 'auto' },
        2: { cellWidth: 22, halign: 'center' },
        3: { cellWidth: 24, halign: 'right', fontStyle: 'bold' },
        4: { cellWidth: 22, halign: 'center', fontStyle: 'bold' },
      },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 4) {
          const val = String(data.cell.raw);
          if (val === 'PAGO') {
            data.cell.styles.textColor = [5, 150, 105];
          } else if (val === 'EM ATRASO') {
            data.cell.styles.textColor = [225, 29, 72];
          } else {
            data.cell.styles.textColor = [217, 119, 6];
          }
        }
      },
    });

    // Get Y position after the first table
    // @ts-expect-error autoTable adds lastAutoTable to doc
    currentY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 8 : currentY + 30;

    // Check if we need a new page for payments
    if (currentY > 230) {
      doc.addPage();
      currentY = 15;
    }

    // 5. Table: Pagamentos Efetuados
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...darkSlate);
    doc.text(`Histórico de Pagamentos e Abatimentos (${payments.length} registros)`, 14, currentY);
    currentY += 3;

    const paymentRows = payments.map((p) => {
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
        methodLabel,
        p.notes || 'Abatimento de conta',
        `R$ ${p.amount.toFixed(2)}`,
      ];
    });

    if (paymentRows.length === 0) {
      paymentRows.push(['-', '-', 'Nenhum pagamento registrado ainda.', 'R$ 0,00']);
    }

    autoTable(doc, {
      startY: currentY,
      head: [['Data', 'Forma', 'Observações / Comprovante', 'Valor Pago']],
      body: paymentRows,
      margin: { left: 14, right: 14 },
      headStyles: {
        fillColor: [30, 41, 59], // Slate 800
        textColor: 255,
        fontStyle: 'bold',
        fontSize: 8,
      },
      bodyStyles: {
        fontSize: 7.5,
        textColor: darkSlate,
      },
      columnStyles: {
        0: { cellWidth: 22 },
        1: { cellWidth: 25, halign: 'center', fontStyle: 'bold' },
        2: { cellWidth: 'auto' },
        3: { cellWidth: 26, halign: 'right', fontStyle: 'bold', textColor: [5, 150, 105] },
      },
    });

    // @ts-expect-error autoTable adds lastAutoTable to doc
    currentY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 8 : currentY + 30;

    // Check if we need space for PIX and signature
    if (currentY > 240) {
      doc.addPage();
      currentY = 15;
    }

    // 6. PIX & Payment Instructions Box
    if (settings.pixKey) {
      doc.setFillColor(240, 253, 244);
      doc.setDrawColor(187, 247, 208);
      doc.roundedRect(14, currentY, pageWidth - 28, 18, 2, 2, 'FD');

      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(20, 83, 45);
      doc.text('DADOS PARA PAGAMENTO VIA PIX:', 18, currentY + 5.5);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(22, 101, 52);
      doc.text(
        `Chave PIX (${settings.pixKeyType?.toUpperCase() || 'CHAVE'}): ${settings.pixKey}   |   Beneficiário: ${settings.storeName}   |   Cidade: ${settings.city || 'SAO PAULO'}`,
        18,
        currentY + 12
      );

      currentY += 24;
    }

    // 7. Signature Line & Disclaimer
    if (currentY > 255) {
      doc.addPage();
      currentY = 20;
    }

    doc.setDrawColor(203, 213, 225);
    doc.line(pageWidth / 2 - 45, currentY + 12, pageWidth / 2 + 45, currentY + 12);

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(
      `Assinatura de Acordo / Responsável: ${customer.name}`,
      pageWidth / 2,
      currentY + 16,
      { align: 'center' }
    );

    doc.setFontSize(6.5);
    doc.text(
      'Documento emitido para simples conferência e acerto mútuo de consumo a prazo e pagamentos efetuados.',
      pageWidth / 2,
      currentY + 20,
      { align: 'center' }
    );

    // Clean filename
    const cleanCustomerName = customer.name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '_')
      .slice(0, 25);
    const filename = `relatorio_fiados_${cleanCustomerName}_${now.toISOString().split('T')[0]}.pdf`;

    return { doc, filename };
  },

  /**
   * Generates and downloads the customer PDF report.
   */
  generateCustomerReport(customer: Customer, settings: StoreSettings): string {
    const { doc, filename } = this.buildCustomerReportDoc(customer, settings);
    doc.save(filename);
    return filename;
  },

  /**
   * Generates the customer PDF report as a Blob for sharing or custom handling.
   */
  generateCustomerReportBlob(customer: Customer, settings: StoreSettings): { filename: string; blob: Blob } {
    const { doc, filename } = this.buildCustomerReportDoc(customer, settings);
    const blob = doc.output('blob');
    return { filename, blob };
  },

  /**
   * Generates a Blob URL to preview or print the PDF in a new tab/iframe if needed.
   */
  getReportBlobUrl(customer: Customer, settings: StoreSettings): string {
    const { doc } = this.buildCustomerReportDoc(customer, settings);
    return String(doc.output('bloburl'));
  },
};

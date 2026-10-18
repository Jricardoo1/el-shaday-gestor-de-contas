import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Customer, FiadoEntry, ProductItem, StoreSettings } from '../types';

export interface ParsedItemSummary {
  name: string;
  category: 'marmitex' | 'bebidas' | 'outros';
  quantity: number;
  totalEstimatedAmount: number;
}

export interface ClosingBreakdownData {
  items: ParsedItemSummary[];
  categoryTotals: {
    marmitex: number;
    bebidas: number;
    outros: number;
    totalItems: number;
  };
  totalAmount: number;
  unpaidAmount: number;
  entriesCount: number;
}

export const MonthlyClosingBreakdownService = {
  /**
   * Intelligently parses descriptions and notes from Fiado entries to count how many of each product
   * (how many marmitex, how many sodas, how many waters, how many juices, etc.) were consumed.
   */
  parseEntries(entries: FiadoEntry[], catalogProducts: ProductItem[] = []): ClosingBreakdownData {
    const itemsMap = new Map<string, ParsedItemSummary>();

    let totalAmount = 0;
    let unpaidAmount = 0;

    entries.forEach((entry) => {
      totalAmount += entry.amount;
      const remaining = Math.max(0, entry.amount - entry.paidAmount);
      if (entry.status !== 'paid') {
        unpaidAmount += remaining;
      }

      const desc = entry.description || '';
      // Remove company discount info like "(Desc. Empresa 10%)"
      const cleanDesc = desc.replace(/\(Desc\.[^)]+\)/gi, '').trim();

      // Split by " + " or "," or "\n"
      const chunks = cleanDesc
        .split(/\s+\+\s+|,\s*|\n+/)
        .map((c) => c.trim())
        .filter(Boolean);

      let detectedAny = false;

      chunks.forEach((chunk) => {
        // Pattern 1: "2x Marmitex P", "3x Coca-Cola Lata", "1 x Suco de Laranja"
        const matchQuantity = chunk.match(/^(\d+)\s*[xX*]\s*(.+)$/);
        if (matchQuantity) {
          detectedAny = true;
          const qty = parseInt(matchQuantity[1], 10);
          const rawName = matchQuantity[2].trim();
          this.accumulateItem(itemsMap, rawName, qty, entry.amount, chunks.length, catalogProducts);
          return;
        }

        // Pattern 2: "2 Marmitas M", "3 Refrigerantes", "1 Suco"
        const matchTextQuantity = chunk.match(/^(\d+)\s+(.+)$/);
        if (matchTextQuantity) {
          detectedAny = true;
          const qty = parseInt(matchTextQuantity[1], 10);
          const rawName = matchTextQuantity[2].trim();
          this.accumulateItem(itemsMap, rawName, qty, entry.amount, chunks.length, catalogProducts);
          return;
        }

        // Pattern 3: Matches directly with a product in the catalog
        const foundInCatalog = catalogProducts.find(
          (p) => p.name.toLowerCase() === chunk.toLowerCase()
        );
        if (foundInCatalog) {
          detectedAny = true;
          this.accumulateItem(itemsMap, foundInCatalog.name, 1, foundInCatalog.price || entry.amount, 1, catalogProducts);
          return;
        }

        // Pattern 4: Fallback generic item
        if (chunk.length > 1) {
          detectedAny = true;
          this.accumulateItem(itemsMap, chunk, 1, entry.amount, chunks.length, catalogProducts);
        }
      });

      // If nothing detected, count whole entry as 1
      if (!detectedAny && desc) {
        this.accumulateItem(itemsMap, desc, 1, entry.amount, 1, catalogProducts);
      }
    });

    const items = Array.from(itemsMap.values()).sort((a, b) => b.quantity - a.quantity);

    const categoryTotals = {
      marmitex: 0,
      bebidas: 0,
      outros: 0,
      totalItems: 0,
    };

    items.forEach((item) => {
      categoryTotals.totalItems += item.quantity;
      if (item.category === 'marmitex') {
        categoryTotals.marmitex += item.quantity;
      } else if (item.category === 'bebidas') {
        categoryTotals.bebidas += item.quantity;
      } else {
        categoryTotals.outros += item.quantity;
      }
    });

    return {
      items,
      categoryTotals,
      totalAmount,
      unpaidAmount,
      entriesCount: entries.length,
    };
  },

  /**
   * Helper to categorize and sum items.
   */
  accumulateItem(
    map: Map<string, ParsedItemSummary>,
    rawName: string,
    quantity: number,
    entryAmount: number,
    totalChunksInEntry: number,
    catalog: ProductItem[]
  ) {
    // Normalize name
    let cleanName = rawName.replace(/\s*\([^)]*\)/g, '').trim();
    if (!cleanName) cleanName = 'Item Consumido';

    // Capitalize first letter
    cleanName = cleanName.charAt(0).toUpperCase() + cleanName.slice(1);

    // Detect category
    const lower = cleanName.toLowerCase();
    let category: 'marmitex' | 'bebidas' | 'outros' = 'outros';

    if (
      lower.includes('marmit') ||
      lower.includes('almoço') ||
      lower.includes('refeição') ||
      lower.includes('prato') ||
      lower.includes('kg') ||
      lower.includes('comida')
    ) {
      category = 'marmitex';
    } else if (
      lower.includes('coca') ||
      lower.includes('refri') ||
      lower.includes('suco') ||
      lower.includes('água') ||
      lower.includes('agua') ||
      lower.includes('guaraná') ||
      lower.includes('fanta') ||
      lower.includes('bebida') ||
      lower.includes('lata') ||
      lower.includes('cerveja')
    ) {
      category = 'bebidas';
    }

    // Try finding price in catalog
    const catalogMatch = catalog.find(
      (p) => p.name.toLowerCase() === lower || lower.includes(p.name.toLowerCase())
    );
    const estimatedValue = catalogMatch
      ? catalogMatch.price * quantity
      : (entryAmount / Math.max(1, totalChunksInEntry));

    const existing = map.get(cleanName);
    if (existing) {
      existing.quantity += quantity;
      existing.totalEstimatedAmount += estimatedValue;
    } else {
      map.set(cleanName, {
        name: cleanName,
        category,
        quantity,
        totalEstimatedAmount: estimatedValue,
      });
    }
  },

  /**
   * Generates a printable and downloadable PDF with the complete breakdown per item and dates.
   */
  generatePdfReport(
    customer: Customer,
    settings: StoreSettings,
    entries: FiadoEntry[],
    periodLabel: string
  ): string {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const breakdown = this.parseEntries(entries, settings.products || []);
    const now = new Date();
    const dateFormatted = now.toLocaleDateString('pt-BR');
    const timeFormatted = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    const primaryColor: [number, number, number] = [6, 95, 70]; // Emerald 800
    const darkSlate: [number, number, number] = [30, 41, 59]; // Slate 800
    const lightGray: [number, number, number] = [241, 245, 249]; // Slate 100

    const pageWidth = doc.internal.pageSize.getWidth();
    let currentY = 15;

    // 1. Header Banner
    doc.setFillColor(...primaryColor);
    doc.rect(0, 0, pageWidth, 28, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.text(settings.storeName || 'ESTABELECIMENTO COMERCIAL', 14, 12);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    const storeSub = [
      settings.ownerName ? `Resp: ${settings.ownerName}` : '',
      settings.phone ? `WhatsApp: ${settings.phone}` : '',
      settings.city ? `Cidade: ${settings.city}` : '',
    ]
      .filter(Boolean)
      .join('   |   ');
    doc.text(storeSub || 'Controle de Fiados e Marmitex', 14, 18);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('EXTRATO DE FECHAMENTO', pageWidth - 14, 12, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(`Período: ${periodLabel}`, pageWidth - 14, 18, { align: 'right' });

    currentY = 33;

    // 2. Customer Identification
    doc.setFillColor(...lightGray);
    doc.roundedRect(14, currentY, pageWidth - 28, 22, 2, 2, 'F');

    doc.setTextColor(...darkSlate);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    const typeLabel = customer.customerType === 'empresa' ? '[EMPRESA / CONVÊNIO]' : '[PESSOA FÍSICA]';
    doc.text(`${customer.name} ${customer.nickname ? `(${customer.nickname})` : ''} ${typeLabel}`, 18, currentY + 6);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    const docNumber = customer.cnpj || customer.cpf || 'Não informado';
    const phone = customer.phone || 'Não informado';
    doc.text(`CPF / CNPJ: ${docNumber}     |     WhatsApp: ${phone}     |     Emissão: ${dateFormatted} às ${timeFormatted}`, 18, currentY + 12);

    const address = customer.address || 'Não cadastrado';
    doc.text(`Endereço / Setor: ${address}`, 18, currentY + 17);

    currentY += 27;

    // 3. Highlighted Metrics per Item Type (Quantas Marmitex, Refrigerantes, Águas, etc.)
    const cardWidth = (pageWidth - 28 - 9) / 4;

    // Marmitex Card
    doc.setFillColor(236, 253, 245);
    doc.setDrawColor(167, 243, 208);
    doc.roundedRect(14, currentY, cardWidth, 18, 2, 2, 'FD');
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(6, 95, 70);
    doc.text('TOTAL DE MARMITAS', 14 + cardWidth / 2, currentY + 5.5, { align: 'center' });
    doc.setFontSize(13);
    doc.text(`${breakdown.categoryTotals.marmitex} un.`, 14 + cardWidth / 2, currentY + 13.5, { align: 'center' });

    // Bebidas Card (Refris / Sucos / Águas)
    doc.setFillColor(239, 246, 255);
    doc.setDrawColor(191, 219, 254);
    doc.roundedRect(14 + (cardWidth + 3), currentY, cardWidth, 18, 2, 2, 'FD');
    doc.setFontSize(7);
    doc.setTextColor(29, 78, 216);
    doc.text('BEBIDAS (REFRIS/ÁGUAS)', 14 + (cardWidth + 3) + cardWidth / 2, currentY + 5.5, { align: 'center' });
    doc.setFontSize(13);
    doc.text(`${breakdown.categoryTotals.bebidas} un.`, 14 + (cardWidth + 3) + cardWidth / 2, currentY + 13.5, { align: 'center' });

    // Total de Itens Card
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(14 + (cardWidth + 3) * 2, currentY, cardWidth, 18, 2, 2, 'FD');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text('TOTAL DE PRODUTOS', 14 + (cardWidth + 3) * 2 + cardWidth / 2, currentY + 5.5, { align: 'center' });
    doc.setFontSize(13);
    doc.setTextColor(...darkSlate);
    doc.text(`${breakdown.categoryTotals.totalItems} itens`, 14 + (cardWidth + 3) * 2 + cardWidth / 2, currentY + 13.5, { align: 'center' });

    // Total em Reais
    doc.setFillColor(254, 242, 242);
    doc.setDrawColor(254, 202, 202);
    doc.roundedRect(14 + (cardWidth + 3) * 3, currentY, cardWidth, 18, 2, 2, 'FD');
    doc.setFontSize(7);
    doc.setTextColor(153, 27, 27);
    doc.text('VALOR TOTAL DA CONTA', 14 + (cardWidth + 3) * 3 + cardWidth / 2, currentY + 5.5, { align: 'center' });
    doc.setFontSize(12);
    doc.setTextColor(185, 28, 28);
    doc.text(`R$ ${breakdown.totalAmount.toFixed(2)}`, 14 + (cardWidth + 3) * 3 + cardWidth / 2, currentY + 13.5, { align: 'center' });

    currentY += 24;

    // 4. Table 1: Extrato Consolidado por Item (Quantos de cada)
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...darkSlate);
    doc.text('1. Resumo Quantitativo por Produto / Item Consumido', 14, currentY);
    currentY += 3;

    const itemsTableRows = breakdown.items.map((item) => {
      const catLabel =
        item.category === 'marmitex' ? 'Marmitex / Almoço' : item.category === 'bebidas' ? 'Bebida / Refresco' : 'Outros';
      return [
        item.name,
        catLabel,
        `${item.quantity} un.`,
        `R$ ${item.totalEstimatedAmount.toFixed(2)}`,
      ];
    });

    if (itemsTableRows.length === 0) {
      itemsTableRows.push(['Nenhum item discriminado', '-', '0', 'R$ 0,00']);
    }

    autoTable(doc, {
      startY: currentY,
      head: [['Produto / Discriminação', 'Categoria', 'Quantidade Total', 'Subtotal Estimado']],
      body: itemsTableRows,
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
        0: { cellWidth: 'auto', fontStyle: 'bold' },
        1: { cellWidth: 45 },
        2: { cellWidth: 32, halign: 'center', fontStyle: 'bold' },
        3: { cellWidth: 35, halign: 'right', fontStyle: 'bold' },
      },
    });

    // @ts-expect-error autoTable adds lastAutoTable
    currentY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 8 : currentY + 35;

    // Check if new page is needed for chronological list
    if (currentY > 210) {
      doc.addPage();
      currentY = 15;
    }

    // 5. Table 2: Extrato Detalhado Dia a Dia (Datas e Compras)
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...darkSlate);
    doc.text(`2. Extrato Cronológico de Compras e Datas (${entries.length} lançamentos)`, 14, currentY);
    currentY += 3;

    // Sort entries chronologically
    const sortedEntries = [...entries].sort((a, b) => (a.date || '').localeCompare(b.date || ''));

    const datesRows = sortedEntries.map((e) => {
      const dateFormatted = e.date ? new Date(e.date + 'T12:00:00').toLocaleDateString('pt-BR') : '-';
      const statusLabel = e.status === 'paid' ? 'QUITADO' : 'EM ABERTO';
      return [
        dateFormatted,
        e.description || 'Consumo no fiado',
        statusLabel,
        `R$ ${e.amount.toFixed(2)}`,
      ];
    });

    autoTable(doc, {
      startY: currentY,
      head: [['Data', 'Discriminação do Consumo / Marmitex', 'Situação', 'Valor']],
      body: datesRows,
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
        0: { cellWidth: 24, fontStyle: 'bold' },
        1: { cellWidth: 'auto' },
        2: { cellWidth: 26, halign: 'center', fontStyle: 'bold' },
        3: { cellWidth: 28, halign: 'right', fontStyle: 'bold' },
      },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 2) {
          if (String(data.cell.raw) === 'QUITADO') {
            data.cell.styles.textColor = [5, 150, 105];
          } else {
            data.cell.styles.textColor = [225, 29, 72];
          }
        }
      },
    });

    // @ts-expect-error autoTable adds lastAutoTable
    currentY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 8 : currentY + 30;

    if (currentY > 245) {
      doc.addPage();
      currentY = 15;
    }

    // 6. PIX Payment Box
    if (settings.pixKey) {
      doc.setFillColor(240, 253, 244);
      doc.setDrawColor(187, 247, 208);
      doc.roundedRect(14, currentY, pageWidth - 28, 14, 2, 2, 'FD');

      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(20, 83, 45);
      doc.text(
        `CHAVE PIX PARA ACERTO: ${settings.pixKey} (${settings.pixKeyType?.toUpperCase() || 'CHAVE'})   |   FAVORECIDO: ${settings.storeName}`,
        pageWidth / 2,
        currentY + 8,
        { align: 'center' }
      );
      currentY += 18;
    }

    // 7. Signature Line for Customer
    if (currentY > 255) {
      doc.addPage();
      currentY = 20;
    }

    doc.setDrawColor(203, 213, 225);
    doc.line(pageWidth / 2 - 45, currentY + 10, pageWidth / 2 + 45, currentY + 10);

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(
      `Conferido e De Acordo: ${customer.name}`,
      pageWidth / 2,
      currentY + 14,
      { align: 'center' }
    );

    const cleanCustomerName = customer.name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '_')
      .slice(0, 20);
    const filename = `extrato_fechamento_${cleanCustomerName}_${now.toISOString().split('T')[0]}.pdf`;

    doc.save(filename);
    return filename;
  },

  /**
   * Generates a pre-formatted WhatsApp text with the breakdown by items and dates.
   */
  formatWhatsAppText(
    customer: Customer,
    settings: StoreSettings,
    entries: FiadoEntry[],
    periodLabel: string
  ): string {
    const breakdown = this.parseEntries(entries, settings.products || []);
    const greeting = customer.nickname ? `Olá, ${customer.nickname}!` : `Olá, ${customer.name}!`;

    let msg = `🍽️ *${settings.storeName || 'ESTABELECIMENTO'}* - Fechamento de Conta\n\n`;
    msg += `${greeting} Segue o seu *extrato de fechamento* referente a *${periodLabel}* para simples conferência:\n\n`;

    msg += `📦 *QUANTITATIVO DE PRODUTOS CONSUMIDOS:*\n`;
    if (breakdown.items.length > 0) {
      breakdown.items.forEach((item) => {
        msg += `• *${item.quantity}x* ${item.name} (~R$ ${item.totalEstimatedAmount.toFixed(2)})\n`;
      });
    } else {
      msg += `• Consumos do período\n`;
    }

    msg += `\n📊 *RESUMO GERAL:*\n`;
    msg += `🍲 Total de Marmitex: *${breakdown.categoryTotals.marmitex} un.*\n`;
    if (breakdown.categoryTotals.bebidas > 0) {
      msg += `🥤 Total de Bebidas: *${breakdown.categoryTotals.bebidas} un.*\n`;
    }
    msg += `📦 Total de Itens: *${breakdown.categoryTotals.totalItems} produtos*\n`;
    msg += `💰 *VALOR TOTAL: R$ ${breakdown.totalAmount.toFixed(2)}*\n\n`;

    msg += `📅 *DATAS DOS CONSUMOS:*\n`;
    const sorted = [...entries].sort((a, b) => (a.date || '').localeCompare(b.date || ''));
    sorted.slice(0, 15).forEach((e) => {
      const dt = e.date ? new Date(e.date + 'T12:00:00').toLocaleDateString('pt-BR') : '-';
      msg += `- ${dt}: ${e.description} (R$ ${e.amount.toFixed(2)})\n`;
    });

    if (sorted.length > 15) {
      msg += `... e mais ${sorted.length - 15} consumo(s).\n`;
    }

    if (settings.pixKey) {
      msg += `\n🔑 *Chave PIX para Pagamento:*\n`;
      msg += `*${settings.pixKey}* (${settings.pixKeyType?.toUpperCase() || 'PIX'})\n`;
      msg += `Beneficiário: ${settings.storeName}\n`;
    }

    msg += `\nQualquer dúvida estamos à disposição. Muito obrigado pela preferência!`;

    return msg;
  },
};

import React, { useState, useEffect } from 'react';
import {
  X,
  Check,
  Calendar,
  DollarSign,
  Tag,
  Percent,
  Plus,
  Minus,
  UtensilsCrossed,
  CupSoda,
  FileText,
  RotateCcw,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { Customer, FiadoEntry, ProductItem } from '../types';
import { StorageService } from '../services/storage';
import { PRODUCT_CATEGORIES, getCategoryMeta } from '../constants/categories';

interface EditFiadoModalProps {
  entry: FiadoEntry;
  customer: Customer;
  products?: ProductItem[];
  onClose: () => void;
  onSave: (updatedEntry: FiadoEntry) => void;
  onDelete?: (entryId: string) => void;
}

export const EditFiadoModal: React.FC<EditFiadoModalProps> = ({
  entry,
  customer,
  products = StorageService.getStoreSettings().products || [],
  onClose,
  onSave,
  onDelete,
}) => {
  const [activeTab, setActiveTab] = useState<'itens' | 'desconto' | 'datas'>('itens');

  const [date, setDate] = useState(entry.date || '');
  const [dueDate, setDueDate] = useState(entry.dueDate || '');
  const [description, setDescription] = useState(entry.description || '');
  const [notes, setNotes] = useState(entry.notes || '');

  // Subtotal and Discount states
  const initialOriginal = entry.originalAmount || entry.amount;
  const [rawSubtotal, setRawSubtotal] = useState<number>(initialOriginal);
  const [discountType, setDiscountType] = useState<'none' | 'fixed' | 'percent'>(
    entry.discountType || 'none'
  );
  const [discountValue, setDiscountValue] = useState<string>(
    entry.discountValue !== undefined && entry.discountValue > 0
      ? String(entry.discountValue)
      : ''
  );
  const [finalAmount, setFinalAmount] = useState<string>(entry.amount.toFixed(2));
  const [manualOverride, setManualOverride] = useState(false);

  // Categorias de produtos selecionadas no lançamento
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    entry.categories && entry.categories.length > 0 ? entry.categories : ['marmitex']
  );

  const handleToggleCategory = (catId: string) => {
    setSelectedCategories((prev) =>
      prev.includes(catId) ? prev.filter((c) => c !== catId) : [...prev, catId]
    );
  };

  // Cart of product items for quick adjustments
  const [cart, setCart] = useState<{ [productId: string]: number }>({});

  // Parse existing description into cart items if matched
  useEffect(() => {
    const initialCart: { [id: string]: number } = {};
    const parts = (entry.description || '').split(/\s*\+\s*/);
    parts.forEach((p) => {
      const match = p.match(/^(\d+)\s*[xX]\s*(.+)$/);
      if (match) {
        const qty = parseInt(match[1], 10);
        const name = match[2].trim().toLowerCase();
        const found = products.find((prod) => prod.name.toLowerCase() === name);
        if (found) {
          initialCart[found.id] = (initialCart[found.id] || 0) + qty;
        }
      }
    });
    setCart(initialCart);
  }, []);

  // Recalculate price and description from cart
  const handleItemQuantityChange = (productId: string, delta: number) => {
    const current = cart[productId] || 0;
    const next = Math.max(0, current + delta);
    const newCart = { ...cart, [productId]: next };
    if (next === 0) {
      delete newCart[productId];
    }
    setCart(newCart);

    if (delta > 0) {
      const prod = products.find((p) => p.id === productId);
      if (prod && prod.category) {
        setSelectedCategories((prev) =>
          prev.includes(prod.category) ? prev : [...prev, prod.category]
        );
      }
    }

    // Build new description and subtotal
    let subtotal = 0;
    const descParts: string[] = [];
    Object.entries(newCart).forEach(([pId, q]) => {
      if (q > 0) {
        const prod = products.find((p) => p.id === pId);
        if (prod) {
          subtotal += prod.price * q;
          descParts.push(`${q}x ${prod.name}`);
        }
      }
    });

    if (descParts.length > 0) {
      setDescription(descParts.join(' + '));
      setRawSubtotal(subtotal);
      setManualOverride(false);
    }
  };

  // Recalculate final amount based on subtotal and discount
  useEffect(() => {
    if (manualOverride) return;

    let total = rawSubtotal;
    const val = parseFloat(discountValue.replace(',', '.')) || 0;

    if (discountType === 'percent' && val > 0) {
      const disc = total * (val / 100);
      total = Math.max(0, total - disc);
    } else if (discountType === 'fixed' && val > 0) {
      total = Math.max(0, total - val);
    }

    setFinalAmount(total.toFixed(2));
  }, [rawSubtotal, discountType, discountValue, manualOverride]);

  const handleApplyDiscountShortcut = (type: 'percent' | 'fixed', val: number) => {
    setDiscountType(type);
    setDiscountValue(String(val));
    setManualOverride(false);
  };

  const handleClearDiscount = () => {
    setDiscountType('none');
    setDiscountValue('');
    setManualOverride(false);
  };

  const handleSave = () => {
    const numFinal = parseFloat(finalAmount.replace(',', '.')) || 0;
    const discNum = parseFloat(discountValue.replace(',', '.')) || 0;

    const finalCats =
      selectedCategories.length > 0
        ? selectedCategories
        : entry.categories && entry.categories.length > 0
        ? entry.categories
        : ['marmitex'];

    const updated: FiadoEntry = {
      ...entry,
      date,
      dueDate,
      description: description.trim() || 'Consumo do dia',
      notes: notes.trim() || undefined,
      amount: numFinal,
      originalAmount: rawSubtotal,
      discountType,
      discountValue: discNum,
      categories: finalCats,
    };

    onSave(updated);
    onClose();
  };

  const marmitexProducts = products.filter((p) => p.category === 'marmitex');
  const bebidasProducts = products.filter((p) => p.category === 'bebidas');
  const outrosProducts = products.filter((p) => p.category === 'outros');

  return (
    <div className="fixed inset-0 z-80 flex items-center justify-center bg-black/75 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-emerald-900 p-5 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-800 border border-emerald-600 flex items-center justify-center text-amber-300 font-bold shrink-0">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-bold text-white">Editar Consumo do Dia</h3>
                <span className="text-[11px] bg-emerald-800 text-emerald-200 px-2 py-0.5 rounded-full font-mono font-bold">
                  {date ? new Date(date + 'T12:00:00').toLocaleDateString('pt-BR') : 'Data'}
                </span>
              </div>
              <p className="text-xs text-emerald-200 mt-0.5">
                Cliente: <strong>{customer.name}</strong> • Saldo atual do lançamento:{' '}
                <strong>R$ {entry.amount.toFixed(2)}</strong>
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

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-5 text-xs font-bold shrink-0 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('itens')}
            className={`py-3 px-4 border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'itens'
                ? 'border-emerald-600 text-emerald-900 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <UtensilsCrossed className="w-3.5 h-3.5" />
            <span>1. Itens & Produtos</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('desconto')}
            className={`py-3 px-4 border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'desconto'
                ? 'border-emerald-600 text-emerald-900 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Tag className="w-3.5 h-3.5 text-amber-500" />
            <span>2. Desconto & Valor</span>
            {discountType !== 'none' && (
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('datas')}
            className={`py-3 px-4 border-b-2 transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'datas'
                ? 'border-emerald-600 text-emerald-900 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>3. Datas & Notas</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* TAB 1: ITENS E PRODUTOS */}
          {activeTab === 'itens' && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Discriminação dos Produtos / Itens
                </label>
                <input
                  type="text"
                  placeholder="Ex: 2x Marmitex M + 1x Coca-Cola Lata"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 bg-white focus:ring-2 focus:ring-emerald-500"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Você pode digitar livremente acima ou usar os botões de ajuste rápido do cardápio abaixo:
                </p>
              </div>

              {/* Categorias de Produtos */}
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-emerald-700" />
                    Categorias deste Lançamento:
                  </span>
                  <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                    {selectedCategories.length === 0
                      ? 'Nenhuma'
                      : `${selectedCategories.length} selecionada(s)`}
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                  {PRODUCT_CATEGORIES.map((cat) => {
                    const isSelected = selectedCategories.includes(cat.id);
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => handleToggleCategory(cat.id)}
                        className={`p-2 rounded-xl border text-center transition flex flex-col items-center justify-center text-xs font-bold ${
                          isSelected
                            ? 'bg-emerald-700 text-white border-emerald-700 shadow-2xs'
                            : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        <span className="text-base">{cat.icon}</span>
                        <span className="text-[11px] mt-0.5">{cat.shortLabel}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Seletor Rápido do Cardápio */}
              <div className="space-y-3 pt-2">
                <span className="text-xs font-bold text-slate-800 block">
                  Ajustar Quantidades do Cardápio:
                </span>

                {/* Marmitex */}
                <div>
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                    Marmitas & Almoços
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {marmitexProducts.map((prod) => {
                      const qty = cart[prod.id] || 0;
                      return (
                        <div
                          key={prod.id}
                          className={`p-2.5 rounded-xl border flex items-center justify-between transition ${
                            qty > 0 ? 'bg-emerald-50/70 border-emerald-300' : 'bg-white border-slate-200'
                          }`}
                        >
                          <div className="min-w-0 pr-2">
                            <span className="text-xs font-bold text-slate-800 block truncate">
                              {prod.name}
                            </span>
                            <span className="text-[11px] text-slate-400">
                              R$ {prod.price.toFixed(2)}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleItemQuantityChange(prod.id, -1)}
                              disabled={qty <= 0}
                              className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center justify-center disabled:opacity-30"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="w-5 text-center font-bold text-xs font-mono">
                              {qty}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleItemQuantityChange(prod.id, 1)}
                              className="w-7 h-7 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold flex items-center justify-center"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Bebidas */}
                {bebidasProducts.length > 0 && (
                  <div>
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                      Bebidas & Refrigerantes
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {bebidasProducts.slice(0, 6).map((prod) => {
                        const qty = cart[prod.id] || 0;
                        return (
                          <div
                            key={prod.id}
                            className={`p-2.5 rounded-xl border flex items-center justify-between transition ${
                              qty > 0 ? 'bg-blue-50/70 border-blue-300' : 'bg-white border-slate-200'
                            }`}
                          >
                            <div className="min-w-0 pr-2">
                              <span className="text-xs font-bold text-slate-800 block truncate">
                                {prod.name}
                              </span>
                              <span className="text-[11px] text-slate-400">
                                R$ {prod.price.toFixed(2)}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleItemQuantityChange(prod.id, -1)}
                                disabled={qty <= 0}
                                className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center justify-center disabled:opacity-30"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="w-5 text-center font-bold text-xs font-mono">
                                {qty}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleItemQuantityChange(prod.id, 1)}
                                className="w-7 h-7 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center justify-center"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: ABA DE DESCONTO & VALOR */}
          {activeTab === 'desconto' && (
            <div className="space-y-4">
              {/* Resumo do Subtotal */}
              <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                    Subtotal dos Itens (Valor Bruto)
                  </span>
                  <div className="text-xl font-black text-slate-800">
                    R$ {rawSubtotal.toFixed(2)}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-slate-500 font-medium">Editar Bruto:</label>
                  <input
                    type="number"
                    step="0.01"
                    value={rawSubtotal || ''}
                    onChange={(e) => {
                      setRawSubtotal(parseFloat(e.target.value) || 0);
                      setManualOverride(false);
                    }}
                    className="w-24 p-1.5 rounded-lg border border-slate-300 text-xs font-bold text-slate-900 bg-white text-right"
                  />
                </div>
              </div>

              {/* Opções de Desconto */}
              <div className="bg-amber-50/70 border border-amber-200 p-4 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5 uppercase tracking-wider">
                    <Tag className="w-4 h-4 text-amber-600" />
                    Aplicar Desconto no Dia
                  </span>
                  {discountType !== 'none' && (
                    <button
                      type="button"
                      onClick={handleClearDiscount}
                      className="text-[11px] text-amber-800 underline font-bold"
                    >
                      Remover Desconto
                    </button>
                  )}
                </div>

                {/* Tipo de Desconto */}
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setDiscountType('none');
                      setDiscountValue('');
                      setManualOverride(false);
                    }}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition ${
                      discountType === 'none'
                        ? 'bg-white border-slate-400 text-slate-900 shadow-2xs'
                        : 'bg-white/60 border-slate-200 text-slate-600'
                    }`}
                  >
                    Sem Desconto
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setDiscountType('fixed');
                      setManualOverride(false);
                    }}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1 ${
                      discountType === 'fixed'
                        ? 'bg-amber-100 border-amber-400 text-amber-950 font-black shadow-2xs'
                        : 'bg-white/60 border-slate-200 text-slate-600'
                    }`}
                  >
                    <DollarSign className="w-3.5 h-3.5" />
                    <span>Em Reais (R$)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setDiscountType('percent');
                      setManualOverride(false);
                    }}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1 ${
                      discountType === 'percent'
                        ? 'bg-amber-100 border-amber-400 text-amber-950 font-black shadow-2xs'
                        : 'bg-white/60 border-slate-200 text-slate-600'
                    }`}
                  >
                    <Percent className="w-3.5 h-3.5" />
                    <span>Em Porcentagem (%)</span>
                  </button>
                </div>

                {/* Input do Valor do Desconto */}
                {discountType !== 'none' && (
                  <div className="space-y-2 pt-1 animate-in fade-in">
                    <label className="text-xs font-bold text-amber-950 block">
                      {discountType === 'percent'
                        ? 'Digite a porcentagem de desconto (%):'
                        : 'Digite o valor em dinheiro do desconto (R$):'}
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.01"
                        placeholder={discountType === 'percent' ? 'Ex: 10%' : 'Ex: 5.00'}
                        value={discountValue}
                        onChange={(e) => {
                          setDiscountValue(e.target.value);
                          setManualOverride(false);
                        }}
                        className="w-full p-2.5 rounded-xl border border-amber-300 bg-white font-bold text-sm text-slate-900 focus:ring-2 focus:ring-amber-500"
                      />
                      <span className="absolute right-3 top-2.5 font-bold text-xs text-amber-800">
                        {discountType === 'percent' ? '%' : 'R$'}
                      </span>
                    </div>

                    {/* Atalhos Rápidos de Desconto */}
                    <div className="flex items-center gap-1.5 flex-wrap pt-1">
                      <span className="text-[11px] text-amber-900 font-medium">Atalhos:</span>
                      {discountType === 'percent' ? (
                        <>
                          {[5, 10, 15, 20].map((pct) => (
                            <button
                              key={pct}
                              type="button"
                              onClick={() => handleApplyDiscountShortcut('percent', pct)}
                              className="py-1 px-2 rounded-lg bg-white border border-amber-200 text-amber-900 text-[11px] font-bold hover:bg-amber-100 transition"
                            >
                              {pct}%
                            </button>
                          ))}
                        </>
                      ) : (
                        <>
                          {[2, 3, 5, 10, 15].map((val) => (
                            <button
                              key={val}
                              type="button"
                              onClick={() => handleApplyDiscountShortcut('fixed', val)}
                              className="py-1 px-2 rounded-lg bg-white border border-amber-200 text-amber-900 text-[11px] font-bold hover:bg-amber-100 transition"
                            >
                              - R$ {val},00
                            </button>
                          ))}
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Valor Final a Cobrar do Dia */}
              <div className="bg-emerald-50 border border-emerald-300 p-4 rounded-2xl">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider block">
                      Valor Final a Cobrar no Dia
                    </span>
                    <span className="text-[11px] text-emerald-700">
                      {discountType !== 'none' && discountValue
                        ? `(Com desconto de ${discountType === 'percent' ? `${discountValue}%` : `R$ ${discountValue}`})`
                        : '(Sem descontos aplicados)'}
                    </span>
                  </div>
                  <div className="w-36">
                    <div className="relative">
                      <span className="absolute left-2.5 top-2.5 font-bold text-xs text-emerald-800">
                        R$
                      </span>
                      <input
                        type="number"
                        step="0.01"
                        value={finalAmount}
                        onChange={(e) => {
                          setFinalAmount(e.target.value);
                          setManualOverride(true);
                        }}
                        className="w-full pl-8 pr-2.5 py-2 rounded-xl border border-emerald-400 bg-white font-black text-lg text-emerald-950 text-right focus:ring-2 focus:ring-emerald-600"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: DATAS E VENCIMENTO */}
          {activeTab === 'datas' && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Data do Consumo (Dia do Lançamento) *
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-800 bg-white focus:ring-2 focus:ring-emerald-500"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Ex: Se o cliente pegou a marmita no dia 04/10/2026, selecione essa data aqui.
                </p>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Data de Vencimento
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-800 bg-white focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Observações / Detalhes Adicionais (opcional)
                </label>
                <textarea
                  rows={3}
                  placeholder="Ex: Entregue para o funcionário Carlos, sem salada, etc."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-xs text-slate-800 bg-white"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            {onDelete && (
              <button
                type="button"
                onClick={() => onDelete(entry.id)}
                className="py-2.5 px-3.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold border border-rose-200 transition flex items-center gap-1.5 cursor-pointer active:scale-95"
                title="Excluir este lançamento de marmitex permanentemente"
              >
                <Trash2 className="w-4 h-4 text-rose-600" />
                <span className="hidden sm:inline">Excluir Marmitex</span>
                <span className="sm:hidden">Excluir</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="py-2.5 px-4 rounded-xl bg-white hover:bg-slate-200 text-slate-700 text-xs font-bold border border-slate-200 transition cursor-pointer"
            >
              Cancelar
            </button>
          </div>

          <button
            type="button"
            onClick={handleSave}
            className="py-2.5 px-6 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-black flex items-center gap-2 transition shadow-md active:scale-95 cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>Salvar Alterações</span>
          </button>
        </div>
      </div>
    </div>
  );
};

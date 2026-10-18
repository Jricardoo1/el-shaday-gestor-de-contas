import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Plus,
  Minus,
  Check,
  AlertTriangle,
  UtensilsCrossed,
  RotateCcw,
  Building2,
  Tag,
  Scale,
  DollarSign,
  Calendar,
  Sparkles,
  Wallet,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { Customer, FiadoEntry, ProductItem } from '../types';
import { StorageService, getRelativeDateString } from '../services/storage';
import { PRODUCT_CATEGORIES, getCategoryMeta } from '../constants/categories';

interface NewFiadoModalProps {
  customers: Customer[];
  selectedCustomerId?: string;
  defaultDueDays?: number;
  products?: ProductItem[];
  onClose: () => void;
  onSave: (entry: FiadoEntry, openWhatsAppReceipt?: boolean) => void;
  onOpenNewCustomer: () => void;
}

export const NewFiadoModal: React.FC<NewFiadoModalProps> = ({
  customers,
  selectedCustomerId,
  defaultDueDays = 15,
  products = StorageService.getStoreSettings().products || [],
  onClose,
  onSave,
  onOpenNewCustomer,
}) => {
  const [customerId, setCustomerId] = useState(selectedCustomerId || (customers[0]?.id || ''));
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(getRelativeDateString(0));
  const [dueDate, setDueDate] = useState(getRelativeDateString(defaultDueDays));
  const [sendWhatsApp, setSendWhatsApp] = useState(true);
  const [error, setError] = useState('');

  // Cart for items: { [productId]: quantity }
  const [orderItems, setOrderItems] = useState<{ [productId: string]: number }>({});

  // Categorias de produtos selecionadas no lançamento
  const [selectedCategories, setSelectedCategories] = useState<string[]>(['marmitex']);

  // KG Meal state
  const [showKgModal, setShowKgModal] = useState(false);
  const [kgDirectMoney, setKgDirectMoney] = useState('');
  const [kgGrams, setKgGrams] = useState('');
  const [kgExtraItems, setKgExtraItems] = useState<Array<{ name: string; price: number }>>([]);

  const selectedCustomer = customers.find((c) => c.id === customerId);

  // Informações de saldo, dívidas e crédito antecipado disponível
  const debtInfo = customerId ? StorageService.getCustomerDebt(customerId) : null;
  const availableCredit = debtInfo?.creditBalance || 0;
  const [useCredit, setUseCredit] = useState(true);

  // Ativa automaticamente o abatimento por crédito quando o cliente tiver saldo credor
  useEffect(() => {
    setUseCredit(availableCredit > 0);
  }, [customerId, availableCredit]);

  // Inteligência de hábitos de consumo deste cliente
  const customerAnalytics = useMemo(() => {
    if (!customerId) return null;
    return StorageService.getCustomerCategoryAnalytics(customerId);
  }, [customerId]);

  // If customer has monthly closing preference, automatically set due date to end of month!
  useEffect(() => {
    if (selectedCustomer?.billingCycle === 'monthly') {
      const now = new Date();
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      setDueDate(lastDay.toISOString().split('T')[0]);
    }
  }, [customerId, selectedCustomer]);

  // Quick categories
  const marmitexProducts = products.filter((p) => p.category === 'marmitex' && p.id !== 'p_refeicao_kg');
  const kgProduct = products.find((p) => p.id === 'p_refeicao_kg' || p.unit === 'kg');
  const bebidasProducts = products.filter((p) => p.category === 'bebidas');

  // Calculates price for a product taking into account company discount or custom price
  const getProductPrice = (prod: ProductItem): number => {
    if (!selectedCustomer || selectedCustomer.customerType !== 'empresa') {
      return prod.price;
    }
    // 1. Custom table price
    if (
      selectedCustomer.companyDiscountType === 'custom_table' &&
      selectedCustomer.customPrices?.[prod.id] !== undefined
    ) {
      return selectedCustomer.customPrices[prod.id];
    }
    // 2. Fixed discount per marmitex
    if (
      selectedCustomer.companyDiscountType === 'fixed_per_marmita' &&
      prod.category === 'marmitex'
    ) {
      const disc = selectedCustomer.companyDiscountPerMarmita || 0;
      return Math.max(1, prod.price - disc);
    }
    return prod.price;
  };

  // Recalculates cart whenever items, extra KG or customer changes
  const updateFromCart = (
    newCart: { [id: string]: number },
    extras = kgExtraItems,
    customer = selectedCustomer
  ) => {
    let subtotal = 0;
    const parts: string[] = [];

    Object.entries(newCart).forEach(([pId, qty]) => {
      if (qty > 0) {
        const prod = products.find((p) => p.id === pId);
        if (prod) {
          const unitPrice = getProductPrice(prod);
          subtotal += unitPrice * qty;
          parts.push(`${qty}x ${prod.name}`);
        }
      }
    });

    // Add KG meals if any
    extras.forEach((ext) => {
      subtotal += ext.price;
      parts.push(ext.name);
    });

    // Apply overall percentage discount if applicable
    let finalTotal = subtotal;
    if (
      customer &&
      customer.customerType === 'empresa' &&
      customer.companyDiscountType === 'percent' &&
      customer.companyDiscountPercent
    ) {
      const discountVal = subtotal * (customer.companyDiscountPercent / 100);
      finalTotal = Math.max(0, subtotal - discountVal);
      parts.push(`(Desc. Empresa ${customer.companyDiscountPercent}%)`);
    }

    setOrderItems(newCart);
    if (parts.length > 0) {
      setAmount(finalTotal.toFixed(2));
      setDescription(parts.join(' + '));
    }
  };

  const handleAddItem = (product: ProductItem) => {
    const currentQty = orderItems[product.id] || 0;
    const newCart = { ...orderItems, [product.id]: currentQty + 1 };
    updateFromCart(newCart);

    // Auto-adiciona a categoria do produto ao lançamento se ainda não estiver marcada
    const cat = (product.category as string) || 'marmitex';
    setSelectedCategories((prev) => (prev.includes(cat) ? prev : [...prev, cat]));
  };

  const handleClearCart = () => {
    setOrderItems({});
    setKgExtraItems([]);
    setAmount('');
    setDescription('');
  };

  const handleToggleCategory = (catId: string) => {
    setSelectedCategories((prev) => {
      if (prev.includes(catId)) {
        return prev.filter((c) => c !== catId);
      } else {
        return [...prev, catId];
      }
    });
  };

  const handleAddKgMeal = () => {
    let mealPrice = 0;
    let label = 'Almoço no KG';

    if (kgDirectMoney) {
      mealPrice = parseFloat(kgDirectMoney.replace(',', '.'));
      label = `Almoço no KG (R$ ${mealPrice.toFixed(2)})`;
    } else if (kgGrams) {
      const g = parseFloat(kgGrams.replace(',', '.'));
      const kgPrice = kgProduct ? kgProduct.price : 59.90;
      mealPrice = (g / 1000) * kgPrice;
      label = `Almoço no KG (${g}g a R$ ${kgPrice.toFixed(2)}/kg = R$ ${mealPrice.toFixed(2)})`;
    }

    if (mealPrice > 0) {
      const newExtras = [...kgExtraItems, { name: label, price: mealPrice }];
      setKgExtraItems(newExtras);
      updateFromCart(orderItems, newExtras);
      setSelectedCategories((prev) => (prev.includes('marmitex') ? prev : [...prev, 'marmitex']));
      setKgDirectMoney('');
      setKgGrams('');
      setShowKgModal(false);
    }
  };

  const handleShortcutDays = (days: number) => {
    setDueDate(getRelativeDateString(days));
  };

  const handleEndOfMonth = () => {
    const now = new Date();
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    setDueDate(lastDay.toISOString().split('T')[0]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!customerId) {
      setError('Por favor selecione ou cadastre um cliente.');
      return;
    }

    const val = parseFloat(amount.replace(',', '.'));
    if (isNaN(val) || val <= 0) {
      setError('Informe um valor válido maior que zero.');
      return;
    }

    const finalCategories =
      selectedCategories.length > 0 ? selectedCategories : ['marmitex'];

    const creditToUse = useCredit && availableCredit > 0 ? Math.min(val, availableCredit) : 0;
    const paidAmount = creditToUse;
    const paidFromCredit = creditToUse > 0 ? creditToUse : undefined;
    const status = paidAmount >= val ? 'paid' : paidAmount > 0 ? 'partially_paid' : 'pending';

    const entry: FiadoEntry = {
      id: 'f_' + Date.now(),
      customerId,
      amount: val,
      paidAmount,
      paidFromCredit,
      description: description.trim() || 'Marmitex e Bebidas',
      date,
      dueDate,
      status,
      createdAt: new Date().toISOString(),
      categories: finalCategories,
    };

    onSave(entry, sendWhatsApp);
    onClose();
  };

  const [verticalPosition, setVerticalPosition] = useState<'top' | 'center' | 'bottom'>('center');
  const positionClass =
    verticalPosition === 'top'
      ? 'items-start pt-3 sm:pt-6'
      : verticalPosition === 'bottom'
      ? 'items-end pb-3 sm:pb-6'
      : 'items-center';

  return (
    <div className={`fixed inset-0 z-50 flex justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto transition-all duration-300 ${positionClass}`}>
      <div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="bg-emerald-800 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UtensilsCrossed className="w-5 h-5 text-emerald-300" />
            <div>
              <h2 className="text-base font-bold">Lançar Consumo a Prazo</h2>
              <p className="text-xs text-emerald-200">Marmitex, Bebidas, PF e Almoço no KG</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {/* Opções de Subir ou Descer a Janela para organização do layout */}
            <div className="hidden sm:flex items-center bg-black/25 rounded-xl p-0.5 border border-white/10 text-xs">
              <button
                type="button"
                onClick={() => setVerticalPosition('top')}
                title="Subir Janela para o Topo"
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
                title="Descer Janela para a Base"
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
              onClick={onClose}
              className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[82vh] overflow-y-auto">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Selecionar Cliente */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-700">Cliente / Empresa / Obra *</label>
              <button
                type="button"
                onClick={onOpenNewCustomer}
                className="text-xs text-emerald-700 font-bold hover:underline flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                Cadastrar Novo Cliente
              </button>
            </div>

            {customers.length === 0 ? (
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-800 flex items-center justify-between">
                <span>Nenhum cliente cadastrado ainda.</span>
                <button
                  type="button"
                  onClick={onOpenNewCustomer}
                  className="font-bold underline"
                >
                  Cadastrar agora
                </button>
              </div>
            ) : (
              <select
                value={customerId}
                onChange={(e) => {
                  const newId = e.target.value;
                  setCustomerId(newId);
                  const cust = customers.find((c) => c.id === newId);
                  updateFromCart(orderItems, kgExtraItems, cust);
                }}
                required
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-800 bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-medium"
              >
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.customerType === 'empresa' ? '🏢 [EMPRESA] ' : '👤 '}
                    {c.name} {c.nickname ? `(${c.nickname})` : ''}
                  </option>
                ))}
              </select>
            )}

            {/* Aviso visual de condições especiais da empresa */}
            {selectedCustomer?.customerType === 'empresa' && (
              <div className="mt-2 p-2.5 rounded-xl bg-amber-50 border border-amber-300/80 text-xs flex items-center gap-2 text-amber-900">
                <Building2 className="w-4 h-4 text-amber-700 shrink-0" />
                <div>
                  <span className="font-bold block">
                    Empresa Conveniada — Condições Especiais Ativas!
                  </span>
                  <span className="text-[11px] text-amber-800">
                    {selectedCustomer.companyDiscountType === 'fixed_per_marmita' &&
                      `R$ ${(selectedCustomer.companyDiscountPerMarmita || 0).toFixed(2)} de desconto por marmita aplicado automaticamente.`}
                    {selectedCustomer.companyDiscountType === 'percent' &&
                      `${selectedCustomer.companyDiscountPercent || 0}% de desconto corporativo no pedido total.`}
                    {selectedCustomer.companyDiscountType === 'custom_table' &&
                      'Tabela de preços personalizados acordada com a empresa.'}
                    {selectedCustomer.billingCycle === 'monthly' &&
                      ' • Fechamento Mensal programado.'}
                  </span>
                </div>
              </div>
            )}

            {/* Inteligência de Consumo: O que este cliente mais compra */}
            {customerAnalytics && customerAnalytics.categories.length > 0 && (
              <div className="mt-2.5 p-2.5 rounded-xl bg-gradient-to-r from-emerald-50/90 via-teal-50/70 to-amber-50/70 border border-emerald-200 text-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 flex items-center gap-1.5 text-[11px]">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    O que {selectedCustomer?.name?.split(' ')[0] || 'este cliente'} mais compra:
                  </span>
                  {customerAnalytics.topCategory && (
                    <span className="text-[10px] font-black text-emerald-800 bg-white px-2 py-0.5 rounded-full border border-emerald-300 shadow-2xs">
                      {customerAnalytics.topCategory.icon} {customerAnalytics.topCategory.percentage}% do total
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {customerAnalytics.categories.map((c) => (
                    <button
                      key={c.category}
                      type="button"
                      onClick={() => {
                        if (!selectedCategories.includes(c.category)) {
                          setSelectedCategories((prev) => [...prev, c.category]);
                        }
                      }}
                      title={`Clique para adicionar categoria ${c.label}`}
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border transition flex items-center gap-1 ${
                        selectedCategories.includes(c.category)
                          ? 'bg-emerald-700 text-white border-emerald-700 shadow-2xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:border-emerald-400'
                      }`}
                    >
                      <span>{c.icon}</span>
                      <span>{c.label.split('&')[0].trim()}:</span>
                      <span className={selectedCategories.includes(c.category) ? 'text-amber-200' : 'text-emerald-700 font-extrabold'}>
                        {c.percentage}%
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Aviso de Crédito Antecipado Disponível */}
            {availableCredit > 0 && (
              <div className="mt-2.5 p-3 rounded-2xl bg-emerald-50 border-2 border-emerald-500 shadow-xs space-y-2 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xl shrink-0">💳</span>
                    <div>
                      <span className="text-xs font-bold text-emerald-950 block">
                        Cliente possui R$ {availableCredit.toFixed(2)} de Crédito Antecipado!
                      </span>
                      <span className="text-[11px] text-emerald-800">
                        O cliente já pagou antecipadamente. O consumo pode ser abatido automaticamente deste saldo.
                      </span>
                    </div>
                  </div>
                </div>

                <label className="flex items-center gap-2.5 p-2 bg-white rounded-xl border border-emerald-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useCredit}
                    onChange={(e) => setUseCredit(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded-sm focus:ring-emerald-500"
                  />
                  <div className="text-xs">
                    <span className="font-bold text-emerald-950 block">
                      Abater este consumo do crédito antecipado do cliente
                    </span>
                    <span className="text-[11px] text-emerald-700">
                      {amount && parseFloat(amount.replace(',', '.')) > 0
                        ? `Abaterá R$ ${Math.min(parseFloat(amount.replace(',', '.')), availableCredit).toFixed(2)}. Saldo restante de crédito: R$ ${Math.max(0, availableCredit - parseFloat(amount.replace(',', '.'))).toFixed(2)}`
                        : `Saldo de crédito disponível: R$ ${availableCredit.toFixed(2)}`}
                    </span>
                  </div>
                </label>
              </div>
            )}
          </div>

          {/* QUICK PICKER: MARMITEX, PF, KG E BEBIDAS */}
          <div className="p-3.5 bg-emerald-50/60 rounded-2xl border border-emerald-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-950 flex items-center gap-1.5 uppercase tracking-wider">
                <UtensilsCrossed className="w-4 h-4 text-emerald-700" />
                Toque Rápido no Cardápio:
              </span>
              {(Object.keys(orderItems).length > 0 || kgExtraItems.length > 0) && (
                <button
                  type="button"
                  onClick={handleClearCart}
                  className="text-[11px] text-slate-500 hover:text-rose-600 font-semibold flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  Limpar itens
                </button>
              )}
            </div>

            {/* Marmitex, PF e Balança */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold text-slate-700 block">
                🍱 Marmitex & Pratos:
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {marmitexProducts.map((p) => {
                  const qty = orderItems[p.id] || 0;
                  const effPrice = getProductPrice(p);
                  const hasDiscount = effPrice < p.price;

                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleAddItem(p)}
                      className={`p-2 rounded-xl border text-center transition flex flex-col items-center justify-center relative active:scale-95 ${
                        qty > 0
                          ? 'border-emerald-600 bg-emerald-600 text-white shadow-xs'
                          : 'border-slate-300 bg-white text-slate-800 hover:bg-emerald-50/50'
                      }`}
                    >
                      {qty > 0 && (
                        <span className="absolute -top-1.5 -right-1.5 bg-amber-400 text-slate-950 text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center border border-white">
                          {qty}
                        </span>
                      )}
                      <span className="font-bold text-xs truncate max-w-full">{p.name}</span>
                      <div className="flex items-center gap-1">
                        <span className={`text-[11px] font-black ${qty > 0 ? 'text-emerald-100' : 'text-emerald-700'}`}>
                          R$ {effPrice.toFixed(2)}
                        </span>
                        {hasDiscount && (
                          <span className={`text-[9px] line-through ${qty > 0 ? 'text-emerald-200' : 'text-slate-400'}`}>
                            {p.price.toFixed(2)}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}

                {/* BOTÃO ESPECIAL: PREÇO NO KG */}
                <button
                  type="button"
                  onClick={() => setShowKgModal(true)}
                  className="p-2 rounded-xl border-2 border-dashed border-amber-500 bg-amber-50/80 hover:bg-amber-100/80 text-amber-950 text-center transition flex flex-col items-center justify-center active:scale-95 relative"
                >
                  {kgExtraItems.length > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 bg-amber-500 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center border border-white">
                      {kgExtraItems.length}
                    </span>
                  )}
                  <Scale className="w-4 h-4 text-amber-700 mb-0.5" />
                  <span className="font-bold text-xs">Preço no KG</span>
                  <span className="text-[10px] font-extrabold text-amber-800">
                    Balança / Dinheiro
                  </span>
                </button>
              </div>
            </div>

            {/* Modal / Card para inserção de KG */}
            {showKgModal && (
              <div className="p-3 bg-white rounded-xl border-2 border-amber-400 shadow-md space-y-2 animate-in fade-in duration-150">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Scale className="w-4 h-4 text-amber-600" />
                    Lançar Almoço no KG (R$ {(kgProduct?.price || 59.9).toFixed(2)}/kg)
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowKgModal(false)}
                    className="text-slate-400 hover:text-slate-600 p-0.5"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-0.5">
                      Opção 1: Valor Direto em Dinheiro (R$)
                    </label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1.5 text-xs font-bold text-emerald-700">
                        R$
                      </span>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="Ex: 24,50"
                        value={kgDirectMoney}
                        onChange={(e) => {
                          setKgDirectMoney(e.target.value);
                          if (e.target.value) setKgGrams('');
                        }}
                        className="w-full text-xs font-bold pl-8 pr-2 py-1.5 rounded-lg border border-slate-300"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-0.5">
                      Opção 2: Peso na Balança (em Gramas)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        placeholder="Ex: 450 (gramas)"
                        value={kgGrams}
                        onChange={(e) => {
                          setKgGrams(e.target.value);
                          if (e.target.value) setKgDirectMoney('');
                        }}
                        className="w-full text-xs font-bold px-2.5 py-1.5 rounded-lg border border-slate-300 pr-7"
                      />
                      <span className="absolute right-2 top-1.5 text-xs font-bold text-slate-400">
                        g
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowKgModal(false)}
                    className="text-xs text-slate-500 px-2 py-1"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleAddKgMeal}
                    className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs px-3 py-1 rounded-lg"
                  >
                    + Adicionar ao Pedido
                  </button>
                </div>
              </div>
            )}

            {/* Bebidas completas solicitadas pelo usuário */}
            <div className="space-y-1.5 pt-1">
              <span className="text-[11px] font-bold text-slate-700 block">
                🥤 Refrigerantes, Águas & Sucos:
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                {bebidasProducts.map((p) => {
                  const qty = orderItems[p.id] || 0;
                  const effPrice = getProductPrice(p);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleAddItem(p)}
                      className={`p-2 rounded-xl border text-center transition flex flex-col items-center justify-center relative active:scale-95 ${
                        qty > 0
                          ? 'border-emerald-600 bg-emerald-600 text-white shadow-xs'
                          : 'border-slate-300 bg-white text-slate-800 hover:bg-emerald-50/50'
                      }`}
                    >
                      {qty > 0 && (
                        <span className="absolute -top-1.5 -right-1.5 bg-amber-400 text-slate-950 text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center border border-white">
                          {qty}
                        </span>
                      )}
                      <span className="font-bold text-[11px] truncate max-w-full">{p.name}</span>
                      <span className={`text-[11px] font-black ${qty > 0 ? 'text-emerald-100' : 'text-emerald-700'}`}>
                        R$ {effPrice.toFixed(2)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Valor da Compra */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-700">
                Valor Total do Consumo (R$) *
              </label>
              {(Object.keys(orderItems).length > 0 || kgExtraItems.length > 0) && (
                <span className="text-xs text-emerald-700 font-bold">
                  Soma automática dos itens com tabela
                </span>
              )}
            </div>
            <div className="relative">
              <span className="absolute left-3.5 top-2.5 text-base font-bold text-emerald-700">
                R$
              </span>
              <input
                type="number"
                step="0.01"
                required
                placeholder="0,00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full rounded-xl border border-slate-300 pl-11 pr-3.5 py-2.5 text-lg font-black text-slate-900 placeholder-slate-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 bg-white"
              />
            </div>
          </div>

          {/* SELEÇÃO DE CATEGORIAS DE PRODUTOS */}
          <div className="p-3.5 bg-slate-50/90 rounded-2xl border border-slate-200 space-y-2.5">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-emerald-700" />
                  Categorias de Produtos no Lançamento *
                </label>
                <p className="text-[11px] text-slate-500">
                  Ajuda a identificar o que este cliente mais consome e gera relatórios precisos
                </p>
              </div>
              <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full shrink-0">
                {selectedCategories.length === 0
                  ? 'Nenhuma selecionada'
                  : `${selectedCategories.length} selecionada${selectedCategories.length > 1 ? 's' : ''}`}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {PRODUCT_CATEGORIES.map((cat) => {
                const isSelected = selectedCategories.includes(cat.id);
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => handleToggleCategory(cat.id)}
                    className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between relative active:scale-95 ${
                      isSelected
                        ? 'bg-emerald-700 border-emerald-700 text-white shadow-xs ring-2 ring-emerald-500/30'
                        : 'bg-white border-slate-300 text-slate-800 hover:bg-emerald-50/40 hover:border-emerald-300'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-1">
                      <span className="text-lg">{cat.icon}</span>
                      <div
                        className={`w-4 h-4 rounded-md flex items-center justify-center text-[10px] font-black border transition ${
                          isSelected
                            ? 'bg-white text-emerald-800 border-white'
                            : 'border-slate-300 bg-white text-transparent'
                        }`}
                      >
                        ✓
                      </div>
                    </div>
                    <div>
                      <span className="font-bold text-xs block leading-tight">
                        {cat.shortLabel}
                      </span>
                      <span
                        className={`text-[10px] block truncate mt-0.5 ${
                          isSelected ? 'text-emerald-100' : 'text-slate-400'
                        }`}
                      >
                        {cat.description}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Itens / Descrição */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Itens do Pedido / Descrição
            </label>
            <textarea
              rows={2}
              placeholder="Ex: 5x Marmitex Média + 2x Refrigerante 2 Litros"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
            />
            <p className="text-[11px] text-slate-400 mt-0.5">
              Você pode adicionar observações como "Sem cebola", "Com feijão tropeiro" ou entrega.
            </p>
          </div>

          {/* Data do Almoço e Vencimento */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Data do Almoço / Pedido
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Data de Vencimento / Fechamento *
              </label>
              <input
                type="date"
                value={dueDate}
                required
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold text-emerald-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Atalhos Rápidos de Fechamento */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
              Atalhos de Vencimento / Fechamento:
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              <button
                type="button"
                onClick={handleEndOfMonth}
                className="py-1.5 px-2 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-[11px] font-black text-emerald-950 border border-emerald-300 transition"
              >
                Fim do Mês
              </button>
              <button
                type="button"
                onClick={() => handleShortcutDays(15)}
                className="py-1.5 px-2 rounded-lg bg-slate-100 hover:bg-emerald-50 hover:text-emerald-800 text-[11px] font-bold text-slate-700 border border-slate-200 transition"
              >
                Quinzena (15d)
              </button>
              <button
                type="button"
                onClick={() => handleShortcutDays(7)}
                className="py-1.5 px-2 rounded-lg bg-slate-100 hover:bg-emerald-50 hover:text-emerald-800 text-[11px] font-bold text-slate-700 border border-slate-200 transition"
              >
                7 Dias
              </button>
              <button
                type="button"
                onClick={() => handleShortcutDays(30)}
                className="py-1.5 px-2 rounded-lg bg-slate-100 hover:bg-emerald-50 hover:text-emerald-800 text-[11px] font-bold text-slate-700 border border-slate-200 transition"
              >
                30 Dias
              </button>
            </div>
          </div>

          {/* Enviar comprovante via WhatsApp */}
          <div className="pt-2 border-t border-slate-100">
            <label className="flex items-center gap-3 p-3 bg-emerald-50 rounded-xl border border-emerald-200 cursor-pointer">
              <input
                type="checkbox"
                checked={sendWhatsApp}
                onChange={(e) => setSendWhatsApp(e.target.checked)}
                className="w-4 h-4 text-emerald-600 rounded-sm focus:ring-emerald-500"
              />
              <div className="text-xs">
                <span className="font-bold text-emerald-900 block">
                  Enviar Comprovante de Marmita por WhatsApp após salvar
                </span>
                <span className="text-emerald-700">
                  O cliente ou encarregado da empresa recebe o detalhe do pedido e saldo atualizado
                </span>
              </div>
            </label>
          </div>

          <div className="pt-2 flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2.5 text-sm transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-2.5 text-sm shadow-md transition flex items-center justify-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              Salvar na Conta do Cliente
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

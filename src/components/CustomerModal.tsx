import React, { useState } from 'react';
import {
  X,
  User,
  Phone,
  MapPin,
  DollarSign,
  FileText,
  Check,
  Building2,
  Tag,
  Calendar,
  UtensilsCrossed,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { Customer, ProductItem } from '../types';
import { StorageService } from '../services/storage';

interface CustomerModalProps {
  customer?: Customer | null;
  products?: ProductItem[];
  onClose: () => void;
  onSave: (customer: Customer) => void;
}

export const CustomerModal: React.FC<CustomerModalProps> = ({
  customer,
  products = StorageService.getStoreSettings().products || [],
  onClose,
  onSave,
}) => {
  const [name, setName] = useState(customer?.name || '');
  const [nickname, setNickname] = useState(customer?.nickname || '');
  const [customerType, setCustomerType] = useState<'individual' | 'empresa'>(
    customer?.customerType || 'individual'
  );
  const [cnpj, setCnpj] = useState(customer?.cnpj || '');
  const [phone, setPhone] = useState(customer?.phone || '');
  const [address, setAddress] = useState(customer?.address || '');
  const [creditLimit, setCreditLimit] = useState(customer?.creditLimit?.toString() || '');
  const [notes, setNotes] = useState(customer?.notes || '');

  // Empresa / Preços diferenciados
  const [companyDiscountType, setCompanyDiscountType] = useState<
    'none' | 'percent' | 'fixed_per_marmita' | 'custom_table'
  >(customer?.companyDiscountType || (customer?.customerType === 'empresa' ? 'fixed_per_marmita' : 'none'));
  const [companyDiscountPercent, setCompanyDiscountPercent] = useState<string>(
    customer?.companyDiscountPercent?.toString() || '10'
  );
  const [companyDiscountPerMarmita, setCompanyDiscountPerMarmita] = useState<string>(
    customer?.companyDiscountPerMarmita?.toString() || '2.00'
  );
  const [customPrices, setCustomPrices] = useState<{ [productId: string]: number }>(
    customer?.customPrices || {}
  );
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'biweekly' | 'weekly' | 'custom'>(
    customer?.billingCycle || 'monthly'
  );

  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const formatPhone = (val: string) => {
    const digits = val.replace(/\D/g, '');
    if (digits.length <= 11) {
      if (digits.length > 6) {
        return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
      } else if (digits.length > 2) {
        return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
      }
      return digits;
    }
    return val;
  };

  const handleCustomPriceChange = (productId: string, valStr: string) => {
    const num = parseFloat(valStr.replace(',', '.'));
    if (!isNaN(num)) {
      setCustomPrices((prev) => ({ ...prev, [productId]: num }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: { [key: string]: string } = {};

    if (!name.trim()) {
      newErrors.name = 'Informe o nome do cliente ou empresa';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    let rawPhone = phone.replace(/\D/g, '');
    if (rawPhone && !rawPhone.startsWith('55') && rawPhone.length >= 10) {
      rawPhone = '55' + rawPhone;
    }

    const payload: Customer = {
      id: customer?.id || 'c_' + Date.now(),
      name: name.trim(),
      nickname: nickname.trim() || undefined,
      phone: rawPhone || phone.trim(),
      address: address.trim() || undefined,
      creditLimit: creditLimit ? parseFloat(creditLimit) : undefined,
      notes: notes.trim() || undefined,
      createdAt: customer?.createdAt || new Date().toISOString(),
      customerType,
      cnpj: customerType === 'empresa' ? cnpj.trim() || undefined : undefined,
      companyDiscountType: customerType === 'empresa' ? companyDiscountType : undefined,
      companyDiscountPercent:
        customerType === 'empresa' && companyDiscountType === 'percent'
          ? parseFloat(companyDiscountPercent) || 0
          : undefined,
      companyDiscountPerMarmita:
        customerType === 'empresa' && companyDiscountType === 'fixed_per_marmita'
          ? parseFloat(companyDiscountPerMarmita) || 0
          : undefined,
      customPrices:
        customerType === 'empresa' && companyDiscountType === 'custom_table'
          ? customPrices
          : undefined,
      billingCycle: customerType === 'empresa' ? billingCycle : undefined,
    };

    onSave(payload);
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
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="bg-emerald-800 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            {customerType === 'empresa' ? (
              <Building2 className="w-5 h-5 text-emerald-300" />
            ) : (
              <User className="w-5 h-5 text-emerald-300" />
            )}
            <div>
              <h2 className="text-base font-bold">
                {customer ? 'Editar Cadastro' : 'Novo Cliente / Empresa'}
              </h2>
              <p className="text-xs text-emerald-200">
                {customerType === 'empresa'
                  ? 'Convênio corporativo com tabela de preço e fechamento mensal'
                  : 'Cliente pessoa física com conta a prazo'}
              </p>
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

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Tipo de Cadastro: Individual ou Empresa */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Tipo de Cliente *
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setCustomerType('individual')}
                className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition ${
                  customerType === 'individual'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-900 shadow-2xs'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <User className="w-4 h-4" />
                <span>Pessoa Física / Comum</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setCustomerType('empresa');
                  if (companyDiscountType === 'none') setCompanyDiscountType('fixed_per_marmita');
                }}
                className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition ${
                  customerType === 'empresa'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-900 shadow-2xs ring-1 ring-emerald-600'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Building2 className="w-4 h-4 text-emerald-700" />
                <span>Empresa / Convênio</span>
              </button>
            </div>
          </div>

          {/* Nome */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {customerType === 'empresa' ? 'Razão Social / Nome da Empresa *' : 'Nome do Cliente *'}
            </label>
            <input
              type="text"
              required
              placeholder={
                customerType === 'empresa'
                  ? 'Ex: Construtora Silva & Filhos'
                  : 'Ex: Sebastião Alves'
              }
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (errors.name) setErrors({ ...errors, name: '' });
              }}
              className={`w-full rounded-xl border px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 ${
                errors.name ? 'border-rose-400 bg-rose-50' : 'border-slate-300'
              }`}
            />
            {errors.name && <p className="text-xs text-rose-500 mt-1">{errors.name}</p>}
          </div>

          {/* Apelido / Obra / Identificação */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {customerType === 'empresa' ? 'Nome Fantasia / Obra / Setor' : 'Apelido / Como Conhece'}
              </label>
              <input
                type="text"
                placeholder={customerType === 'empresa' ? 'Ex: Obra Centro, Galpão 3' : 'Ex: Tião da Oficina'}
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {customerType === 'empresa' && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  CNPJ (opcional)
                </label>
                <input
                  type="text"
                  placeholder="00.000.000/0001-00"
                  value={cnpj}
                  onChange={(e) => setCnpj(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            )}
          </div>

          {/* Telefone / WhatsApp */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              WhatsApp para Pedidos e Fechamento Mensal
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="tel"
                placeholder="(11) 98765-4321"
                value={phone}
                onChange={(e) => setPhone(formatPhone(e.target.value))}
                className="w-full rounded-xl border border-slate-300 pl-10 pr-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* SEÇÃO ESPECÍFICA DE EMPRESA: PREÇO ESPECIAL E FECHAMENTO MENSAL */}
          {customerType === 'empresa' && (
            <div className="p-4 bg-amber-500/10 border-2 border-amber-400/80 rounded-2xl space-y-3">
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-amber-700 shrink-0" />
                <span className="text-xs font-black text-amber-950 uppercase tracking-wider">
                  Condições Corporativas (Preço Especial & Fechamento)
                </span>
              </div>

              {/* Ciclo de Fechamento */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  Ciclo de Fechamento das Marmitas:
                </label>
                <select
                  value={billingCycle}
                  onChange={(e) => setBillingCycle(e.target.value as any)}
                  className="w-full rounded-xl border border-slate-300 p-2 text-xs font-bold text-slate-800 bg-white"
                >
                  <option value="monthly">Mensal (Acerto consolidado no final do mês)</option>
                  <option value="biweekly">Quinzenal (Acerto a cada 15 dias)</option>
                  <option value="weekly">Semanal (Toda sexta / sábado)</option>
                  <option value="custom">Data Combinada / Avulso</option>
                </select>
              </div>

              {/* Tipo de Preço Diferenciado / Desconto */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Regra de Preço Diferenciado para a Empresa:
                </label>
                <select
                  value={companyDiscountType}
                  onChange={(e) => setCompanyDiscountType(e.target.value as any)}
                  className="w-full rounded-xl border border-slate-300 p-2 text-xs font-bold text-slate-800 bg-white"
                >
                  <option value="fixed_per_marmita">
                    Desconto Fixo em Reais por Marmitex (Ex: R$ 2,00 a menos por marmita)
                  </option>
                  <option value="percent">
                    Desconto em Porcentagem no Pedido Total (Ex: 10% de desconto)
                  </option>
                  <option value="custom_table">
                    Tabela de Preços Personalizada (Definir preço exato por item)
                  </option>
                  <option value="none">Preço Normal de Tabela (Sem desconto corporativo)</option>
                </select>
              </div>

              {/* Sub-inputs de desconto */}
              {companyDiscountType === 'fixed_per_marmita' && (
                <div className="bg-white p-3 rounded-xl border border-amber-200 flex items-center justify-between gap-3">
                  <span className="text-xs text-slate-700 font-semibold">
                    Desconto em cada Marmitex / PF:
                  </span>
                  <div className="flex items-center gap-1 w-32">
                    <span className="text-xs font-bold text-emerald-700">R$</span>
                    <input
                      type="number"
                      step="0.50"
                      value={companyDiscountPerMarmita}
                      onChange={(e) => setCompanyDiscountPerMarmita(e.target.value)}
                      placeholder="2.00"
                      className="w-full text-xs font-bold p-1.5 rounded-lg border border-slate-300"
                    />
                  </div>
                </div>
              )}

              {companyDiscountType === 'percent' && (
                <div className="bg-white p-3 rounded-xl border border-amber-200 flex items-center justify-between gap-3">
                  <span className="text-xs text-slate-700 font-semibold">
                    Porcentagem de Desconto no Total:
                  </span>
                  <div className="flex items-center gap-1 w-28">
                    <input
                      type="number"
                      min="1"
                      max="50"
                      value={companyDiscountPercent}
                      onChange={(e) => setCompanyDiscountPercent(e.target.value)}
                      placeholder="10"
                      className="w-full text-xs font-bold p-1.5 rounded-lg border border-slate-300"
                    />
                    <span className="text-xs font-bold text-emerald-700">%</span>
                  </div>
                </div>
              )}

              {companyDiscountType === 'custom_table' && (
                <div className="bg-white p-3 rounded-xl border border-amber-200 space-y-2">
                  <span className="text-xs font-bold text-slate-800 block">
                    Preço Acordado para esta Empresa:
                  </span>
                  <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-1">
                    {products.map((prod) => (
                      <div key={prod.id} className="p-1.5 rounded-lg bg-slate-50 border border-slate-200">
                        <span className="text-[11px] font-semibold text-slate-700 block truncate">
                          {prod.name} (Tabela: R$ {prod.price.toFixed(2)})
                        </span>
                        <div className="flex items-center gap-1 mt-1">
                          <span className="text-[11px] font-bold text-emerald-700">R$</span>
                          <input
                            type="number"
                            step="0.50"
                            placeholder={prod.price.toFixed(2)}
                            value={customPrices[prod.id] !== undefined ? customPrices[prod.id] : ''}
                            onChange={(e) => handleCustomPriceChange(prod.id, e.target.value)}
                            className="w-full text-xs font-bold p-1 rounded-md border border-slate-300 bg-white"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Limite de Crédito */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Limite Máximo de Crédito a Prazo (R$)
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-2.5 text-sm font-bold text-slate-400">R$</span>
              <input
                type="number"
                step="0.01"
                placeholder={customerType === 'empresa' ? 'Ex: 2500,00' : 'Ex: 300,00 (opcional)'}
                value={creditLimit}
                onChange={(e) => setCreditLimit(e.target.value)}
                className="w-full rounded-xl border border-slate-300 pl-10 pr-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Endereço / Entrega */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Endereço de Entrega / Local da Obra
            </label>
            <div className="relative">
              <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="Rua / Avenida, Número, Bairro ou Ponto de referência"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full rounded-xl border border-slate-300 pl-10 pr-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Observações */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Observações / Instruções de Entrega / Responsável
            </label>
            <textarea
              rows={2}
              placeholder="Ex: Entregar com nota/comprovante assinado pelo encarregado..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
            />
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
              {customer ? 'Salvar Alterações' : 'Cadastrar Cliente'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import {
  X,
  Store,
  QrCode,
  Download,
  Upload,
  RotateCcw,
  Check,
  Shield,
  Smartphone,
  Info,
  UtensilsCrossed,
  Bell,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Database,
  Cloud,
  RefreshCw,
  ArrowUp,
  ArrowDown,
  Plus,
  Trash2,
  Search,
  Tag,
  Coffee,
} from 'lucide-react';
import { StoreSettings, ProductItem } from '../types';
import { StorageService, DEFAULT_PRODUCTS } from '../services/storage';
import { ConfirmModal } from './ConfirmModal';

interface SettingsModalProps {
  settings: StoreSettings;
  onClose: () => void;
  onSave: (settings: StoreSettings) => void;
  onDataReload: () => void;
  onOpenAdmin?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  settings,
  onClose,
  onSave,
  onDataReload,
  onOpenAdmin,
}) => {
  const [verticalPosition, setVerticalPosition] = useState<'top' | 'center' | 'bottom'>('center');
  const [storeName, setStoreName] = useState(settings.storeName || '');
  const [ownerName, setOwnerName] = useState(settings.ownerName || '');
  const [phone, setPhone] = useState(settings.phone || '');
  const [pixKey, setPixKey] = useState(settings.pixKey || '');
  const [pixKeyType, setPixKeyType] = useState<StoreSettings['pixKeyType']>(
    settings.pixKeyType || 'email'
  );
  const [city, setCity] = useState(settings.city || 'SAO PAULO');
  const [defaultDueDays, setDefaultDueDays] = useState(settings.defaultDueDays || 15);
  const [backupReminderFrequency, setBackupReminderFrequency] = useState<
    'daily' | 'weekly' | 'monthly' | 'disabled'
  >(settings.backupReminderFrequency || 'weekly');
  const [products, setProducts] = useState<ProductItem[]>(
    settings.products && settings.products.length > 0 ? settings.products : DEFAULT_PRODUCTS
  );

  // Product manager filter and custom product creation states
  const [productCategoryFilter, setProductCategoryFilter] = useState<string>('all');
  const [productSearch, setProductSearch] = useState<string>('');
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [newProductName, setNewProductName] = useState('');
  const [newProductCategory, setNewProductCategory] = useState<ProductItem['category']>('marmitex');
  const [newProductPrice, setNewProductPrice] = useState('');
  const [newProductDescription, setNewProductDescription] = useState('');
  const [showResetProductsConfirm, setShowResetProductsConfirm] = useState(false);

  const [message, setMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [lastBackupIso, setLastBackupIso] = useState<string | undefined>(settings.lastBackupDate);
  const [isCloudSyncing, setIsCloudSyncing] = useState(false);
  const [cloudSyncMessage, setCloudSyncMessage] = useState<string | null>(null);

  const handleCloudSync = async () => {
    try {
      setIsCloudSyncing(true);
      setCloudSyncMessage(null);
      const res = await StorageService.syncWithCloud();
      setCloudSyncMessage(`Nuvem sincronizada! ${res.syncedCount} itens verificados e salvos.`);
      onDataReload();
      setTimeout(() => setCloudSyncMessage(null), 5000);
    } catch (err) {
      console.error(err);
      setCloudSyncMessage('Falha ao sincronizar. Operando em modo offline.');
    } finally {
      setIsCloudSyncing(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: StoreSettings = {
      ...settings,
      storeName: storeName.trim(),
      ownerName: ownerName.trim(),
      phone: phone.trim(),
      pixKey: pixKey.trim(),
      pixKeyType,
      city: city.trim().toUpperCase(),
      defaultDueDays: Number(defaultDueDays) || 15,
      backupReminderFrequency,
      products,
    };
    onSave(updated);
    setMessage('Configurações salvas com sucesso!');
    setTimeout(() => {
      onClose();
    }, 1200);
  };

  const handlePriceChange = (productId: string, newPriceStr: string) => {
    const val = parseFloat(newPriceStr.replace(',', '.'));
    if (!isNaN(val) && val >= 0) {
      setProducts((prev) =>
        prev.map((p) => (p.id === productId ? { ...p, price: val } : p))
      );
    } else if (newPriceStr === '') {
      setProducts((prev) =>
        prev.map((p) => (p.id === productId ? { ...p, price: 0 } : p))
      );
    }
  };

  const handleQuickPriceAdjust = (productId: string, delta: number) => {
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id === productId) {
          const newPrice = Math.max(0, Math.round((p.price + delta) * 100) / 100);
          return { ...p, price: newPrice };
        }
        return p;
      })
    );
  };

  const handleAddCustomProduct = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = newProductName.trim();
    if (!cleanName) return;
    const priceVal = parseFloat(newProductPrice.replace(',', '.')) || 0;
    const newProd: ProductItem = {
      id: `p_custom_${Date.now()}`,
      name: cleanName,
      category: newProductCategory,
      price: priceVal,
      description: newProductDescription.trim() || undefined,
    };
    setProducts((prev) => [...prev, newProd]);
    setNewProductName('');
    setNewProductPrice('');
    setNewProductDescription('');
    setIsAddingProduct(false);
  };

  const handleRemoveProduct = (productId: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== productId));
  };

  const handleResetDefaultProducts = () => {
    setProducts(DEFAULT_PRODUCTS);
    setShowResetProductsConfirm(false);
  };

  const handleExportBackup = () => {
    try {
      const res = StorageService.downloadBackupJSONFile();
      setLastBackupIso(res.date);
      setMessage(`Backup exportado com sucesso! Arquivo: ${res.filename}`);
      setTimeout(() => setMessage(''), 4500);
    } catch (err) {
      setErrorMessage('Não foi possível gerar o arquivo de backup.');
      setTimeout(() => setErrorMessage(''), 3000);
    }
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const success = StorageService.importBackupJSON(content);
        if (success) {
          setMessage('Backup restaurado com sucesso! Recarregando sistema...');
          setTimeout(() => {
            onDataReload();
            onClose();
          }, 1500);
        } else {
          setErrorMessage('Erro ao restaurar backup. Verifique se o arquivo JSON é válido.');
          setTimeout(() => setErrorMessage(''), 4000);
        }
      }
    };
    reader.readAsText(file);
  };

  const handleExecuteResetDemo = () => {
    StorageService.resetToDemoData();
    setShowResetConfirm(false);
    setMessage('Dados de teste restaurados com sucesso!');
    setTimeout(() => {
      onDataReload();
      onClose();
    }, 1200);
  };

  const formatLastBackup = () => {
    if (!lastBackupIso) return 'Nenhum backup realizado ainda';
    const d = new Date(lastBackupIso);
    return `${d.toLocaleDateString('pt-BR')} às ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
  };

  const positionClass =
    verticalPosition === 'top'
      ? 'items-start pt-3 sm:pt-6'
      : verticalPosition === 'bottom'
      ? 'items-end pb-3 sm:pb-6'
      : 'items-center';

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className={`fixed inset-0 z-50 flex justify-center bg-black/65 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto transition-all duration-300 ${positionClass}`}
    >
      <div className="w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]">
        {/* Header com botões de posição e Fechar */}
        <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 px-5 sm:px-6 py-4 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-emerald-300 shadow-inner">
              <Store className="w-5 h-5 text-emerald-200" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight">Configurações do Comércio</h2>
              <p className="text-xs text-emerald-200/90 mt-0.5">Cardápio, tabela de preços, chave PIX e backup</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Controles de Subir/Descer Janela */}
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

            {/* Botão de Fechar a Janela no Topo */}
            <button
              type="button"
              onClick={onClose}
              className="text-white/80 hover:text-white px-2.5 py-1.5 rounded-xl hover:bg-white/15 transition flex items-center gap-1 text-xs font-bold cursor-pointer"
              title="Fechar Janela"
              aria-label="Fechar Janela"
            >
              <X className="w-5 h-5" />
              <span className="hidden sm:inline">Fechar</span>
            </button>
          </div>
        </div>

        <div className="p-6 max-h-[82vh] overflow-y-auto space-y-6">
          {message && (
            <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-900 text-xs font-bold flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{message}</span>
            </div>
          )}

          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-300 rounded-xl text-rose-900 text-xs font-bold flex items-center gap-2 animate-in fade-in">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form id="settings-form" onSubmit={handleSubmit} className="space-y-4">
            {/* Nome da Loja */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Nome do Estabelecimento / Mercearia *
              </label>
              <input
                type="text"
                required
                placeholder="Ex: Marmitex & Restaurante Sabor Caseiro"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-800 focus:ring-2 focus:ring-emerald-500 font-medium"
              />
            </div>

            {/* Responsável e Telefone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nome do Proprietário / Responsável
                </label>
                <input
                  type="text"
                  placeholder="Ex: José Ricardo"
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Telefone / WhatsApp da Loja
                </label>
                <input
                  type="tel"
                  placeholder="(11) 98888-7777"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* Chave PIX e Tipo */}
            <div className="bg-emerald-50/70 p-4 rounded-2xl border border-emerald-200/80 space-y-3">
              <div className="flex items-center gap-2">
                <QrCode className="w-4 h-4 text-emerald-700" />
                <span className="text-xs font-bold text-emerald-950 uppercase tracking-wider">
                  Chave PIX da Loja (Para Receber dos Clientes)
                </span>
              </div>
              <p className="text-[11px] text-emerald-800 leading-relaxed">
                Esta chave PIX será inserida automaticamente nas mensagens de cobrança e nos comprovantes enviados via WhatsApp aos clientes.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="sm:col-span-2">
                  <input
                    type="text"
                    required
                    placeholder="Chave PIX (E-mail, CPF, Celular, CNPJ)"
                    value={pixKey}
                    onChange={(e) => setPixKey(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold text-slate-800 bg-white"
                  />
                </div>
                <div>
                  <select
                    value={pixKeyType}
                    onChange={(e) => setPixKeyType(e.target.value as any)}
                    className="w-full rounded-xl border border-slate-300 px-2 py-2 text-xs font-bold text-slate-800 bg-white"
                  >
                    <option value="email">E-mail</option>
                    <option value="cpf">CPF</option>
                    <option value="cnpj">CNPJ</option>
                    <option value="phone">Telefone</option>
                    <option value="random">Chave Aleatória</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Cidade da Loja (usado no padrão do Banco Central):
                </label>
                <input
                  type="text"
                  placeholder="SAO PAULO"
                  value={city}
                  onChange={(e) => setCity(e.target.value.toUpperCase())}
                  className="w-full rounded-xl border border-slate-300 px-3 py-1.5 text-xs text-slate-800 uppercase bg-white font-medium"
                />
              </div>
            </div>

            {/* Prazo Padrão de Vencimento */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Prazo Padrão de Vencimento do Fiado (Dias)
              </label>
              <input
                type="number"
                min="1"
                max="90"
                value={defaultDueDays}
                onChange={(e) => setDefaultDueDays(Number(e.target.value))}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-800 font-bold"
              />
              <p className="text-[11px] text-slate-400 mt-0.5">
                Exemplo: 15 dias (quinzena) ou 30 dias (mensal)
              </p>
            </div>

            {/* Preços de Venda Padrão com Nomes Completos e Sem Cortes */}
            <div className="bg-slate-50/80 p-4 sm:p-5 rounded-2xl border border-slate-200 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="text-xs sm:text-sm font-black text-slate-900 flex items-center gap-1.5 uppercase tracking-wider">
                    <UtensilsCrossed className="w-4 h-4 text-emerald-700" />
                    Tabela de Preços do Cardápio & Itens
                  </span>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Os nomes e detalhes de cada produto aparecem por completo abaixo para você saber exatamente qual item está configurando.
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowResetProductsConfirm(true)}
                    className="text-xs text-slate-600 hover:text-emerald-700 font-bold flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition cursor-pointer shadow-2xs"
                    title="Restaurar preços originais do sistema"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                    <span>Restaurar Preços Padrão</span>
                  </button>
                </div>
              </div>

              {/* Filtro por Categoria e Busca por Nome */}
              <div className="space-y-2.5 pt-1">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    placeholder="Buscar produto por nome (ex: 1,5L, 2 Litros, sem gás, média, calabresa)..."
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    className="w-full pl-10 pr-9 py-2.5 text-xs rounded-xl border border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-medium"
                  />
                  {productSearch && (
                    <button
                      type="button"
                      onClick={() => setProductSearch('')}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 p-0.5"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Abas de Categorias */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs scrollbar-none">
                  <button
                    type="button"
                    onClick={() => setProductCategoryFilter('all')}
                    className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition cursor-pointer ${
                      productCategoryFilter === 'all'
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    Todos os Produtos ({products.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setProductCategoryFilter('marmitex')}
                    className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition cursor-pointer ${
                      productCategoryFilter === 'marmitex'
                        ? 'bg-emerald-700 text-white shadow-xs'
                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    🍱 Marmitex & Pratos ({products.filter((p) => p.category === 'marmitex').length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setProductCategoryFilter('bebidas')}
                    className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition cursor-pointer ${
                      productCategoryFilter === 'bebidas'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    🥤 Bebidas & Refrigerantes ({products.filter((p) => p.category === 'bebidas').length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setProductCategoryFilter('porcoes')}
                    className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition cursor-pointer ${
                      productCategoryFilter === 'porcoes'
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    🍟 Porções & Petiscos ({products.filter((p) => p.category === 'porcoes').length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setProductCategoryFilter('sobremesas')}
                    className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition cursor-pointer ${
                      productCategoryFilter === 'sobremesas'
                        ? 'bg-purple-600 text-white shadow-xs'
                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    🍮 Sobremesas & Doces ({products.filter((p) => p.category === 'sobremesas').length})
                  </button>
                </div>
              </div>

              {/* Grid de Produtos com Nome Completo (SEM TRUNCATE) */}
              {products.filter((p) => {
                const matchesCat = productCategoryFilter === 'all' || p.category === productCategoryFilter;
                const q = productSearch.toLowerCase().trim();
                const matchesSearch =
                  !q ||
                  p.name.toLowerCase().includes(q) ||
                  (p.description && p.description.toLowerCase().includes(q));
                return matchesCat && matchesSearch;
              }).length === 0 ? (
                <div className="p-6 bg-white rounded-2xl border border-slate-200 text-center text-slate-500 space-y-1">
                  <p className="text-xs font-bold text-slate-700">Nenhum produto encontrado</p>
                  <p className="text-[11px]">Tente buscar por outro termo ou selecione a categoria "Todos".</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {products
                    .filter((p) => {
                      const matchesCat = productCategoryFilter === 'all' || p.category === productCategoryFilter;
                      const q = productSearch.toLowerCase().trim();
                      const matchesSearch =
                        !q ||
                        p.name.toLowerCase().includes(q) ||
                        (p.description && p.description.toLowerCase().includes(q));
                      return matchesCat && matchesSearch;
                    })
                    .map((prod) => (
                      <div
                        key={prod.id}
                        className="bg-white p-3.5 rounded-2xl border border-slate-200/90 hover:border-emerald-400 shadow-2xs hover:shadow-xs transition flex flex-col justify-between gap-2.5"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center justify-between gap-1.5">
                            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                              {prod.category === 'marmitex'
                                ? 'Marmitex'
                                : prod.category === 'bebidas'
                                ? 'Bebida'
                                : prod.category === 'porcoes'
                                ? 'Porção'
                                : prod.category === 'sobremesas'
                                ? 'Sobremesa'
                                : 'Outro'}
                            </span>
                            {prod.unit === 'kg' && (
                              <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                                Por KG
                              </span>
                            )}
                            {prod.id.startsWith('p_custom_') && (
                              <button
                                type="button"
                                onClick={() => handleRemoveProduct(prod.id)}
                                title="Excluir este item personalizado"
                                className="text-slate-400 hover:text-rose-600 p-1 rounded transition cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>

                          {/* NOME COMPLETO DO PRODUTO (SEM TRUNCATE) */}
                          <h4 className="text-sm font-black text-slate-900 leading-snug whitespace-normal break-words">
                            {prod.name}
                          </h4>

                          {/* Detalhes/Volume/Descrição */}
                          {prod.description && (
                            <p className="text-xs text-slate-500 font-medium leading-relaxed">
                              {prod.description}
                            </p>
                          )}
                        </div>

                        {/* Controle de Edição de Preço */}
                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-slate-600">Preço:</span>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleQuickPriceAdjust(prod.id, -0.5)}
                              title="Diminuir R$ 0,50"
                              className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xs flex items-center justify-center transition cursor-pointer active:scale-95"
                            >
                              -
                            </button>
                            <div className="relative flex items-center">
                              <span className="absolute left-2.5 text-xs font-black text-emerald-800 pointer-events-none">
                                R$
                              </span>
                              <input
                                type="number"
                                step="0.50"
                                min="0"
                                value={prod.price}
                                onChange={(e) => handlePriceChange(prod.id, e.target.value)}
                                className="w-24 pl-8 pr-2 py-1.5 text-sm font-black text-slate-900 bg-emerald-50/60 border border-emerald-300 rounded-xl text-right focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-mono"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => handleQuickPriceAdjust(prod.id, 0.5)}
                              title="Aumentar R$ 0,50"
                              className="w-7 h-7 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-900 font-black text-xs flex items-center justify-center transition cursor-pointer active:scale-95"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}

              {/* Botão e Formulário para Adicionar Item Personalizado */}
              {!isAddingProduct ? (
                <button
                  type="button"
                  onClick={() => setIsAddingProduct(true)}
                  className="w-full py-2.5 px-3 rounded-xl border border-dashed border-emerald-400 bg-emerald-50/50 hover:bg-emerald-50 text-emerald-900 font-bold text-xs transition flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
                >
                  <Plus className="w-4 h-4 text-emerald-700" />
                  <span>+ Adicionar Outro Produto / Bebida no Cardápio</span>
                </button>
              ) : (
                <div className="p-4 bg-white rounded-2xl border-2 border-emerald-300 shadow-xs space-y-3 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                      <Plus className="w-4 h-4 text-emerald-700" />
                      Cadastrar Novo Produto no Cardápio
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsAddingProduct(false)}
                      className="text-slate-400 hover:text-slate-600 p-1"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Nome Completo do Produto *
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: Coca-Cola 2 Litros ou Suco Natural 500ml"
                        value={newProductName}
                        onChange={(e) => setNewProductName(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Categoria
                      </label>
                      <select
                        value={newProductCategory}
                        onChange={(e) => setNewProductCategory(e.target.value as any)}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white font-medium"
                      >
                        <option value="marmitex">🍱 Marmitex & Prato</option>
                        <option value="bebidas">🥤 Bebida & Refrigerante</option>
                        <option value="porcoes">🍟 Porção & Petisco</option>
                        <option value="sobremesas">🍮 Sobremesa & Doce</option>
                        <option value="outros">Outro Item</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Preço Padrão (R$) *
                      </label>
                      <input
                        type="number"
                        step="0.50"
                        placeholder="Ex: 12.00"
                        value={newProductPrice}
                        onChange={(e) => setNewProductPrice(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 font-bold"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Detalhes / Tamanho / Volume (Opcional)
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: Garrafa 2L gelada ou Copo 500ml"
                        value={newProductDescription}
                        onChange={(e) => setNewProductDescription(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 font-medium"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsAddingProduct(false)}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-bold"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={handleAddCustomProduct}
                      disabled={!newProductName.trim()}
                      className="px-4 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white text-xs font-bold shadow-xs transition"
                    >
                      Salvar Produto no Cardápio
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* SEÇÃO: BANCO DE DADOS GRATUITO NA NUVEM (FIRESTORE) */}
            <div className="p-4 bg-teal-50/70 border-2 border-teal-300/80 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-teal-950 flex items-center gap-1.5 uppercase tracking-wider">
                  <Database className="w-4 h-4 text-teal-700" />
                  Banco de Dados na Nuvem (Google Firestore)
                </span>
                <span className="text-[10px] bg-teal-200 text-teal-900 font-black px-2 py-0.5 rounded-full uppercase">
                  Gratuito • Spark
                </span>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                Seus fiados, clientes e recebimentos contam com sincronização direta no banco de dados na nuvem da Google. Você tem <strong>50.000 leituras/dia</strong> e <strong>20.000 gravações/dia</strong> gratuitas permanentes.
              </p>

              {cloudSyncMessage && (
                <div className="p-2.5 rounded-xl bg-teal-100 border border-teal-300 text-teal-950 text-xs font-bold flex items-center gap-2 animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 text-teal-700 shrink-0" />
                  <span>{cloudSyncMessage}</span>
                </div>
              )}

              <button
                type="button"
                onClick={handleCloudSync}
                disabled={isCloudSyncing}
                className="w-full py-2.5 px-3 rounded-xl bg-teal-700 hover:bg-teal-800 disabled:opacity-60 text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <RefreshCw className={`w-4 h-4 ${isCloudSyncing ? 'animate-spin' : ''}`} />
                <span>{isCloudSyncing ? 'Sincronizando com a Nuvem...' : 'Sincronizar com o Banco de Dados Agora'}</span>
              </button>
            </div>

            {/* SEÇÃO: EXPORTAÇÃO DE DADOS EM FORMATO JSON E LEMBRETE PERIÓDICO */}
            <div className="p-4 bg-emerald-50/70 border-2 border-emerald-300/80 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-950 flex items-center gap-1.5 uppercase tracking-wider">
                  <Shield className="w-4 h-4 text-emerald-700" />
                  Backup Manual em Formato JSON
                </span>
                <span className="text-[10px] bg-emerald-200 text-emerald-900 font-bold px-2 py-0.5 rounded-full">
                  Offline & Seguro
                </span>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                Salve um arquivo <strong>.json</strong> no seu celular ou computador contendo todos os clientes, histórico de fiados e pagamentos. Se trocar de aparelho, você restaura tudo em segundos.
              </p>

              {/* Status do último backup */}
              <div className="p-2.5 bg-white rounded-xl border border-emerald-200 flex items-center justify-between text-xs">
                <span className="text-slate-600">Último backup salvo:</span>
                <span className="font-bold text-slate-900">{formatLastBackup()}</span>
              </div>

              {/* Botão de Download JSON */}
              <button
                type="button"
                onClick={handleExportBackup}
                className="w-full py-2.5 px-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                <span>Exportar e Salvar Arquivo JSON no Dispositivo</span>
              </button>

              {/* Configuração de Lembrete Periódico */}
              <div className="pt-2 border-t border-emerald-200/80 space-y-1.5">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Bell className="w-3.5 h-3.5 text-emerald-700" />
                  Lembrete Automático para Fazer Backup:
                </label>
                <select
                  value={backupReminderFrequency}
                  onChange={(e) => setBackupReminderFrequency(e.target.value as any)}
                  className="w-full text-xs font-bold p-2 rounded-xl border border-slate-300 bg-white text-slate-800"
                >
                  <option value="daily">Lembrete Diário (Avisar todo dia ao abrir)</option>
                  <option value="weekly">Lembrete Semanal (Avisar a cada 7 dias - Recomendado)</option>
                  <option value="monthly">Lembrete Mensal (Avisar a cada 30 dias)</option>
                  <option value="disabled">Desativado (Não exibir lembretes de backup)</option>
                </select>
                <p className="text-[11px] text-slate-500">
                  O aplicativo avisará discretamente na tela principal quando o prazo expirar para você não esquecer de baixar seus dados.
                </p>
              </div>

              {/* Restaurar Backup */}
              <div className="pt-2 border-t border-emerald-200/80">
                <label className="w-full py-2 px-3 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer text-center">
                  <Upload className="w-4 h-4 text-emerald-700" />
                  <span>Restaurar Dados a Partir de um Arquivo JSON</span>
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleImportBackup}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {/* Botões de Ação do Formulário: Fechar Janela e Salvar */}
            <div className="pt-3 border-t border-slate-200 flex flex-col-reverse sm:flex-row items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto px-5 py-3 rounded-xl border-2 border-slate-300 hover:bg-slate-100 hover:border-slate-400 text-slate-700 font-bold text-sm transition flex items-center justify-center gap-2 cursor-pointer shadow-xs active:scale-95"
              >
                <X className="w-4 h-4 text-slate-500" />
                Fechar Janela
              </button>
              <button
                type="submit"
                className="w-full sm:flex-1 py-3 px-6 rounded-xl bg-emerald-700 hover:bg-emerald-800 active:scale-95 text-white font-black text-sm shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                Salvar Todas as Configurações
              </button>
            </div>
          </form>

          {/* Área do Dono do Sistema / SaaS */}
          {onOpenAdmin && (
            <div className="pt-4 border-t border-slate-200 p-4 bg-slate-900 rounded-xl text-white space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-300">
                  Painel Master do Dono / Desenvolvedor
                </span>
                <span className="text-[10px] bg-amber-400/20 text-amber-200 px-2 py-0.5 rounded-full font-bold">
                  Área Restrita
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Acompanhe os lojistas cadastrados, configure o seu PIX de recebimento e gere códigos offline.
              </p>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenAdmin();
                }}
                className="w-full mt-1 py-2 px-3 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-sm transition"
              >
                Acessar Painel Master do Dono / Desenvolvedor
              </button>
            </div>
          )}

          {/* Reset Demo Data */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-400">Recarregar exemplos do app</span>
            <button
              type="button"
              onClick={() => setShowResetConfirm(true)}
              className="text-xs text-slate-500 hover:text-rose-600 font-semibold flex items-center gap-1"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Restaurar dados de teste
            </button>
          </div>
        </div>
      </div>

      {/* Modal de Confirmação para Restaurar Dados de Teste */}
      <ConfirmModal
        isOpen={showResetConfirm}
        title="Restaurar Dados de Demonstração"
        message="Deseja realmente restaurar os dados de exemplo do aplicativo? Isso substituirá os dados atuais pelos exemplos de teste."
        confirmLabel="Sim, Restaurar Exemplos"
        isDestructive={false}
        onConfirm={handleExecuteResetDemo}
        onCancel={() => setShowResetConfirm(false)}
      />

      {/* Modal de Confirmação para Restaurar Preços Padrão */}
      <ConfirmModal
        isOpen={showResetProductsConfirm}
        title="Restaurar Tabela Padrão de Preços"
        message="Deseja realmente restaurar os preços para a tabela padrão original (marmitex, bebidas e adicionais)? As alterações manuais de preço serão redefinidas."
        confirmLabel="Sim, Restaurar Preços Padrão"
        isDestructive={false}
        onConfirm={handleResetDefaultProducts}
        onCancel={() => setShowResetProductsConfirm(false)}
      />
    </div>
  );
};

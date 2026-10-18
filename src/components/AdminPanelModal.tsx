import React, { useState } from 'react';
import {
  ShieldAlert,
  Users,
  DollarSign,
  TrendingUp,
  KeyRound,
  Send,
  Copy,
  Check,
  Search,
  Plus,
  Trash2,
  Phone,
  Store,
  MapPin,
  Calendar,
  X,
  AlertCircle,
  Clock,
  Sparkles,
  Lock,
  QrCode,
  Save,
  CheckCircle2,
  HelpCircle,
  Eye,
  EyeOff,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { MerchantAdminRecord, StoreSettings, AdminPixConfig } from '../types';
import { StorageService, getRelativeDateString } from '../services/storage';
import { LicenseSecurity } from '../services/licenseSecurity';
import { ConfirmModal } from './ConfirmModal';
import { generatePixCopiaECola, generateQRCodeSVG } from '../services/pixGenerator';

interface AdminPanelModalProps {
  currentSettings: StoreSettings;
  onClose: () => void;
  onDataReload: () => void;
}

export const AdminPanelModal: React.FC<AdminPanelModalProps> = ({
  currentSettings,
  onClose,
  onDataReload,
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Admin states
  const [merchants, setMerchants] = useState<MerchantAdminRecord[]>(
    StorageService.getAdminMerchants()
  );
  const [activeTab, setActiveTab] = useState<
    'merchants' | 'generator' | 'pix_config' | 'new_merchant'
  >('merchants');
  const [search, setSearch] = useState('');

  // Deletion confirmation
  const [merchantToDelete, setMerchantToDelete] = useState<MerchantAdminRecord | null>(null);

  // Admin PIX Configuration state
  const [adminPix, setAdminPix] = useState<AdminPixConfig>(
    StorageService.getAdminPixConfig()
  );
  const [pixSaveSuccess, setPixSaveSuccess] = useState(false);

  // Code generator form
  const [selectedDeviceId, setSelectedDeviceId] = useState('');
  const [selectedMerchantName, setSelectedMerchantName] = useState('');
  const [selectedMerchantPhone, setSelectedMerchantPhone] = useState('');
  const [generatorDays, setGeneratorDays] = useState(30);
  const [generatedCode, setGeneratedCode] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);
  const [storeSearchQuery, setStoreSearchQuery] = useState('');

  // New Merchant form
  const [newStoreName, setNewStoreName] = useState('');
  const [newOwnerName, setNewOwnerName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newCity, setNewCity] = useState('');
  const [newDeviceId, setNewDeviceId] = useState('');

  const handleVerifyPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput === 'Jricardo1*') {
      setIsAuthenticated(true);
      setPinError('');
    } else {
      setPinError('Senha master incorreta. Acesso restrito somente ao administrador.');
    }
  };

  const handleGenerateCode = (deviceId: string, days: number) => {
    if (!deviceId) return;
    const code = LicenseSecurity.generateActivationCode(deviceId, days);
    setGeneratedCode(code);
    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.6 },
    });
  };

  const handleSelectMerchantForCode = (m: MerchantAdminRecord) => {
    setSelectedDeviceId(m.deviceId);
    setSelectedMerchantName(m.storeName);
    setSelectedMerchantPhone(m.phone);
    handleGenerateCode(m.deviceId, generatorDays);
    setActiveTab('generator');
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(generatedCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleSendCodeViaWhatsApp = () => {
    const text = `Olá ${selectedMerchantName || 'Comerciante'}! Confirmamos o seu pagamento do PIX de R$ ${adminPix.monthlyFee.toFixed(2)} da licença do Controle de Marmitex/Fiado. ✅\n\n🔑 *Seu Código de Liberação Offline:* \n*${generatedCode}*\n\n📲 *Como ativar:* Abra o app no seu celular, toque em Licença > "Código Offline" e cole este código acima. O app liberará +${generatorDays} dias imediatamente mesmo sem internet!\n\nMuito obrigado pela parceria e boas vendas!`;
    const cleanPhone = (selectedMerchantPhone || '').replace(/\D/g, '');
    const url = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(text)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleSendRenewalReminder = (m: MerchantAdminRecord) => {
    const text = `Olá ${m.ownerName}! Notamos que a licença mensal do seu aplicativo *Controle de Marmitex / Fiado* (${m.storeName}) vence em ${new Date(
      m.expirationDate + 'T12:00:00'
    ).toLocaleDateString('pt-BR')}.\n\nPara renovar por mais 30 dias:\n💰 *Valor:* R$ ${adminPix.monthlyFee.toFixed(2)}\n👉 *Chave PIX:* ${adminPix.adminPixKey}\n👤 *Titular:* ${adminPix.adminName}\n\nAssim que pagar, envie o comprovante informando o seu ID (*${m.deviceId}*) para liberação imediata!`;
    const cleanPhone = m.phone.replace(/\D/g, '');
    const url = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(text)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleQuickAddDays = (m: MerchantAdminRecord, days: number = 30) => {
    const currentExp = new Date(m.expirationDate + 'T12:00:00');
    const baseDate = currentExp > new Date() ? currentExp : new Date();
    const newExp = new Date(baseDate.getTime() + days * 86400000).toISOString().split('T')[0];

    const updated: MerchantAdminRecord = {
      ...m,
      status: 'active',
      expirationDate: newExp,
      totalPaidFees: (m.totalPaidFees || 0) + adminPix.monthlyFee,
    };

    const list = StorageService.saveAdminMerchant(updated);
    setMerchants(list);
    onDataReload();
  };

  const handleExecuteDeleteMerchant = () => {
    if (merchantToDelete) {
      const updated = StorageService.deleteAdminMerchant(merchantToDelete.id);
      setMerchants(updated);
      setMerchantToDelete(null);
      onDataReload();
    }
  };

  const handleSavePixConfig = (e: React.FormEvent) => {
    e.preventDefault();
    const saved = StorageService.saveAdminPixConfig(adminPix);
    setAdminPix(saved);
    setPixSaveSuccess(true);
    setTimeout(() => setPixSaveSuccess(false), 3000);
    confetti({
      particleCount: 40,
      spread: 50,
    });
  };

  const handleCreateNewMerchant = (e: React.FormEvent) => {
    e.preventDefault();
    const id = newDeviceId.trim().toUpperCase() || `LOJA-${Math.floor(1000 + Math.random() * 9000)}`;

    const newRec: MerchantAdminRecord = {
      id: 'm_' + Date.now(),
      deviceId: id,
      storeName: newStoreName.trim() || 'Nova Marmitaria / Mercearia',
      ownerName: newOwnerName.trim() || 'Comerciante',
      phone: newPhone.trim(),
      city: newCity.trim() || 'Brasil',
      status: 'active',
      expirationDate: getRelativeDateString(30),
      totalCustomers: 0,
      totalFiadoDebt: 0,
      lastSeenAt: new Date().toISOString(),
      registeredAt: new Date().toISOString(),
      totalPaidFees: adminPix.monthlyFee,
    };

    const updated = StorageService.saveAdminMerchant(newRec);
    setMerchants(updated);
    setActiveTab('merchants');
    setNewStoreName('');
    setNewOwnerName('');
    setNewPhone('');
    setNewCity('');
    setNewDeviceId('');
  };

  // Metrics
  const totalMerchants = merchants.length;
  const activeMerchants = merchants.filter((m) => m.status === 'active').length;
  const mrrEstimated = activeMerchants * (adminPix.monthlyFee || 9.90);
  const overdueMerchants = merchants.filter((m) => m.status === 'expired').length;
  const dueTodayMerchants = merchants.filter(
    (m) => m.expirationDate === getRelativeDateString(0) && m.status === 'active'
  ).length;

  const filteredMerchants = merchants.filter((m) => {
    const q = search.toLowerCase();
    return (
      m.storeName.toLowerCase().includes(q) ||
      m.ownerName.toLowerCase().includes(q) ||
      m.deviceId.toLowerCase().includes(q) ||
      m.phone.includes(q)
    );
  });

  // Preview PIX code for admin
  const previewPayload = generatePixCopiaECola({
    pixKey: adminPix.adminPixKey || 'admin@marmitex.com',
    merchantName: (adminPix.adminName || 'ADMIN').slice(0, 25),
    merchantCity: (adminPix.adminCity || 'SAO PAULO').slice(0, 15),
    amount: adminPix.monthlyFee || 9.90,
    txId: 'TESTEADMIN123',
    description: 'Licenca Marmitex Pro',
  });
  const previewQrSvg = generateQRCodeSVG(previewPayload, 160);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-4xl rounded-2xl bg-white shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-slate-900 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
              <ShieldAlert className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold">Painel Master do Dono / Desenvolvedor</h2>
                <span className="text-[10px] bg-amber-400 text-slate-950 font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Área do Dono
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Gerencie as lojas cadastradas, configure seu PIX para receber as mensalidades e gere chaves offline
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white p-1 rounded-lg hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Password Lock Screen if not authenticated */}
        {!isAuthenticated ? (
          <div className="p-8 max-w-md mx-auto text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-800 flex items-center justify-center mx-auto border border-slate-200">
              <Lock className="w-7 h-7 text-emerald-700" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Acesso Restrito ao Dono do App</h3>
              <p className="text-xs text-slate-500 mt-1">
                Digite a senha de administrador para acessar o acompanhamento de clientes, configurar seu PIX e gerenciar lojas.
              </p>
            </div>

            <form onSubmit={handleVerifyPin} className="space-y-3">
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoFocus
                  placeholder="Digite a Senha Master do Administrador"
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value)}
                  className="w-full text-center text-base font-mono font-bold tracking-widest px-10 py-3 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 bg-slate-50 text-slate-900"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 p-1 rounded-lg transition"
                  title={showPassword ? 'Ocultar senha' : 'Ver senha'}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>

              {pinError && <p className="text-xs font-semibold text-rose-500">{pinError}</p>}

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm shadow-md transition"
              >
                Acessar Painel Master
              </button>
            </form>
          </div>
        ) : (
          <div className="p-6 max-h-[82vh] overflow-y-auto space-y-6">
            {/* SaaS Metrics Dashboard */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Lojas Cadastradas
                </span>
                <span className="text-2xl font-black text-slate-900">{totalMerchants}</span>
                <span className="text-[11px] text-slate-400 block mt-0.5">comércios usando</span>
              </div>

              <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200">
                <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">
                  Lojas Ativas
                </span>
                <span className="text-2xl font-black text-emerald-700">{activeMerchants}</span>
                <span className="text-[11px] text-emerald-600 block mt-0.5">em dia com o PIX</span>
              </div>

              <div className="bg-amber-50 p-4 rounded-xl border border-amber-200">
                <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block">
                  Receita Mensal (MRR)
                </span>
                <span className="text-2xl font-black text-amber-700">
                  R$ {mrrEstimated.toFixed(2)}
                </span>
                <span className="text-[11px] text-amber-600 block mt-0.5">
                  a R$ {adminPix.monthlyFee.toFixed(2)}/mês
                </span>
              </div>

              <div className="bg-rose-50 p-4 rounded-xl border border-rose-200">
                <span className="text-[10px] font-bold text-rose-800 uppercase tracking-wider block">
                  Vencidas / Cobrança
                </span>
                <span className="text-2xl font-black text-rose-600">{overdueMerchants}</span>
                <span className="text-[11px] text-rose-600 block mt-0.5">
                  {dueTodayMerchants > 0 ? `+${dueTodayMerchants} vencem hoje` : 'precisam de aviso'}
                </span>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-slate-200 text-xs font-bold gap-1 sm:gap-2 overflow-x-auto">
              <button
                onClick={() => setActiveTab('merchants')}
                className={`py-2.5 px-3 sm:px-4 rounded-t-xl transition border-b-2 flex items-center gap-1.5 whitespace-nowrap ${
                  activeTab === 'merchants'
                    ? 'border-emerald-600 text-emerald-800 bg-emerald-50/50'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>Lista de Lojistas ({merchants.length})</span>
              </button>

              <button
                onClick={() => setActiveTab('pix_config')}
                className={`py-2.5 px-3 sm:px-4 rounded-t-xl transition border-b-2 flex items-center gap-1.5 whitespace-nowrap ${
                  activeTab === 'pix_config'
                    ? 'border-emerald-600 text-emerald-800 bg-emerald-50/50 ring-1 ring-emerald-500'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <QrCode className="w-4 h-4 text-emerald-700" />
                <span>Meu PIX de Recebimento</span>
                <span className="bg-emerald-600 text-white text-[9px] font-black px-1.5 py-0.2 rounded-full">
                  NOVO
                </span>
              </button>

              <button
                onClick={() => setActiveTab('generator')}
                className={`py-2.5 px-3 sm:px-4 rounded-t-xl transition border-b-2 flex items-center gap-1.5 whitespace-nowrap ${
                  activeTab === 'generator'
                    ? 'border-emerald-600 text-emerald-800 bg-emerald-50/50'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <KeyRound className="w-4 h-4 text-emerald-700" />
                <span>Gerador de Chaves Offline</span>
              </button>

              <button
                onClick={() => setActiveTab('new_merchant')}
                className={`py-2.5 px-3 sm:px-4 rounded-t-xl transition border-b-2 flex items-center gap-1.5 whitespace-nowrap ${
                  activeTab === 'new_merchant'
                    ? 'border-emerald-600 text-emerald-800 bg-emerald-50/50'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Plus className="w-4 h-4" />
                <span>Cadastrar Novo Lojista</span>
              </button>
            </div>

            {/* TAB 1: Merchants List & Tracking */}
            {activeTab === 'merchants' && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      placeholder="Buscar por nome da loja, dono, WhatsApp ou ID do aparelho..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <button
                    onClick={() => setActiveTab('new_merchant')}
                    className="flex items-center gap-1 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold px-3 py-2 rounded-xl transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Novo Lojista</span>
                  </button>
                </div>

                <div className="space-y-2.5">
                  {filteredMerchants.length === 0 ? (
                    <div className="text-center py-8 text-slate-400 bg-slate-50 rounded-xl border border-slate-200">
                      <Store className="w-8 h-8 mx-auto mb-1 opacity-40" />
                      <p className="font-bold text-xs text-slate-600">Nenhuma loja encontrada</p>
                    </div>
                  ) : (
                    filteredMerchants.map((m) => {
                      const isOverdue = m.status === 'expired';
                      const isDueToday = m.expirationDate === getRelativeDateString(0);
                      const daysRemaining = Math.ceil(
                        (new Date(m.expirationDate + 'T12:00:00').getTime() - new Date().getTime()) /
                          (1000 * 60 * 60 * 24)
                      );

                      return (
                        <div
                          key={m.id}
                          className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-emerald-300 transition flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
                        >
                          {/* Info */}
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-sm text-slate-900">{m.storeName}</span>
                              <span className="font-mono bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-semibold text-[11px] border border-slate-200">
                                {m.deviceId}
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded-full font-bold uppercase text-[10px] ${
                                  m.status === 'active'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : isOverdue
                                    ? 'bg-rose-100 text-rose-800'
                                    : 'bg-amber-100 text-amber-800'
                                }`}
                              >
                                {m.status === 'active'
                                  ? 'Ativa'
                                  : isOverdue
                                  ? 'Vencida'
                                  : 'Pausada'}
                              </span>
                            </div>

                            <div className="text-slate-500 flex flex-wrap items-center gap-3">
                              <span>
                                Dono: <strong>{m.ownerName}</strong>
                              </span>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <Phone className="w-3 h-3 text-emerald-600" />
                                {m.phone}
                              </span>
                              <span>•</span>
                              <span>{m.city}</span>
                            </div>

                            <div className="text-[11px] text-slate-400 flex items-center gap-3 pt-1 flex-wrap">
                              <span>
                                Vence em:{' '}
                                <strong
                                  className={
                                    isOverdue
                                      ? 'text-rose-600'
                                      : isDueToday
                                      ? 'text-amber-700'
                                      : 'text-slate-700'
                                  }
                                >
                                  {new Date(m.expirationDate + 'T12:00:00').toLocaleDateString(
                                    'pt-BR'
                                  )}
                                </strong>{' '}
                                ({daysRemaining > 0 ? `${daysRemaining} dias restantes` : 'vencido'})
                              </span>
                              <span>•</span>
                              <span>Clientes anotados: {m.totalCustomers}</span>
                              <span>•</span>
                              <span>Total recebido: R$ {m.totalPaidFees.toFixed(2)}</span>
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex flex-wrap items-center gap-1.5 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
                            {/* Generate Code button */}
                            <button
                              onClick={() => handleSelectMerchantForCode(m)}
                              title="Gerar código de ativação offline"
                              className="px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold flex items-center gap-1 transition"
                            >
                              <KeyRound className="w-3.5 h-3.5 text-emerald-700" />
                              <span>Gerar Chave</span>
                            </button>

                            {/* Quick WhatsApp Renewal reminder */}
                            <button
                              onClick={() => handleSendRenewalReminder(m)}
                              title="Cobrar ou avisar de renovação no WhatsApp"
                              className="px-2.5 py-1.5 rounded-lg bg-green-50 hover:bg-green-100 text-green-800 font-bold flex items-center gap-1 transition"
                            >
                              <Send className="w-3.5 h-3.5 text-green-600" />
                              <span>Avisar Whats</span>
                            </button>

                            {/* Direct +30 days */}
                            <button
                              onClick={() => handleQuickAddDays(m, 30)}
                              title="Confirmar recebimento do PIX e adicionar +30 dias"
                              className="px-2.5 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold transition"
                            >
                              +30 Dias
                            </button>

                            {/* Delete Button (Opens ConfirmModal) */}
                            <button
                              onClick={() => setMerchantToDelete(m)}
                              title="Excluir loja do painel master"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* TAB 2: CONFIGURAÇÃO DO PIX DO ADMINISTRADOR (ONDE ELE RECEBE O DINHEIRO) */}
            {activeTab === 'pix_config' && (
              <div className="max-w-2xl mx-auto space-y-5">
                <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-200 flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                    <QrCode className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-emerald-950">
                      Configuração da Chave PIX do Desenvolvedor
                    </h3>
                    <p className="text-xs text-emerald-800 mt-0.5 leading-relaxed">
                      É para este PIX que todos os comerciantes cadastrados no sistema farão o pagamento da mensalidade de R$ {adminPix.monthlyFee.toFixed(2)}. As alterações feitas aqui aparecem imediatamente na tela de pagamento de todas as lojas!
                    </p>
                  </div>
                </div>

                {pixSaveSuccess && (
                  <div className="p-3 bg-emerald-100 border border-emerald-300 rounded-xl text-emerald-900 text-xs font-bold flex items-center gap-2 animate-in fade-in">
                    <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                    <span>Chave PIX e dados de recebimento atualizados com sucesso no sistema!</span>
                  </div>
                )}

                <form onSubmit={handleSavePixConfig} className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-4">
                  {/* Nome do Titular */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Nome Completo do Titular da Conta / Desenvolvedor *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: JOSÉ RICARDO MARTINS CARVALHO"
                      value={adminPix.adminName}
                      onChange={(e) => setAdminPix({ ...adminPix, adminName: e.target.value.toUpperCase() })}
                      className="w-full text-xs font-bold p-2.5 rounded-xl border border-slate-300 bg-white uppercase"
                    />
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Nome que aparecerá no comprovante de transferência do lojista
                    </p>
                  </div>

                  {/* Chave PIX e Tipo */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Chave PIX para Recebimento *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Ex: seu-email@gmail.com, CPF ou telefone"
                        value={adminPix.adminPixKey}
                        onChange={(e) => setAdminPix({ ...adminPix, adminPixKey: e.target.value.trim() })}
                        className="w-full text-xs font-bold p-2.5 rounded-xl border border-slate-300 bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Tipo de Chave *
                      </label>
                      <select
                        value={adminPix.adminPixKeyType}
                        onChange={(e) => setAdminPix({ ...adminPix, adminPixKeyType: e.target.value as any })}
                        className="w-full text-xs font-bold p-2.5 rounded-xl border border-slate-300 bg-white"
                      >
                        <option value="email">E-mail</option>
                        <option value="cpf">CPF</option>
                        <option value="cnpj">CNPJ</option>
                        <option value="phone">Telefone (Celular)</option>
                        <option value="random">Chave Aleatória (EVP)</option>
                      </select>
                    </div>
                  </div>

                  {/* Cidade do Titular e Valor da Mensalidade */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Cidade Cadastrada no PIX *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Ex: SAO PAULO"
                        value={adminPix.adminCity}
                        onChange={(e) => setAdminPix({ ...adminPix, adminCity: e.target.value.toUpperCase() })}
                        className="w-full text-xs font-bold p-2.5 rounded-xl border border-slate-300 bg-white uppercase"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Valor da Mensalidade Cobrada (R$) *
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 text-xs font-bold text-emerald-700">R$</span>
                        <input
                          type="number"
                          step="0.10"
                          min="1"
                          required
                          value={adminPix.monthlyFee}
                          onChange={(e) => setAdminPix({ ...adminPix, monthlyFee: parseFloat(e.target.value) || 9.90 })}
                          className="w-full text-xs font-bold pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 bg-white"
                        />
                      </div>
                    </div>
                  </div>

                  {/* WhatsApp de Suporte do Dono */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Seu WhatsApp para Suporte e Recebimento de Comprovantes *
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="Ex: 5511988887777 (com DDD)"
                      value={adminPix.whatsappSupport}
                      onChange={(e) => setAdminPix({ ...adminPix, whatsappSupport: e.target.value.replace(/\D/g, '') })}
                      className="w-full text-xs font-bold p-2.5 rounded-xl border border-slate-300 bg-white"
                    />
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Quando o comerciante clicar em "Enviar Comprovante", o WhatsApp abrirá direto para este número
                    </p>
                  </div>

                  {/* Instruções para o Comerciante */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Instruções aos Comerciantes na Tela de Pagamento
                    </label>
                    <textarea
                      rows={2}
                      value={adminPix.instructions}
                      onChange={(e) => setAdminPix({ ...adminPix, instructions: e.target.value })}
                      className="w-full text-xs p-2.5 rounded-xl border border-slate-300 bg-white"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    Salvar Dados do Meu PIX de Recebimento
                  </button>
                </form>

                {/* Pré-visualização do PIX gerado para o Comerciante */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wider">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      Pré-visualização: O que o Comerciante verá ao Pagar
                    </span>
                    <span className="text-[11px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-md">
                      R$ {adminPix.monthlyFee.toFixed(2)} / mês
                    </span>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                    <div
                      className="p-2 bg-white rounded-xl shadow-xs shrink-0"
                      dangerouslySetInnerHTML={{ __html: previewQrSvg }}
                    />
                    <div className="space-y-1.5 text-xs text-slate-700 w-full">
                      <div className="text-slate-900">
                        <strong>Beneficiário:</strong> {adminPix.adminName}
                      </div>
                      <div>
                        <strong>Chave PIX:</strong> <span className="font-mono">{adminPix.adminPixKey}</span> ({adminPix.adminPixKeyType})
                      </div>
                      <div>
                        <strong>Cidade:</strong> {adminPix.adminCity}
                      </div>
                      <div className="pt-1">
                        <span className="text-[11px] text-slate-400 block font-semibold">Linha Digitável Copia e Cola:</span>
                        <p className="font-mono text-[10px] bg-white p-2 rounded-lg border border-slate-200 text-slate-600 break-all select-all">
                          {previewPayload}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: Offline Code Generator */}
            {activeTab === 'generator' && (
              <div className="max-w-xl mx-auto space-y-4 bg-slate-50 p-6 rounded-2xl border border-slate-200">
                <div className="text-center space-y-1">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto font-black">
                    <KeyRound className="w-5 h-5 text-emerald-700" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900">
                    Gerador Criptográfico de Chave Offline
                  </h3>
                  <p className="text-xs text-slate-500">
                    Gere o código exclusivo para o lojista ativar o aplicativo sem precisar de internet
                  </p>
                </div>

                <div className="space-y-3">
                  {/* Seletor e Pesquisa de Lojas Cadastradas */}
                  <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-2.5">
                    <label className="block text-xs font-bold text-slate-800 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Store className="w-3.5 h-3.5 text-emerald-700" />
                        Selecionar ou Pesquisar Loja:
                      </span>
                      <span className="text-[11px] text-slate-400 font-normal">
                        {merchants.length} lojas cadastradas
                      </span>
                    </label>

                    {/* Menu suspenso (Select) */}
                    <div>
                      <select
                        value={selectedDeviceId}
                        onChange={(e) => {
                          const val = e.target.value;
                          const found = merchants.find((m) => m.deviceId === val);
                          if (found) {
                            setSelectedDeviceId(found.deviceId);
                            setSelectedMerchantName(found.storeName);
                            setSelectedMerchantPhone(found.phone);
                          } else {
                            setSelectedDeviceId(val);
                            setSelectedMerchantName('');
                            setSelectedMerchantPhone('');
                          }
                          if (generatedCode) setGeneratedCode('');
                        }}
                        className="w-full text-xs font-bold p-2.5 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:ring-2 focus:ring-emerald-500"
                      >
                        <option value="">-- Escolha uma Loja Cadastrada --</option>
                        {merchants.map((m) => (
                          <option key={m.id} value={m.deviceId}>
                            {m.storeName} — {m.ownerName} ({m.deviceId}) • {m.status === 'active' ? 'Ativa' : 'Vencida'}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Campo de pesquisa de lojas em tempo real */}
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        placeholder="Ou pesquise loja por nome, dono ou ID..."
                        value={storeSearchQuery}
                        onChange={(e) => setStoreSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-8 py-2 rounded-xl border border-slate-300 text-xs bg-white text-slate-800 focus:ring-2 focus:ring-emerald-500"
                      />
                      {storeSearchQuery && (
                        <button
                          type="button"
                          onClick={() => setStoreSearchQuery('')}
                          className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full"
                          title="Limpar pesquisa"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Resultados da pesquisa em tempo real */}
                    {storeSearchQuery.trim() && (
                      <div className="max-h-40 overflow-y-auto space-y-1 p-1 bg-slate-50 rounded-xl border border-slate-200 animate-in fade-in">
                        {merchants.filter((m) => {
                          const q = storeSearchQuery.toLowerCase();
                          return (
                            m.storeName.toLowerCase().includes(q) ||
                            m.ownerName.toLowerCase().includes(q) ||
                            m.deviceId.toLowerCase().includes(q) ||
                            m.phone.includes(q)
                          );
                        }).length === 0 ? (
                          <p className="text-center py-2 text-xs text-slate-400">
                            Nenhuma loja encontrada para "{storeSearchQuery}"
                          </p>
                        ) : (
                          merchants
                            .filter((m) => {
                              const q = storeSearchQuery.toLowerCase();
                              return (
                                m.storeName.toLowerCase().includes(q) ||
                                m.ownerName.toLowerCase().includes(q) ||
                                m.deviceId.toLowerCase().includes(q) ||
                                m.phone.includes(q)
                              );
                            })
                            .map((m) => (
                              <button
                                key={m.id}
                                type="button"
                                onClick={() => {
                                  setSelectedDeviceId(m.deviceId);
                                  setSelectedMerchantName(m.storeName);
                                  setSelectedMerchantPhone(m.phone);
                                  setStoreSearchQuery('');
                                  if (generatedCode) setGeneratedCode('');
                                }}
                                className={`w-full text-left p-2 rounded-lg text-xs transition flex items-center justify-between gap-2 border ${
                                  selectedDeviceId === m.deviceId
                                    ? 'bg-emerald-100/70 border-emerald-300 text-emerald-950 font-bold'
                                    : 'bg-white border-slate-100 hover:bg-emerald-50 hover:border-emerald-200 text-slate-800'
                                }`}
                              >
                                <div className="truncate">
                                  <span className="font-bold block truncate">{m.storeName}</span>
                                  <span className="text-[11px] text-slate-500">
                                    Dono: {m.ownerName} • {m.phone}
                                  </span>
                                </div>
                                <span className="font-mono text-[11px] font-bold bg-slate-100 text-slate-800 px-2 py-0.5 rounded-md shrink-0">
                                  {m.deviceId}
                                </span>
                              </button>
                            ))
                        )}
                      </div>
                    )}

                    {/* Card da loja selecionada com resumo */}
                    {selectedMerchantName && (
                      <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-300 flex items-center justify-between gap-2 text-xs animate-in fade-in">
                        <div className="truncate">
                          <span className="text-[10px] uppercase font-bold text-emerald-800 block">
                            Loja Selecionada:
                          </span>
                          <span className="font-bold text-emerald-950 block truncate">
                            {selectedMerchantName}
                          </span>
                          <span className="text-[11px] text-emerald-800">
                            ID: <strong className="font-mono">{selectedDeviceId}</strong> • Whats:{' '}
                            {selectedMerchantPhone || 'Não informado'}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedDeviceId('');
                            setSelectedMerchantName('');
                            setSelectedMerchantPhone('');
                            if (generatedCode) setGeneratedCode('');
                          }}
                          className="text-[11px] text-emerald-800 hover:text-emerald-950 underline font-bold px-1.5 py-0.5 shrink-0"
                        >
                          Limpar
                        </button>
                      </div>
                    )}
                  </div>

                  {/* ID do aparelho selecionado ou digitado */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      ID do Aparelho do Lojista (Ex: LOJA-7842)
                    </label>
                    <input
                      type="text"
                      placeholder="LOJA-XXXX"
                      value={selectedDeviceId}
                      onChange={(e) => {
                        const val = e.target.value.toUpperCase();
                        setSelectedDeviceId(val);
                        const found = merchants.find((m) => m.deviceId === val);
                        if (found) {
                          setSelectedMerchantName(found.storeName);
                          setSelectedMerchantPhone(found.phone);
                        }
                        if (generatedCode) setGeneratedCode('');
                      }}
                      className="w-full uppercase font-mono font-bold text-sm p-2.5 rounded-xl border border-slate-300 bg-white"
                    />
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Você pode selecionar na lista acima ou digitar o código ID do celular do cliente
                    </p>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setGeneratorDays(30)}
                      className={`py-2 px-3 rounded-xl border text-xs font-bold transition ${
                        generatorDays === 30
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-900'
                          : 'border-slate-200 bg-white text-slate-600'
                      }`}
                    >
                      30 Dias (R$ {adminPix.monthlyFee.toFixed(2)})
                    </button>
                    <button
                      type="button"
                      onClick={() => setGeneratorDays(60)}
                      className={`py-2 px-3 rounded-xl border text-xs font-bold transition ${
                        generatorDays === 60
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-900'
                          : 'border-slate-200 bg-white text-slate-600'
                      }`}
                    >
                      60 Dias (2 meses)
                    </button>
                    <button
                      type="button"
                      onClick={() => setGeneratorDays(90)}
                      className={`py-2 px-3 rounded-xl border text-xs font-bold transition ${
                        generatorDays === 90
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-900'
                          : 'border-slate-200 bg-white text-slate-600'
                      }`}
                    >
                      90 Dias (3 meses)
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleGenerateCode(selectedDeviceId, generatorDays)}
                    disabled={!selectedDeviceId}
                    className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-md transition disabled:opacity-40"
                  >
                    Gerar Código Criptográfico de Liberação
                  </button>

                  {generatedCode && (
                    <div className="mt-4 p-4 bg-white rounded-xl border-2 border-emerald-500 space-y-3">
                      <div className="text-center">
                        <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">
                          Chave Offline para {selectedDeviceId} (+{generatorDays} dias)
                        </span>
                        <div className="font-mono text-xl font-black text-slate-900 tracking-wider my-1 select-all">
                          {generatedCode}
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={handleCopyCode}
                          className="flex-1 py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center justify-center gap-1.5 transition"
                        >
                          {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedCode ? 'Copiado!' : 'Copiar Chave'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={handleSendCodeViaWhatsApp}
                          className="flex-1 py-2 px-3 rounded-xl bg-green-600 hover:bg-green-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition shadow-xs"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>Enviar no WhatsApp</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 4: Cadastrar Novo Lojista */}
            {activeTab === 'new_merchant' && (
              <form
                onSubmit={handleCreateNewMerchant}
                className="max-w-xl mx-auto space-y-4 bg-slate-50 p-6 rounded-2xl border border-slate-200"
              >
                <div className="text-center space-y-1">
                  <h3 className="text-base font-bold text-slate-900">Cadastrar Novo Lojista</h3>
                  <p className="text-xs text-slate-500">
                    Adicione um novo comerciante para acompanhar suas licenças mensais
                  </p>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Nome da Marmitaria / Bar / Estabelecimento *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Marmitaria da Esquina"
                      value={newStoreName}
                      onChange={(e) => setNewStoreName(e.target.value)}
                      className="w-full text-xs p-2.5 rounded-xl border border-slate-300 bg-white font-bold"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Nome do Proprietário *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Ex: João da Silva"
                        value={newOwnerName}
                        onChange={(e) => setNewOwnerName(e.target.value)}
                        className="w-full text-xs p-2.5 rounded-xl border border-slate-300 bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        WhatsApp do Lojista *
                      </label>
                      <input
                        type="tel"
                        required
                        placeholder="5511987654321"
                        value={newPhone}
                        onChange={(e) => setNewPhone(e.target.value)}
                        className="w-full text-xs p-2.5 rounded-xl border border-slate-300 bg-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Cidade / UF
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: Fortaleza - CE"
                        value={newCity}
                        onChange={(e) => setNewCity(e.target.value)}
                        className="w-full text-xs p-2.5 rounded-xl border border-slate-300 bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        ID do Aparelho (opcional)
                      </label>
                      <input
                        type="text"
                        placeholder="LOJA-XXXX (gerado auto se vazio)"
                        value={newDeviceId}
                        onChange={(e) => setNewDeviceId(e.target.value.toUpperCase())}
                        className="w-full text-xs p-2.5 rounded-xl border border-slate-300 bg-white uppercase font-mono"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full mt-2 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-md transition"
                  >
                    Salvar e Cadastrar Lojista
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>Controle de Marmitex SaaS Engine • Versão Master</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold transition"
          >
            Fechar Painel
          </button>
        </div>
      </div>

      {/* Modal de Confirmação para Remover Loja do Painel */}
      <ConfirmModal
        isOpen={!!merchantToDelete}
        title="Remover Loja do Painel Master"
        message={`Deseja realmente remover a loja "${merchantToDelete?.storeName}" (ID: ${merchantToDelete?.deviceId}) do painel master? Esta ação não pode ser desfeita.`}
        confirmLabel="Sim, Remover Loja"
        onConfirm={handleExecuteDeleteMerchant}
        onCancel={() => setMerchantToDelete(null)}
      />
    </div>
  );
};

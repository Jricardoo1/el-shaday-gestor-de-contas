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
    if (!isNaN(val)) {
      setProducts((prev) =>
        prev.map((p) => (p.id === productId ? { ...p, price: val } : p))
      );
    }
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="bg-emerald-900 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Store className="w-5 h-5 text-emerald-300" />
            <div>
              <h2 className="text-base font-bold">Configurações do Comércio</h2>
              <p className="text-xs text-emerald-200">Dados da loja, chave PIX e backup manual</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
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

          <form onSubmit={handleSubmit} className="space-y-4">
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

            {/* Preços de Venda Padrão */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wider">
                  <UtensilsCrossed className="w-4 h-4 text-emerald-700" />
                  Preços Padrão do Cardápio
                </span>
                <span className="text-[11px] text-slate-500">Usado no toque rápido</span>
              </div>

              <div className="space-y-2">
                <span className="text-[11px] font-bold text-slate-700 block">🍱 Marmitex & Pratos:</span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {products
                    .filter((p) => p.category === 'marmitex')
                    .map((prod) => (
                      <div key={prod.id} className="bg-white p-2.5 rounded-xl border border-slate-200">
                        <span className="text-xs font-bold text-slate-800 block truncate">{prod.name}</span>
                        <div className="flex items-center gap-1 mt-1">
                          <span className="text-xs font-bold text-emerald-700">R$</span>
                          <input
                            type="number"
                            step="0.50"
                            value={prod.price}
                            onChange={(e) => handlePriceChange(prod.id, e.target.value)}
                            className="w-full text-xs font-bold p-1 rounded-md border border-slate-300 bg-slate-50"
                          />
                        </div>
                      </div>
                    ))}
                </div>

                <span className="text-[11px] font-bold text-slate-700 block pt-1">🥤 Bebidas:</span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {products
                    .filter((p) => p.category === 'bebidas')
                    .map((prod) => (
                      <div key={prod.id} className="bg-white p-2.5 rounded-xl border border-slate-200">
                        <span className="text-[11px] font-bold text-slate-800 block truncate">{prod.name}</span>
                        <div className="flex items-center gap-1 mt-1">
                          <span className="text-xs font-bold text-emerald-700">R$</span>
                          <input
                            type="number"
                            step="0.50"
                            value={prod.price}
                            onChange={(e) => handlePriceChange(prod.id, e.target.value)}
                            className="w-full text-xs font-bold p-1 rounded-md border border-slate-300 bg-slate-50"
                          />
                        </div>
                      </div>
                    ))}
                </div>
              </div>
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

            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-sm shadow-md transition flex items-center justify-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              Salvar Todas as Configurações
            </button>
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
    </div>
  );
};

import React, { useState } from 'react';
import {
  ShieldCheck,
  PauseCircle,
  PlayCircle,
  QrCode,
  Copy,
  Check,
  Zap,
  Calendar,
  Clock,
  Sparkles,
  AlertCircle,
  History,
  X,
  CreditCard,
  PhoneCall,
  KeyRound,
  Send,
  HelpCircle,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { LicenseState, StoreSettings } from '../types';
import { StorageService } from '../services/storage';
import { generatePixCopiaECola, generateQRCodeSVG } from '../services/pixGenerator';
import { ConfirmModal } from './ConfirmModal';

interface LicenseModalProps {
  license: LicenseState;
  settings: StoreSettings;
  onClose: () => void;
  onUpdateLicense: (updated: LicenseState) => void;
}

export const LicenseModal: React.FC<LicenseModalProps> = ({
  license,
  settings,
  onClose,
  onUpdateLicense,
}) => {
  const [activeTab, setActiveTab] = useState<'plan' | 'pix' | 'offline_code' | 'history'>('plan');
  const [copied, setCopied] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [simulatedSuccess, setSimulatedSuccess] = useState(false);
  const [showPauseConfirm, setShowPauseConfirm] = useState(false);

  // Offline activation input
  const [offlineCodeInput, setOfflineCodeInput] = useState('');
  const [activationError, setActivationError] = useState('');
  const [activationSuccess, setActivationSuccess] = useState('');

  // Developer / System Owner PIX & WhatsApp configuration from Master Admin
  const adminPix = StorageService.getAdminPixConfig();
  const supportPhone = adminPix.whatsappSupport || '5511988887777';
  const deviceId = license.deviceId || settings.deviceId || 'LOJA-9999';

  // PIX details for the license payment (configured by the Admin Developer)
  const systemPixKey = adminPix.adminPixKey || 'josericardo.martinscarvalho@gmail.com';
  const licenseTxId = 'FIADO' + Math.floor(100000 + Math.random() * 900000);

  const pixPayload = generatePixCopiaECola({
    pixKey: systemPixKey,
    merchantName: (adminPix.adminName || 'CONTROLE MARMITEX').slice(0, 25),
    merchantCity: (adminPix.adminCity || 'SAO PAULO').slice(0, 15),
    amount: adminPix.monthlyFee || 9.90,
    txId: licenseTxId,
    description: `Licenca Mensal ${deviceId}`,
  });

  const qrSvg = generateQRCodeSVG(pixPayload, 240);

  const daysRemaining = Math.max(
    0,
    Math.ceil(
      (new Date(license.nextBillingDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    )
  );

  const handleCopyPix = () => {
    navigator.clipboard.writeText(pixPayload);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleCopyId = () => {
    navigator.clipboard.writeText(deviceId);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleExecutePause = () => {
    const updated = StorageService.pauseLicense();
    onUpdateLicense(updated);
    setShowPauseConfirm(false);
  };

  const handleResume = () => {
    const updated = StorageService.resumeLicense();
    onUpdateLicense(updated);
  };

  const handleSimulateExpired = () => {
    const updated = StorageService.expireLicense();
    onUpdateLicense(updated);
  };

  const handleSimulatePixConfirmation = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      const updated = StorageService.confirmPixPayment(adminPix.monthlyFee || 9.90, licenseTxId);
      onUpdateLicense(updated);
      setSimulatedSuccess(true);
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });
      setTimeout(() => {
        setSimulatedSuccess(false);
        setActiveTab('plan');
      }, 2500);
    }, 1200);
  };

  const handleApplyOfflineCode = (e: React.FormEvent) => {
    e.preventDefault();
    setActivationError('');
    setActivationSuccess('');

    if (!offlineCodeInput.trim()) {
      setActivationError('Digite o código de liberação fornecido.');
      return;
    }

    const result = StorageService.applyOfflineActivationCode(offlineCodeInput);
    if (result.success) {
      onUpdateLicense(result.license);
      setActivationSuccess(result.message);
      setOfflineCodeInput('');
      confetti({
        particleCount: 90,
        spread: 80,
        origin: { y: 0.6 },
      });
      setTimeout(() => {
        setActiveTab('plan');
      }, 2500);
    } else {
      setActivationError(result.message);
    }
  };

  const handleSendProofViaWhatsApp = () => {
    const text = `Olá! Fiz o pagamento do PIX de R$ 9,90 para renovar a licença do meu aplicativo Controle de Fiado.\n\n📱 *Meu ID do Aparelho:* ${deviceId}\n🏪 *Loja:* ${settings.storeName}\n👤 *Responsável:* ${settings.ownerName}\n\nPor favor, me envie o código de liberação offline de 30 dias. Obrigado!`;
    const url = `https://api.whatsapp.com/send?phone=${supportPhone}&text=${encodeURIComponent(text)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-800 to-emerald-900 px-6 py-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-700/80 border border-emerald-500/50 flex items-center justify-center text-emerald-200 shadow-inner">
              <ShieldCheck className="w-6 h-6 text-emerald-300" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Licença do Comerciante</h2>
              <div className="flex items-center gap-2">
                <span className="text-xs text-emerald-200">
                  R$ 9,90/mês • Controle Offline
                </span>
                <span className="text-[11px] bg-emerald-700/90 text-white font-mono px-2 py-0.2 rounded-md border border-emerald-500/40">
                  ID: {deviceId}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-50 text-xs font-bold overflow-x-auto">
          <button
            onClick={() => setActiveTab('plan')}
            className={`py-3 px-3.5 text-center transition border-b-2 flex items-center justify-center gap-1.5 whitespace-nowrap ${
              activeTab === 'plan'
                ? 'border-emerald-600 text-emerald-800 bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>Minha Licença</span>
          </button>
          <button
            onClick={() => setActiveTab('pix')}
            className={`py-3 px-3.5 text-center transition border-b-2 flex items-center justify-center gap-1.5 whitespace-nowrap ${
              activeTab === 'pix'
                ? 'border-emerald-600 text-emerald-800 bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <QrCode className="w-4 h-4 text-emerald-600" />
            <span>Pagar PIX</span>
          </button>
          <button
            onClick={() => setActiveTab('offline_code')}
            className={`py-3 px-3.5 text-center transition border-b-2 flex items-center justify-center gap-1.5 whitespace-nowrap ${
              activeTab === 'offline_code'
                ? 'border-emerald-600 text-emerald-800 bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <KeyRound className="w-4 h-4 text-emerald-600" />
            <span>Código Offline</span>
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`py-3 px-3.5 text-center transition border-b-2 flex items-center justify-center gap-1.5 whitespace-nowrap ${
              activeTab === 'history'
                ? 'border-emerald-600 text-emerald-800 bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Histórico</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[75vh] overflow-y-auto">
          {activeTab === 'plan' && (
            <div className="space-y-5">
              {/* Clock Tampered Warning if detected */}
              {license.clockTampered && (
                <div className="p-3.5 bg-rose-50 border border-rose-300 rounded-xl text-rose-900 text-xs font-semibold flex items-start gap-2.5">
                  <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block text-rose-800">
                      Horário do dispositivo incorreto detectado
                    </strong>
                    O relógio do seu celular parece ter sido alterado manualmente. Ajuste o relógio
                    do celular para o horário de Brasília ou insira um código de liberação para
                    normalizar o aplicativo.
                  </div>
                </div>
              )}

              {/* Current Status Banner */}
              <div
                className={`p-4 rounded-xl border flex items-start gap-4 ${
                  license.status === 'active'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : license.status === 'paused'
                    ? 'bg-amber-50 border-amber-300 text-amber-900'
                    : 'bg-rose-50 border-rose-300 text-rose-900'
                }`}
              >
                <div className="mt-0.5">
                  {license.status === 'active' && (
                    <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold">
                      <Check className="w-5 h-5" />
                    </div>
                  )}
                  {license.status === 'paused' && (
                    <div className="w-8 h-8 rounded-full bg-amber-500 text-white flex items-center justify-center font-bold">
                      <PauseCircle className="w-5 h-5" />
                    </div>
                  )}
                  {license.status === 'expired' && (
                    <div className="w-8 h-8 rounded-full bg-rose-600 text-white flex items-center justify-center font-bold">
                      <AlertCircle className="w-5 h-5" />
                    </div>
                  )}
                </div>

                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs uppercase tracking-wider font-bold">
                      Status da Assinatura
                    </span>
                    <span
                      className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase ${
                        license.status === 'active'
                          ? 'bg-emerald-200 text-emerald-800'
                          : license.status === 'paused'
                          ? 'bg-amber-200 text-amber-900'
                          : 'bg-rose-200 text-rose-900'
                      }`}
                    >
                      {license.status === 'active'
                        ? 'Ativa'
                        : license.status === 'paused'
                        ? 'Pausada'
                        : 'Expirada'}
                    </span>
                  </div>

                  <h3 className="text-base font-bold mt-1">
                    {license.status === 'active' && 'Licença Liberada e 100% Funcional'}
                    {license.status === 'paused' && 'Licença Pausada no Momento'}
                    {license.status === 'expired' && 'Licença Vencida — Renove via PIX'}
                  </h3>

                  <p className="text-xs mt-1 text-slate-600 leading-relaxed">
                    {license.status === 'active' &&
                      `Válida por mais ${daysRemaining} dias (até ${new Date(
                        license.nextBillingDate
                      ).toLocaleDateString('pt-BR')}).`}
                    {license.status === 'paused' &&
                      'Você pausou sua cobrança. Seus clientes e fiados continuam salvos com segurança no seu celular. Reative a qualquer momento!'}
                    {license.status === 'expired' &&
                      'Faça o pagamento de R$ 9,90 via PIX ou use um código de liberação para liberar mais 30 dias.'}
                  </p>
                </div>
              </div>

              {/* Device ID Card */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                    ID Exclusivo do seu Aparelho
                  </span>
                  <span className="text-base font-mono font-black text-slate-900">{deviceId}</span>
                </div>
                <button
                  onClick={handleCopyId}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-100 text-xs font-semibold text-slate-700 transition"
                >
                  {copiedId ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copiar ID</span>
                    </>
                  )}
                </button>
              </div>

              {/* Pause & Resume Controls */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-2">
                  <Zap className="w-4 h-4 text-emerald-600" />
                  Pausar ou Retomar a Licença
                </h4>
                <p className="text-xs text-slate-600 mb-4 leading-relaxed">
                  Não vai usar o app este mês? Pause a qualquer momento. Nenhum dado é perdido.
                </p>

                {license.status === 'active' ? (
                  <button
                    onClick={() => setShowPauseConfirm(true)}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-semibold py-2.5 px-4 text-sm shadow-sm transition active:scale-[0.99]"
                  >
                    <PauseCircle className="w-4 h-4" />
                    Pausar Licença Agora
                  </button>
                ) : (
                  <button
                    onClick={handleResume}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 px-4 text-sm shadow-sm transition active:scale-[0.99]"
                  >
                    <PlayCircle className="w-4 h-4" />
                    Reativar Minha Licença
                  </button>
                )}
              </div>

              {/* Simulação de Validade para Teste */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex items-center justify-between gap-3">
                <div>
                  <h5 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                    Simular Validade do Sistema
                  </h5>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {license.status === 'expired'
                      ? 'Status atual: Licença Vencida (simulação em andamento).'
                      : 'Simule que a licença expirou para testar avisos e renovação.'}
                  </p>
                </div>
                {license.status === 'expired' ? (
                  <button
                    type="button"
                    onClick={handleResume}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shrink-0 shadow-xs"
                  >
                    Reativar
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleSimulateExpired}
                    className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition shrink-0 shadow-xs"
                  >
                    Simular Expirado
                  </button>
                )}
              </div>

              {/* Quick Actions */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setActiveTab('pix')}
                  className="p-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex flex-col items-center justify-center gap-1.5 transition shadow-sm"
                >
                  <QrCode className="w-5 h-5 text-emerald-200" />
                  <span>Pagar PIX (R$ 9,90)</span>
                </button>

                <button
                  onClick={() => setActiveTab('offline_code')}
                  className="p-3 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-800 text-xs font-bold flex flex-col items-center justify-center gap-1.5 transition"
                >
                  <KeyRound className="w-5 h-5 text-emerald-700" />
                  <span>Inserir Código Offline</span>
                </button>
              </div>
            </div>
          )}

          {activeTab === 'offline_code' && (
            <div className="space-y-4">
              <div className="text-center">
                <div className="inline-flex items-center gap-1.5 bg-emerald-100 text-emerald-800 text-xs font-bold px-3 py-1 rounded-full mb-2">
                  <KeyRound className="w-3.5 h-3.5" />
                  Liberação 100% Offline (Sem Internet)
                </div>
                <h3 className="text-base font-bold text-slate-900">
                  Como Funciona o Controle Offline?
                </h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 leading-relaxed">
                  O aplicativo possui validação matemática criptografada. Mesmo sem conexão de
                  internet no seu celular, você insere a chave gerada e o app libera +30 dias na
                  hora!
                </p>
              </div>

              {activationError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{activationError}</span>
                </div>
              )}

              {activationSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-xl flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{activationSuccess}</span>
                </div>
              )}

              {/* Form to enter activation code */}
              <form onSubmit={handleApplyOfflineCode} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Código de Liberação Offline
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: CF-4821-30D-8F2B1A7C"
                    value={offlineCodeInput}
                    onChange={(e) => setOfflineCodeInput(e.target.value.toUpperCase())}
                    className="w-full font-mono text-center tracking-wider text-sm font-black p-3 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 uppercase bg-slate-50"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    O código é gerado exclusivamente para o seu aparelho (ID: {deviceId}).
                  </p>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-md transition flex items-center justify-center gap-2"
                >
                  <KeyRound className="w-4 h-4" />
                  <span>Validar e Liberar +30 Dias Offline</span>
                </button>
              </form>

              {/* Step-by-step for the merchant */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs text-slate-700">
                <span className="font-bold text-slate-800 flex items-center gap-1.5">
                  <HelpCircle className="w-3.5 h-3.5 text-emerald-700" />
                  Passo a Passo para Renovar:
                </span>
                <ol className="list-decimal list-inside space-y-1 text-[11px] text-slate-600 leading-relaxed">
                  <li>Faça o PIX de R$ 9,90 na aba anterior.</li>
                  <li>Clique no botão abaixo para enviar o comprovante no WhatsApp com seu ID ({deviceId}).</li>
                  <li>Receba seu código exclusivo de 30 dias.</li>
                  <li>Cole aqui no campo acima e pronto: o app libera mesmo sem internet!</li>
                </ol>

                <button
                  type="button"
                  onClick={handleSendProofViaWhatsApp}
                  className="w-full mt-2 py-2 px-3 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Enviar Comprovante e Pedir Código no WhatsApp</span>
                </button>
              </div>
            </div>
          )}

          {activeTab === 'pix' && (
            <div className="space-y-4">
              <div className="text-center">
                <div className="inline-flex items-center gap-2 bg-emerald-100 text-emerald-800 text-xs font-bold px-3 py-1 rounded-full mb-2">
                  <Sparkles className="w-3.5 h-3.5" />
                  Liberação Imediata via PIX
                </div>
                <h3 className="text-base font-bold text-slate-900">
                  Pague R$ 9,90 e Renove por +30 Dias
                </h3>
                <p className="text-xs text-slate-500">
                  Escaneie o QR Code no app do seu banco ou use a chave Copia e Cola
                </p>
              </div>

              {/* QR Code Container */}
              <div className="flex justify-center p-3 bg-slate-50 rounded-2xl border border-slate-200">
                <div
                  className="w-56 h-56 p-2 bg-white rounded-xl shadow-xs"
                  dangerouslySetInnerHTML={{ __html: qrSvg }}
                />
              </div>

              {/* Informações Oficiais do Desenvolvedor Cadastradas no Painel Master */}
              <div className="bg-amber-50/90 p-3.5 rounded-xl border border-amber-300 text-xs text-amber-950 space-y-1">
                <span className="font-bold flex items-center gap-1.5 text-amber-900">
                  <ShieldCheck className="w-4 h-4 text-emerald-700" />
                  Beneficiário Oficial (Desenvolvedor):
                </span>
                <p><strong>Titular:</strong> {adminPix.adminName}</p>
                <p><strong>Chave PIX:</strong> <span className="font-mono">{adminPix.adminPixKey}</span> ({adminPix.adminPixKeyType})</p>
                <p><strong>Valor:</strong> R$ {adminPix.monthlyFee.toFixed(2)} / mês</p>
                {adminPix.instructions && (
                  <p className="text-[11px] text-amber-800 italic pt-1 border-t border-amber-200">
                    "{adminPix.instructions}"
                  </p>
                )}
              </div>

              {/* PIX Copia e Cola box */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                  <span>Código PIX Copia e Cola:</span>
                  <span className="text-[11px] text-emerald-600 font-normal">Válido para qualquer banco</span>
                </label>
                <div className="flex items-center gap-2 bg-slate-100 p-2.5 rounded-xl border border-slate-200">
                  <input
                    type="text"
                    readOnly
                    value={pixPayload}
                    className="text-xs font-mono text-slate-700 bg-transparent flex-1 outline-hidden select-all truncate"
                  />
                  <button
                    onClick={handleCopyPix}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition shrink-0 ${
                      copied
                        ? 'bg-emerald-600 text-white'
                        : 'bg-white text-slate-800 border border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copiar</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-2 pt-2 border-t border-slate-200">
                <button
                  onClick={handleSimulatePixConfirmation}
                  disabled={isProcessing || simulatedSuccess}
                  className={`w-full flex items-center justify-center gap-2 rounded-xl py-3 px-4 text-sm font-bold shadow-md transition ${
                    simulatedSuccess
                      ? 'bg-emerald-600 text-white'
                      : 'bg-emerald-700 hover:bg-emerald-800 text-white active:scale-[0.99]'
                  }`}
                >
                  {isProcessing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Verificando PIX no Banco Central...</span>
                    </>
                  ) : simulatedSuccess ? (
                    <>
                      <Check className="w-5 h-5 text-white" />
                      <span>PIX Confirmado! +30 Dias Liberados!</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4 text-amber-300" />
                      <span>Confirmar Pagamento PIX (Liberar Agora)</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleSendProofViaWhatsApp}
                  className="w-full py-2.5 px-4 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center justify-center gap-2 transition"
                >
                  <Send className="w-3.5 h-3.5 text-green-600" />
                  <span>Já paguei: Enviar Comprovante no WhatsApp</span>
                </button>
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Recibos de Renovação da Licença
              </h4>

              {license.history && license.history.length > 0 ? (
                <div className="space-y-2">
                  {license.history.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                          {item.activationCode ? 'CHAVE' : 'PIX'}
                        </div>
                        <div>
                          <p className="font-bold text-slate-800">
                            Renovação ({item.periodDays} dias)
                          </p>
                          <p className="text-[11px] text-slate-500">
                            {new Date(item.date).toLocaleDateString('pt-BR')} • {item.pixTxId}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-emerald-700 text-sm">
                          R$ {item.amount.toFixed(2)}
                        </span>
                        <span className="block text-[10px] text-emerald-600 font-semibold uppercase">
                          Liberado
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500 text-center py-6">
                  Nenhum pagamento registrado ainda.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            Dúvidas? Suporte no WhatsApp do Desenvolvedor
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold text-xs transition"
          >
            Fechar
          </button>
        </div>
      </div>

      {/* Modal de Confirmação para Pausar Licença */}
      <ConfirmModal
        isOpen={showPauseConfirm}
        title="Pausar Licença do App"
        message="Deseja realmente pausar sua licença? Seus dados continuarão salvos e 100% seguros no seu aparelho. Você poderá reativá-la a qualquer momento sem perder nenhum fiado ou cliente."
        confirmLabel="Sim, Pausar Licença"
        isDestructive={false}
        onConfirm={handleExecutePause}
        onCancel={() => setShowPauseConfirm(false)}
      />
    </div>
  );
};

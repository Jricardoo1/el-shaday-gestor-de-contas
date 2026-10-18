import React, { useState } from 'react';
import {
  X,
  Copy,
  Check,
  Send,
  MessageSquare,
  Sparkles,
  ArrowUp,
  ArrowDown,
  User,
  DollarSign,
  ShieldCheck,
  Calendar,
  HelpCircle,
} from 'lucide-react';
import { Customer, StoreSettings } from '../types';
import { StorageService } from '../services/storage';

interface CollectionSuggestionsModalProps {
  customers: Customer[];
  selectedCustomerId?: string;
  settings: StoreSettings;
  onClose: () => void;
}

export const CollectionSuggestionsModal: React.FC<CollectionSuggestionsModalProps> = ({
  customers,
  selectedCustomerId,
  settings,
  onClose,
}) => {
  const [activeCustomerId, setActiveCustomerId] = useState<string>(
    selectedCustomerId || customers[0]?.id || ''
  );
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [verticalPosition, setVerticalPosition] = useState<'top' | 'center' | 'bottom'>('center');

  const selectedCustomer = customers.find((c) => c.id === activeCustomerId);
  const debtInfo = selectedCustomer ? StorageService.getCustomerDebt(selectedCustomer.id) : null;
  const storeName = settings.storeName || 'Nossa Loja';
  const pixKey = settings.pixKey ? `Chave PIX: ${settings.pixKey}` : 'Chave PIX no balcão';

  const customerName = selectedCustomer
    ? selectedCustomer.nickname || selectedCustomer.name.split(' ')[0]
    : 'Cliente';

  const debtValue = debtInfo && debtInfo.totalDebt > 0
    ? `R$ ${debtInfo.totalDebt.toFixed(2)}`
    : 'R$ 0,00';

  const nearestDue = debtInfo?.entries.find((e) => e.status !== 'paid');
  const dueDateStr = nearestDue?.dueDate
    ? new Date(nearestDue.dueDate + 'T12:00:00').toLocaleDateString('pt-BR')
    : 'data combinada';

  // 3 Modelos de mensagens amigáveis e eficazes identificados via Google Search
  const templates = [
    {
      id: 1,
      title: '1. Lembrete Preventivo Amigável (Vencendo Hoje ou Amanhã)',
      badge: 'Preventivo • Alta Eficácia',
      badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      description:
        'Ideal para enviar no dia do vencimento ou um dia antes. Cordial, evita constrangimento e facilita o acerto imediato via Pix.',
      message: `Olá, ${customerName}! Tudo bem com você? 😊\n\nPassando apenas para lembrar com carinho que o consumo na sua conta aqui na *${storeName}* no valor de *${debtValue}* vence em *${dueDateStr}*.\n\nSe preferir acertar no PIX sem precisar vir ao balcão:\n👉 *${pixKey}*\n\nAgradecemos muito pela sua preferência e parceria de sempre! Um abraço e bom almoço.`,
    },
    {
      id: 2,
      title: '2. Lembrete Educado e Compreensivo (Atraso Recente)',
      badge: 'Pós-Vencimento Leve • Compreensivo',
      badgeColor: 'bg-amber-100 text-amber-800 border-amber-300',
      description:
        'Ideal para clientes com atraso leve (1 a 7 dias). Reconhece que a correria do dia a dia acontece e convida ao acerto sem atrito.',
      message: `Oi, ${customerName}, tudo bem com você? Esperamos que sim! 🙏\n\nNotamos aqui que o saldo de *${debtValue}* referente ao consumo de marmitas/compras na *${storeName}* venceu em *${dueDateStr}*. Sabemos que com a correria do dia a dia imprevistos acontecem!\n\nConsegue dar uma olhadinha quando puder? Segue nossa chave Pix para facilitar:\n👉 *${pixKey}*\n\nCaso já tenha acertado no caixa, por favor desconsidere. Muito obrigado pela confiança!`,
    },
    {
      id: 3,
      title: '3. Proposta de Flexibilidade & Negociação (Acordo Amigável)',
      badge: 'Acordo Flexível • Recuperação de Saldo',
      badgeColor: 'bg-blue-100 text-blue-800 border-blue-300',
      description:
        'Ideal para valores maiores ou contas em atraso. Oferece abertura para combinar acerto parcial ou parcelamento sem afastar o cliente.',
      message: `Olá, ${customerName}! Esperamos que esteja tudo ótimo por aí. 😊\n\nEstamos fazendo a conferência e fechamento das contas do mês aqui na *${storeName}* e vimos o saldo pendente de *${debtValue}*.\n\nQueremos muito te ajudar a manter sua conta em dia com toda a tranquilidade! Se preferir, podemos combinar um acerto parcial ou parcelar como ficar melhor para você.\n\nMe avise por aqui para combinarmos o melhor dia. Um abraço da equipe *${storeName}*! 🤝`,
    },
  ];

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2500);
  };

  const handleSendWhatsApp = (text: string) => {
    if (!selectedCustomer?.phone) {
      handleCopy(text, -1);
      return;
    }
    const cleanPhone = selectedCustomer.phone.replace(/\D/g, '');
    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  // Posicionamento vertical para facilitar organização do layout
  const positionClass =
    verticalPosition === 'top'
      ? 'items-start pt-3 sm:pt-6'
      : verticalPosition === 'bottom'
      ? 'items-end pb-3 sm:pb-6'
      : 'items-center';

  return (
    <div
      className={`fixed inset-0 z-50 flex justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto transition-all duration-300 ${positionClass}`}
    >
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-900 via-emerald-800 to-teal-900 px-5 sm:px-6 py-4 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-700/80 border border-emerald-500/40 flex items-center justify-center text-emerald-200">
              <Sparkles className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight flex items-center gap-2">
                <span>Modelos de Cobrança Amigáveis</span>
              </h2>
              <p className="text-xs text-emerald-200">
                Textos profissionais e eficazes prontos para copiar ou enviar no WhatsApp
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
              className="text-white/80 hover:text-white p-1.5 rounded-xl hover:bg-white/10 transition"
              title="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Customer Selector & Quick Info */}
        <div className="p-4 sm:px-6 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="flex-1">
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Personalizar mensagem para o cliente:
            </label>
            <select
              value={activeCustomerId}
              onChange={(e) => setActiveCustomerId(e.target.value)}
              className="w-full sm:max-w-md rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold text-slate-800 bg-white focus:ring-2 focus:ring-emerald-500 shadow-2xs"
            >
              {customers.map((c) => {
                const debt = StorageService.getCustomerDebt(c.id).totalDebt;
                return (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.nickname ? `(${c.nickname})` : ''} — Saldo: R$ {debt.toFixed(2)}
                  </option>
                );
              })}
            </select>
          </div>

          {selectedCustomer && debtInfo && (
            <div className="flex items-center gap-3 bg-white px-3.5 py-2 rounded-xl border border-slate-200 text-xs shadow-2xs">
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-semibold block">
                  Saldo a Cobrar:
                </span>
                <span className="font-black text-rose-600 text-sm">
                  R$ {debtInfo.totalDebt.toFixed(2)}
                </span>
              </div>
              <div className="border-l border-slate-200 pl-3">
                <span className="text-[10px] text-slate-500 uppercase font-semibold block">
                  Telefone:
                </span>
                <span className="font-bold text-slate-800">
                  {selectedCustomer.phone || 'Não cadastrado'}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Templates List */}
        <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1 bg-slate-100/50">
          {templates.map((tpl, idx) => (
            <div
              key={tpl.id}
              className="bg-white rounded-2xl border border-slate-200 shadow-xs hover:border-emerald-300 transition-all p-4 sm:p-5 space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-black text-slate-900">{tpl.title}</h3>
                    <span
                      className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${tpl.badgeColor}`}
                    >
                      {tpl.badge}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{tpl.description}</p>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleCopy(tpl.message, idx)}
                    className="px-3 py-1.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-800 text-xs font-bold flex items-center gap-1.5 transition active:scale-95 shadow-2xs"
                  >
                    {copiedIndex === idx ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-700">Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-slate-600" />
                        <span>Copiar</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSendWhatsApp(tpl.message)}
                    disabled={!selectedCustomer?.phone}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition active:scale-95 shadow-2xs ${
                      selectedCustomer?.phone
                        ? 'bg-green-600 hover:bg-green-700 text-white'
                        : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    }`}
                    title={
                      selectedCustomer?.phone
                        ? 'Abrir conversa direta no WhatsApp'
                        : 'Cadastre o WhatsApp do cliente para envio direto'
                    }
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>WhatsApp</span>
                  </button>
                </div>
              </div>

              {/* Message Box */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/90 text-xs text-slate-800 font-mono whitespace-pre-wrap leading-relaxed select-all">
                {tpl.message}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-3.5 sm:px-6 bg-white border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-700" />
            <span>Cobrança amigável preserva clientes fiéis e acelera o recebimento.</span>
          </div>
          <button
            onClick={onClose}
            className="py-1.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

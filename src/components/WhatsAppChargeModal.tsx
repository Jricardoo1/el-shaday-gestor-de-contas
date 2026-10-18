import React, { useState } from 'react';
import { X, Send, Copy, Check, MessageSquare, Phone, Calendar, DollarSign, Store, ArrowUp, ArrowDown, Sparkles } from 'lucide-react';
import { Customer, FiadoEntry, PaymentRecord, StoreSettings } from '../types';
import { StorageService } from '../services/storage';

type MessageType = 'friendly_reminder' | 'overdue' | 'purchase_receipt' | 'payment_receipt' | 'full_statement';

interface WhatsAppChargeModalProps {
  customer: Customer;
  settings: StoreSettings;
  preSelectedEntry?: FiadoEntry | null;
  lastPayment?: PaymentRecord | null;
  onClose: () => void;
  onOpenCollectionSuggestions?: () => void;
}

export const WhatsAppChargeModal: React.FC<WhatsAppChargeModalProps> = ({
  customer,
  settings,
  preSelectedEntry,
  lastPayment,
  onClose,
  onOpenCollectionSuggestions,
}) => {
  const [copied, setCopied] = useState(false);
  const [verticalPosition, setVerticalPosition] = useState<'top' | 'center' | 'bottom'>('center');
  const debtInfo = StorageService.getCustomerDebt(customer.id);
  const totalDebt = debtInfo.totalDebt;
  const storeName = settings.storeName || 'Nossa Loja';
  const pixKey = settings.pixKey ? `Chave PIX: ${settings.pixKey}` : '';

  // Determine initial template
  let initialTemplate: MessageType = 'friendly_reminder';

  if (lastPayment) {
    initialTemplate = 'payment_receipt';
  } else if (preSelectedEntry) {
    if (preSelectedEntry.status === 'overdue') {
      initialTemplate = 'overdue';
    } else {
      initialTemplate = 'purchase_receipt';
    }
  } else if (debtInfo.overdueCount > 0) {
    initialTemplate = 'overdue';
  }

  const [template, setTemplate] = useState<MessageType>(initialTemplate);

  // Generate customized message text based on template
  const generateMessage = () => {
    const greetingName = customer.nickname || customer.name.split(' ')[0];

    switch (template) {
      case 'friendly_reminder': {
        const amountStr = `R$ ${totalDebt.toFixed(2)}`;
        const nearestEntry = preSelectedEntry || debtInfo.entries.find((e) => e.status !== 'paid');
        const dueText = nearestEntry
          ? `com vencimento para *${new Date(nearestEntry.dueDate + 'T12:00:00').toLocaleDateString('pt-BR')}*`
          : 'com vencimento próximo';
        const itemsText = nearestEntry?.description ? `\n🍱 *Consumo:* ${nearestEntry.description}` : '';

        return `Olá ${greetingName}, tudo bem com você? 😊\n\nPassando apenas para lembrar com carinho que o consumo na sua conta aqui na *${storeName}* (${dueText}) está no valor de *${amountStr}*.${itemsText}\n\n${
          pixKey ? `Se preferir acertar no PIX sem precisar vir ao balcão:\n👉 *${pixKey}*\n\n` : ''
        }Agradecemos muito pela sua preferência de sempre! Um abraço e bom almoço.`;
      }

      case 'overdue': {
        const amountStr = `R$ ${totalDebt.toFixed(2)}`;
        return `Olá ${greetingName}, tudo bem com você? Esperamos que sim! 🙏\n\nEstamos revisando os lançamentos da sua conta na *${storeName}* e vimos que o saldo a prazo no valor de *${amountStr}* já passou da data combinada de vencimento.\n\nQuando você puder passar aqui no balcão para acertar ou mandar pelo PIX, ficamos muito gratos!\n${
          pixKey ? `👉 *${pixKey}*\n\n` : ''
        }Caso já tenha acertado, por favor desconsidere. Obrigado pela atenção!`;
      }

      case 'purchase_receipt': {
        const item = preSelectedEntry || debtInfo.entries[0];
        const val = item ? item.amount.toFixed(2) : totalDebt.toFixed(2);
        const desc = item?.description ? `\n🍱 *Itens:* ${item.description}` : '';
        const due = item?.dueDate
          ? new Date(item.dueDate + 'T12:00:00').toLocaleDateString('pt-BR')
          : 'a combinar';

        return `Olá ${greetingName}! Registramos seu consumo a prazo aqui na *${storeName}*:\n\n💰 *Valor: R$ ${val}*${desc}\n📅 *Vencimento combinado:* ${due}\n📊 *Saldo total da conta:* R$ ${totalDebt.toFixed(
          2
        )}\n\nAgradecemos muito pela preferência!`;
      }

      case 'payment_receipt': {
        const paidVal = lastPayment ? lastPayment.amount.toFixed(2) : '0,00';
        const remainingVal = totalDebt.toFixed(2);
        const isSettled = totalDebt <= 0.01;

        return `Olá ${greetingName}! Confirmamos o recebimento do seu pagamento aqui na *${storeName}*: ✅\n\n💵 *Valor Pago:* R$ ${paidVal}\n${
          isSettled
            ? '🎉 *Status:* Conta 100% quitada! Seu saldo agora é R$ 0,00.'
            : `📊 *Saldo restante da conta:* R$ ${remainingVal}`
        }\n\nMuito obrigado pela pontualidade e preferência de sempre! Conte conosco.`;
      }

      case 'full_statement': {
        const lines = debtInfo.entries
          .map((e) => {
            const dateStr = new Date(e.date + 'T12:00:00').toLocaleDateString('pt-BR');
            const remaining = (e.amount - e.paidAmount).toFixed(2);
            return `• ${dateStr}: ${e.description} - R$ ${e.amount.toFixed(2)} (Resta: R$ ${remaining})`;
          })
          .join('\n');

        return `📄 *Extrato da Conta Cliente - ${storeName}*\nCliente: *${customer.name}*\n\n${lines}\n\n━━━━━━━━━━━━━━\n💰 *Total em Aberto: R$ ${totalDebt.toFixed(
          2
        )}*\n${pixKey ? `👉 *${pixKey}*\n` : ''}\nQualquer dúvida, estamos à disposição!`;
      }
    }
  };

  const messageText = generateMessage();

  // Build direct WhatsApp API link
  let cleanPhone = (customer.phone || '').replace(/\D/g, '');
  if (cleanPhone && !cleanPhone.startsWith('55') && cleanPhone.length >= 10) {
    cleanPhone = '55' + cleanPhone;
  }
  const whatsappUrl = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(
    messageText
  )}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(messageText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenWhatsApp = () => {
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
  };

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
            <MessageSquare className="w-5 h-5 text-emerald-300" />
            <div>
              <h2 className="text-base font-bold">Enviar Mensagem WhatsApp</h2>
              <p className="text-xs text-emerald-200">
                Cobrança amigável ou comprovante para {customer.name}
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

        <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Sugestões de Cobrança Amigáveis Atalho */}
          {onOpenCollectionSuggestions && (
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 flex items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 text-amber-900 font-medium">
                <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Quer textos pré-formatados comprovados?</span>
              </div>
              <button
                type="button"
                onClick={onOpenCollectionSuggestions}
                className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-xs transition shadow-2xs whitespace-nowrap cursor-pointer"
              >
                3 Modelos de Cobrança
              </button>
            </div>
          )}
          {/* Templates Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">
              Escolha o Tipo de Mensagem:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setTemplate('friendly_reminder')}
                className={`p-2 rounded-xl border text-xs font-semibold text-left transition ${
                  template === 'friendly_reminder'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-900 shadow-xs'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                😊 Lembrete Amigável
              </button>

              <button
                type="button"
                onClick={() => setTemplate('overdue')}
                className={`p-2 rounded-xl border text-xs font-semibold text-left transition ${
                  template === 'overdue'
                    ? 'border-rose-600 bg-rose-50 text-rose-900 shadow-xs'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                ⚠️ Cobrança Atrasada
              </button>

              <button
                type="button"
                onClick={() => setTemplate('payment_receipt')}
                className={`p-2 rounded-xl border text-xs font-semibold text-left transition ${
                  template === 'payment_receipt'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-900 shadow-xs'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                🧾 Recibo Pagamento
              </button>

              <button
                type="button"
                onClick={() => setTemplate('purchase_receipt')}
                className={`p-2 rounded-xl border text-xs font-semibold text-left transition ${
                  template === 'purchase_receipt'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-900 shadow-xs'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                🍱 Recibo de Consumo
              </button>

              <button
                type="button"
                onClick={() => setTemplate('full_statement')}
                className={`p-2 rounded-xl border text-xs font-semibold text-left transition ${
                  template === 'full_statement'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-900 shadow-xs'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                📋 Extrato da Conta
              </button>
            </div>
          </div>

          {/* Client phone indicator */}
          <div className="flex items-center justify-between text-xs px-3 py-2 bg-slate-50 rounded-xl border border-slate-200 text-slate-600">
            <div className="flex items-center gap-2">
              <Phone className="w-3.5 h-3.5 text-emerald-600" />
              <span>
                WhatsApp:{' '}
                <strong>{customer.phone || 'Telefone não cadastrado'}</strong>
              </span>
            </div>
            <span className="font-bold text-slate-800">
              Saldo: R$ {totalDebt.toFixed(2)}
            </span>
          </div>

          {/* Message Preview Box */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-700">
                Prévia da Mensagem (formatada com emojis e negrito)
              </label>
              <button
                onClick={handleCopy}
                className="text-xs text-slate-600 hover:text-emerald-700 flex items-center gap-1 font-semibold"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Copiada!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copiar Texto</span>
                  </>
                )}
              </button>
            </div>

            <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200 text-xs text-slate-800 whitespace-pre-wrap font-sans leading-relaxed shadow-inner">
              {messageText}
            </div>
          </div>

          {/* Actions */}
          <div className="pt-2 flex flex-col sm:flex-row items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition"
            >
              Fechar
            </button>

            <button
              type="button"
              onClick={handleCopy}
              className="w-full sm:flex-1 py-2.5 px-3 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-800 text-xs font-semibold flex items-center justify-center gap-2 transition"
            >
              <Copy className="w-4 h-4" />
              <span>Copiar Mensagem</span>
            </button>

            <button
              type="button"
              onClick={handleOpenWhatsApp}
              className="w-full sm:flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md flex items-center justify-center gap-2 transition"
            >
              <Send className="w-4 h-4" />
              <span>Abrir WhatsApp</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

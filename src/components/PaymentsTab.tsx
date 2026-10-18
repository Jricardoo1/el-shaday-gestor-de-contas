import React, { useState } from 'react';
import {
  DollarSign,
  Search,
  Plus,
  Send,
  Calendar,
  Banknote,
  QrCode,
  CreditCard,
  CheckCircle2,
  FileText,
} from 'lucide-react';
import { Customer, PaymentRecord, StoreSettings } from '../types';
import { getRelativeDateString } from '../services/storage';

interface PaymentsTabProps {
  payments: PaymentRecord[];
  customers: Customer[];
  settings: StoreSettings;
  onNewPayment: () => void;
  onOpenWhatsAppReceipt: (customer: Customer, payment: PaymentRecord) => void;
  onOpenReceipt: (customer: Customer, payment: PaymentRecord) => void;
  onSelectCustomer: (customer: Customer) => void;
}

export const PaymentsTab: React.FC<PaymentsTabProps> = ({
  payments,
  customers,
  settings,
  onNewPayment,
  onOpenWhatsAppReceipt,
  onOpenReceipt,
  onSelectCustomer,
}) => {
  const [search, setSearch] = useState('');
  const todayStr = getRelativeDateString(0);

  // Search filter
  const filteredPayments = payments.filter((p) => {
    const customer = customers.find((c) => c.id === p.customerId);
    const q = search.toLowerCase();
    return (
      (customer && customer.name.toLowerCase().includes(q)) ||
      (customer?.nickname && customer.nickname.toLowerCase().includes(q)) ||
      p.receiptNumber.toLowerCase().includes(q) ||
      (p.notes && p.notes.toLowerCase().includes(q))
    );
  });

  // Calculate metrics
  const totalReceived = payments.reduce((acc, p) => acc + p.amount, 0);
  const totalReceivedToday = payments
    .filter((p) => p.date === todayStr)
    .reduce((acc, p) => acc + p.amount, 0);

  return (
    <div className="space-y-4">
      {/* Top summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-bold uppercase tracking-wider block">
              Recebido Hoje
            </span>
            <span className="text-2xl font-black text-emerald-700">
              R$ {totalReceivedToday.toFixed(2)}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-bold uppercase tracking-wider block">
              Total Histórico Recebido
            </span>
            <span className="text-2xl font-black text-slate-800">
              R$ {totalReceived.toFixed(2)}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Search and Action Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Buscar pagamento por cliente ou recibo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 bg-slate-50/50"
          />
        </div>
        <button
          onClick={onNewPayment}
          className="flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs sm:text-sm font-bold px-3.5 py-2.5 rounded-xl shadow-xs transition active:scale-95 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Receber Pagamento</span>
          <span className="sm:hidden">Receber</span>
        </button>
      </div>

      {/* Payment items list */}
      <div className="space-y-2.5">
        {filteredPayments.length === 0 ? (
          <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-400 space-y-3">
            <DollarSign className="w-12 h-12 mx-auto text-slate-300" />
            <p className="text-sm font-bold text-slate-700">Nenhum pagamento encontrado</p>
            <p className="text-xs text-slate-500">
              Quando seus clientes pagarem ou abaterem dívidas, elas aparecerão aqui.
            </p>
          </div>
        ) : (
          filteredPayments.map((p) => {
            const customer = customers.find((c) => c.id === p.customerId);

            return (
              <div
                key={p.id}
                onClick={() => customer && onOpenReceipt(customer, p)}
                title="Clique para abrir o comprovante e extrato detalhado deste pagamento"
                className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex items-center justify-between gap-3 hover:border-emerald-500 hover:shadow-md transition cursor-pointer active:scale-99"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center justify-center font-bold text-xs shrink-0">
                    {p.method === 'pix' ? (
                      <QrCode className="w-5 h-5 text-emerald-700" />
                    ) : p.method === 'cash' ? (
                      <Banknote className="w-5 h-5 text-emerald-700" />
                    ) : (
                      <CreditCard className="w-5 h-5 text-emerald-700" />
                    )}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      {customer ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectCustomer(customer);
                          }}
                          title="Ver ficha completa do cliente"
                          className="text-sm font-bold text-slate-900 hover:text-emerald-700 transition underline-offset-2 hover:underline"
                        >
                          {customer.name}
                        </button>
                      ) : (
                        <span className="text-sm font-bold text-slate-900">Cliente</span>
                      )}
                      <span className="text-[10px] font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-semibold">
                        {p.receiptNumber}
                      </span>
                    </div>

                    <p className="text-xs text-slate-500 mt-0.5">
                      {new Date(p.date + 'T12:00:00').toLocaleDateString('pt-BR')} via{' '}
                      <strong>
                        {p.method === 'pix'
                          ? 'PIX'
                          : p.method === 'cash'
                          ? 'Dinheiro em espécie'
                          : 'Cartão'}
                      </strong>
                      {p.notes ? ` • ${p.notes}` : ''}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="text-right">
                    <span className="text-base font-black text-emerald-700">
                      + R$ {p.amount.toFixed(2)}
                    </span>
                    <span className="block text-[10px] text-emerald-600 font-semibold uppercase">
                      Confirmado
                    </span>
                  </div>

                  {customer && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenReceipt(customer, p);
                      }}
                      title="Abrir comprovante / extrato detalhado para impressão"
                      className="py-1.5 px-2.5 rounded-xl bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200 text-xs font-bold flex items-center gap-1 transition"
                    >
                      <FileText className="w-3.5 h-3.5 text-emerald-700" />
                      <span className="hidden sm:inline">Ver Extrato</span>
                    </button>
                  )}

                  {customer && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenWhatsAppReceipt(customer, p);
                      }}
                      title="Reenviar recibo por WhatsApp"
                      className="p-2 rounded-xl bg-green-50 text-green-700 hover:bg-green-100 transition"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

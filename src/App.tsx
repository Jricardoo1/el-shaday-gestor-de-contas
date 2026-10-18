/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Customer, FiadoEntry, PaymentRecord, StoreSettings, LicenseState, UserAccount } from './types';
import { StorageService } from './services/storage';
import { AuthService } from './services/auth';
import { Header } from './components/Header';
import { Navigation, NavTab } from './components/Navigation';
import { OfflineIndicator } from './components/OfflineIndicator';
import { HomeTab } from './components/HomeTab';
import { CustomersTab } from './components/CustomersTab';
import { FiadosTab } from './components/FiadosTab';
import { PaymentsTab } from './components/PaymentsTab';
import { ReportsTab } from './components/ReportsTab';
import { CustomerModal } from './components/CustomerModal';
import { NewFiadoModal } from './components/NewFiadoModal';
import { NewPaymentModal } from './components/NewPaymentModal';
import { CustomerDetailModal } from './components/CustomerDetailModal';
import { WhatsAppChargeModal } from './components/WhatsAppChargeModal';
import { ReceiptModal } from './components/ReceiptModal';
import { SettingsModal } from './components/SettingsModal';
import { LicenseModal } from './components/LicenseModal';
import { AdminPanelModal } from './components/AdminPanelModal';
import { BackupReminderBanner } from './components/BackupReminderBanner';
import { WhatsAppBroadcastModal } from './components/WhatsAppBroadcastModal';
import { PrepaidCreditModal } from './components/PrepaidCreditModal';
import { CollectionSuggestionsModal } from './components/CollectionSuggestionsModal';
import { CloudDatabaseModal } from './components/CloudDatabaseModal';
import { AuthModal } from './components/AuthModal';
import { UserAccountModal } from './components/UserAccountModal';
import confetti from 'canvas-confetti';

export default function App() {
  // User Authentication State
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(() => AuthService.getCurrentUser());
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login');
  const [isUserAccountModalOpen, setIsUserAccountModalOpen] = useState(false);

  // Main Data States loaded from StorageService (LocalStorage / Offline first)
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [entries, setEntries] = useState<FiadoEntry[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [settings, setSettings] = useState<StoreSettings>(StorageService.getStoreSettings());
  const [license, setLicense] = useState<LicenseState>(StorageService.getLicense());
  const [currentTab, setCurrentTab] = useState<NavTab>('inicio');
  const [returnActionAfterCustomerSave, setReturnActionAfterCustomerSave] = useState<
    'fiado' | 'payment' | 'credit' | null
  >(null);

  // Modals state
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  const [isNewFiadoOpen, setIsNewFiadoOpen] = useState(false);
  const [selectedCustomerIdForFiado, setSelectedCustomerIdForFiado] = useState<string | undefined>();

  const [isNewPaymentOpen, setIsNewPaymentOpen] = useState(false);
  const [selectedCustomerIdForPayment, setSelectedCustomerIdForPayment] = useState<string | undefined>();

  const [selectedCustomerDetail, setSelectedCustomerDetail] = useState<Customer | null>(null);

  const [whatsAppData, setWhatsAppData] = useState<{
    customer: Customer;
    entry?: FiadoEntry | null;
    payment?: PaymentRecord | null;
  } | null>(null);

  const [receiptData, setReceiptData] = useState<{
    customer: Customer;
    entry?: FiadoEntry | null;
    payment?: PaymentRecord | null;
  } | null>(null);

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isLicenseOpen, setIsLicenseOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isBroadcastOpen, setIsBroadcastOpen] = useState(false);
  const [isPrepaidCreditOpen, setIsPrepaidCreditOpen] = useState(false);
  const [selectedCustomerIdForCredit, setSelectedCustomerIdForCredit] = useState<string | undefined>();
  const [isCollectionSuggestionsOpen, setIsCollectionSuggestionsOpen] = useState(false);
  const [collectionSuggestionsCustomer, setCollectionSuggestionsCustomer] = useState<Customer | undefined>();
  const [isCloudDatabaseOpen, setIsCloudDatabaseOpen] = useState(false);

  // Load and refresh state
  const reloadData = () => {
    setCustomers(StorageService.getCustomers());
    setEntries(StorageService.getFiadoEntries());
    setPayments(StorageService.getPayments());
    setSettings(StorageService.getStoreSettings());
    setLicense(StorageService.getLicense());
  };

  useEffect(() => {
    reloadData();
    // Subscribe to authentication changes (login, logout, account switch)
    const unsub = AuthService.onAuthChange((user) => {
      setCurrentUser(user);
      reloadData();
      if (user) {
        StorageService.syncWithCloud()
          .then(() => {
            reloadData();
          })
          .catch((err) => {
            console.warn('Sincronização em nuvem da conta:', err);
          });
      }
    });

    return () => {
      unsub();
    };
  }, []);

  // Helper to ensure all open modals are closed before opening a new one
  const closeAllModals = () => {
    setIsCustomerModalOpen(false);
    setEditingCustomer(null);
    setIsNewFiadoOpen(false);
    setSelectedCustomerIdForFiado(undefined);
    setIsNewPaymentOpen(false);
    setSelectedCustomerIdForPayment(undefined);
    setSelectedCustomerDetail(null);
    setWhatsAppData(null);
    setReceiptData(null);
    setIsSettingsOpen(false);
    setIsLicenseOpen(false);
    setIsAdminOpen(false);
    setIsBroadcastOpen(false);
    setIsPrepaidCreditOpen(false);
    setSelectedCustomerIdForCredit(undefined);
    setIsCollectionSuggestionsOpen(false);
    setCollectionSuggestionsCustomer(undefined);
    setIsCloudDatabaseOpen(false);
    setIsAuthModalOpen(false);
    setIsUserAccountModalOpen(false);
  };

  const handleOpenLogin = (mode: 'login' | 'register' = 'login') => {
    closeAllModals();
    setAuthModalMode(mode);
    setIsAuthModalOpen(true);
  };

  const handleOpenUserAccount = () => {
    closeAllModals();
    setIsUserAccountModalOpen(true);
  };

  const handleLogout = () => {
    AuthService.logout();
    setCurrentUser(null);
    closeAllModals();
    reloadData();
    setAuthModalMode('login');
    setIsAuthModalOpen(true);
  };

  const handleLoginSuccess = (user: UserAccount) => {
    setCurrentUser(user);
    setIsAuthModalOpen(false);
    reloadData();
    StorageService.syncWithCloud()
      .then(() => reloadData())
      .catch((err) => console.warn('Erro ao sincronizar após login:', err));
  };

  const handleOpenCustomerModal = (customer: Customer | null = null) => {
    closeAllModals();
    setEditingCustomer(customer);
    setIsCustomerModalOpen(true);
  };

  const handleOpenNewFiado = (customerId?: string) => {
    closeAllModals();
    setSelectedCustomerIdForFiado(customerId);
    setIsNewFiadoOpen(true);
  };

  const handleOpenNewPayment = (customerId?: string) => {
    closeAllModals();
    setSelectedCustomerIdForPayment(customerId);
    setIsNewPaymentOpen(true);
  };

  const handleOpenPrepaidCredit = (customerId?: string) => {
    closeAllModals();
    setSelectedCustomerIdForCredit(customerId);
    setIsPrepaidCreditOpen(true);
  };

  const handleOpenCustomerDetail = (customer: Customer) => {
    closeAllModals();
    setSelectedCustomerDetail(customer);
  };

  const handleOpenWhatsApp = (customer: Customer, entry?: FiadoEntry | null, payment?: PaymentRecord | null) => {
    closeAllModals();
    setWhatsAppData({ customer, entry, payment });
  };

  const handleOpenReceipt = (customer: Customer, payment?: PaymentRecord | null, entry?: FiadoEntry | null) => {
    closeAllModals();
    setReceiptData({ customer, payment, entry });
  };

  const handleOpenSettings = () => {
    closeAllModals();
    setIsSettingsOpen(true);
  };

  const handleOpenLicense = () => {
    closeAllModals();
    setIsLicenseOpen(true);
  };

  const handleOpenAdmin = () => {
    closeAllModals();
    setIsAdminOpen(true);
  };

  const handleOpenBroadcast = () => {
    closeAllModals();
    setIsBroadcastOpen(true);
  };

  const handleOpenCollectionSuggestions = (customer?: Customer) => {
    closeAllModals();
    setCollectionSuggestionsCustomer(customer);
    setIsCollectionSuggestionsOpen(true);
  };

  const handleOpenCloudDatabase = () => {
    closeAllModals();
    setIsCloudDatabaseOpen(true);
  };

  // Counts for tabs
  const pendingCount = entries.filter((e) => e.status !== 'paid').length;
  const overdueCount = entries.filter((e) => e.status === 'overdue').length;

  // Handlers for Customers
  const handleSaveCustomer = (customer: Customer) => {
    const updated = StorageService.saveCustomer(customer);
    setCustomers(updated);
    setIsCustomerModalOpen(false);

    const wasEditing = editingCustomer?.id === customer.id;
    setEditingCustomer(null);

    // If was editing an existing customer from customer detail, return to customer detail
    if (wasEditing) {
      handleOpenCustomerDetail(customer);
      return;
    }

    // If customer was created from fiado/payment/credit, route directly to that modal
    if (returnActionAfterCustomerSave === 'fiado') {
      setReturnActionAfterCustomerSave(null);
      handleOpenNewFiado(customer.id);
    } else if (returnActionAfterCustomerSave === 'payment') {
      setReturnActionAfterCustomerSave(null);
      handleOpenNewPayment(customer.id);
    } else if (returnActionAfterCustomerSave === 'credit') {
      setReturnActionAfterCustomerSave(null);
      handleOpenPrepaidCredit(customer.id);
    }
  };

  const handleDeleteCustomer = (id: string) => {
    const result = StorageService.deleteCustomer(id);
    setCustomers(result.customers);
    setEntries(result.entries);
    setPayments(StorageService.getPayments());
    if (selectedCustomerDetail?.id === id) {
      setSelectedCustomerDetail(null);
    }
  };

  // Handlers for Fiado
  const handleSaveFiado = (entry: FiadoEntry, openWhatsAppReceipt = false) => {
    const updatedEntries = StorageService.saveFiadoEntry(entry);
    setEntries(updatedEntries);

    const customer = customers.find((c) => c.id === entry.customerId);
    if (customer && openWhatsAppReceipt) {
      closeAllModals();
      setReceiptData({ customer, entry });
    }
  };

  const handleDeleteEntry = (entryId: string) => {
    const updated = StorageService.deleteFiadoEntry(entryId);
    setEntries(updated);
  };

  // Handlers for Payments
  const handleSavePayment = (payment: PaymentRecord, openWhatsAppReceipt = false) => {
    const result = StorageService.addPayment(payment);
    setPayments(result.payments);
    setEntries(result.entries);

    // Confetti celebration for money received in register!
    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.7 },
    });

    const customer = customers.find((c) => c.id === payment.customerId);
    if (customer && openWhatsAppReceipt) {
      closeAllModals();
      setReceiptData({ customer, payment });
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans pb-16 sm:pb-8">
      {/* Offline Alert Badge (PWA) */}
      <OfflineIndicator />

      {/* Header */}
      <Header
        settings={settings}
        license={license}
        user={currentUser}
        onOpenNewFiado={() => handleOpenNewFiado(undefined)}
        onOpenNewPayment={() => handleOpenNewPayment(undefined)}
        onOpenPrepaidCredit={() => handleOpenPrepaidCredit(undefined)}
        onOpenSettings={handleOpenSettings}
        onOpenLicense={handleOpenLicense}
        onOpenAdmin={handleOpenAdmin}
        onOpenBroadcast={handleOpenBroadcast}
        onOpenCloudDatabase={handleOpenCloudDatabase}
        onOpenUserAccount={handleOpenUserAccount}
        onOpenLogin={() => handleOpenLogin('login')}
      />

      {/* Demo Account Alert / Call to Action Banner */}
      {currentUser?.id === 'usr_demo_principal' && (
        <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-slate-950 px-3 sm:px-4 py-2 text-xs font-bold shadow-xs border-b border-amber-600/30">
          <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <span className="bg-slate-950 text-amber-300 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0 shadow-xs">
                Modo Demonstração
              </span>
              <span>
                Você está navegando como <strong>{currentUser.storeName}</strong>. Deseja salvar seus próprios clientes e fiados na nuvem individualmente?
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => handleOpenLogin('register')}
                className="px-3 py-1 bg-slate-950 hover:bg-slate-900 text-white rounded-lg text-xs font-black transition cursor-pointer shadow-xs active:scale-95"
              >
                Criar Minha Conta Grátis
              </button>
              <button
                type="button"
                onClick={() => handleOpenLogin('login')}
                className="px-2.5 py-1 bg-white/90 hover:bg-white text-slate-950 rounded-lg text-xs font-bold transition cursor-pointer active:scale-95 shadow-xs"
              >
                Entrar com Outro Login
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <Navigation
        currentTab={currentTab}
        onSelectTab={(tab) => {
          closeAllModals();
          if (tab === 'licenca') {
            handleOpenLicense();
          } else {
            setCurrentTab(tab);
          }
        }}
        pendingCount={pendingCount}
        overdueCount={overdueCount}
        license={license}
      />

      {/* Lembrete de Backup Periódico Manual */}
      <BackupReminderBanner
        settings={settings}
        onOpenSettings={handleOpenSettings}
        onUpdateSettings={(updated) => setSettings(updated)}
      />

      {/* Main Content View */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-3 sm:px-4 py-4 sm:py-6">
        {currentTab === 'inicio' && (
          <HomeTab
            customers={customers}
            entries={entries}
            payments={payments}
            settings={settings}
            onNewFiado={() => handleOpenNewFiado(undefined)}
            onNewPayment={() => handleOpenNewPayment(undefined)}
            onNewPrepaidCredit={() => handleOpenPrepaidCredit(undefined)}
            onNewCustomer={() => {
              setReturnActionAfterCustomerSave(null);
              handleOpenCustomerModal(null);
            }}
            onOpenBroadcast={handleOpenBroadcast}
            onSelectCustomer={(c) => handleOpenCustomerDetail(c)}
            onSelectTab={(tab) => {
              closeAllModals();
              if (tab === 'licenca') {
                handleOpenLicense();
              } else {
                setCurrentTab(tab);
              }
            }}
            onOpenWhatsApp={(c, e) => handleOpenWhatsApp(c, e)}
            onOpenCollectionSuggestions={(c) => handleOpenCollectionSuggestions(c)}
          />
        )}

        {currentTab === 'clientes' && (
          <CustomersTab
            customers={customers}
            settings={settings}
            onSelectCustomer={(c) => handleOpenCustomerDetail(c)}
            onNewCustomer={() => {
              setReturnActionAfterCustomerSave(null);
              handleOpenCustomerModal(null);
            }}
            onNewFiado={(cId) => handleOpenNewFiado(cId)}
            onNewPayment={(cId) => handleOpenNewPayment(cId)}
            onOpenWhatsApp={(c) => handleOpenWhatsApp(c)}
            onOpenBroadcast={handleOpenBroadcast}
            onNewPrepaidCredit={(cId) => handleOpenPrepaidCredit(cId)}
          />
        )}

        {currentTab === 'fiados' && (
          <FiadosTab
            entries={entries}
            customers={customers}
            settings={settings}
            onNewFiado={() => handleOpenNewFiado(undefined)}
            onNewPayment={(cId) => handleOpenNewPayment(cId)}
            onOpenWhatsApp={(c, e) => handleOpenWhatsApp(c, e)}
            onDeleteEntry={handleDeleteEntry}
            onSelectCustomer={(c) => handleOpenCustomerDetail(c)}
          />
        )}

        {currentTab === 'pagamentos' && (
          <PaymentsTab
            payments={payments}
            customers={customers}
            settings={settings}
            onNewPayment={() => handleOpenNewPayment(undefined)}
            onOpenWhatsAppReceipt={(c, p) => handleOpenWhatsApp(c, null, p)}
            onOpenReceipt={(c, p) => handleOpenReceipt(c, p, null)}
            onSelectCustomer={(c) => handleOpenCustomerDetail(c)}
          />
        )}

        {currentTab === 'relatorio' && (
          <ReportsTab
            customers={customers}
            entries={entries}
            payments={payments}
            settings={settings}
            onOpenWhatsApp={(c) => handleOpenWhatsApp(c)}
            onSelectCustomer={(c) => handleOpenCustomerDetail(c)}
          />
        )}
      </main>

      {/* Modals */}
      {/* 1. Customer Modal (Add/Edit) */}
      {isCustomerModalOpen && (
        <CustomerModal
          customer={editingCustomer}
          products={settings.products}
          onClose={() => {
            setIsCustomerModalOpen(false);
            setEditingCustomer(null);
          }}
          onSave={handleSaveCustomer}
        />
      )}

      {/* 2. New Fiado Entry Modal */}
      {isNewFiadoOpen && (
        <NewFiadoModal
          customers={customers}
          selectedCustomerId={selectedCustomerIdForFiado}
          defaultDueDays={settings.defaultDueDays || 15}
          products={settings.products}
          onClose={() => setIsNewFiadoOpen(false)}
          onSave={handleSaveFiado}
          onOpenNewCustomer={() => {
            setReturnActionAfterCustomerSave('fiado');
            handleOpenCustomerModal(null);
          }}
        />
      )}

      {/* 3. New Payment Modal */}
      {isNewPaymentOpen && (
        <NewPaymentModal
          customers={customers}
          selectedCustomerId={selectedCustomerIdForPayment}
          onClose={() => setIsNewPaymentOpen(false)}
          onSavePayment={handleSavePayment}
          onOpenNewCustomer={() => {
            setReturnActionAfterCustomerSave('payment');
            handleOpenCustomerModal(null);
          }}
        />
      )}

      {/* 4. Customer Detail / Full Ledger Modal */}
      {selectedCustomerDetail && (
        <CustomerDetailModal
          customer={selectedCustomerDetail}
          settings={settings}
          onClose={() => setSelectedCustomerDetail(null)}
          onEditCustomer={(c) => handleOpenCustomerModal(c)}
          onDeleteCustomer={handleDeleteCustomer}
          onNewFiado={(cId) => handleOpenNewFiado(cId)}
          onNewPayment={(cId) => handleOpenNewPayment(cId)}
          onOpenWhatsApp={(c, e) => handleOpenWhatsApp(c, e)}
          onDeleteEntry={handleDeleteEntry}
          onUpdateEntry={(entry) => handleSaveFiado(entry, false)}
          onNewPrepaidCredit={(cId) => handleOpenPrepaidCredit(cId)}
          onOpenCollectionSuggestions={(c) => handleOpenCollectionSuggestions(c)}
        />
      )}

      {/* 5. WhatsApp Charge & Share Modal */}
      {whatsAppData && (
        <WhatsAppChargeModal
          customer={whatsAppData.customer}
          settings={settings}
          preSelectedEntry={whatsAppData.entry}
          lastPayment={whatsAppData.payment}
          onClose={() => setWhatsAppData(null)}
          onOpenCollectionSuggestions={() => handleOpenCollectionSuggestions(whatsAppData.customer)}
        />
      )}

      {/* 6. Receipt Thermal Slip Modal */}
      {receiptData && (
        <ReceiptModal
          customer={receiptData.customer}
          settings={settings}
          entry={receiptData.entry}
          payment={receiptData.payment}
          onClose={() => setReceiptData(null)}
          onSendWhatsApp={() => {
            const data = receiptData;
            handleOpenWhatsApp(data.customer, data.entry, data.payment);
          }}
        />
      )}

      {/* 7. Settings Modal */}
      {isSettingsOpen && (
        <SettingsModal
          settings={settings}
          onClose={() => setIsSettingsOpen(false)}
          onSave={(newSettings) => {
            const saved = StorageService.saveStoreSettings(newSettings);
            setSettings(saved);
          }}
          onDataReload={reloadData}
          onOpenAdmin={handleOpenAdmin}
        />
      )}

      {/* 8. License Modal (R$ 9,90/mês, pause, PIX) */}
      {isLicenseOpen && (
        <LicenseModal
          license={license}
          settings={settings}
          onClose={() => setIsLicenseOpen(false)}
          onUpdateLicense={(updated) => setLicense(updated)}
        />
      )}

      {/* 9. Master Admin Panel (SaaS Owner) */}
      {isAdminOpen && (
        <AdminPanelModal
          currentSettings={settings}
          onClose={() => setIsAdminOpen(false)}
          onDataReload={reloadData}
        />
      )}

      {/* 10. WhatsApp Broadcast & Daily Message Modal */}
      {isBroadcastOpen && (
        <WhatsAppBroadcastModal
          customers={customers}
          settings={settings}
          onClose={() => setIsBroadcastOpen(false)}
        />
      )}

      {/* 11. Modal de Crédito Antecipado / Marmitas Pré-Pagas */}
      {isPrepaidCreditOpen && (
        <PrepaidCreditModal
          customers={customers}
          selectedCustomerId={selectedCustomerIdForCredit}
          settings={settings}
          onClose={() => {
            setIsPrepaidCreditOpen(false);
            setSelectedCustomerIdForCredit(undefined);
          }}
          onSaveCredit={handleSavePayment}
          onOpenNewCustomer={() => {
            setReturnActionAfterCustomerSave('credit');
            handleOpenCustomerModal(null);
          }}
        />
      )}

      {/* 12. Modal de Sugestões de Cobrança (3 Modelos Amigáveis) */}
      {isCollectionSuggestionsOpen && (
        <CollectionSuggestionsModal
          customers={customers}
          selectedCustomerId={collectionSuggestionsCustomer?.id}
          settings={settings}
          onClose={() => {
            setIsCollectionSuggestionsOpen(false);
            setCollectionSuggestionsCustomer(undefined);
          }}
        />
      )}

      {/* 13. Modal de Gerenciamento do Banco de Dados Gratuito na Nuvem (Firebase Firestore) */}
      {isCloudDatabaseOpen && (
        <CloudDatabaseModal
          onClose={() => setIsCloudDatabaseOpen(false)}
          onDataReload={reloadData}
        />
      )}

      {/* 14. Modal de Autenticação / Login / Cadastro individual */}
      <AuthModal
        isOpen={isAuthModalOpen || !currentUser}
        canClose={currentUser !== null}
        initialMode={authModalMode}
        onClose={() => setIsAuthModalOpen(false)}
        onLoginSuccess={handleLoginSuccess}
      />

      {/* 15. Modal de Perfil e Gerenciamento de Conta do Usuário */}
      {isUserAccountModalOpen && (
        <UserAccountModal
          user={currentUser}
          onClose={() => setIsUserAccountModalOpen(false)}
          onOpenLogin={() => handleOpenLogin('login')}
          onOpenRegister={() => handleOpenLogin('register')}
          onLogout={handleLogout}
          onDataReload={reloadData}
        />
      )}
    </div>
  );
}

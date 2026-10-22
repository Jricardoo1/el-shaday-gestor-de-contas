import {
  Customer,
  FiadoEntry,
  PaymentRecord,
  StoreSettings,
  LicenseState,
  LicenseHistoryItem,
  MerchantAdminRecord,
  ProductItem,
  UpcomingDueCustomer,
  AdminPixConfig,
} from '../types';
import { LicenseSecurity } from './licenseSecurity';
import { FirebaseService } from './firebase';
import { AuthService } from './auth';

const STORAGE_KEYS = {
  CUSTOMERS: 'fiado_app_customers_v1',
  ENTRIES: 'fiado_app_entries_v1',
  PAYMENTS: 'fiado_app_payments_v1',
  SETTINGS: 'fiado_app_settings_v1',
  LICENSE: 'fiado_app_license_v1',
  ADMIN_MERCHANTS: 'fiado_app_admin_merchants_v1',
  ADMIN_PIX: 'fiado_app_admin_pix_v1',
  DELETED_MERCHANTS: 'fiado_app_deleted_merchants_v1',
};

export const DEFAULT_ADMIN_PIX: AdminPixConfig = {
  adminName: 'JOSÉ RICARDO MARTINS (DESENVOLVEDOR)',
  adminPixKey: 'josericardo.martinscarvalho@gmail.com',
  adminPixKeyType: 'email',
  adminCity: 'SAO PAULO',
  monthlyFee: 9.90,
  whatsappSupport: '5511988887777',
  instructions: 'Chave PIX oficial do Administrador/Desenvolvedor do sistema. O pagamento das mensalidades das lojas é enviado diretamente para este PIX.',
};

// Default seed data for immediate high-fidelity testing (em ordem alfabética)
const INITIAL_CUSTOMERS: Customer[] = [
  {
    id: 'c4',
    name: 'Cláudia Rocha Mendonça',
    nickname: 'Dona Cacau',
    phone: '5511981112233',
    address: 'Rua São José, 405',
    creditLimit: 400,
    notes: 'Almoço da família.',
    customerType: 'individual',
    createdAt: '2026-09-01T16:00:00Z',
  },
  {
    id: 'c3',
    name: 'Marcos Vinicius Santos',
    nickname: 'Marquinho do Gás',
    phone: '5511976543210',
    address: 'Travessa da Paz, 12',
    creditLimit: 300,
    notes: 'Paga sempre via PIX no fim do expediente.',
    customerType: 'individual',
    createdAt: '2026-09-20T08:15:00Z',
  },
  {
    id: 'c5',
    name: 'Metalúrgica Progresso LTDA',
    nickname: 'Fábrica Progresso (Convênio)',
    phone: '5511988880011',
    cnpj: '12.345.678/0001-90',
    address: 'Distrito Industrial, Galpão 4',
    creditLimit: 2500,
    notes: 'Convênio corporativo de marmitas para os funcionários. Fechamento mensal.',
    customerType: 'empresa',
    companyDiscountType: 'fixed_per_marmita',
    companyDiscountPerMarmita: 2.0, // R$ 2,00 de desconto por marmita
    billingCycle: 'monthly',
    createdAt: '2026-09-01T08:00:00Z',
  },
  {
    id: 'c2',
    name: 'Neide Aparecida Silva',
    nickname: 'Dona Neide Costureira',
    phone: '5511991234567',
    address: 'Av. Brasil, 82 - Sobrado amarelo',
    creditLimit: 200,
    notes: 'Cliente muito pontual. Avisar antes por WhatsApp.',
    customerType: 'individual',
    createdAt: '2026-09-15T14:30:00Z',
  },
  {
    id: 'c1',
    name: 'Sebastião Alves',
    nickname: 'Tião da Oficina',
    phone: '5511987654321',
    address: 'Rua das Flores, 140 - Próximo ao posto',
    creditLimit: 300,
    notes: 'Costuma acertar todo dia 10 quando recebe os serviços da oficina.',
    customerType: 'individual',
    createdAt: '2026-09-10T10:00:00Z',
  },
];

// Helper to get formatted date string for today and offsets
export function getRelativeDateString(daysOffset = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  return d.toISOString().split('T')[0];
}

/**
 * Formats a date string (YYYY-MM-DD) with the day of the week in Portuguese.
 * Example: '2026-10-22' -> '22/10 Quinta-Feira'
 */
export function formatDateWithWeekday(dateStr?: string, includeYear = false): string {
  if (!dateStr) return '-';
  const clean = dateStr.slice(0, 10);
  const parts = clean.split('-');
  if (parts.length < 3) return dateStr;
  const [year, month, day] = parts;
  const dateObj = new Date(`${clean}T12:00:00`);
  const weekdays = [
    'Domingo',
    'Segunda-Feira',
    'Terça-Feira',
    'Quarta-Feira',
    'Quinta-Feira',
    'Sexta-Feira',
    'Sábado',
  ];
  const weekday = weekdays[dateObj.getDay()] || '';
  if (includeYear) {
    return `${day}/${month}/${year} ${weekday}`;
  }
  return `${day}/${month} ${weekday}`;
}

export const DEFAULT_PRODUCTS: ProductItem[] = [
  // Marmitex, Pratos e Peso no KG
  { id: 'p_marmita_p', name: 'Marmitex Pequena', category: 'marmitex', price: 16.0, description: 'Porção individual ideal' },
  { id: 'p_marmita_m', name: 'Marmitex Média', category: 'marmitex', price: 20.0, description: 'A mais pedida com 2 carnes' },
  { id: 'p_marmita_g', name: 'Marmitex Grande', category: 'marmitex', price: 25.0, description: 'Marmita reforçada' },
  { id: 'p_prato_feito', name: 'Prato Feito', category: 'marmitex', price: 22.0, description: 'Almoço no prato tradicional' },
  { id: 'p_refeicao_kg', name: 'Preço no KG', category: 'marmitex', price: 59.90, unit: 'kg', description: 'Por peso na balança ou valor em dinheiro' },

  // Bebidas completas solicitadas
  { id: 'p_refri_lata', name: 'Refrigerante Lata', category: 'bebidas', price: 6.0, description: '350ml - Coca-Cola, Guaraná, Fanta' },
  { id: 'p_refri_200ml', name: 'Refrigerante 200ml', category: 'bebidas', price: 3.5, description: 'Caçulinha individual' },
  { id: 'p_refri_600ml', name: 'Refrigerante 600ml', category: 'bebidas', price: 8.0, description: 'Garrafa 600ml' },
  { id: 'p_refri_1l', name: 'Refrigerante 1 Litro', category: 'bebidas', price: 9.5, description: 'Garrafa 1L' },
  { id: 'p_refri_1_5l', name: 'Refrigerante 1,5 Litros', category: 'bebidas', price: 11.0, description: 'Garrafa 1.5L' },
  { id: 'p_refri_2l', name: 'Refrigerante 2 Litros', category: 'bebidas', price: 13.0, description: 'Garrafa família 2L' },
  { id: 'p_agua_sem_gas', name: 'Água Mineral sem Gás', category: 'bebidas', price: 4.0, description: '500ml pura' },
  { id: 'p_agua_com_gas', name: 'Água Mineral com Gás', category: 'bebidas', price: 4.5, description: '500ml gaseificada' },
  { id: 'p_suco_natural', name: 'Suco Natural', category: 'bebidas', price: 8.0, description: 'Laranja, maracujá, acerola, limão' },

  // Porções & Petiscos
  { id: 'p_porcao_fritas', name: 'Batata Frita', category: 'porcoes', price: 18.0, description: 'Porção sequinha e crocante' },
  { id: 'p_porcao_calabresa', name: 'Calabresa Acebolada', category: 'porcoes', price: 22.0, description: 'Com cebola dourada' },
  { id: 'p_porcao_mandioca', name: 'Mandioca Frita', category: 'porcoes', price: 18.0, description: 'Mandioca macia por dentro' },

  // Sobremesas & Doces
  { id: 'p_pudim', name: 'Pudim de Leite', category: 'sobremesas', price: 7.0, description: 'Pudim caseiro com calda' },
  { id: 'p_mousse', name: 'Mousse de Maracujá', category: 'sobremesas', price: 7.0, description: 'Cremoso geladinho' },
];

const INITIAL_ENTRIES: FiadoEntry[] = [
  {
    id: 'f1',
    customerId: 'c1',
    amount: 104.0,
    paidAmount: 50.0,
    description: '4x Marmitex Médio (M) + 4x Refrigerante Lata',
    date: getRelativeDateString(-10),
    dueDate: getRelativeDateString(-2), // Overdue by 2 days
    status: 'partially_paid',
    createdAt: '2026-09-23T11:30:00Z',
  },
  {
    id: 'f2',
    customerId: 'c2',
    amount: 48.0,
    paidAmount: 0,
    description: '2x Marmitex Pequeno (P) + 2x Suco Natural',
    date: getRelativeDateString(-4),
    dueDate: getRelativeDateString(0), // Due TODAY
    status: 'pending',
    createdAt: '2026-09-29T12:00:00Z',
  },
  {
    id: 'f3',
    customerId: 'c3',
    amount: 87.0,
    paidAmount: 0,
    description: '3x Marmitex Grande (G) + 1x Refrigerante 2L',
    date: getRelativeDateString(-2),
    dueDate: getRelativeDateString(2), // Due in 2 days (Radar de 3 dias)
    status: 'pending',
    createdAt: '2026-10-01T12:15:00Z',
  },
  {
    id: 'f4',
    customerId: 'c4',
    amount: 108.0,
    paidAmount: 108.0,
    description: '5x Marmitex Média + 2x Água Mineral sem Gás',
    date: getRelativeDateString(-15),
    dueDate: getRelativeDateString(-1),
    status: 'paid',
    createdAt: '2026-09-18T12:45:00Z',
  },
  {
    id: 'f5_1',
    customerId: 'c5',
    amount: 90.0,
    paidAmount: 0,
    description: '5x Marmitex Média + 2x Refrigerante 2 Litros (Convênio)',
    date: getRelativeDateString(-20),
    dueDate: getRelativeDateString(5),
    status: 'pending',
    createdAt: '2026-09-13T12:00:00Z',
  },
  {
    id: 'f5_2',
    customerId: 'c5',
    amount: 114.0,
    paidAmount: 0,
    description: '6x Marmitex Média + 6x Refrigerante Lata (Convênio)',
    date: getRelativeDateString(-15),
    dueDate: getRelativeDateString(5),
    status: 'pending',
    createdAt: '2026-09-18T12:00:00Z',
  },
  {
    id: 'f5_3',
    customerId: 'c5',
    amount: 95.0,
    paidAmount: 0,
    description: '5x Marmitex Grande + 3x Água Mineral com Gás',
    date: getRelativeDateString(-8),
    dueDate: getRelativeDateString(5),
    status: 'pending',
    createdAt: '2026-09-25T12:00:00Z',
  },
  {
    id: 'f5_4',
    customerId: 'c5',
    amount: 108.0,
    paidAmount: 0,
    description: '6x Marmitex Média - Almoço equipe produção',
    date: getRelativeDateString(-2),
    dueDate: getRelativeDateString(5),
    status: 'pending',
    createdAt: '2026-10-01T12:00:00Z',
  },
];

const INITIAL_PAYMENTS: PaymentRecord[] = [
  {
    id: 'p1',
    customerId: 'c1',
    fiadoEntryId: 'f1',
    amount: 50.00,
    date: getRelativeDateString(-4),
    method: 'pix',
    receiptNumber: 'REC-001',
    notes: 'Adiantamento pelo PIX',
    createdAt: '2026-09-29T15:00:00Z',
  },
  {
    id: 'p2',
    customerId: 'c4',
    fiadoEntryId: 'f4',
    amount: 108.00,
    date: getRelativeDateString(-1),
    method: 'cash',
    receiptNumber: 'REC-002',
    notes: 'Acerto total no balcão em dinheiro',
    createdAt: '2026-10-02T18:30:00Z',
  },
];

const currentDeviceId = LicenseSecurity.getOrCreateDeviceId();

const INITIAL_SETTINGS: StoreSettings = {
  storeName: 'Marmitaria & Restaurante Sabor Caseiro',
  ownerName: 'José Ricardo',
  phone: '5511988887777',
  pixKey: 'josericardo.martinscarvalho@gmail.com',
  pixKeyType: 'email',
  city: 'SAO PAULO',
  defaultDueDays: 15,
  deviceId: currentDeviceId,
  products: DEFAULT_PRODUCTS,
};

// Initial license state with monthly 9.90
const INITIAL_LICENSE: LicenseState = {
  status: 'active',
  monthlyPrice: 9.90,
  nextBillingDate: new Date(Date.now() + 27 * 86400000).toISOString(), // 27 days left in current cycle
  pausedAt: null,
  deviceId: currentDeviceId,
  usedActivationCodes: [],
  lastKnownTimestamp: Date.now(),
  history: [
    {
      id: 'lic-1',
      date: getRelativeDateString(-3),
      amount: 9.90,
      pixTxId: 'E904008582026100109520',
      status: 'paid',
      periodDays: 30,
    },
  ],
};

// Default merchants list for SaaS Owner tracking
const INITIAL_ADMIN_MERCHANTS: MerchantAdminRecord[] = [
  {
    id: 'm1',
    deviceId: currentDeviceId,
    storeName: 'Mercearia & Conveniência Central',
    ownerName: 'José Ricardo',
    phone: '5511988887777',
    city: 'São Paulo - SP',
    status: 'active',
    expirationDate: getRelativeDateString(27),
    totalCustomers: 4,
    totalFiadoDebt: 190.30,
    lastSeenAt: '2026-10-03T15:00:00Z',
    registeredAt: '2026-09-01T10:00:00Z',
    totalPaidFees: 19.80,
  },
  {
    id: 'm2',
    deviceId: 'LOJA-7842',
    storeName: 'Bar & Mercearia do Zé',
    ownerName: 'José Carlos de Moura',
    phone: '5511977776666',
    city: 'Campinas - SP',
    status: 'active',
    expirationDate: getRelativeDateString(18),
    totalCustomers: 28,
    totalFiadoDebt: 1420.50,
    lastSeenAt: '2026-10-02T19:30:00Z',
    registeredAt: '2026-08-15T09:00:00Z',
    totalPaidFees: 29.70,
  },
  {
    id: 'm3',
    deviceId: 'LOJA-3195',
    storeName: 'Bodega do Seu Raimundo',
    ownerName: 'Raimundo Nonato',
    phone: '5588999998888',
    city: 'Juazeiro do Norte - CE',
    status: 'active',
    expirationDate: getRelativeDateString(0), // Vence hoje!
    totalCustomers: 15,
    totalFiadoDebt: 890.00,
    lastSeenAt: '2026-10-03T11:20:00Z',
    registeredAt: '2026-09-03T14:00:00Z',
    totalPaidFees: 9.90,
  },
  {
    id: 'm4',
    deviceId: 'LOJA-6420',
    storeName: 'Mercearia Dona Francisca',
    ownerName: 'Francisca Lima',
    phone: '5531988881111',
    city: 'Belo Horizonte - MG',
    status: 'expired',
    expirationDate: getRelativeDateString(-4), // Vencida há 4 dias
    totalCustomers: 32,
    totalFiadoDebt: 2150.00,
    lastSeenAt: '2026-09-29T16:00:00Z',
    registeredAt: '2026-07-20T11:00:00Z',
    totalPaidFees: 19.80,
  },
  {
    id: 'm5',
    deviceId: 'LOJA-1184',
    storeName: 'Depósito & Distribuidora Silva',
    ownerName: 'Carlos Eduardo',
    phone: '5562981234567',
    city: 'Goiânia - GO',
    status: 'paused',
    expirationDate: getRelativeDateString(-1),
    totalCustomers: 12,
    totalFiadoDebt: 640.00,
    lastSeenAt: '2026-09-20T17:00:00Z',
    registeredAt: '2026-08-01T08:00:00Z',
    totalPaidFees: 9.90,
  },
];

// Helper: get storage key scoped to the logged-in user
function getScopedKey(baseKey: string): string {
  const activeUserId = AuthService.getActiveUserId();
  if (activeUserId) {
    return `${baseKey}_${activeUserId}`;
  }
  return baseKey;
}

// Helper: safe JSON load
function load<T>(key: string, fallback: T): T {
  try {
    const scopedKey = getScopedKey(key);
    let raw = localStorage.getItem(scopedKey);
    // If scoped key is not set yet and active user is the primary demo user, fallback to base key
    if (!raw && AuthService.getActiveUserId() === 'usr_demo_principal') {
      raw = localStorage.getItem(key);
    }
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch (err) {
    console.error(`Error loading key ${key}:`, err);
    return fallback;
  }
}

// Helper: safe JSON save
function save<T>(key: string, data: T): void {
  try {
    const scopedKey = getScopedKey(key);
    localStorage.setItem(scopedKey, JSON.stringify(data));
  } catch (err) {
    console.error(`Error saving key ${key}:`, err);
  }
}

// Recalculates the status of a fiado entry based on paidAmount and dates
export function calculateFiadoStatus(entry: FiadoEntry): 'pending' | 'partially_paid' | 'paid' | 'overdue' {
  if (entry.paidAmount >= entry.amount - 0.001) {
    return 'paid';
  }
  const today = getRelativeDateString(0);
  if (entry.dueDate < today) {
    return 'overdue';
  }
  if (entry.paidAmount > 0) {
    return 'partially_paid';
  }
  return 'pending';
}

export const StorageService = {
  // Customers (sempre ordenados em ordem alfabética de A a Z)
  getCustomers(): Customer[] {
    const activeUserId = AuthService.getActiveUserId();
    const fallback = activeUserId && activeUserId !== 'usr_demo_principal' ? [] : INITIAL_CUSTOMERS;
    const list = load<Customer[]>(STORAGE_KEYS.CUSTOMERS, fallback);
    return [...list].sort((a, b) =>
      (a.name || '').localeCompare(b.name || '', 'pt-BR', { sensitivity: 'base' })
    );
  },

  saveCustomer(customer: Customer): Customer[] {
    const list = this.getCustomers();
    const index = list.findIndex((c) => c.id === customer.id);
    let updated: Customer[];
    if (index >= 0) {
      updated = [...list];
      updated[index] = customer;
    } else {
      updated = [...list, customer];
    }
    updated.sort((a, b) =>
      (a.name || '').localeCompare(b.name || '', 'pt-BR', { sensitivity: 'base' })
    );
    save(STORAGE_KEYS.CUSTOMERS, updated);
    this.updateAdminSelfRecord();
    FirebaseService.saveCustomer(customer);
    return updated;
  },

  deleteCustomer(id: string): { customers: Customer[]; entries: FiadoEntry[] } {
    const customers = this.getCustomers().filter((c) => c.id !== id);
    save(STORAGE_KEYS.CUSTOMERS, customers);

    const entries = this.getFiadoEntries().filter((e) => e.customerId !== id);
    save(STORAGE_KEYS.ENTRIES, entries);

    const payments = this.getPayments().filter((p) => p.customerId !== id);
    save(STORAGE_KEYS.PAYMENTS, payments);

    this.updateAdminSelfRecord();
    FirebaseService.deleteCustomer(id);
    return { customers, entries };
  },

  // Fiado Entries
  getFiadoEntries(): FiadoEntry[] {
    const activeUserId = AuthService.getActiveUserId();
    const fallback = activeUserId && activeUserId !== 'usr_demo_principal' ? [] : INITIAL_ENTRIES;
    const list = load<FiadoEntry[]>(STORAGE_KEYS.ENTRIES, fallback);
    return list.map((entry) => ({
      ...entry,
      status: calculateFiadoStatus(entry),
    }));
  },

  saveFiadoEntry(entry: FiadoEntry): FiadoEntry[] {
    const list = this.getFiadoEntries();
    const normalized: FiadoEntry = {
      ...entry,
      status: calculateFiadoStatus(entry),
    };

    const index = list.findIndex((e) => e.id === entry.id);
    let updated: FiadoEntry[];
    if (index >= 0) {
      updated = [...list];
      updated[index] = normalized;
    } else {
      updated = [normalized, ...list];
    }
    save(STORAGE_KEYS.ENTRIES, updated);
    this.touchTimestamp();
    this.updateAdminSelfRecord();
    FirebaseService.saveFiadoEntry(normalized);
    return updated;
  },

  deleteFiadoEntry(id: string): FiadoEntry[] {
    const list = this.getFiadoEntries().filter((e) => e.id !== id);
    save(STORAGE_KEYS.ENTRIES, list);
    this.updateAdminSelfRecord();
    FirebaseService.deleteFiadoEntry(id);
    return list;
  },

  // Payments
  getPayments(): PaymentRecord[] {
    const activeUserId = AuthService.getActiveUserId();
    const fallback = activeUserId && activeUserId !== 'usr_demo_principal' ? [] : INITIAL_PAYMENTS;
    return load<PaymentRecord[]>(STORAGE_KEYS.PAYMENTS, fallback);
  },

  addPayment(payment: PaymentRecord): {
    payments: PaymentRecord[];
    entries: FiadoEntry[];
  } {
    const payments = [payment, ...this.getPayments()];
    save(STORAGE_KEYS.PAYMENTS, payments);

    let entries = this.getFiadoEntries();
    let remainingAmountToAbate = payment.amount;

    if (payment.fiadoEntryId) {
      entries = entries.map((entry) => {
        if (entry.id === payment.fiadoEntryId) {
          const newPaid = Math.min(entry.amount, entry.paidAmount + payment.amount);
          const updatedEntry = {
            ...entry,
            paidAmount: newPaid,
          };
          return {
            ...updatedEntry,
            status: calculateFiadoStatus(updatedEntry),
          };
        }
        return entry;
      });
    } else {
      entries = entries.map((entry) => {
        if (entry.customerId !== payment.customerId) return entry;
        const unpaid = entry.amount - entry.paidAmount;
        if (unpaid <= 0 || remainingAmountToAbate <= 0) return entry;

        const toPay = Math.min(unpaid, remainingAmountToAbate);
        remainingAmountToAbate -= toPay;
        const updatedEntry = {
          ...entry,
          paidAmount: entry.paidAmount + toPay,
        };
        return {
          ...updatedEntry,
          status: calculateFiadoStatus(updatedEntry),
        };
      });
    }

    save(STORAGE_KEYS.ENTRIES, entries);
    this.touchTimestamp();
    this.updateAdminSelfRecord();

    // Sync to cloud Firestore
    FirebaseService.savePayment(payment);
    entries.forEach((e) => {
      if (payment.fiadoEntryId ? e.id === payment.fiadoEntryId : e.customerId === payment.customerId) {
        FirebaseService.saveFiadoEntry(e);
      }
    });

    return { payments, entries };
  },

  /**
   * Settles multiple selected entries for monthly closing in a single operation.
   */
  settleMonthlyEntries(params: {
    customerId: string;
    entryIds: string[];
    paymentMethod: PaymentRecord['method'];
    notes?: string;
  }): { payment: PaymentRecord; updatedEntries: FiadoEntry[] } {
    const entries = this.getFiadoEntries();
    let totalSettled = 0;

    const updatedEntries = entries.map((entry) => {
      if (params.entryIds.includes(entry.id)) {
        const remaining = Math.max(0, entry.amount - entry.paidAmount);
        totalSettled += remaining;
        const fullyPaid: FiadoEntry = {
          ...entry,
          paidAmount: entry.amount,
          status: 'paid',
        };
        return fullyPaid;
      }
      return entry;
    });

    save(STORAGE_KEYS.ENTRIES, updatedEntries);

    const payment: PaymentRecord = {
      id: 'p_' + Date.now(),
      customerId: params.customerId,
      amount: totalSettled,
      date: getRelativeDateString(0),
      method: params.paymentMethod,
      receiptNumber: 'FECH-' + Date.now().toString().slice(-6),
      notes:
        params.notes ||
        `Fechamento mensal de ${params.entryIds.length} compras de marmitex`,
      createdAt: new Date().toISOString(),
    };

    const payments = [payment, ...this.getPayments()];
    save(STORAGE_KEYS.PAYMENTS, payments);

    this.touchTimestamp();
    this.updateAdminSelfRecord();

    // Sync to cloud Firestore
    FirebaseService.savePayment(payment);
    updatedEntries.forEach((e) => {
      if (params.entryIds.includes(e.id)) {
        FirebaseService.saveFiadoEntry(e);
      }
    });

    return { payment, updatedEntries };
  },

  // Store Settings
  getStoreSettings(): StoreSettings {
    const user = AuthService.getCurrentUser();
    let initialForUser = INITIAL_SETTINGS;
    if (user && user.id !== 'usr_demo_principal') {
      initialForUser = {
        ...INITIAL_SETTINGS,
        storeName: user.storeName || INITIAL_SETTINGS.storeName,
        ownerName: user.name || INITIAL_SETTINGS.ownerName,
        phone: user.phone || INITIAL_SETTINGS.phone,
        city: user.city || INITIAL_SETTINGS.city,
        deviceId: user.id,
      };
    }
    const settings = load<StoreSettings>(STORAGE_KEYS.SETTINGS, initialForUser);
    if (!settings.deviceId) {
      settings.deviceId = user?.id || LicenseSecurity.getOrCreateDeviceId();
    }
    if (!settings.products || settings.products.length === 0) {
      settings.products = DEFAULT_PRODUCTS;
    } else {
      const existingIds = new Set(settings.products.map((p) => p.id));
      const missing = DEFAULT_PRODUCTS.filter((p) => !existingIds.has(p.id));
      if (missing.length > 0) {
        settings.products = [...settings.products, ...missing];
      }
    }
    save(STORAGE_KEYS.SETTINGS, settings);
    return settings;
  },

  saveStoreSettings(settings: StoreSettings): StoreSettings {
    save(STORAGE_KEYS.SETTINGS, settings);
    this.updateAdminSelfRecord();
    FirebaseService.saveStoreSettings(settings);
    return settings;
  },

  /**
   * Performs full synchronization with the free Firebase Firestore cloud database
   */
  async syncWithCloud() {
    const res = await FirebaseService.syncWithCloud(
      this.getCustomers(),
      this.getFiadoEntries(),
      this.getPayments(),
      this.getStoreSettings()
    );
    save(STORAGE_KEYS.CUSTOMERS, res.customers);
    save(STORAGE_KEYS.ENTRIES, res.entries);
    save(STORAGE_KEYS.PAYMENTS, res.payments);
    save(STORAGE_KEYS.SETTINGS, res.settings);
    return res;
  },

  // Timestamp maintenance for anti-tamper
  touchTimestamp(): void {
    const lic = load<LicenseState>(STORAGE_KEYS.LICENSE, INITIAL_LICENSE);
    lic.lastKnownTimestamp = Math.max(Date.now(), lic.lastKnownTimestamp || Date.now());
    save(STORAGE_KEYS.LICENSE, lic);
  },

  // License Management (R$ 9,90/mês, pause/resume, PIX unlock, offline token)
  getLicense(): LicenseState {
    const license = load<LicenseState>(STORAGE_KEYS.LICENSE, INITIAL_LICENSE);
    if (!license.deviceId) {
      license.deviceId = LicenseSecurity.getOrCreateDeviceId();
    }
    if (!license.usedActivationCodes) {
      license.usedActivationCodes = [];
    }

    // Anti-clock-tampering verification
    const clockCheck = LicenseSecurity.checkClockIntegrity(license.lastKnownTimestamp || 0);
    license.clockTampered = clockCheck.tampered;
    license.lastKnownTimestamp = clockCheck.currentTimestamp;

    // Check if expired
    if (license.status === 'active') {
      const now = clockCheck.currentTimestamp;
      const billing = new Date(license.nextBillingDate).getTime();
      if (now > billing || license.clockTampered) {
        license.status = 'expired';
        save(STORAGE_KEYS.LICENSE, license);
      }
    }

    save(STORAGE_KEYS.LICENSE, license);
    return license;
  },

  saveLicense(license: LicenseState): LicenseState {
    save(STORAGE_KEYS.LICENSE, license);
    this.updateAdminSelfRecord();
    return license;
  },

  pauseLicense(): LicenseState {
    const license = this.getLicense();
    license.status = 'paused';
    license.pausedAt = new Date().toISOString();
    save(STORAGE_KEYS.LICENSE, license);
    this.updateAdminSelfRecord();
    return license;
  },

  resumeLicense(): LicenseState {
    const license = this.getLicense();
    license.status = 'active';
    license.pausedAt = null;
    save(STORAGE_KEYS.LICENSE, license);
    this.updateAdminSelfRecord();
    return license;
  },

  expireLicense(): LicenseState {
    const license = this.getLicense();
    license.status = 'expired';
    license.nextBillingDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    save(STORAGE_KEYS.LICENSE, license);
    this.updateAdminSelfRecord();
    return license;
  },

  /**
   * Extends the merchant's license by 30 days upon PIX confirmation.
   */
  confirmPixPayment(amount = 9.90, customTxId?: string): LicenseState {
    const license = this.getLicense();
    const now = new Date();
    
    const currentBilling = new Date(license.nextBillingDate);
    const baseDate = currentBilling > now && license.status === 'active' ? currentBilling : now;
    const newBillingDate = new Date(baseDate.getTime() + 30 * 86400000).toISOString();

    const txId = customTxId || 'PIX' + Date.now().toString().slice(-10);
    const historyItem: LicenseHistoryItem = {
      id: 'tx-' + Date.now(),
      date: getRelativeDateString(0),
      amount,
      pixTxId: txId,
      status: 'paid',
      periodDays: 30,
    };

    license.status = 'active';
    license.nextBillingDate = newBillingDate;
    license.pausedAt = null;
    license.clockTampered = false;
    license.history = [historyItem, ...(license.history || [])];

    save(STORAGE_KEYS.LICENSE, license);
    this.updateAdminSelfRecord();
    return license;
  },

  /**
   * Applies an offline cryptographic activation key (e.g., sent by the SaaS owner via WhatsApp).
   */
  applyOfflineActivationCode(code: string): { success: boolean; message: string; license: LicenseState } {
    const license = this.getLicense();
    const validation = LicenseSecurity.validateActivationCode(
      license.deviceId,
      code,
      license.usedActivationCodes || []
    );

    if (!validation.valid) {
      return {
        success: false,
        message: validation.reason || 'Código inválido.',
        license,
      };
    }

    const now = new Date();
    const currentBilling = new Date(license.nextBillingDate);
    const baseDate = currentBilling > now && license.status === 'active' ? currentBilling : now;
    const newBillingDate = new Date(baseDate.getTime() + validation.days * 86400000).toISOString();

    const cleanCode = code.trim().toUpperCase().replace(/\s+/g, '');
    const historyItem: LicenseHistoryItem = {
      id: 'code-' + Date.now(),
      date: getRelativeDateString(0),
      amount: 9.90 * Math.max(1, Math.round(validation.days / 30)),
      pixTxId: 'CHAVE-' + cleanCode.slice(-8),
      status: 'paid',
      periodDays: validation.days,
      activationCode: cleanCode,
    };

    license.status = 'active';
    license.nextBillingDate = newBillingDate;
    license.pausedAt = null;
    license.clockTampered = false;
    license.usedActivationCodes = [...(license.usedActivationCodes || []), cleanCode];
    license.history = [historyItem, ...(license.history || [])];

    save(STORAGE_KEYS.LICENSE, license);
    this.updateAdminSelfRecord();

    return {
      success: true,
      message: `Código aprovado com sucesso! +${validation.days} dias liberados no seu aparelho.`,
      license,
    };
  },

  // SAAS OWNER / ADMIN MONITORING
  getAdminMerchants(): MerchantAdminRecord[] {
    const list = load<MerchantAdminRecord[]>(STORAGE_KEYS.ADMIN_MERCHANTS, INITIAL_ADMIN_MERCHANTS);
    return list;
  },

  saveAdminMerchant(record: MerchantAdminRecord): MerchantAdminRecord[] {
    const list = this.getAdminMerchants();
    const idx = list.findIndex((m) => m.id === record.id || m.deviceId === record.deviceId);
    let updated: MerchantAdminRecord[];
    if (idx >= 0) {
      updated = [...list];
      updated[idx] = record;
    } else {
      updated = [record, ...list];
    }
    save(STORAGE_KEYS.ADMIN_MERCHANTS, updated);
    return updated;
  },

  deleteAdminMerchant(id: string): MerchantAdminRecord[] {
    const list = this.getAdminMerchants().filter((m) => m.id !== id && m.deviceId !== id);
    save(STORAGE_KEYS.ADMIN_MERCHANTS, list);

    // Save in deleted list so updateAdminSelfRecord does not revive it
    const deleted = load<string[]>(STORAGE_KEYS.DELETED_MERCHANTS, []);
    if (!deleted.includes(id)) {
      deleted.push(id);
      save(STORAGE_KEYS.DELETED_MERCHANTS, deleted);
    }
    return list;
  },

  updateAdminSelfRecord(): void {
    const settings = this.getStoreSettings();
    const selfId = 'self_' + settings.deviceId;
    const deleted = load<string[]>(STORAGE_KEYS.DELETED_MERCHANTS, []);
    if (deleted.includes(selfId) || (settings.deviceId && deleted.includes(settings.deviceId))) {
      return;
    }

    const license = this.getLicense();
    const entries = this.getFiadoEntries();
    const customers = this.getCustomers();

    let totalDebt = 0;
    entries.forEach((e) => {
      const remaining = Math.max(0, e.amount - e.paidAmount);
      totalDebt += remaining;
    });

    const selfRecord: MerchantAdminRecord = {
      id: selfId,
      deviceId: settings.deviceId || 'LOJA-9999',
      storeName: settings.storeName || 'Mercearia Central',
      ownerName: settings.ownerName || 'Comerciante',
      phone: settings.phone || '5511999999999',
      city: settings.city || 'São Paulo - SP',
      status: license.status,
      expirationDate: license.nextBillingDate.split('T')[0],
      totalCustomers: customers.length,
      totalFiadoDebt: totalDebt,
      lastSeenAt: new Date().toISOString(),
      registeredAt: '2026-09-01T10:00:00Z',
      totalPaidFees: (license.history || []).reduce((acc, h) => acc + (h.amount || 0), 0),
    };

    this.saveAdminMerchant(selfRecord);
  },

  // Admin PIX Configuration (onde o Dono / Desenvolvedor recebe as mensalidades de R$ 9,90)
  getAdminPixConfig(): AdminPixConfig {
    const cfg = load<AdminPixConfig>(STORAGE_KEYS.ADMIN_PIX, DEFAULT_ADMIN_PIX);
    return cfg;
  },

  saveAdminPixConfig(config: AdminPixConfig): AdminPixConfig {
    const updated = {
      ...config,
      updatedAt: new Date().toISOString(),
    };
    save(STORAGE_KEYS.ADMIN_PIX, updated);
    return updated;
  },

  // Debt & Balance queries
  getCustomerDebt(customerId: string): {
    totalDebt: number;
    pendingCount: number;
    overdueCount: number;
    entries: FiadoEntry[];
    creditBalance: number;
    totalPaid: number;
    totalConsumed: number;
  } {
    const all = this.getFiadoEntries().filter((e) => e.customerId === customerId);
    const payments = this.getPayments().filter((p) => p.customerId === customerId);

    let totalDebt = 0;
    let pendingCount = 0;
    let overdueCount = 0;
    let totalConsumed = 0;
    let totalAbsorbed = 0;

    for (const e of all) {
      totalConsumed += e.amount;
      totalAbsorbed += e.paidAmount || 0;
      const remaining = Math.max(0, e.amount - e.paidAmount);
      totalDebt += remaining;
      if (remaining > 0) {
        if (e.status === 'overdue') overdueCount++;
        else pendingCount++;
      }
    }

    const totalPaid = payments.reduce((acc, p) => acc + p.amount, 0);
    const creditBalance = Math.max(0, totalPaid - totalAbsorbed);

    return {
      totalDebt,
      pendingCount,
      overdueCount,
      entries: all,
      creditBalance,
      totalPaid,
      totalConsumed,
    };
  },

  /**
   * Analytics of what product categories this specific customer consumes the most.
   */
  getCustomerCategoryAnalytics(customerId: string): {
    totalSpent: number;
    categories: Array<{
      category: string;
      label: string;
      icon: string;
      color: string;
      amount: number;
      percentage: number;
      count: number;
    }>;
    topCategory: { category: string; label: string; icon: string; count: number; percentage: number } | null;
  } {
    const entries = this.getFiadoEntries().filter((e) => e.customerId === customerId);
    let totalSpent = 0;

    const catStats: Record<string, { amount: number; count: number }> = {
      marmitex: { amount: 0, count: 0 },
      bebidas: { amount: 0, count: 0 },
      porcoes: { amount: 0, count: 0 },
      sobremesas: { amount: 0, count: 0 },
      outros: { amount: 0, count: 0 },
    };

    entries.forEach((e) => {
      totalSpent += e.amount;
      const lowerDesc = (e.description || '').toLowerCase();

      // If categories were explicitly selected on entry, use them
      if (e.categories && e.categories.length > 0) {
        const splitAmount = e.amount / e.categories.length;
        e.categories.forEach((cat) => {
          if (!catStats[cat]) catStats[cat] = { amount: 0, count: 0 };
          catStats[cat].amount += splitAmount;
          catStats[cat].count += 1;
        });
      } else {
        // Automatic inference from text description
        let matched = false;
        if (
          lowerDesc.includes('marmita') ||
          lowerDesc.includes('marmitex') ||
          lowerDesc.includes('prato feito') ||
          lowerDesc.includes('almoço') ||
          lowerDesc.includes('kg')
        ) {
          catStats.marmitex.amount += e.amount;
          catStats.marmitex.count += 1;
          matched = true;
        }

        if (
          lowerDesc.includes('refri') ||
          lowerDesc.includes('coca') ||
          lowerDesc.includes('lata') ||
          lowerDesc.includes('suco') ||
          lowerDesc.includes('agua') ||
          lowerDesc.includes('água')
        ) {
          if (!matched) {
            catStats.bebidas.amount += e.amount;
            catStats.bebidas.count += 1;
            matched = true;
          } else {
            catStats.bebidas.count += 1;
          }
        }

        if (
          lowerDesc.includes('fritas') ||
          lowerDesc.includes('porcao') ||
          lowerDesc.includes('porção') ||
          lowerDesc.includes('calabresa') ||
          lowerDesc.includes('mandioca')
        ) {
          if (!matched) {
            catStats.porcoes.amount += e.amount;
            catStats.porcoes.count += 1;
            matched = true;
          } else {
            catStats.porcoes.count += 1;
          }
        }

        if (
          lowerDesc.includes('pudim') ||
          lowerDesc.includes('mousse') ||
          lowerDesc.includes('sobremesa') ||
          lowerDesc.includes('doce')
        ) {
          if (!matched) {
            catStats.sobremesas.amount += e.amount;
            catStats.sobremesas.count += 1;
            matched = true;
          } else {
            catStats.sobremesas.count += 1;
          }
        }

        if (!matched) {
          catStats.outros.amount += e.amount;
          catStats.outros.count += 1;
        }
      }
    });

    const categoryMeta: Record<string, { label: string; icon: string; color: string }> = {
      marmitex: { label: 'Marmitex & Almoços', icon: '🍱', color: 'emerald' },
      bebidas: { label: 'Bebidas & Sucos', icon: '🥤', color: 'blue' },
      porcoes: { label: 'Porções & Petiscos', icon: '🍟', color: 'amber' },
      sobremesas: { label: 'Sobremesas & Doces', icon: '🍰', color: 'rose' },
      outros: { label: 'Outros Produtos', icon: '🏷️', color: 'slate' },
    };

    const categories = Object.entries(catStats)
      .filter(([_, stats]) => stats.count > 0 || stats.amount > 0)
      .map(([cat, stats]) => {
        const meta = categoryMeta[cat] || { label: cat, icon: '🏷️', color: 'slate' };
        const percentage = totalSpent > 0 ? Math.round((stats.amount / totalSpent) * 100) : 0;
        return {
          category: cat,
          label: meta.label,
          icon: meta.icon,
          color: meta.color,
          amount: stats.amount,
          count: stats.count,
          percentage,
        };
      })
      .sort((a, b) => b.amount - a.amount || b.count - a.count);

    const top = categories.length > 0 ? categories[0] : null;

    return {
      totalSpent,
      categories,
      topCategory: top
        ? {
            category: top.category,
            label: top.label,
            icon: top.icon,
            count: top.count,
            percentage: top.percentage,
          }
        : null,
    };
  },

  /**
   * Identifies and returns all customers whose debts are maturing within the next N days (default 3 days).
   * Sorted by nearest due date (today first, then tomorrow, then 2 days, etc.).
   */
  getUpcomingDueCustomers(daysAhead = 3): UpcomingDueCustomer[] {
    const todayStr = getRelativeDateString(0);
    const maxDateStr = getRelativeDateString(daysAhead);
    const customers = this.getCustomers();
    const entries = this.getFiadoEntries();

    const result: UpcomingDueCustomer[] = [];

    customers.forEach((customer) => {
      const customerEntries = entries.filter((e) => e.customerId === customer.id);
      const overallDebt = customerEntries.reduce(
        (acc, e) => acc + Math.max(0, e.amount - e.paidAmount),
        0
      );

      // Filter entries maturing between today and daysAhead (not paid)
      const dueSoonEntries = customerEntries.filter(
        (e) => e.status !== 'paid' && e.dueDate >= todayStr && e.dueDate <= maxDateStr
      );

      if (dueSoonEntries.length > 0) {
        const totalDueSoon = dueSoonEntries.reduce(
          (acc, e) => acc + Math.max(0, e.amount - e.paidAmount),
          0
        );

        // Sort by nearest date
        dueSoonEntries.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
        const nearestDueDate = dueSoonEntries[0].dueDate;

        // Calculate days difference
        const todayDate = new Date(todayStr + 'T00:00:00');
        const dueDateObj = new Date(nearestDueDate + 'T00:00:00');
        const diffDays = Math.round(
          (dueDateObj.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24)
        );

        let urgencyLabel = `Vence em ${diffDays} dias`;
        if (diffDays === 0) urgencyLabel = 'Vence Hoje!';
        else if (diffDays === 1) urgencyLabel = 'Vence Amanhã';

        result.push({
          customer,
          entries: dueSoonEntries,
          totalDueSoon,
          totalOverallDebt: overallDebt,
          nearestDueDate,
          daysRemaining: diffDays,
          urgencyLabel,
        });
      }
    });

    // Sort by daysRemaining ascending (today first, then tomorrow, etc.)
    result.sort((a, b) => a.daysRemaining - b.daysRemaining || b.totalDueSoon - a.totalDueSoon);
    return result;
  },

  // Full Backup / Restore
  exportBackupJSON(): string {
    const data = {
      version: '1.2.0',
      exportedAt: new Date().toISOString(),
      customers: this.getCustomers(),
      entries: this.getFiadoEntries(),
      payments: this.getPayments(),
      settings: this.getStoreSettings(),
      license: this.getLicense(),
      adminMerchants: this.getAdminMerchants(),
    };
    return JSON.stringify(data, null, 2);
  },

  // Triggers browser download of the JSON file to device and updates lastBackupDate
  downloadBackupJSONFile(): { filename: string; date: string } {
    const jsonStr = this.exportBackupJSON();
    const dateStr = getRelativeDateString(0);
    const settings = this.getStoreSettings();
    const storeSlug = (settings.storeName || 'marmitex')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '-');
    const filename = `backup-marmitex-${storeSlug}-${dateStr}.json`;

    const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    // Update settings with lastBackupDate
    const nowIso = new Date().toISOString();
    const updatedSettings: StoreSettings = {
      ...settings,
      lastBackupDate: nowIso,
    };
    this.saveStoreSettings(updatedSettings);

    return { filename, date: nowIso };
  },

  // Check if manual backup reminder is due
  checkBackupReminder(settings: StoreSettings): {
    isDue: boolean;
    daysSinceLast: number;
    frequency: 'daily' | 'weekly' | 'monthly' | 'disabled';
  } {
    const frequency = settings.backupReminderFrequency || 'weekly';
    if (frequency === 'disabled') {
      return { isDue: false, daysSinceLast: 0, frequency };
    }

    const todayStr = getRelativeDateString(0);
    if (settings.dismissedBackupReminderUntil === todayStr) {
      return { isDue: false, daysSinceLast: 0, frequency };
    }

    if (!settings.lastBackupDate) {
      // Never backed up
      return { isDue: true, daysSinceLast: 999, frequency };
    }

    const lastTime = new Date(settings.lastBackupDate).getTime();
    const nowTime = new Date().getTime();
    const diffDays = Math.floor((nowTime - lastTime) / (1000 * 60 * 60 * 24));

    let thresholdDays = 7; // weekly default
    if (frequency === 'daily') thresholdDays = 1;
    if (frequency === 'monthly') thresholdDays = 30;

    return {
      isDue: diffDays >= thresholdDays,
      daysSinceLast: diffDays,
      frequency,
    };
  },

  dismissBackupReminderToday(): StoreSettings {
    const settings = this.getStoreSettings();
    const todayStr = getRelativeDateString(0);
    const updated: StoreSettings = {
      ...settings,
      dismissedBackupReminderUntil: todayStr,
    };
    return this.saveStoreSettings(updated);
  },

  importBackupJSON(jsonStr: string): boolean {
    try {
      const data = JSON.parse(jsonStr);
      if (data.customers) save(STORAGE_KEYS.CUSTOMERS, data.customers);
      if (data.entries) save(STORAGE_KEYS.ENTRIES, data.entries);
      if (data.payments) save(STORAGE_KEYS.PAYMENTS, data.payments);
      if (data.settings) save(STORAGE_KEYS.SETTINGS, data.settings);
      if (data.license) save(STORAGE_KEYS.LICENSE, data.license);
      if (data.adminMerchants) save(STORAGE_KEYS.ADMIN_MERCHANTS, data.adminMerchants);
      return true;
    } catch (err) {
      console.error('Backup import error:', err);
      return false;
    }
  },

  resetToDemoData(): void {
    save(STORAGE_KEYS.CUSTOMERS, INITIAL_CUSTOMERS);
    save(STORAGE_KEYS.ENTRIES, INITIAL_ENTRIES);
    save(STORAGE_KEYS.PAYMENTS, INITIAL_PAYMENTS);
    save(STORAGE_KEYS.SETTINGS, INITIAL_SETTINGS);
    save(STORAGE_KEYS.LICENSE, INITIAL_LICENSE);
    save(STORAGE_KEYS.ADMIN_MERCHANTS, INITIAL_ADMIN_MERCHANTS);
  },
};

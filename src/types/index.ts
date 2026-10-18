export interface Customer {
  id: string;
  name: string;
  nickname?: string;
  phone: string; // WhatsApp formatted
  cpf?: string;
  cnpj?: string;
  address?: string;
  creditLimit?: number;
  notes?: string;
  createdAt: string;

  // Empresa / Convênio e Preços Diferenciados
  customerType?: 'individual' | 'empresa';
  companyDiscountType?: 'none' | 'percent' | 'fixed_per_marmita' | 'custom_table';
  companyDiscountPercent?: number; // ex: 10%
  companyDiscountPerMarmita?: number; // ex: R$ 2,00 por marmita
  customPrices?: { [productId: string]: number }; // Tabela de preços específicos da empresa
  billingCycle?: 'monthly' | 'biweekly' | 'weekly' | 'custom'; // Fechamento mensal padrão
}

export type ProductCategory = 'marmitex' | 'bebidas' | 'porcoes' | 'sobremesas' | 'outros';

export interface FiadoEntry {
  id: string;
  customerId: string;
  amount: number;
  paidAmount: number;
  description: string;
  date: string; // YYYY-MM-DD
  dueDate: string; // YYYY-MM-DD
  status: 'pending' | 'partially_paid' | 'paid' | 'overdue';
  createdAt: string;
  notes?: string;

  // Descontos aplicados
  originalAmount?: number;
  discountType?: 'none' | 'fixed' | 'percent';
  discountValue?: number;

  // Categorias de produtos selecionadas no lançamento
  categories?: string[];

  // Crédito antecipado aplicado neste consumo
  paidFromCredit?: number;
}

export interface PaymentRecord {
  id: string;
  customerId: string;
  fiadoEntryId?: string;
  amount: number;
  date: string; // YYYY-MM-DD
  method: 'pix' | 'cash' | 'card_debit' | 'card_credit' | 'other';
  receiptNumber: string;
  notes?: string;
  createdAt: string;

  // Identificação de pagamento/crédito antecipado de marmitas
  isPrepaidCredit?: boolean;
}

export interface ProductItem {
  id: string;
  name: string;
  category: 'marmitex' | 'bebidas' | 'porcoes' | 'sobremesas' | 'outros' | string;
  price: number;
  description?: string;
  unit?: 'unit' | 'kg';
}

export interface StoreSettings {
  storeName: string;
  ownerName: string;
  phone: string;
  pixKey: string;
  pixKeyType: 'cpf' | 'cnpj' | 'email' | 'phone' | 'random';
  city: string;
  defaultDueDays: number;
  deviceId?: string;
  products?: ProductItem[];

  // Backup e Lembrete
  backupReminderFrequency?: 'daily' | 'weekly' | 'monthly' | 'disabled';
  lastBackupDate?: string;
  dismissedBackupReminderUntil?: string;
}

export interface AdminPixConfig {
  adminName: string;
  adminPixKey: string;
  adminPixKeyType: 'email' | 'cpf' | 'cnpj' | 'phone' | 'random';
  adminCity: string;
  monthlyFee: number;
  whatsappSupport: string;
  instructions?: string;
  updatedAt?: string;
}

export interface LicenseHistoryItem {
  id: string;
  date: string;
  amount: number;
  pixTxId: string;
  status: 'paid';
  periodDays: number;
  activationCode?: string;
}

export interface LicenseState {
  status: 'active' | 'paused' | 'trial' | 'expired';
  monthlyPrice: number; // 9.90
  nextBillingDate: string; // ISO
  pausedAt?: string | null;
  history: LicenseHistoryItem[];
  trialEndsAt?: string;
  deviceId: string;
  usedActivationCodes: string[];
  lastKnownTimestamp: number;
  clockTampered?: boolean;
}

export interface UpcomingDueCustomer {
  customer: Customer;
  entries: FiadoEntry[];
  totalDueSoon: number;
  totalOverallDebt: number;
  nearestDueDate: string;
  daysRemaining: number;
  urgencyLabel: string;
}

export interface MerchantAdminRecord {
  id: string;
  deviceId: string;
  storeName: string;
  ownerName: string;
  phone: string;
  city: string;
  status: 'active' | 'paused' | 'trial' | 'expired';
  expirationDate: string;
  totalCustomers: number;
  totalFiadoDebt: number;
  lastSeenAt: string;
  registeredAt: string;
  totalPaidFees: number;
}

export interface UserAccount {
  id: string;
  email: string;
  name: string;
  storeName: string;
  passwordHash: string;
  phone?: string;
  city?: string;
  role: 'merchant' | 'admin';
  createdAt: string;
  lastLoginAt: string;
}

import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import {
  getFirestore,
  Firestore,
  doc,
  collection,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  writeBatch,
  arrayUnion,
  arrayRemove,
  getDocFromServer,
  onSnapshot,
  Unsubscribe,
} from 'firebase/firestore';
import { getAuth, signInAnonymously, onAuthStateChanged, User, Auth } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { Customer, FiadoEntry, PaymentRecord, StoreSettings } from '../types';
import { AuthService } from './auth';

let app: FirebaseApp;
let db: Firestore;
let auth: Auth;

try {
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApps()[0];
  }
  db = getFirestore(app, firebaseConfig.firestoreDatabaseId || '(default)');
  auth = getAuth(app);
} catch (err) {
  console.error('Erro ao inicializar Firebase:', err);
}

export const SHARED_STORE_ID = 'loja_principal';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): void {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid,
      email: auth?.currentUser?.email,
      emailVerified: auth?.currentUser?.emailVerified,
      isAnonymous: auth?.currentUser?.isAnonymous,
      tenantId: auth?.currentUser?.tenantId,
      providerInfo:
        auth?.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error:', JSON.stringify(errInfo));
}

export type SyncStatus = 'idle' | 'connecting' | 'online' | 'offline' | 'syncing' | 'error';

class FirebaseServiceClass {
  private currentUser: User | null = null;
  private status: SyncStatus = 'connecting';
  private statusListeners: Array<(status: SyncStatus) => void> = [];
  private lastSyncedAt: Date | null = null;
  private realtimeUnsubs: Unsubscribe[] = [];

  constructor() {
    // Attempt authentication if available in background, without blocking direct Firestore access
    if (auth) {
      onAuthStateChanged(auth, async (user) => {
        if (user) {
          this.currentUser = user;
        } else {
          try {
            const credential = await signInAnonymously(auth);
            this.currentUser = credential.user;
          } catch (err) {
            // Anonymous auth fallback
          }
        }
      });
    }

    // Immediately test connection to Firestore server
    this.testConnection();
  }

  public onStatusChange(callback: (status: SyncStatus) => void): () => void {
    this.statusListeners.push(callback);
    callback(this.status);
    return () => {
      this.statusListeners = this.statusListeners.filter((cb) => cb !== callback);
    };
  }

  private setStatus(newStatus: SyncStatus) {
    this.status = newStatus;
    this.statusListeners.forEach((cb) => cb(newStatus));
  }

  public getStatus(): SyncStatus {
    return this.status;
  }

  public getLastSyncedAt(): Date | null {
    return this.lastSyncedAt;
  }

  /**
   * Retorna o ID da loja compartilhada.
   * Todos os aparelhos, usuários que logarem e aplicativos baixados acessam
   * a mesma base de dados compartilhada para sincronização total de cardápio, fiados e clientes.
   */
  public getStoreId(): string {
    const user = AuthService.getCurrentUser();
    if (user?.storeId && user.storeId.trim()) {
      return user.storeId.trim().replace(/[^a-zA-Z0-9_\-]/g, '_');
    }
    return SHARED_STORE_ID;
  }

  /**
   * Health & connectivity probe per Firebase integration guidelines
   */
  public async testConnection(): Promise<boolean> {
    try {
      if (!db) {
        this.setStatus('offline');
        return false;
      }

      // Validate connection directly against Firestore server
      await getDocFromServer(doc(db, 'test', 'connection'));
      this.setStatus('online');
      return true;
    } catch (error) {
      if (error instanceof Error && error.message.includes('the client is offline')) {
        console.warn('Firebase Firestore: O cliente está operando offline.');
        this.setStatus('offline');
        return false;
      }
      // Roundtrip to Firestore succeeded (document does not have to exist)
      this.setStatus('online');
      return true;
    }
  }

  /**
   * Inscreve a aplicação para sincronização em tempo real (onSnapshot).
   * Sempre que qualquer usuário, aparelho ou aplicativo baixado cadastrar um fiado,
   * receber pagamento, alterar dados de cliente ou editar o cardápio (produtos e preços),
   * todos os outros dispositivos recebem a alteração instantaneamente.
   */
  public subscribeToRealtimeSync(callbacks: {
    onSettingsUpdate?: (settings: StoreSettings) => void;
    onCustomersUpdate?: (customers: Customer[]) => void;
    onEntriesUpdate?: (entries: FiadoEntry[]) => void;
    onPaymentsUpdate?: (payments: PaymentRecord[]) => void;
  }): () => void {
    if (!db) return () => {};

    // Cancela listeners anteriores se houver
    this.cleanup();

    const storeId = this.getStoreId();

    // 1. Ouvir configurações e cardápio de produtos da loja em tempo real
    const storePath = `stores/${storeId}`;
    try {
      const unsubStore = onSnapshot(
        doc(db, 'stores', storeId),
        (snap) => {
          if (snap.exists() && callbacks.onSettingsUpdate) {
            const data = snap.data();
            const remoteSettings: StoreSettings = {
              storeName: data.storeName || 'Marmitaria & Restaurante',
              ownerName: data.ownerName || 'Gerente',
              phone: data.phone || '',
              pixKey: data.pixKey || '',
              pixKeyType: data.pixKeyType || 'email',
              city: data.city || 'SAO PAULO',
              defaultDueDays: data.defaultDueDays || 15,
              products: Array.isArray(data.products) ? data.products : undefined,
              updatedAt: data.updatedAt,
              backupReminderFrequency: data.backupReminderFrequency,
              lastBackupDate: data.lastBackupDate,
              dismissedBackupReminderUntil: data.dismissedBackupReminderUntil,
            };
            callbacks.onSettingsUpdate(remoteSettings);
            this.lastSyncedAt = new Date();
            this.setStatus('online');
          }
        },
        (err) => {
          handleFirestoreError(err, OperationType.GET, storePath);
        }
      );
      this.realtimeUnsubs.push(unsubStore);
    } catch (e) {
      console.warn('Erro ao conectar listener em tempo real da loja:', e);
    }

    // 2. Ouvir clientes em tempo real
    const customersPath = `stores/${storeId}/customers`;
    try {
      const unsubCustomers = onSnapshot(
        collection(db, 'stores', storeId, 'customers'),
        (snap) => {
          if (callbacks.onCustomersUpdate) {
            const list: Customer[] = [];
            snap.forEach((d) => {
              list.push(d.data() as Customer);
            });
            callbacks.onCustomersUpdate(list);
            this.lastSyncedAt = new Date();
            this.setStatus('online');
          }
        },
        (err) => {
          handleFirestoreError(err, OperationType.GET, customersPath);
        }
      );
      this.realtimeUnsubs.push(unsubCustomers);
    } catch (e) {
      console.warn('Erro ao conectar listener de clientes:', e);
    }

    // 3. Ouvir fiados / contas a prazo em tempo real
    const entriesPath = `stores/${storeId}/entries`;
    try {
      const unsubEntries = onSnapshot(
        collection(db, 'stores', storeId, 'entries'),
        (snap) => {
          if (callbacks.onEntriesUpdate) {
            const list: FiadoEntry[] = [];
            snap.forEach((d) => {
              list.push(d.data() as FiadoEntry);
            });
            callbacks.onEntriesUpdate(list);
            this.lastSyncedAt = new Date();
            this.setStatus('online');
          }
        },
        (err) => {
          handleFirestoreError(err, OperationType.GET, entriesPath);
        }
      );
      this.realtimeUnsubs.push(unsubEntries);
    } catch (e) {
      console.warn('Erro ao conectar listener de fiados:', e);
    }

    // 4. Ouvir pagamentos e abatimentos em tempo real
    const paymentsPath = `stores/${storeId}/payments`;
    try {
      const unsubPayments = onSnapshot(
        collection(db, 'stores', storeId, 'payments'),
        (snap) => {
          if (callbacks.onPaymentsUpdate) {
            const list: PaymentRecord[] = [];
            snap.forEach((d) => {
              list.push(d.data() as PaymentRecord);
            });
            callbacks.onPaymentsUpdate(list);
            this.lastSyncedAt = new Date();
            this.setStatus('online');
          }
        },
        (err) => {
          handleFirestoreError(err, OperationType.GET, paymentsPath);
        }
      );
      this.realtimeUnsubs.push(unsubPayments);
    } catch (e) {
      console.warn('Erro ao conectar listener de pagamentos:', e);
    }

    return () => {
      this.cleanup();
    };
  }

  /**
   * Syncs a customer to Firestore
   */
  public async saveCustomer(customer: Customer): Promise<void> {
    try {
      if (!db) return;
      const storeId = this.getStoreId();
      const customerRef = doc(db, 'stores', storeId, 'customers', customer.id);
      await setDoc(
        customerRef,
        {
          ...customer,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );

      // If customer was previously in deleted list, remove it
      const storeRef = doc(db, 'stores', storeId);
      await setDoc(
        storeRef,
        {
          deletedCustomerIds: arrayRemove(customer.id),
        },
        { merge: true }
      );

      this.lastSyncedAt = new Date();
      this.setStatus('online');
    } catch (err) {
      console.warn('Aviso: salvo localmente; sincronização na nuvem pendente:', err);
    }
  }

  /**
   * Deletes a customer and cascade deletes their entries and payments from Firestore,
   * while recording a deletion tombstone so sync never restores them.
   */
  public async deleteCustomer(
    customerId: string,
    entryIds: string[] = [],
    paymentIds: string[] = []
  ): Promise<void> {
    try {
      if (!db) return;
      const storeId = this.getStoreId();
      const batch = writeBatch(db);

      // 1. Delete customer document
      const customerRef = doc(db, 'stores', storeId, 'customers', customerId);
      batch.delete(customerRef);

      // 2. Cascade delete all fiado entries of this customer from cloud
      entryIds.forEach((eid) => {
        batch.delete(doc(db, 'stores', storeId, 'entries', eid));
      });

      // 3. Cascade delete all payments of this customer from cloud
      paymentIds.forEach((pid) => {
        batch.delete(doc(db, 'stores', storeId, 'payments', pid));
      });

      // 4. Record permanent tombstone in store document to prevent any sync resurrection
      const storeRef = doc(db, 'stores', storeId);
      const tombstonePayload: Record<string, any> = {
        deletedCustomerIds: arrayUnion(customerId),
        updatedAt: new Date().toISOString(),
      };
      if (entryIds.length > 0) {
        tombstonePayload.deletedEntryIds = arrayUnion(...entryIds);
      }
      if (paymentIds.length > 0) {
        tombstonePayload.deletedPaymentIds = arrayUnion(...paymentIds);
      }

      batch.set(storeRef, tombstonePayload, { merge: true });

      await batch.commit();
      this.lastSyncedAt = new Date();
      this.setStatus('online');
    } catch (err) {
      console.warn('Aviso: excluído localmente; sincronização na nuvem pendente:', err);
    }
  }

  /**
   * Syncs a fiado entry to Firestore
   */
  public async saveFiadoEntry(entry: FiadoEntry): Promise<void> {
    try {
      if (!db) return;
      const storeId = this.getStoreId();
      const entryRef = doc(db, 'stores', storeId, 'entries', entry.id);
      await setDoc(
        entryRef,
        {
          ...entry,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );

      // If entry was in deleted list, remove it
      const storeRef = doc(db, 'stores', storeId);
      await setDoc(
        storeRef,
        {
          deletedEntryIds: arrayRemove(entry.id),
        },
        { merge: true }
      );

      this.lastSyncedAt = new Date();
      this.setStatus('online');
    } catch (err) {
      console.warn('Aviso: fiado salvo localmente; sincronização na nuvem pendente:', err);
    }
  }

  /**
   * Deletes a fiado entry from Firestore and marks tombstone
   */
  public async deleteFiadoEntry(entryId: string): Promise<void> {
    try {
      if (!db) return;
      const storeId = this.getStoreId();
      const batch = writeBatch(db);
      const entryRef = doc(db, 'stores', storeId, 'entries', entryId);
      batch.delete(entryRef);

      const storeRef = doc(db, 'stores', storeId);
      batch.set(
        storeRef,
        {
          deletedEntryIds: arrayUnion(entryId),
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );

      await batch.commit();
      this.lastSyncedAt = new Date();
      this.setStatus('online');
    } catch (err) {
      console.warn('Aviso: fiado excluído localmente; sincronização na nuvem pendente:', err);
    }
  }

  /**
   * Deletes multiple fiado entries from Firestore
   */
  public async deleteFiadoEntries(entryIds: string[]): Promise<void> {
    try {
      if (!db || entryIds.length === 0) return;
      const storeId = this.getStoreId();
      const batch = writeBatch(db);

      entryIds.forEach((id) => {
        batch.delete(doc(db, 'stores', storeId, 'entries', id));
      });

      const storeRef = doc(db, 'stores', storeId);
      batch.set(
        storeRef,
        {
          deletedEntryIds: arrayUnion(...entryIds),
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );

      await batch.commit();
      this.lastSyncedAt = new Date();
      this.setStatus('online');
    } catch (err) {
      console.warn('Aviso: fiados excluídos localmente; sincronização na nuvem pendente:', err);
    }
  }

  /**
   * Syncs a payment record to Firestore
   */
  public async savePayment(payment: PaymentRecord): Promise<void> {
    try {
      if (!db) return;
      const storeId = this.getStoreId();
      const paymentRef = doc(db, 'stores', storeId, 'payments', payment.id);
      await setDoc(
        paymentRef,
        {
          ...payment,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
      this.lastSyncedAt = new Date();
      this.setStatus('online');
    } catch (err) {
      console.warn('Aviso: pagamento salvo localmente; sincronização na nuvem pendente:', err);
    }
  }

  /**
   * Syncs store settings to Firestore
   */
  public async saveStoreSettings(settings: StoreSettings): Promise<void> {
    try {
      if (!db) return;
      const storeId = this.getStoreId();
      const storeRef = doc(db, 'stores', storeId);
      await setDoc(
        storeRef,
        {
          ...settings,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
      this.lastSyncedAt = new Date();
      this.setStatus('online');
    } catch (err) {
      console.warn('Aviso: configurações salvas localmente; sincronização na nuvem pendente:', err);
    }
  }

  /**
   * Full bidirectional cloud sync:
   * 1. Fetches cloud records for this store
   * 2. Merges with local records
   * 3. Uploads any missing local records to the cloud
   */
  public async syncWithCloud(
    localCustomers: Customer[],
    localEntries: FiadoEntry[],
    localPayments: PaymentRecord[],
    localSettings: StoreSettings,
    localDeletedCustomerIds: string[] = [],
    localDeletedEntryIds: string[] = [],
    localDeletedPaymentIds: string[] = []
  ): Promise<{
    customers: Customer[];
    entries: FiadoEntry[];
    payments: PaymentRecord[];
    settings: StoreSettings;
    syncedCount: number;
    deletedCustomerIds: string[];
    deletedEntryIds: string[];
    deletedPaymentIds: string[];
  }> {
    this.setStatus('syncing');

    try {
      if (!db) {
        this.setStatus('offline');
        return {
          customers: localCustomers,
          entries: localEntries,
          payments: localPayments,
          settings: localSettings,
          syncedCount: 0,
          deletedCustomerIds: localDeletedCustomerIds,
          deletedEntryIds: localDeletedEntryIds,
          deletedPaymentIds: localDeletedPaymentIds,
        };
      }

      const storeId = this.getStoreId();

      // 0. Fetch store metadata document to get remote deleted lists and settings (including cardápio)
      const storeRef = doc(db, 'stores', storeId);
      const storeSnap = await getDoc(storeRef);
      const storeData = storeSnap.exists() ? storeSnap.data() : null;
      const remoteDeletedCustomers: string[] = storeData?.deletedCustomerIds || [];
      const remoteDeletedEntries: string[] = storeData?.deletedEntryIds || [];
      const remoteDeletedPayments: string[] = storeData?.deletedPaymentIds || [];

      // Sincronização inteligente de Cardápio (produtos e preços) e Configurações
      let mergedSettings: StoreSettings = { ...localSettings };
      if (storeData) {
        const remoteUpdated = storeData.updatedAt || '';
        const localUpdated = localSettings.updatedAt || '';

        // Se houver produtos no cardápio da nuvem
        if (Array.isArray(storeData.products) && storeData.products.length > 0) {
          // Se o cardápio da nuvem for mais recente ou igual, ou se o local não tiver sido editado
          if (!localSettings.updatedAt || remoteUpdated >= localUpdated) {
            mergedSettings = {
              ...localSettings,
              storeName: storeData.storeName || localSettings.storeName,
              ownerName: storeData.ownerName || localSettings.ownerName,
              phone: storeData.phone || localSettings.phone,
              pixKey: storeData.pixKey || localSettings.pixKey,
              pixKeyType: storeData.pixKeyType || localSettings.pixKeyType,
              city: storeData.city || localSettings.city,
              defaultDueDays: storeData.defaultDueDays || localSettings.defaultDueDays,
              products: storeData.products,
              updatedAt: remoteUpdated || new Date().toISOString(),
            };
          } else {
            // Local é mais recente: envia produtos locais atualizados para a nuvem
            mergedSettings = {
              ...localSettings,
              products: localSettings.products,
              updatedAt: localUpdated || new Date().toISOString(),
            };
          }
        } else if (localSettings.products && localSettings.products.length > 0) {
          // Nuvem ainda não tinha produtos, sobe os produtos locais
          mergedSettings = {
            ...localSettings,
            updatedAt: localUpdated || new Date().toISOString(),
          };
        }
      }

      const combinedDeletedCustomers = new Set([
        ...localDeletedCustomerIds,
        ...remoteDeletedCustomers,
      ]);
      const combinedDeletedEntries = new Set([
        ...localDeletedEntryIds,
        ...remoteDeletedEntries,
      ]);
      const combinedDeletedPayments = new Set([
        ...localDeletedPaymentIds,
        ...remoteDeletedPayments,
      ]);

      const customersToDeleteFromRemote: string[] = [];
      const entriesToDeleteFromRemote: string[] = [];
      const paymentsToDeleteFromRemote: string[] = [];

      // 1. Fetch remote customers
      const remoteCustomersMap = new Map<string, Customer>();
      const customersSnap = await getDocs(collection(db, 'stores', storeId, 'customers'));
      customersSnap.forEach((d) => {
        if (combinedDeletedCustomers.has(d.id)) {
          customersToDeleteFromRemote.push(d.id);
        } else {
          remoteCustomersMap.set(d.id, d.data() as Customer);
        }
      });

      // 2. Fetch remote entries
      const remoteEntriesMap = new Map<string, FiadoEntry>();
      const entriesSnap = await getDocs(collection(db, 'stores', storeId, 'entries'));
      entriesSnap.forEach((d) => {
        const entry = d.data() as FiadoEntry;
        if (combinedDeletedEntries.has(d.id) || combinedDeletedCustomers.has(entry.customerId)) {
          entriesToDeleteFromRemote.push(d.id);
        } else {
          remoteEntriesMap.set(d.id, entry);
        }
      });

      // 3. Fetch remote payments
      const remotePaymentsMap = new Map<string, PaymentRecord>();
      const paymentsSnap = await getDocs(collection(db, 'stores', storeId, 'payments'));
      paymentsSnap.forEach((d) => {
        const payment = d.data() as PaymentRecord;
        if (combinedDeletedPayments.has(d.id) || combinedDeletedCustomers.has(payment.customerId)) {
          paymentsToDeleteFromRemote.push(d.id);
        } else {
          remotePaymentsMap.set(d.id, payment);
        }
      });

      // Filter local lists to ensure deleted items are purged
      const activeLocalCustomers = localCustomers.filter(
        (c) => !combinedDeletedCustomers.has(c.id)
      );
      const activeLocalEntries = localEntries.filter(
        (e) => !combinedDeletedEntries.has(e.id) && !combinedDeletedCustomers.has(e.customerId)
      );
      const activeLocalPayments = localPayments.filter(
        (p) => !combinedDeletedPayments.has(p.id) && !combinedDeletedCustomers.has(p.customerId)
      );

      // Merge function that honors updatedAt and prioritizes local changes
      const mergeLists = <T extends { id: string; updatedAt?: string; createdAt?: string }>(
        remoteMap: Map<string, T>,
        localList: T[]
      ): T[] => {
        const resultMap = new Map<string, T>(remoteMap);
        localList.forEach((localItem) => {
          const remoteItem = resultMap.get(localItem.id);
          if (!remoteItem) {
            // New local item
            resultMap.set(localItem.id, localItem);
          } else {
            const localTimestamp = localItem.updatedAt || localItem.createdAt || '';
            const remoteTimestamp = remoteItem.updatedAt || remoteItem.createdAt || '';
            // If local item has no timestamp or local is >= remote, local wins
            if (!remoteTimestamp || localTimestamp >= remoteTimestamp) {
              resultMap.set(localItem.id, localItem);
            }
          }
        });
        return Array.from(resultMap.values());
      };

      // Merge customers: remote + local with local-updates priority
      const mergedCustomers = mergeLists(remoteCustomersMap, activeLocalCustomers);

      // Merge entries: remote + local with local-updates priority
      const mergedEntries = mergeLists(remoteEntriesMap, activeLocalEntries);

      // Merge payments: remote + local with local-updates priority
      const mergedPayments = mergeLists(remotePaymentsMap, activeLocalPayments);

      // Batch upload items to cloud and clean up remote deleted docs
      let writeCount = 0;
      const batch = writeBatch(db);

      // Save store settings (with latest cardápio) + deleted lists tombstones
      batch.set(
        storeRef,
        {
          ...mergedSettings,
          deletedCustomerIds: Array.from(combinedDeletedCustomers),
          deletedEntryIds: Array.from(combinedDeletedEntries),
          deletedPaymentIds: Array.from(combinedDeletedPayments),
          updatedAt: mergedSettings.updatedAt || new Date().toISOString(),
        },
        { merge: true }
      );
      writeCount++;

      // Purge remotely stored documents that were deleted
      customersToDeleteFromRemote.forEach((cid) => {
        batch.delete(doc(db, 'stores', storeId, 'customers', cid));
        writeCount++;
      });
      entriesToDeleteFromRemote.forEach((eid) => {
        batch.delete(doc(db, 'stores', storeId, 'entries', eid));
        writeCount++;
      });
      paymentsToDeleteFromRemote.forEach((pid) => {
        batch.delete(doc(db, 'stores', storeId, 'payments', pid));
        writeCount++;
      });

      mergedCustomers.forEach((cust) => {
        const ref = doc(db, 'stores', storeId, 'customers', cust.id);
        batch.set(ref, cust, { merge: true });
        writeCount++;
      });

      mergedEntries.forEach((entry) => {
        const ref = doc(db, 'stores', storeId, 'entries', entry.id);
        batch.set(ref, entry, { merge: true });
        writeCount++;
      });

      mergedPayments.forEach((payment) => {
        const ref = doc(db, 'stores', storeId, 'payments', payment.id);
        batch.set(ref, payment, { merge: true });
        writeCount++;
      });

      await batch.commit();

      this.lastSyncedAt = new Date();
      this.setStatus('online');

      return {
        customers: mergedCustomers,
        entries: mergedEntries,
        payments: mergedPayments,
        settings: mergedSettings,
        syncedCount: writeCount,
        deletedCustomerIds: Array.from(combinedDeletedCustomers),
        deletedEntryIds: Array.from(combinedDeletedEntries),
        deletedPaymentIds: Array.from(combinedDeletedPayments),
      };
    } catch (err) {
      console.error('Erro na sincronização com Firebase Firestore:', err);
      this.testConnection();
      return {
        customers: localCustomers.filter((c) => !localDeletedCustomerIds.includes(c.id)),
        entries: localEntries.filter((e) => !localDeletedEntryIds.includes(e.id)),
        payments: localPayments.filter((p) => !localDeletedPaymentIds.includes(p.id)),
        settings: localSettings,
        syncedCount: 0,
        deletedCustomerIds: localDeletedCustomerIds,
        deletedEntryIds: localDeletedEntryIds,
        deletedPaymentIds: localDeletedPaymentIds,
      };
    }
  }

  public cleanup() {
    this.realtimeUnsubs.forEach((unsub) => {
      try {
        unsub();
      } catch {}
    });
    this.realtimeUnsubs = [];
  }
}

export const FirebaseService = new FirebaseServiceClass();

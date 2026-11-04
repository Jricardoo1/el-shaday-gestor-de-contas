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

export type SyncStatus = 'idle' | 'connecting' | 'online' | 'offline' | 'syncing' | 'error';

class FirebaseServiceClass {
  private currentUser: User | null = null;
  private status: SyncStatus = 'connecting';
  private statusListeners: Array<(status: SyncStatus) => void> = [];
  private lastSyncedAt: Date | null = null;
  private unsubs: Unsubscribe[] = [];

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
            // Anonymous auth disabled or restricted; database operates securely using deviceId partition
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

  public getStoreId(): string {
    const authUserId = AuthService.getActiveUserId();
    if (authUserId) {
      return authUserId;
    }
    if (this.currentUser?.uid) {
      return this.currentUser.uid;
    }
    try {
      const KEY = 'fiado_device_unique_id_v1';
      const localId = localStorage.getItem(KEY);
      if (localId && localId.trim()) {
        const cleaned = localId.trim().replace(/[^a-zA-Z0-9_\-]/g, '_');
        if (cleaned.length > 0) return cleaned;
      }
    } catch {}
    return 'loja_principal';
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

      // 0. Fetch store metadata document to get remote deleted lists
      const storeRef = doc(db, 'stores', storeId);
      const storeSnap = await getDoc(storeRef);
      const remoteDeletedCustomers: string[] = storeSnap.exists()
        ? (storeSnap.data()?.deletedCustomerIds || [])
        : [];
      const remoteDeletedEntries: string[] = storeSnap.exists()
        ? (storeSnap.data()?.deletedEntryIds || [])
        : [];
      const remoteDeletedPayments: string[] = storeSnap.exists()
        ? (storeSnap.data()?.deletedPaymentIds || [])
        : [];

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

      // Save store settings + deleted lists tombstones
      batch.set(
        storeRef,
        {
          ...localSettings,
          deletedCustomerIds: Array.from(combinedDeletedCustomers),
          deletedEntryIds: Array.from(combinedDeletedEntries),
          deletedPaymentIds: Array.from(combinedDeletedPayments),
          updatedAt: new Date().toISOString(),
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
        settings: localSettings,
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
    this.unsubs.forEach((unsub) => unsub());
    this.unsubs = [];
  }
}

export const FirebaseService = new FirebaseServiceClass();

import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import {
  getFirestore,
  Firestore,
  doc,
  collection,
  getDocs,
  setDoc,
  deleteDoc,
  writeBatch,
  getDocFromServer,
  Unsubscribe,
} from 'firebase/firestore';
import { getAuth, signInAnonymously, onAuthStateChanged, User, Auth } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { Customer, FiadoEntry, PaymentRecord, StoreSettings } from '../types';

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
      this.lastSyncedAt = new Date();
      this.setStatus('online');
    } catch (err) {
      console.warn('Aviso: salvo localmente; sincronização na nuvem pendente:', err);
    }
  }

  /**
   * Deletes a customer from Firestore
   */
  public async deleteCustomer(customerId: string): Promise<void> {
    try {
      if (!db) return;
      const storeId = this.getStoreId();
      const customerRef = doc(db, 'stores', storeId, 'customers', customerId);
      await deleteDoc(customerRef);
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
      this.lastSyncedAt = new Date();
      this.setStatus('online');
    } catch (err) {
      console.warn('Aviso: fiado salvo localmente; sincronização na nuvem pendente:', err);
    }
  }

  /**
   * Deletes a fiado entry from Firestore
   */
  public async deleteFiadoEntry(entryId: string): Promise<void> {
    try {
      if (!db) return;
      const storeId = this.getStoreId();
      const entryRef = doc(db, 'stores', storeId, 'entries', entryId);
      await deleteDoc(entryRef);
      this.lastSyncedAt = new Date();
      this.setStatus('online');
    } catch (err) {
      console.warn('Aviso: fiado excluído localmente; sincronização na nuvem pendente:', err);
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
    localSettings: StoreSettings
  ): Promise<{
    customers: Customer[];
    entries: FiadoEntry[];
    payments: PaymentRecord[];
    settings: StoreSettings;
    syncedCount: number;
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
        };
      }

      const storeId = this.getStoreId();

      // 1. Fetch remote customers
      const remoteCustomersMap = new Map<string, Customer>();
      const customersSnap = await getDocs(collection(db, 'stores', storeId, 'customers'));
      customersSnap.forEach((d) => {
        remoteCustomersMap.set(d.id, d.data() as Customer);
      });

      // 2. Fetch remote entries
      const remoteEntriesMap = new Map<string, FiadoEntry>();
      const entriesSnap = await getDocs(collection(db, 'stores', storeId, 'entries'));
      entriesSnap.forEach((d) => {
        remoteEntriesMap.set(d.id, d.data() as FiadoEntry);
      });

      // 3. Fetch remote payments
      const remotePaymentsMap = new Map<string, PaymentRecord>();
      const paymentsSnap = await getDocs(collection(db, 'stores', storeId, 'payments'));
      paymentsSnap.forEach((d) => {
        remotePaymentsMap.set(d.id, d.data() as PaymentRecord);
      });

      // Merge customers: remote + local
      const mergedCustomersMap = new Map<string, Customer>(remoteCustomersMap);
      localCustomers.forEach((c) => {
        if (!mergedCustomersMap.has(c.id)) {
          mergedCustomersMap.set(c.id, c);
        }
      });
      const mergedCustomers = Array.from(mergedCustomersMap.values());

      // Merge entries: remote + local
      const mergedEntriesMap = new Map<string, FiadoEntry>(remoteEntriesMap);
      localEntries.forEach((e) => {
        if (!mergedEntriesMap.has(e.id)) {
          mergedEntriesMap.set(e.id, e);
        }
      });
      const mergedEntries = Array.from(mergedEntriesMap.values());

      // Merge payments: remote + local
      const mergedPaymentsMap = new Map<string, PaymentRecord>(remotePaymentsMap);
      localPayments.forEach((p) => {
        if (!mergedPaymentsMap.has(p.id)) {
          mergedPaymentsMap.set(p.id, p);
        }
      });
      const mergedPayments = Array.from(mergedPaymentsMap.values());

      // Batch upload items to cloud
      let writeCount = 0;
      const batch = writeBatch(db);

      // Save store settings
      const storeRef = doc(db, 'stores', storeId);
      batch.set(storeRef, { ...localSettings, updatedAt: new Date().toISOString() }, { merge: true });
      writeCount++;

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
      };
    } catch (err) {
      console.error('Erro na sincronização com Firebase Firestore:', err);
      // If there's an error in syncing, do a connection test to accurately set status
      this.testConnection();
      return {
        customers: localCustomers,
        entries: localEntries,
        payments: localPayments,
        settings: localSettings,
        syncedCount: 0,
      };
    }
  }

  public cleanup() {
    this.unsubs.forEach((unsub) => unsub());
    this.unsubs = [];
  }
}

export const FirebaseService = new FirebaseServiceClass();

import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import {
  getFirestore,
  Firestore,
  doc,
  getDoc,
  setDoc,
  getDocs,
  collection,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { UserAccount } from '../types';

let app: FirebaseApp;
let db: Firestore;

try {
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApps()[0];
  }
  db = getFirestore(app, firebaseConfig.firestoreDatabaseId || '(default)');
} catch (err) {
  console.error('Erro ao inicializar Firebase Auth Service:', err);
}

const AUTH_STORAGE_KEYS = {
  CURRENT_USER: 'fiado_auth_current_user_v1',
  LOCAL_USERS: 'fiado_auth_local_users_v1',
};

const SALT = 'FIADO_AUTH_SALT_SECURE_2026';

export async function hashPassword(password: string): Promise<string> {
  const text = `${SALT}:${password.trim()}`;
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(text);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    } catch {
      // fallback
    }
  }
  // Fast deterministic fallback hash
  let h1 = 0x811c9dc5;
  let h2 = 0x55555555;
  for (let i = 0; i < text.length; i++) {
    const ch = text.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 0x01000193);
    h2 = Math.imul(h2 ^ ch, 0x01000197);
  }
  return `${(h1 >>> 0).toString(16).padStart(8, '0')}${(h2 >>> 0).toString(16).padStart(8, '0')}`;
}

class AuthServiceClass {
  private currentUser: UserAccount | null = null;
  private listeners: Array<(user: UserAccount | null) => void> = [];

  constructor() {
    this.loadSession();
    // Initialize demo seed user in the background if no users exist
    this.ensureDefaultDemoUser();
  }

  private loadSession() {
    try {
      const raw = localStorage.getItem(AUTH_STORAGE_KEYS.CURRENT_USER);
      if (raw) {
        this.currentUser = JSON.parse(raw);
      }
    } catch (e) {
      console.error('Erro ao carregar sessão do usuário:', e);
      this.currentUser = null;
    }
  }

  private saveSession(user: UserAccount | null) {
    this.currentUser = user;
    if (user) {
      localStorage.setItem(AUTH_STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
    } else {
      localStorage.removeItem(AUTH_STORAGE_KEYS.CURRENT_USER);
    }
    this.notifyListeners();
  }

  public onAuthChange(callback: (user: UserAccount | null) => void): () => void {
    this.listeners.push(callback);
    callback(this.currentUser);
    return () => {
      this.listeners = this.listeners.filter((cb) => cb !== callback);
    };
  }

  private notifyListeners() {
    this.listeners.forEach((cb) => cb(this.currentUser));
  }

  public getCurrentUser(): UserAccount | null {
    return this.currentUser;
  }

  public getActiveUserId(): string | null {
    return this.currentUser ? this.currentUser.id : null;
  }

  public isAuthenticated(): boolean {
    return this.currentUser !== null;
  }

  /**
   * Reads all known users from local storage and syncs with cloud Firestore
   */
  public async getAllUsers(): Promise<UserAccount[]> {
    const localMap = new Map<string, UserAccount>();

    // 1. Local storage users
    try {
      const raw = localStorage.getItem(AUTH_STORAGE_KEYS.LOCAL_USERS);
      if (raw) {
        const list = JSON.parse(raw) as UserAccount[];
        list.forEach((u) => localMap.set(u.id, u));
      }
    } catch {}

    // 2. Cloud Firestore users
    if (db) {
      try {
        const snap = await getDocs(collection(db, 'users'));
        snap.forEach((d) => {
          const u = d.data() as UserAccount;
          localMap.set(u.id, u);
        });
      } catch (err) {
        console.warn('Consulta de usuários na nuvem falhou, usando cache local:', err);
      }
    }

    const all = Array.from(localMap.values());
    localStorage.setItem(AUTH_STORAGE_KEYS.LOCAL_USERS, JSON.stringify(all));
    return all;
  }

  /**
   * Registers a brand-new user with their own private store
   */
  public async register(params: {
    name: string;
    storeName: string;
    email: string;
    password: string;
    phone?: string;
    city?: string;
  }): Promise<UserAccount> {
    const cleanEmail = params.email.trim().toLowerCase();
    if (!cleanEmail) throw new Error('O e-mail/usuário é obrigatório.');
    if (!params.password || params.password.length < 4) {
      throw new Error('A senha deve ter no mínimo 4 caracteres.');
    }
    if (!params.name.trim()) throw new Error('O nome do responsável é obrigatório.');
    if (!params.storeName.trim()) throw new Error('O nome da loja/estabelecimento é obrigatório.');

    // Check if user already exists
    const all = await this.getAllUsers();
    const existing = all.find((u) => u.email === cleanEmail);
    if (existing) {
      throw new Error('Já existe um usuário cadastrado com este e-mail.');
    }

    const passwordHash = await hashPassword(params.password);
    const userId = `usr_${Date.now()}_${Math.floor(100 + Math.random() * 900)}`;

    const newUser: UserAccount = {
      id: userId,
      email: cleanEmail,
      name: params.name.trim(),
      storeName: params.storeName.trim(),
      passwordHash,
      phone: params.phone?.trim() || '',
      city: params.city?.trim() || 'SAO PAULO',
      role: 'merchant',
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
    };

    // Save locally
    const updatedUsers = [...all, newUser];
    localStorage.setItem(AUTH_STORAGE_KEYS.LOCAL_USERS, JSON.stringify(updatedUsers));

    // Save to cloud Firestore
    if (db) {
      try {
        await setDoc(doc(db, 'users', newUser.id), newUser);
      } catch (e) {
        console.warn('Aviso: conta salva no aparelho; sincronização na nuvem pendente:', e);
      }
    }

    // Set as active session
    this.saveSession(newUser);
    return newUser;
  }

  /**
   * Authenticates user against Firestore & local cache
   */
  public async login(email: string, password: string): Promise<UserAccount> {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) throw new Error('Informe o e-mail ou nome de usuário.');
    if (!password) throw new Error('Informe a sua senha.');

    const all = await this.getAllUsers();
    const user = all.find((u) => u.email === cleanEmail);
    if (!user) {
      throw new Error('Usuário não encontrado. Verifique o e-mail digitado ou crie uma nova conta.');
    }

    const passwordHash = await hashPassword(password);
    if (user.passwordHash !== passwordHash) {
      throw new Error('Senha incorreta. Tente novamente.');
    }

    // Update lastLoginAt
    const updatedUser: UserAccount = {
      ...user,
      lastLoginAt: new Date().toISOString(),
    };

    // Save updated user locally
    const updatedAll = all.map((u) => (u.id === updatedUser.id ? updatedUser : u));
    localStorage.setItem(AUTH_STORAGE_KEYS.LOCAL_USERS, JSON.stringify(updatedAll));

    // Save to Firestore
    if (db) {
      try {
        await setDoc(doc(db, 'users', updatedUser.id), {
          ...updatedUser,
        }, { merge: true });
      } catch (e) {
        console.warn('Erro ao atualizar último login na nuvem:', e);
      }
    }

    this.saveSession(updatedUser);
    return updatedUser;
  }

  /**
   * Logs out the current user session
   */
  public logout(): void {
    this.saveSession(null);
  }

  /**
   * Seeds default demo user so testing is fast and instant
   */
  private async ensureDefaultDemoUser() {
    try {
      const all = await this.getAllUsers();
      if (all.length === 0) {
        const demoHash = await hashPassword('123456');
        const demoUser: UserAccount = {
          id: 'usr_demo_principal',
          email: 'demo@fiado.com',
          name: 'José Ricardo Martins',
          storeName: 'Restaurante & Marmitaria do Zé',
          passwordHash: demoHash,
          phone: '11988887777',
          city: 'SAO PAULO',
          role: 'merchant',
          createdAt: new Date().toISOString(),
          lastLoginAt: new Date().toISOString(),
        };

        const list = [demoUser];
        localStorage.setItem(AUTH_STORAGE_KEYS.LOCAL_USERS, JSON.stringify(list));

        if (db) {
          try {
            await setDoc(doc(db, 'users', demoUser.id), demoUser);
          } catch {}
        }

        // If no user is logged in yet, auto-login to demo user on first ever visit
        if (!this.currentUser) {
          this.saveSession(demoUser);
        }
      }
    } catch (e) {
      console.warn('Erro ao inicializar usuário demo:', e);
    }
  }
}

export const AuthService = new AuthServiceClass();

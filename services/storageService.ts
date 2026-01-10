
import { ExamSession } from '../types';

const DB_NAME = 'ExamMasterDB';
const STORE_NAME = 'sessions';
const DB_VERSION = 1;
const CLOUD_MOCK_PREFIX = 'EM_CLOUD_STORAGE_';

export class StorageService {
  private static openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      request.onupgradeneeded = (event) => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      };
    });
  }

  static async saveSessions(sessions: ExamSession[]): Promise<void> {
    const db = await this.openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    
    await new Promise<void>((resolve, reject) => {
      const clearReq = store.clear();
      clearReq.onsuccess = () => resolve();
      clearReq.onerror = () => reject(clearReq.error);
    });

    for (const session of sessions) {
      store.add(session);
    }

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  static async loadSessions(): Promise<ExamSession[]> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  // Funzione per generare un codice di trasferimento per altri dispositivi
  static async generateTransferCode(): Promise<string> {
    const sessions = await this.loadSessions();
    const data = {
      sessions,
      exportedAt: Date.now(),
      v: "1.0"
    };
    // Codifica in Base64 per facilitare il copia-incolla
    return btoa(unescape(encodeURIComponent(JSON.stringify(data))));
  }

  // Funzione per importare dati da un altro dispositivo
  static async importFromTransferCode(code: string): Promise<ExamSession[]> {
    try {
      const decoded = JSON.parse(decodeURIComponent(escape(atob(code))));
      if (decoded.sessions) {
        await this.saveSessions(decoded.sessions);
        return decoded.sessions;
      }
      throw new Error("Formato codice non valido");
    } catch (e) {
      throw new Error("Codice di sincronizzazione non valido o corrotto");
    }
  }

  static async pushToCloud(userEmail: string, sessions: ExamSession[]): Promise<void> {
    const cloudKey = CLOUD_MOCK_PREFIX + userEmail.toLowerCase();
    const data = JSON.stringify({
      sessions,
      lastSync: Date.now()
    });
    localStorage.setItem(cloudKey, data);
  }

  static async pullFromCloud(userEmail: string): Promise<ExamSession[] | null> {
    const cloudKey = CLOUD_MOCK_PREFIX + userEmail.toLowerCase();
    const cloudData = localStorage.getItem(cloudKey);
    if (!cloudData) return null;
    
    try {
      const parsed = JSON.parse(cloudData);
      if (parsed.sessions) {
        await this.saveSessions(parsed.sessions);
        return parsed.sessions;
      }
    } catch (e) {
      console.error("Cloud Pull Error", e);
    }
    return null;
  }
}


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

  /**
   * Genera un codice Base64 robusto che supporta UTF-8 (caratteri speciali)
   */
  static async generateTransferCode(): Promise<string> {
    try {
      const sessions = await this.loadSessions();
      const data = {
        sessions,
        exportedAt: Date.now(),
        v: "1.1"
      };
      
      const json = JSON.stringify(data);
      const bytes = new TextEncoder().encode(json);
      let binString = "";
      // Convertiamo i bytes in stringa binaria in modo sicuro per btoa
      for (let i = 0; i < bytes.length; i++) {
        binString += String.fromCharCode(bytes[i]);
      }
      return btoa(binString);
    } catch (e) {
      console.error("Errore generazione codice sync:", e);
      throw new Error("Impossibile generare il codice. Forse i dati sono troppo grandi.");
    }
  }

  /**
   * Importa dati da un codice Base64 gestendo correttamente UTF-8
   */
  static async importFromTransferCode(code: string): Promise<ExamSession[]> {
    try {
      const binString = atob(code.trim().replace(/\s/g, ''));
      const bytes = new Uint8Array(binString.length);
      for (let i = 0; i < binString.length; i++) {
        bytes[i] = binString.charCodeAt(i);
      }
      const json = new TextDecoder().decode(bytes);
      const decoded = JSON.parse(json);
      
      if (decoded.sessions && Array.isArray(decoded.sessions)) {
        await this.saveSessions(decoded.sessions);
        return decoded.sessions;
      }
      throw new Error("Formato sessioni non valido");
    } catch (e) {
      console.error("Errore importazione codice sync:", e);
      throw new Error("Codice di sincronizzazione non valido o corrotto. Assicurati di averlo copiato tutto.");
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

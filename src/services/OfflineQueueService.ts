/**
 * OfflineQueueService — Gestion des files d'attente pour la synchronisation via IndexedDB
 * Permet de stocker les inspections et actions quand le réseau est indisponible.
 * Utilise IndexedDB pour dépasser la limite de 5Mo du localStorage.
 */

const DB_NAME = 'smartinspect_offline_db';
const DB_VERSION = 1;
const STORE_NAME = 'inspection_queue';

export interface QueuedInspection {
    id: string;               // Identifiant temporaire (local)
    siteId: string;
    siteName: string;
    data: any;                // Données complètes du questionnaire
    timestamp: number;
    attempts: number;         // Nombre de tentatives de synchro
    lastError?: string;
}

export class OfflineQueueService {
    private static db: IDBDatabase | null = null;

    /** Initialise la connexion à IndexedDB */
    private static async getDB(): Promise<IDBDatabase> {
        if (this.db) return this.db;

        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onupgradeneeded = (event: any) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    db.createObjectStore(STORE_NAME, { keyPath: 'id' });
                }
            };

            request.onsuccess = (event: any) => {
                this.db = event.target.result;
                resolve(this.db!);
            };

            request.onerror = (event: any) => {
                console.error("[OfflineQueue] Erreur ouverture DB:", event.target.error);
                reject(event.target.error);
            };
        });
    }

    /** Ajoute une inspection à la file d'attente locale */
    static async enqueueInspection(siteId: string, siteName: string, data: any): Promise<string> {
        const db = await this.getDB();
        const id = `local-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

        const item: QueuedInspection = {
            id,
            siteId,
            siteName,
            data,
            timestamp: Date.now(),
            attempts: 0
        };

        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.add(item);

            request.onsuccess = () => resolve(id);
            request.onerror = () => reject(request.error);
        });
    }

    /** Récupère toutes les inspections en attente */
    static async getInspectionQueue(): Promise<QueuedInspection[]> {
        const db = await this.getDB();

        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORE_NAME], 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.getAll();

            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(request.error);
        });
    }

    /** Supprime un élément de la file (après succès) */
    static async dequeueInspection(id: string): Promise<void> {
        const db = await this.getDB();

        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.delete(id);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    /** Met à jour un élément (ex: incrémenter les tentatives) */
    static async updateItem(id: string, updates: Partial<QueuedInspection>): Promise<void> {
        const db = await this.getDB();

        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);

            // On récupère d'abord l'item existant
            const getRequest = store.get(id);

            getRequest.onsuccess = () => {
                const item = getRequest.result;
                if (!item) {
                    reject(new Error("Élément introuvable"));
                    return;
                }

                const updatedItem = { ...item, ...updates };
                const putRequest = store.put(updatedItem);

                putRequest.onsuccess = () => resolve();
                putRequest.onerror = () => reject(putRequest.error);
            };

            getRequest.onerror = () => reject(getRequest.error);
        });
    }

    /** Nombre d'éléments en attente */
    static async getQueueCount(): Promise<number> {
        const db = await this.getDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([STORE_NAME], 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.count();

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }
}


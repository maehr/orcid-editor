/**
 * IndexedDB utilities for storing works, snapshots, and logs
 */

import { Work } from '../types/work';

const DB_NAME = 'orcid-works-manager';
const DB_VERSION = 1;

// Store names
const WORKS_STORE = 'works';
const SNAPSHOTS_STORE = 'snapshots';
const LOGS_STORE = 'logs';

export interface Snapshot {
  id: string;
  timestamp: string;
  works: Work[];
  description?: string;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  action: string;
  details: unknown;
}

/**
 * Initialize the IndexedDB database
 */
export function initDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(new Error('Failed to open IndexedDB'));
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Works store
      if (!db.objectStoreNames.contains(WORKS_STORE)) {
        const worksStore = db.createObjectStore(WORKS_STORE, { keyPath: 'id' });
        worksStore.createIndex('putCode', 'putCode', { unique: false });
        worksStore.createIndex('importSource', 'importSource', { unique: false });
        worksStore.createIndex('lastModified', 'lastModified', { unique: false });
      }

      // Snapshots store
      if (!db.objectStoreNames.contains(SNAPSHOTS_STORE)) {
        const snapshotsStore = db.createObjectStore(SNAPSHOTS_STORE, { keyPath: 'id' });
        snapshotsStore.createIndex('timestamp', 'timestamp', { unique: false });
      }

      // Logs store
      if (!db.objectStoreNames.contains(LOGS_STORE)) {
        const logsStore = db.createObjectStore(LOGS_STORE, { keyPath: 'id' });
        logsStore.createIndex('timestamp', 'timestamp', { unique: false });
        logsStore.createIndex('action', 'action', { unique: false });
      }
    };
  });
}

/**
 * Save a work to the database
 */
export async function saveWork(work: Work): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([WORKS_STORE], 'readwrite');
    const store = transaction.objectStore(WORKS_STORE);
    
    work.lastModified = new Date().toISOString();
    const request = store.put(work);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(new Error('Failed to save work'));
  });
}

/**
 * Save multiple works in a single transaction
 */
export async function saveWorks(works: Work[]): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([WORKS_STORE], 'readwrite');
    const store = transaction.objectStore(WORKS_STORE);
    
    const timestamp = new Date().toISOString();
    
    works.forEach(work => {
      work.lastModified = timestamp;
      store.put(work);
    });

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(new Error('Failed to save works'));
  });
}

/**
 * Get all works from the database
 */
export async function getAllWorks(): Promise<Work[]> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([WORKS_STORE], 'readonly');
    const store = transaction.objectStore(WORKS_STORE);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error('Failed to get works'));
  });
}

/**
 * Get a single work by ID
 */
export async function getWork(id: string): Promise<Work | undefined> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([WORKS_STORE], 'readonly');
    const store = transaction.objectStore(WORKS_STORE);
    const request = store.get(id);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error('Failed to get work'));
  });
}

/**
 * Delete a work by ID
 */
export async function deleteWork(id: string): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([WORKS_STORE], 'readwrite');
    const store = transaction.objectStore(WORKS_STORE);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(new Error('Failed to delete work'));
  });
}

/**
 * Clear all works from the database
 */
export async function clearWorks(): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([WORKS_STORE], 'readwrite');
    const store = transaction.objectStore(WORKS_STORE);
    const request = store.clear();

    request.onsuccess = () => resolve();
    request.onerror = () => reject(new Error('Failed to clear works'));
  });
}

/**
 * Create a snapshot of current works
 */
export async function createSnapshot(description?: string): Promise<string> {
  const works = await getAllWorks();
  const snapshot: Snapshot = {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    works,
    description,
  };

  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([SNAPSHOTS_STORE], 'readwrite');
    const store = transaction.objectStore(SNAPSHOTS_STORE);
    const request = store.put(snapshot);

    request.onsuccess = () => resolve(snapshot.id);
    request.onerror = () => reject(new Error('Failed to create snapshot'));
  });
}

/**
 * Get all snapshots
 */
export async function getSnapshots(): Promise<Snapshot[]> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([SNAPSHOTS_STORE], 'readonly');
    const store = transaction.objectStore(SNAPSHOTS_STORE);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error('Failed to get snapshots'));
  });
}

/**
 * Log an action
 */
export async function logAction(action: string, details: unknown): Promise<void> {
  const log: LogEntry = {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    action,
    details,
  };

  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([LOGS_STORE], 'readwrite');
    const store = transaction.objectStore(LOGS_STORE);
    const request = store.put(log);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(new Error('Failed to log action'));
  });
}

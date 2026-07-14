import type { Fragrance } from "@/lib/types/fragrance";

const LEGACY_LS_KEY = "scent_collection_v1";
const DB_NAME = "scent_offline_v1";
const DB_VERSION = 1;
const STORE = "collection";
const COLLECTION_KEY = "items";

type CacheResult = Fragrance[];

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function openDb(): Promise<IDBDatabase | null> {
  if (!isBrowser() || typeof indexedDB === "undefined") {
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE);
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
      request.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function idbGet(): Promise<CacheResult | null> {
  const db = await openDb();
  if (!db) return null;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE, "readonly");
      const store = tx.objectStore(STORE);
      const request = store.get(COLLECTION_KEY);

      request.onsuccess = () => {
        const value = request.result;
        resolve(Array.isArray(value) ? (value as Fragrance[]) : null);
      };
      request.onerror = () => resolve(null);
      tx.oncomplete = () => db.close();
      tx.onerror = () => {
        db.close();
        resolve(null);
      };
    } catch {
      try {
        db.close();
      } catch {
        /* ignore */
      }
      resolve(null);
    }
  });
}

async function idbSet(items: Fragrance[]): Promise<boolean> {
  const db = await openDb();
  if (!db) return false;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE, "readwrite");
      const store = tx.objectStore(STORE);
      store.put(items, COLLECTION_KEY);

      tx.oncomplete = () => {
        db.close();
        resolve(true);
      };
      tx.onerror = () => {
        db.close();
        resolve(false);
      };
      tx.onabort = () => {
        db.close();
        resolve(false);
      };
    } catch {
      try {
        db.close();
      } catch {
        /* ignore */
      }
      resolve(false);
    }
  });
}

async function idbClear(): Promise<void> {
  const db = await openDb();
  if (!db) return;

  await new Promise<void>((resolve) => {
    try {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).delete(COLLECTION_KEY);
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => {
        db.close();
        resolve();
      };
    } catch {
      try {
        db.close();
      } catch {
        /* ignore */
      }
      resolve();
    }
  });
}

function readLocalStorage(): CacheResult {
  if (!isBrowser()) return [];
  try {
    const raw = localStorage.getItem(LEGACY_LS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as Fragrance[]) : [];
  } catch {
    return [];
  }
}

function writeLocalStorage(items: Fragrance[]): void {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(LEGACY_LS_KEY, JSON.stringify(items));
  } catch {
    // Quota / private mode — ignore; offline cache is best-effort.
  }
}

function clearLocalStorage(): void {
  if (!isBrowser()) return;
  try {
    localStorage.removeItem(LEGACY_LS_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * Persist collection for offline ranker input.
 * Prefers IndexedDB; falls back to localStorage when IDB is unavailable.
 * Migrates legacy localStorage cache into IndexedDB on first successful write.
 */
export async function cacheCollection(items: Fragrance[]): Promise<void> {
  if (!isBrowser()) return;

  const ok = await idbSet(items);
  if (ok) {
    // Keep a thin LS mirror for older code paths / emergency fallback.
    writeLocalStorage(items);
    return;
  }

  writeLocalStorage(items);
}

export async function getCachedCollection(): Promise<Fragrance[]> {
  if (!isBrowser()) return [];

  const fromIdb = await idbGet();
  if (fromIdb && fromIdb.length > 0) {
    return fromIdb;
  }

  const fromLs = readLocalStorage();
  if (fromLs.length > 0) {
    // Best-effort upgrade to IndexedDB for next visits.
    void idbSet(fromLs);
    return fromLs;
  }

  return fromIdb ?? [];
}

export async function clearCollectionCache(): Promise<void> {
  if (!isBrowser()) return;
  await idbClear();
  clearLocalStorage();
}

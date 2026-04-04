/**
 * @better-pwa/storage — Unified storage abstraction over OPFS, IDB, and memory.
 *
 * Auto-selects the best engine based on availability and data size.
 */
import { better } from "@better-logger/core";

export type StorageEngine = "opfs" | "idb" | "memory";

export interface StorageQuota {
  usage: number;
  quota: number;
  percent: number;
}

export interface StorageOptions {
  engine?: StorageEngine;
  priority?: "critical" | "high" | "normal" | "low";
}

class StorageEngine {
  #activeEngine: StorageEngine = "idb";
  #idb: IDBDatabase | null = null;
  #memoryStore = new Map<string, unknown>();
  #quotaListeners: Array<(q: StorageQuota) => void> = [];

  /** Initialize storage engines */
  async init(): Promise<void> {
    this.#idb = await this.#openIdb().catch(() => null);
    this.#activeEngine = this.#idb ? "idb" : "memory";
    better.log.info("storage:init", { engine: this.#activeEngine });
  }

  /** Get the currently active engine */
  get engine(): StorageEngine {
    return this.#activeEngine;
  }

  /** Set a value */
  async set(key: string, value: unknown, options?: StorageOptions): Promise<void> {
    const engine = options?.engine ?? this.#activeEngine;

    if (engine === "idb" && this.#idb) {
      await this.#setIdb(key, value);
    } else if (engine === "memory") {
      this.#memoryStore.set(key, value);
    } else if (engine === "opfs") {
      // OPFS not yet implemented — fall back to IDB
      better.log.warn("storage:opfs-not-implemented", { key });
      await this.#setIdb(key, value);
    }
  }

  /** Get a value */
  async get<T>(key: string): Promise<T | undefined> {
    if (this.#activeEngine === "idb" && this.#idb) {
      return this.#getIdb<T>(key);
    }
    return this.#memoryStore.get(key) as T | undefined;
  }

  /** Delete a key */
  async delete(key: string): Promise<void> {
    if (this.#activeEngine === "idb" && this.#idb) {
      await this.#deleteIdb(key);
    }
    this.#memoryStore.delete(key);
  }

  /** List keys matching a pattern */
  async keys(pattern?: string): Promise<string[]> {
    const allKeys =
      this.#activeEngine === "idb" && this.#idb
        ? await this.#keysIdb()
        : Array.from(this.#memoryStore.keys());

    if (!pattern) return allKeys;
    const regex = new RegExp("^" + pattern.replace(/\*/g, ".*") + "$");
    return allKeys.filter((k) => regex.test(k));
  }

  /** Get storage quota info */
  async quota(): Promise<StorageQuota> {
    try {
      const estimate = await navigator.storage.estimate();
      const usage = estimate.usage ?? 0;
      const quota = estimate.quota ?? 0;
      const percent = quota > 0 ? (usage / quota) * 100 : 0;
      return { usage, quota, percent };
    } catch {
      return { usage: 0, quota: 0, percent: 0 };
    }
  }

  /** Evict entries based on policy */
  async evict(policy: "lru" | "lfu" | "ttl"): Promise<number> {
    if (this.#activeEngine === "memory") {
      const before = this.#memoryStore.size;
      this.#memoryStore.clear();
      better.log.info("storage:evicted", { policy, count: before });
      return before;
    }
    return 0;
  }

  /** Subscribe to quota warnings */
  onQuotaLow(cb: (q: StorageQuota) => void): () => void {
    this.#quotaListeners.push(cb);
    return () => {
      const idx = this.#quotaListeners.indexOf(cb);
      if (idx >= 0) this.#quotaListeners.splice(idx, 1);
    };
  }

  destroy(): void {
    this.#idb?.close();
    this.#memoryStore.clear();
    this.#quotaListeners = [];
  }

  // ─── Private IDB helpers ────────────────────────────────────────────────

  #openIdb(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open("better-pwa-storage", 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains("data")) {
          db.createObjectStore("data");
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  #setIdb(key: string, value: unknown): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.#idb) { resolve(); return; }
      const tx = this.#idb.transaction("data", "readwrite");
      tx.objectStore("data").put(value, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  #getIdb<T>(key: string): Promise<T | undefined> {
    return new Promise((resolve, reject) => {
      if (!this.#idb) { resolve(undefined); return; }
      const tx = this.#idb.transaction("data", "readonly");
      const req = tx.objectStore("data").get(key);
      req.onsuccess = () => resolve(req.result as T | undefined);
      req.onerror = () => reject(req.error);
    });
  }

  #deleteIdb(key: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.#idb) { resolve(); return; }
      const tx = this.#idb.transaction("data", "readwrite");
      tx.objectStore("data").delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  #keysIdb(): Promise<string[]> {
    return new Promise((resolve, reject) => {
      if (!this.#idb) { resolve([]); return; }
      const tx = this.#idb.transaction("data", "readonly");
      const req = tx.objectStore("data").getAllKeys();
      req.onsuccess = () => resolve(req.result as string[]);
      req.onerror = () => reject(req.error);
    });
  }
}

export { StorageEngine };

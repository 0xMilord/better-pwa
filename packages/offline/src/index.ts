/**
 * @better-pwa/offline — Mutation queue, replay engine, conflict resolution.
 *
 * Phase 1: Core queue API with IDB persistence.
 * Phase 3: Full replay engine with parallel execution and conflict resolution.
 */
import { better } from "@better-logger/core";

export interface MutationEntry {
  id: string;
  type: "create" | "update" | "delete";
  resource: string;
  method: "POST" | "PUT" | "PATCH" | "DELETE";
  payload: unknown;
  headers?: Record<string, string>;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
  conflictStrategy: "lww" | "merge" | "manual";
  metadata?: Record<string, unknown>;
  priority?: "critical" | "high" | "normal" | "low";
}

const PRIORITY_ORDER: Record<string, number> = { critical: 0, high: 1, normal: 2, low: 3 };

class MutationQueue {
  #queue: MutationEntry[] = [];
  #dbName = "better-pwa-mutations";
  #storeName = "queue";
  #db: IDBDatabase | null = null;
  #replaying = false;

  /** Initialize the queue (loads from IDB) */
  async init(): Promise<void> {
    this.#db = await this.#openDb();
    await this.#loadQueue();
    better.log.info("offline:queue-init", { count: this.#queue.length });
  }

  /** Enqueue a mutation */
  async enqueue(entry: Omit<MutationEntry, "id" | "timestamp" | "retryCount">): Promise<MutationEntry> {
    const full: MutationEntry = {
      ...entry,
      id: crypto.randomUUID?.() ?? Math.random().toString(36).slice(2),
      timestamp: Date.now(),
      retryCount: 0,
      maxRetries: entry.maxRetries ?? 5,
      conflictStrategy: entry.conflictStrategy ?? "lww",
      priority: entry.priority ?? "normal",
    };

    this.#queue.push(full);
    this.#sortQueue();
    await this.#persistQueue();
    better.log.info("offline:enqueued", { id: full.id, resource: full.resource });
    return full;
  }

  /** Get current queue depth */
  depth(): number {
    return this.#queue.length;
  }

  /** Get all queued mutations (sorted by priority) */
  getAll(): ReadonlyArray<MutationEntry> {
    return [...this.#queue];
  }

  /** Replay all mutations (called when online) */
  async replay(
    executor: (entry: MutationEntry) => Promise<boolean>
  ): Promise<{ success: MutationEntry[]; failed: MutationEntry[] }> {
    if (this.#replaying) return { success: [], failed: [] };
    this.#replaying = true;

    const success: MutationEntry[] = [];
    const failed: MutationEntry[] = [];

    while (this.#queue.length > 0) {
      const entry = this.#queue.shift()!;
      try {
        const ok = await executor(entry);
        if (ok) {
          success.push(entry);
          await this.#removeEntry(entry.id);
        } else {
          entry.retryCount++;
          if (entry.retryCount >= entry.maxRetries) {
            failed.push(entry);
            await this.#removeEntry(entry.id);
          } else {
            this.#queue.push(entry);
            this.#sortQueue();
          }
        }
      } catch {
        entry.retryCount++;
        if (entry.retryCount >= entry.maxRetries) {
          failed.push(entry);
          await this.#removeEntry(entry.id);
        } else {
          this.#queue.push(entry);
          this.#sortQueue();
        }
      }
    }

    this.#replaying = false;
    better.log.info("offline:replay-complete", { success: success.length, failed: failed.length });
    return { success, failed };
  }

  /** Clear the queue */
  async clear(): Promise<void> {
    this.#queue = [];
    await this.#persistQueue();
  }

  // ─── Private ────────────────────────────────────────────────────────────

  #sortQueue(): void {
    this.#queue.sort((a, b) => {
      const pa = PRIORITY_ORDER[a.priority ?? "normal"] ?? 2;
      const pb = PRIORITY_ORDER[b.priority ?? "normal"] ?? 2;
      if (pa !== pb) return pa - pb;
      return a.timestamp - b.timestamp;
    });
  }

  #openDb(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(this.#dbName, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(this.#storeName)) {
          db.createObjectStore(this.#storeName, { keyPath: "id" });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async #loadQueue(): Promise<void> {
    if (!this.#db) return;
    try {
      const tx = this.#db.transaction(this.#storeName, "readonly");
      const store = tx.objectStore(this.#storeName);
      const req = store.getAll();
      req.onsuccess = () => {
        this.#queue = (req.result ?? []).sort(
          (a, b) => (PRIORITY_ORDER[a.priority ?? "normal"] ?? 2) - (PRIORITY_ORDER[b.priority ?? "normal"] ?? 2)
        );
      };
    } catch {
      this.#queue = [];
    }
  }

  async #persistQueue(): Promise<void> {
    if (!this.#db) return;
    try {
      const tx = this.#db.transaction(this.#storeName, "readwrite");
      const store = tx.objectStore(this.#storeName);
      store.clear();
      for (const entry of this.#queue) {
        store.put(entry);
      }
    } catch {
      better.log.warn("offline:persist-failed");
    }
  }

  async #removeEntry(id: string): Promise<void> {
    if (!this.#db) return;
    try {
      const tx = this.#db.transaction(this.#storeName, "readwrite");
      tx.objectStore(this.#storeName).delete(id);
    } catch {
      better.log.warn("offline:remove-failed", { id });
    }
  }
}

export { MutationQueue };

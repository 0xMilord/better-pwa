/**
 * Reactive state engine — single source of truth for all PWA environment state.
 *
 * Features:
 * - Immutable snapshots (frozen objects)
 * - Atomic multi-key updates (subscribers fire once)
 * - IDB persistence for critical keys
 * - BroadcastChannel cross-tab sync
 */
import { better } from "@better-logger/core";
import type {
  PwaState,
  StateKeys,
  StateDiff,
  StateSubscriber,
  Unsubscribe,
} from "../types.js";

const CRITICAL_KEYS: (keyof PwaState)[] = ["isInstalled", "installMethod", "permissions", "isOffline"];
const IDB_NAME = "better-pwa-state";
const IDB_STORE = "state";
const IDB_VERSION = 1;

function getDefaultState(): PwaState {
  return {
    isOffline: !navigator.onLine,
    connectionType: ((navigator as Navigator & { connection?: { effectiveType: PwaState["connectionType"] } }).connection?.effectiveType ?? null) as PwaState["connectionType"],
    isInstalled: false,
    installMethod: null,
    canInstall: false,
    hasUpdate: false,
    updateStrategy: "soft",
    updateProgress: 0,
    permissions: {},
    storage: { usage: 0, quota: 0, engine: "idb", utilizationPercent: 0 },
    isSecureContext: globalThis.isSecureContext ?? false,
    isStandalone: globalThis.matchMedia?.("(display-mode: standalone)").matches ?? false,
    tabCount: 1,
  };
}

class StateEngine {
  #state: PwaState;
  #subscribers = new Map<string, Set<StateSubscriber>>();
  #revisionId = 0;
  #db: IDBDatabase | null = null;
  #broadcastChannel: BroadcastChannel | null = null;
  #tabId = crypto.randomUUID?.() ?? Math.random().toString(36).slice(2);
  #seenRevisionIds = new Set<string>();
  #log = better.flow("state-engine");

  constructor(initialState?: Partial<PwaState>) {
    this.#state = { ...getDefaultState(), ...initialState } as PwaState;
    Object.freeze(this.#state);
    this.#log.setContext({ tabId: this.#tabId });
    better.log.info("state-engine:initialized", { tabId: this.#tabId });
  }

  /** Initialize async resources (IDB, BroadcastChannel) */
  async init(): Promise<void> {
    await this.#initIdb();
    await this.#loadPersistedState();
    this.#initBroadcastChannel();
    this.#initNetworkListeners();
    this.#log.step("init").success();
  }

  /** Return a frozen snapshot of current state */
  snapshot(): Readonly<PwaState> {
    return Object.freeze({ ...this.#state });
  }

  /** Subscribe to changes on specific keys. Returns unsubscribe fn. */
  subscribe(keys: StateKeys[], cb: StateSubscriber): Unsubscribe {
    const key = keys.sort().join(",");
    if (!this.#subscribers.has(key)) {
      this.#subscribers.set(key, new Set());
    }
    this.#subscribers.get(key)!.add(cb);
    return () => {
      this.#subscribers.get(key)?.delete(cb);
      if (this.#subscribers.get(key)?.size === 0) {
        this.#subscribers.delete(key);
      }
    };
  }

  /** Set a state key and notify subscribers */
  async set<T extends StateKeys>(key: T, value: PwaState[T]): Promise<void> {
    const oldValue = this.#state[key];
    if (oldValue === value) return;

    const newState = { ...this.#state, [key]: value };
    this.#state = Object.freeze(newState);
    this.#revisionId++;

    const diff: StateDiff = { [key]: value };
    this.#notifySubscribers(key, diff);
    this.#persistCritical(key, value);
    this.#broadcastState(key, value, this.#revisionId);
  }

  /** Reset state to defaults */
  async reset(): Promise<void> {
    const defaults = getDefaultState();
    const changedKeys = Object.keys(defaults).filter(
      (k) => this.#state[k as StateKeys] !== defaults[k as StateKeys]
    );

    this.#state = Object.freeze({ ...defaults });
    this.#revisionId++;

    const diff: StateDiff = Object.fromEntries(
      changedKeys.map((k) => [k, defaults[k as StateKeys]])
    );

    for (const [key, subs] of this.#subscribers) {
      const keys = key.split(",") as StateKeys[];
      const relevantKeys = keys.filter((k) => k in diff);
      if (relevantKeys.length > 0) {
        const relevantDiff = Object.fromEntries(relevantKeys.map((k) => [k, diff[k]]));
        for (const sub of subs) sub(relevantDiff);
      }
    }

    await this.#persistAllCritical();
    this.#log.step("reset").success();
  }

  /** Apply state from another tab (deduplicated) */
  receiveRemoteState(revisionId: number, key: string, value: unknown): void {
    if (revisionId <= this.#revisionId) return; // stale
    if (this.#seenRevisionIds.has(`${revisionId}`)) return; // duplicate

    this.#seenRevisionIds.add(`${revisionId}`);
    if (this.#seenRevisionIds.size > 100) {
      const arr = Array.from(this.#seenRevisionIds);
      this.#seenRevisionIds = new Set(arr.slice(-50));
    }

    const typedKey = key as StateKeys;
    if (!(typedKey in this.#state)) return;

    const oldValue = this.#state[typedKey];
    if (oldValue === value) return;

    const newState = { ...this.#state, [typedKey]: value };
    this.#state = Object.freeze(newState);
    this.#revisionId = revisionId;

    const diff: StateDiff = { [key]: value };
    this.#notifySubscribers(typedKey, diff);
  }

  destroy(): void {
    this.#broadcastChannel?.close();
    this.#db?.close();
    this.#subscribers.clear();
  }

  // ─── Private ────────────────────────────────────────────────────────────

  #notifySubscribers(changedKey: StateKeys, diff: StateDiff): void {
    for (const [key, subs] of this.#subscribers) {
      const keys = key.split(",") as StateKeys[];
      if (keys.includes(changedKey)) {
        for (const sub of subs) sub(diff);
      }
    }
  }

  async #initIdb(): Promise<void> {
    try {
      this.#db = await new Promise<IDBDatabase>((resolve, reject) => {
        const req = indexedDB.open(IDB_NAME, IDB_VERSION);
        req.onupgradeneeded = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains(IDB_STORE)) {
            db.createObjectStore(IDB_STORE);
          }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
    } catch {
      // IDB unavailable — degrade gracefully
      better.log.warn("state-engine:idb-unavailable");
    }
  }

  async #loadPersistedState(): Promise<void> {
    if (!this.#db) return;
    try {
      const tx = this.#db.transaction(IDB_STORE, "readonly");
      const store = tx.objectStore(IDB_STORE);
      const restored: Partial<PwaState> = {};

      await Promise.all(
        CRITICAL_KEYS.map((key) =>
          new Promise<void>((resolve) => {
            const req = store.get(key);
            req.onsuccess = () => {
              if (req.result !== undefined) {
                (restored as Record<string, unknown>)[key] = req.result;
              }
              resolve();
            };
            req.onerror = () => resolve();
          })
        )
      );

      if (Object.keys(restored).length > 0) {
        this.#state = Object.freeze({ ...this.#state, ...restored });
        better.log.info("state-engine:load-persisted", { keys: Object.keys(restored) });
      }
    } catch {
      better.log.warn("state-engine:load-persisted-failed");
    }
  }

  async #persistCritical(key: StateKeys, value: unknown): Promise<void> {
    if (!CRITICAL_KEYS.includes(key as keyof PwaState) || !this.#db) return;
    try {
      const tx = this.#db.transaction(IDB_STORE, "readwrite");
      const store = tx.objectStore(IDB_STORE);
      store.put(value, key);
    } catch {
      better.log.warn("state-engine:persist-failed", { key });
    }
  }

  async #persistAllCritical(): Promise<void> {
    if (!this.#db) return;
    try {
      const tx = this.#db.transaction(IDB_STORE, "readwrite");
      const store = tx.objectStore(IDB_STORE);
      for (const key of CRITICAL_KEYS) {
        store.put(this.#state[key], key);
      }
    } catch {
      better.log.warn("state-engine:persist-all-failed");
    }
  }

  #initBroadcastChannel(): void {
    try {
      this.#broadcastChannel = new BroadcastChannel("better-pwa:state");
      this.#broadcastChannel.onmessage = (e: MessageEvent) => {
        const { type, tabId, revisionId, key, value } = e.data || {};
        if (type === "state:update" && tabId !== this.#tabId) {
          this.receiveRemoteState(revisionId, key, value);
        }
      };
    } catch {
      better.log.warn("state-engine:broadcastchannel-unavailable");
    }
  }

  #broadcastState(key: StateKeys, value: unknown, revisionId: number): void {
    this.#broadcastChannel?.postMessage({
      type: "state:update",
      tabId: this.#tabId,
      revisionId,
      key,
      value,
    });
  }

  #initNetworkListeners(): void {
    const handleOnline = () => {
      this.set("isOffline", false);
    };
    const handleOffline = () => {
      this.set("isOffline", true);
    };

    globalThis.addEventListener("online", handleOnline);
    globalThis.addEventListener("offline", handleOffline);

    // Cleanup on GC (weak ref — good enough for SPA lifecycle)
    // Note: GC observation is best-effort; browsers don't expose reliable GC events.
  }
}

export { StateEngine, getDefaultState };

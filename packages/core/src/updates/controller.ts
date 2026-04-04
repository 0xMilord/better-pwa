/**
 * Update Controller — declarative management of service worker update strategies.
 *
 * Strategies: soft, hard, gradual, on-reload
 * State machine: IDLE → DOWNLOADING → WAITING → ACTIVATING → IDLE
 */
import { better } from "@better-logger/core";
import type {
  UpdateStatus,
  GradualRolloutOptions,
  Unsubscribe,
} from "../types.js";

type UpdateState = "IDLE" | "DOWNLOADING" | "WAITING" | "ACTIVATING" | "FAILED";
type UpdateStrategy = "soft" | "hard" | "gradual" | "on-reload";

const DEFAULT_POLL_INTERVAL = 60_000; // 60s
const MAX_UPDATE_CYCLES = 2;

class UpdateController {
  #strategy: UpdateStrategy = "soft";
  #rolloutOptions?: GradualRolloutOptions;
  #updateState: UpdateState = "IDLE";
  #currentVersion = "unknown";
  #waitingVersion: string | null = null;
  #listeners = new Map<string, Set<(version: string) => void>>();
  #pollInterval: number | null = null;
  #updateCycleCount = 0;
  #lastHash: string | null = null;
  #registration: ServiceWorkerRegistration | null = null;
  #log = better.flow("update-controller");

  constructor(registration?: ServiceWorkerRegistration | null) {
    this.#registration = registration ?? null;
  }

  /** Set the update strategy */
  setStrategy(strategy: UpdateStrategy, options?: GradualRolloutOptions): void {
    this.#strategy = strategy;
    this.#rolloutOptions = options;
    this.#log.step("set-strategy").info({ strategy, options });

    if (strategy === "gradual" && options) {
      this.#checkGradualEligibility();
    }
  }

  /** Subscribe to update events */
  on(event: "update_available", cb: (version: string) => void): Unsubscribe {
    if (!this.#listeners.has(event)) {
      this.#listeners.set(event, new Set());
    }
    this.#listeners.get(event)!.add(cb);
    return () => {
      this.#listeners.get(event)?.delete(cb);
    };
  }

  /** Manually activate a waiting update */
  async activate(): Promise<void> {
    if (this.#updateState !== "WAITING") {
      this.#log.step("activate-not-waiting").warn({ state: this.#updateState });
      return;
    }

    this.#updateState = "ACTIVATING";

    try {
      if (this.#registration?.waiting) {
        const messageChannel = new MessageChannel();
        this.#registration.waiting.postMessage({ type: "SKIP_WAITING" }, [messageChannel.port2]);
      }

      if (this.#strategy === "hard") {
        globalThis.location.reload();
      }

      this.#updateState = "IDLE";
      this.#currentVersion = this.#waitingVersion ?? this.#currentVersion;
      this.#waitingVersion = null;
      this.#log.step("activate-success").success({ version: this.#currentVersion });
    } catch (error) {
      this.#updateState = "FAILED";
      this.#log.step("activate-failed").error({ error });
      // Rollback — stay on current version
      this.#updateState = "IDLE";
    }
  }

  /** Get current update status */
  status(): UpdateStatus {
    return {
      current: this.#currentVersion,
      waiting: this.#waitingVersion,
      strategy: this.#strategy,
    };
  }

  /** Get internal state */
  get internalState(): UpdateState {
    return this.#updateState;
  }

  /** Start polling for SW updates */
  startPolling(intervalMs = DEFAULT_POLL_INTERVAL): void {
    this.#stopPolling();
    this.#pollInterval = window.setInterval(() => {
      this.#checkForUpdate();
    }, intervalMs);
  }

  /** Stop polling */
  stopPolling(): void {
    this.#stopPolling();
  }

  /** Handle an update found event (called from SW registration) */
  handleUpdateFound(registration: ServiceWorkerRegistration): void {
    this.#registration = registration;
    this.#updateState = "DOWNLOADING";

    if (registration.waiting) {
      this.#waitingVersion = "pending";
      this.#updateState = "WAITING";
      this.#notifyListeners("update_available", this.#waitingVersion);
      this.#log.step("update-found").info({ version: this.#waitingVersion });

      // Auto-activate for hard strategy
      if (this.#strategy === "hard") {
        this.activate();
      }
    }
  }

  /** Check if user is eligible for gradual rollout */
  #checkGradualEligibility(): void {
    if (!this.#rolloutOptions) return;
    const { rollout, seed } = this.#rolloutOptions;
    const hash = this.#hashString(seed + (globalThis.location.hostname ?? ""));
    const bucket = hash % 100;
    if (bucket >= rollout * 100) {
      this.#log.step("gradual-excluded").info({ bucket, rollout });
      // User excluded — defer update
    } else {
      this.#log.step("gradual-included").info({ bucket, rollout });
    }
  }

  async #checkForUpdate(): Promise<void> {
    if (!this.#registration) return;
    if (this.#updateState !== "IDLE") return;

    try {
      // Check if there's a new SW waiting
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const reg of registrations) {
        if (reg.waiting && reg !== this.#registration) {
          this.handleUpdateFound(reg);
          return;
        }
      }

      // Check for update loops
      this.#updateCycleCount++;
      if (this.#updateCycleCount > MAX_UPDATE_CYCLES) {
        this.#log.step("update-loop-detected").warn({ count: this.#updateCycleCount });
        this.#updateCycleCount = 0;
      }
    } catch {
      this.#log.step("update-check-failed").warn();
    }
  }

  #hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0; // Convert to 32bit integer
    }
    return Math.abs(hash);
  }

  #stopPolling(): void {
    if (this.#pollInterval !== null) {
      clearInterval(this.#pollInterval);
      this.#pollInterval = null;
    }
  }

  #notifyListeners(event: string, version: string): void {
    const subs = this.#listeners.get(event);
    if (!subs) return;
    for (const cb of subs) {
      try {
        cb(version);
      } catch (err) {
        this.#log.step("notify-listener-error").warn({ error: err });
      }
    }
  }

  destroy(): void {
    this.#stopPolling();
    this.#listeners.clear();
  }
}

export { UpdateController };
export type { UpdateStrategy, UpdateState };

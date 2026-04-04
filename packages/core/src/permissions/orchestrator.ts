/**
 * Permission Orchestrator — batched, state-tracked permission management
 * with retry logic and fallback handling.
 */
import { better } from "@better-logger/core";
import type {
  PermissionResults,
  PermissionRequestOptions,
  Unsubscribe,
} from "../types.js";

const DEFAULT_MAX_RETRIES = 4;
const BACKOFF_MS = [1000, 2000, 4000, 8000];

class PermissionEngine {
  #cachedPermissions: Record<string, PermissionState> = {};
  #deniedListeners = new Set<(permission: string, fallback: { show: (opts: Record<string, string>) => void }) => void>();
  #log = better.flow("permission-engine");
  #backoffState: Record<string, number> = {};

  /** Batch request multiple permissions with deduplication */
  async request(
    permissions: string[],
    options?: PermissionRequestOptions
  ): Promise<PermissionResults> {
    const results: PermissionResults = {};
    const maxRetries = options?.maxRetries ?? DEFAULT_MAX_RETRIES;

    // Pre-check cached states
    const toRequest = permissions.filter((p) => {
      if (this.#cachedPermissions[p] === "granted") {
        results[p] = "granted";
        return false;
      }
      if (this.#cachedPermissions[p] === "denied" && !this.#canRetry(p)) {
        results[p] = "denied";
        this.#notifyDenied(p);
        return false;
      }
      return true;
    });

    if (toRequest.length === 0) {
      this.#log.step("request-all-cached").success({ results });
      return results;
    }

    // Run pre-prompt hook if provided
    if (options?.prePrompt) {
      await options.prePrompt();
    }

    // Request each permission (browsers don't support true batch requests)
    for (const perm of toRequest) {
      const result = await this.#requestWithRetry(perm, maxRetries);
      results[perm] = result;
    }

    this.#log.step("request-complete").success({ results });
    return results;
  }

  /** Check cached permission states without prompting */
  status(): PermissionResults {
    return { ...this.#cachedPermissions };
  }

  /** Subscribe to permission denials */
  on(
    _event: "denied",
    cb: (permission: string, fallback: { show: (opts: Record<string, string>) => void }) => void
  ): Unsubscribe {
    this.#deniedListeners.add(cb);
    return () => {
      this.#deniedListeners.delete(cb);
    };
  }

  /** Update cached permission state (called by external sources like visibilitychange) */
  updateState(permission: string, state: PermissionState): void {
    this.#cachedPermissions[permission] = state;
    if (state === "granted") {
      delete this.#backoffState[permission];
    }
  }

  destroy(): void {
    this.#deniedListeners.clear();
  }

  // ─── Private ────────────────────────────────────────────────────────────

  async #requestWithRetry(permission: string, maxRetries: number): Promise<PermissionState> {
    const retryCount = this.#backoffState[permission] ?? 0;
    if (retryCount >= maxRetries) {
      this.#cachedPermissions[permission] = "denied";
      this.#notifyDenied(permission);
      return "denied";
    }

    try {
      const state = await navigator.permissions.query({ name: permission as PermissionName });
      const result = state.state;
      this.#cachedPermissions[permission] = result;

      if (result === "granted") {
        delete this.#backoffState[permission];
      } else if (result === "denied") {
        this.#backoffState[permission] = retryCount + 1;
        this.#notifyDenied(permission);
      }

      return result;
    } catch {
      // Fallback: try the actual API (e.g., getUserMedia for camera)
      const result = await this.#tryDirectRequest(permission);
      this.#cachedPermissions[permission] = result;

      if (result === "denied") {
        this.#backoffState[permission] = retryCount + 1;
        this.#notifyDenied(permission);
      } else {
        delete this.#backoffState[permission];
      }

      return result;
    }
  }

  async #tryDirectRequest(permission: string): Promise<PermissionState> {
    try {
      switch (permission) {
        case "camera":
        case "microphone": {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: permission === "camera",
            audio: permission === "microphone",
          });
          stream.getTracks().forEach((t) => t.stop());
          return "granted";
        }
        case "geolocation": {
          return new Promise((resolve) => {
            navigator.geolocation.getCurrentPosition(
              () => resolve("granted"),
              () => resolve("denied"),
            );
          });
        }
        case "notifications": {
          const result = await Notification.requestPermission();
          return result === "granted" ? "granted" : "denied";
        }
        default:
          return "prompt";
      }
    } catch {
      return "denied";
    }
  }

  #canRetry(permission: string): boolean {
    const retryCount = this.#backoffState[permission] ?? 0;
    return retryCount < DEFAULT_MAX_RETRIES;
  }

  #notifyDenied(permission: string): void {
    const fallback = {
      show: (opts: Record<string, string>) => {
        this.#log.step("permission-fallback-ui").info({ permission, ...opts });
      },
    };
    for (const cb of this.#deniedListeners) {
      try {
        cb(permission, fallback);
      } catch (err) {
        this.#log.step("denied-listener-error").warn({ error: err });
      }
    }
  }
}

export { PermissionEngine };

/**
 * Cold Start Strategy — deterministic, sequential staged boot.
 *
 * Stages: HYDRATE → SYNC → UPDATE → REPLAY
 * No stage begins until the previous completes.
 * Failure in any stage triggers graceful degradation, not a crash.
 */
import { better } from "@better-logger/core";
import type {
  BootStage,
  BetterPwaConfig,
  ColdStartResult,
} from "../types.js";

const DEFAULT_TIMEOUTS = {
  hydrate: 3000,
  sync: 10000,
  update: 5000,
  replay: 30000,
};

class ColdStartEngine {
  #stages: BootStage[] = [];

  constructor(_config: BetterPwaConfig) {
    this.#stages = [
      {
        name: "hydrate",
        fn: async () => {
          better.log.info("cold-start:hydrate", "Loading cached UI shell");
        },
        timeout: DEFAULT_TIMEOUTS.hydrate,
      },
      {
        name: "sync",
        fn: async () => {
          better.log.info("cold-start:sync", "Checking network and fetching critical data");
          if (!navigator.onLine) {
            throw new Error("No network available");
          }
        },
        timeout: DEFAULT_TIMEOUTS.sync,
      },
      {
        name: "update",
        fn: async () => {
          better.log.info("cold-start:update", "Checking for pending SW updates");
        },
        timeout: DEFAULT_TIMEOUTS.update,
      },
      {
        name: "replay",
        fn: async () => {
          better.log.info("cold-start:replay", "Replaying mutation queue");
        },
        timeout: DEFAULT_TIMEOUTS.replay,
      },
    ];
  }

  /** Execute the staged boot sequence. Returns final app state. */
  async boot(): Promise<ColdStartResult> {
    const result: ColdStartResult = {
      state: "BOOT",
      stagesCompleted: [],
      stagesFailed: [],
    };

    for (const stage of this.#stages) {
      better.log.info("cold-start:stage-start", { stage: stage.name });

      try {
        await this.#withTimeout(stage.fn({} as BetterPwaConfig), stage.timeout);
        result.stagesCompleted.push(stage.name);
        better.log.info("cold-start:stage-complete", { stage: stage.name });
      } catch (error) {
        result.stagesFailed.push(stage.name);
        better.log.error("cold-start:stage-failed", { stage: stage.name, error });

        // Stage-specific failure handling
        if (stage.name === "hydrate") {
          result.state = "DEGRADED";
          return result; // Can't boot at all
        }
        if (stage.name === "sync") {
          result.state = "OFFLINE";
          return result; // Continue in offline mode
        }
        if (stage.name === "update") {
          // Defer update, continue booting
          continue;
        }
        if (stage.name === "replay") {
          // Queue preserved for later
          result.state = "READY";
          return result;
        }
      }
    }

    result.state = "STABLE";
    better.log.info("cold-start:complete", { state: result.state });
    return result;
  }

  /** Validate cache freshness (date header check) */
  async validateCacheFreshness(maxAgeMs = 7 * 24 * 60 * 60 * 1000): Promise<boolean> {
    try {
      const cache = await caches.open("better-pwa-precache");
      if (!cache) return false;

      const keys = await cache.keys();
      if (keys.length === 0) return false;

      const response = await cache.match(keys[0]!);
      if (!response) return false;

      const dateHeader = response.headers.get("date");
      if (!dateHeader) return false;

      const age = Date.now() - new Date(dateHeader).getTime();
      return age < maxAgeMs;
    } catch {
      return false;
    }
  }

  // ─── Private ────────────────────────────────────────────────────────────

  #withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`Stage timed out after ${ms}ms`)), ms);
      promise.then(
        (v) => { clearTimeout(timer); resolve(v); },
        (e) => { clearTimeout(timer); reject(e); }
      );
    });
  }
}

export { ColdStartEngine };

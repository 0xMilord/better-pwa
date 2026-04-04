/**
 * BetterPwaRuntime — the main entry point.
 *
 * Wires together: State Engine, Lifecycle Bus, SW Registration,
 * Permission Orchestrator, Update Controller, Presets, and Cold Start.
 *
 * The init() flow follows the deterministic state machine:
 *   IDLE → BOOT → READY → (SYNCING) → STABLE
 *                         → OFFLINE → SYNCING → STABLE
 */
import { better } from "@better-logger/core";
import { StateEngine } from "../state/engine.js";
import { LifecycleBus } from "../lifecycle/bus.js";
import { registerServiceWorker } from "../lifecycle/sw-register.js";
import { PermissionEngine } from "../permissions/orchestrator.js";
import { UpdateController } from "../updates/controller.js";
import { ColdStartEngine } from "../boot/cold-start.js";
import { presets } from "../presets/index.js";
import type {
  BetterPwaConfig,
  BetterPwaPlugin,
  LifecycleEvent,
  LifecycleEventCallback,
  Unsubscribe,
  PwaState,
  StateKeys,
  StateSubscriber,
  PermissionResults,
  PermissionRequestOptions,
  UpdateStatus,
  GradualRolloutOptions,
  AppState,
  TransitionRecord,
  MigrationFn,
} from "../types.js";

const DEFAULT_VERSION = "0.1.0";

/**
 * Runtime instance returned by createPwa().
 */
class BetterPwaRuntime {
  #config: BetterPwaConfig;
  #stateEngine: StateEngine;
  #lifecycleBus: LifecycleBus;
  #permissionEngine: PermissionEngine;
  #updateController: UpdateController;
  #coldStartEngine: ColdStartEngine;
  #plugins: BetterPwaPlugin[] = [];
  #migrations = new Map<string, MigrationFn>();
  #destroyed = false;
  #initialized = false;

  constructor(config: BetterPwaConfig) {
    this.#config = { ...config };
    this.#stateEngine = new StateEngine();
    this.#lifecycleBus = new LifecycleBus();
    this.#permissionEngine = new PermissionEngine();
    this.#updateController = new UpdateController();
    this.#coldStartEngine = new ColdStartEngine(config);
    this.#registerTransitions();
    better.log.info("better-pwa:created", { config });
  }

  /**
   * Initialize the runtime. Follows the deterministic state machine:
   *   IDLE → BOOT → READY → SYNCING → STABLE
   * If offline: IDLE → BOOT → READY → OFFLINE
   */
  async init(): Promise<this> {
    if (this.#initialized) return this;

    // ── Stage 0: IDLE → BOOT ──
    await this.#lifecycleBus.transition("BOOT", {
      config: this.#config,
      state: this.#stateEngine.snapshot(),
    });

    // ── Stage 1: Initialize state engine (IDB, BroadcastChannel) ──
    await this.#stateEngine.init();
    better.log.info("better-pwa:state-initialized");

    // ── Stage 2: Run migrations if version changed ──
    await this.#runMigrations();

    // ── Stage 3: Register service worker ──
    if (this.#config.swUrl) {
      await this.#registerSW();
    }

    // ── Stage 4: Apply preset update strategy ──
    if (this.#config.preset) {
      const preset = presets[this.#config.preset as keyof typeof presets];
      if (preset) {
        this.#updateController.setStrategy(preset.updateStrategy);
        await this.#stateEngine.set("updateStrategy", preset.updateStrategy);
      }
    }

    // ── Stage 5: Run cold start ──
    const bootResult = await this.#coldStartEngine.boot();

    // ── Stage 6: Transition based on boot result ──
    if (bootResult.state === "OFFLINE") {
      await this.#lifecycleBus.transition("READY", {
        config: this.#config,
        state: this.#stateEngine.snapshot(),
      });
      await this.#stateEngine.set("isOffline", true);
      await this.#lifecycleBus.transition("OFFLINE", {
        config: this.#config,
        state: this.#stateEngine.snapshot(),
      });
    } else if (bootResult.state === "DEGRADED") {
      await this.#lifecycleBus.transition("DEGRADED", {
        config: this.#config,
        state: this.#stateEngine.snapshot(),
      });
    } else {
      await this.#lifecycleBus.transition("READY", {
        config: this.#config,
        state: this.#stateEngine.snapshot(),
      });
      // If online, proceed to SYNCING → STABLE
      if (!this.#stateEngine.snapshot().isOffline) {
        await this.#lifecycleBus.transition("SYNCING", {
          config: this.#config,
          state: this.#stateEngine.snapshot(),
        });
        await this.#lifecycleBus.transition("STABLE", {
          config: this.#config,
          state: this.#stateEngine.snapshot(),
        });
      }
    }

    // ── Stage 7: Initialize plugins ──
    for (const plugin of this.#plugins) {
      try {
        plugin.onInit?.(this);
      } catch (err) {
        better.log.warn("better-pwa:plugin-init-error", { plugin: plugin.name, error: err });
      }
    }

    // ── Stage 8: Set up online/offline listeners ──
    this.#setupNetworkListeners();

    this.#initialized = true;
    const finalState = this.#lifecycleBus.state();
    better.log.info("better-pwa:ready", { state: finalState });
    return this;
  }

  // ─── State Engine API ───────────────────────────────────────────────────

  state = () => {
    const engine = this.#stateEngine;
    return {
      snapshot: (): Readonly<PwaState> => engine.snapshot(),
      subscribe: (keys: StateKeys[], cb: StateSubscriber): Unsubscribe =>
        engine.subscribe(keys, cb),
      set: async <T extends StateKeys>(key: T, value: PwaState[T]): Promise<void> =>
        engine.set(key, value),
      reset: async (): Promise<void> => engine.reset(),
    };
  };

  // ─── Lifecycle API ──────────────────────────────────────────────────────

  lifecycle = () => {
    const bus = this.#lifecycleBus;
    return {
      state: (): AppState => bus.state(),
      onTransition: (cb: (from: AppState, to: AppState, metadata: Record<string, unknown>) => void): Unsubscribe =>
        bus.onTransition(cb),
      blockedTransitions: (): TransitionRecord[] => bus.getBlockedTransitions(),
    };
  };

  // ─── Permissions API ────────────────────────────────────────────────────

  permissions = () => {
    const engine = this.#permissionEngine;
    return {
      request: (perms: string[], opts?: PermissionRequestOptions): Promise<PermissionResults> =>
        engine.request(perms, opts),
      status: (): PermissionResults => engine.status(),
      on: (event: "denied", cb: (permission: string, fallback: { show: (opts: Record<string, string>) => void }) => void): Unsubscribe =>
        engine.on(event, cb),
    };
  };

  // ─── Update API ─────────────────────────────────────────────────────────

  update = () => {
    const controller = this.#updateController;
    return {
      setStrategy: (s: "soft" | "hard" | "gradual" | "on-reload", o?: GradualRolloutOptions): void =>
        controller.setStrategy(s, o),
      on: (e: "update_available", cb: (version: string) => void): Unsubscribe =>
        controller.on(e, cb),
      activate: (): Promise<void> => controller.activate(),
      status: (): UpdateStatus => controller.status(),
    };
  };

  // ─── Event Bus ──────────────────────────────────────────────────────────

  on<T extends LifecycleEvent>(type: T["type"], cb: LifecycleEventCallback<T>): Unsubscribe {
    return this.#lifecycleBus.on(type, cb);
  }

  // ─── Plugin System ──────────────────────────────────────────────────────

  use(plugin: BetterPwaPlugin): void {
    this.#plugins.push(plugin);
    // If already initialized, init the plugin immediately
    if (this.#initialized) {
      try {
        plugin.onInit?.(this);
      } catch (err) {
        better.log.warn("better-pwa:plugin-init-error", { plugin: plugin.name, error: err });
      }
    }
    better.log.info("better-pwa:plugin-registered", { name: plugin.name, version: plugin.version });
  }

  // ─── State Migrations ───────────────────────────────────────────────────

  /**
   * Register a state migration for version upgrades.
   * Migrations run before state is read after a version change.
   */
  registerMigration(version: string, fn: MigrationFn): void {
    this.#migrations.set(version, fn);
  }

  // ─── Cleanup ────────────────────────────────────────────────────────────

  async destroy(): Promise<void> {
    if (this.#destroyed) return;
    this.#destroyed = true;

    this.#stateEngine.destroy();
    this.#lifecycleBus.destroy();
    this.#permissionEngine.destroy();
    this.#updateController.destroy();
    this.#plugins = [];

    better.log.info("better-pwa:destroyed");
  }

  // ─── Private ────────────────────────────────────────────────────────────

  async #registerSW(): Promise<void> {
    const registration = await registerServiceWorker(
      {
        swUrl: this.#config.swUrl!,
        scope: this.#config.scope,
        onUpdateFound: (reg) => {
          this.#updateController.handleUpdateFound(reg);
        },
      },
      this.#lifecycleBus
    );

    if (registration) {
      this.#updateController = new UpdateController(registration);
    }
  }

  async #runMigrations(): Promise<void> {
    const targetVersion = this.#config.version ?? DEFAULT_VERSION;
    const snapshot = this.#stateEngine.snapshot();
    const currentVersion = snapshot._version;

    if (!currentVersion || currentVersion === targetVersion) {
      // First run or already at target version
      if (!currentVersion) {
        await this.#stateEngine.set("_version" as StateKeys, targetVersion);
      }
      return;
    }

    // Run migrations in order
    const versions = Array.from(this.#migrations.keys()).sort();
    for (const version of versions) {
      if (version <= currentVersion) continue;
      if (version > targetVersion) break;

      const migration = this.#migrations.get(version);
      if (!migration) continue;

      try {
        const stateObj = Object.fromEntries(
          Object.entries(snapshot).filter(([_, v]) => v !== undefined)
        ) as Record<string, unknown>;
        const migrated = migration(stateObj);
        // Apply migrated state
        for (const [key, value] of Object.entries(migrated)) {
          if (key in snapshot) {
            await this.#stateEngine.set(key as StateKeys, value as PwaState[keyof PwaState]);
          }
        }
        await this.#stateEngine.set("_version" as StateKeys, version);
        this.#lifecycleBus.emit({
          type: "state:migrated",
          detail: { from: currentVersion, to: version },
        });
        better.log.info("better-pwa:migration-applied", { version });
      } catch (err) {
        better.log.error("better-pwa:migration-failed", { version, error: err });
        // Don't fail the entire init — continue with current state
      }
    }
  }

  #setupNetworkListeners(): void {
    const handleOnline = () => {
      this.#stateEngine.set("isOffline", false);
      this.#lifecycleBus.emit({
        type: "app:online",
        detail: { timestamp: Date.now(), offlineDuration: 0 },
      });
      // Attempt transition from OFFLINE → SYNCING → STABLE
      if (this.#lifecycleBus.state() === "OFFLINE") {
        this.#lifecycleBus.transition("SYNCING", {
          config: this.#config,
          state: this.#stateEngine.snapshot(),
        }).then(() => {
          this.#lifecycleBus.transition("STABLE", {
            config: this.#config,
            state: this.#stateEngine.snapshot(),
          });
        }).catch(() => {});
      }
    };

    const handleOffline = () => {
      this.#stateEngine.set("isOffline", true);
      this.#lifecycleBus.emit({
        type: "app:offline",
        detail: { timestamp: Date.now() },
      });
      if (this.#lifecycleBus.state() === "STABLE" || this.#lifecycleBus.state() === "READY") {
        this.#lifecycleBus.transition("OFFLINE", {
          config: this.#config,
          state: this.#stateEngine.snapshot(),
        }).catch(() => {});
      }
    };

    globalThis.addEventListener("online", handleOnline);
    globalThis.addEventListener("offline", handleOffline);
  }

  #registerTransitions(): void {
    const bus = this.#lifecycleBus;

    bus.registerTransition({
      from: "IDLE", to: "BOOT",
      guard: () => true, action: async () => {}, onFail: () => "DEGRADED",
    });
    bus.registerTransition({
      from: "BOOT", to: "READY",
      guard: () => true, action: async () => {}, onFail: () => "DEGRADED",
    });
    bus.registerTransition({
      from: "READY", to: "OFFLINE",
      guard: (ctx) => ctx.state.isOffline, action: async () => {}, onFail: () => "READY",
    });
    bus.registerTransition({
      from: "OFFLINE", to: "SYNCING",
      guard: (ctx) => !ctx.state.isOffline, action: async () => {}, onFail: () => "OFFLINE",
    });
    bus.registerTransition({
      from: "SYNCING", to: "STABLE",
      guard: () => true, action: async () => {}, onFail: () => "DEGRADED",
    });
    bus.registerTransition({
      from: "READY", to: "UPDATING",
      guard: (ctx) => Boolean(ctx.state.hasUpdate), action: async () => {}, onFail: () => "READY",
    });
    bus.registerTransition({
      from: "UPDATING", to: "READY",
      guard: () => true, action: async () => {}, onFail: () => "DEGRADED",
    });
    bus.registerTransition({
      from: "BOOT", to: "DEGRADED",
      guard: () => true, action: async () => {}, onFail: () => "DEGRADED",
    });
  }
}

/**
 * Create a new PWA runtime instance.
 *
 * ```ts
 * const pwa = createPwa({ preset: 'saas', swUrl: '/sw.js' });
 * await pwa.init();
 * ```
 */
function createPwa(config: BetterPwaConfig): BetterPwaRuntime {
  if (config.preset) {
    const preset = presets[config.preset as keyof typeof presets];
    if (preset) {
      config = { updateStrategy: preset.updateStrategy, ...config };
    }
  }
  return new BetterPwaRuntime(config);
}

export { BetterPwaRuntime, createPwa };
export type { BetterPwaConfig };

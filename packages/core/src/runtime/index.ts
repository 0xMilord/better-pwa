/**
 * BetterPwaRuntime — the main entry point.
 *
 * Wires together: State Engine, Lifecycle Bus, SW Registration,
 * Permission Orchestrator, Update Controller, Presets, and Cold Start.
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
  BetterPwaRuntime,
  BetterPwaConfig,
  BetterPwaPlugin,
  LifecycleEvent,
  LifecycleEventCallback,
  LifecycleEventType,
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
} from "../types.js";

class BetterPwaRuntime implements BetterPwaRuntime {
  #config: BetterPwaConfig;
  #stateEngine: StateEngine;
  #lifecycleBus: LifecycleBus;
  #permissionEngine: PermissionEngine;
  #updateController: UpdateController;
  #coldStartEngine: ColdStartEngine;
  #plugins: BetterPwaPlugin[] = [];
  #destroyed = false;
  #log = better.flow("better-pwa-runtime");

  constructor(config: BetterPwaConfig) {
    this.#config = { ...config };
    this.#stateEngine = new StateEngine();
    this.#lifecycleBus = new LifecycleBus();
    this.#permissionEngine = new PermissionEngine();
    this.#updateController = new UpdateController();
    this.#coldStartEngine = new ColdStartEngine(config);

    // Register default transitions
    this.#registerTransitions();
    this.#log.step("init").info({ config });
  }

  /** Initialize the runtime (async setup) */
  async init(): Promise<this> {
    await this.#stateEngine.init();

    // Register service worker
    if (this.#config.swUrl) {
      const registration = await registerServiceWorker(
        {
          swUrl: this.#config.swUrl,
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

    // Run cold start
    const bootResult = await this.#coldStartEngine.boot();

    // Transition to boot state
    await this.#lifecycleBus.transition("BOOT", {
      config: this.#config,
      state: this.#stateEngine.snapshot(),
    });

    // Transition based on boot result
    await this.#lifecycleBus.transition(bootResult.state, {
      config: this.#config,
      state: this.#stateEngine.snapshot(),
    });

    // Initialize plugins
    for (const plugin of this.#plugins) {
      try {
        plugin.onInit?.(this);
      } catch (err) {
        this.#log.step("plugin-init-error").warn({ plugin: plugin.name, error: err });
      }
    }

    this.#log.step("ready").success({ state: bootResult.state });
    return this;
  }

  // ─── State Engine API ───────────────────────────────────────────────────

  state = (): BetterPwaRuntime["state"] extends () => infer R ? R : never => {
    const engine = this.#stateEngine;
    return {
      snapshot: (): Readonly<PwaState> => engine.snapshot(),
      subscribe: (keys: StateKeys[], cb: StateSubscriber): Unsubscribe =>
        engine.subscribe(keys, cb),
      set: async <T extends StateKeys>(key: T, value: PwaState[T]): Promise<void> =>
        engine.set(key, value),
      reset: async (): Promise<void> => engine.reset(),
    } as unknown as BetterPwaRuntime["state"] extends () => infer R ? R : never;
  };

  // ─── Lifecycle API ──────────────────────────────────────────────────────

  lifecycle = (): {
    state: () => AppState;
    onTransition: (cb: (from: AppState, to: AppState, metadata: Record<string, unknown>) => void) => Unsubscribe;
    blockedTransitions: () => TransitionRecord[];
  } => {
    const bus = this.#lifecycleBus;
    return {
      state: () => bus.state(),
      onTransition: (cb) => bus.onTransition(cb),
      blockedTransitions: () => bus.getBlockedTransitions(),
    };
  };

  // ─── Permissions API ────────────────────────────────────────────────────

  permissions = (): {
    request: (permissions: string[], options?: PermissionRequestOptions) => Promise<PermissionResults>;
    status: () => PermissionResults;
    on: (event: "denied", cb: (permission: string, fallback: { show: (opts: Record<string, string>) => void }) => void) => Unsubscribe;
  } => {
    const engine = this.#permissionEngine;
    return {
      request: (perms, opts) => engine.request(perms, opts),
      status: () => engine.status(),
      on: (event, cb) => engine.on(event, cb),
    };
  };

  // ─── Update API ─────────────────────────────────────────────────────────

  update = (): {
    setStrategy: (strategy: "soft" | "hard" | "gradual" | "on-reload", options?: GradualRolloutOptions) => void;
    on: (event: "update_available", cb: (version: string) => void) => Unsubscribe;
    activate: () => Promise<void>;
    status: () => UpdateStatus;
  } => {
    const controller = this.#updateController;
    return {
      setStrategy: (s, o) => controller.setStrategy(s, o),
      on: (e, cb) => controller.on(e, cb),
      activate: () => controller.activate(),
      status: () => controller.status(),
    };
  };

  // ─── Event Bus ──────────────────────────────────────────────────────────

  on<T extends LifecycleEvent>(type: T["type"], cb: LifecycleEventCallback<T>): Unsubscribe {
    return this.#lifecycleBus.on(type, cb);
  }

  // ─── Plugin System ──────────────────────────────────────────────────────

  use(plugin: BetterPwaPlugin): void {
    this.#plugins.push(plugin);
    this.#log.step("plugin-registered").info({ name: plugin.name, version: plugin.version });
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

    this.#log.step("destroy").success();
  }

  // ─── Private ────────────────────────────────────────────────────────────

  #registerTransitions(): void {
    const bus = this.#lifecycleBus;

    // IDLE → BOOT
    bus.registerTransition({
      from: "IDLE",
      to: "BOOT",
      guard: () => true,
      action: async () => {},
      onFail: () => "DEGRADED",
    });

    // BOOT → READY
    bus.registerTransition({
      from: "BOOT",
      to: "READY",
      guard: () => true,
      action: async () => {},
      onFail: () => "DEGRADED",
    });

    // BOOT → DEGRADED (hydrate failure)
    bus.registerTransition({
      from: "BOOT",
      to: "DEGRADED",
      guard: () => true,
      action: async () => {},
      onFail: () => "DEGRADED",
    });

    // READY → OFFLINE
    bus.registerTransition({
      from: "READY",
      to: "OFFLINE",
      guard: (ctx) => ctx.state.isOffline,
      action: async () => {},
      onFail: () => "READY",
    });

    // OFFLINE → SYNCING
    bus.registerTransition({
      from: "OFFLINE",
      to: "SYNCING",
      guard: (ctx) => !ctx.state.isOffline,
      action: async () => {},
      onFail: () => "OFFLINE",
    });

    // SYNCING → STABLE
    bus.registerTransition({
      from: "SYNCING",
      to: "STABLE",
      guard: () => true,
      action: async () => {},
      onFail: () => "DEGRADED",
    });

    // READY → UPDATING
    bus.registerTransition({
      from: "READY",
      to: "UPDATING",
      guard: (ctx) => Boolean(ctx.state.hasUpdate),
      action: async () => {},
      onFail: () => "READY",
    });

    // UPDATING → READY
    bus.registerTransition({
      from: "UPDATING",
      to: "READY",
      guard: () => true,
      action: async () => {},
      onFail: () => "DEGRADED",
    });

    // READY → STABLE
    bus.registerTransition({
      from: "READY",
      to: "STABLE",
      guard: () => true,
      action: async () => {},
      onFail: () => "READY",
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
  // Merge preset config if specified
  if (config.preset) {
    const preset = presets[config.preset];
    if (preset) {
      config = {
        updateStrategy: preset.updateStrategy,
        ...config,
      };
    }
  }

  const runtime = new BetterPwaRuntime(config);
  // Return proxy that auto-inits
  return runtime;
}

export { BetterPwaRuntime, createPwa };
export type { BetterPwaConfig };

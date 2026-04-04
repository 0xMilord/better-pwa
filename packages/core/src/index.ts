/**
 * @better-pwa/core
 *
 * Zero-dependency PWA runtime: state engine, lifecycle bus,
 * permissions, updates, presets, and cold start strategy.
 */

// Public API
export { createPwa, BetterPwaRuntime } from "./runtime/index.js";
export { StateEngine, getDefaultState } from "./state/engine.js";
export { LifecycleBus } from "./lifecycle/bus.js";
export { registerServiceWorker, getSwRegistration } from "./lifecycle/sw-register.js";
export { PermissionEngine } from "./permissions/orchestrator.js";
export { UpdateController } from "./updates/controller.js";
export { ColdStartEngine } from "./boot/cold-start.js";
export { presets, definePreset } from "./presets/index.js";

// Types
export type {
  PwaState,
  StateDiff,
  StateKeys,
  StateSubscriber,
  Unsubscribe,
  LifecycleEvent,
  LifecycleEventType,
  LifecycleEventCallback,
  AppState,
  TransitionContext,
  Transition,
  TransitionRecord,
  MigrationFn,
  Migration,
  PermissionResults,
  PermissionRequestOptions,
  UpdateStatus,
  GradualRolloutOptions,
  BootStage,
  ColdStartResult,
  PresetName,
  PresetConfig,
  BetterPwaPlugin,
  StateEngine,
  LifecycleEngine,
  PermissionEngine,
  UpdateEngine,
  BetterPwaConfig,
  BetterPwaRuntime,
} from "./types.js";

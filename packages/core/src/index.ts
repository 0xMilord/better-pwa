/**
 * @better-pwa/core
 *
 * Zero-dependency PWA runtime: state engine, lifecycle bus,
 * permissions, updates, presets, and cold start strategy.
 */

// Public API — runtime
export { createPwa } from "./runtime/index.js";
export type { BetterPwaRuntime, BetterPwaConfig } from "./runtime/index.js";

// Public API — engines (for advanced users who need direct access)
export { StateEngine } from "./state/engine.js";
export { getDefaultState } from "./state/engine.js";
export { LifecycleBus } from "./lifecycle/bus.js";
export { registerServiceWorker, getSwRegistration } from "./lifecycle/sw-register.js";
export { PermissionEngine } from "./permissions/orchestrator.js";
export { UpdateController } from "./updates/controller.js";
export { ColdStartEngine } from "./boot/cold-start.js";
export { presets, definePreset } from "./presets/index.js";

// Type exports
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
  StateEngineAPI,
  LifecycleEngineAPI,
  PermissionEngineAPI,
  UpdateEngineAPI,
  BetterPwaRuntimeShape,
} from "./types.js";

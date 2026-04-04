/**
 * @better-pwa/core — Type definitions
 */

// ─── State Schema ───────────────────────────────────────────────────────────

export interface PwaState {
  // Network
  isOffline: boolean;
  connectionType: "slow-2g" | "2g" | "3g" | "4g" | null;

  // Installation
  isInstalled: boolean;
  installMethod: "prompt" | "auto" | null;
  canInstall: boolean;

  // Updates
  hasUpdate: boolean | string;
  updateStrategy: "soft" | "hard" | "gradual" | "on-reload";
  updateProgress: number;

  // Permissions
  permissions: Record<string, PermissionState>;

  // Storage
  storage: {
    usage: number;
    quota: number;
    engine: "opfs" | "idb" | "memory";
    utilizationPercent: number;
  };

  // Environment
  isSecureContext: boolean;
  isStandalone: boolean;
  tabCount: number;
}

export interface StateDiff {
  [key: string]: unknown;
}

export type StateKeys = keyof PwaState;
export type StateSubscriber = (diff: StateDiff) => void;
export type Unsubscribe = () => void;

// ─── Lifecycle Events ──────────────────────────────────────────────────────

export type LifecycleEvent =
  | { type: "sw:registered"; detail: { swVersion: string } }
  | { type: "sw:activated"; detail: { swVersion: string } }
  | { type: "sw:redundant"; detail: { error?: Error } }
  | { type: "sw:activation_failed"; detail: { error: Error } }
  | { type: "sw:detection_degraded"; detail: Record<string, unknown> }
  | { type: "app:installed"; detail: { method: "prompt" | "auto" } }
  | { type: "app:offline"; detail: { timestamp: number } }
  | { type: "app:online"; detail: { timestamp: number; offlineDuration: number } }
  | { type: "update:available"; detail: { version: string; size?: number } }
  | { type: "update:applied"; detail: { version: string } }
  | { type: "permission:changed"; detail: { name: string; state: PermissionState } }
  | { type: "permission:denied"; detail: { name: string } }
  | { type: "tab:join"; detail: { tabId: string; isLeader: boolean } }
  | { type: "tab:leave"; detail: { tabId: string } }
  | { type: "tab:leader_change"; detail: { oldLeader?: string; newLeader: string } }
  | { type: "boot:stage_complete"; detail: { stage: string } }
  | { type: "boot:stage_failed"; detail: { stage: string; error: unknown } }
  | { type: "boot:replay_deferred"; detail: Record<string, unknown> }
  | { type: "state:migrated"; detail: { from: string; to: string } }
  | { type: "guarantee:at_risk"; detail: { guarantee: string; severity: "warning" | "critical"; reason: string; context: Record<string, unknown>; timestamp: number } };

export type LifecycleEventType = LifecycleEvent["type"];
export type LifecycleEventCallback<T extends LifecycleEvent = LifecycleEvent> = (event: T) => void;

// ─── AppState (Deterministic State Machine) ────────────────────────────────

export type AppState = "IDLE" | "BOOT" | "READY" | "OFFLINE" | "SYNCING" | "UPDATING" | "STABLE" | "DEGRADED";

export interface TransitionContext {
  config: BetterPwaConfig | null;
  state: PwaState;
  error?: unknown;
}

export interface Transition {
  from: AppState;
  to: AppState;
  guard: (ctx: TransitionContext) => boolean;
  action: (ctx: TransitionContext) => Promise<void>;
  onFail: (ctx: TransitionContext) => AppState;
}

export interface TransitionRecord {
  from: AppState;
  to: AppState;
  timestamp: number;
  blocked?: boolean;
  reason?: string;
}

// ─── State Migrations ──────────────────────────────────────────────────────

export type MigrationFn = (state: Record<string, unknown>) => Record<string, unknown>;

export interface Migration {
  version: string;
  fn: MigrationFn;
}

// ─── Permission Orchestrator ───────────────────────────────────────────────

export interface PermissionRequestOptions {
  reason?: string;
  prePrompt?: () => void | Promise<void>;
  maxRetries?: number;
}

export interface PermissionResults {
  [key: string]: PermissionState;
}

// ─── Update Controller ─────────────────────────────────────────────────────

export interface UpdateStatus {
  current: string;
  waiting: string | null;
  strategy: "soft" | "hard" | "gradual" | "on-reload";
}

export interface GradualRolloutOptions {
  rollout: number;
  window: string;
  seed: string;
}

// ─── Cold Start ─────────────────────────────────────────────────────────────

export interface BootStage {
  name: string;
  fn: (config: BetterPwaConfig) => Promise<void>;
  timeout: number;
}

export interface ColdStartResult {
  state: AppState;
  stagesCompleted: string[];
  stagesFailed: string[];
}

// ─── Presets ────────────────────────────────────────────────────────────────

export type PresetName = "saas" | "ecommerce" | "offline-first" | "content";

export interface PresetConfig {
  updateStrategy: "soft" | "hard" | "gradual" | "on-reload";
  permissionBehavior: "batch" | "sequential" | "manual";
  storageEngine: "opfs" | "idb" | "auto";
  conflictResolution: "lww" | "merge" | "manual";
  priorityTiers: {
    critical: string[];
    high: string[];
    normal: string[];
    low: string[];
  };
}

// ─── Plugin System ─────────────────────────────────────────────────────────

export interface StateDiff {
  [key: string]: unknown;
}

export interface BetterPwaPlugin {
  name: string;
  version: string;
  onInit?(pwa: BetterPwaRuntime): void;
  onStateChange?(diff: StateDiff, state: PwaState): void;
  onLifecycleEvent?(event: LifecycleEvent): void;
  extend?(api: Record<string, unknown>): void;
}

// ─── Public API ─────────────────────────────────────────────────────────────

export interface StateEngine {
  snapshot(): Readonly<PwaState>;
  subscribe(keys: StateKeys[], cb: StateSubscriber): Unsubscribe;
  set<T extends StateKeys>(key: T, value: PwaState[T]): Promise<void>;
  reset(): Promise<void>;
}

export interface LifecycleEngine {
  state(): AppState;
  onTransition(cb: (from: AppState, to: AppState, metadata: Record<string, unknown>) => void): Unsubscribe;
  blockedTransitions(): TransitionRecord[];
}

export interface PermissionEngine {
  request(permissions: string[], options?: PermissionRequestOptions): Promise<PermissionResults>;
  status(): PermissionResults;
  on(event: "denied", cb: (permission: string, fallback: { show: (opts: Record<string, string>) => void }) => void): Unsubscribe;
}

export interface UpdateEngine {
  setStrategy(strategy: "soft" | "hard" | "gradual" | "on-reload", options?: GradualRolloutOptions): void;
  on(event: "update_available", cb: (version: string) => void): Unsubscribe;
  activate(): Promise<void>;
  status(): UpdateStatus;
}

export interface BetterPwaConfig {
  preset?: PresetName;
  swUrl?: string;
  scope?: string;
  updateStrategy?: "soft" | "hard" | "gradual" | "on-reload";
  debug?: boolean;
  migrationWindow?: number;
  [key: string]: unknown;
}

export interface BetterPwaRuntime {
  state: () => StateEngine;
  lifecycle: () => LifecycleEngine;
  permissions: () => PermissionEngine;
  update: () => UpdateEngine;
  on<T extends LifecycleEvent>(type: T["type"], cb: LifecycleEventCallback<T>): Unsubscribe;
  use(plugin: BetterPwaPlugin): void;
  destroy(): Promise<void>;
}

export declare function createPwa(config: BetterPwaConfig): BetterPwaRuntime;
export declare function getDefaultState(): PwaState;
export declare function definePreset(config: Partial<PresetConfig>): PresetConfig;
export declare const presets: Record<PresetName, PresetConfig>;

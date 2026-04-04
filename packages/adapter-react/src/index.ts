/**
 * @better-pwa/adapter-react — React hooks for better-pwa.
 * Phase 1: Stub. Full implementation in v0.3.
 */
import type { BetterPwaRuntime } from "@better-pwa/core";

export function usePwaState(_runtime: BetterPwaRuntime) {
  return { isOffline: false, isInstalled: false };
}

export function usePwaUpdate(_runtime: BetterPwaRuntime) {
  return { activate: async () => {} };
}

/**
 * Lifecycle Bus — typed event system for all PWA lifecycle events.
 *
 * Features:
 * - Typed events with schema validation
 * - Subscribe/unsubscribe
 * - Transition tracking history
 */
import { better } from "@better-logger/core";
import type {
  LifecycleEvent,
  LifecycleEventType,
  LifecycleEventCallback,
  Unsubscribe,
  AppState,
  Transition,
  TransitionContext,
  TransitionRecord,
} from "../types.js";

class LifecycleBus {
  #listeners = new Map<LifecycleEventType, Set<LifecycleEventCallback>>();
  #transitionListeners = new Set<(from: AppState, to: AppState, metadata: Record<string, unknown>) => void>();
  #currentState: AppState = "IDLE";
  #transitions: Transition[] = [];
  #transitionHistory: TransitionRecord[] = [];
  #blockedTransitions: TransitionRecord[] = [];

  /** Register a transition rule with guard, action, and fallback */
  registerTransition(transition: Transition): void {
    this.#transitions.push(transition);
  }

  /** Attempt to transition from current state to target state */
  async transition(to: AppState, context: TransitionContext): Promise<boolean> {
    const from = this.#currentState;
    const matchingTransition = this.#transitions.find(
      (t) => t.from === from && t.to === to
    );

    const record: TransitionRecord = {
      from,
      to,
      timestamp: Date.now(),
    };

    if (!matchingTransition) {
      record.blocked = true;
      record.reason = `No transition defined: ${from} → ${to}`;
      this.#blockedTransitions.push(record);
      better.log.warn("lifecycle:transition-no-rule", { from, to });
      return false;
    }

    // Execute guard
    if (!matchingTransition.guard(context)) {
      record.blocked = true;
      record.reason = "Guard returned false";
      this.#blockedTransitions.push(record);
      better.log.warn("lifecycle:transition-guard-failed", { from, to });
      return false;
    }

    // Execute action
    try {
      await matchingTransition.action(context);
      this.#currentState = to;
      this.#transitionHistory.push({ ...record });

      // Notify transition listeners
      for (const cb of this.#transitionListeners) {
        cb(from, to, { timestamp: record.timestamp });
      }

      better.log.info("lifecycle:transition", { from, to });
      return true;
    } catch (error) {
      record.blocked = true;
      record.reason = error instanceof Error ? error.message : String(error);
      this.#blockedTransitions.push(record);

      const fallback = matchingTransition.onFail({ ...context, error });
      this.#currentState = fallback;
      better.log.error("lifecycle:transition-failed", { from, to, fallback, error });
      return false;
    }
  }

  /** Get current lifecycle state */
  state(): AppState {
    return this.#currentState;
  }

  /** Subscribe to state transitions */
  onTransition(
    cb: (from: AppState, to: AppState, metadata: Record<string, unknown>) => void
  ): Unsubscribe {
    this.#transitionListeners.add(cb);
    return () => {
      this.#transitionListeners.delete(cb);
    };
  }

  /** Get blocked transitions */
  getBlockedTransitions(): TransitionRecord[] {
    return [...this.#blockedTransitions];
  }

  /** Emit a lifecycle event to all subscribers */
  emit<T extends LifecycleEvent>(event: T): void {
    const subs = this.#listeners.get(event.type);
    if (!subs) return;
    for (const cb of subs) {
      try {
        (cb as LifecycleEventCallback<T>)(event);
      } catch (err) {
        better.log.warn("lifecycle:emit-error", { event: event.type, error: err });
      }
    }
  }

  /** Subscribe to a specific event type */
  on<T extends LifecycleEvent>(type: T["type"], cb: LifecycleEventCallback<T>): Unsubscribe {
    if (!this.#listeners.has(type)) {
      this.#listeners.set(type, new Set());
    }
    this.#listeners.get(type)!.add(cb as LifecycleEventCallback);
    return () => {
      this.#listeners.get(type)?.delete(cb as LifecycleEventCallback);
    };
  }

  /** Subscribe to all events (observer pattern) */
  observe(): { subscribe: (cb: LifecycleEventCallback) => Unsubscribe } {
    const allCb = new Set<LifecycleEventCallback>();
    const wrapper = (event: LifecycleEvent) => {
      for (const cb of allCb) cb(event);
    };

    for (const type of this.#listeners.keys()) {
      this.on(type as LifecycleEventType, wrapper);
    }

    return {
      subscribe: (cb: LifecycleEventCallback) => {
        allCb.add(cb);
        return () => allCb.delete(cb);
      },
    };
  }

  destroy(): void {
    this.#listeners.clear();
    this.#transitionListeners.clear();
    this.#blockedTransitions = [];
  }
}

export { LifecycleBus };

/**
 * Service Worker registration wrapper with fallback handling.
 */
import { better } from "@better-logger/core";
import type { LifecycleBus } from "./bus.js";

interface SwRegistrationOptions {
  swUrl: string;
  scope?: string;
  onUpdateFound?: (registration: ServiceWorkerRegistration) => void;
}

async function registerServiceWorker(
  options: SwRegistrationOptions,
  bus: LifecycleBus
): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) {
    better.log.warn("sw-registration:not-supported");
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register(options.swUrl, {
      scope: options.scope ?? "/",
    });

    bus.emit({
      type: "sw:registered",
      detail: { swVersion: "unknown" },
    });

    registration.addEventListener("updatefound", () => {
      const newWorker = registration.installing;
      if (!newWorker) return;

      options.onUpdateFound?.(registration);

      newWorker.addEventListener("statechange", () => {
        if (newWorker.state === "installed") {
          bus.emit({
            type: "update:available",
            detail: { version: "pending" },
          });
        }
        if (newWorker.state === "activated") {
          bus.emit({
            type: "sw:activated",
            detail: { swVersion: "unknown" },
          });
        }
        if (newWorker.state === "redundant") {
          bus.emit({
            type: "sw:redundant",
            detail: { error: new Error("Service worker became redundant") },
          });
        }
      });
    });

    better.log.info("sw-registration:registered", { scope: options.scope ?? "/" });
    return registration;
  } catch (error) {
    better.log.error("sw-registration:failed", { error });
    bus.emit({
      type: "sw:redundant",
      detail: { error: error instanceof Error ? error : new Error(String(error)) },
    });
    return null;
  }
}

/** Check if a service worker is already registered */
async function getSwRegistration(scope?: string): Promise<ServiceWorkerRegistration | undefined> {
  if (!("serviceWorker" in navigator)) return undefined;
  const registrations = await navigator.serviceWorker.getRegistrations();
  if (!scope) return registrations[0];
  return registrations.find((r) => r.scope === new URL(scope, location.href).href);
}

export { registerServiceWorker, getSwRegistration };

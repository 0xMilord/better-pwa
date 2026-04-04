// test/setup.ts — Global test setup for all packages
import 'fake-indexeddb/auto';
import { BroadcastChannel } from 'broadcastchannel-polyfill';

// Polyfill BroadcastChannel for jsdom
if (typeof globalThis.BroadcastChannel === 'undefined') {
  (globalThis as unknown as Record<string, unknown>).BroadcastChannel = BroadcastChannel;
}

// Mock navigator.serviceWorker for all tests
const mockServiceWorker = {
  ready: Promise.resolve({} as ServiceWorkerRegistration),
  register: vi.fn().mockResolvedValue({} as ServiceWorkerRegistration),
  getRegistration: vi.fn().mockResolvedValue(undefined as ServiceWorkerRegistration | undefined),
  getRegistrations: vi.fn().mockResolvedValue([] as ServiceWorkerRegistration[]),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
};

Object.defineProperty(globalThis.navigator, 'serviceWorker', {
  value: mockServiceWorker,
  writable: true,
  configurable: true,
});

// Mock navigator.onLine
Object.defineProperty(globalThis.navigator, 'onLine', {
  value: true,
  writable: true,
  configurable: true,
});

// Mock navigator.connection
Object.defineProperty(globalThis.navigator, 'connection', {
  value: {
    effectiveType: '4g',
    downlink: 10,
    rtt: 50,
    saveData: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  },
  writable: true,
  configurable: true,
});

// Mock navigator.permissions
Object.defineProperty(globalThis.navigator, 'permissions', {
  value: {
    query: vi.fn().mockRejectedValue(new Error('not supported in jsdom')),
  },
  writable: true,
  configurable: true,
});

// Mock navigator.mediaDevices
Object.defineProperty(globalThis.navigator, 'mediaDevices', {
  value: {
    getUserMedia: vi.fn().mockRejectedValue(new Error('not available')),
  },
  writable: true,
  configurable: true,
});

// Mock window.matchMedia
globalThis.matchMedia = vi.fn().mockImplementation((query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: vi.fn(),
  removeListener: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
}));

// Mock IDB
globalThis.indexedDB = globalThis.indexedDB || (globalThis as unknown as Record<string, unknown>).indexedDB;

// Mock storage manager
Object.defineProperty(navigator, 'storage', {
  value: {
    estimate: vi.fn().mockResolvedValue({ usage: 1000, quota: 1000000000 }),
    persist: vi.fn().mockResolvedValue(true),
    persisted: vi.fn().mockResolvedValue(false),
  },
  writable: true,
  configurable: true,
});

// Mock caches API
globalThis.caches = {
  open: vi.fn().mockResolvedValue({
    keys: vi.fn().mockResolvedValue([]),
    match: vi.fn().mockResolvedValue(null),
  }),
  has: vi.fn().mockResolvedValue(false),
  delete: vi.fn().mockResolvedValue(false),
  keys: vi.fn().mockResolvedValue([]),
} as unknown as CacheStorage;

// Mock window.location for update controller tests
const mockLocation = {
  ...window.location,
  reload: vi.fn(),
};
Object.defineProperty(window, 'location', {
  value: mockLocation,
  writable: true,
  configurable: true,
});

// Mock Notification
globalThis.Notification = {
  requestPermission: vi.fn().mockResolvedValue('denied'),
  permission: 'default',
} as unknown as typeof Notification;

// Silence better-logger in tests
try {
  const { better } = await import('@better-logger/core');
  better.setEnabled(false);
} catch {
  // Logger not available yet, skip
}

import { getRozeniteDevToolsClient, type RozeniteDevToolsClient, type Subscription } from '@rozenite/plugin-bridge';
import { useEffect, useMemo } from 'react';
import type { StoreApi } from 'zustand/vanilla';

import { applyPathPatch, computeStoreId, createSanitizedSnapshot, createStoreDescriptor, deleteAtPathRuntime, mergeFunctionsFromCurrent, stripSanitizationMarkers } from './src/lib/zustandManagerCore';

const PLUGIN_ID = '@rozenite/zustand-manager';

type RedactPattern = RegExp;

type StoreEntry<TState extends Record<string, unknown> = Record<string, unknown>> = {
  id?: string;
  name: string;
  file?: string;
  store: Pick<StoreApi<TState>, 'getState' | 'setState' | 'subscribe' | 'getInitialState'>;
  actions?: string[];
  editable?: boolean;
  redactPattern?: RedactPattern;
};

type StoreDescriptor = ReturnType<typeof createStoreDescriptor>;

type ZustandManagerEvents = {
  'zustand:snapshot': { stores: StoreDescriptor[]; timestamp: number };
  'zustand:store-update': { store: StoreDescriptor; previousState?: Record<string, unknown>; path?: string; kind?: 'edit' | 'action' | 'replace' | 'reset'; action?: string; timestamp: number };
  'zustand:store-reset': { storeId: string; storeName: string; timestamp: number };
  'zustand:request-snapshot': { reason: string };
  'zustand:patch-value': { storeId: string; path: string; value: unknown };
  'zustand:delete-value': { storeId: string; path: string };
  'zustand:replace-state': { storeId: string; value: Record<string, unknown> };
  'zustand:call-action': { storeId: string; actionName: string; args?: unknown[] };
  'zustand:reset-store': { storeId: string };
};

type RegisteredEntry = {
  entry: StoreEntry;
  unsubscribe: () => void;
};

type ZustandManagerRuntime = {
  register: (entry: StoreEntry) => () => void;
  snapshot: () => { stores: StoreDescriptor[]; timestamp: number };
  patch: (storeId: string, path: string, value: unknown) => boolean;
  reset: (storeId: string) => boolean;
  stores: () => string[];
};

type GlobalWithZustandManager = typeof globalThis & {
  __ZUSTAND_MANAGER__?: {
    pluginId: string;
    stores: string[];
    snapshot: ZustandManagerRuntime['snapshot'];
    patch: ZustandManagerRuntime['patch'];
    reset: ZustandManagerRuntime['reset'];
  };
  __ROZENITE_ZUSTAND_MANAGER_RUNTIME__?: ZustandManagerRuntime;
};

function createRuntime(): ZustandManagerRuntime {
  const registeredEntries = new Map<string, RegisteredEntry>();
  const updateCounts = new Map<string, number>();
  let client: RozeniteDevToolsClient<ZustandManagerEvents> | null = null;
  let clientPromise: Promise<RozeniteDevToolsClient<ZustandManagerEvents> | null> | null = null;
  let bridgeSubscriptions: Subscription[] = [];

  const getEntries = () => Array.from(registeredEntries.values()).map(({ entry }) => entry);

  const describeStores = () => getEntries().map((entry) => createStoreDescriptor(entry, updateCounts.get(computeStoreId(entry)) ?? 0));

  const sendSnapshot = () => {
    const snapshot = {
      stores: describeStores(),
      timestamp: Date.now(),
    };
    client?.send('zustand:snapshot', snapshot);
    return snapshot;
  };

  const findEntry = (storeId: string) => registeredEntries.get(storeId)?.entry;

  const patchStoreValue = (storeId: string, path: string, value: unknown) => {
    const entry = findEntry(storeId);
    if (!entry || entry.editable === false) return false;
    const safeValue = stripSanitizationMarkers(value);
    if (safeValue === undefined) return false;

    const { partial } = applyPathPatch(entry.store.getState(), path, safeValue);
    entry.store.setState(partial as Partial<ReturnType<typeof entry.store.getState>>, false);
    return true;
  };

  const replaceStoreState = (storeId: string, value: Record<string, unknown>) => {
    const entry = findEntry(storeId);
    if (!entry || entry.editable === false) return false;
    const cleaned = stripSanitizationMarkers(value) as Record<string, unknown> | undefined;
    if (!cleaned || typeof cleaned !== 'object') return false;
    const merged = mergeFunctionsFromCurrent(cleaned, entry.store.getState());
    entry.store.setState(merged as Partial<ReturnType<typeof entry.store.getState>>, true);
    return true;
  };

  const deleteStoreValue = (storeId: string, path: string) => {
    const entry = findEntry(storeId);
    if (!entry || entry.editable === false) return false;
    const { partial } = deleteAtPathRuntime(entry.store.getState(), path);
    entry.store.setState(partial as Partial<ReturnType<typeof entry.store.getState>>, false);
    return true;
  };

  const callStoreAction = (storeId: string, actionName: string, args: unknown[] = []) => {
    const entry = findEntry(storeId);
    const action = entry?.store.getState()[actionName];
    if (typeof action !== 'function') return false;
    const safeArgs = args.map((arg) => stripSanitizationMarkers(arg));
    (action as (...callArgs: unknown[]) => unknown)(...safeArgs);
    return true;
  };

  const resetStore = (storeId: string) => {
    const entry = findEntry(storeId);
    if (!entry || typeof entry.store.getInitialState !== 'function') return false;
    entry.store.setState(entry.store.getInitialState(), true);
    client?.send('zustand:store-reset', { storeId, storeName: entry.name, timestamp: Date.now() });
    return true;
  };

  const exposeDebugApi = () => {
    const debugApi = {
      pluginId: PLUGIN_ID,
      stores: getEntries().map((entry) => entry.name),
      snapshot: sendSnapshot,
      patch: patchStoreValue,
      reset: resetStore,
      replace: replaceStoreState,
      callAction: callStoreAction,
    };
    (globalThis as GlobalWithZustandManager).__ZUSTAND_MANAGER__ = debugApi;
  };

  const setupBridge = (nextClient: RozeniteDevToolsClient<ZustandManagerEvents>) => {
    bridgeSubscriptions.forEach((subscription) => subscription.remove());
    client = nextClient;
    bridgeSubscriptions = [
      nextClient.onMessage('zustand:request-snapshot', sendSnapshot),
      nextClient.onMessage('zustand:patch-value', ({ storeId, path, value }) => {
        patchStoreValue(storeId, path, value);
      }),
      nextClient.onMessage('zustand:delete-value', ({ storeId, path }) => {
        deleteStoreValue(storeId, path);
      }),
      nextClient.onMessage('zustand:replace-state', ({ storeId, value }) => {
        replaceStoreState(storeId, value);
      }),
      nextClient.onMessage('zustand:call-action', ({ storeId, actionName, args }) => {
        callStoreAction(storeId, actionName, args);
      }),
      nextClient.onMessage('zustand:reset-store', ({ storeId }) => {
        resetStore(storeId);
      }),
    ];
    sendSnapshot();
  };

  const ensureBridge = () => {
    if (client || clientPromise) return;
    clientPromise = getRozeniteDevToolsClient<ZustandManagerEvents>(PLUGIN_ID)
      .then((nextClient) => {
        clientPromise = null;
        setupBridge(nextClient);
        return nextClient;
      })
      .catch((error: unknown) => {
        clientPromise = null;
        console.warn('[Zustand Manager] Failed to initialize Rozenite bridge.', error);
        return null;
      });
  };

  const register = (entry: StoreEntry) => {
    const storeId = computeStoreId(entry);
    const previous = registeredEntries.get(storeId);
    previous?.unsubscribe();

    const unsubscribe = entry.store.subscribe((_state, previousState) => {
      updateCounts.set(storeId, (updateCounts.get(storeId) ?? 0) + 1);
      exposeDebugApi();
      const updates = updateCounts.get(storeId) ?? 0;
      const sanitizedPrevious = createSanitizedSnapshot(previousState, entry) as Record<string, unknown>;
      client?.send('zustand:store-update', {
        store: createStoreDescriptor(entry, updates),
        previousState: sanitizedPrevious,
        timestamp: Date.now(),
      });
    });

    registeredEntries.set(storeId, { entry, unsubscribe });
    exposeDebugApi();
    ensureBridge();
    sendSnapshot();

    return () => {
      const current = registeredEntries.get(storeId);
      if (current?.entry === entry) {
        current.unsubscribe();
        registeredEntries.delete(storeId);
        exposeDebugApi();
        sendSnapshot();
      }
    };
  };

  return {
    register,
    snapshot: sendSnapshot,
    patch: patchStoreValue,
    reset: resetStore,
    stores: () => getEntries().map((entry) => entry.name),
  };
}

function getRuntime() {
  const global = globalThis as GlobalWithZustandManager;
  global.__ROZENITE_ZUSTAND_MANAGER_RUNTIME__ ??= createRuntime();
  return global.__ROZENITE_ZUSTAND_MANAGER_RUNTIME__;
}

export function registerZustandStore(entry: StoreEntry) {
  return getRuntime().register(entry);
}

// External-system boundary: app runtime ↔ Rozenite DevTools bridge.
export function useZustandManager(stores: StoreEntry[]) {
  const stableStores = useMemo(() => stores, [stores]);

  useEffect(() => {
    const cleanupRegistrations = stableStores.map(registerZustandStore);
    return () => cleanupRegistrations.forEach((cleanup) => cleanup());
  }, [stableStores]);
}

export type { StoreEntry, ZustandManagerEvents };

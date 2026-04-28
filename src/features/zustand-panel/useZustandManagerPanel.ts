import { useRozeniteDevToolsClient } from '@rozenite/plugin-bridge';
import { useEffect, useMemo, useState } from 'react';

import { getPathValue } from '../../common/utils/stateUtils';
import type { Snapshot, StoreDescriptor, TimelineEvent, TimelineKind } from './types';

const PLUGIN_ID = 'rozenite-zustand-manager';
const REQUEST_SNAPSHOT_PAYLOAD = { reason: 'panel-request' };

type BridgeEvents = {
  'zustand:snapshot': { stores: StoreDescriptor[]; timestamp: number };
  'zustand:store-update': { store: StoreDescriptor; previousState?: Record<string, unknown>; path?: string; kind?: TimelineKind; action?: string; timestamp: number };
  'zustand:store-reset': { storeId: string; storeName: string; timestamp: number };
  'zustand:request-snapshot': { reason: string };
  'zustand:patch-value': { storeId: string; path: string; value: unknown };
  'zustand:delete-value': { storeId: string; path: string };
  'zustand:replace-state': { storeId: string; value: Record<string, unknown> };
  'zustand:call-action': { storeId: string; actionName: string; args?: unknown[] };
  'zustand:reset-store': { storeId: string };
};

function nowTime() {
  return `${new Date().toLocaleTimeString('en-GB', { hour12: false })}.${String(Date.now()).slice(-3)}`;
}

function shortStoreName(storeName: string) {
  return storeName.replace(/^use|Store$/g, '').toLowerCase() || storeName;
}

function walkLeaves(value: unknown, path: string, out: Map<string, unknown>) {
  if (value === null || value === undefined || typeof value !== 'object') {
    out.set(path, value);
    return;
  }
  if (Array.isArray(value)) {
    if (value.length === 0) out.set(path, '[]');
    else value.forEach((entry, index) => walkLeaves(entry, `${path}[${index}]`, out));
    return;
  }
  const entries = Object.entries(value as Record<string, unknown>);
  if (entries.length === 0) out.set(path, '{}');
  else entries.forEach(([key, entry]) => walkLeaves(entry, path ? `${path}.${key}` : key, out));
}

function leafEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (a !== null && b !== null && typeof a === 'object' && typeof b === 'object') return false;
  return false;
}

function countDelta(before: unknown, after: unknown) {
  if (Object.is(before, after)) return { added: 0, removed: 0 };
  const beforeLeaves = new Map<string, unknown>();
  const afterLeaves = new Map<string, unknown>();
  walkLeaves(before, '', beforeLeaves);
  walkLeaves(after, '', afterLeaves);
  let added = 0;
  let removed = 0;
  for (const [path, value] of afterLeaves) {
    if (!beforeLeaves.has(path)) added += 1;
    else if (!leafEqual(beforeLeaves.get(path), value)) added += 1;
  }
  for (const [path, value] of beforeLeaves) {
    if (!afterLeaves.has(path)) removed += 1;
    else if (!leafEqual(afterLeaves.get(path), value)) removed += 1;
  }
  return { added, removed };
}

function containsSanitizationMarker(value: unknown): boolean {
  if (value === '•••••• redacted' || value === '__zm_function__' || value === '[Circular]') return true;
  if (value === null || typeof value !== 'object') return false;
  if (Array.isArray(value)) return value.some((entry) => containsSanitizationMarker(entry));
  for (const entry of Object.values(value as Record<string, unknown>)) {
    if (containsSanitizationMarker(entry)) return true;
  }
  return false;
}

function createTimelineEvent(input: {
  storeId: string;
  storeName: string;
  path: string;
  kind: TimelineKind;
  action?: string;
  beforeState?: Record<string, unknown>;
  afterState?: Record<string, unknown>;
}): TimelineEvent {
  const before = input.path === '*' ? input.beforeState : getPathValue(input.beforeState, input.path);
  const after = input.path === '*' ? input.afterState : getPathValue(input.afterState, input.path);
  const delta = countDelta(before, after);
  return {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    ts: nowTime(),
    kind: input.kind,
    store: shortStoreName(input.storeName),
    storeId: input.storeId,
    storeName: input.storeName,
    action: input.action ?? (input.kind === 'edit' ? 'manual edit' : input.kind),
    path: input.path,
    before,
    after,
    beforeState: input.beforeState,
    afterState: input.afterState,
    redacted: containsSanitizationMarker(input.beforeState) || containsSanitizationMarker(input.afterState),
    added: delta.added,
    removed: delta.removed,
    dur: 0,
  };
}

function createSnapshot(stores: StoreDescriptor[], label = 'Manual capture'): Snapshot {
  const json = JSON.stringify(stores.map((store) => ({ id: store.id, name: store.name, state: store.state })));
  return {
    id: `snap_${Date.now()}`,
    at: new Date().toLocaleTimeString('en-GB', { hour12: false }),
    label,
    stores: stores.length,
    keys: stores.reduce((total, store) => total + (store.keys ?? 0), 0),
    size: `${(new Blob([json]).size / 1024).toFixed(1)} KB`,
    auto: label !== 'Manual capture',
    data: stores,
  };
}

// External-system boundary: Rozenite bridge subscriptions live here, not inside view components.
export function useZustandManagerPanel() {
  const client = useRozeniteDevToolsClient<BridgeEvents>({ pluginId: PLUGIN_ID });
  const [stores, setStores] = useState<StoreDescriptor[]>([]);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [connection, setConnection] = useState<'wait' | 'on' | 'off'>('wait');

  useEffect(() => {
    if (!client) {
      setConnection('wait');
      return undefined;
    }

    setConnection('on');

    const snapshotSub = client.onMessage('zustand:snapshot', (snapshot) => {
      const nextStores = Array.isArray(snapshot.stores) ? snapshot.stores : [];
      setStores(nextStores);
      setSnapshots((previous) => (previous.length > 0 || nextStores.length === 0 ? previous : [createSnapshot(nextStores, 'Initial attach')]));
      setConnection('on');
    });

    const updateSub = client.onMessage('zustand:store-update', ({ store, previousState, path = '*', kind = 'edit', action }) => {
      setStores((previous) => previous.map((entry) => (entry.id === store.id ? store : entry)));
      setTimeline((previous) =>
        [createTimelineEvent({ storeId: store.id, storeName: store.name, path, kind, action, beforeState: previousState, afterState: store.state }), ...previous].slice(0, 120),
      );
      setConnection('on');
    });

    const resetSub = client.onMessage('zustand:store-reset', ({ storeId, storeName }) => {
      setTimeline((previous) => [createTimelineEvent({ storeId, storeName, path: '*', kind: 'reset', action: 'reset to initial' }), ...previous].slice(0, 120));
    });

    client.send('zustand:request-snapshot', REQUEST_SNAPSHOT_PAYLOAD);

    return () => {
      snapshotSub.remove();
      updateSub.remove();
      resetSub.remove();
    };
  }, [client]);

  return useMemo(
    () => ({
      stores,
      timeline,
      snapshots,
      connection,
      isConnected: connection === 'on',
      patchValue: (storeId: string, path: string, value: unknown) => client?.send('zustand:patch-value', { storeId, path, value }),
      deleteValue: (storeId: string, path: string) => client?.send('zustand:delete-value', { storeId, path }),
      replaceState: (storeId: string, value: Record<string, unknown>) => client?.send('zustand:replace-state', { storeId, value }),
      callAction: (storeId: string, actionName: string, args?: unknown[]) => client?.send('zustand:call-action', { storeId, actionName, args }),
      resetStore: (storeId: string) => client?.send('zustand:reset-store', { storeId }),
      requestSnapshot: () => client?.send('zustand:request-snapshot', REQUEST_SNAPSHOT_PAYLOAD),
      captureSnapshot: (label?: string) => setSnapshots((previous) => [createSnapshot(stores, label), ...previous].slice(0, 30)),
      importSnapshot: (snapshot: Snapshot) => setSnapshots((previous) => [snapshot, ...previous].slice(0, 30)),
      clearTimeline: () => setTimeline([]),
    }),
    [client, connection, snapshots, stores, timeline],
  );
}

export const REDACTED_VALUE = '•••••• redacted';

export const DEFAULT_REDACT_PATTERN = /password|pass|pwd|token|accessToken|refreshToken|email|secret|apiKey|authorization/i;

type PathSegment = string | number;
type JsonObject = Record<string | number, unknown>;

type StoreLike = {
  getState: () => Record<string, unknown>;
  getInitialState?: () => Record<string, unknown>;
};

export type StoreDescriptorEntry = {
  id?: string;
  name: string;
  file?: string;
  store: StoreLike;
  actions?: string[];
  editable?: boolean;
  redactPattern?: RegExp;
};

export type ActionDescriptor = {
  name: string;
  arity: number;
  params: string[];
};

export type StoreDescriptor = {
  id: string;
  name: string;
  file: string;
  keys: number;
  updates: number;
  hot: boolean;
  actions: ActionDescriptor[];
  hasInitial: boolean;
  editable: boolean;
  state: Record<string, unknown>;
};

export function parsePath(path: string): PathSegment[] {
  if (!path) return [];
  const parts: PathSegment[] = [];
  const matcher = /([^.[\]]+)|\[(\d+)\]/g;
  for (const match of path.matchAll(matcher)) {
    if (match[1] != null) parts.push(match[1]);
    else parts.push(Number(match[2]));
  }
  return parts;
}

function cloneContainer<T>(value: T): JsonObject | unknown[] {
  if (Array.isArray(value)) return value.slice();
  if (value && typeof value === 'object') return { ...(value as JsonObject) };
  return {};
}

export function applyPathPatch(state: Record<string, unknown>, path: string, value: unknown): { nextState: Record<string, unknown>; partial: Record<string, unknown> } {
  const parts = parsePath(path);
  if (parts.length === 0) {
    throw new Error('Cannot patch empty path');
  }

  const rootKey = parts[0];
  const nextState = cloneContainer(state) as Record<string, unknown>;

  if (parts.length === 1) {
    nextState[rootKey] = value;
    return { nextState, partial: { [rootKey]: value } };
  }

  const nextRoot = cloneContainer(state[rootKey]);
  nextState[rootKey] = nextRoot;

  let sourceCursor = state[rootKey] as JsonObject | unknown[] | undefined;
  let targetCursor = nextRoot as JsonObject | unknown[];

  for (let index = 1; index < parts.length - 1; index += 1) {
    const key = parts[index];
    const nextKey = parts[index + 1];
    const sourceChild = sourceCursor?.[key as never];
    const targetChild = sourceChild == null ? (typeof nextKey === 'number' ? [] : {}) : cloneContainer(sourceChild);

    targetCursor[key as never] = targetChild as never;
    sourceCursor = sourceChild as JsonObject | unknown[] | undefined;
    targetCursor = targetChild as JsonObject | unknown[];
  }

  targetCursor[parts.at(-1) as never] = value as never;

  return { nextState, partial: { [rootKey]: nextRoot } };
}

function shouldRedact(key: string, redactPattern: RegExp): boolean {
  return redactPattern.test(key);
}

/**
 * Reserved string that identified function values in older versions of the bridge.
 * Kept exported so {@link stripSanitizationMarkers} can still scrub it from any
 * payload sent by an out-of-date runtime.
 */
export const FUNCTION_PLACEHOLDER = '__zm_function__';

function sanitizeWithSeen(value: unknown, redactPattern: RegExp, currentKey: string, seen: WeakSet<object>): unknown {
  // Functions are actions, not state — they appear in the dedicated Actions panel.
  // Returning undefined drops the key in object contexts; array contexts coerce to
  // null below to preserve indices.
  if (typeof value === 'function') return undefined;
  if (shouldRedact(currentKey, redactPattern)) return REDACTED_VALUE;
  if (value === null || value === undefined) return value;
  if (typeof value === 'bigint') return String(value);
  if (value instanceof Date) return value.toISOString();
  if (typeof value !== 'object') return value;

  if (seen.has(value as object)) return '[Circular]';
  seen.add(value as object);

  if (value instanceof Map) {
    const entries: [string, unknown][] = [];
    for (const [mapKey, mapValue] of value.entries()) {
      const keyStr = typeof mapKey === 'string' ? mapKey : String(mapKey);
      const sanitized = sanitizeWithSeen(mapValue, redactPattern, keyStr, seen);
      if (sanitized !== undefined) entries.push([keyStr, sanitized]);
    }
    return Object.fromEntries(entries);
  }
  if (value instanceof Set) {
    return Array.from(value).map((entry) => {
      const sanitized = sanitizeWithSeen(entry, redactPattern, '', seen);
      return sanitized === undefined ? null : sanitized;
    });
  }

  if (Array.isArray(value)) {
    // Preserve indices: drop functions / undefined to null so paths like items[2] stay stable.
    return value.map((entry) => {
      const sanitized = sanitizeWithSeen(entry, redactPattern, '', seen);
      return sanitized === undefined ? null : sanitized;
    });
  }

  const out: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    const sanitized = sanitizeWithSeen(entry, redactPattern, key, seen);
    if (sanitized !== undefined) out[key] = sanitized;
  }
  return out;
}

export function createSanitizedSnapshot(value: unknown, options: { redactPattern?: RegExp } = {}, currentKey = ''): unknown {
  const redactPattern = options.redactPattern ?? DEFAULT_REDACT_PATTERN;
  return sanitizeWithSeen(value, redactPattern, currentKey, new WeakSet());
}

/** Strip incoming markers from a value so they never reach the real store. */
export function stripSanitizationMarkers(value: unknown): unknown {
  if (value === REDACTED_VALUE || value === FUNCTION_PLACEHOLDER || value === '[Circular]') return undefined;
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) {
    const out: unknown[] = [];
    for (const entry of value) {
      const cleaned = stripSanitizationMarkers(entry);
      out.push(cleaned);
    }
    return out;
  }
  const out: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    const cleaned = stripSanitizationMarkers(entry);
    if (cleaned !== undefined) out[key] = cleaned;
  }
  return out;
}

/** Merge any function values from `current` back into `next`, preserving Zustand actions when restoring sanitized state. */
export function mergeFunctionsFromCurrent(next: Record<string, unknown>, current: Record<string, unknown>): Record<string, unknown> {
  const merged: Record<string, unknown> = { ...next };
  for (const [key, value] of Object.entries(current)) {
    if (typeof value === 'function' && typeof merged[key] !== 'function') {
      merged[key] = value;
    }
  }
  return merged;
}

/** Build a stable store id that is unique across files even when several stores share the same `name`. */
export function computeStoreId(entry: { id?: string; name: string; file?: string }): string {
  if (entry.id) return entry.id;
  return entry.file ? `${entry.file}:${entry.name}` : entry.name;
}

export function deleteAtPathRuntime(state: Record<string, unknown>, path: string): { nextState: Record<string, unknown>; partial: Record<string, unknown> } {
  const parts = parsePath(path);
  if (parts.length === 0) {
    throw new Error('Cannot delete with empty path');
  }
  const rootKey = parts[0];
  const nextState = cloneContainer(state) as Record<string, unknown>;

  if (parts.length === 1) {
    if (typeof rootKey === 'number') {
      throw new Error('Top-level key must be a string');
    }
    delete nextState[rootKey];
    return { nextState, partial: { [rootKey]: undefined } };
  }

  const nextRoot = cloneContainer(state[rootKey]);
  nextState[rootKey] = nextRoot;

  let sourceCursor = state[rootKey] as JsonObject | unknown[] | undefined;
  let targetCursor = nextRoot as JsonObject | unknown[];

  for (let index = 1; index < parts.length - 1; index += 1) {
    const key = parts[index];
    const sourceChild = sourceCursor?.[key as never];
    const targetChild = cloneContainer(sourceChild);
    targetCursor[key as never] = targetChild as never;
    sourceCursor = sourceChild as JsonObject | unknown[] | undefined;
    targetCursor = targetChild as JsonObject | unknown[];
  }

  const leaf = parts.at(-1) as PathSegment;
  if (Array.isArray(targetCursor) && typeof leaf === 'number') {
    targetCursor.splice(leaf, 1);
  } else {
    delete (targetCursor as Record<string | number, unknown>)[leaf];
  }

  return { nextState, partial: { [rootKey]: nextRoot } };
}

export function parseFunctionParams(fn: { length?: number; toString(): string }): string[] {
  const arity = typeof fn.length === 'number' ? fn.length : 0;
  if (arity === 0) return [];
  const fallback = Array.from({ length: arity }, (_, index) => `arg${index}`);

  let src = '';
  try {
    src = fn.toString();
  } catch {
    return fallback;
  }

  if (src.includes('[native code]') || src.includes('[bytecode]')) return fallback;

  src = src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '')
    .trim();

  const fnMatch = src.match(/^(?:async\s+)?function\s*\*?\s*[A-Za-z0-9_$]*\s*\(([^)]*)\)/);
  const arrowMatch = src.match(/^(?:async\s+)?\(([^)]*)\)\s*=>/);
  const singleMatch = src.match(/^(?:async\s+)?([A-Za-z_$][\w$]*)\s*=>/);
  const methodMatch = src.match(/^(?:async\s+)?\*?\s*[A-Za-z_$][\w$]*\s*\(([^)]*)\)\s*\{/);
  const inside = fnMatch?.[1] ?? arrowMatch?.[1] ?? singleMatch?.[1] ?? methodMatch?.[1] ?? '';

  if (!inside.trim()) return fallback;

  const names = inside
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part, index) => {
      const cleaned = part
        .replace(/^\.\.\./, '')
        .split(/[=:]/)[0]
        .trim();
      return /^[A-Za-z_$][\w$]*$/.test(cleaned) ? cleaned : fallback[index];
    });
  while (names.length < arity) names.push(fallback[names.length]);
  return names.slice(0, arity);
}

export function getActionDescriptors(state: Record<string, unknown>): ActionDescriptor[] {
  return Object.entries(state)
    .filter(([, value]) => typeof value === 'function')
    .map(([name, value]) => {
      const fn = value as (...args: unknown[]) => unknown;
      const arity = typeof fn.length === 'number' ? fn.length : 0;
      return { name, arity, params: parseFunctionParams(fn) };
    });
}

type WrappableStore = {
  getState: () => Record<string, unknown>;
  setState: (partial: Record<string, unknown>, replace?: boolean) => void;
};

function copyDescriptor(target: object, property: string, value: unknown) {
  try {
    Object.defineProperty(target, property, { value, configurable: true });
  } catch {
    // Some runtimes reject redefining `length` / `name` on functions — ignore.
  }
}

function createActionWrapper(name: string, original: (...args: unknown[]) => unknown, onInvoke: (name: string) => void, onComplete: (name: string) => void) {
  function wrapper(this: unknown, ...args: unknown[]) {
    onInvoke(name);
    try {
      return original.apply(this, args);
    } finally {
      onComplete(name);
    }
  }
  copyDescriptor(wrapper, 'length', original.length);
  copyDescriptor(wrapper, 'name', original.name || name);
  copyDescriptor(wrapper, 'toString', () => original.toString());
  return wrapper;
}

/**
 * Replaces every top-level function property of `store.getState()` with a wrapper that
 * fires `onInvoke(name)` before running the original and `onComplete(name)` after it returns
 * or throws. Callers track the currently-executing action via the invoke/complete pair
 * (push/pop stack) so the subscribe handler can attribute the next `setState` to the right action.
 * Returns the list of wrapped property names.
 */
export function wrapStoreActions(store: WrappableStore, onInvoke: (name: string) => void, onComplete: (name: string) => void): string[] {
  const state = store.getState();
  const wrappers: Record<string, unknown> = {};
  const names: string[] = [];

  for (const [key, value] of Object.entries(state)) {
    if (typeof value !== 'function') continue;
    const original = value as (...args: unknown[]) => unknown;
    wrappers[key] = createActionWrapper(key, original, onInvoke, onComplete);
    names.push(key);
  }

  if (names.length > 0) store.setState(wrappers, false);
  return names;
}

export function createStoreDescriptor(entry: StoreDescriptorEntry, previousUpdates = 0): StoreDescriptor {
  const state = entry.store.getState();
  const snapshot = createSanitizedSnapshot(state, entry) as Record<string, unknown>;
  const allActions = getActionDescriptors(state);
  const allowedActions = entry.actions;
  const actions = allowedActions ? allActions.filter((entryItem) => allowedActions.includes(entryItem.name)) : allActions;

  return {
    id: computeStoreId(entry),
    name: entry.name,
    file: entry.file ?? 'registered in app runtime',
    keys: Object.keys(snapshot ?? {}).length,
    updates: previousUpdates,
    hot: previousUpdates > 100,
    actions,
    hasInitial: typeof entry.store.getInitialState === 'function',
    editable: entry.editable !== false,
    state: snapshot ?? {},
  };
}

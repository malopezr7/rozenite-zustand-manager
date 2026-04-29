import { describe, expect, it } from 'vitest';
import {
  applyPathPatch,
  computeStoreId,
  createSanitizedSnapshot,
  createStoreDescriptor,
  deleteAtPathRuntime,
  FUNCTION_PLACEHOLDER,
  getActionDescriptors,
  mergeFunctionsFromCurrent,
  parseFunctionParams,
  parsePath,
  REDACTED_VALUE,
  stripSanitizationMarkers,
} from '../lib/zustandManagerCore.ts';

describe('parsePath', () => {
  it('parses nested object and array paths', () => {
    expect(parsePath('items[1].price')).toEqual(['items', 1, 'price']);
    expect(parsePath('user.profile.name')).toEqual(['user', 'profile', 'name']);
  });
});

describe('applyPathPatch', () => {
  it('immutably patches nested state and returns top-level partial for Zustand', () => {
    const state = { user: { name: 'Marta', roles: ['admin'] }, attempts: 0 };

    const result = applyPathPatch(state, 'user.name', 'Marta R.');

    expect(result.partial).toEqual({ user: { name: 'Marta R.', roles: ['admin'] } });
    expect(result.nextState).toEqual({ user: { name: 'Marta R.', roles: ['admin'] }, attempts: 0 });
    expect(result.nextState.user).not.toBe(state.user);
    expect(state.user.name).toBe('Marta');
  });

  it('patches array indexes without replacing unrelated entries', () => {
    const state = { items: [{ qty: 1 }, { qty: 2 }] };

    const result = applyPathPatch(state, 'items[1].qty', 3);

    expect(result.partial).toEqual({ items: [{ qty: 1 }, { qty: 3 }] });
    const nextItems = result.nextState.items as { qty: number }[];
    expect(nextItems[0]).toBe(state.items[0]);
    expect(nextItems[1]).not.toBe(state.items[1]);
  });

  it('throws on empty path so callers cannot accidentally replace the whole store', () => {
    expect(() => applyPathPatch({ a: 1 }, '', 'whatever')).toThrow(/empty/i);
  });
});

describe('parseFunctionParams', () => {
  it('extracts param names from arrow functions', () => {
    expect(parseFunctionParams((id: string, qty: number) => `${id}-${qty}`)).toEqual(['id', 'qty']);
  });

  it('falls back to argN names when params are destructured (cannot be cleanly extracted)', () => {
    const fn = ({ a, b }: { a: number; b: number }) => a + b;
    expect(parseFunctionParams(fn)).toEqual(['arg0']);
  });

  it('returns empty array for zero-arity functions', () => {
    expect(parseFunctionParams(() => 1)).toEqual([]);
  });

  it('falls back to argN when fn.toString reports native or bytecode source', () => {
    const fakeNative = { length: 2, toString: () => 'function () { [native code] }' };
    expect(parseFunctionParams(fakeNative)).toEqual(['arg0', 'arg1']);

    const fakeBytecode = { length: 1, toString: () => 'function () { [bytecode] }' };
    expect(parseFunctionParams(fakeBytecode)).toEqual(['arg0']);
  });
});

describe('getActionDescriptors', () => {
  it('extracts callable functions with arity and param names', () => {
    const state = {
      count: 0,
      increment: () => undefined,
      addItems: (id: string, qty: number) => `${id}-${qty}`,
    };

    const descriptors = getActionDescriptors(state);

    expect(descriptors).toEqual([
      { name: 'increment', arity: 0, params: [] },
      { name: 'addItems', arity: 2, params: ['id', 'qty'] },
    ]);
  });
});

describe('createSanitizedSnapshot', () => {
  it('drops function-valued object properties so Zustand actions do not pollute the state tree', () => {
    const state = {
      user: { email: 'marta@acme.dev', name: 'Marta' },
      session: { accessToken: 'secret-token' },
      signOut: () => undefined,
      addItem: (id: string) => id,
    };

    const snapshot = createSanitizedSnapshot(state) as Record<string, unknown>;

    expect(snapshot).toEqual({
      user: { email: REDACTED_VALUE, name: 'Marta' },
      session: { accessToken: REDACTED_VALUE },
    });
    expect(Object.hasOwn(snapshot, 'signOut')).toBe(false);
    expect(Object.hasOwn(snapshot, 'addItem')).toBe(false);
  });

  it('preserves array indices when entries contain functions or undefined', () => {
    const state = { items: [1, () => undefined, 3, undefined, 5] };

    const snapshot = createSanitizedSnapshot(state) as { items: unknown[] };

    expect(snapshot.items).toHaveLength(5);
    expect(snapshot.items[0]).toBe(1);
    expect(snapshot.items[1]).toBeNull();
    expect(snapshot.items[2]).toBe(3);
    expect(snapshot.items[3]).toBeNull();
    expect(snapshot.items[4]).toBe(5);
  });

  it('redacts entries inside Map and Set recursively', () => {
    const sensitiveMap = new Map<string, unknown>([
      ['token', 'leak-me'],
      ['name', 'Marta'],
    ]);
    const sensitiveSet = new Set([{ password: 'leak' }, { name: 'safe' }]);

    expect(createSanitizedSnapshot({ map: sensitiveMap, set: sensitiveSet })).toEqual({
      map: { token: REDACTED_VALUE, name: 'Marta' },
      set: [{ password: REDACTED_VALUE }, { name: 'safe' }],
    });
  });

  it('survives circular references without throwing', () => {
    const cycle: Record<string, unknown> = { name: 'root' };
    cycle.self = cycle;

    expect(() => createSanitizedSnapshot(cycle)).not.toThrow();
    expect(createSanitizedSnapshot(cycle)).toEqual({ name: 'root', self: '[Circular]' });
  });
});

describe('deleteAtPathRuntime', () => {
  it('removes object keys via the delete operator (not undefined assignment)', () => {
    const state = { user: { name: 'Marta', email: 'marta@example.com' } };

    const { partial, nextState } = deleteAtPathRuntime(state, 'user.email');

    expect(Object.hasOwn(nextState.user as object, 'email')).toBe(false);
    expect(Object.hasOwn(partial.user as object, 'email')).toBe(false);
    expect((nextState.user as { name: string }).name).toBe('Marta');
  });

  it('splices array indexes instead of leaving undefined slots', () => {
    const state = { items: ['a', 'b', 'c'] };

    const { partial, nextState } = deleteAtPathRuntime(state, 'items[1]');

    expect(nextState.items).toEqual(['a', 'c']);
    expect(partial.items).toEqual(['a', 'c']);
  });

  it('removes the top-level key entirely when given a single segment', () => {
    const state = { keep: 1, drop: 2 };

    const { partial, nextState } = deleteAtPathRuntime(state, 'drop');

    expect(Object.hasOwn(nextState, 'drop')).toBe(false);
    expect(partial).toEqual({ drop: undefined });
  });
});

describe('stripSanitizationMarkers', () => {
  it('drops REDACTED_VALUE and FUNCTION_PLACEHOLDER markers from incoming payloads', () => {
    const payload = {
      keep: 'ok',
      token: REDACTED_VALUE,
      reset: FUNCTION_PLACEHOLDER,
      nested: { circular: '[Circular]', name: 'still-here' },
      list: [1, REDACTED_VALUE, FUNCTION_PLACEHOLDER, 4],
    };

    expect(stripSanitizationMarkers(payload)).toEqual({
      keep: 'ok',
      nested: { name: 'still-here' },
      list: [1, undefined, undefined, 4],
    });
  });
});

describe('mergeFunctionsFromCurrent', () => {
  it('preserves Zustand actions when restoring sanitized state', () => {
    const signIn = () => undefined;
    const signOut = () => undefined;
    const current = { user: null, signIn, signOut };
    const incoming = { user: { name: 'Marta' } };

    const merged = mergeFunctionsFromCurrent(incoming, current);

    expect(merged.user).toEqual({ name: 'Marta' });
    expect(merged.signIn).toBe(signIn);
    expect(merged.signOut).toBe(signOut);
  });

  it('does not overwrite incoming functions when both sides provide one', () => {
    const oldFn = () => 1;
    const newFn = () => 2;

    expect(mergeFunctionsFromCurrent({ run: newFn }, { run: oldFn }).run).toBe(newFn);
  });
});

describe('computeStoreId', () => {
  it('combines file and name to keep ids unique across files', () => {
    expect(computeStoreId({ name: 'useStore', file: 'src/auth.ts' })).toBe('src/auth.ts:useStore');
    expect(computeStoreId({ name: 'useStore', file: 'src/cart.ts' })).toBe('src/cart.ts:useStore');
  });

  it('falls back to the bare name when no file is provided', () => {
    expect(computeStoreId({ name: 'useStore' })).toBe('useStore');
  });

  it('preserves an explicit id when given', () => {
    expect(computeStoreId({ id: 'explicit', name: 'useStore', file: 'src/auth.ts' })).toBe('explicit');
  });
});

describe('createStoreDescriptor id stability', () => {
  function makeStore(state: Record<string, unknown>) {
    return {
      getState: () => state,
      setState: () => undefined,
      subscribe: () => () => undefined,
    };
  }

  it('produces unique ids for two stores that share a name in different files', () => {
    const left = createStoreDescriptor({ name: 'useStore', file: 'src/a.ts', store: makeStore({ value: 1 }) });
    const right = createStoreDescriptor({ name: 'useStore', file: 'src/b.ts', store: makeStore({ value: 2 }) });

    expect(left.id).not.toBe(right.id);
    expect(left.id).toBe('src/a.ts:useStore');
    expect(right.id).toBe('src/b.ts:useStore');
  });
});

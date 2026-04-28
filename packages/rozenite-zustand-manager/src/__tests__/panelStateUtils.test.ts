import { describe, expect, it } from 'vitest';

import { filterTreeEntries, formatJson, parseEditableValue, stringifyEditableValue } from '../common/utils/stateUtils';

describe('parseEditableValue / stringifyEditableValue', () => {
  it('round-trips object edits as JSON instead of [object Object]', () => {
    const value = { name: 'Marta', flags: ['admin'] };

    expect(stringifyEditableValue(value)).toBe(JSON.stringify(value, null, 2));
    expect(parseEditableValue(stringifyEditableValue(value), 'object')).toEqual(value);
  });

  it('parses each primitive kind strictly', () => {
    expect(parseEditableValue('42', 'number')).toBe(42);
    expect(parseEditableValue('  -3.14 ', 'number')).toBe(-3.14);
    expect(parseEditableValue('true', 'boolean')).toBe(true);
    expect(parseEditableValue('false', 'boolean')).toBe(false);
    expect(parseEditableValue('hello', 'string')).toBe('hello');
  });

  it('rejects malformed primitive input', () => {
    expect(() => parseEditableValue('not-a-number', 'number')).toThrow();
    expect(() => parseEditableValue('yes', 'boolean')).toThrow();
  });

  it('promotes null/undefined edits to JSON when the user pastes a structured value', () => {
    expect(parseEditableValue('null', 'null')).toBeNull();
    expect(parseEditableValue('undefined', 'undefined')).toBeUndefined();
    expect(parseEditableValue('{ "type": "LOADING" }', 'null')).toEqual({ type: 'LOADING' });
    expect(parseEditableValue('[1, 2, 3]', 'undefined')).toEqual([1, 2, 3]);
    expect(() => parseEditableValue('not json', 'null')).toThrow(/Expected null or valid JSON/);
  });
});

describe('filterTreeEntries', () => {
  it('matches by key path and primitive value at any depth', () => {
    const state = { user: { name: 'Marta' }, cart: { total: 42 } };
    const entries = Object.entries(state);

    expect(filterTreeEntries(entries, 'marta')).toEqual([['user', state.user]]);
    expect(filterTreeEntries(entries, 'cart.total')).toEqual([['cart', state.cart]]);
    expect(filterTreeEntries(entries, '42')).toEqual([['cart', state.cart]]);
  });

  it('returns the original list for empty queries', () => {
    const entries = Object.entries({ a: 1, b: 2 });

    expect(filterTreeEntries(entries, '')).toBe(entries);
    expect(filterTreeEntries(entries, '   ')).toBe(entries);
  });
});

describe('formatJson', () => {
  it('serialises plain values with 2-space indent', () => {
    expect(formatJson({ a: 1 })).toBe('{\n  "a": 1\n}');
  });

  it('serialises BigInt with the literal-style suffix instead of throwing', () => {
    expect(formatJson({ count: 9007199254740993n })).toBe('{\n  "count": "9007199254740993n"\n}');
  });

  it('renders functions as a labelled placeholder', () => {
    function namedFn() {}
    expect(formatJson({ run: namedFn })).toBe('{\n  "run": "ƒ namedFn()"\n}');
  });

  it('breaks circular references instead of throwing', () => {
    const cycle: Record<string, unknown> = { name: 'root' };
    cycle.self = cycle;

    const output = formatJson(cycle);

    expect(output).toContain('"name": "root"');
    expect(output).toContain('"[Circular]"');
  });

  it('falls back to a placeholder string when the value is fundamentally unserialisable', () => {
    const trap = {
      get value() {
        throw new Error('no');
      },
    };

    expect(formatJson(trap)).toMatch(/^\[Unserializable: /);
  });
});

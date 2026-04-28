export type JsonKind = 'string' | 'number' | 'boolean' | 'null' | 'undefined' | 'array' | 'object' | 'function' | 'symbol' | 'bigint';
export type PathSegment = string | number;

export function typeOf(value: unknown): JsonKind {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  return typeof value as JsonKind;
}

export function parsePath(path: string): PathSegment[] {
  if (!path) return [];
  return Array.from(path.matchAll(/([^.[\]]+)|\[(\d+)\]/g)).map((match) => match[1] ?? Number(match[2]));
}

export function getPathValue(root: unknown, path: string): unknown {
  return parsePath(path).reduce<unknown>((value, segment) => {
    if (value == null) return undefined;
    return (value as Record<string | number, unknown>)[segment];
  }, root);
}

export function stringifyEditableValue(value: unknown): string {
  const kind = typeOf(value);
  if (kind === 'object' || kind === 'array') return JSON.stringify(value, null, 2);
  if (kind === 'string') return value as string;
  if (kind === 'undefined') return 'undefined';
  return JSON.stringify(value) ?? String(value);
}

export function parseEditableValue(raw: string, kind: JsonKind): unknown {
  const trimmed = raw.trim();
  if (kind === 'string') return raw;
  if (kind === 'number') {
    if (trimmed === '' || Number.isNaN(Number(trimmed))) throw new Error('Expected a number.');
    return Number(trimmed);
  }
  if (kind === 'boolean') {
    if (trimmed !== 'true' && trimmed !== 'false') throw new Error('Expected true or false.');
    return trimmed === 'true';
  }
  if (kind === 'null') {
    if (trimmed === 'null') return null;
    try {
      return JSON.parse(trimmed);
    } catch {
      throw new Error('Expected null or valid JSON.');
    }
  }
  if (kind === 'undefined') {
    if (trimmed === 'undefined') return undefined;
    try {
      return JSON.parse(trimmed);
    } catch {
      throw new Error('Expected undefined or valid JSON.');
    }
  }
  if (kind === 'object' || kind === 'array') return JSON.parse(trimmed);
  return JSON.parse(trimmed);
}

export function previewValue(value: unknown): { kind: JsonKind; text: string; meta?: string } {
  const kind = typeOf(value);
  if (kind === 'string') return { kind, text: JSON.stringify(value) };
  if (kind === 'number' || kind === 'boolean' || kind === 'bigint') return { kind, text: String(value) };
  if (kind === 'null' || kind === 'undefined') return { kind, text: String(value) };
  if (kind === 'function') return { kind, text: 'ƒ ()' };
  if (kind === 'array') return { kind, text: 'Array', meta: `(${(value as unknown[]).length})` };
  if (kind === 'object') return { kind, text: 'Object', meta: `{${Object.keys(value as object).length}}` };
  return { kind, text: String(value) };
}

function valueMatches(value: unknown, query: string, currentPath: string): boolean {
  const normalized = query.toLowerCase();
  if (currentPath.toLowerCase().includes(normalized)) return true;
  if (value == null || typeof value !== 'object') return String(value).toLowerCase().includes(normalized);
  return Object.entries(value as Record<string, unknown>).some(([key, entry]) => {
    const nextPath = currentPath ? `${currentPath}.${key}` : key;
    return valueMatches(entry, query, nextPath);
  });
}

export function filterTreeEntries(entries: [string, unknown][], query: string): [string, unknown][] {
  const normalized = query.trim();
  if (!normalized) return entries;
  return entries.filter(([key, value]) => valueMatches(value, normalized, key));
}

export function formatJson(value: unknown): string {
  try {
    const seen = new WeakSet<object>();
    const serialized = JSON.stringify(
      value,
      (_key, val) => {
        if (typeof val === 'bigint') return `${val.toString()}n`;
        if (typeof val === 'function') return `ƒ ${val.name || 'anonymous'}()`;
        if (typeof val === 'symbol') return val.toString();
        if (typeof val === 'object' && val !== null) {
          if (seen.has(val)) return '[Circular]';
          seen.add(val);
        }
        return val;
      },
      2,
    );
    return serialized ?? 'undefined';
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'unknown';
    return `[Unserializable: ${reason}]`;
  }
}

export function downloadJson(filename: string, value: unknown): void {
  const blob = new Blob([formatJson(value)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  try {
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
  } finally {
    URL.revokeObjectURL(url);
  }
}

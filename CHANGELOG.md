# Changelog

All notable changes to `@rozenite/zustand-manager` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed

- **Time-travel and snapshot restore no longer corrupt Zustand stores.** Bridge payloads carry sanitized state (functions stripped, sensitive keys redacted). When a `replaceState` / patch / call-action message arrives, the runtime now strips `REDACTED_VALUE`, `FUNCTION_PLACEHOLDER`, and `[Circular]` markers from the incoming value, and merges any function members back from the current state, so actions are never wiped and redacted placeholders never reach real state.
- **`deleteStoreValue` now actually removes the key.** Previously it set the value to `undefined`, leaving the key in place (and skipping `splice` for arrays). Switched to a runtime-side helper that uses the `delete` operator for object keys and `splice` for array indexes, then sends a top-level partial.
- **Stable, unique store IDs across files.** The descriptor `id` is now `${file}:${name}` (or just `name` when no file is known) so two stores that share a name in different files no longer collide on React keys, panel selection, or runtime command lookup. The bridge now uses `storeId` instead of `storeName` for command messages.

### Changed

- **Sanitizer preserves array length and recurses into Map / Set.** Functions become a `__zm_function__` placeholder instead of disappearing, so paths like `items[2]` remain stable. `Map` / `Set` entries now go back through the sanitizer recursively. Cycles are detected with a `WeakSet` and rendered as `[Circular]` instead of throwing.
- **`formatJson` is crash-safe.** Wrapped `JSON.stringify` with a replacer that handles `BigInt` (`123n` literal form), function previews, symbols, and circular references. Failures fall back to a `[Unserializable: …]` string so the panel never crashes on a weird state shape.

### Internal

- **`ResizablePanels` cleans up active drag listeners on unmount.** Dragging during a layout change or unmount no longer leaks `pointermove` / `pointerup` listeners on `window`.
- New helpers in `src/lib/zustandManagerCore.ts`: `computeStoreId`, `deleteAtPathRuntime`, `stripSanitizationMarkers`, `mergeFunctionsFromCurrent`. All covered by tests in `src/__tests__/zustandManagerCore.test.ts` (30 tests total).

## [0.0.1] - 2026-04-28

### Added

Initial alpha release. Core feature set:

- **Metro autodiscovery** — Babel transformer wraps the Metro config and registers every module-level `create<T>()(...)` Zustand store at dev time. Factory functions and indented declarations are deliberately skipped to avoid `ReferenceError` on closure-scoped variables.
- **DevTools panel** with three tabs: Inspector, Timeline, Snapshots.
- **Inspector**: tree / JSON / table views, type-aware inline editing, path/value copy, search, sensitive-key redaction.
- **Timeline**: every mutation captured as a diff event with real `+/−` line counts (recursive leaf walk), kind filters (`edit` / `action` / `replace` / `reset`), restore-before, side-by-side compare modal.
- **Snapshots**: capture, import/export JSON, restore-all or per-store, compare current state vs any snapshot in a side-by-side diff.
- **Type-aware action runner** — arity-0 actions fire on click; parameterized actions open a form modal with per-arg type pills (`string` / `number` / `boolean` / `object` / `array` / `null` / `undefined`). Param names extracted via `fn.length` + best-effort `fn.toString()` parse.
- **Manual registration** via `registerZustandStore({ name, store, file?, redactPattern?, editable?, actions? })` and the `useZustandManager` hook.
- **Safe mutation path**: every patch sent as a top-level partial via `setState(partial, false)` so action functions are never wiped. Replace-state uses the explicit `setState(value, true)` form.
- **Sanitization**: function values stripped, `Map`/`Set`/`Date`/`bigint` coerced to JSON-friendly values, regex-based key redaction (default: `password|token|secret|email|apiKey|authorization`).
- **Responsive layout** — `fr`-based grid with drag-to-resize and a VSCode-style menu in the top toolbar to show / hide each panel.
- **Bridge contract** event map: `zustand:snapshot`, `zustand:store-update`, `zustand:store-reset`, `zustand:request-snapshot`, `zustand:patch-value`, `zustand:delete-value`, `zustand:replace-state`, `zustand:call-action` (with optional `args`), `zustand:reset-store`.

[Unreleased]: https://github.com/erpipi/rozenite-zustand-manager/compare/v0.0.1...HEAD
[0.0.1]: https://github.com/erpipi/rozenite-zustand-manager/releases/tag/v0.0.1

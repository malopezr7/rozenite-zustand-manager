# Changelog

All notable changes to `rozenite-zustand-manager` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.0.3] - 2026-04-29

### Changed

- **Node.js 22 is now the minimum supported version.** `engines.node` bumped from `>=20` to `>=22` at both the workspace root and the published package. Drops Node 20 from the CI matrix (`pnpm/action-setup@v6` ships a pnpm version that imports `node:sqlite`, which doesn't exist until Node 22). Consumers on Node 20 should stay on 0.0.2 or bump their runtime.
- **Workspace tooling on the latest majors** (came in via the 0.0.2 → 0.0.3 dependabot wave on `main`):
  - `vite` 7 → 8
  - `@vitejs/plugin-react` 4 → 6 (Babel-free, uses Vite 8's Oxc transform for React Refresh)
  - `typescript` 6.0.2 → 6.0.3
  - `@react-native-community/cli-platform-ios` 20.1.0 → 20.1.3
  - GitHub Actions: `actions/checkout` v4 → v6, `actions/setup-node` v4 → v6, `pnpm/action-setup` v4 → v6, `softprops/action-gh-release` v2 → v3.

### Removed

- **ESLint, Prettier, and Jest dropped from the example app.** Biome at the workspace root already covers linting and formatting, and the published plugin's tests live under `packages/rozenite-zustand-manager/src/__tests__/` (vitest, 39 tests). The React Native CLI scaffold pulled in tooling that nobody ran in CI — pure noise. Net `-2,619` lines from the lockfile alone.

## [0.0.2] - 2026-04-29

### Fixed

- **Zustand actions no longer pollute the state tree.** The 0.0.1 sanitizer replaced function values with the literal string `"__zm_function__"` so the panel could keep array indices stable when functions sat inside arrays. The unintended consequence: every action defined inside a Zustand store (`addItem`, `signOut`, `reset`, …) showed up in the Inspector tree as `"__zm_function__"`, duplicating what the dedicated Actions panel already lists. Functions are now dropped from object snapshots entirely (the Actions panel still surfaces them) and replaced with `null` only inside arrays where slot order is load-bearing. `stripSanitizationMarkers` keeps recognising the legacy placeholder so a 0.0.1 runtime + 0.0.2 panel still work together. Reported when installing 0.0.1 from npm.

## [0.0.1] - 2026-04-28

Initial alpha release.

### Added

- **Metro autodiscovery** — Babel transformer wraps the Metro config and registers every module-level `create<T>()(...)` Zustand store at dev time. Factory functions and indented declarations are deliberately skipped to avoid `ReferenceError` on closure-scoped variables.
- **DevTools panel** with three tabs: Inspector, Timeline, Snapshots.
- **Inspector**: tree / JSON / table views, type-aware inline editing, path/value copy, search, sensitive-key redaction.
- **Timeline**: every mutation captured as a diff event with real `+/−` line counts (recursive leaf walk), kind filters (`edit` / `action` / `replace` / `reset`), restore-before, side-by-side compare modal.
- **Snapshots**: capture, import/export JSON, restore-all or per-store, compare current state vs any snapshot in a side-by-side diff.
- **Type-aware action runner** — arity-0 actions fire on click; parameterized actions open a form modal with per-arg type pills (`string` / `number` / `boolean` / `object` / `array` / `null` / `undefined`). Param names extracted via `fn.length` + best-effort `fn.toString()` parse.
- **Manual registration** via `registerZustandStore({ name, store, file?, redactPattern?, editable?, actions? })` and the `useZustandManager` hook.
- **Safe mutation path**: every patch sent as a top-level partial via `setState(partial, false)` so action functions are never wiped. Replace-state uses the explicit `setState(value, true)` form. Incoming payloads have `REDACTED_VALUE` / `FUNCTION_PLACEHOLDER` / `[Circular]` markers stripped and missing functions merged back from current state, so time-travel and snapshot restore can never corrupt a store.
- **Sanitization**: regex-based key redaction (default: `password|token|secret|email|apiKey|authorization`), recursive `Map` / `Set` handling, cycle detection via `WeakSet`, `Date` / `BigInt` coerced to JSON-friendly values.
- **Stable, unique store IDs** — descriptor `id` is `${file}:${name}` (or just `name` when no file is known) so two stores sharing a name across files do not collide on React keys, panel selection, or runtime command lookup. The bridge uses `storeId` for command messages.
- **`deleteAtPathRuntime`** — proper `delete` operator for object keys, `splice` for array indexes (the original implementation just set the value to `undefined`).
- **`formatJson`** — crash-safe `JSON.stringify` wrapper with `BigInt`, function preview, symbol, and cycle handling. Failures fall back to a `[Unserializable: …]` string so the panel never blows up on a weird state shape.
- **Responsive layout** — `fr`-based grid with drag-to-resize and a VSCode-style menu in the top toolbar to show / hide each panel.
- **Bridge contract** event map: `zustand:snapshot`, `zustand:store-update`, `zustand:store-reset`, `zustand:request-snapshot`, `zustand:patch-value`, `zustand:delete-value`, `zustand:replace-state`, `zustand:call-action` (with optional `args`), `zustand:reset-store`.

[Unreleased]: https://github.com/malopezr7/rozenite-zustand-manager/compare/v0.0.3...HEAD
[0.0.3]: https://github.com/malopezr7/rozenite-zustand-manager/compare/v0.0.2...v0.0.3
[0.0.2]: https://github.com/malopezr7/rozenite-zustand-manager/compare/v0.0.1...v0.0.2
[0.0.1]: https://github.com/malopezr7/rozenite-zustand-manager/releases/tag/v0.0.1

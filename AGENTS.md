# AGENTS.md

This file provides guidance to coding agents (Codex, Aider, Cursor, etc.) working in this repository. It mirrors CLAUDE.md.

## Commands (run from the repo root)

```bash
pnpm install                    # install workspace deps
pnpm dev                        # rozenite dev (panel hot reload)
pnpm dev:web                    # vite-only dev (no Rozenite shell)
pnpm build                      # filters → typecheck + test + vite build + rozenite build
pnpm build:web                  # vite build only (devtools bundle)
pnpm build:plugin               # rozenite build only
pnpm test                       # vitest run
pnpm typecheck                  # tsc --noEmit (inside the plugin package)
pnpm lint                       # biome check . (workspace-wide)
pnpm example:start              # WITH_ROZENITE=true RN sample app
```

Run a single test file: `pnpm test packages/rozenite-zustand-manager/src/__tests__/zustandManagerCore.test.ts`.
Run a single test by name: `pnpm test -- -t "patches array indexes"`.

## Workspace layout

The repo is a `pnpm` workspace with two members:

- `packages/rozenite-zustand-manager/` — the published plugin. Owns its own `package.json`, `tsconfig.json`, `vite.config.js`, `rozenite.config.ts`, `index.html`, `public/`, and the `src/` tree.
- `example/` — bare React Native app that consumes the plugin via `workspace:*`.

Workspace tooling lives at the root: `biome.json`, `.husky/`, `.github/`, `.editorconfig`, `.nvmrc`, plus the orchestrator `package.json` whose scripts forward to the plugin via `pnpm --filter rozenite-zustand-manager`.

## Architecture

The plugin ships **three independently shipped artifacts** declared in `packages/rozenite-zustand-manager/package.json`:

1. **DevTools panel** — Vite-built React app at `dist/devtools/App.html`. Source entry: `src/main.tsx` → `src/App.tsx`. Configured in `rozenite.config.ts`.
2. **React Native runtime** — `react-native.ts`, exported as `main`/`module`/`react-native` in the package's `package.json`. Compiles to `dist/react-native/`.
3. **Metro Babel transformer** — `metro.ts`, exported under the `./metro` subpath. Compiles to `dist/metro/`.

All three communicate through the **Rozenite bridge** (`@rozenite/plugin-bridge`) using a typed event contract. Both sides share the same plugin id (`rozenite-zustand-manager`); a mismatch silently breaks the bridge.

All paths in the rest of this document are relative to `packages/rozenite-zustand-manager/` unless stated otherwise.

### Bridge contract

The event map (`zustand:snapshot`, `zustand:store-update`, `zustand:store-reset`, `zustand:request-snapshot`, `zustand:patch-value`, `zustand:delete-value`, `zustand:replace-state`, `zustand:call-action`, `zustand:reset-store`) is duplicated in:

- `react-native.ts` (`ZustandManagerEvents`) — runtime side
- `src/features/zustand-panel/useZustandManagerPanel.ts` (`BridgeEvents`) — panel side

Both must stay in sync. Adding a new bridge message requires updating both shapes plus the relevant `StoreDescriptor` in `src/features/zustand-panel/types.ts` (panel) and `src/lib/zustandManagerCore.ts` (runtime).

### React Native runtime (`react-native.ts`)

A **singleton runtime** lives on `globalThis.__ROZENITE_ZUSTAND_MANAGER_RUNTIME__`. The Metro transformer injects `registerZustandStore(...)` calls at module scope; the runtime is created lazily on first registration, subscribes to each store, and lazily acquires a Rozenite client. This decoupling is intentional — store registration must work before any React component mounts and without depending on `useZustandManager`.

A debug surface (`globalThis.__ZUSTAND_MANAGER__`) mirrors the runtime API so the bridge can be exercised from the RN debugger / MCP without going through DevTools.

Mutation path is **always top-level partial**: `applyPathPatch` returns `{ partial }` rooted at the top key so `setState(partial, false)` merges instead of wiping store actions. Replacing the entire state uses the explicit `setState(value, true)` form. Sanitization (`createSanitizedSnapshot`) replaces functions with `FUNCTION_PLACEHOLDER`, redacts keys matching `DEFAULT_REDACT_PATTERN`, and breaks cycles with a `WeakSet` before any data crosses the bridge. The runtime applies `stripSanitizationMarkers` + `mergeFunctionsFromCurrent` on every incoming patch / replace / call so redacted placeholders never reach real state and Zustand actions are never wiped.

### Metro transformer (`metro.ts`)

A Babel transformer wrapper that delegates to the upstream `@react-native/metro-babel-transformer`. `withZustandManager(config)` swaps `transformer.babelTransformerPath` to point at this module; the upstream path is preserved via the `ROZENITE_ZUSTAND_MANAGER_UPSTREAM_TRANSFORMER` env var so the chain isn't broken. `ROZENITE_ZUSTAND_MANAGER_PROJECT_ROOT` is used to relativize file paths and to resolve the upstream transformer from the consumer's `node_modules`.

`__unstableTransformZustandSource` parses imports from `zustand` / `zustand/vanilla`, finds module-level `const X = create<...>(...)` declarations, and appends `__rozeniteZustandRegisterStore({ name, file, store })` after the original source. It deliberately uses regex (no AST) and only fires when both `zustand` and `create` strings are present in the source. Indented declarations inside function bodies are deliberately skipped — those are factory functions and instrumenting them would emit references to closure-scoped variables and crash the module on load. Edge cases like namespace imports and `createWithEqualityFn` are not yet handled — see test coverage in `src/__tests__/metroAutodiscovery.test.ts`.

### Panel UI (`src/`)

Structure is **feature-based**, not type-based:

- `src/features/zustand-panel/` — `useZustandManagerPanel` is the only place that holds bridge subscriptions; views never talk to the bridge directly. `types.ts` defines the panel-side `StoreDescriptor` / `TimelineEvent` / `Snapshot` shapes.
- `src/features/inspector/` — `InspectorView`, `StateTree`, `ActionParamsModal`. Three-pane layout (stores list / state tree / detail) backed by `ResizablePanels`.
- `src/features/timeline/` — recent bridge updates with restore-before action and side-by-side compare modal.
- `src/features/snapshots/` — manual + auto-captured snapshots, restore, compare current.
- `src/common/components/` — shared Atoms, Modal, ResizablePanels, PanelToggleMenu, CompareModal.
- `src/common/utils/stateUtils.ts` — pure helpers (`getPathValue`, `parseEditableValue`, `filterTreeEntries`, `formatJson` (safe-stringify), `downloadJson`).
- `src/lib/zustandManagerCore.ts` — runtime-shared core (path patching, sanitization, descriptor creation, runtime safeguards). Imported by `react-native.ts`. Keep this file framework-free (no React, no DOM).

`src/App.tsx` is the panel shell: tabs, active store / selected path / active event state, footer status bar, and the `PanelToggleMenu` in the top toolbar that drives panel visibility for every view.

Styling: Tailwind v4 (via `@tailwindcss/vite`) plus three CSS modules — `tokens.css` (design tokens), `app.css` (layout primitives `zm-*`), `timeline.css` (timeline-specific). Class names use the `zm-` prefix as a convention.

## Conventions

- Package manager: **pnpm only**. Do not use `npm` / `npx`.
- Source uses **TypeScript with `verbatimModuleSyntax` + `erasableSyntaxOnly`**: type-only imports must use `import type`, no `enum` / `namespace` / parameter properties. Treat `noUnusedLocals` / `noUnusedParameters` as build errors.
- React **must be a single copy** in any consumer bundle. The plugin package has React as `devDependency` only; `peerDependencies` declares React / React Native / Zustand. Duplicate React in the example bundle has caused "Invalid hook call" crashes before — verify Hermes bundle, not just Metro success.
- Do not modify `example/` for plugin-side changes unless the example actually exercises a new code path.
- The Rozenite plugin id is `rozenite-zustand-manager` and is hardcoded in four places (all inside `packages/rozenite-zustand-manager/`): `package.json#name`, `react-native.ts` (`PLUGIN_ID`), `src/features/zustand-panel/useZustandManagerPanel.ts` (`PLUGIN_ID`), and the import string in `metro.ts` (`__unstableTransformZustandSource`). All four must match.
- Tests live in `src/__tests__/` and run with **vitest**. Core, panel state utils, package config, and Metro autodiscovery each have their own spec — extend the matching one rather than creating a new file.

## Verification

For UI / runtime changes, the build pipeline alone is not enough. Reload the example app in the RN debugger and confirm `globalThis.__ZUSTAND_MANAGER__.stores` reports the expected stores; the panel should hydrate without falling back to "No stores connected". `pnpm build` from the repo root runs `typecheck → test → build:web → build:plugin` against the plugin package and is the canonical pre-publish gate.

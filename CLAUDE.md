# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm install                    # install root deps
pnpm dev                        # rozenite dev (panel hot reload)
pnpm dev:web                    # vite-only dev (no Rozenite shell)
pnpm build                      # typecheck + test + vite build + rozenite build
pnpm build:web                  # vite build only (devtools bundle)
pnpm build:plugin               # rozenite build only
pnpm test                       # vitest run on src
pnpm typecheck                  # tsc --noEmit
pnpm example:start              # start the RN example with Rozenite enabled
```

Run a single test file: `pnpm test src/__tests__/zustandManagerCore.test.ts`.
Run a single test by name: `pnpm test -- -t "patches array indexes"`.

The example app lives in `example/` as a separate workspace and uses Metro / React Native; it has its own `metro.config.js` that wraps the plugin via `withZustandManager(withRozenite(...))`.

## Architecture

The plugin has **three independently shipped artifacts** declared in `package.json`:

1. **DevTools panel** — web app at `dist/devtools/App.html`, entry `src/main.tsx` → `src/App.tsx`. Built by Vite + `@rozenite/vite-plugin`. Configured in `rozenite.config.ts`.
2. **React Native runtime** — `react-native.ts` at the repo root, exported as `main`/`module`/`react-native` in `package.json`. Compiled to `dist/react-native/`.
3. **Metro Babel transformer** — `metro.ts` at the repo root, exported under the `./metro` subpath. Compiled to `dist/metro/`.

These three pieces communicate through the **Rozenite bridge** (`@rozenite/plugin-bridge`) using a typed event contract. Both sides share the same plugin id (`@rozenite/zustand-manager`); a mismatch silently breaks the bridge.

### Bridge contract

The event map (`zustand:snapshot`, `zustand:store-update`, `zustand:store-reset`, `zustand:request-snapshot`, `zustand:patch-value`, `zustand:delete-value`, `zustand:replace-state`, `zustand:call-action`, `zustand:reset-store`) is duplicated in:

- `react-native.ts` (`ZustandManagerEvents`) — runtime side
- `src/features/zustand-panel/useZustandManagerPanel.ts` (`BridgeEvents`) — panel side

Both must stay in sync. Adding a new bridge message requires updating both shapes plus the `StoreDescriptor` in `src/features/zustand-panel/types.ts` (panel) and `src/lib/zustandManagerCore.ts` (runtime).

### React Native runtime (`react-native.ts`)

A **singleton runtime** lives on `globalThis.__ROZENITE_ZUSTAND_MANAGER_RUNTIME__`. The Metro transformer injects `registerZustandStore(...)` calls at module scope; the runtime is created lazily on first registration, subscribes to each store, and lazily acquires a Rozenite client. This decoupling is intentional — store registration must work before any React component mounts and without depending on `useZustandManager`.

A debug surface (`globalThis.__ZUSTAND_MANAGER__`) mirrors the runtime API so the bridge can be exercised from the RN debugger / MCP without going through DevTools.

Mutation path is **always top-level partial**: `applyPathPatch` returns `{ partial }` rooted at the top key so `setState(partial, false)` merges instead of wiping store actions. Replacing the entire state uses the explicit `setState(value, true)` form. Sanitization (`createSanitizedSnapshot`) drops functions and redacts keys matching `DEFAULT_REDACT_PATTERN` before any data crosses the bridge.

### Metro transformer (`metro.ts`)

A Babel transformer wrapper that delegates to the upstream `@react-native/metro-babel-transformer`. `withZustandManager(config)` swaps `transformer.babelTransformerPath` to point at this module; the upstream path is preserved via the `ROZENITE_ZUSTAND_MANAGER_UPSTREAM_TRANSFORMER` env var so the chain isn't broken. `ROZENITE_ZUSTAND_MANAGER_PROJECT_ROOT` is used to relativize file paths and to resolve the upstream transformer from the consumer's `node_modules`.

`__unstableTransformZustandSource` parses imports from `zustand` / `zustand/vanilla`, finds module-level `const X = create<...>(...)` declarations, and appends `__rozeniteZustandRegisterStore({ name, file, store })` after the original source. It deliberately uses regex (no AST) and only fires when both `zustand` and `create` strings are present in the source. Edge cases like namespace imports, factory functions, and `createWithEqualityFn` are not yet handled — see test coverage in `src/__tests__/metroAutodiscovery.test.ts`.

### Panel UI (`src/`)

Structure is **feature-based**, not type-based:

- `src/features/zustand-panel/` — `useZustandManagerPanel` is the only place that holds bridge subscriptions; views never talk to the bridge directly. `types.ts` defines the panel-side `StoreDescriptor` / `TimelineEvent` / `Snapshot` shapes.
- `src/features/inspector/` — `InspectorView`, `StateTree`. Three-pane layout (stores list / state tree / detail) backed by `ResizablePanels`.
- `src/features/timeline/` — recent bridge updates with restore-before action.
- `src/features/snapshots/` — manual + auto-captured snapshots, restore.
- `src/common/components/` — shared Atoms, Modal, ResizablePanels.
- `src/common/utils/stateUtils.ts` — pure helpers (`getPathValue`, `deleteAtPath`, `parseEditableValue`, `formatJson`, etc). Anything pure related to JSON paths or value rendering belongs here.
- `src/lib/zustandManagerCore.ts` — runtime-shared core (path patching, sanitization, descriptor creation). Imported by `react-native.ts`. Keep this file framework-free (no React, no DOM).

`src/App.tsx` is the panel shell: tabs, active store / selected path / active event state, and footer status bar. It owns the cross-feature selection state but delegates all bridge IO to `useZustandManagerPanel`.

Styling: Tailwind v4 (via `@tailwindcss/vite`) plus three CSS modules — `tokens.css` (design tokens), `app.css` (layout primitives `zm-*`), `timeline.css` (timeline-specific). Class names use the `zm-` prefix as a convention.

## Conventions

- Package manager: **pnpm only**. Do not use `npm` / `npx`.
- Source uses **TypeScript with `verbatimModuleSyntax` + `erasableSyntaxOnly`**: type-only imports must use `import type`, no `enum` / `namespace` / parameter properties. Treat `noUnusedLocals` / `noUnusedParameters` as build errors.
- React **must be a single copy** in any consumer bundle. Root has React as a `devDependency` only; `peerDependencies` declares React / React Native / Zustand. Duplicate React in the example bundle has caused "Invalid hook call" crashes before — verify Hermes bundle, not just Metro success.
- Do not modify `example/` for plugin-side changes unless the example actually exercises a new code path.
- The Rozenite plugin id is `@rozenite/zustand-manager` and is hardcoded in four places: `package.json#name`, `react-native.ts` (`PLUGIN_ID`), `src/features/zustand-panel/useZustandManagerPanel.ts` (`PLUGIN_ID`), and the import string in `metro.ts` (`__unstableTransformZustandSource`). All four must match.
- Tests live in `src/__tests__/` and run with **vitest**. Core, bridge messages, panel state utils, package config, and Metro autodiscovery each have their own spec — extend the matching one rather than creating a new file.

## Verification

For UI / runtime changes, the build pipeline alone is not enough. Reload the example app in the RN debugger and confirm `globalThis.__ZUSTAND_MANAGER__.stores` reports the expected stores; the panel should hydrate without falling back to "No stores connected". `pnpm build` runs `typecheck → test → build:web → build:plugin` and is the canonical pre-publish gate.

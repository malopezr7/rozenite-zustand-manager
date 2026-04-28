![rozenite-banner](https://www.rozenite.dev/rozenite-banner.jpg)

### A Rozenite plugin that brings live inspection, time-travel, and type-aware action invocation to Zustand stores in React Native.

[![mit licence][license-badge]][license] [![npm version][npm-version-badge]][npm] [![npm downloads][npm-downloads-badge]][npm-downloads] [![CI][ci-badge]][ci] [![Chat][chat-badge]][chat] [![PRs Welcome][prs-welcome-badge]][prs-welcome]

The Rozenite Zustand Manager Plugin provides real-time store inspection, time-travel debugging, snapshot capture, and type-aware action invocation for every Zustand store in your React Native app — without per-store wiring.

This plugin is a community contribution to the [Rozenite][rozenite-website] DevTools ecosystem.

> 🚧 **Status:** `0.0.1` — alpha. API is stable, the panel UI is still being polished. Feedback and PRs welcome.

![Zustand Manager Plugin](https://raw.githubusercontent.com/malopezr7/rozenite-zustand-manager/main/docs/zustand-manager-plugin.png)

## Features

- **Metro Autodiscovery**: Babel transformer wraps your Metro config and registers every module-level `create<T>()(...)` Zustand store automatically. Your app source stays untouched.
- **Live Inspector**: Tree, JSON, and table views with type-aware inline editing, path/value copy, search, and sensitive-key redaction.
- **Timeline**: Every mutation captured as a diff event with real `+/−` line counts, kind filters (`edit` / `action` / `replace` / `reset`), restore-before, and side-by-side compare.
- **Snapshots**: Capture, import/export JSON, restore-all or per-store, compare current state vs any snapshot in a side-by-side diff modal.
- **Type-aware Action Runner**: Every action exposed as a button. Arity-0 actions fire immediately; parameterized actions open a form with per-arg type pills (`string` / `number` / `boolean` / `object` / `array` / `null` / `undefined`).
- **Safe by Default**: Functions stripped before crossing the bridge, sensitive keys (`token`, `password`, `email`, `secret`, …) redacted server-side, mutations applied as top-level partials so your store actions are never wiped.

## Installation

Install the plugin as a dev dependency:

```bash
npm install --save-dev rozenite-zustand-manager
```

**Note:** This plugin requires `zustand` (>= 5.0) as a peer dependency, plus [Rozenite][rozenite-website] and [`@rozenite/metro`][rozenite-metro] wired into your project.

## Quick Start

### 1. Install the Plugin

```bash
npm install --save-dev rozenite-zustand-manager
```

### 2. Wrap Your Metro Config

```js
// metro.config.js
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const { withRozenite } = require('@rozenite/metro');
const { withZustandManager } = require('rozenite-zustand-manager/metro');

const config = mergeConfig(getDefaultConfig(__dirname), {});

module.exports = withZustandManager(
  withRozenite(config, {
    enabled: process.env.WITH_ROZENITE !== 'false',
  }),
);
```

> No `include` option needed — Rozenite auto-discovers any installed dependency that ships a `dist/rozenite.json` manifest.

### 3. Define Stores Normally

```typescript
// src/stores/useAuthStore.ts
import { create } from 'zustand';

export const useAuthStore = create<AuthState>()((set) => ({
  user: null,
  signIn: (user) => set({ user }),
  signOut: () => set({ user: null }),
}));
```

The Metro transformer detects this declaration and injects a dev-only `registerZustandStore({ name, file, store })` call. **Your source stays untouched.**

### 4. Access DevTools

Start your development server with Rozenite enabled and open React Native DevTools. You'll find the **Zustand Manager** panel in the DevTools interface.

```bash
WITH_ROZENITE=true npm start
```

## Manual Registration

For stores the autodiscovery can't reach — factory functions, runtime-created stores, re-exports through a wrapper — register them explicitly:

```typescript
import { registerZustandStore } from 'rozenite-zustand-manager';
import { createBottomSheetStore } from './createBottomSheetStore';

const sheet = createBottomSheetStore({ visible: false });

export const useSheetStore = sheet.useStore;

if (__DEV__) {
  registerZustandStore({
    name: 'useSheetStore',
    file: 'features/ui/sheets/useSheetStore.ts',
    store: useSheetStore,
  });
}
```

`registerZustandStore` returns a cleanup function. There is also a hook form for component-scoped registration:

```typescript
import { useZustandManager } from 'rozenite-zustand-manager';

function App() {
  useZustandManager([
    { name: 'useAuthStore', store: useAuthStore },
    { name: 'useCartStore', store: useCartStore, redactPattern: /token|password/i },
  ]);
  return <YourApp />;
}
```

## Configuration

### `withZustandManager(metroConfig, options?)`

```typescript
type WithZustandManagerOptions = {
  enabled?: boolean; // default true. Set to false in production builds.
};
```

### `StoreEntry`

| Field           | Type          | Description                                                                                       |
| --------------- | ------------- | ------------------------------------------------------------------------------------------------- |
| `name`          | `string`      | Display name in the panel. **Required.**                                                          |
| `store`         | `StoreApi<T>` | The Zustand store (the value returned by `create`). **Required.**                                 |
| `id`            | `string`      | Stable id for diffing. Defaults to `name`.                                                        |
| `file`          | `string`      | Source path, shown in the inspector header. Optional.                                             |
| `actions`       | `string[]`    | Whitelist of action names to expose. Defaults to all functions in state.                          |
| `editable`      | `boolean`     | When `false`, panel disables Edit / Replace / Delete — store becomes read-only.                   |
| `redactPattern` | `RegExp`      | Custom regex for sensitive keys. Defaults to `password\|token\|secret\|email\|apiKey\|authorization`. |

## Usage

Once you've configured the plugin, it provides:

- **Inspector tab**: Sidebar of stores, central tree / JSON / table view of state, right-side detail pane with type-aware inline editing, path/value copy, exposed actions, and danger zone (reset / replace).
- **Timeline tab**: Stream of every mutation with diff highlights and `+/−` counts. Filter by store and kind (`edit` / `action` / `replace` / `reset`), restore the state from before any event, or compare before/after side-by-side.
- **Snapshots tab**: Manual capture or import JSON, restore one store or all, compare a snapshot vs current state in a side-by-side diff modal, export to JSON.
- **Action runner**: Arity-0 actions fire on click; parameterized actions open a typed form modal where you pick the kind per parameter (`string` / `number` / `boolean` / `object` / `array` / `null` / `undefined`).
- **Sensitive-key redaction**: Keys matching the redact pattern (default or custom) are masked in the panel and never crossed the bridge raw.

## How It Works

The package ships **three artifacts** that talk through the typed Rozenite bridge:

1. **DevTools panel** (`dist/devtools/`) — Vite-built React app shown in Chrome DevTools.
2. **React Native runtime** (`dist/react-native/`) — singleton on `globalThis.__ROZENITE_ZUSTAND_MANAGER_RUNTIME__`. Subscribes to each store, sanitizes snapshots, applies remote mutations as top-level partials so actions survive every edit.
3. **Metro transformer** (`dist/metro/`) — wraps `@react-native/metro-babel-transformer`. For files that import `zustand` and define module-level `create<T>()(...)` declarations, appends a `__rozeniteZustandRegisterStore({ name, file, store })` call. Factory functions and indented `const` declarations are deliberately skipped to avoid `ReferenceError` on closure-scoped variables.

All mutation paths use `setState(partial, false)` so action functions are never wiped. Replace-state uses the explicit `setState(value, true)` form. Function values are stripped, and configurable redaction runs before any data crosses the bridge.

## Limitations

- The Metro transformer is regex-based. Only **module-level** `const x = create<...>(...)` declarations from `zustand` / `zustand/vanilla` are caught. Factories, namespace imports (`import * as Z from 'zustand'`), and dynamic helpers (`createWithEqualityFn`, `combine`, …) need manual `registerZustandStore`.
- Action arguments are introspected via `fn.length` and a best-effort `fn.toString()` parse. Hermes-optimized builds fall back to generic `arg0`, `arg1` names — the form still works, you just lose the original parameter names.
- TypeScript type information is **not** available at runtime; the per-arg form uses kind pills for the user to pick the correct type.
- Class instances, `Date`, `Map`, `Set` are coerced to JSON-friendly values before crossing the bridge; round-tripping back to the original instance is on you.

## Plugin Development

```bash
pnpm install
pnpm dev            # vite + rozenite live reload of the panel
pnpm build          # typecheck → tests → vite build → rozenite build
pnpm test           # vitest
pnpm typecheck      # tsc --noEmit
pnpm example:start  # boot the RN example with Rozenite enabled
```

The example app under [`example/`](example/) reproduces the full flow with `useAuthStore`, `useCartStore`, and `useUiStore`.

## Contributing

PRs and issues welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) for the workflow and project layout. By participating, you agree to abide by the [Code of Conduct](CODE_OF_CONDUCT.md).

Release notes live in [CHANGELOG.md](CHANGELOG.md).

## Made with ❤️ for the React Native community

`rozenite-zustand-manager` is a community plugin built on top of [Rozenite][rozenite-website], the modular DevTools framework crafted by the team at [Callstack][callstack-website]. Huge ⭐ to them for making the plugin model possible — go give the [main repo][rozenite-repo] some love.

If this plugin saves you time, please star the [repo][repo] and join the [Rozenite Discord][chat] to share what you build.

[rozenite-website]: https://www.rozenite.dev
[rozenite-repo]: https://github.com/callstackincubator/rozenite
[rozenite-metro]: https://www.npmjs.com/package/@rozenite/metro
[callstack-website]: https://callstack.com
[repo]: https://github.com/malopezr7/rozenite-zustand-manager
[npm]: https://www.npmjs.com/package/rozenite-zustand-manager
[npm-downloads]: https://www.npmjs.com/package/rozenite-zustand-manager
[npm-version-badge]: https://img.shields.io/npm/v/rozenite-zustand-manager?style=for-the-badge
[npm-downloads-badge]: https://img.shields.io/npm/dm/rozenite-zustand-manager?style=for-the-badge
[license]: https://github.com/malopezr7/rozenite-zustand-manager/blob/main/LICENSE
[license-badge]: https://img.shields.io/npm/l/rozenite-zustand-manager?style=for-the-badge
[prs-welcome]: https://github.com/malopezr7/rozenite-zustand-manager/blob/main/CONTRIBUTING.md
[prs-welcome-badge]: https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=for-the-badge
[chat]: https://discord.gg/xgGt7KAjxv
[chat-badge]: https://img.shields.io/discord/426714625279524876.svg?style=for-the-badge
[ci]: https://github.com/malopezr7/rozenite-zustand-manager/actions/workflows/ci.yml
[ci-badge]: https://img.shields.io/github/actions/workflow/status/malopezr7/rozenite-zustand-manager/ci.yml?branch=main&style=for-the-badge&label=CI

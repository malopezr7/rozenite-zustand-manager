# Contributing

Thanks for your interest in `rozenite-zustand-manager`! This is a small community plugin and contributions of all sizes are welcome — typo fixes, doc improvements, bug reports, and feature PRs.

## Development setup

The repo is a `pnpm` workspace with two members:

- `packages/rozenite-zustand-manager/` — the published plugin (panel UI, RN runtime, Metro transformer, tests).
- `example/` — bare React Native app that consumes the plugin via `workspace:*`.

```bash
pnpm install
pnpm build           # filters to packages/rozenite-zustand-manager → typecheck → test → vite build → rozenite build
pnpm test            # vitest
pnpm typecheck       # tsc --noEmit (inside the plugin package)
pnpm lint            # biome check . (workspace-wide)
```

To exercise the panel against the example RN app:

```bash
pnpm build           # build dist/ first
pnpm example:start   # boots Metro with WITH_ROZENITE=true
```

Then open React Native DevTools → **Zustand Manager**.

## Project layout

| Path                                                                           | What lives here                                                              |
| ------------------------------------------------------------------------------ | ---------------------------------------------------------------------------- |
| `packages/rozenite-zustand-manager/`                                           | Published npm package. Owns its own `package.json`, scripts, and tests.      |
| `packages/rozenite-zustand-manager/src/App.tsx`                                | Panel shell (tabs, view switching, top toolbar)                              |
| `packages/rozenite-zustand-manager/src/features/zustand-panel/`                | Bridge subscriptions, panel-side `StoreDescriptor` types, panel hook         |
| `packages/rozenite-zustand-manager/src/features/inspector/`                    | Inspector view, state tree, action params modal                              |
| `packages/rozenite-zustand-manager/src/features/timeline/`                     | Timeline view + diff panel                                                   |
| `packages/rozenite-zustand-manager/src/features/snapshots/`                    | Snapshots view                                                               |
| `packages/rozenite-zustand-manager/src/common/components/`                     | Shared UI atoms (Modal, ResizablePanels, PanelToggleMenu, CompareModal)      |
| `packages/rozenite-zustand-manager/src/common/utils/stateUtils.ts`             | Pure path/value helpers — no React, no DOM                                   |
| `packages/rozenite-zustand-manager/src/lib/zustandManagerCore.ts`              | Runtime-shared core (path patching, sanitization, descriptor creation)       |
| `packages/rozenite-zustand-manager/react-native.ts`                            | RN runtime singleton + `registerZustandStore` / `useZustandManager`          |
| `packages/rozenite-zustand-manager/metro.ts`                                   | Babel transformer (`__unstableTransformZustandSource`, `withZustandManager`) |
| `packages/rozenite-zustand-manager/src/__tests__/`                             | Vitest specs — one file per topic                                            |
| `example/`                                                                     | React Native sample app                                                      |
| `.github/`, `.husky/`, `biome.json`, root `package.json`                       | Workspace tooling (CI, hooks, lint config, orchestrator scripts)             |

## Pull request checklist

1. Open an issue first if the change is non-trivial (new feature, behavior change, API addition).
2. `pnpm install && pnpm build` must pass before submitting.
3. Add or update the matching spec under `packages/rozenite-zustand-manager/src/__tests__/` — extend the right file rather than creating a new one. Topics: `zustandManagerCore` / `panelStateUtils` / `metroAutodiscovery` / `packageConfig`.
4. Use [Conventional Commits][conventional-commits] for branch names and PR titles (e.g. `feat: action params modal`, `fix(metro): regex now ignores indented declarations`).
5. Keep the PR scoped — refactors and unrelated cleanups in separate PRs.

## Bridge contract

The Rozenite bridge event map is duplicated in two places that **must stay in sync**:

- `packages/rozenite-zustand-manager/react-native.ts` (`ZustandManagerEvents`) — runtime side
- `packages/rozenite-zustand-manager/src/features/zustand-panel/useZustandManagerPanel.ts` (`BridgeEvents`) — panel side

Adding a new bridge message means updating both shapes plus the relevant `StoreDescriptor` in `src/features/zustand-panel/types.ts` (panel) and `src/lib/zustandManagerCore.ts` (runtime).

## Plugin id

The plugin id `rozenite-zustand-manager` is hardcoded in four places — keep them aligned:

- `packages/rozenite-zustand-manager/package.json#name`
- `packages/rozenite-zustand-manager/react-native.ts` (`PLUGIN_ID`)
- `packages/rozenite-zustand-manager/src/features/zustand-panel/useZustandManagerPanel.ts` (`PLUGIN_ID`)
- `packages/rozenite-zustand-manager/metro.ts` injected import inside `__unstableTransformZustandSource`

A `packageConfig` test guards the package shape. The `metroAutodiscovery` test guards the injected import path.

## Reporting bugs

Please include:

- React Native version
- Zustand version
- A minimal repro (a stripped-down store + the panel behavior you saw vs expected)
- Whether the bug reproduces with autodiscovery or only with manual `registerZustandStore`

## License

By contributing you agree your work is released under the [MIT License](LICENSE).

[conventional-commits]: https://www.conventionalcommits.org/

# Contributing

Thanks for your interest in `rozenite-zustand-manager`! This is a small community plugin and contributions of all sizes are welcome — typo fixes, doc improvements, bug reports, and feature PRs.

## Development setup

The repo is a `pnpm` workspace with the plugin at the root and a React Native sample app under `example/`.

```bash
pnpm install
pnpm build           # typecheck → tests → vite build → rozenite build
pnpm test            # vitest
pnpm typecheck       # tsc --noEmit
```

To exercise the panel against the example RN app:

```bash
pnpm build           # build dist/ first
pnpm example:start   # boots Metro with WITH_ROZENITE=true
```

Then open React Native DevTools → **Zustand Manager**.

## Project layout

| Path                                            | What lives here                                                            |
| ----------------------------------------------- | -------------------------------------------------------------------------- |
| `src/App.tsx`                                   | Panel shell (tabs, view switching, top toolbar)                            |
| `src/features/zustand-panel/`                   | Bridge subscriptions, panel-side `StoreDescriptor` types, panel hook       |
| `src/features/inspector/`                       | Inspector view, state tree, action params modal                            |
| `src/features/timeline/`                        | Timeline view + diff panel                                                 |
| `src/features/snapshots/`                       | Snapshots view                                                             |
| `src/common/components/`                        | Shared UI atoms (Modal, ResizablePanels, PanelToggleMenu, CompareModal)    |
| `src/common/utils/stateUtils.ts`                | Pure path/value helpers — no React, no DOM                                 |
| `src/lib/zustandManagerCore.ts`                 | Runtime-shared core (path patching, sanitization, descriptor creation)     |
| `react-native.ts`                               | RN runtime singleton + `registerZustandStore` / `useZustandManager`        |
| `metro.ts`                                      | Babel transformer (`__unstableTransformZustandSource`, `withZustandManager`) |
| `src/__tests__/`                                | Vitest specs — one file per topic                                          |

## Pull request checklist

1. Open an issue first if the change is non-trivial (new feature, behavior change, API addition).
2. `pnpm install && pnpm build` must pass before submitting.
3. Add or update the matching spec under `src/__tests__/` — extend the right file rather than creating a new one. Topics: `zustandManagerCore` / `panelStateUtils` / `metroAutodiscovery` / `bridgeMessages` / `packageConfig`.
4. Use [Conventional Commits][conventional-commits] for branch names and PR titles (e.g. `feat: action params modal`, `fix(metro): regex now ignores indented declarations`).
5. Keep the PR scoped — refactors and unrelated cleanups in separate PRs.

## Bridge contract

The Rozenite bridge event map is duplicated in two places that **must stay in sync**:

- `react-native.ts` (`ZustandManagerEvents`) — runtime side
- `src/features/zustand-panel/useZustandManagerPanel.ts` (`BridgeEvents`) — panel side

Adding a new bridge message means updating both shapes plus the relevant `StoreDescriptor` in `src/features/zustand-panel/types.ts` (panel) and `src/lib/zustandManagerCore.ts` (runtime).

## Plugin id

The plugin id `rozenite-zustand-manager` is hardcoded in four places — keep them aligned:

- `package.json#name`
- `react-native.ts` (`PLUGIN_ID`)
- `src/features/zustand-panel/useZustandManagerPanel.ts` (`PLUGIN_ID`)
- `metro.ts` injected import inside `__unstableTransformZustandSource`

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

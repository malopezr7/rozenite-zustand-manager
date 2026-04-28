![rozenite-banner](https://www.rozenite.dev/rozenite-banner.jpg)

# rozenite-zustand-manager · monorepo

A community Rozenite plugin that brings live inspection, time-travel, and type-aware action invocation to Zustand stores in React Native.

This repo is a `pnpm` workspace. The published package and the canonical README live under [`packages/rozenite-zustand-manager`](packages/rozenite-zustand-manager). Start there if you want to install the plugin or see the full feature list.

## Layout

| Path                                    | What lives here                                                              |
| --------------------------------------- | ---------------------------------------------------------------------------- |
| `packages/rozenite-zustand-manager/`    | The published plugin: panel UI, RN runtime, Metro transformer, tests.        |
| `example/`                              | Bare React Native app that exercises the plugin via `workspace:*`.           |
| `docs/`                                 | Documentation assets (panel screenshot referenced from the package README).  |
| `.github/`                              | CI workflows, dependabot, issue and PR templates.                            |

## Working in this repo

```bash
pnpm install
pnpm build           # filters down to packages/rozenite-zustand-manager
pnpm test
pnpm typecheck
pnpm lint            # biome at the workspace root
pnpm example:start   # WITH_ROZENITE=true RN sample app
```

The full developer guide and contribution flow are in [CONTRIBUTING.md](CONTRIBUTING.md).

## License

MIT © [Manuel Lopez](https://github.com/malopezr7) — see [LICENSE](LICENSE).

# Example app

A bare React Native app that exercises `rozenite-zustand-manager` with three Zustand stores:

- `useAuthStore` — auth flow with redacted tokens
- `useCartStore` — list mutations
- `useUiStore` — UI flags

## Run it

From the repo root:

```bash
pnpm install
pnpm build       # build the plugin once
pnpm example:start
```

Or from this directory:

```bash
WITH_ROZENITE=true pnpm start
```

Open React Native DevTools → **Zustand Manager**. The three stores above are auto-discovered by the Metro transformer (no manual `registerZustandStore` calls in this example).

## What this exercises

- Metro autodiscovery of module-level `create<T>()(...)` declarations.
- Live state inspection while you tap buttons in the app.
- Action invocation with parameters (`addItem(item)`, `signIn(user)`).
- Sensitive-key redaction (`refreshToken`).
- Reset, replace, and snapshot/restore from the panel.

<!--
Thanks for opening a PR!
Please read CONTRIBUTING.md and tick what applies below.
-->

## Summary

<!-- One short paragraph: what this PR does and why. Link the related issue: "Closes #N". -->

## Type of change

- [ ] Bug fix (non-breaking change that fixes an issue)
- [ ] New feature (non-breaking change that adds functionality)
- [ ] Breaking change (fix or feature that would cause existing usage to break)
- [ ] Refactor / chore (no behavior change)
- [ ] Documentation only

## Scope

Which artifact does this touch?

- [ ] DevTools panel UI (`src/`)
- [ ] React Native runtime (`react-native.ts`)
- [ ] Metro transformer (`metro.ts`)
- [ ] Shared core (`src/lib/zustandManagerCore.ts`)
- [ ] Bridge contract (event map / store descriptor)
- [ ] Example app (`example/`)
- [ ] Docs only

## Checklist

- [ ] `pnpm install && pnpm build` passes locally
- [ ] Added or updated a spec under `src/__tests__/` (extended the matching topic file)
- [ ] If the bridge contract changed, both `react-native.ts` and `useZustandManagerPanel.ts` are in sync
- [ ] If the plugin id changed, all four hardcoded locations are updated (see CONTRIBUTING.md)
- [ ] Branch / commit titles use [Conventional Commits](https://www.conventionalcommits.org/)
- [ ] No unrelated refactors mixed in

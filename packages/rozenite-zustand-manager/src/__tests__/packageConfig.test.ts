import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

function readJson(path: string) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

const packageDir = process.cwd();
const repoRoot = join(packageDir, '..', '..');

describe('package dependency layout', () => {
  it('keeps React and Zustand as peers to avoid duplicate runtime hooks in the RN example', () => {
    const pluginPackage = readJson(join(packageDir, 'package.json'));
    const examplePackage = readJson(join(repoRoot, 'example/package.json'));

    expect(pluginPackage.dependencies).not.toHaveProperty('react');
    expect(pluginPackage.dependencies).not.toHaveProperty('react-dom');
    expect(pluginPackage.dependencies).not.toHaveProperty('zustand');

    expect(pluginPackage.peerDependencies).toHaveProperty('react');
    expect(pluginPackage.peerDependencies).toHaveProperty('react-native');
    expect(pluginPackage.peerDependencies).toHaveProperty('zustand');

    expect(pluginPackage.devDependencies.react).toBe(examplePackage.dependencies.react);
  });
});

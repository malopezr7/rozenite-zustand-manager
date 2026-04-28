import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

function readJson(path: string) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

describe('package dependency layout', () => {
  it('keeps React and Zustand as peers to avoid duplicate runtime hooks in the RN example', () => {
    const rootPackage = readJson(join(process.cwd(), 'package.json'));
    const examplePackage = readJson(join(process.cwd(), 'example/package.json'));

    expect(rootPackage.dependencies).not.toHaveProperty('react');
    expect(rootPackage.dependencies).not.toHaveProperty('react-dom');
    expect(rootPackage.dependencies).not.toHaveProperty('zustand');
    expect(rootPackage.peerDependencies).toHaveProperty('react');
    expect(rootPackage.peerDependencies).toHaveProperty('react-native');
    expect(rootPackage.peerDependencies).toHaveProperty('zustand');
    expect(rootPackage.devDependencies.react).toBe(examplePackage.dependencies.react);
  });
});

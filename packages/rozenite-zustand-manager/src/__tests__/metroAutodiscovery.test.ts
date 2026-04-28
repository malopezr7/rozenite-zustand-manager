import { describe, expect, it } from 'vitest';
import { __unstableTransformZustandSource } from '../../metro.ts';

describe('Metro Zustand autodiscovery', () => {
  it('injects registrations for stores created with zustand create', () => {
    const source = `
import { create } from 'zustand';

export const useAuthStore = create<AuthState>()((set) => ({
  user: null,
}));
`;

    const output = __unstableTransformZustandSource(source, '/app/src/stores/useAuthStore.ts');

    expect(output).toContain('registerZustandStore as __rozeniteZustandRegisterStore');
    expect(output).toContain("from 'rozenite-zustand-manager'");
    expect(output).toContain('name: "useAuthStore"');
    expect(output).toContain('store: useAuthStore');
  });

  it('keeps files without Zustand factories unchanged', () => {
    const source = `export const answer = 42;`;

    expect(__unstableTransformZustandSource(source, '/app/src/answer.ts')).toBe(source);
  });

  it('detects stores with multi-line generic type arguments', () => {
    const source = `
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useLiaVisitorStore = create<
  LiaVisitorState & LiaVisitorActions,
  [['zustand/persist', LiaVisitorState]]
>(
  persist((set) => ({ userId: '' }), { name: 'lia' }),
);
`;

    const output = __unstableTransformZustandSource(source, '/app/src/LiaVisitorStore.ts');

    expect(output).toContain('name: "useLiaVisitorStore"');
    expect(output).toContain('store: useLiaVisitorStore');
  });

  it('does not instrument factory functions that call create inside a body', () => {
    const source = `
import { create } from 'zustand';

export const createBottomSheetStore = <TConfig extends object>(initial: TConfig) => {
  const useStore = create<TConfig>((set) => ({ ...initial }));
  return { useStore };
};
`;

    const output = __unstableTransformZustandSource(source, '/app/src/createBottomSheetStore.ts');

    expect(output).toBe(source);
  });
});

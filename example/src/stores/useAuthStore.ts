import { create } from 'zustand';

type AuthState = {
  user: { id: string; email: string; name: string; roles: string[] };
  session: { accessToken: string; refreshToken: string; expiresAt: number };
  status: 'anonymous' | 'authenticated';
  attempts: number;
  signIn: () => void;
  signOut: () => void;
  refreshToken: () => void;
};

export const useAuthStore = create<AuthState>()((set) => ({
  user: { id: 'usr_8a3f9c2e', email: 'marta.ruiz@acme.dev', name: 'Marta Ruiz', roles: ['admin'] },
  session: { accessToken: 'secret-access-token', refreshToken: 'secret-refresh-token', expiresAt: Date.now() + 3600_000 },
  status: 'authenticated',
  attempts: 0,
  signIn: () => set({ status: 'authenticated', attempts: 0 }),
  signOut: () => set({ status: 'anonymous' }),
  refreshToken: () => set((state) => ({
    session: { ...state.session, accessToken: `secret-access-token-${Date.now()}`, expiresAt: Date.now() + 3600_000 },
  })),
}));

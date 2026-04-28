import { create } from 'zustand';

type UiState = {
  drawerOpen: boolean;
  activeTab: 'home' | 'settings' | 'profile';
  toasts: string[];
  toggleDrawer: () => void;
  toast: (message: string) => void;
};

export const useUiStore = create<UiState>()((set) => ({
  drawerOpen: false,
  activeTab: 'home',
  toasts: [],
  toggleDrawer: () => set((state) => ({ drawerOpen: !state.drawerOpen })),
  toast: (message) => set((state) => ({ toasts: [message, ...state.toasts].slice(0, 5) })),
}));

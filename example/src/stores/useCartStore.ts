import { create } from 'zustand';

type CartItem = { id: string; title: string; qty: number; price: number };

type CartState = {
  items: CartItem[];
  coupon: { code: string; discount: number; valid: boolean } | null;
  currency: 'EUR';
  addItem: () => void;
  setQty: (id: string, qty: number) => void;
  clear: () => void;
};

const demoItems: CartItem[] = [
  { id: 'sku_001', title: 'Aeropress Go', qty: 1, price: 39.9 },
  { id: 'sku_044', title: 'Hario V60 02', qty: 2, price: 12.5 },
];

export const useCartStore = create<CartState>()((set) => ({
  items: demoItems,
  coupon: { code: 'WELCOME10', discount: 0.1, valid: true },
  currency: 'EUR',
  addItem: () => set((state) => ({
    items: [
      ...state.items,
      { id: `sku_${String(Date.now()).slice(-3)}`, title: 'Comandante C40', qty: 1, price: 285 },
    ],
  })),
  setQty: (id, qty) => set((state) => ({
    items: state.items.map((item) => (item.id === id ? { ...item, qty } : item)),
  })),
  clear: () => set({ items: [] }),
}));

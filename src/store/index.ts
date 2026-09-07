import { create } from 'zustand';

interface WalletState {
  balance: number;
  setBalance: (balance: number) => void;
  addFunds: (amount: number) => void;
  deductFunds: (amount: number) => void;
}

export const useWalletStore = create<WalletState>((set) => ({
  balance: 0,
  setBalance: (balance) => set({ balance }),
  addFunds: (amount) => set((state) => ({ balance: state.balance + amount })),
  deductFunds: (amount) => set((state) => ({ balance: Math.max(0, state.balance - amount) })),
}));

interface LocationState {
  destination: string | null;
  setDestination: (destination: string | null) => void;
}

export const useLocationStore = create<LocationState>((set) => ({
  destination: null,
  setDestination: (destination) => set({ destination }),
}));

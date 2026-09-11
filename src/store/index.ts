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

export interface TripRecord {
  id: string;
  date: string;
  route: string;
  destination: string;
  fare: number;
  paymentMethod: string;
}

interface HistoryState {
  history: TripRecord[];
  addRecord: (record: TripRecord) => void;
}

export const useHistoryStore = create<HistoryState>((set) => ({
  history: [],
  addRecord: (record) => set((state) => ({ history: [record, ...state.history] })),
}));

interface LocationState {
  destination: string | null;
  setDestination: (destination: string | null) => void;
}

export const useLocationStore = create<LocationState>((set) => ({
  destination: null,
  setDestination: (destination) => set({ destination }),
}));

export type TripState = 'idle' | 'selecting_route' | 'selecting_stop' | 'confirming' | 'processing_payment' | 'active';
export type PaymentMethod = 'wallet' | 'momo' | 'cash';

interface TripStoreState {
  tripState: TripState;
  selectedRoute: any | null;
  selectedStop: any | null;
  boardingStop: any | null;
  selectedBus: any | null;
  paymentMethod: PaymentMethod;
  estimatedFare: number;
  
  setTripState: (state: TripState) => void;
  setSelectedRoute: (route: any | null) => void;
  setSelectedStop: (stop: any | null) => void;
  setBoardingStop: (stop: any | null) => void;
  setSelectedBus: (bus: any | null) => void;
  setPaymentMethod: (method: PaymentMethod) => void;
  setEstimatedFare: (fare: number) => void;
  resetTrip: () => void;
}

export const useTripStore = create<TripStoreState>((set) => ({
  tripState: 'idle',
  selectedRoute: null,
  selectedStop: null,
  boardingStop: null,
  selectedBus: null,
  paymentMethod: 'wallet',
  estimatedFare: 0,
  
  setTripState: (tripState) => set({ tripState }),
  setSelectedRoute: (selectedRoute) => set({ selectedRoute }),
  setSelectedStop: (selectedStop) => set({ selectedStop }),
  setBoardingStop: (boardingStop) => set({ boardingStop }),
  setSelectedBus: (selectedBus) => set({ selectedBus }),
  setPaymentMethod: (paymentMethod) => set({ paymentMethod }),
  setEstimatedFare: (estimatedFare) => set({ estimatedFare }),
  resetTrip: () => set({
    tripState: 'idle',
    selectedRoute: null,
    selectedStop: null,
    boardingStop: null,
    selectedBus: null,
    estimatedFare: 0
  })
}));

export * from './settingsStore';

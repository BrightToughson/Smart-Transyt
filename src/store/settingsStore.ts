import { create } from 'zustand';
import { persist, createJSONStorage, StateStorage } from 'zustand/middleware';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const secureStorage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    try {
      return (await SecureStore.getItemAsync(name)) || null;
    } catch {
      return null;
    }
  },
  setItem: async (name: string, value: string): Promise<void> => {
    try {
      await SecureStore.setItemAsync(name, value);
    } catch {}
  },
  removeItem: async (name: string): Promise<void> => {
    try {
      await SecureStore.deleteItemAsync(name);
    } catch {}
  },
};

const customStorage = Platform.OS === 'web' ? localStorage : secureStorage;

interface SettingsState {
  notificationsEnabled: boolean;
  locationEnabled: boolean;
  darkModeEnabled: boolean;
  
  setNotificationsEnabled: (enabled: boolean) => void;
  setLocationEnabled: (enabled: boolean) => void;
  setDarkModeEnabled: (enabled: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      notificationsEnabled: false,
      locationEnabled: false,
      darkModeEnabled: false,
      
      setNotificationsEnabled: (enabled) => set({ notificationsEnabled: enabled }),
      setLocationEnabled: (enabled) => set({ locationEnabled: enabled }),
      setDarkModeEnabled: (enabled) => set({ darkModeEnabled: enabled }),
    }),
    {
      name: 'smart-transyt-settings',
      storage: createJSONStorage(() => customStorage),
    }
  )
);

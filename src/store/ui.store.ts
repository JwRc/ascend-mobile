import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Direction, semanticColors } from '@/theme';

export type ColorScheme = 'system' | 'light' | 'dark';

type UIState = {
  direction: Direction;
  accent: string;
  colorScheme: ColorScheme;
  setDirection: (d: Direction) => void;
  setAccent: (a: string) => void;
  setColorScheme: (c: ColorScheme) => void;
};

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      direction: 'A',
      accent: semanticColors.accentDefault,
      colorScheme: 'system',
      setDirection: (direction) => set({ direction }),
      setAccent: (accent) => set({ accent }),
      setColorScheme: (colorScheme) => set({ colorScheme }),
    }),
    {
      name: 'ascentio-ui-prefs',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

import { create } from 'zustand';
import { Direction, semanticColors } from '@/theme';

type UIState = {
  direction: Direction;
  accent: string;
  isDark: boolean;
  setDirection: (d: Direction) => void;
  setAccent: (a: string) => void;
  setDark: (dark: boolean) => void;
  toggleDark: () => void;
};

export const useUIStore = create<UIState>((set) => ({
  direction: 'A',
  accent: semanticColors.accentDefault,
  isDark: false,
  setDirection: (direction) => set({ direction }),
  setAccent: (accent) => set({ accent }),
  setDark: (isDark) => set({ isDark }),
  toggleDark: () => set((s) => ({ isDark: !s.isDark })),
}));

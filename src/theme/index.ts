import React from 'react';
import { lightColors, darkColors, semanticColors, ThemeColors } from './colors';
import { Direction } from './typography';

export type { Direction };
export { fonts } from './typography';
export { semanticColors };

export type Theme = {
  colors: ThemeColors;
  direction: Direction;
  radius: { card: number; cardSm: number };
  isDark: boolean;
};

function buildTheme(isDark: boolean, direction: Direction, accent: string): Theme {
  const base = isDark ? darkColors : lightColors;
  return {
    colors: { ...base, accent },
    direction,
    radius: {
      card: direction === 'A' ? 4 : direction === 'B' ? 22 : 16,
      cardSm: direction === 'A' ? 3 : direction === 'B' ? 14 : 10,
    },
    isDark,
  };
}

export const ThemeContext = React.createContext<Theme>(
  buildTheme(false, 'A', semanticColors.accentDefault)
);

export function useTheme(): Theme {
  return React.useContext(ThemeContext);
}

export { buildTheme };

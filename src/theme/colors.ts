export const lightColors = {
  bg: '#efeeec',
  surface: '#ffffff',
  surface2: '#f5f4f2',
  ink: '#0e0e10',
  ink2: '#5a5a60',
  ink3: '#9a9aa1',
  line: '#e3e2df',
  line2: '#d4d3cf',
  shadow: 'rgba(0,0,0,0.25)',
};

export const darkColors = {
  bg: '#08080a',
  surface: '#131316',
  surface2: '#1b1b1f',
  ink: '#f3f3f4',
  ink2: '#a2a2a9',
  ink3: '#67676e',
  line: '#26262b',
  line2: '#303036',
  shadow: 'rgba(0,0,0,0.7)',
};

export const semanticColors = {
  accentDefault: '#ff5a1f',
  accentVolt: '#b6e600',
  accentCobalt: '#2f6bff',
  accentMagenta: '#ff2d7a',
  accentMono: '#111114',
  success: '#1f9d57',
  successDark: '#46c97e',
  warning: '#e5793a',
  danger: '#e5484d',
};

export type ThemeColors = typeof lightColors & {
  accent: string;
};

// Design system tokens — single source of truth
// CSS custom properties in globals.css are the runtime values;
// these TS constants exist for type safety in JS contexts.

export const colors = {
  // Light mode (default)
  bgPrimary: '#ffffff',
  bgSecondary: '#f5f5f7',
  bgTertiary: '#fbfbfd',
  bgCard: '#ffffff',
  bgInput: '#f5f5f7',
  borderSubtle: '#d2d2d7',
  borderFocus: '#e6ab35',
  textPrimary: '#1d1d1f',
  textSecondary: '#6e6e73',
  textTertiary: '#aeaeb2',
  textInverse: '#ffffff',

  // Dark mode overrides
  dark: {
    bgPrimary: '#000000',
    bgSecondary: '#1c1c1e',
    bgTertiary: '#2c2c2e',
    bgCard: '#1c1c1e',
    bgInput: '#2c2c2e',
    borderSubtle: '#3a3a3c',
    textPrimary: '#f5f5f7',
    textSecondary: '#aeaeb2',
    textTertiary: '#6e6e73',
  },

  // Brand accents
  gold: '#e6ab35',
  goldHover: '#d4941f',
  goldLight: '#fdf3dc',
  goldLightDark: 'rgba(230,171,53,0.15)',
  blue: '#3583b3',
  blueLight: '#e8f4fb',
  blueLightDark: 'rgba(53,131,179,0.15)',

  // Semantic
  success: '#34c759',
  successDark: '#30d158',
  warning: '#ff9f0a',
  warningDark: '#ffd60a',
  error: '#ff3b30',
  errorDark: '#ff453a',
} as const

export const typography = {
  fontStack: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', 'Helvetica Neue', Arial, sans-serif",
  sizes: {
    xs: '11px',
    sm: '13px',
    base: '15px',
    md: '17px',
    lg: '19px',
    xl: '24px',
    '2xl': '28px',
    '3xl': '34px',
    hero: '48px',
  },
} as const

export const spacing = {
  1: '4px',
  2: '8px',
  3: '12px',
  4: '16px',
  5: '20px',
  6: '24px',
  8: '32px',
  10: '40px',
  12: '48px',
  16: '64px',
} as const

export const radius = {
  sm: '8px',
  md: '12px',
  lg: '16px',
  xl: '20px',
} as const

export const shadows = {
  sm: '0 1px 3px rgba(0,0,0,0.08)',
  md: '0 4px 16px rgba(0,0,0,0.10)',
  lg: '0 8px 32px rgba(0,0,0,0.12)',
  xl: '0 24px 64px rgba(0,0,0,0.14)',
} as const

export const transitions = {
  easeSpring: 'cubic-bezier(0.34,1.56,0.64,1)',
  easeSmooth: 'cubic-bezier(0.4,0,0.2,1)',
  fast: '150ms',
  normal: '250ms',
  slow: '400ms',
} as const

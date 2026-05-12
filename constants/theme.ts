// Powered by OnSpace.AI
export const Colors = {
  // Base
  background: '#080808',
  surface: '#111111',
  surfaceElevated: '#181818',
  surfaceBorder: '#242424',

  // Brand - Gold
  primary: '#FFD700',
  primaryDim: '#C9A800',
  primaryGlow: 'rgba(255, 215, 0, 0.12)',
  primarySoft: 'rgba(255, 215, 0, 0.08)',

  // Text
  textPrimary: '#F5F5F5',
  textSecondary: '#999999',
  textMuted: '#555555',
  textInverse: '#080808',

  // Semantic
  success: '#22C55E',
  successDim: 'rgba(34, 197, 94, 0.12)',
  warning: '#F59E0B',
  warningDim: 'rgba(245, 158, 11, 0.12)',
  danger: '#EF4444',
  dangerDim: 'rgba(239, 68, 68, 0.12)',
  info: '#3B82F6',
  infoDim: 'rgba(59, 130, 246, 0.12)',

  // UI
  tabBarBg: '#0D0D0D',
  tabBarBorder: '#1C1C1C',
  inputBg: '#141414',
  inputBorder: '#2A2A2A',
  overlay: 'rgba(0,0,0,0.7)',
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const FontSize = {
  xs: 11,
  sm: 13,
  base: 16,
  md: 18,
  lg: 20,
  xl: 24,
  xxl: 30,
  hero: 38,
};

export const FontWeight = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
};

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 999,
};

export const Shadow = {
  gold: {
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
};

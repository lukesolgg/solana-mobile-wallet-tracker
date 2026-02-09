import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';

const darkColors = {
  primary: '#5B8DEF',
  accent: '#5B8DEF',
  background: '#0D0D0E',
  backgroundGlow: '#0D0D0E',
  surface: '#0D0D0E',
  card: '#161618',
  text: '#FFFFFF',
  textSecondary: '#6B7280',
  textTertiary: '#3D3D42',
  border: '#1E1E22',
  error: '#EF4444',
  success: '#4ADE80',
  gold: '#FFD700',
};

const lightColors = {
  primary: '#3B7DED',
  accent: '#4A90FF',
  background: '#F5F5F7',
  backgroundGlow: '#F5F5F7',
  surface: '#F5F5F7',
  card: '#FFFFFF',
  text: '#0D0D0E',
  textSecondary: '#6B7280',
  textTertiary: '#9CA3AF',
  border: '#E5E7EB',
  error: '#EF4444',
  success: '#22C55E',
  gold: '#DAA520',
};

export type ThemeColors = typeof darkColors;

interface ThemeContextValue {
  isDark: boolean;
  colors: ThemeColors;
  toggle: () => void;
}

export const ThemeContext = createContext<ThemeContextValue>({
  isDark: true,
  colors: darkColors,
  toggle: () => {},
});

export function useThemeProvider(): ThemeContextValue {
  const [isDark, setIsDark] = useState(true);

  const toggle = useCallback(() => setIsDark((prev) => !prev), []);
  const colors = useMemo(() => (isDark ? darkColors : lightColors), [isDark]);

  return { isDark, colors, toggle };
}

export function useAppTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}

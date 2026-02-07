import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';

const darkColors = {
  primary: '#4A90FF',
  accent: '#5BA3FF',
  background: '#111318',
  backgroundGlow: '#0D1B2A',
  surface: '#1A1D24',
  card: '#1E2128',
  text: '#F0F2F5',
  textSecondary: '#8B9CB6',
  border: '#2A2F3A',
  error: '#FF6B6B',
  success: '#4ADE80',
  gold: '#FFD700',
};

const lightColors = {
  primary: '#3B7DED',
  accent: '#4A90FF',
  background: '#F0F2F5',
  backgroundGlow: '#E8EDF5',
  surface: '#FFFFFF',
  card: '#FFFFFF',
  text: '#111318',
  textSecondary: '#5A6A80',
  border: '#D8DDE6',
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

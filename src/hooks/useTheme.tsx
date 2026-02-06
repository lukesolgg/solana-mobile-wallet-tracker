import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { useColorScheme } from 'react-native';

const lightColors = {
  primary: '#7C3AED',
  accent: '#2DD4BF',
  background: '#F8FAFC',
  surface: '#FFFFFF',
  card: '#FFFFFF',
  text: '#0F172A',
  textSecondary: '#64748B',
  border: '#E2E8F0',
  error: '#EF4444',
  success: '#22C55E',
};

const darkColors = {
  primary: '#A78BFA',
  accent: '#2DD4BF',
  background: '#0F172A',
  surface: '#1E293B',
  card: '#1E293B',
  text: '#F1F5F9',
  textSecondary: '#94A3B8',
  border: '#334155',
  error: '#F87171',
  success: '#4ADE80',
};

export type ThemeColors = typeof lightColors;

interface ThemeContextValue {
  isDark: boolean;
  colors: ThemeColors;
  toggle: () => void;
}

export const ThemeContext = createContext<ThemeContextValue>({
  isDark: false,
  colors: lightColors,
  toggle: () => {},
});

export function useThemeProvider(): ThemeContextValue {
  const systemScheme = useColorScheme();
  const [isDark, setIsDark] = useState(systemScheme === 'dark');

  const toggle = useCallback(() => setIsDark((prev) => !prev), []);
  const colors = useMemo(() => (isDark ? darkColors : lightColors), [isDark]);

  return { isDark, colors, toggle };
}

export function useAppTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}

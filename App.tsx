import React from 'react';
import { StatusBar, SafeAreaView, StyleSheet } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeContext, useThemeProvider } from './src/hooks/useTheme';
import { AppNavigator } from './src/navigation/AppNavigator';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

const App: React.FC = () => {
  const themeValue = useThemeProvider();

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeContext.Provider value={themeValue}>
        <StatusBar
          barStyle={themeValue.isDark ? 'light-content' : 'dark-content'}
          backgroundColor={themeValue.colors.background}
        />
        <SafeAreaView style={[styles.root, { backgroundColor: themeValue.colors.background }]}>
          <AppNavigator />
        </SafeAreaView>
      </ThemeContext.Provider>
    </QueryClientProvider>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
});

export default App;

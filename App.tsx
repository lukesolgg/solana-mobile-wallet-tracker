import React from 'react';
import { StatusBar, View, StyleSheet } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeContext, useThemeProvider } from './src/hooks/useTheme';
import { AppNavigator } from './src/navigation/AppNavigator';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      retryDelay: 2000,
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
          barStyle="light-content"
          backgroundColor="transparent"
          translucent
        />
        <View style={[styles.root, { backgroundColor: themeValue.colors.background }]}>
          <AppNavigator />
        </View>
      </ThemeContext.Provider>
    </QueryClientProvider>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
});

export default App;

import React from 'react';
import { View } from 'react-native';
import { useAppTheme } from '../hooks/useTheme';

export const GlowBackground: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { colors } = useAppTheme();

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {children}
    </View>
  );
};

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useAppTheme } from '../hooks/useTheme';

export const GlowBackground: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { colors } = useAppTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Radial blue glow from center */}
      <View
        style={[
          styles.glow,
          {
            backgroundColor: colors.primary + '08',
            shadowColor: colors.primary,
          },
        ]}
      />
      <View
        style={[
          styles.glowInner,
          {
            backgroundColor: colors.primary + '05',
          },
        ]}
      />
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  glow: {
    position: 'absolute',
    top: '15%',
    left: '10%',
    right: '10%',
    height: 400,
    borderRadius: 200,
    opacity: 0.8,
  },
  glowInner: {
    position: 'absolute',
    top: '25%',
    left: '20%',
    right: '20%',
    height: 250,
    borderRadius: 125,
    opacity: 0.6,
  },
});

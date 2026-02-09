import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAppTheme } from '../hooks/useTheme';

interface Props {
  message: string;
  onRetry?: () => void;
}

export const ErrorMessage: React.FC<Props> = ({ message, onRetry }) => {
  const { colors } = useAppTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.card }]}>
      <MaterialCommunityIcons name="alert-circle-outline" size={28} color={colors.error} style={{ marginBottom: 8 }} />
      <Text style={[styles.text, { color: colors.textSecondary }]}>{message}</Text>
      {onRetry && (
        <TouchableOpacity
          style={[styles.retryBtn, { backgroundColor: colors.error + '15' }]}
          onPress={onRetry}
        >
          <Text style={{ color: colors.error, fontWeight: '600' }}>Retry</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    margin: 16,
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  text: { fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 12 },
  retryBtn: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
  },
});

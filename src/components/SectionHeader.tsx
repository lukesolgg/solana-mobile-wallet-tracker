import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAppTheme } from '../hooks/useTheme';

interface Props {
  title: string;
  count?: number;
}

export const SectionHeader: React.FC<Props> = ({ title, count }) => {
  const { colors } = useAppTheme();

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      {count !== undefined && (
        <Text style={[styles.count, { color: colors.textSecondary }]}>({count})</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    gap: 6,
  },
  title: { fontSize: 16, fontWeight: '700' },
  count: { fontSize: 14 },
});

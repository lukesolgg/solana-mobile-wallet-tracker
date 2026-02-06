import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAppTheme } from '../hooks/useTheme';
import type { TokenBalance } from '../types';

interface Props {
  token: TokenBalance;
}

export const TokenRow: React.FC<Props> = ({ token }) => {
  const { colors } = useAppTheme();

  return (
    <View style={[styles.row, { borderBottomColor: colors.border }]}>
      <View style={[styles.icon, { backgroundColor: colors.primary + '20' }]}>
        <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 14 }}>
          {token.symbol.slice(0, 2)}
        </Text>
      </View>
      <View style={styles.info}>
        <Text style={[styles.symbol, { color: colors.text }]}>{token.symbol}</Text>
        <Text style={[styles.name, { color: colors.textSecondary }]}>{token.name}</Text>
      </View>
      <Text style={[styles.amount, { color: colors.text }]}>
        {token.uiAmount.toLocaleString(undefined, { maximumFractionDigits: 4 })}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  icon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  info: { flex: 1 },
  symbol: { fontSize: 14, fontWeight: '600' },
  name: { fontSize: 12, marginTop: 1 },
  amount: { fontSize: 14, fontWeight: '600' },
});

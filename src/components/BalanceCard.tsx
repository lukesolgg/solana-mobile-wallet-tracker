import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAppTheme } from '../hooks/useTheme';

interface Props {
  solBalance: number;
  tokenCount: number;
  nftCount: number;
}

export const BalanceCard: React.FC<Props> = ({ solBalance, tokenCount, nftCount }) => {
  const { colors } = useAppTheme();

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[styles.balanceLabel, { color: colors.textSecondary }]}>SOL Balance</Text>
      <Text style={[styles.balance, { color: colors.text }]}>
        {solBalance.toLocaleString(undefined, { maximumFractionDigits: 4 })} SOL
      </Text>
      <View style={styles.row}>
        <View style={[styles.stat, { backgroundColor: colors.primary + '15' }]}>
          <Text style={[styles.statNum, { color: colors.primary }]}>{tokenCount}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Tokens</Text>
        </View>
        <View style={[styles.stat, { backgroundColor: colors.accent + '15' }]}>
          <Text style={[styles.statNum, { color: colors.accent }]}>{nftCount}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>NFTs</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    margin: 16,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
  },
  balanceLabel: { fontSize: 13, marginBottom: 4 },
  balance: { fontSize: 32, fontWeight: '700', marginBottom: 16 },
  row: { flexDirection: 'row', gap: 12 },
  stat: { flex: 1, alignItems: 'center', padding: 12, borderRadius: 10 },
  statNum: { fontSize: 20, fontWeight: '700' },
  statLabel: { fontSize: 12, marginTop: 2 },
});

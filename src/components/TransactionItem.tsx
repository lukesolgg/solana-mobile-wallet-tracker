import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAppTheme } from '../hooks/useTheme';
import { shortenAddress } from '../utils';
import type { TransactionInfo } from '../types';

interface Props {
  tx: TransactionInfo;
}

export const TransactionItem: React.FC<Props> = ({ tx }) => {
  const { colors } = useAppTheme();

  const isIn = tx.direction === 'in';
  const isOut = tx.direction === 'out';
  const dirColor = isIn ? colors.success : isOut ? colors.error : colors.textSecondary;
  const dirIcon = isIn ? '↓' : isOut ? '↑' : '•';
  const dirLabel = isIn ? 'Received' : isOut ? 'Sent' : 'Unknown';
  const timeStr = tx.timestamp
    ? new Date(tx.timestamp * 1000).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Pending';

  return (
    <View style={[styles.row, { borderBottomColor: colors.border }]}>
      <View style={[styles.icon, { backgroundColor: dirColor + '15' }]}>
        <Text style={{ color: dirColor, fontWeight: '700', fontSize: 16 }}>{dirIcon}</Text>
      </View>
      <View style={styles.info}>
        <Text style={[styles.type, { color: colors.text }]}>
          {dirLabel}
        </Text>
        <Text style={[styles.time, { color: colors.textSecondary }]}>{timeStr}</Text>
      </View>
      <View style={styles.right}>
        {tx.amount !== undefined && (
          <Text style={[styles.amount, { color: dirColor }]}>
            {isIn ? '+' : '-'}{tx.amount.toLocaleString(undefined, { maximumFractionDigits: 4 })} SOL
          </Text>
        )}
        <Text
          style={[
            styles.status,
            { color: tx.status === 'success' ? colors.success : colors.error },
          ]}
        >
          {tx.status === 'success' ? 'Success' : 'Failed'}
        </Text>
      </View>
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
  type: { fontSize: 14, fontWeight: '600' },
  time: { fontSize: 12, marginTop: 1 },
  right: { alignItems: 'flex-end' },
  amount: { fontSize: 14, fontWeight: '600' },
  status: { fontSize: 11, marginTop: 2 },
});

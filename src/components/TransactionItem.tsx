import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAppTheme } from '../hooks/useTheme';
import type { TransactionInfo } from '../types';

interface Props {
  tx: TransactionInfo;
}

export const TransactionItem: React.FC<Props> = ({ tx }) => {
  const { colors } = useAppTheme();

  const isIn = tx.direction === 'in';
  const isOut = tx.direction === 'out';
  const dirLabel = isIn ? 'Receive' : isOut ? 'Send' : 'Transaction';
  const iconName = isIn ? 'arrow-bottom-left' : isOut ? 'arrow-top-right' : 'swap-horizontal';
  const amountColor = isIn ? colors.success : colors.text;

  const timeStr = tx.timestamp
    ? new Date(tx.timestamp * 1000).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
      })
    : 'Pending';

  return (
    <View style={styles.row}>
      {/* Icon */}
      <View style={[styles.icon, { backgroundColor: colors.card }]}>
        <MaterialCommunityIcons
          name={iconName}
          size={18}
          color={colors.textSecondary}
        />
      </View>

      {/* Info */}
      <View style={styles.info}>
        <Text style={[styles.type, { color: colors.text }]}>{dirLabel}</Text>
        <Text style={[styles.time, { color: colors.textSecondary }]}>{timeStr}</Text>
      </View>

      {/* Amount */}
      <View style={styles.right}>
        {tx.amount !== undefined && (
          <Text style={[styles.amount, { color: amountColor }]}>
            {isIn ? '+' : '-'}{tx.amount.toLocaleString(undefined, { maximumFractionDigits: 4 })} SOL
          </Text>
        )}
        {tx.status === 'failed' && (
          <Text style={{ fontSize: 11, color: colors.error, marginTop: 2 }}>Failed</Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  info: { flex: 1 },
  type: { fontSize: 15, fontWeight: '600' },
  time: { fontSize: 12, marginTop: 2 },
  right: { alignItems: 'flex-end' },
  amount: { fontSize: 14, fontWeight: '600' },
});

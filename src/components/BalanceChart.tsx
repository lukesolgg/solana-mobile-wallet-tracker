// src/components/BalanceChart.tsx

import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { useAppTheme } from '../hooks/useTheme';

type TimePeriod = '24h' | '7d' | '30d' | 'all';

const CHART_WIDTH = Dimensions.get('window').width - 64;
const CHART_HEIGHT = 120;

/**
 * Generate mock wallet-balance history ending at `currentBalance`.
 * For a real app you'd pull historical snapshots from an API.
 */
function generateBalanceHistory(
  currentBalance: number,
  period: TimePeriod,
): number[] {
  const points =
    period === '24h' ? 24 : period === '7d' ? 7 : period === '30d' ? 30 : 52;

  // Walk backwards from currentBalance, adding small random drift
  const drift =
    period === '24h'
      ? 0.02
      : period === '7d'
      ? 0.05
      : period === '30d'
      ? 0.10
      : 0.25;

  const data: number[] = new Array(points);
  data[points - 1] = currentBalance;

  for (let i = points - 2; i >= 0; i--) {
    const change = data[i + 1] * drift * (Math.random() - 0.45);
    data[i] = Math.max(0, data[i + 1] - change);
  }

  return data;
}

/** Simple bar chart (no SVG dependency) */
const MiniChart: React.FC<{
  data: number[];
  color: string;
}> = ({ data, color }) => {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const barWidth = Math.max(1, (CHART_WIDTH - data.length) / data.length);

  return (
    <View style={[styles.chartArea, { height: CHART_HEIGHT }]}>
      {data.map((val, i) => {
        const heightPct = ((val - min) / range) * 100;
        return (
          <View
            key={i}
            style={{
              width: barWidth,
              height: `${Math.max(2, heightPct)}%`,
              backgroundColor: color + '60',
              borderTopLeftRadius: 1,
              borderTopRightRadius: 1,
              alignSelf: 'flex-end',
            }}
          />
        );
      })}
    </View>
  );
};

interface BalanceChartProps {
  currentBalanceUsd: number;
}

export const BalanceChart: React.FC<BalanceChartProps> = ({ currentBalanceUsd }) => {
  const { colors } = useAppTheme();
  const [period, setPeriod] = useState<TimePeriod>('7d');

  const data = useMemo(
    () => generateBalanceHistory(currentBalanceUsd, period),
    [currentBalanceUsd, period],
  );

  const firstVal = data[0];
  const lastVal = data[data.length - 1];
  const isPositive = lastVal >= firstVal;
  const pnlPct =
    firstVal > 0
      ? (((lastVal - firstVal) / firstVal) * 100).toFixed(2)
      : '0.00';
  const pnlColor = isPositive ? colors.success : colors.error;

  const periods: TimePeriod[] = ['24h', '7d', '30d', 'all'];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View>
          <Text style={[styles.label, { color: colors.textSecondary }]}>
            Wallet Balance
          </Text>
          <Text style={[styles.balanceValue, { color: colors.text }]}>
            ${lastVal.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </Text>
        </View>
        <View style={[styles.pnlBadge, { backgroundColor: pnlColor + '18' }]}>
          <Text style={[styles.pnlText, { color: pnlColor }]}>
            {isPositive ? '▲' : '▼'} {isPositive ? '+' : ''}
            {pnlPct}%
          </Text>
        </View>
      </View>

      {/* Chart */}
      <MiniChart
        data={data}
        color={isPositive ? colors.success : colors.error}
      />

      {/* Period selector */}
      <View style={styles.periodRow}>
        {periods.map((p) => (
          <TouchableOpacity
            key={p}
            style={[
              styles.periodBtn,
              period === p && { backgroundColor: colors.primary + '20' },
            ]}
            onPress={() => setPeriod(p)}
          >
            <Text
              style={[
                styles.periodText,
                {
                  color: period === p ? colors.primary : colors.textSecondary,
                  fontWeight: period === p ? '700' : '500',
                },
              ]}
            >
              {p === 'all' ? 'All' : p.toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { width: '100%' },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  label: { fontSize: 12, marginBottom: 2 },
  balanceValue: { fontSize: 22, fontWeight: '700' },
  pnlBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  pnlText: { fontSize: 13, fontWeight: '700' },
  chartArea: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 1,
    width: '100%',
    marginBottom: 12,
  },
  periodRow: {
    flexDirection: 'row',
    gap: 6,
  },
  periodBtn: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: 'center',
  },
  periodText: { fontSize: 12 },
});

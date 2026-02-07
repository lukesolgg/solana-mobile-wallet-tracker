import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { useAppTheme } from '../hooks/useTheme';

type TimePeriod = '24h' | '7d' | '30d' | 'all';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CHART_WIDTH = SCREEN_WIDTH - 64; // margins
const CHART_HEIGHT = 120;

// Generate mock data for the chart
function generateMockData(period: TimePeriod): number[] {
  const points = period === '24h' ? 24 : period === '7d' ? 7 : period === '30d' ? 30 : 52;
  const base = 170;
  const volatility = period === '24h' ? 5 : period === '7d' ? 15 : period === '30d' ? 30 : 80;
  const data: number[] = [];
  let current = base - volatility / 2;
  for (let i = 0; i < points; i++) {
    current += (Math.random() - 0.45) * (volatility / points * 4);
    current = Math.max(base - volatility, Math.min(base + volatility, current));
    data.push(current);
  }
  return data;
}

function buildPath(data: number[], width: number, height: number): string {
  if (data.length < 2) return '';
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const stepX = width / (data.length - 1);
  const padding = 4;
  const drawHeight = height - padding * 2;

  const points = data.map((val, i) => ({
    x: i * stepX,
    y: padding + drawHeight - ((val - min) / range) * drawHeight,
  }));

  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    d += ` L ${points[i].x} ${points[i].y}`;
  }
  return d;
}

// Simple SVG-less chart using View bars
const MiniChart: React.FC<{ data: number[]; color: string; isPositive: boolean }> = ({
  data,
  color,
  isPositive,
}) => {
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

export const PriceChart: React.FC = () => {
  const { colors } = useAppTheme();
  const [period, setPeriod] = useState<TimePeriod>('7d');

  const data = useMemo(() => generateMockData(period), [period]);
  const isPositive = data.length >= 2 && data[data.length - 1] >= data[0];
  const pnlPct = data.length >= 2
    ? ((data[data.length - 1] - data[0]) / data[0] * 100).toFixed(2)
    : '0.00';
  const pnlColor = isPositive ? colors.success : colors.error;

  const periods: TimePeriod[] = ['24h', '7d', '30d', 'all'];

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View>
          <Text style={[styles.priceLabel, { color: colors.textSecondary }]}>SOL Price</Text>
          <Text style={[styles.priceValue, { color: colors.text }]}>
            ${data[data.length - 1]?.toFixed(2) ?? '—'}
          </Text>
        </View>
        <View style={[styles.pnlBadge, { backgroundColor: pnlColor + '18' }]}>
          <Text style={[styles.pnlText, { color: pnlColor }]}>
            {isPositive ? '▲' : '▼'} {isPositive ? '+' : ''}{pnlPct}%
          </Text>
        </View>
      </View>

      <MiniChart data={data} color={isPositive ? colors.success : colors.error} isPositive={isPositive} />

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
  priceLabel: { fontSize: 12, marginBottom: 2 },
  priceValue: { fontSize: 22, fontWeight: '700' },
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

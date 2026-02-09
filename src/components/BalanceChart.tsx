// src/components/BalanceChart.tsx

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop } from 'react-native-svg';
import { useAppTheme } from '../hooks/useTheme';

const CHART_WIDTH = Dimensions.get('window').width - 32;
const CHART_HEIGHT = 140;

function buildPath(data: number[], width: number, height: number, closed: boolean): string {
  if (data.length < 2) return '';
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const stepX = width / (data.length - 1);
  const padding = 4;
  const usableHeight = height - padding * 2;

  let path = '';
  data.forEach((val, i) => {
    const x = i * stepX;
    const y = padding + usableHeight - ((val - min) / range) * usableHeight;
    path += i === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`;
  });

  if (closed) {
    path += ` L ${width} ${height} L 0 ${height} Z`;
  }

  return path;
}

interface BalanceChartProps {
  /** SOL balance history points (oldest → newest) */
  balanceHistory: number[];
  /** Current SOL price in USD */
  solPriceUsd: number;
}

export const BalanceChart: React.FC<BalanceChartProps> = ({
  balanceHistory,
  solPriceUsd,
}) => {
  const { colors } = useAppTheme();

  // Convert SOL balance history to USD values
  const usdHistory = useMemo(
    () => balanceHistory.map((sol) => sol * solPriceUsd),
    [balanceHistory, solPriceUsd],
  );

  // Need at least 2 points to draw
  if (usdHistory.length < 2) {
    return (
      <View style={[styles.container, styles.empty]}>
        <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
          Not enough history for chart
        </Text>
      </View>
    );
  }

  const firstVal = usdHistory[0];
  const lastVal = usdHistory[usdHistory.length - 1];
  const isPositive = lastVal >= firstVal;
  const lineColor = isPositive ? colors.success : colors.error;

  const linePath = buildPath(usdHistory, CHART_WIDTH, CHART_HEIGHT, false);
  const fillPath = buildPath(usdHistory, CHART_WIDTH, CHART_HEIGHT, true);

  return (
    <View style={styles.container}>
      <View style={{ marginHorizontal: -16 }}>
        <Svg width={CHART_WIDTH} height={CHART_HEIGHT}>
          <Defs>
            <LinearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={lineColor} stopOpacity="0.15" />
              <Stop offset="1" stopColor={lineColor} stopOpacity="0" />
            </LinearGradient>
          </Defs>
          <Path d={fillPath} fill="url(#chartGradient)" />
          <Path d={linePath} stroke={lineColor} strokeWidth={2} fill="none" />
        </Svg>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { width: '100%' },
  empty: {
    height: CHART_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAppTheme } from '../hooks/useTheme';
import type { TokenBalance } from '../types';

function getTokenColor(symbol: string): string {
  let hash = 0;
  for (let i = 0; i < symbol.length; i++) {
    hash = symbol.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 55%, 50%)`;
}

interface Props {
  token: TokenBalance;
  solPrice?: number;
  onPress?: () => void;
}

export const TokenRow: React.FC<Props> = ({ token, solPrice = 175, onPress }) => {
  const { colors } = useAppTheme();
  const iconColor = getTokenColor(token.symbol);
  const hasLogo = !!token.logoUri;

  // Use DexScreener price data if available, fallback for wSOL
  const usdValue = token.valueUsd
    ?? (token.symbol === 'wSOL' ? token.uiAmount * solPrice : undefined);

  const change = token.change24h;
  const isPositive = change !== undefined && change >= 0;
  const changeColor = change !== undefined
    ? (isPositive ? colors.success : colors.error)
    : colors.textSecondary;

  const Wrapper = onPress ? TouchableOpacity : View;
  const wrapperProps = onPress ? { onPress, activeOpacity: 0.6 } : {};

  return (
    <Wrapper style={styles.row} {...wrapperProps}>
      {/* Token Logo or Fallback */}
      <View style={styles.logoWrap}>
        {hasLogo ? (
          <Image
            source={{ uri: token.logoUri }}
            style={styles.logo}
          />
        ) : (
          <View style={[styles.iconFallback, { backgroundColor: iconColor + '20' }]}>
            <Text style={{ color: iconColor, fontWeight: '700', fontSize: 15 }}>
              {token.symbol.slice(0, 2).toUpperCase()}
            </Text>
          </View>
        )}
        {/* Unverified warning badge */}
        {!token.verified && (
          <View style={[styles.warnBadge, { backgroundColor: colors.background }]}>
            <MaterialCommunityIcons name="alert-circle" size={14} color="#F59E0B" />
          </View>
        )}
      </View>

      {/* Token Name + Amount */}
      <View style={styles.info}>
        <View style={styles.nameRow}>
          <Text style={[styles.tokenName, { color: colors.text }]} numberOfLines={1}>
            {token.name || token.symbol}
          </Text>
        </View>
        <Text style={[styles.tokenAmount, { color: colors.textSecondary }]} numberOfLines={1}>
          {token.uiAmount.toLocaleString(undefined, { maximumFractionDigits: 4 })} {token.symbol}
        </Text>
      </View>

      {/* USD Value + 24h Change */}
      <View style={styles.right}>
        {usdValue !== undefined ? (
          <Text style={[styles.usdValue, { color: colors.text }]}>
            ${usdValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </Text>
        ) : (
          <Text style={[styles.usdValue, { color: colors.textSecondary }]}>
            —
          </Text>
        )}
        {change !== undefined ? (
          <Text style={[styles.change, { color: changeColor }]}>
            {isPositive ? '+' : ''}{change.toFixed(2)}%
          </Text>
        ) : null}
      </View>
    </Wrapper>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  logoWrap: {
    width: 40,
    height: 40,
    marginRight: 12,
  },
  logo: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1E1E22',
  },
  iconFallback: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  warnBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center' },
  tokenName: { fontSize: 15, fontWeight: '600', flexShrink: 1 },
  tokenAmount: { fontSize: 12, marginTop: 2 },
  right: { alignItems: 'flex-end' },
  usdValue: { fontSize: 15, fontWeight: '600' },
  change: { fontSize: 12, marginTop: 2, fontWeight: '500' },
});

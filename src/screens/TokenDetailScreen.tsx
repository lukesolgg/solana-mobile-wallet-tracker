// src/screens/TokenDetailScreen.tsx

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  Linking,
  ActivityIndicator,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useAppTheme } from '../hooks/useTheme';
import { GlowBackground } from '../components/GlowBackground';
import { fetchTokenDetails } from '../services/solanaService';
import type { TokenMarketData } from '../services/solanaService';
import type { TokenBalance } from '../types';

function formatUsd(value: number): string {
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(2)}B`;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(2)}K`;
  return `$${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

function formatPrice(price: number): string {
  if (price >= 1) return `$${price.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  if (price >= 0.01) return `$${price.toFixed(4)}`;
  if (price >= 0.0001) return `$${price.toFixed(6)}`;
  return `$${price.toFixed(10)}`;
}

export const TokenDetailScreen: React.FC = () => {
  const { colors } = useAppTheme();
  const navigation = useNavigation();
  const route = useRoute<any>();
  const token: TokenBalance = route.params?.token;
  const solPrice: number = route.params?.solPrice ?? 0;

  const [marketData, setMarketData] = useState<TokenMarketData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token?.mint) {
      fetchTokenDetails(token.mint)
        .then(setMarketData)
        .finally(() => setLoading(false));
    }
  }, [token?.mint]);

  const change = token?.change24h;
  const isPositive = change !== undefined && change >= 0;

  return (
    <GlowBackground>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }} />
        <TouchableOpacity
          onPress={() => {
            const url = marketData?.dexUrl ?? `https://dexscreener.com/solana/${token.mint}`;
            Linking.openURL(url);
          }}
          style={styles.shareBtn}
        >
          <MaterialCommunityIcons name="open-in-new" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Token Identity */}
        <View style={styles.identitySection}>
          {token.logoUri ? (
            <Image source={{ uri: token.logoUri }} style={styles.logo} />
          ) : (
            <View style={[styles.logoFallback, { backgroundColor: colors.card }]}>
              <Text style={{ color: colors.text, fontWeight: '700', fontSize: 22 }}>
                {token.symbol.slice(0, 2).toUpperCase()}
              </Text>
            </View>
          )}
          <Text style={[styles.tokenName, { color: colors.text }]}>{token.name}</Text>
          <Text style={[styles.tokenSymbol, { color: colors.textSecondary }]}>${token.symbol}</Text>

          {!token.verified && (
            <View style={[styles.unverifiedBadge, { backgroundColor: '#F59E0B20' }]}>
              <MaterialCommunityIcons name="alert-circle" size={14} color="#F59E0B" />
              <Text style={{ color: '#F59E0B', fontSize: 12, fontWeight: '600' }}>Unverified</Text>
            </View>
          )}
        </View>

        {/* Price + Change */}
        <View style={styles.priceSection}>
          {token.priceUsd ? (
            <Text style={[styles.price, { color: colors.text }]}>
              {formatPrice(token.priceUsd)}
            </Text>
          ) : (
            <Text style={[styles.price, { color: colors.textSecondary }]}>Price unavailable</Text>
          )}
          {change !== undefined && (
            <Text style={[styles.change, { color: isPositive ? colors.success : colors.error }]}>
              {isPositive ? '+' : ''}{change.toFixed(2)}% (24h)
            </Text>
          )}
        </View>

        {/* Market Data */}
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Market Data</Text>
          {loading ? (
            <ActivityIndicator size="small" color={colors.textSecondary} style={{ padding: 16 }} />
          ) : marketData ? (
            <>
              <MarketRow label="Market Cap" value={formatUsd(marketData.marketCap)} colors={colors} />
              <MarketRow label="FDV" value={formatUsd(marketData.fdv)} colors={colors} />
              <MarketRow label="24h Volume" value={formatUsd(marketData.volume24h)} colors={colors} />
              <MarketRow label="Liquidity" value={formatUsd(marketData.liquidity)} colors={colors} />
            </>
          ) : (
            <Text style={{ color: colors.textSecondary, padding: 16, fontSize: 13 }}>
              No market data available
            </Text>
          )}
        </View>

        {/* Your Holdings */}
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Your Holdings</Text>
          <MarketRow
            label="Balance"
            value={`${token.uiAmount.toLocaleString(undefined, { maximumFractionDigits: 4 })} ${token.symbol}`}
            colors={colors}
          />
          <MarketRow
            label="Value"
            value={token.valueUsd !== undefined ? formatUsd(token.valueUsd) : '—'}
            colors={colors}
          />
        </View>

        {/* External Links */}
        <View style={styles.linksSection}>
          <TouchableOpacity
            style={[styles.linkBtn, { backgroundColor: colors.card }]}
            onPress={() => Linking.openURL(`https://dexscreener.com/solana/${token.mint}`)}
          >
            <MaterialCommunityIcons name="chart-line" size={18} color={colors.primary} />
            <Text style={[styles.linkText, { color: colors.text }]}>View on DexScreener</Text>
            <MaterialCommunityIcons name="chevron-right" size={18} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.linkBtn, { backgroundColor: colors.card }]}
            onPress={() => Linking.openURL(`https://solscan.io/token/${token.mint}`)}
          >
            <MaterialCommunityIcons name="magnify" size={18} color={colors.primary} />
            <Text style={[styles.linkText, { color: colors.text }]}>View on Solscan</Text>
            <MaterialCommunityIcons name="chevron-right" size={18} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.linkBtn, { backgroundColor: colors.card }]}
            onPress={() => Linking.openURL(`https://birdeye.so/token/${token.mint}?chain=solana`)}
          >
            <MaterialCommunityIcons name="eye-outline" size={18} color={colors.primary} />
            <Text style={[styles.linkText, { color: colors.text }]}>View on Birdeye</Text>
            <MaterialCommunityIcons name="chevron-right" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Mint Address */}
        <View style={styles.mintSection}>
          <Text style={[styles.mintLabel, { color: colors.textSecondary }]}>Contract Address</Text>
          <Text style={[styles.mintAddress, { color: colors.textSecondary }]} selectable>
            {token.mint}
          </Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </GlowBackground>
  );
};

const MarketRow: React.FC<{ label: string; value: string; colors: any }> = ({ label, value, colors }) => (
  <View style={styles.marketRow}>
    <Text style={[styles.marketLabel, { color: colors.textSecondary }]}>{label}</Text>
    <Text style={[styles.marketValue, { color: colors.text }]}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 8,
  },
  backBtn: { padding: 4 },
  shareBtn: { padding: 4 },

  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 100 },

  identitySection: {
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 8,
  },
  logo: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#1E1E22',
    marginBottom: 12,
  },
  logoFallback: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  tokenName: { fontSize: 22, fontWeight: '700' },
  tokenSymbol: { fontSize: 14, marginTop: 2 },
  unverifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 8,
  },

  priceSection: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  price: { fontSize: 34, fontWeight: '700', letterSpacing: -1 },
  change: { fontSize: 15, fontWeight: '500', marginTop: 4 },

  section: {
    marginHorizontal: 16,
    borderRadius: 14,
    marginBottom: 12,
    overflow: 'hidden',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 8,
  },

  marketRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  marketLabel: { fontSize: 14 },
  marketValue: { fontSize: 14, fontWeight: '600' },

  linksSection: {
    paddingHorizontal: 16,
    gap: 8,
    marginTop: 4,
  },
  linkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    gap: 10,
  },
  linkText: { flex: 1, fontSize: 14, fontWeight: '600' },

  mintSection: {
    paddingHorizontal: 16,
    marginTop: 16,
  },
  mintLabel: { fontSize: 12, fontWeight: '600', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  mintAddress: { fontSize: 11, lineHeight: 16 },
});

// src/screens/HomeScreen.tsx

import React, { useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import { useAppTheme } from '../hooks/useTheme';
import { useRewards } from '../hooks/useRewards';
import { GlowBackground } from '../components/GlowBackground';
import { shortenAddress } from '../utils';

interface KOLEntry {
  name: string;
  handle: string;
  address: string;
  description: string;
  avatar: string;
  color: string;
}

const KOL_HOTLIST: KOLEntry[] = [
  {
    name: 'Ansem',
    handle: '@blknoiz06',
    address: 'AVAZvHLR2PcWpDf8BXY4rVxNHYRBytycHkcB5z5QNXYm',
    description: 'Legendary $WIF trader. One of the most tracked Solana wallets.',
    avatar: '🐕',
    color: '#5B8DEF',
  },
  {
    name: 'Orangie',
    handle: '@orangie',
    address: '96sErVjEN7LNJ6Uvj63bdRWZxNuBngj56fnT9biHLKBf',
    description: 'Prominent memecoin trader. Active in the Solana trenches.',
    avatar: '🍊',
    color: '#F97316',
  },
  {
    name: 'Pow',
    handle: '@traderpow',
    address: '8zFZHuSRuDpuAR7J6FzwyF3vKNx4CVW3DFHJerQhc7Zd',
    description: 'Turned near-zero into $2.7M holding $LAUNCHCOIN through a 99% crash.',
    avatar: '💥',
    color: '#EF4444',
  },
  {
    name: 'Euris',
    handle: '@euris',
    address: 'DfMxre4cKmvogbLrPigxmibVTTQDuzjdXojWzjCXXhzj',
    description: 'Top-ranked KOL on leaderboards. Active Pump.fun trader.',
    avatar: '⚡',
    color: '#A855F7',
  },
  {
    name: 'Gake',
    handle: '@gaborsolana',
    address: 'DNfuF1L62WWyW3pNakVkyGGFzVVhj4Yr52jSmdTyeBHm',
    description: 'Well-known memecoin trader tracked by the community.',
    avatar: '🎯',
    color: '#22C55E',
  },
  {
    name: 'Hail',
    handle: '@haborsolana',
    address: 'HA1L7GhQfypSRdfBi3tCkkCVEdEcBVYqBSQCENCrwPuB',
    description: 'KOL with a custom vanity wallet. Tracked for memecoin performance.',
    avatar: '❄️',
    color: '#06B6D4',
  },
];

export const HomeScreen: React.FC = () => {
  const { colors } = useAppTheme();
  const navigation = useNavigation<any>();
  const { addPoints, isConnected, connectedWallet } = useRewards();

  const handleKOLPress = useCallback(
    (kol: KOLEntry) => {
      addPoints('kol_view', kol.name);
      navigation.navigate('Search', {
        screen: 'SearchMain',
        params: { address: kol.address, label: kol.name, ts: Date.now() },
      });
    },
    [navigation, addPoints],
  );

  return (
    <GlowBackground>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>Home</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Solana Wallet Tracker
          </Text>
        </View>

        {/* Connect Wallet Banner */}
        {!isConnected ? (
          <TouchableOpacity
            style={[styles.connectBanner, { backgroundColor: colors.primary }]}
            onPress={() => navigation.navigate('Connect')}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons name="wallet-outline" size={20} color="#FFF" />
            <Text style={styles.connectBannerText}>Connect Wallet</Text>
            <MaterialCommunityIcons name="chevron-right" size={18} color="#FFF" style={{ opacity: 0.7 }} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.connectedBanner, { backgroundColor: colors.card }]}
            onPress={() => navigation.navigate('Connect')}
            activeOpacity={0.7}
          >
            <View style={[styles.connectedDot, { backgroundColor: colors.success }]} />
            <Text style={[styles.connectedText, { color: colors.text }]}>
              {shortenAddress(connectedWallet!, 6)}
            </Text>
            <MaterialCommunityIcons name="chevron-right" size={16} color={colors.textSecondary} />
          </TouchableOpacity>
        )}

        {/* Quick Actions */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.actionCard, { backgroundColor: colors.card }]}
            onPress={() => navigation.navigate('Search')}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons name="magnify" size={24} color={colors.primary} />
            <Text style={[styles.actionText, { color: colors.text }]}>Search</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionCard, { backgroundColor: colors.card }]}
            onPress={() => navigation.navigate('Saved')}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons name="bookmark-outline" size={24} color={colors.gold} />
            <Text style={[styles.actionText, { color: colors.text }]}>Saved</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionCard, { backgroundColor: colors.card }]}
            onPress={() => navigation.navigate('Swap')}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons name="swap-horizontal" size={24} color={colors.success} />
            <Text style={[styles.actionText, { color: colors.text }]}>Swap</Text>
          </TouchableOpacity>
        </View>

        {/* Hotlist Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="fire" size={20} color="#F97316" />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Hotlist</Text>
          </View>
          <Text style={[styles.sectionDesc, { color: colors.textSecondary }]}>
            Popular KOL wallets tracked by the community
          </Text>

          {KOL_HOTLIST.map((kol) => (
            <TouchableOpacity
              key={kol.address}
              style={[styles.kolCard, { backgroundColor: colors.card }]}
              onPress={() => handleKOLPress(kol)}
              activeOpacity={0.7}
            >
              <View style={[styles.kolAvatar, { backgroundColor: kol.color + '20' }]}>
                <Text style={styles.kolAvatarEmoji}>{kol.avatar}</Text>
              </View>

              <View style={styles.kolInfo}>
                <View style={styles.kolNameRow}>
                  <Text style={[styles.kolName, { color: colors.text }]}>{kol.name}</Text>
                  <Text style={[styles.kolHandle, { color: colors.textSecondary }]}>{kol.handle}</Text>
                </View>
                <Text style={[styles.kolAddress, { color: colors.textSecondary }]}>
                  {shortenAddress(kol.address, 4)}
                </Text>
                <Text style={[styles.kolDesc, { color: colors.textSecondary }]} numberOfLines={2}>
                  {kol.description}
                </Text>
              </View>

              <MaterialCommunityIcons name="chevron-right" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </GlowBackground>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingBottom: 100 },

  header: {
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 12,
  },
  title: { fontSize: 28, fontWeight: '700' },
  subtitle: { fontSize: 14, marginTop: 2 },

  // Connect wallet banner
  connectBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
    marginBottom: 16,
  },
  connectBannerText: { color: '#FFF', fontSize: 15, fontWeight: '700' },

  // Connected wallet banner
  connectedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    gap: 8,
    marginBottom: 16,
  },
  connectedDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  connectedText: { flex: 1, fontSize: 14, fontWeight: '600' },

  // Quick Actions
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  actionCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 18,
    borderRadius: 14,
    gap: 8,
  },
  actionText: { fontSize: 12, fontWeight: '600' },

  section: {
    paddingHorizontal: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  sectionTitle: { fontSize: 18, fontWeight: '700' },
  sectionDesc: { fontSize: 13, marginBottom: 12, marginLeft: 28 },

  kolCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    marginBottom: 8,
  },
  kolAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  kolAvatarEmoji: { fontSize: 22 },
  kolInfo: { flex: 1 },
  kolNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  kolName: { fontSize: 15, fontWeight: '700' },
  kolHandle: { fontSize: 12 },
  kolAddress: { fontSize: 11, marginTop: 1 },
  kolDesc: { fontSize: 12, marginTop: 3, lineHeight: 16 },
});

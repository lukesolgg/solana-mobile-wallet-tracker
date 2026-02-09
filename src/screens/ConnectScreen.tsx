// src/screens/ConnectScreen.tsx

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Linking,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAppTheme } from '../hooks/useTheme';
import { useSolBalance } from '../hooks/useWalletData';
import { shortenAddress } from '../utils';
import { GlowBackground } from '../components/GlowBackground';
import { useRewards } from '../hooks/useRewards';

async function connectWalletMWA(): Promise<{ address: string; authToken: string } | null> {
  try {
    const { transact } =
      require('@solana-mobile/mobile-wallet-adapter-protocol-web3js');

    const result = await transact(async (wallet: any) => {
      const authResult = await wallet.authorize({
        cluster: 'mainnet-beta',
        identity: {
          name: 'Solana Wallet Tracker',
          uri: 'https://solanawallet.tracker',
          icon: 'favicon.ico',
        },
      });
      return {
        address: authResult.accounts[0].address,
        authToken: authResult.auth_token,
      };
    });

    return result;
  } catch (error: any) {
    console.warn('MWA connect error:', error);
    if (
      error.message?.includes('No wallet') ||
      error.message?.includes('not found')
    ) {
      Alert.alert(
        'No Wallet Found',
        'Please install a Solana wallet app (Phantom, Solflare) and try again.',
        [
          { text: 'Get Phantom', onPress: () => Linking.openURL('https://phantom.app/download') },
          { text: 'Cancel', style: 'cancel' },
        ],
      );
      return null;
    }
    throw error;
  }
}

async function disconnectWalletMWA(authToken: string): Promise<void> {
  try {
    const { transact } =
      require('@solana-mobile/mobile-wallet-adapter-protocol-web3js');

    await transact(async (wallet: any) => {
      await wallet.deauthorize({ auth_token: authToken });
    });
  } catch (error) {
    console.warn('MWA disconnect error:', error);
  }
}

export const ConnectScreen: React.FC = () => {
  const { colors } = useAppTheme();
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);

  const {
    addPoints,
    setConnectedWallet,
    isConnected,
    connectedWallet,
    points,
    level,
    nextLevel,
    progressToNext,
    streak,
  } = useRewards();

  const { data: balance, isLoading: balanceLoading } = useSolBalance(connectedWallet);

  const handleConnect = useCallback(async () => {
    setConnecting(true);
    try {
      const result = await connectWalletMWA();
      if (result) {
        setConnectedWallet(result.address);
        setAuthToken(result.authToken);
        addPoints('connect', 'Wallet connected');
      }
    } catch (error) {
      Alert.alert(
        'Connection Failed',
        'Unable to connect wallet. Make sure you have a compatible wallet installed.',
      );
    } finally {
      setConnecting(false);
    }
  }, [addPoints, setConnectedWallet]);

  const handleDisconnect = useCallback(async () => {
    if (authToken) {
      await disconnectWalletMWA(authToken);
    }
    setConnectedWallet(null);
    setAuthToken(null);
  }, [authToken, setConnectedWallet]);

  const handleDeepLinkSeeker = () => {
    const seekerUrl = 'solana-wallet://';
    Linking.canOpenURL(seekerUrl)
      .then((supported) => {
        if (supported) {
          Linking.openURL(seekerUrl);
        } else {
          Linking.openURL('https://solanamobile.com');
        }
      })
      .catch(() => Linking.openURL('https://solanamobile.com'));
  };

  // XP display — show current XP / next level XP
  const currentXP = points;
  const nextLevelXP = nextLevel ? nextLevel.minPoints : level.minPoints;
  const xpLabel = nextLevel ? `${currentXP} / ${nextLevelXP} XP` : `${currentXP} XP (Max Level)`;

  return (
    <GlowBackground>
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.title, { color: colors.text }]}>Connect</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        Connect your Solana wallet via Mobile Wallet Adapter.
      </Text>

      {/* Connection Card */}
      <View style={[styles.card, { backgroundColor: colors.card }]}>
        {isConnected && connectedWallet ? (
          <>
            <View style={[styles.connectedBadge, { backgroundColor: colors.success + '20' }]}>
              <Text style={{ color: colors.success, fontWeight: '600', fontSize: 13 }}>Connected</Text>
            </View>

            <Text style={[styles.addressText, { color: colors.text }]}>
              {shortenAddress(connectedWallet, 8)}
            </Text>

            <View style={styles.balanceContainer}>
              {balanceLoading ? (
                <ActivityIndicator size="small" color={colors.text} />
              ) : (
                <Text style={[styles.balanceText, { color: colors.text }]}>
                  {balance !== undefined
                    ? `${balance.toLocaleString(undefined, { maximumFractionDigits: 4 })} SOL`
                    : 'Balance unavailable'}
                </Text>
              )}
            </View>

            <TouchableOpacity
              style={[styles.disconnectBtn, { backgroundColor: colors.error + '15' }]}
              onPress={handleDisconnect}
            >
              <Text style={{ color: colors.error, fontWeight: '600' }}>Disconnect</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <MaterialCommunityIcons name="wallet-outline" size={40} color={colors.textSecondary} style={{ marginBottom: 12 }} />
            <Text style={[styles.cardDesc, { color: colors.textSecondary }]}>
              Supports Phantom, Solflare, and other MWA-compatible wallets.
            </Text>

            <TouchableOpacity
              style={[styles.connectBtn, { backgroundColor: colors.primary }]}
              onPress={handleConnect}
              disabled={connecting}
            >
              {connecting ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <Text style={styles.connectBtnText}>Connect Wallet</Text>
              )}
            </TouchableOpacity>

            {Platform.OS === 'android' && (
              <TouchableOpacity
                style={[styles.seekerBtn, { borderColor: colors.border }]}
                onPress={handleDeepLinkSeeker}
              >
                <Text style={{ color: colors.text, fontWeight: '600' }}>
                  Open Seeker / Saga Wallet
                </Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </View>

      {/* Rewards Section — only visible when connected */}
      {isConnected && (
        <>
          <View style={styles.rewardsSectionHeader}>
            <MaterialCommunityIcons name="star-circle" size={20} color={colors.gold} />
            <Text style={[styles.rewardsSectionTitle, { color: colors.text }]}>Rewards</Text>
          </View>

          <View style={[styles.rewardsCard, { backgroundColor: colors.card }]}>
            {/* Level + Icon */}
            <View style={styles.levelRow}>
              <Text style={{ fontSize: 32 }}>{level.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.levelName, { color: colors.text }]}>{level.name}</Text>
                <Text style={[styles.xpText, { color: colors.textSecondary }]}>
                  {xpLabel}{streak > 1 ? `  ${streak} day streak` : ''}
                </Text>
              </View>
            </View>

            {/* XP Progress Bar */}
            <View style={[styles.xpBarBg, { backgroundColor: colors.background }]}>
              <View
                style={[
                  styles.xpBarFill,
                  {
                    backgroundColor: colors.gold,
                    width: `${Math.max(progressToNext * 100, 2)}%`,
                  },
                ]}
              />
            </View>

            {/* Next level hint */}
            {nextLevel && (
              <Text style={[styles.nextLevelHint, { color: colors.textSecondary }]}>
                {nextLevel.minPoints - points} XP to {nextLevel.name}
              </Text>
            )}
            {!nextLevel && (
              <Text style={[styles.nextLevelHint, { color: colors.gold }]}>
                Max level reached!
              </Text>
            )}
          </View>

          {/* Tip */}
          <View style={[styles.tipCard, { backgroundColor: colors.card }]}>
            <MaterialCommunityIcons name="lightbulb-outline" size={16} color={colors.textSecondary} />
            <Text style={[styles.tipText, { color: colors.textSecondary }]}>
              Use the app to earn XP and level up. The more you explore, the faster you climb!
            </Text>
          </View>
        </>
      )}

      {/* Security Note */}
      <View style={[styles.securityNote, { backgroundColor: colors.card }]}>
        <MaterialCommunityIcons name="shield-lock-outline" size={18} color={colors.textSecondary} />
        <Text style={[styles.securityText, { color: colors.textSecondary }]}>
          This app never accesses or stores private keys. All data is fetched via public,
          read-only RPC calls.
        </Text>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
    </GlowBackground>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 16, paddingTop: 48 },
  title: { fontSize: 28, fontWeight: '700', marginBottom: 4 },
  subtitle: { fontSize: 14, lineHeight: 20, marginBottom: 16 },
  card: {
    borderRadius: 14,
    padding: 24,
    marginBottom: 24,
    alignItems: 'center',
  },
  connectedBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 16,
  },
  addressText: { fontSize: 16, fontWeight: '600', marginBottom: 12 },
  balanceContainer: { marginBottom: 16 },
  balanceText: { fontSize: 28, fontWeight: '700' },
  disconnectBtn: {
    width: '100%',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  cardDesc: { fontSize: 14, textAlign: 'center', marginBottom: 20, lineHeight: 20 },
  connectBtn: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  connectBtnText: { color: '#FFF', fontWeight: '700', fontSize: 16 },
  seekerBtn: {
    width: '100%',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
    borderWidth: 1,
  },

  // Rewards section
  rewardsSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  rewardsSectionTitle: { fontSize: 18, fontWeight: '700' },
  rewardsCard: {
    borderRadius: 14,
    padding: 18,
    marginBottom: 12,
  },
  levelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 14,
  },
  levelName: { fontSize: 18, fontWeight: '700' },
  xpText: { fontSize: 13, marginTop: 2 },
  xpBarBg: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 10,
  },
  xpBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  nextLevelHint: { fontSize: 12, textAlign: 'center' },

  tipCard: {
    flexDirection: 'row',
    padding: 14,
    borderRadius: 12,
    marginBottom: 16,
    gap: 10,
    alignItems: 'flex-start',
  },
  tipText: { flex: 1, fontSize: 12, lineHeight: 18 },

  securityNote: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
    gap: 12,
    alignItems: 'flex-start',
  },
  securityText: { flex: 1, fontSize: 12, lineHeight: 18 },
});

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
import { useAppTheme } from '../hooks/useTheme';
import { useSolBalance } from '../hooks/useWalletData';
import { shortenAddress } from '../utils';

// ---------------------------------------------------------------------------
// MWA Integration
// ---------------------------------------------------------------------------
// In production, import from:
// import { transact } from '@solana-mobile/mobile-wallet-adapter-protocol-web3js';
// import { PublicKey } from '@solana/web3.js';
//
// The code below wraps MWA calls with graceful fallbacks for environments
// where the adapter is not available (e.g., iOS simulator).

async function connectWalletMWA(): Promise<{ address: string; authToken: string } | null> {
  try {
    // Dynamic import to prevent crashes on unsupported platforms
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
    // If MWA not available, show a helpful message
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

// ---------------------------------------------------------------------------
// Docs Links
// ---------------------------------------------------------------------------

const DOCS_LINKS = [
  {
    title: 'Solana Web3.js Guide',
    url: 'https://solana.com/docs/clients/javascript',
    icon: '📘',
  },
  {
    title: 'Mobile Wallet Adapter',
    url: 'https://docs.solanamobile.com/getting-started/overview',
    icon: '📱',
  },
  {
    title: 'NFT Standards (Metaplex)',
    url: 'https://developers.metaplex.com/',
    icon: '🎨',
  },
  {
    title: 'Digital Asset Standard API',
    url: 'https://developers.metaplex.com/das-api',
    icon: '🔗',
  },
  {
    title: 'How to Track Addresses Safely',
    url: 'https://solana.com/docs',
    icon: '🔒',
    description: 'This app uses read-only RPC calls — no private keys needed.',
  },
  {
    title: 'Seeker / Saga Integration',
    url: 'https://solanamobile.com',
    icon: '📲',
  },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const ConnectScreen: React.FC = () => {
  const { colors } = useAppTheme();
  const [connectedAddress, setConnectedAddress] = useState<string | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);

  const { data: balance, isLoading: balanceLoading } = useSolBalance(connectedAddress);

  const handleConnect = useCallback(async () => {
    setConnecting(true);
    try {
      const result = await connectWalletMWA();
      if (result) {
        setConnectedAddress(result.address);
        setAuthToken(result.authToken);
      }
    } catch (error) {
      Alert.alert(
        'Connection Failed',
        'Unable to connect wallet. Make sure you have a compatible wallet installed.',
      );
    } finally {
      setConnecting(false);
    }
  }, []);

  const handleDisconnect = useCallback(async () => {
    if (authToken) {
      await disconnectWalletMWA(authToken);
    }
    setConnectedAddress(null);
    setAuthToken(null);
  }, [authToken]);

  const handleDeepLinkSeeker = () => {
    // Deep-link to Seeker/Saga wallet if installed
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

  return (
    <ScrollView
      style={[styles.screen, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
    >
      <Text style={[styles.title, { color: colors.text }]}>Connect Wallet</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        Connect your Solana wallet via Mobile Wallet Adapter to view your own portfolio.
      </Text>

      {/* Connection Card */}
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {connectedAddress ? (
          <>
            <View style={[styles.connectedBadge, { backgroundColor: colors.success + '20' }]}>
              <Text style={{ color: colors.success, fontWeight: '600' }}>● Connected</Text>
            </View>

            <Text style={[styles.addressLabel, { color: colors.textSecondary }]}>Address</Text>
            <Text style={[styles.addressText, { color: colors.text }]}>
              {shortenAddress(connectedAddress, 8)}
            </Text>

            <View style={styles.balanceContainer}>
              {balanceLoading ? (
                <ActivityIndicator size="small" color={colors.primary} />
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
            <Text style={{ fontSize: 40, textAlign: 'center', marginBottom: 12 }}>👛</Text>
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
                style={[styles.seekerBtn, { borderColor: colors.accent }]}
                onPress={handleDeepLinkSeeker}
              >
                <Text style={{ color: colors.accent, fontWeight: '600' }}>
                  Open Seeker / Saga Wallet
                </Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </View>

      {/* Documentation Links */}
      <Text style={[styles.docsTitle, { color: colors.text }]}>Resources & Documentation</Text>

      {DOCS_LINKS.map((link) => (
        <TouchableOpacity
          key={link.url}
          style={[styles.linkCard, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => Linking.openURL(link.url)}
          activeOpacity={0.7}
        >
          <Text style={styles.linkIcon}>{link.icon}</Text>
          <View style={styles.linkInfo}>
            <Text style={[styles.linkTitle, { color: colors.text }]}>{link.title}</Text>
            {link.description && (
              <Text style={[styles.linkDesc, { color: colors.textSecondary }]}>
                {link.description}
              </Text>
            )}
          </View>
          <Text style={{ color: colors.textSecondary, fontSize: 16 }}>›</Text>
        </TouchableOpacity>
      ))}

      {/* Security Note */}
      <View style={[styles.securityNote, { backgroundColor: colors.accent + '10' }]}>
        <Text style={{ fontSize: 16 }}>🔒</Text>
        <Text style={[styles.securityText, { color: colors.textSecondary }]}>
          This app never accesses or stores private keys. All data is fetched via public,
          read-only RPC calls. Your wallet authorization is handled securely through the
          Mobile Wallet Adapter protocol.
        </Text>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 16, paddingTop: 8 },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 4 },
  subtitle: { fontSize: 14, lineHeight: 20, marginBottom: 16 },
  card: {
    borderRadius: 16,
    borderWidth: 1,
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
  addressLabel: { fontSize: 12, marginBottom: 2 },
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
    borderWidth: 1.5,
  },
  docsTitle: { fontSize: 18, fontWeight: '700', marginBottom: 12 },
  linkCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  linkIcon: { fontSize: 22, marginRight: 12 },
  linkInfo: { flex: 1 },
  linkTitle: { fontSize: 14, fontWeight: '600' },
  linkDesc: { fontSize: 12, marginTop: 2 },
  securityNote: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
    gap: 12,
    alignItems: 'flex-start',
  },
  securityText: { flex: 1, fontSize: 12, lineHeight: 18 },
});

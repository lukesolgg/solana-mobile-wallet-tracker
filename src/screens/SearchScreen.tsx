// src/screens/SearchScreen.tsx

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Keyboard,
  Modal,
  Image,
  Clipboard,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useAppTheme } from '../hooks/useTheme';
import { useWalletData } from '../hooks/useWalletData';
import { useSavedAddresses } from '../hooks/useSavedAddresses';
import { isValidSolanaAddress, shortenAddress, isDomainName, resolveDomain } from '../utils';
import { TokenRow } from '../components/TokenRow';
import { NFTGrid } from '../components/NFTGrid';
import { TransactionItem } from '../components/TransactionItem';
import { ErrorMessage } from '../components/ErrorMessage';
import { GlowBackground } from '../components/GlowBackground';
import { BalanceChart } from '../components/BalanceChart';
import { useRewards } from '../hooks/useRewards';

type DataTab = 'tokens' | 'nfts' | 'history';

// SOL_PRICE_USD is no longer hardcoded — it comes from data.solPriceUsd

export const SearchScreen: React.FC = () => {
  const { colors } = useAppTheme();
  const navigation = useNavigation<any>();
  const [inputAddress, setInputAddress] = useState('');
  const [searchAddress, setSearchAddress] = useState<string | null>(null);
  const [inputError, setInputError] = useState('');
  const [resolving, setResolving] = useState(false);
  const [activeTab, setActiveTab] = useState<DataTab>('tokens');
  const [showAllTokens, setShowAllTokens] = useState(false);
  const [walletLabel, setWalletLabel] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Save modal state
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveLabel, setSaveLabel] = useState('');

  const route = useRoute<any>();

  const { data, isLoading, error, refetch } = useWalletData(searchAddress);
  const { add: saveAddress, remove: removeAddress, isSaved, addresses, getLabel } = useSavedAddresses();
  const { addPoints } = useRewards();

  // Handle incoming navigation params from HomeScreen KOL taps
  useEffect(() => {
    if (route.params?.address) {
      const addr = route.params.address;
      if (isValidSolanaAddress(addr)) {
        setSearchAddress(addr);
        setInputAddress(addr);
        setInputError('');
        setActiveTab('tokens');
        setShowAllTokens(false);
        setWalletLabel(route.params?.label ?? null);
      }
    }
  }, [route.params?.ts]);

  const handleSearch = useCallback(async () => {
    Keyboard.dismiss();
    const trimmed = inputAddress.trim();
    if (!trimmed) {
      setInputError('Please enter a wallet address');
      return;
    }

    // Check if input is a .sol or .skr domain
    if (isDomainName(trimmed)) {
      setResolving(true);
      setInputError('');
      try {
        const resolved = await resolveDomain(trimmed);
        console.log('[Search] Domain resolved:', trimmed, '->', JSON.stringify(resolved));
        if (resolved && isValidSolanaAddress(resolved)) {
          setSearchAddress(resolved);
          setActiveTab('tokens');
          addPoints('search', `Resolved ${trimmed}`);
        } else if (resolved) {
          setInputError(`Resolved to invalid address: ${resolved.slice(0, 12)}...`);
        } else {
          setInputError(`Could not resolve "${trimmed}"`);
        }
      } catch {
        setInputError(`Failed to resolve "${trimmed}"`);
      } finally {
        setResolving(false);
      }
      return;
    }

    if (!isValidSolanaAddress(trimmed)) {
      setInputError('Invalid Solana address or domain name');
      return;
    }
    setInputError('');
    setSearchAddress(trimmed);
    setActiveTab('tokens');
    setShowAllTokens(false);
    setWalletLabel(null);
    addPoints('search', 'Searched wallet');
  }, [inputAddress, addPoints]);

  const handleBack = useCallback(() => {
    setSearchAddress(null);
    setInputAddress('');
    setInputError('');
    setActiveTab('tokens');
    setShowAllTokens(false);
    setWalletLabel(null);
  }, []);

  const handleSavePress = useCallback(() => {
    if (!searchAddress) return;
    if (isSaved(searchAddress)) {
      const saved = addresses.find((a) => a.address === searchAddress);
      if (saved) removeAddress(saved.id);
      return;
    }
    setSaveLabel(`Wallet ${shortenAddress(searchAddress)}`);
    setShowSaveModal(true);
  }, [searchAddress, isSaved, addresses, removeAddress]);

  const handleSaveConfirm = useCallback(() => {
    if (!searchAddress) return;
    saveAddress(searchAddress, saveLabel.trim() || undefined);
    addPoints('save', 'Saved wallet');
    setShowSaveModal(false);
    setSaveLabel('');
  }, [searchAddress, saveLabel, saveAddress, addPoints]);

  const handleCopyAddress = useCallback(() => {
    if (!searchAddress) return;
    Clipboard.setString(searchAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [searchAddress]);

  // Real total portfolio value (SOL + all tokens with prices)
  const totalValueUsd = data?.totalValueUsd ?? 0;
  const solPriceUsd = data?.solPriceUsd ?? 0;

  // Calculate real PNL from balance history
  const balanceHistory = data?.balanceHistory ?? [];
  const historyStart = balanceHistory.length > 1 ? balanceHistory[0] * solPriceUsd : 0;
  const historyEnd = balanceHistory.length > 1 ? balanceHistory[balanceHistory.length - 1] * solPriceUsd : 0;
  const pnlUsd = historyEnd - historyStart;
  const pnlPercent = historyStart > 0 ? ((historyEnd - historyStart) / historyStart) * 100 : 0;
  const isPositive = pnlPercent >= 0;

  return (
    <GlowBackground>
      {/* Header */}
      <View style={styles.header}>
        {searchAddress ? (
          <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
            <MaterialCommunityIcons name="arrow-left" size={24} color={colors.text} />
          </TouchableOpacity>
        ) : (
          <View style={styles.headerTitle}>
            <Text style={[styles.title, { color: colors.text }]}>Search</Text>
          </View>
        )}

        {searchAddress && data && (
          <TouchableOpacity onPress={handleSavePress} style={styles.bookmarkBtn}>
            <MaterialCommunityIcons
              name={isSaved(data.address) ? 'bookmark' : 'bookmark-outline'}
              size={22}
              color={isSaved(data.address) ? colors.gold : colors.textSecondary}
            />
          </TouchableOpacity>
        )}
      </View>

      {/* Search Bar */}
      {!searchAddress && (
        <View style={styles.searchSection}>
          <View style={[styles.searchBar, { backgroundColor: colors.card }]}>
            <MaterialCommunityIcons name="magnify" size={20} color={colors.textSecondary} style={{ marginRight: 8 }} />
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder="Address or .sol / .skr domain..."
              placeholderTextColor={colors.textSecondary}
              value={inputAddress}
              onChangeText={(t) => {
                setInputAddress(t);
                if (inputError) setInputError('');
              }}
              onSubmitEditing={handleSearch}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
            />
          </View>
          {resolving && (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 8 }}>
              <ActivityIndicator size="small" color={colors.textSecondary} />
              <Text style={{ color: colors.textSecondary, fontSize: 13 }}>Resolving domain...</Text>
            </View>
          )}
          {!!inputError && (
            <Text style={[styles.errorText, { color: colors.error }]}>{inputError}</Text>
          )}
        </View>
      )}

      {/* Content */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        overScrollMode="never"
        bounces={false}
        refreshControl={
          <RefreshControl
            refreshing={isLoading && !!searchAddress}
            onRefresh={() => refetch()}
            tintColor={colors.primary}
          />
        }
      >
        {/* Empty state */}
        {!searchAddress && !isLoading && (
          <View style={styles.placeholder}>
            <MaterialCommunityIcons name="wallet-outline" size={48} color={colors.textSecondary} />
            <Text style={[styles.placeholderText, { color: colors.textSecondary }]}>
              Enter a Solana wallet address to view balances, tokens, and history.
            </Text>
          </View>
        )}

        {isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.text} />
          </View>
        )}

        {error && !isLoading && (
          <ErrorMessage
            message="Failed to load wallet data. Check the address or try again."
            onRetry={() => refetch()}
          />
        )}

        {data && !isLoading && (
          <>
            {/* Hero: Address + Balance */}
            <View style={styles.heroSection}>
              {/* KOL name or saved label */}
              {(walletLabel || (isSaved(data.address) && getLabel(data.address))) && (
                <Text style={[styles.heroName, { color: colors.text }]}>
                  {walletLabel || getLabel(data.address)}
                </Text>
              )}
              <View style={styles.addressRow}>
                <Text style={[styles.heroAddress, { color: colors.textSecondary }]}>
                  {shortenAddress(data.address, 6)}
                </Text>
                <TouchableOpacity onPress={handleCopyAddress} style={styles.copyBtn}>
                  <MaterialCommunityIcons
                    name={copied ? 'check' : 'content-copy'}
                    size={14}
                    color={copied ? colors.success : colors.textSecondary}
                  />
                </TouchableOpacity>
              </View>

              <Text style={[styles.heroBalance, { color: colors.text }]}>
                ${totalValueUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </Text>

              {balanceHistory.length > 1 && (
                <Text style={[styles.heroPnl, { color: isPositive ? colors.success : colors.error }]}>
                  {isPositive ? '+' : ''}{pnlPercent.toFixed(1)}% (${Math.abs(pnlUsd).toLocaleString(undefined, { maximumFractionDigits: 2 })})
                </Text>
              )}

              <Text style={[styles.heroSol, { color: colors.textSecondary }]}>
                {data.solBalance.toLocaleString(undefined, { maximumFractionDigits: 4 })} SOL
              </Text>
            </View>

            {/* Chart */}
            <View style={styles.chartSection}>
              <BalanceChart
                balanceHistory={data.balanceHistory ?? []}
                solPriceUsd={data.solPriceUsd ?? 0}
              />
            </View>

            {/* Tab Bar */}
            <View style={[styles.tabBar, { borderBottomColor: colors.border }]}>
              {(['tokens', 'nfts', 'history'] as DataTab[]).map((tab) => (
                <TouchableOpacity
                  key={tab}
                  style={[
                    styles.tab,
                    activeTab === tab && { borderBottomColor: colors.text },
                  ]}
                  onPress={() => setActiveTab(tab)}
                >
                  <Text
                    style={[
                      styles.tabText,
                      {
                        color: activeTab === tab ? colors.text : colors.textSecondary,
                        fontWeight: activeTab === tab ? '600' : '400',
                      },
                    ]}
                  >
                    {tab === 'tokens' ? 'Tokens' : tab === 'nfts' ? 'NFTs' : 'History'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Tab Content */}
            {activeTab === 'tokens' && (
              <View>
                {data.tokens.length === 0 && (!data.stakedTokens || data.stakedTokens.length === 0) ? (
                  <Text style={[styles.emptyTab, { color: colors.textSecondary }]}>No tokens found</Text>
                ) : (
                  <>
                    {(showAllTokens ? data.tokens : data.tokens.slice(0, 10)).map((token) => (
                      <TokenRow
                        key={token.mint}
                        token={token}
                        solPrice={solPriceUsd}
                        onPress={() => {
                          addPoints('token_detail', token.symbol);
                          navigation.navigate('TokenDetail', { token, solPrice: solPriceUsd });
                        }}
                      />
                    ))}
                    {!showAllTokens && data.tokens.length > 10 && (
                      <TouchableOpacity
                        style={styles.loadMoreBtn}
                        onPress={() => setShowAllTokens(true)}
                        activeOpacity={0.7}
                      >
                        <MaterialCommunityIcons name="chevron-down" size={18} color={colors.primary} />
                        <Text style={[styles.loadMoreText, { color: colors.primary }]}>
                          Show all {data.tokens.length} tokens
                        </Text>
                      </TouchableOpacity>
                    )}
                  </>
                )}

                {/* Staked tokens section — below regular tokens */}
                {data.stakedTokens && data.stakedTokens.length > 0 && (
                  <View style={styles.stakedSection}>
                    <View style={[styles.stakedDivider, { backgroundColor: colors.border }]} />
                    <View style={styles.stakedHeader}>
                      <MaterialCommunityIcons name="lock-outline" size={16} color={colors.textSecondary} />
                      <Text style={[styles.stakedTitle, { color: colors.textSecondary }]}>Staked</Text>
                    </View>
                    {data.stakedTokens.map((st) => (
                      <View key={st.symbol} style={styles.stakedRow}>
                        {st.logoUri ? (
                          <Image source={{ uri: st.logoUri }} style={styles.stakedLogo} />
                        ) : (
                          <View style={[styles.stakedLogoFallback, { backgroundColor: '#5B8DEF20' }]}>
                            <Text style={{ color: '#5B8DEF', fontWeight: '700', fontSize: 13 }}>{st.symbol.slice(0, 2)}</Text>
                          </View>
                        )}
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.stakedName, { color: colors.text }]}>{st.name}</Text>
                          <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 2 }}>
                            {st.stakedAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })} {st.symbol}
                          </Text>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                          {st.valueUsd !== undefined ? (
                            <Text style={[styles.stakedValue, { color: colors.text }]}>
                              ${st.valueUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                            </Text>
                          ) : (
                            <Text style={[styles.stakedValue, { color: colors.textSecondary }]}>—</Text>
                          )}
                          <MaterialCommunityIcons name="lock" size={12} color={colors.textSecondary} style={{ marginTop: 2 }} />
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}

            {activeTab === 'nfts' && (
              <NFTGrid nfts={data.nfts} />
            )}

            {activeTab === 'history' && (
              <View>
                {data.transactions.length === 0 ? (
                  <Text style={[styles.emptyTab, { color: colors.textSecondary }]}>No transactions found</Text>
                ) : (
                  data.transactions.map((tx) => (
                    <TransactionItem key={tx.signature} tx={tx} />
                  ))
                )}
              </View>
            )}

            <View style={{ height: 40 }} />
          </>
        )}
      </ScrollView>

      {/* Save Naming Modal */}
      <Modal visible={showSaveModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modal, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Name this wallet</Text>
            <TextInput
              style={[
                styles.modalInput,
                {
                  backgroundColor: colors.background,
                  color: colors.text,
                  borderColor: colors.border,
                },
              ]}
              placeholder="e.g. My Portfolio, Whale Watch..."
              placeholderTextColor={colors.textSecondary}
              value={saveLabel}
              onChangeText={setSaveLabel}
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: colors.background }]}
                onPress={() => setShowSaveModal(false)}
              >
                <Text style={{ color: colors.textSecondary, fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: colors.primary }]}
                onPress={handleSaveConfirm}
              >
                <Text style={{ color: '#FFF', fontWeight: '600' }}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </GlowBackground>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 8,
  },
  headerTitle: { flex: 1 },
  title: { fontSize: 28, fontWeight: '700' },
  backBtn: { padding: 4 },
  bookmarkBtn: { padding: 4 },

  searchSection: { paddingHorizontal: 16, paddingBottom: 8 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  input: { flex: 1, fontSize: 14, height: 44 },
  errorText: { fontSize: 12, marginTop: 6, marginLeft: 4 },

  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 100 },

  placeholder: { alignItems: 'center', paddingTop: 100, paddingHorizontal: 40 },
  placeholderText: { fontSize: 14, textAlign: 'center', marginTop: 16, lineHeight: 22 },

  loadingContainer: { alignItems: 'center', paddingTop: 100 },

  heroSection: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 },
  heroName: { fontSize: 20, fontWeight: '700', marginBottom: 2 },
  addressRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  heroAddress: { fontSize: 13 },
  copyBtn: { padding: 4 },
  loadMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 6,
  },
  loadMoreText: { fontSize: 14, fontWeight: '600' },
  heroBalance: { fontSize: 38, fontWeight: '700', letterSpacing: -1 },
  heroPnl: { fontSize: 14, fontWeight: '500', marginTop: 2 },
  heroSol: { fontSize: 13, marginTop: 4 },

  chartSection: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 8 },

  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginTop: 16,
    gap: 24,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tab: {
    paddingVertical: 10,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    marginBottom: -StyleSheet.hairlineWidth,
  },
  tabText: { fontSize: 15 },

  emptyTab: { padding: 24, textAlign: 'center', fontSize: 14 },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modal: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 16 },
  modalInput: {
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 14,
    marginBottom: 16,
  },
  modalButtons: { flexDirection: 'row', gap: 12 },
  modalBtn: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Staked tokens section
  stakedSection: { marginBottom: 4 },
  stakedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  stakedTitle: { fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  stakedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  stakedLogo: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 12,
    backgroundColor: '#1E1E22',
  },
  stakedLogoFallback: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stakedName: { fontSize: 14, fontWeight: '600' },
  stakedValue: { fontSize: 14, fontWeight: '600' },
  stakedDivider: { height: 1, marginHorizontal: 16, marginTop: 4 },
});

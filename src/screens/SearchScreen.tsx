// src/screens/SearchScreen.tsx

import React, { useState, useCallback } from 'react';
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
} from 'react-native';
import { useAppTheme } from '../hooks/useTheme';
import { useWalletData } from '../hooks/useWalletData';
import { useSavedAddresses } from '../hooks/useSavedAddresses';
import { isValidSolanaAddress, shortenAddress } from '../utils';
import { TokenRow } from '../components/TokenRow';
import { NFTGrid } from '../components/NFTGrid';
import { TransactionItem } from '../components/TransactionItem';
import { ErrorMessage } from '../components/ErrorMessage';
import { GlowBackground } from '../components/GlowBackground';
import { BalanceChart } from '../components/BalanceChart';

type DataTab = 'tokens' | 'nfts' | 'transactions';

const SOL_PRICE_USD = 175; // Placeholder — replace with live API later

export const SearchScreen: React.FC = () => {
  const { colors, isDark, toggle } = useAppTheme();
  const [inputAddress, setInputAddress] = useState('');
  const [searchAddress, setSearchAddress] = useState<string | null>(null);
  const [inputError, setInputError] = useState('');
  const [activeTab, setActiveTab] = useState<DataTab>('tokens');

  // Save modal state
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveLabel, setSaveLabel] = useState('');

  const { data, isLoading, error, refetch } = useWalletData(searchAddress);
  const { add: saveAddress, remove: removeAddress, isSaved, addresses, getLabel } = useSavedAddresses();

  const handleSearch = useCallback(() => {
    Keyboard.dismiss();
    const trimmed = inputAddress.trim();
    if (!trimmed) {
      setInputError('Please enter a wallet address');
      return;
    }
    if (!isValidSolanaAddress(trimmed)) {
      setInputError('Invalid Solana address. Check the format and try again.');
      return;
    }
    setInputError('');
    setSearchAddress(trimmed);
    setActiveTab('tokens');
  }, [inputAddress]);

  const handleBack = useCallback(() => {
    setSearchAddress(null);
    setInputAddress('');
    setInputError('');
    setActiveTab('tokens');
  }, []);

  const handleSavePress = useCallback(() => {
    if (!searchAddress) return;
    if (isSaved(searchAddress)) {
      // Remove it
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
    setShowSaveModal(false);
    setSaveLabel('');
  }, [searchAddress, saveLabel, saveAddress]);

  const usdBalance = data ? data.solBalance * SOL_PRICE_USD : 0;

  return (
    <GlowBackground>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface + 'CC' }]}>
        {searchAddress ? (
          <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
            <Text style={{ color: colors.primary, fontSize: 16, fontWeight: '600' }}>← Back</Text>
          </TouchableOpacity>
        ) : (
          <Text style={[styles.title, { color: colors.text }]}>Solana Wallet Tracker</Text>
        )}
        <TouchableOpacity onPress={toggle} style={styles.themeBtn}>
          <Text style={{ fontSize: 20 }}>{isDark ? '☀️' : '🌙'}</Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar - only show when no results */}
      {!searchAddress && (
        <>
          <View style={[styles.searchContainer, { backgroundColor: 'transparent' }]}>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.card + 'CC',
                  color: colors.text,
                  borderColor: inputError ? colors.error : colors.border + '80',
                },
              ]}
              placeholder="Enter Solana wallet address..."
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
            <TouchableOpacity
              style={[styles.searchBtn, { backgroundColor: colors.primary }]}
              onPress={handleSearch}
            >
              <Text style={styles.searchBtnText}>Search</Text>
            </TouchableOpacity>
          </View>
          {!!inputError && (
            <Text style={[styles.errorText, { color: colors.error }]}>{inputError}</Text>
          )}
        </>
      )}

      {/* Results */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        overScrollMode="never"
        bounces={false}
        nestedScrollEnabled
        refreshControl={
          <RefreshControl
            refreshing={isLoading && !!searchAddress}
            onRefresh={() => refetch()}
            tintColor={colors.primary}
          />
        }
      >
        {!searchAddress && !isLoading && (
          <View style={styles.placeholder}>
            <Text style={{ fontSize: 48 }}>🔍</Text>
            <Text style={[styles.placeholderText, { color: colors.textSecondary }]}>
              Enter a Solana wallet address to view balances, tokens, NFTs, and transactions.
            </Text>
          </View>
        )}

        {isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
              Fetching wallet data...
            </Text>
          </View>
        )}

        {error && !isLoading && (
          <ErrorMessage
            message={
              (error as Error).message?.includes('fetch')
                ? 'Network error. Check your connection and try again.'
                : 'Failed to load wallet data. The address may be invalid or the RPC may be busy.'
            }
            onRetry={() => refetch()}
          />
        )}

        {data && !isLoading && (
          <>
            {/* Address bar + Save */}
            <View style={[styles.glassCard, { backgroundColor: colors.card + 'AA', borderColor: colors.border + '60' }]}>
              <View style={{ flex: 1, marginRight: 10 }}>
                {isSaved(data.address) && getLabel(data.address) ? (
                  <>
                    <Text style={[styles.walletName, { color: colors.text }]} numberOfLines={1}>
                      {getLabel(data.address)}
                    </Text>
                    <Text style={[styles.addressSubtext, { color: colors.textSecondary }]} numberOfLines={1}>
                      {shortenAddress(data.address, 4)}
                    </Text>
                  </>
                ) : (
                  <Text style={[styles.addressText, { color: colors.text }]} numberOfLines={1}>
                    {shortenAddress(data.address, 8)}
                  </Text>
                )}
              </View>
              <TouchableOpacity
                style={[
                  styles.saveBtn,
                  {
                    backgroundColor: isSaved(data.address)
                      ? '#FFD70020'
                      : colors.primary + '25',
                  },
                ]}
                onPress={handleSavePress}
              >
                <Text
                  style={{
                    color: isSaved(data.address) ? '#FFD700' : colors.primary,
                    fontWeight: '600',
                    fontSize: 13,
                  }}
                >
                  {isSaved(data.address) ? '⭐ Saved' : '+ Save'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Wallet Balance Chart */}
            <View style={[styles.glassCard, styles.chartCard, { backgroundColor: colors.card + 'AA', borderColor: colors.border + '60' }]}>
              <BalanceChart currentBalanceUsd={usdBalance} />
            </View>

            {/* Balance Card */}
            <View style={[styles.glassCard, styles.balanceCard, { backgroundColor: colors.card + 'AA', borderColor: colors.border + '60' }]}>
              <Text style={[styles.balanceLabel, { color: colors.textSecondary }]}>Total Balance</Text>
              <Text style={[styles.balanceSOL, { color: colors.text }]}>
                ${usdBalance.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </Text>
              <Text style={[styles.balanceUSD, { color: colors.textSecondary }]}>
                {data.solBalance.toLocaleString(undefined, { maximumFractionDigits: 4 })} SOL
              </Text>
              <View style={styles.statsRow}>
                <View style={[styles.statBadge, { backgroundColor: colors.primary + '15' }]}>
                  <Text style={[styles.statNum, { color: colors.primary }]}>{data.tokens.length}</Text>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Tokens</Text>
                </View>
                <View style={[styles.statBadge, { backgroundColor: colors.accent + '15' }]}>
                  <Text style={[styles.statNum, { color: colors.accent }]}>{data.nfts.length}</Text>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>NFTs</Text>
                </View>
                <View style={[styles.statBadge, { backgroundColor: colors.success + '15' }]}>
                  <Text style={[styles.statNum, { color: colors.success }]}>{data.transactions.length}</Text>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Txns</Text>
                </View>
              </View>
            </View>

            {/* Tab Switcher */}
            <View style={[styles.tabBar, { backgroundColor: colors.card + '80', borderColor: colors.border + '40' }]}>
              {(['tokens', 'nfts', 'transactions'] as DataTab[]).map((tab) => (
                <TouchableOpacity
                  key={tab}
                  style={[
                    styles.tab,
                    activeTab === tab && { backgroundColor: colors.primary + '25' },
                  ]}
                  onPress={() => setActiveTab(tab)}
                >
                  <Text
                    style={[
                      styles.tabText,
                      {
                        color: activeTab === tab ? colors.primary : colors.textSecondary,
                        fontWeight: activeTab === tab ? '700' : '500',
                      },
                    ]}
                  >
                    {tab === 'tokens' ? `Tokens (${data.tokens.length})`
                      : tab === 'nfts' ? `NFTs (${data.nfts.length})`
                      : `Txns (${data.transactions.length})`}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Tab Content */}
            {activeTab === 'tokens' && (
              <View style={[styles.glassSection, { backgroundColor: colors.card + 'AA', borderColor: colors.border + '60' }]}>
                {data.tokens.length === 0 ? (
                  <Text style={[styles.emptyTab, { color: colors.textSecondary }]}>No tokens found</Text>
                ) : (
                  data.tokens.map((token) => (
                    <TokenRow key={token.mint} token={token} />
                  ))
                )}
              </View>
            )}

            {activeTab === 'nfts' && (
              <NFTGrid nfts={data.nfts} />
            )}

            {activeTab === 'transactions' && (
              <View style={[styles.glassSection, { backgroundColor: colors.card + 'AA', borderColor: colors.border + '60' }]}>
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
          <View style={[styles.modal, { backgroundColor: colors.surface }]}>
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
                style={[styles.modalBtn, { backgroundColor: colors.textSecondary + '30' }]}
                onPress={() => setShowSaveModal(false)}
              >
                <Text style={{ color: colors.text, fontWeight: '600' }}>Cancel</Text>
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
    paddingTop: 44,
    paddingBottom: 12,
  },
  title: { fontSize: 20, fontWeight: '700' },
  backBtn: { paddingVertical: 4, paddingRight: 12 },
  themeBtn: { padding: 8 },
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  input: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 14,
  },
  searchBtn: {
    height: 44,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBtnText: { color: '#FFF', fontWeight: '600', fontSize: 14 },
  errorText: { fontSize: 12, marginHorizontal: 16, marginTop: -4, marginBottom: 8 },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 100 },
  placeholder: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 40 },
  placeholderText: { fontSize: 15, textAlign: 'center', marginTop: 16, lineHeight: 22 },
  loadingContainer: { alignItems: 'center', paddingTop: 60 },
  loadingText: { marginTop: 12, fontSize: 14 },

  // Glass cards
  glassCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  chartCard: {
    flexDirection: 'column',
    paddingVertical: 16,
    minHeight: 200,
  },
  balanceCard: {
    flexDirection: 'column',
    alignItems: 'center',
    paddingVertical: 20,
  },
  addressText: { fontSize: 14, fontWeight: '500' },
  walletName: { fontSize: 15, fontWeight: '700' },
  addressSubtext: { fontSize: 11, marginTop: 2 },
  saveBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8 },

  // Balance
  balanceLabel: { fontSize: 13, marginBottom: 4 },
  balanceSOL: { fontSize: 30, fontWeight: '700', marginBottom: 2 },
  balanceUSD: { fontSize: 16, fontWeight: '600', marginBottom: 16 },
  statsRow: { flexDirection: 'row', gap: 10, width: '100%' },
  statBadge: { flex: 1, alignItems: 'center', padding: 10, borderRadius: 10 },
  statNum: { fontSize: 18, fontWeight: '700' },
  statLabel: { fontSize: 11, marginTop: 2 },

  // Tabs
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 12,
    borderWidth: 1,
    padding: 3,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  tabText: { fontSize: 13 },
  glassSection: {
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  emptyTab: { padding: 24, textAlign: 'center', fontSize: 14 },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
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
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalBtn: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

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
  Alert,
} from 'react-native';
import { useAppTheme } from '../hooks/useTheme';
import { useWalletData } from '../hooks/useWalletData';
import { useSavedAddresses } from '../hooks/useSavedAddresses';
import { isValidSolanaAddress, shortenAddress } from '../utils';
import { BalanceCard } from '../components/BalanceCard';
import { TokenRow } from '../components/TokenRow';
import { NFTGrid } from '../components/NFTGrid';
import { TransactionItem } from '../components/TransactionItem';
import { SectionHeader } from '../components/SectionHeader';
import { ErrorMessage } from '../components/ErrorMessage';

export const SearchScreen: React.FC = () => {
  const { colors, isDark, toggle } = useAppTheme();
  const [inputAddress, setInputAddress] = useState('');
  const [searchAddress, setSearchAddress] = useState<string | null>(null);
  const [inputError, setInputError] = useState('');

  const { data, isLoading, error, refetch } = useWalletData(searchAddress);
  const { add: saveAddress, isSaved } = useSavedAddresses();

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
  }, [inputAddress]);

  const handleSave = useCallback(() => {
    if (!searchAddress) return;
    if (isSaved(searchAddress)) {
      Alert.alert('Already Saved', 'This address is already in your saved list.');
      return;
    }
    Alert.prompt(
      'Save Address',
      'Give this wallet a label (optional):',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Save',
          onPress: (label) => {
            saveAddress(searchAddress, label || undefined);
            Alert.alert('Saved!', 'Address added to your saved list.');
          },
        },
      ],
      'plain-text',
      `Wallet ${shortenAddress(searchAddress)}`,
    );
  }, [searchAddress, isSaved, saveAddress]);

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface }]}>
        <Text style={[styles.title, { color: colors.text }]}>Solana Wallet Tracker</Text>
        <TouchableOpacity onPress={toggle} style={styles.themeBtn}>
          <Text style={{ fontSize: 20 }}>{isDark ? '☀️' : '🌙'}</Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={[styles.searchContainer, { backgroundColor: colors.surface }]}>
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: colors.background,
              color: colors.text,
              borderColor: inputError ? colors.error : colors.border,
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

      {/* Results */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
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
            <View style={[styles.addressBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.addressText, { color: colors.text }]} numberOfLines={1}>
                {shortenAddress(data.address, 8)}
              </Text>
              <TouchableOpacity
                style={[
                  styles.saveBtn,
                  {
                    backgroundColor: isSaved(data.address)
                      ? colors.textSecondary + '30'
                      : colors.accent + '20',
                  },
                ]}
                onPress={handleSave}
                disabled={isSaved(data.address)}
              >
                <Text
                  style={{
                    color: isSaved(data.address) ? colors.textSecondary : colors.accent,
                    fontWeight: '600',
                    fontSize: 13,
                  }}
                >
                  {isSaved(data.address) ? '✓ Saved' : '+ Save'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Balance Card */}
            <BalanceCard
              solBalance={data.solBalance}
              tokenCount={data.tokens.length}
              nftCount={data.nfts.length}
            />

            {/* Tokens */}
            {data.tokens.length > 0 && (
              <>
                <SectionHeader title="Tokens" count={data.tokens.length} />
                <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  {data.tokens.map((token) => (
                    <TokenRow key={token.mint} token={token} />
                  ))}
                </View>
              </>
            )}

            {/* NFTs */}
            <SectionHeader title="NFTs" count={data.nfts.length} />
            <NFTGrid nfts={data.nfts} />

            {/* Transactions */}
            {data.transactions.length > 0 && (
              <>
                <SectionHeader title="Recent Transactions" count={data.transactions.length} />
                <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  {data.transactions.map((tx) => (
                    <TransactionItem key={tx.signature} tx={tx} />
                  ))}
                </View>
              </>
            )}

            <View style={{ height: 40 }} />
          </>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  title: { fontSize: 20, fontWeight: '700' },
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
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 14,
  },
  searchBtn: {
    height: 44,
    paddingHorizontal: 20,
    borderRadius: 10,
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
  addressBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  addressText: { fontSize: 14, fontWeight: '500' },
  saveBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8 },
  section: {
    marginHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
});

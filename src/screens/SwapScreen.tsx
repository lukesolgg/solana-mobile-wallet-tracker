// src/screens/SwapScreen.tsx

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Modal,
  Image,
  Alert,
  FlatList,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import { useAppTheme } from '../hooks/useTheme';
import { useRewards } from '../hooks/useRewards';
import { GlowBackground } from '../components/GlowBackground';
import {
  POPULAR_TOKENS,
  getSwapQuote,
  getSwapTransaction,
  searchTokens,
  formatTokenAmount,
  toSmallestUnit,
} from '../services/jupiterService';
import type { PopularToken, JupiterQuote } from '../services/jupiterService';

const SLIPPAGE_OPTIONS = [
  { label: '0.1%', value: 10 },
  { label: '0.5%', value: 50 },
  { label: '1%', value: 100 },
];

export const SwapScreen: React.FC = () => {
  const { colors } = useAppTheme();
  const navigation = useNavigation<any>();
  const { addPoints } = useRewards();

  // Swap state
  const [inputToken, setInputToken] = useState<PopularToken>(POPULAR_TOKENS[0]); // SOL
  const [outputToken, setOutputToken] = useState<PopularToken>(POPULAR_TOKENS[1]); // USDC
  const [inputAmount, setInputAmount] = useState('');
  const [slippageBps, setSlippageBps] = useState(50);

  // Quote state
  const [quote, setQuote] = useState<JupiterQuote | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState('');

  // Swap execution state
  const [swapping, setSwapping] = useState(false);
  const [swapResult, setSwapResult] = useState<'success' | 'error' | null>(null);

  // Token selector modal
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [tokenModalSide, setTokenModalSide] = useState<'input' | 'output'>('input');
  const [tokenSearch, setTokenSearch] = useState('');
  const [searchResults, setSearchResults] = useState<PopularToken[]>([]);
  const [searching, setSearching] = useState(false);

  // Connected wallet (read from somewhere — for now we don't have global state)
  // This would eventually come from a shared wallet context
  const [connectedWallet, setConnectedWallet] = useState<string | null>(null);

  // Debounced quote fetch
  useEffect(() => {
    if (!inputAmount || parseFloat(inputAmount) <= 0) {
      setQuote(null);
      setQuoteError('');
      return;
    }

    const timer = setTimeout(async () => {
      setQuoteLoading(true);
      setQuoteError('');
      try {
        const amount = toSmallestUnit(parseFloat(inputAmount), inputToken.decimals);
        const q = await getSwapQuote(inputToken.address, outputToken.address, amount, slippageBps);
        setQuote(q);
      } catch (err: any) {
        setQuoteError(err.message || 'Failed to get quote');
        setQuote(null);
      } finally {
        setQuoteLoading(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [inputAmount, inputToken.address, outputToken.address, slippageBps]);

  const outputAmount = useMemo(() => {
    if (!quote) return '';
    return formatTokenAmount(quote.outAmount, outputToken.decimals);
  }, [quote, outputToken.decimals]);

  const minReceived = useMemo(() => {
    if (!quote) return '';
    return formatTokenAmount(quote.otherAmountThreshold, outputToken.decimals);
  }, [quote, outputToken.decimals]);

  const priceImpact = useMemo(() => {
    if (!quote) return '';
    const impact = parseFloat(quote.priceImpactPct);
    if (impact < 0.01) return '<0.01%';
    return `${impact.toFixed(2)}%`;
  }, [quote]);

  const rate = useMemo(() => {
    if (!quote || !inputAmount || parseFloat(inputAmount) === 0) return '';
    const outNum = Number(quote.outAmount) / Math.pow(10, outputToken.decimals);
    const inNum = parseFloat(inputAmount);
    const r = outNum / inNum;
    return `1 ${inputToken.symbol} = ${r >= 1 ? r.toFixed(4) : r.toFixed(6)} ${outputToken.symbol}`;
  }, [quote, inputAmount, inputToken, outputToken]);

  const handleSwapDirection = useCallback(() => {
    const temp = inputToken;
    setInputToken(outputToken);
    setOutputToken(temp);
    setInputAmount('');
    setQuote(null);
  }, [inputToken, outputToken]);

  const handleOpenTokenModal = useCallback((side: 'input' | 'output') => {
    setTokenModalSide(side);
    setTokenSearch('');
    setSearchResults([]);
    setShowTokenModal(true);
  }, []);

  const handleSelectToken = useCallback((token: PopularToken) => {
    if (tokenModalSide === 'input') {
      if (token.address === outputToken.address) {
        // Swap them
        setOutputToken(inputToken);
      }
      setInputToken(token);
    } else {
      if (token.address === inputToken.address) {
        setInputToken(outputToken);
      }
      setOutputToken(token);
    }
    setShowTokenModal(false);
    setInputAmount('');
    setQuote(null);
  }, [tokenModalSide, inputToken, outputToken]);

  const handleSearchTokens = useCallback(async (query: string) => {
    setTokenSearch(query);
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const results = await searchTokens(query);
      setSearchResults(results);
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  const handleSwap = useCallback(async () => {
    if (!quote || !connectedWallet) return;

    setSwapping(true);
    setSwapResult(null);
    try {
      // Get serialized transaction
      const swapTx = await getSwapTransaction(quote, connectedWallet);

      // Use MWA to sign and send
      const { transact } = require('@solana-mobile/mobile-wallet-adapter-protocol-web3js');
      const { VersionedTransaction } = require('@solana/web3.js');

      const txBuffer = Buffer.from(swapTx, 'base64');
      const transaction = VersionedTransaction.deserialize(txBuffer);

      await transact(async (wallet: any) => {
        await wallet.authorize({
          cluster: 'mainnet-beta',
          identity: {
            name: 'Solana Wallet Tracker',
            uri: 'https://solanawallet.tracker',
            icon: 'favicon.ico',
          },
        });

        const signedTxs = await wallet.signAndSendTransactions({
          transactions: [transaction],
        });

        console.log('[Swap] Transaction sent:', signedTxs);
      });

      setSwapResult('success');
      addPoints('swap', `Swapped ${inputToken.symbol} → ${outputToken.symbol}`);
      Alert.alert('Swap Successful!', `Swapped ${inputAmount} ${inputToken.symbol} for ${outputAmount} ${outputToken.symbol}`);
    } catch (err: any) {
      console.warn('[Swap] Error:', err);
      setSwapResult('error');
      Alert.alert('Swap Failed', err.message || 'An error occurred during the swap.');
    } finally {
      setSwapping(false);
    }
  }, [quote, connectedWallet, inputAmount, inputToken, outputToken, outputAmount, addPoints]);

  const tokenListToShow = tokenSearch.length >= 2 ? searchResults : POPULAR_TOKENS;

  return (
    <GlowBackground>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>Swap</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Powered by Jupiter
          </Text>
        </View>

        {/* Input Token Section */}
        <View style={[styles.swapCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>You Pay</Text>
          <View style={styles.tokenRow}>
            <TouchableOpacity
              style={[styles.tokenSelector, { backgroundColor: colors.background }]}
              onPress={() => handleOpenTokenModal('input')}
              activeOpacity={0.7}
            >
              {inputToken.logoURI ? (
                <Image source={{ uri: inputToken.logoURI }} style={styles.tokenLogo} />
              ) : (
                <View style={[styles.tokenLogoFallback, { backgroundColor: colors.primary + '20' }]}>
                  <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 12 }}>
                    {inputToken.symbol.slice(0, 2)}
                  </Text>
                </View>
              )}
              <Text style={[styles.tokenSymbol, { color: colors.text }]}>{inputToken.symbol}</Text>
              <MaterialCommunityIcons name="chevron-down" size={16} color={colors.textSecondary} />
            </TouchableOpacity>

            <TextInput
              style={[styles.amountInput, { color: colors.text }]}
              placeholder="0.00"
              placeholderTextColor={colors.textSecondary}
              value={inputAmount}
              onChangeText={setInputAmount}
              keyboardType="decimal-pad"
              autoCorrect={false}
            />
          </View>
        </View>

        {/* Swap Direction Button */}
        <View style={styles.swapBtnContainer}>
          <TouchableOpacity
            style={[styles.swapDirectionBtn, { backgroundColor: colors.card, borderColor: colors.background }]}
            onPress={handleSwapDirection}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons name="swap-vertical" size={20} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Output Token Section */}
        <View style={[styles.swapCard, { backgroundColor: colors.card, marginTop: -8 }]}>
          <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>You Receive</Text>
          <View style={styles.tokenRow}>
            <TouchableOpacity
              style={[styles.tokenSelector, { backgroundColor: colors.background }]}
              onPress={() => handleOpenTokenModal('output')}
              activeOpacity={0.7}
            >
              {outputToken.logoURI ? (
                <Image source={{ uri: outputToken.logoURI }} style={styles.tokenLogo} />
              ) : (
                <View style={[styles.tokenLogoFallback, { backgroundColor: colors.primary + '20' }]}>
                  <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 12 }}>
                    {outputToken.symbol.slice(0, 2)}
                  </Text>
                </View>
              )}
              <Text style={[styles.tokenSymbol, { color: colors.text }]}>{outputToken.symbol}</Text>
              <MaterialCommunityIcons name="chevron-down" size={16} color={colors.textSecondary} />
            </TouchableOpacity>

            <View style={styles.outputAmountWrap}>
              {quoteLoading ? (
                <ActivityIndicator size="small" color={colors.textSecondary} />
              ) : (
                <Text style={[styles.outputAmount, { color: outputAmount ? colors.text : colors.textSecondary }]}>
                  {outputAmount || '0.00'}
                </Text>
              )}
            </View>
          </View>
        </View>

        {/* Slippage Selector */}
        <View style={[styles.slippageRow, { marginTop: 16 }]}>
          <Text style={[styles.slippageLabel, { color: colors.textSecondary }]}>Slippage</Text>
          <View style={styles.slippageOptions}>
            {SLIPPAGE_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[
                  styles.slippageBtn,
                  {
                    backgroundColor: slippageBps === opt.value ? colors.primary : colors.card,
                  },
                ]}
                onPress={() => setSlippageBps(opt.value)}
              >
                <Text
                  style={{
                    color: slippageBps === opt.value ? '#FFF' : colors.textSecondary,
                    fontSize: 12,
                    fontWeight: '600',
                  }}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Quote Details */}
        {quote && (
          <View style={[styles.quoteCard, { backgroundColor: colors.card }]}>
            {rate && (
              <View style={styles.quoteRow}>
                <Text style={[styles.quoteLabel, { color: colors.textSecondary }]}>Rate</Text>
                <Text style={[styles.quoteValue, { color: colors.text }]}>{rate}</Text>
              </View>
            )}
            {priceImpact && (
              <View style={styles.quoteRow}>
                <Text style={[styles.quoteLabel, { color: colors.textSecondary }]}>Price Impact</Text>
                <Text style={[styles.quoteValue, { color: parseFloat(quote.priceImpactPct) > 1 ? colors.error : colors.text }]}>
                  {priceImpact}
                </Text>
              </View>
            )}
            {minReceived && (
              <View style={styles.quoteRow}>
                <Text style={[styles.quoteLabel, { color: colors.textSecondary }]}>Min Received</Text>
                <Text style={[styles.quoteValue, { color: colors.text }]}>
                  {minReceived} {outputToken.symbol}
                </Text>
              </View>
            )}
            <View style={styles.quoteRow}>
              <Text style={[styles.quoteLabel, { color: colors.textSecondary }]}>Route</Text>
              <Text style={[styles.quoteValue, { color: colors.textSecondary }]}>
                {quote.routePlan?.length ?? 0} hop{(quote.routePlan?.length ?? 0) !== 1 ? 's' : ''}
              </Text>
            </View>
          </View>
        )}

        {quoteError ? (
          <Text style={[styles.errorText, { color: colors.error }]}>{quoteError}</Text>
        ) : null}

        {/* Swap Button */}
        {connectedWallet ? (
          <TouchableOpacity
            style={[
              styles.swapBtn,
              {
                backgroundColor: quote && !swapping ? colors.primary : colors.card,
                opacity: quote && !swapping ? 1 : 0.5,
              },
            ]}
            onPress={handleSwap}
            disabled={!quote || swapping}
            activeOpacity={0.8}
          >
            {swapping ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <Text style={[styles.swapBtnText, { color: quote ? '#FFF' : colors.textSecondary }]}>
                {!inputAmount ? 'Enter an amount' : !quote ? 'Getting quote...' : 'Swap'}
              </Text>
            )}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.swapBtn, { backgroundColor: colors.primary }]}
            onPress={() => navigation.navigate('Connect')}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons name="wallet-outline" size={20} color="#FFF" style={{ marginRight: 8 }} />
            <Text style={styles.swapBtnText}>Connect Wallet to Swap</Text>
          </TouchableOpacity>
        )}

        {/* Jupiter branding */}
        <View style={styles.jupBranding}>
          <MaterialCommunityIcons name="swap-horizontal" size={14} color={colors.textSecondary} />
          <Text style={[styles.jupText, { color: colors.textSecondary }]}>
            Routes via Jupiter Aggregator
          </Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Token Selector Modal */}
      <Modal visible={showTokenModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modal, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Select {tokenModalSide === 'input' ? 'Input' : 'Output'} Token
              </Text>
              <TouchableOpacity onPress={() => setShowTokenModal(false)}>
                <MaterialCommunityIcons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={[styles.modalSearchBar, { backgroundColor: colors.background }]}>
              <MaterialCommunityIcons name="magnify" size={18} color={colors.textSecondary} />
              <TextInput
                style={[styles.modalSearchInput, { color: colors.text }]}
                placeholder="Search by name or symbol..."
                placeholderTextColor={colors.textSecondary}
                value={tokenSearch}
                onChangeText={handleSearchTokens}
                autoCorrect={false}
                autoCapitalize="none"
              />
            </View>

            {tokenSearch.length < 2 && (
              <Text style={[styles.modalSectionLabel, { color: colors.textSecondary }]}>Popular</Text>
            )}

            {searching && (
              <ActivityIndicator size="small" color={colors.textSecondary} style={{ padding: 16 }} />
            )}

            <FlatList
              data={tokenListToShow}
              keyExtractor={(item) => item.address}
              style={styles.tokenList}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item: token }) => (
                <TouchableOpacity
                  style={styles.tokenListItem}
                  onPress={() => handleSelectToken(token)}
                  activeOpacity={0.6}
                >
                  {token.logoURI ? (
                    <Image source={{ uri: token.logoURI }} style={styles.tokenListLogo} />
                  ) : (
                    <View style={[styles.tokenListLogoFallback, { backgroundColor: colors.background }]}>
                      <Text style={{ color: colors.text, fontWeight: '700', fontSize: 13 }}>
                        {token.symbol.slice(0, 2)}
                      </Text>
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.tokenListName, { color: colors.text }]}>{token.symbol}</Text>
                    <Text style={[styles.tokenListFullName, { color: colors.textSecondary }]}>
                      {token.name}
                    </Text>
                  </View>
                  {(token.address === inputToken.address || token.address === outputToken.address) && (
                    <MaterialCommunityIcons name="check-circle" size={18} color={colors.primary} />
                  )}
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                tokenSearch.length >= 2 && !searching ? (
                  <Text style={{ color: colors.textSecondary, textAlign: 'center', padding: 24 }}>
                    No tokens found
                  </Text>
                ) : null
              }
            />
          </View>
        </View>
      </Modal>
    </GlowBackground>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 16, paddingTop: 48 },

  header: { marginBottom: 20 },
  title: { fontSize: 28, fontWeight: '700' },
  subtitle: { fontSize: 14, marginTop: 2 },

  swapCard: {
    borderRadius: 14,
    padding: 16,
  },
  cardLabel: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },

  tokenRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  tokenSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 6,
  },
  tokenLogo: { width: 24, height: 24, borderRadius: 12 },
  tokenLogoFallback: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tokenSymbol: { fontSize: 16, fontWeight: '700' },

  amountInput: {
    flex: 1,
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'right',
    height: 44,
    padding: 0,
  },

  outputAmountWrap: {
    flex: 1,
    alignItems: 'flex-end',
    justifyContent: 'center',
    minHeight: 44,
  },
  outputAmount: { fontSize: 28, fontWeight: '700' },

  swapBtnContainer: {
    alignItems: 'center',
    zIndex: 10,
    marginVertical: -14,
  },
  swapDirectionBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },

  slippageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  slippageLabel: { fontSize: 13, fontWeight: '500' },
  slippageOptions: { flexDirection: 'row', gap: 8 },
  slippageBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
  },

  quoteCard: {
    borderRadius: 14,
    padding: 14,
    marginTop: 16,
  },
  quoteRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  quoteLabel: { fontSize: 13 },
  quoteValue: { fontSize: 13, fontWeight: '600' },

  errorText: { fontSize: 12, marginTop: 8, textAlign: 'center' },

  swapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 14,
    marginTop: 20,
  },
  swapBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },

  jupBranding: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 16,
  },
  jupText: { fontSize: 11 },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modal: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalTitle: { fontSize: 18, fontWeight: '700' },

  modalSearchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 40,
    borderRadius: 10,
    gap: 8,
    marginBottom: 12,
  },
  modalSearchInput: { flex: 1, fontSize: 14, height: 40 },
  modalSectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },

  tokenList: { maxHeight: 400 },
  tokenListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 12,
  },
  tokenListLogo: { width: 36, height: 36, borderRadius: 18 },
  tokenListLogoFallback: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tokenListName: { fontSize: 15, fontWeight: '600' },
  tokenListFullName: { fontSize: 12, marginTop: 1 },
});

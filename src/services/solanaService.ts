// src/services/solanaService.ts

import {
  Connection,
  PublicKey,
  LAMPORTS_PER_SOL,
  ParsedTransactionWithMeta,
  ConfirmedSignatureInfo,
} from '@solana/web3.js';
import { PublicKey as SplPublicKey } from '@solana/web3.js';

// Hardcode program IDs to avoid @solana/spl-token import issues in React Native
const TOKEN_PROGRAM_ID = new SplPublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
const TOKEN_2022_PROGRAM_ID = new SplPublicKey('TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb');
import type {
  TokenBalance,
  NFTAsset,
  TransactionInfo,
  WalletData,
  StakedToken,
} from '../types';
import { CONFIG } from '../config';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const RPC_ENDPOINTS = {
  mainnet: `https://mainnet.helius-rpc.com/?api-key=${CONFIG.HELIUS_API_KEY}`,
  devnet: 'https://api.devnet.solana.com',
};

// Switch to 'mainnet' for production, 'devnet' for testing
const ACTIVE_NETWORK: keyof typeof RPC_ENDPOINTS = 'mainnet';

let connection: Connection;

export function getConnection(): Connection {
  if (!connection) {
    connection = new Connection(RPC_ENDPOINTS[ACTIVE_NETWORK], {
      commitment: 'confirmed',
    });
  }
  return connection;
}

// ---------------------------------------------------------------------------
// Retry helper with exponential backoff (handles 429 rate limits)
// ---------------------------------------------------------------------------

async function withRetry<T>(
  fn: () => Promise<T>,
  label: string,
  maxRetries = 2,
  baseDelay = 1500,
): Promise<T> {
  let lastError: any;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      lastError = err;
      const msg = String(err?.message || err || '');
      const is429 = msg.includes('429') || msg.includes('Too many requests') || msg.includes('Server responded with');
      const isTimeout = msg.includes('timeout') || msg.includes('ETIMEDOUT');
      if ((is429 || isTimeout) && attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt);
        console.warn(`[${label}] Rate limited (attempt ${attempt + 1}/${maxRetries + 1}), retrying in ${delay}ms...`);
        await new Promise(r => setTimeout(r, delay));
      } else {
        throw err;
      }
    }
  }
  throw lastError;
}

// Small helper to add a delay between sequential calls
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

// Timeout wrapper — rejects if a promise takes too long
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`[${label}] Timed out after ${ms}ms`)), ms);
    promise.then(
      (val) => { clearTimeout(timer); resolve(val); },
      (err) => { clearTimeout(timer); reject(err); },
    );
  });
}

// ---------------------------------------------------------------------------
// SOL Balance
// ---------------------------------------------------------------------------

export async function fetchSolBalance(address: string): Promise<number> {
  address = address.trim().replace(/[^1-9A-HJ-NP-Za-km-z]/g, '');
  const conn = getConnection();
  const pubkey = new PublicKey(address);
  const lamports = await conn.getBalance(pubkey);
  return lamports / LAMPORTS_PER_SOL;
}

// ---------------------------------------------------------------------------
// Token Balances (SPL)
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// DexScreener API — token metadata, prices, logos, and 24h change
// ---------------------------------------------------------------------------

interface DexScreenerToken {
  name: string;
  symbol: string;
  priceUsd: number;
  logoUri: string;
  change24h: number;
}

// In-memory cache for DexScreener results (per-mint)
const dexCache: Map<string, DexScreenerToken> = new Map();
let dexCacheTimestamp = 0;
const DEX_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch token data from DexScreener for a batch of mints.
 * DexScreener supports comma-separated addresses (up to 30 per request).
 */
async function fetchDexScreenerData(
  mints: string[],
): Promise<Map<string, DexScreenerToken>> {
  const result = new Map<string, DexScreenerToken>();
  if (mints.length === 0) return result;

  // Check cache freshness
  const now = Date.now();
  const uncached = now - dexCacheTimestamp > DEX_CACHE_TTL
    ? mints
    : mints.filter((m) => !dexCache.has(m));

  // If all cached and fresh, return from cache
  if (uncached.length === 0) {
    for (const m of mints) {
      const cached = dexCache.get(m);
      if (cached) result.set(m, cached);
    }
    return result;
  }

  // DexScreener allows up to 30 addresses per request
  const BATCH_SIZE = 30;
  for (let i = 0; i < mints.length; i += BATCH_SIZE) {
    const batch = mints.slice(i, i + BATCH_SIZE);
    try {
      const url = `https://api.dexscreener.com/tokens/v1/solana/${batch.join(',')}`;
      const response = await fetch(url);
      const pairs: any[] = await response.json();

      if (!Array.isArray(pairs)) {
        console.warn('[DexScreener] Unexpected response shape');
        continue;
      }

      // DexScreener returns multiple pairs per token — pick the highest-liquidity pair for each mint
      const bestPair = new Map<string, any>();
      for (const pair of pairs) {
        const mint = pair.baseToken?.address;
        if (!mint) continue;
        const existing = bestPair.get(mint);
        if (!existing || (pair.liquidity?.usd ?? 0) > (existing.liquidity?.usd ?? 0)) {
          bestPair.set(mint, pair);
        }
      }

      for (const [mint, pair] of bestPair) {
        const token: DexScreenerToken = {
          name: pair.baseToken?.name ?? 'Unknown',
          symbol: pair.baseToken?.symbol ?? shortenMint(mint),
          priceUsd: parseFloat(pair.priceUsd) || 0,
          logoUri: pair.info?.imageUrl ?? '',
          change24h: pair.priceChange?.h24 ?? 0,
        };
        dexCache.set(mint, token);
        result.set(mint, token);
      }
    } catch (error) {
      console.warn('[DexScreener] Batch fetch failed:', error);
    }
  }

  dexCacheTimestamp = now;

  // Fill remaining from cache
  for (const m of mints) {
    if (!result.has(m)) {
      const cached = dexCache.get(m);
      if (cached) result.set(m, cached);
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Helius DAS fallback — on-chain metadata for tokens DexScreener doesn't know
// ---------------------------------------------------------------------------

interface HeliusAssetMeta {
  name: string;
  symbol: string;
  image?: string;
}

async function fetchHeliusAssetBatch(
  mints: string[],
): Promise<Map<string, HeliusAssetMeta>> {
  const result = new Map<string, HeliusAssetMeta>();
  if (mints.length === 0) return result;

  try {
    const rpcUrl = RPC_ENDPOINTS[ACTIVE_NETWORK];
    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 'helius-asset-batch',
        method: 'getAssetBatch',
        params: { ids: mints },
      }),
    });
    const json = await response.json();

    if (Array.isArray(json?.result)) {
      for (const asset of json.result) {
        if (!asset?.id) continue;
        const meta = asset.content?.metadata;
        const links = asset.content?.links;
        if (meta?.name || meta?.symbol) {
          result.set(asset.id, {
            name: meta.name || 'Unknown',
            symbol: meta.symbol || shortenMint(asset.id),
            image: links?.image || asset.content?.files?.[0]?.cdn_uri || undefined,
          });
        }
      }
    }
    console.log(`[Helius] Got on-chain metadata for ${result.size}/${mints.length} tokens`);
  } catch (error) {
    console.warn('[Helius] getAssetBatch failed:', error);
  }

  return result;
}

export async function fetchTokenBalances(address: string): Promise<TokenBalance[]> {
  const conn = getConnection();
  const pubkey = new PublicKey(address);

  // Query BOTH Token Program AND Token-2022 sequentially to avoid 429
  const tokenAccounts = await withRetry(
    () => conn.getParsedTokenAccountsByOwner(pubkey, { programId: TOKEN_PROGRAM_ID }),
    'TokenProgram',
  );
  await sleep(200);
  const token2022Accounts = await withRetry(
    () => conn.getParsedTokenAccountsByOwner(pubkey, { programId: TOKEN_2022_PROGRAM_ID }),
    'Token2022',
  );

  // Merge all token accounts
  const allAccounts = [
    ...tokenAccounts.value,
    ...token2022Accounts.value,
  ];
  console.log(`[Tokens] Found ${tokenAccounts.value.length} (legacy) + ${token2022Accounts.value.length} (2022) accounts`);

  // Collect mints with non-zero balances, skip NFTs (decimals=0, amount=1)
  const nonZeroAccounts = allAccounts.filter((ta) => {
    const info = ta.account.data.parsed.info;
    const uiAmount = info.tokenAmount.uiAmount ?? 0;
    const decimals = info.tokenAmount.decimals;
    // Skip zero balances and NFT-like tokens (1 token with 0 decimals)
    if (uiAmount === 0) return false;
    if (decimals === 0 && Number(info.tokenAmount.amount) === 1) return false;
    return true;
  });

  console.log(`[Tokens] ${nonZeroAccounts.length} non-zero token accounts after filtering`);

  // For whale wallets with tons of tokens, sort by raw amount descending
  // and only look up metadata for the top tokens to avoid 100s of API calls
  const MAX_TOKENS_TO_LOOKUP = 50;
  const sortedAccounts = nonZeroAccounts
    .map((ta) => ({
      ta,
      uiAmount: ta.account.data.parsed.info.tokenAmount.uiAmount ?? 0,
    }))
    .sort((a, b) => b.uiAmount - a.uiAmount)
    .slice(0, MAX_TOKENS_TO_LOOKUP)
    .map((x) => x.ta);

  const mints = sortedAccounts.map((ta) => ta.account.data.parsed.info.mint as string);
  console.log(`[Tokens] Looking up metadata for top ${mints.length} tokens`);

  // Fetch token data from DexScreener (max 50 tokens = 2 batches of 30)
  const dexData = await fetchDexScreenerData(mints);
  console.log(`[DexScreener] Got data for ${dexData.size}/${mints.length} tokens`);

  await sleep(200);

  // For tokens DexScreener doesn't know, fetch on-chain metadata via Helius DAS
  // Limit to 30 to keep Helius calls light
  const missingMints = mints.filter((m) => !dexData.has(m)).slice(0, 30);
  const heliusMeta = missingMints.length > 0
    ? await fetchHeliusAssetBatch(missingMints)
    : new Map<string, HeliusAssetMeta>();

  const tokens: TokenBalance[] = sortedAccounts
    .map((ta) => {
      const info = ta.account.data.parsed.info;
      const mint: string = info.mint;
      const amount: number = Number(info.tokenAmount.amount);
      const decimals: number = info.tokenAmount.decimals;
      const uiAmount: number = info.tokenAmount.uiAmount ?? 0;

      const dex = dexData.get(mint);
      const helius = heliusMeta.get(mint);
      const isVerified = !!dex;

      return {
        mint,
        symbol: dex?.symbol ?? helius?.symbol ?? shortenMint(mint),
        name: dex?.name ?? helius?.name ?? 'Unknown Token',
        amount,
        decimals,
        uiAmount,
        logoUri: dex?.logoUri || helius?.image || undefined,
        priceUsd: dex?.priceUsd || undefined,
        valueUsd: dex?.priceUsd ? dex.priceUsd * uiAmount : undefined,
        change24h: dex?.change24h,
        verified: isVerified,
      } as TokenBalance;
    })
    .filter(Boolean) as TokenBalance[];

  // Sort by USD value descending, then by uiAmount for unpriced tokens
  tokens.sort((a, b) => {
    const aVal = a.valueUsd ?? 0;
    const bVal = b.valueUsd ?? 0;
    if (bVal !== aVal) return bVal - aVal;
    return b.uiAmount - a.uiAmount;
  });

  return tokens;
}

function shortenMint(mint: string): string {
  return mint.slice(0, 4) + '…';
}

// ---------------------------------------------------------------------------
// NFTs — uses DAS (Digital Asset Standard) API on Helius / Shyft / RPC
// Falls back to getParsedTokenAccountsByOwner for basic detection
// ---------------------------------------------------------------------------

export async function fetchNFTs(address: string): Promise<NFTAsset[]> {
  // Try DAS API first (works with Helius/Triton RPCs that support getAssetsByOwner)
  try {
    return await fetchNFTsViaDAS(address);
  } catch {
    // Fallback: detect NFTs from token accounts (amount=1, decimals=0)
    return fetchNFTsFallback(address);
  }
}

async function fetchNFTsViaDAS(address: string): Promise<NFTAsset[]> {
  const conn = getConnection();
  // DAS is a JSON-RPC extension — not all RPCs support it
  const response = await (conn as any)._rpcRequest('getAssetsByOwner', {
    ownerAddress: address,
    page: 1,
    limit: 50,
    displayOptions: { showFungible: false },
  });

  if (!response?.result?.items) throw new Error('DAS not supported');

  return response.result.items.map((item: any) => ({
    mint: item.id,
    name: item.content?.metadata?.name ?? 'Unnamed NFT',
    image:
      item.content?.links?.image ??
      item.content?.files?.[0]?.uri ??
      '',
    collection: item.grouping?.[0]?.group_value,
    description: item.content?.metadata?.description,
  }));
}

async function fetchNFTsFallback(address: string): Promise<NFTAsset[]> {
  const conn = getConnection();
  const pubkey = new PublicKey(address);

  const tokenAccounts = await conn.getParsedTokenAccountsByOwner(pubkey, {
    programId: TOKEN_PROGRAM_ID,
  });

  const nftMints = tokenAccounts.value
    .filter((ta) => {
      const info = ta.account.data.parsed.info;
      return (
        Number(info.tokenAmount.amount) === 1 &&
        info.tokenAmount.decimals === 0
      );
    })
    .map((ta) => ta.account.data.parsed.info.mint as string);

  // Return basic NFT stubs — metadata fetching via Metaplex would go here
  return nftMints.slice(0, 30).map((mint) => ({
    mint,
    name: `NFT ${shortenMint(mint)}`,
    image: '', // Would be fetched from on-chain metadata URI
  }));
}

// ---------------------------------------------------------------------------
// Recent Transactions
// ---------------------------------------------------------------------------

export async function fetchTransactions(
  address: string,
  limit = 10,
): Promise<TransactionInfo[]> {
  const conn = getConnection();
  const pubkey = new PublicKey(address);

  const signatures: ConfirmedSignatureInfo[] =
    await conn.getSignaturesForAddress(pubkey, { limit });

  const txInfos: TransactionInfo[] = [];

  // Fetch parsed details in small batches with delays to avoid 429
  const batchSize = 3;
  for (let i = 0; i < signatures.length; i += batchSize) {
    const batch = signatures.slice(i, i + batchSize);
    const parsed = await Promise.allSettled(
      batch.map((sig) =>
        conn.getParsedTransaction(sig.signature, {
          maxSupportedTransactionVersion: 0,
        }),
      ),
    );

    parsed.forEach((result, idx) => {
      const sig = batch[idx];
      if (result.status === 'fulfilled' && result.value) {
        txInfos.push(parseTxInfo(result.value, sig, address));
      } else {
        txInfos.push({
          signature: sig.signature,
          timestamp: sig.blockTime ?? null,
          type: 'unknown',
          status: sig.err ? 'failed' : 'success',
          fee: 0,
        });
      }
    });

    if (i + batchSize < signatures.length) await sleep(300);
  }

  return txInfos;
}

function parseTxInfo(
  tx: ParsedTransactionWithMeta,
  sig: ConfirmedSignatureInfo,
  walletAddress: string,
): TransactionInfo {
  const fee = (tx.meta?.fee ?? 0) / LAMPORTS_PER_SOL;
  const status: 'success' | 'failed' = tx.meta?.err ? 'failed' : 'success';

  // Detect SOL transfer amount
  let amount: number | undefined;
  let direction: 'in' | 'out' | undefined;
  let counterparty: string | undefined;
  let type: TransactionInfo['type'] = 'unknown';

  const preBalances = tx.meta?.preBalances ?? [];
  const postBalances = tx.meta?.postBalances ?? [];
  const accountKeys = tx.transaction.message.accountKeys;

  const walletIdx = accountKeys.findIndex(
    (k) => k.pubkey.toBase58() === walletAddress,
  );

  if (walletIdx >= 0 && preBalances[walletIdx] !== undefined) {
    const diff =
      (postBalances[walletIdx] - preBalances[walletIdx]) / LAMPORTS_PER_SOL;
    if (Math.abs(diff) > 0.000001) {
      amount = Math.abs(diff);
      direction = diff > 0 ? 'in' : 'out';
      type = 'transfer';
    }
  }

  // Try to find counterparty
  if (walletIdx === 0 && accountKeys.length > 1) {
    counterparty = accountKeys[1].pubkey.toBase58();
  } else if (walletIdx > 0) {
    counterparty = accountKeys[0].pubkey.toBase58();
  }

  return {
    signature: sig.signature,
    timestamp: sig.blockTime ?? null,
    type,
    status,
    fee,
    amount,
    direction,
    counterparty,
  };
}

// ---------------------------------------------------------------------------
// SKR Staking Detection
// ---------------------------------------------------------------------------

const SKR_STAKING_PROGRAM = new PublicKey('mERKcfxMC5SqJn4Ld4BUris3WKZZ1ojjWJ3A3J5CKxv');
const SKR_SHARE_VAULT_PROGRAM = new PublicKey('SKRskrmtL83pcL4YqLWt6iPefDqwXQWHSw9S9vz94BZ');
const SKR_VAULT_TOKEN_ACCOUNT = new PublicKey('8isViKbwhuhFhsv2t8vaFL74pKCqaFPQXo1KkeQwZbB8');
const SKR_TOKEN_MINT = 'SKRbvo6Gf7GondiT3BbTfuRDPqLWei4j2Qy2NPGZhW3';

async function fetchStakedTokens(address: string): Promise<StakedToken[]> {
  const staked: StakedToken[] = [];

  try {
    const conn = getConnection();
    const rpcUrl = RPC_ENDPOINTS[ACTIVE_NETWORK];

    // Find user's stake account in the mERKcf staking program
    // Layout: 8-byte discriminator + 32-byte wallet pubkey + 16 bytes padding + 8-byte staked amount (u64)
    const stakeAccounts = await conn.getProgramAccounts(SKR_STAKING_PROGRAM, {
      filters: [
        { dataSize: 64 },
        { memcmp: { offset: 8, bytes: address } },
      ],
    });

    if (stakeAccounts.length > 0) {
      const data = stakeAccounts[0].account.data;
      const principalRaw = data.readBigUInt64LE(56);
      const principal = Number(principalRaw) / 1e6;

      // Fetch share price from the SKR share vault config to calculate rewards
      // Config account DPJ58... stores share_price at offset 136 as u64 scaled by 1e9
      let sharePrice = 1.0;
      try {
        const configAccounts = await conn.getProgramAccounts(SKR_SHARE_VAULT_PROGRAM, {
          filters: [{ dataSize: 188 }],
        });
        if (configAccounts.length > 0) {
          const configData = configAccounts[0].account.data;
          const sharePriceRaw = configData.readBigUInt64LE(136);
          sharePrice = Number(sharePriceRaw) / 1e9;
        }
      } catch {
        console.warn('[Staking] Could not fetch share price, using 1.0');
      }

      const stakedWithRewards = principal * sharePrice;

      // Try to get SKR price from DexScreener
      let priceUsd: number | undefined;
      try {
        const dexData = await fetchDexScreenerData([SKR_TOKEN_MINT]);
        const skrDex = dexData.get(SKR_TOKEN_MINT);
        priceUsd = skrDex?.priceUsd || undefined;
      } catch {}

      staked.push({
        symbol: 'SKR',
        name: 'Seeker (Staked)',
        stakedAmount: stakedWithRewards,
        logoUri: 'https://cdn.dexscreener.com/cms/images/9URRM3A6m0nJmbAM5',
        priceUsd,
        valueUsd: priceUsd ? priceUsd * stakedWithRewards : undefined,
      });

      console.log(`[Staking] Found ${stakedWithRewards.toFixed(2)} SKR staked (principal: ${principal}, share price: ${sharePrice.toFixed(6)})`);
    }
  } catch (error) {
    console.warn('[Staking] Failed to fetch staked tokens:', error);
  }

  return staked;
}

// ---------------------------------------------------------------------------
// SOL Price (via CoinGecko free API)
// ---------------------------------------------------------------------------

let cachedSolPrice = 0;
let solPriceTimestamp = 0;
const SOL_PRICE_TTL = 60 * 1000; // 1 minute

async function fetchSolPrice(): Promise<number> {
  const now = Date.now();
  if (cachedSolPrice > 0 && now - solPriceTimestamp < SOL_PRICE_TTL) {
    return cachedSolPrice;
  }
  try {
    const res = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd',
    );
    const json = await res.json();
    const price = json?.solana?.usd ?? 0;
    if (price > 0) {
      cachedSolPrice = price;
      solPriceTimestamp = now;
    }
    return price;
  } catch {
    return cachedSolPrice || 100; // fallback
  }
}

// ---------------------------------------------------------------------------
// Balance history — reconstruct from transaction SOL balance changes
// ---------------------------------------------------------------------------

async function fetchBalanceHistory(
  address: string,
  currentBalanceLamports: number,
): Promise<number[]> {
  const conn = getConnection();
  const pubkey = new PublicKey(address);

  try {
    // Get recent signatures (limit to 10 to reduce RPC calls)
    const signatures = await conn.getSignaturesForAddress(pubkey, { limit: 10 });

    if (signatures.length === 0) return [currentBalanceLamports / LAMPORTS_PER_SOL];

    // Fetch parsed transactions in small batches with delays
    const parsed: PromiseSettledResult<ParsedTransactionWithMeta | null>[] = [];
    const BATCH = 3;
    for (let i = 0; i < signatures.length; i += BATCH) {
      const batch = signatures.slice(i, i + BATCH);
      const batchResults = await Promise.allSettled(
        batch.map((sig) =>
          conn.getParsedTransaction(sig.signature, { maxSupportedTransactionVersion: 0 }),
        ),
      );
      parsed.push(...batchResults);
      if (i + BATCH < signatures.length) await sleep(300);
    }

    // Build balance series: walk backwards through txs to reconstruct history
    const balancePoints: number[] = [];
    let runningBalance = currentBalanceLamports;
    balancePoints.push(runningBalance / LAMPORTS_PER_SOL);

    for (let i = 0; i < parsed.length; i++) {
      const result = parsed[i];
      if (result.status !== 'fulfilled' || !result.value) continue;

      const tx = result.value;
      const accountKeys = tx.transaction.message.accountKeys;
      const walletIdx = accountKeys.findIndex(
        (k) => k.pubkey.toBase58() === address,
      );

      if (walletIdx >= 0) {
        const pre = tx.meta?.preBalances?.[walletIdx] ?? runningBalance;
        const post = tx.meta?.postBalances?.[walletIdx] ?? runningBalance;
        // The pre-balance of this tx is what the balance was BEFORE this tx
        runningBalance = pre;
        balancePoints.push(pre / LAMPORTS_PER_SOL);
      }
    }

    // Reverse so it goes oldest → newest
    balancePoints.reverse();
    return balancePoints;
  } catch (error) {
    console.warn('[BalanceHistory] Failed:', error);
    return [currentBalanceLamports / LAMPORTS_PER_SOL];
  }
}

// ---------------------------------------------------------------------------
// Full Wallet Data (aggregated)
// ---------------------------------------------------------------------------

export async function fetchWalletData(address: string): Promise<WalletData> {
  // Sanitise — strip any whitespace/newlines and non-base58 chars
  address = address.trim().replace(/[^1-9A-HJ-NP-Za-km-z]/g, '');
  console.log('[SolanaService] fetchWalletData called for:', JSON.stringify(address), 'length:', address.length);

  // Validate before proceeding
  try {
    new PublicKey(address);
  } catch (e) {
    console.error('[SolanaService] Invalid address after sanitization:', JSON.stringify(address));
    throw new Error(`Invalid Solana address: ${address.slice(0, 10)}...`);
  }

  try {
    // Phase 1: SOL balance + price (lightweight, fast) — 15s timeout
    const [solBalance, solPriceUsd] = await withTimeout(
      Promise.all([
        withRetry(() => fetchSolBalance(address), 'SOL Balance'),
        fetchSolPrice(),
      ]),
      15000,
      'Phase1',
    );
    console.log('[SolanaService] SOL balance:', solBalance, 'price:', solPriceUsd);

    await sleep(500);

    // Phase 2: Tokens — 30s timeout (whale wallets can have 14k+ accounts)
    let tokens: TokenBalance[] = [];
    try {
      tokens = await withTimeout(
        withRetry(() => fetchTokenBalances(address), 'Tokens'),
        30000,
        'Tokens',
      );
    } catch (e) {
      console.warn('[SolanaService] Token fetch failed:', e);
    }

    await sleep(500);

    // Phase 3: Everything else — each with individual 15s timeouts, all run in parallel
    // If any one times out, the rest still return
    let nfts: NFTAsset[] = [];
    let transactions: TransactionInfo[] = [];
    let balanceHistory: number[] = [];
    let stakedTokens: StakedToken[] = [];

    const balanceLamports = Math.round(solBalance * LAMPORTS_PER_SOL);

    const [nftResult, txResult, historyResult, stakingResult] = await Promise.allSettled([
      withTimeout(fetchNFTs(address), 15000, 'NFTs'),
      withTimeout(fetchTransactions(address), 15000, 'Transactions'),
      withTimeout(fetchBalanceHistory(address, balanceLamports), 15000, 'BalanceHistory'),
      withTimeout(fetchStakedTokens(address), 15000, 'Staking'),
    ]);

    if (nftResult.status === 'fulfilled') nfts = nftResult.value;
    else console.warn('[SolanaService] NFT fetch failed:', nftResult.reason);

    if (txResult.status === 'fulfilled') transactions = txResult.value;
    else console.warn('[SolanaService] Tx fetch failed:', txResult.reason);

    if (historyResult.status === 'fulfilled') balanceHistory = historyResult.value;
    else console.warn('[SolanaService] History fetch failed:', historyResult.reason);

    if (stakingResult.status === 'fulfilled') stakedTokens = stakingResult.value;
    else console.warn('[SolanaService] Staking fetch failed:', stakingResult.reason);

    // Calculate total portfolio value (including staked tokens)
    const solValueUsd = solBalance * solPriceUsd;
    const tokenValueUsd = tokens.reduce((sum, t) => sum + (t.valueUsd ?? 0), 0);
    const stakedValueUsd = stakedTokens.reduce((sum, s) => sum + (s.valueUsd ?? 0), 0);
    const totalValueUsd = solValueUsd + tokenValueUsd + stakedValueUsd;

    return {
      address,
      solBalance,
      solPriceUsd,
      totalValueUsd,
      tokens,
      nfts,
      transactions,
      stakedTokens,
      balanceHistory,
      lastUpdated: Date.now(),
    };
  } catch (error) {
    console.error('[SolanaService] fetchWalletData ERROR:', error);
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Token Details — fetch market data for a single token from DexScreener
// ---------------------------------------------------------------------------

export interface TokenMarketData {
  marketCap: number;
  fdv: number;
  volume24h: number;
  liquidity: number;
  pairAddress: string;
  dexUrl: string;
}

export async function fetchTokenDetails(mint: string): Promise<TokenMarketData | null> {
  try {
    const url = `https://api.dexscreener.com/tokens/v1/solana/${mint}`;
    const response = await fetch(url);
    const pairs: any[] = await response.json();

    if (!Array.isArray(pairs) || pairs.length === 0) return null;

    // Pick highest-liquidity pair
    let best = pairs[0];
    for (const pair of pairs) {
      if ((pair.liquidity?.usd ?? 0) > (best.liquidity?.usd ?? 0)) {
        best = pair;
      }
    }

    return {
      marketCap: best.marketCap ?? 0,
      fdv: best.fdv ?? 0,
      volume24h: best.volume?.h24 ?? 0,
      liquidity: best.liquidity?.usd ?? 0,
      pairAddress: best.pairAddress ?? '',
      dexUrl: best.url ?? `https://dexscreener.com/solana/${mint}`,
    };
  } catch (error) {
    console.warn('[TokenDetails] Failed to fetch:', error);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Subscribe to account changes (WebSocket for notifications)
// ---------------------------------------------------------------------------

export function subscribeToAccount(
  address: string,
  callback: (lamports: number) => void,
): number {
  const conn = getConnection();
  const pubkey = new PublicKey(address);
  return conn.onAccountChange(pubkey, (accountInfo) => {
    callback(accountInfo.lamports);
  });
}

export function unsubscribeFromAccount(subscriptionId: number): void {
  const conn = getConnection();
  conn.removeAccountChangeListener(subscriptionId);
}
